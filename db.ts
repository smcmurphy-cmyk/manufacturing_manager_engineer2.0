import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import {
  INITIAL_ASSETS,
  INITIAL_NCRS,
  INITIAL_AUDITS,
  INITIAL_TRAINING,
  INITIAL_JOBS,
} from './src/data/initialData';
import {
  AssetRecord,
  NCRRecord,
  ComplianceAudit,
  TrainingRecord,
  EngineeringJob,
} from './src/types';

// Helper to validate HTTP or HTTPS URL format
function isValidHttpUrl(stringUrl: string): boolean {
  if (!stringUrl || typeof stringUrl !== 'string') return false;
  const trimmed = stringUrl.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Environment credentials for Supabase
const rawSupabaseUrl = process.env.SUPABASE_URL || '';
const rawSupabaseKey =
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabaseInstance: SupabaseClient | null = null;
let isSupabaseConfigured = false;

// Only initialize Supabase if a syntactically valid HTTP/HTTPS URL and non-trivial key are provided
if (isValidHttpUrl(rawSupabaseUrl) && rawSupabaseKey.trim().length > 10) {
  try {
    supabaseInstance = createClient(rawSupabaseUrl.trim(), rawSupabaseKey.trim());
    isSupabaseConfigured = true;
    console.log('✅ Supabase PostgreSQL Client initialized successfully.');
  } catch {
    console.log('ℹ️ Supabase client initialization deferred; using persistent local disk fallback.');
    supabaseInstance = null;
    isSupabaseConfigured = false;
  }
} else {
  console.log('ℹ️ Supabase credentials not configured with valid HTTP/S endpoint; using persistent local disk fallback (saved_reports/data/).');
}

export const supabase = supabaseInstance;
export const isDatabaseConnected = () => isSupabaseConfigured;

// Local persistent JSON storage directory fallback
const LOCAL_DATA_DIR = path.join(process.cwd(), 'saved_reports', 'data');
if (!fs.existsSync(LOCAL_DATA_DIR)) {
  fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
}

function getLocalFilePath(filename: string): string {
  return path.join(LOCAL_DATA_DIR, filename);
}

function readLocalJson<T>(filename: string, defaultData: T): T {
  const filePath = getLocalFilePath(filename);
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`Error reading local JSON (${filename}), using default fallback:`, e);
    return defaultData;
  }
}

function writeLocalJson<T>(filename: string, data: T): void {
  const filePath = getLocalFilePath(filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`Error writing local JSON (${filename}):`, e);
  }
}

// -------------------------------------------------------------
// 1. Document Archives (Disk File Pointers & Audit History)
// -------------------------------------------------------------
export interface DocumentArchiveRecord {
  id?: string;
  record_id: string;
  module_type: 'FAI' | 'NCR' | 'Audit' | 'Calibration' | 'Report';
  reference_number?: string;
  server_path: string;
  file_name: string;
  full_path: string;
  file_size_bytes: number;
  file_size_formatted: string;
  operator_name: string;
  metadata?: any;
  logged_at?: string;
}

