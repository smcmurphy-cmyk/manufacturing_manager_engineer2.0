import sql from 'mssql';
import {
  AssetRecord,
  NCRRecord,
  ComplianceAudit,
  TrainingRecord,
  EngineeringJob,
} from './src/types';

const config: sql.config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'DynamicEngineeringQMS',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
  pool: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
  },
};

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await new sql.ConnectionPool(config).connect();
    pool.on('error', (err) => {
      console.error('SQL Connection Pool Error:', err);
      pool = null;
    });
  }
  return pool;
}

export async function isDatabaseConnected(): Promise<boolean> {
  try {
    const p = await getPool();
    const result = await p.request().query('SELECT 1 AS connected');
    return result.recordset[0]?.connected === 1;
  } catch (err) {
    console.error('Database connection test failed:', err);
    return false;
  }
}

// -------------------------------------------------------------
// 1. Document Archives
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
  const pool = await getPool();
  const id = record.id || `DOC-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const loggedAt = record.logged_at || new Date().toISOString();

  await pool.request()
    .input('id', sql.NVarChar(64), id)
    .input('record_id', sql.NVarChar(64), record.record_id)
    .input('module_type', sql.NVarChar(32), record.module_type)
    .input('reference_number', sql.NVarChar(64), record.reference_number || null)
    .input('server_path', sql.NVarChar(512), record.server_path)
    .input('file_name', sql.NVarChar(256), record.file_name)
    .input('full_path', sql.NVarChar(512), record.full_path)
    .input('file_size_bytes', sql.BigInt, record.file_size_bytes)
    .input('file_size_formatted', sql.NVarChar(32), record.file_size_formatted)
    .input('operator_name', sql.NVarChar(128), record.operator_name)
    .input('metadata', sql.NVarChar(sql.MAX), record.metadata ? JSON.stringify(record.metadata) : null)
    .input('logged_at', sql.DateTime2, loggedAt)
    .query(`
      INSERT INTO DocumentArchives (
        id, record_id, module_type, reference_number, server_path,
        file_name, full_path, file_size_bytes, file_size_formatted,
        operator_name, metadata, logged_at
      ) VALUES (
        @id, @record_id, @module_type, @reference_number, @server_path,
        @file_name, @full_path, @file_size_bytes, @file_size_formatted,
        @operator_name, @metadata, @logged_at
      )
    `);

  return { ...record, id, logged_at: loggedAt };
}

export async function getDocumentArchives(moduleType?: string): Promise<DocumentArchiveRecord[]> {
  const pool = await getPool();
  const req = pool.request();
  let query = `
    SELECT 
      id, record_id, module_type, reference_number, server_path,
      file_name, full_path, file_size_bytes, file_size_formatted,
      operator_name, metadata, logged_at
    FROM DocumentArchives
  `;

  if (moduleType) {
    req.input('moduleType', sql.NVarChar(32), moduleType);
    query += ` WHERE module_type = @moduleType`;
  }
  query += ` ORDER BY logged_at DESC`;

  const result = await req.query(query);
  return result.recordset.map((row) => ({
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
  }));
}

// -------------------------------------------------------------
// 2. Asset Calibration Registry
// -------------------------------------------------------------
export async function getAssets(): Promise<AssetRecord[]> {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT 
      id,
      asset_id AS assetId,
      equipment_description AS equipmentDescription,
      department_location AS departmentLocation,
      interval_days AS intervalDays,
      CONVERT(NVARCHAR(10), last_completed, 120) AS lastCompleted,
      CONVERT(NVARCHAR(10), next_due_date, 120) AS nextDueDate,
      status,
      assigned_owner AS assignedOwner,
      alert_email AS alertEmail,
      serial_number AS serialNumber
    FROM AssetRegistry
    ORDER BY next_due_date ASC
  `);
  return result.recordset;
}

export async function updateSingleAsset(asset: AssetRecord): Promise<AssetRecord> {
  const pool = await getPool();
  await pool.request()
    .input('id', sql.NVarChar(64), asset.id)
    .input('asset_id', sql.NVarChar(64), asset.assetId)
    .input('equipment_description', sql.NVarChar(256), asset.equipmentDescription)
    .input('department_location', sql.NVarChar(128), asset.departmentLocation || null)
    .input('interval_days', sql.Int, asset.intervalDays)
    .input('last_completed', sql.Date, asset.lastCompleted || null)
    .input('next_due_date', sql.Date, asset.nextDueDate || null)
    .input('status', sql.NVarChar(64), asset.status)
    .input('assigned_owner', sql.NVarChar(128), asset.assignedOwner || null)
    .input('alert_email', sql.NVarChar(256), asset.alertEmail || null)
    .input('serial_number', sql.NVarChar(128), asset.serialNumber || null)
    .query(`
      MERGE AssetRegistry AS target
      USING (SELECT @id AS id) AS src
      ON (target.id = src.id)
      WHEN MATCHED THEN
        UPDATE SET 
          asset_id = @asset_id,
          equipment_description = @equipment_description,
          department_location = @department_location,
          interval_days = @interval_days,
          last_completed = @last_completed,
          next_due_date = @next_due_date,
          status = @status,
          assigned_owner = @assigned_owner,
          alert_email = @alert_email,
          serial_number = @serial_number,
          updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (
          id, asset_id, equipment_description, department_location,
          interval_days, last_completed, next_due_date, status,
          assigned_owner, alert_email, serial_number
        ) VALUES (
          @id, @asset_id, @equipment_description, @department_location,
          @interval_days, @last_completed, @next_due_date, @status,
          @assigned_owner, @alert_email, @serial_number
        );
    `);
  return asset;
}

export async function saveAllAssets(assets: AssetRecord[]): Promise<void> {
  for (const asset of assets) {
    await updateSingleAsset(asset);
  }
}

// -------------------------------------------------------------
// 3. Non-Conformance Reports (NCRs)
// -------------------------------------------------------------
export async function getNcrs(): Promise<NCRRecord[]> {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT 
      id,
      ncr_number AS ncrNumber,
      serial_number AS serialNumber,
      assembly_part_number AS assemblyPartNumber,
      assembly_revision AS assemblyRevision,
      defect_description AS defectDescription,
      standard_clause AS standardClause,
      severity,
      CONVERT(NVARCHAR(10), containment_date, 120) AS containmentDate,
      root_cause_method AS rootCauseMethod,
      status,
      next_action AS nextAction,
      owner,
      created_at AS createdAt,
      last_edited_at AS lastEditedAt,
      last_edited_by AS lastEditedBy,
      root_cause_analysis AS rootCauseAnalysis,
      corrective_action_plan AS correctiveActionPlan,
      saved_pdf_path AS savedPdfPath,
      edit_history AS editHistory
    FROM NCRs
    ORDER BY last_edited_at DESC
  `);

  return result.recordset.map((row) => ({
    ...row,
    editHistory: row.editHistory ? JSON.parse(row.editHistory) : [],
  }));
}

export async function updateSingleNcr(ncr: NCRRecord): Promise<NCRRecord> {
  const pool = await getPool();
  await pool.request()
    .input('id', sql.NVarChar(64), ncr.id)
    .input('ncr_number', sql.NVarChar(64), ncr.ncrNumber)
    .input('serial_number', sql.NVarChar(128), ncr.serialNumber || null)
    .input('assembly_part_number', sql.NVarChar(128), ncr.assemblyPartNumber || null)
    .input('assembly_revision', sql.NVarChar(32), ncr.assemblyRevision || null)
    .input('defect_description', sql.NVarChar(sql.MAX), ncr.defectDescription || null)
    .input('standard_clause', sql.NVarChar(64), ncr.standardClause || null)
    .input('severity', sql.NVarChar(32), ncr.severity || null)
    .input('containment_date', sql.Date, ncr.containmentDate || null)
    .input('root_cause_method', sql.NVarChar(64), ncr.rootCauseMethod || null)
    .input('status', sql.NVarChar(64), ncr.status)
    .input('next_action', sql.NVarChar(sql.MAX), ncr.nextAction || null)
    .input('owner', sql.NVarChar(128), ncr.owner || null)
    .input('last_edited_by', sql.NVarChar(128), ncr.lastEditedBy || null)
    .input('root_cause_analysis', sql.NVarChar(sql.MAX), ncr.rootCauseAnalysis || null)
    .input('corrective_action_plan', sql.NVarChar(sql.MAX), ncr.correctiveActionPlan || null)
    .input('saved_pdf_path', sql.NVarChar(512), ncr.savedPdfPath || null)
    .input('edit_history', sql.NVarChar(sql.MAX), JSON.stringify(ncr.editHistory || []))
    .query(`
      MERGE NCRs AS target
      USING (SELECT @id AS id) AS src
      ON (target.id = src.id)
      WHEN MATCHED THEN
        UPDATE SET 
          ncr_number = @ncr_number,
          serial_number = @serial_number,
          assembly_part_number = @assembly_part_number,
          assembly_revision = @assembly_revision,
          defect_description = @defect_description,
          standard_clause = @standard_clause,
          severity = @severity,
          containment_date = @containment_date,
          root_cause_method = @root_cause_method,
          status = @status,
          next_action = @next_action,
          owner = @owner,
          last_edited_at = SYSUTCDATETIME(),
          last_edited_by = @last_edited_by,
          root_cause_analysis = @root_cause_analysis,
          corrective_action_plan = @corrective_action_plan,
          saved_pdf_path = @saved_pdf_path,
          edit_history = @edit_history
      WHEN NOT MATCHED THEN
        INSERT (
          id, ncr_number, serial_number, assembly_part_number,
          assembly_revision, defect_description, standard_clause,
          severity, containment_date, root_cause_method, status,
          next_action, owner, created_at, last_edited_at,
          last_edited_by, root_cause_analysis, corrective_action_plan,
          saved_pdf_path, edit_history
        ) VALUES (
          @id, @ncr_number, @serial_number, @assembly_part_number,
          @assembly_revision, @defect_description, @standard_clause,
          @severity, @containment_date, @root_cause_method, @status,
          @next_action, @owner, SYSUTCDATETIME(), SYSUTCDATETIME(),
          @last_edited_by, @root_cause_analysis, @corrective_action_plan,
          @saved_pdf_path, @edit_history
        );
    `);
  return ncr;
}

export async function saveAllNcrs(ncrs: NCRRecord[]): Promise<void> {
  for (const ncr of ncrs) {
    await updateSingleNcr(ncr);
  }
}

// -------------------------------------------------------------
// 4. Compliance Audits
// -------------------------------------------------------------
export async function getAudits(): Promise<ComplianceAudit[]> {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT 
      id,
      title,
      standard,
      cadence,
      CONVERT(NVARCHAR(10), last_completed, 120) AS lastCompleted,
      CONVERT(NVARCHAR(10), next_due_date, 120) AS nextDueDate,
      status,
      lead_auditor AS leadAuditor
    FROM ComplianceAudits
    ORDER BY next_due_date ASC
  `);
  return result.recordset;
}