export async function insertDocumentArchive(
  record: DocumentArchiveRecord
): Promise<DocumentArchiveRecord> {
  const enrichedRecord: DocumentArchiveRecord = {
    ...record,
    id: record.id || `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    logged_at: record.logged_at || new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('document_archives')
        .insert([enrichedRecord])
        .select();

      if (!error && data && data.length > 0) {
        return data[0] as DocumentArchiveRecord;
      }
      console.warn('Supabase insert warning, falling back to local file log:', error?.message);
    } catch (err) {
      console.warn('Supabase connection error while inserting archive, falling back to local:', err);
    }
  }

  // Fallback: Local disk JSON
  const currentLogs = readLocalJson<DocumentArchiveRecord[]>('document_archives.json', []);
  currentLogs.unshift(enrichedRecord);
  writeLocalJson('document_archives.json', currentLogs.slice(0, 300));
  return enrichedRecord;
}

export async function getDocumentArchives(
  moduleType?: string
): Promise<DocumentArchiveRecord[]> {
  if (isSupabaseConfigured && supabaseInstance) {
    try {
      let query = supabaseInstance
        .from('document_archives')
        .select('*')
        .order('logged_at', { ascending: false });

      if (moduleType) {
        query = query.eq('module_type', moduleType);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data as DocumentArchiveRecord[];
      }
      console.warn('Supabase fetch error, fallback to local archive:', error?.message);
    } catch (err) {
      console.warn('Supabase query error, using local fallback:', err);
    }
  }

  const logs = readLocalJson<DocumentArchiveRecord[]>('document_archives.json', []);
  if (moduleType) {
    return logs.filter((l) => l.module_type === moduleType);
  }
  return logs;
}

// -------------------------------------------------------------
// 2. Asset Calibration Registry
// -------------------------------------------------------------
export async function getAssets(): Promise<AssetRecord[]> {
  if (isSupabaseConfigured && supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('asset_registry')
        .select('*')
        .order('next_due_date', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          assetId: d.asset_id,
          equipmentDescription: d.equipment_description,
          departmentLocation: d.department_location,
          intervalDays: Number(d.interval_days),
          lastCompleted: d.last_completed,
          nextDueDate: d.next_due_date,
          status: d.status,
          assignedOwner: d.assigned_owner,
          alertEmail: d.alert_email,
          serialNumber: d.serial_number,
        }));
      }
      // If table is empty on first load, seed with INITIAL_ASSETS
      if (!error && data && data.length === 0) {
        await saveAllAssets(INITIAL_ASSETS);
        return INITIAL_ASSETS;
      }
    } catch (err) {
      console.warn('Error fetching assets from Supabase, using local fallback:', err);
    }
  }

  return readLocalJson<AssetRecord[]>('assets.json', INITIAL_ASSETS);
}

export async function saveAllAssets(assets: AssetRecord[]): Promise<void> {
  // Always persist to local disk for offline resilience
  writeLocalJson('assets.json', assets);

  if (isSupabaseConfigured && supabaseInstance) {
    try {
      const payload = assets.map((a) => ({
        id: a.id,
        asset_id: a.assetId,
        equipment_description: a.equipmentDescription,
        department_location: a.departmentLocation,
        interval_days: a.intervalDays,
        last_completed: a.lastCompleted,
        next_due_date: a.nextDueDate,
        status: a.status,
        assigned_owner: a.assignedOwner,
        alert_email: a.alertEmail,
        serial_number: a.serialNumber,
        updated_at: new Date().toISOString(),
      }));

      await supabaseInstance.from('asset_registry').upsert(payload, { onConflict: 'id' });
    } catch (err) {
      console.warn('Failed to upsert assets to Supabase:', err);
    }
  }
}

export async function updateSingleAsset(asset: AssetRecord): Promise<AssetRecord> {
  const currentAssets = await getAssets();
  const index = currentAssets.findIndex((a) => a.id === asset.id);
  let updatedList: AssetRecord[];
  if (index >= 0) {
    updatedList = currentAssets.map((a) => (a.id === asset.id ? asset : a));
  } else {
    updatedList = [asset, ...currentAssets];
  }
  await saveAllAssets(updatedList);
  return asset;
}

// -------------------------------------------------------------
// 3. Non-Conformance Reports (NCRs)
// -------------------------------------------------------------
export async function getNcrs(): Promise<NCRRecord[]> {
  if (isSupabaseConfigured && supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('ncrs')
        .select('*')
        .order('last_edited_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          ncrNumber: d.ncr_number,
          serialNumber: d.serial_number,
          assemblyPartNumber: d.assembly_part_number,
          assemblyRevision: d.assembly_revision,
          defectDescription: d.defect_description,
          standardClause: d.standard_clause,
          severity: d.severity,
          containmentDate: d.containment_date,
          rootCauseMethod: d.root_cause_method,
          status: d.status,
          nextAction: d.next_action,
          owner: d.owner,
          createdAt: d.created_at,
          lastEditedAt: d.last_edited_at,
          lastEditedBy: d.last_edited_by,
          rootCauseAnalysis: d.root_cause_analysis,
          correctiveActionPlan: d.corrective_action_plan,
          savedPdfPath: d.saved_pdf_path,
          editHistory: d.edit_history || [],
        }));
      }
      if (!error && data && data.length === 0) {
        await saveAllNcrs(INITIAL_NCRS);
        return INITIAL_NCRS;
      }
    } catch (err) {
      console.warn('Error fetching NCRs from Supabase:', err);
    }
  }

  return readLocalJson<NCRRecord[]>('ncrs.json', INITIAL_NCRS);
}

export async function saveAllNcrs(ncrs: NCRRecord[]): Promise<void> {
  writeLocalJson('ncrs.json', ncrs);

  if (isSupabaseConfigured && supabaseInstance) {
    try {
      const payload = ncrs.map((n) => ({
        id: n.id,
        ncr_number: n.ncrNumber,
        serial_number: n.serialNumber,
        assembly_part_number: n.assemblyPartNumber,
        assembly_revision: n.assemblyRevision,
        defect_description: n.defectDescription,
        standard_clause: n.standardClause,
        severity: n.severity,
        containment_date: n.containmentDate,
        root_cause_method: n.rootCauseMethod,
        status: n.status,
        next_action: n.nextAction,
        owner: n.owner,
        created_at: n.createdAt,
        last_edited_at: n.lastEditedAt,
        last_edited_by: n.lastEditedBy,
        root_cause_analysis: n.rootCauseAnalysis,
        corrective_action_plan: n.correctiveActionPlan,
        saved_pdf_path: n.savedPdfPath,
        edit_history: n.editHistory || [],
        updated_at: new Date().toISOString(),
      }));

      await supabaseInstance.from('ncrs').upsert(payload, { onConflict: 'id' });
    } catch (err) {
      console.warn('Failed to upsert NCRs to Supabase:', err);
    }
  }
}

export async function updateSingleNcr(ncr: NCRRecord): Promise<NCRRecord> {
  const current = await getNcrs();
  const exists = current.some((n) => n.id === ncr.id);
  const updated = exists ? current.map((n) => (n.id === ncr.id ? ncr : n)) : [ncr, ...current];
  await saveAllNcrs(updated);
  return ncr;
}

// -------------------------------------------------------------
// 4. Compliance Audits
// -------------------------------------------------------------
export async function getAudits(): Promise<ComplianceAudit[]> {
  if (isSupabaseConfigured && supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('compliance_audits')
        .select('*')
        .order('next_due_date', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          title: d.title,
          standard: d.standard,
          cadence: d.cadence,
          lastCompleted: d.last_completed,
          nextDueDate: d.next_due_date,
          status: d.status,
          leadAuditor: d.lead_auditor,
        }));
      }
      if (!error && data && data.length === 0) {
        await saveAllAudits(INITIAL_AUDITS);
        return INITIAL_AUDITS;
      }
    } catch (err) {
      console.warn('Error fetching audits from Supabase:', err);
    }
  }

  return readLocalJson<ComplianceAudit[]>('audits.json', INITIAL_AUDITS);
}

export async function saveAllAudits(audits: ComplianceAudit[]): Promise<void> {
  writeLocalJson('audits.json', audits);

  if (isSupabaseConfigured && supabaseInstance) {
    try {
      const payload = audits.map((a) => ({
        id: a.id,
        title: a.title,
        standard: a.standard,
        cadence: a.cadence,
        last_completed: a.lastCompleted,
        next_due_date: a.nextDueDate,
        status: a.status,
        lead_auditor: a.leadAuditor,
        updated_at: new Date().toISOString(),
      }));

      await supabaseInstance.from('compliance_audits').upsert(payload, { onConflict: 'id' });
    } catch (err) {
      console.warn('Failed to upsert audits to Supabase:', err);
    }
  }
}

// -------------------------------------------------------------
// 5. Training Records
// -------------------------------------------------------------
export async function getTraining(): Promise<TrainingRecord[]> {
  if (isSupabaseConfigured && supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('training_records')
        .select('*')
        .order('expiration_date', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          operatorName: d.operator_name,
          role: d.role,
          certificationTitle: d.certification_title,
          standardLevel: d.standard_level,
          issueDate: d.issue_date,
          expirationDate: d.expiration_date,
          status: d.status,
          contactEmail: d.contact_email,
          supervisor: d.supervisor,
          notes: d.notes,
        }));
      }
      if (!error && data && data.length === 0) {
        await saveAllTraining(INITIAL_TRAINING);
        return INITIAL_TRAINING;
      }
    } catch (err) {
      console.warn('Error fetching training from Supabase:', err);
    }
  }

  return readLocalJson<TrainingRecord[]>('training.json', INITIAL_TRAINING);
}

export async function saveAllTraining(training: TrainingRecord[]): Promise<void> {
  writeLocalJson('training.json', training);

  if (isSupabaseConfigured && supabaseInstance) {
    try {
      const payload = training.map((t) => ({
        id: t.id,
        operator_name: t.operatorName,
        role: t.role,
        certification_title: t.certificationTitle,
        standard_level: t.standardLevel,
        issue_date: t.issueDate,
        expiration_date: t.expirationDate,
        status: t.status,
        contact_email: t.contactEmail,
        supervisor: t.supervisor,
        notes: t.notes,
        updated_at: new Date().toISOString(),
      }));

      await supabaseInstance.from('training_records').upsert(payload, { onConflict: 'id' });
    } catch (err) {
      console.warn('Failed to upsert training to Supabase:', err);
    }
  }
}

// -------------------------------------------------------------
// 6. Engineering Pipeline Jobs (FAI)
// -------------------------------------------------------------
export async function getJobs(): Promise<EngineeringJob[]> {
  if (isSupabaseConfigured && supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('engineering_jobs')
        .select('*')
        .order('target_build_date', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          jobId: d.job_id,
          dueDate: d.due_date,
          projectCode: d.project_code,
          customer: d.customer,
          quantity: d.quantity,
          assemblyName: d.assembly_name,
          partNumber: d.part_number,
          revision: d.revision,
          targetBuildDate: d.target_build_date,
          startTime: d.start_time,
          totalBuildTimeHours: d.total_build_time_hours,
          status: d.status,
          checks: d.checks || {},
          passedTest: d.passed_test,
          passedTestDate: d.passed_test_date,
          passedQa: d.passed_qa,
          passedQaDate: d.passed_qa_date,
          smtLine: d.smt_line,
          notes: d.notes,
        }));
      }
      if (!error && data && data.length === 0) {
        await saveAllJobs(INITIAL_JOBS);
        return INITIAL_JOBS;
      }
    } catch (err) {
      console.warn('Error fetching jobs from Supabase:', err);
    }
  }

  return readLocalJson<EngineeringJob[]>('jobs.json', INITIAL_JOBS);
}

export async function saveAllJobs(jobs: EngineeringJob[]): Promise<void> {
  writeLocalJson('jobs.json', jobs);

  if (isSupabaseConfigured && supabaseInstance) {
    try {
      const payload = jobs.map((j) => ({
        id: j.id,
        job_id: j.jobId,
        due_date: j.dueDate,
        project_code: j.projectCode,
        customer: j.customer,
        quantity: j.quantity,
        assembly_name: j.assemblyName,
        part_number: j.partNumber,
        revision: j.revision,
        target_build_date: j.targetBuildDate,
        start_time: j.startTime,
        total_build_time_hours: j.totalBuildTimeHours,
        status: j.status,
        checks: j.checks || {},
        passed_test: j.passedTest,
        passed_test_date: j.passedTestDate,
        passed_qa: j.passedQa,
        passed_qa_date: j.passedQaDate,
        smt_line: j.smtLine,
        notes: j.notes,
        updated_at: new Date().toISOString(),
      }));

      await supabaseInstance.from('engineering_jobs').upsert(payload, { onConflict: 'id' });
    } catch (err) {
      console.warn('Failed to upsert jobs to Supabase:', err);
    }
  }
}