export async function saveAllAudits(audits: ComplianceAudit[]): Promise<void> {
  const pool = await getPool();
  for (const a of audits) {
    await pool.request()
      .input('id', sql.NVarChar(64), a.id)
      .input('title', sql.NVarChar(256), a.title)
      .input('standard', sql.NVarChar(64), a.standard)
      .input('cadence', sql.NVarChar(64), a.cadence || null)
      .input('last_completed', sql.Date, a.lastCompleted || null)
      .input('next_due_date', sql.Date, a.nextDueDate || null)
      .input('status', sql.NVarChar(64), a.status)
      .input('lead_auditor', sql.NVarChar(128), a.leadAuditor || null)
      .query(`
        MERGE ComplianceAudits AS target
        USING (SELECT @id AS id) AS src
        ON (target.id = src.id)
        WHEN MATCHED THEN
          UPDATE SET 
            title = @title,
            standard = @standard,
            cadence = @cadence,
            last_completed = @last_completed,
            next_due_date = @next_due_date,
            status = @status,
            lead_auditor = @lead_auditor,
            updated_at = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (id, title, standard, cadence, last_completed, next_due_date, status, lead_auditor)
          VALUES (@id, @title, @standard, @cadence, @last_completed, @next_due_date, @status, @lead_auditor);
      `);
  }
}

// -------------------------------------------------------------
// 5. Training Records
// -------------------------------------------------------------
export async function getTraining(): Promise<TrainingRecord[]> {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT 
      id,
      operator_name AS operatorName,
      role,
      certification_title AS certificationTitle,
      standard_level AS standardLevel,
      CONVERT(NVARCHAR(10), issue_date, 120) AS issueDate,
      CONVERT(NVARCHAR(10), expiration_date, 120) AS expirationDate,
      status,
      contact_email AS contactEmail,
      supervisor,
      notes
    FROM TrainingRecords
    ORDER BY expiration_date ASC
  `);
  return result.recordset;
}

export async function saveAllTraining(records: TrainingRecord[]): Promise<void> {
  const pool = await getPool();
  for (const t of records) {
    await pool.request()
      .input('id', sql.NVarChar(64), t.id)
      .input('operator_name', sql.NVarChar(128), t.operatorName)
      .input('role', sql.NVarChar(128), t.role || null)
      .input('certification_title', sql.NVarChar(256), t.certificationTitle)
      .input('standard_level', sql.NVarChar(64), t.standardLevel || null)
      .input('issue_date', sql.Date, t.issueDate || null)
      .input('expiration_date', sql.Date, t.expirationDate || null)
      .input('status', sql.NVarChar(64), t.status)
      .input('contact_email', sql.NVarChar(256), t.contactEmail || null)
      .input('supervisor', sql.NVarChar(128), t.supervisor || null)
      .input('notes', sql.NVarChar(sql.MAX), t.notes || null)
      .query(`
        MERGE TrainingRecords AS target
        USING (SELECT @id AS id) AS src
        ON (target.id = src.id)
        WHEN MATCHED THEN
          UPDATE SET 
            operator_name = @operator_name,
            role = @role,
            certification_title = @certification_title,
            standard_level = @standard_level,
            issue_date = @issue_date,
            expiration_date = @expiration_date,
            status = @status,
            contact_email = @contact_email,
            supervisor = @supervisor,
            notes = @notes,
            updated_at = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (id, operator_name, role, certification_title, standard_level, issue_date, expiration_date, status, contact_email, supervisor, notes)
          VALUES (@id, @operator_name, @role, @certification_title, @standard_level, @issue_date, @expiration_date, @status, @contact_email, @supervisor, @notes);
      `);
  }
}

// -------------------------------------------------------------
// 6. Engineering Pipeline Jobs (FAI)
// -------------------------------------------------------------
export async function getJobs(): Promise<EngineeringJob[]> {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT 
      id,
      job_id AS jobId,
      CONVERT(NVARCHAR(10), due_date, 120) AS dueDate,
      project_code AS projectCode,
      customer,
      quantity,
      assembly_name AS assemblyName,
      part_number AS partNumber,
      revision,
      CONVERT(NVARCHAR(10), target_build_date, 120) AS targetBuildDate,
      start_time AS startTime,
      total_build_time_hours AS totalBuildTimeHours,
      status,
      checks,
      passed_test AS passedTest,
      CONVERT(NVARCHAR(10), passed_test_date, 120) AS passedTestDate,
      passed_qa AS passedQa,
      CONVERT(NVARCHAR(10), passed_qa_date, 120) AS passedQaDate,
      smt_line AS smtLine,
      notes
    FROM EngineeringJobs
    ORDER BY target_build_date ASC
  `);

  return result.recordset.map((row) => ({
    ...row,
    checks: row.checks ? JSON.parse(row.checks) : {},
  }));
}

export async function saveAllJobs(jobs: EngineeringJob[]): Promise<void> {
  const pool = await getPool();
  for (const j of jobs) {
    await pool.request()
      .input('id', sql.NVarChar(64), j.id)
      .input('job_id', sql.NVarChar(64), j.jobId)
      .input('due_date', sql.Date, j.dueDate || null)
      .input('project_code', sql.NVarChar(64), j.projectCode || null)
      .input('customer', sql.NVarChar(128), j.customer || null)
      .input('quantity', sql.Int, j.quantity || null)
      .input('assembly_name', sql.NVarChar(256), j.assemblyName || null)
      .input('part_number', sql.NVarChar(128), j.partNumber || null)
      .input('revision', sql.NVarChar(32), j.revision || null)
      .input('target_build_date', sql.Date, j.targetBuildDate || null)
      .input('start_time', sql.NVarChar(32), j.startTime || null)
      .input('total_build_time_hours', sql.Float, j.totalBuildTimeHours || null)
      .input('status', sql.NVarChar(64), j.status)
      .input('checks', sql.NVarChar(sql.MAX), JSON.stringify(j.checks || {}))
      .input('passed_test', sql.Bit, j.passedTest ? 1 : 0)
      .input('passed_test_date', sql.Date, j.passedTestDate || null)
      .input('passed_qa', sql.Bit, j.passedQa ? 1 : 0)
      .input('passed_qa_date', sql.Date, j.passedQaDate || null)
      .input('smt_line', sql.NVarChar(64), j.smtLine || null)
      .input('notes', sql.NVarChar(sql.MAX), j.notes || null)
      .query(`
        MERGE EngineeringJobs AS target
        USING (SELECT @id AS id) AS src
        ON (target.id = src.id)
        WHEN MATCHED THEN
          UPDATE SET 
            job_id = @job_id,
            due_date = @due_date,
            project_code = @project_code,
            customer = @customer,
            quantity = @quantity,
            assembly_name = @assembly_name,
            part_number = @part_number,
            revision = @revision,
            target_build_date = @target_build_date,
            start_time = @start_time,
            total_build_time_hours = @total_build_time_hours,
            status = @status,
            checks = @checks,
            passed_test = @passed_test,
            passed_test_date = @passed_test_date,
            passed_qa = @passed_qa,
            passed_qa_date = @passed_qa_date,
            smt_line = @smt_line,
            notes = @notes,
            updated_at = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (
            id, job_id, due_date, project_code, customer, quantity,
            assembly_name, part_number, revision, target_build_date,
            start_time, total_build_time_hours, status, checks,
            passed_test, passed_test_date, passed_qa, passed_qa_date,
            smt_line, notes
          ) VALUES (
            @id, @job_id, @due_date, @project_code, @customer, @quantity,
            @assembly_name, @part_number, @revision, @target_build_date,
            @start_time, @total_build_time_hours, @status, @checks,
            @passed_test, @passed_test_date, @passed_qa, @passed_qa_date,
            @smt_line, @notes
          );
      `);
  }
}