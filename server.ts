import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { createServer as createViteServer } from 'vite';
import {
  supabase,
  isDatabaseConnected,
  insertDocumentArchive,
  getDocumentArchives,
  getAssets,
  saveAllAssets,
  updateSingleAsset,
  getNcrs,
  saveAllNcrs,
  updateSingleNcr,
  getAudits,
  saveAllAudits,
  getTraining,
  saveAllTraining,
  getJobs,
  saveAllJobs,
} from './db';

interface ArchiveLogItem {
  id: string;
  jobId: string;
  assemblyName: string;
  revision: string;
  customer?: string;
  totalBuildTimeHours?: number | string;
  serverPath: string;
  fileName: string;
  fullPath: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  operatorName: string;
  loggedAt: string;
  status: string;
}

const BASE_REPORTS_DIR = process.env.REPORTS_OUTPUT_DIR || 'C:\\Apps\\Reports';
const DEFAULT_STORAGE_DIR =
  process.env.FAI_STORAGE_DIR ||
  (process.env.REPORTS_OUTPUT_DIR
    ? path.join(process.env.REPORTS_OUTPUT_DIR, 'FAI')
    : path.join(process.cwd(), 'saved_reports', 'fai'));
const DEFAULT_AUDIT_STORAGE_DIR =
  process.env.AUDIT_STORAGE_DIR ||
  (process.env.REPORTS_OUTPUT_DIR
    ? path.join(process.env.REPORTS_OUTPUT_DIR, 'Audits')
    : path.join(process.cwd(), 'saved_reports', 'audits'));
const DEFAULT_NCR_STORAGE_DIR =
  process.env.NCR_STORAGE_DIR ||
  (process.env.REPORTS_OUTPUT_DIR
    ? path.join(process.env.REPORTS_OUTPUT_DIR, 'NCRs')
    : path.join(process.cwd(), 'saved_reports', 'ncrs'));
const LOG_FILE_PATH = path.join(process.cwd(), 'saved_reports', 'fai_archive_log.json');
const AUDIT_LOG_FILE_PATH = path.join(process.cwd(), 'saved_reports', 'audit_archive_log.json');
const NCR_LOG_FILE_PATH = path.join(process.cwd(), 'saved_reports', 'ncr_archive_log.json');

function ensureDirectoryExistence(filePath: string) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

function loadJsonLog<T = any>(filePath: string): T[] {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`Error loading log at ${filePath}:`, err);
  }
  return [];
}

function saveJsonLog<T = any>(filePath: string, items: T[]) {
  try {
    ensureDirectoryExistence(filePath);
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error saving log at ${filePath}:`, err);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Reusable helper for file operations and base64 PDF persistence
const savePdfToFileSystem = (
  baseDir: string,
  serverPath: string | undefined,
  fileName: string,
  pdfBase64: string
) => {
  // Determine target directory
  const targetDir =
    serverPath && serverPath.trim() !== ''
      ? path.isAbsolute(serverPath.trim())
        ? path.normalize(serverPath.trim())
        : path.resolve(process.cwd(), serverPath.trim())
      : baseDir;

  // Ensure directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Clean file name
  const safeFileName = fileName.replace(/[/\\?%*:|"<>]/g, '_');
  const finalFilePath = path.join(targetDir, safeFileName);

  // Clean base64 buffer (strips headers if present)
  let cleanBase64 = pdfBase64;
  if (cleanBase64.includes(';base64,')) {
    cleanBase64 = cleanBase64.split(';base64,')[1];
  } else if (cleanBase64.startsWith('data:')) {
    cleanBase64 = cleanBase64.replace(/^data:[^,]+,/, '');
  }

  // Write file
  const buffer = Buffer.from(cleanBase64.trim(), 'base64');
  fs.writeFileSync(finalFilePath, buffer);
  const fileStats = fs.statSync(finalFilePath);

  return { finalFilePath, safeFileName, size: fileStats.size, targetDir };
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser with sufficient limit for base64 PDFs
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // API Routes

  // 1. Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // 2. Unified Server Host Info & Storage Paths
  app.get('/api/:module/server-info', (req, res) => {
    const { module } = req.params; // 'fai', 'audits', or 'ncrs'
    const isWindows = process.platform === 'win32';

    // Map the URL parameter to the correct default directories
    const dirMap: Record<string, { defaultDir: string; folderName: string }> = {
      fai: { defaultDir: DEFAULT_STORAGE_DIR, folderName: 'FAI' },
      audits: { defaultDir: DEFAULT_AUDIT_STORAGE_DIR, folderName: 'Audits' },
      ncrs: { defaultDir: DEFAULT_NCR_STORAGE_DIR, folderName: 'NCRs' },
    };

    const config = dirMap[module.toLowerCase()] || dirMap['fai'];

    res.json({
      defaultStorageDir: config.defaultDir,
      baseReportsDir: BASE_REPORTS_DIR,
      platform: process.platform,
      hostname: os.hostname(),
      appDirectory: process.cwd(),
      commonPaths: isWindows
        ? [
            `${BASE_REPORTS_DIR}\\${config.folderName}`,
            `${BASE_REPORTS_DIR}\\Compliance`,
            BASE_REPORTS_DIR,
            `C:\\Apps\\Reports\\${config.folderName}`,
            `C:\\Users\\smcmu\\OneDrive\\Desktop\\Reports\\${config.folderName}`,
            `.\\saved_reports\\${module.toLowerCase()}`,
          ]
        : [
            `${BASE_REPORTS_DIR}/${config.folderName}`,
            `/var/log/${module.toLowerCase()}-reports`,
            `./saved_reports/${module.toLowerCase()}`,
          ],
    });
  });

  // 3. Verify Server Path Writable
  app.post('/api/fai/verify-path', (req, res) => {
    const { targetPath } = req.body;
    if (!targetPath || typeof targetPath !== 'string') {
      return res.status(400).json({ valid: false, message: 'Target path is required' });
    }

    try {
      const resolved = path.isAbsolute(targetPath)
        ? path.normalize(targetPath)
        : path.resolve(process.cwd(), targetPath);

      // Check if directory exists or can be created
      if (!fs.existsSync(resolved)) {
        fs.mkdirSync(resolved, { recursive: true });
      }

      // Test write permission
      const testFile = path.join(resolved, `.test_write_${Date.now()}`);
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);

      return res.json({
        valid: true,
        resolvedPath: resolved,
        message: 'Server storage path is verified and writable',
      });
    } catch (err: any) {
      return res.status(200).json({
        valid: false,
        resolvedPath: targetPath,
        message: `Path verification error: ${err.message || 'Permission denied'}`,
      });
    }
  });

  // 4. Save PDF to Host Server Location (Dual-Storage: Disk Binary + Postgres Archive Pointer)
  app.post('/api/fai/save-pdf', async (req, res) => {
    try {
      const {
        serverPath,
        fileName,
        pdfBase64,
        jobData,
        operatorName = 'Manufacturing Engineer',
      } = req.body;

      if (!fileName || !pdfBase64) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters (fileName, pdfBase64)',
        });
      }

      // 1. Save PDF binary to filesystem using shared helper
      const saved = savePdfToFileSystem(DEFAULT_STORAGE_DIR, serverPath, fileName, pdfBase64);
      const formattedSize = formatBytes(saved.size);

      // 2. Insert metadata and file pointer into PostgreSQL / Supabase
      const archiveRecord = await insertDocumentArchive({
        record_id: `LOG-${Date.now()}`,
        module_type: 'FAI',
        reference_number: jobData?.jobId || 'N/A',
        server_path: saved.targetDir,
        file_name: saved.safeFileName,
        full_path: saved.finalFilePath,
        file_size_bytes: saved.size,
        file_size_formatted: formattedSize,
        operator_name: operatorName,
        metadata: {
          jobId: jobData?.jobId || 'N/A',
          assemblyName: jobData?.assemblyName || 'Unknown Assembly',
          revision: jobData?.revision || 'Rev 1.0',
          customer: jobData?.customer,
          totalBuildTimeHours: jobData?.totalBuildTimeHours,
        },
        logged_at: new Date().toISOString(),
      });

      // Maintain legacy JSON archive log for backwards compatibility
      const history = loadJsonLog<ArchiveLogItem>(LOG_FILE_PATH);
      const legacyRecord: ArchiveLogItem = {
        id: archiveRecord.record_id,
        jobId: jobData?.jobId || 'N/A',
        assemblyName: jobData?.assemblyName || 'Unknown Assembly',
        revision: jobData?.revision || 'Rev 1.0',
        customer: jobData?.customer,
        totalBuildTimeHours: jobData?.totalBuildTimeHours,
        serverPath: saved.targetDir,
        fileName: saved.safeFileName,
        fullPath: saved.finalFilePath,
        fileSizeBytes: saved.size,
        fileSizeFormatted: formattedSize,
        operatorName,
        loggedAt: archiveRecord.logged_at || new Date().toISOString(),
        status: 'Saved to Server',
      };

      history.unshift(legacyRecord);
      saveJsonLog(LOG_FILE_PATH, history.slice(0, 100)); // keep last 100 records

      return res.json({
        success: true,
        message: 'FAI completion PDF saved successfully to host server',
        record: legacyRecord,
        archiveRecord,
        savedPath: saved.finalFilePath,
        fileName: saved.safeFileName,
        fileSize: formattedSize,
        timestamp: legacyRecord.loggedAt,
      });
    } catch (err: any) {
      console.error('Failed to save PDF on server:', err);
      return res.status(500).json({
        success: false,
        message: `Failed to save PDF to server: ${err.message || 'Unknown error'}`,
      });
    }
  });

  // 5. Get Saved Archives History (From PostgreSQL document_archives)
  app.get('/api/fai/history', async (req, res) => {
    try {
      const archives = await getDocumentArchives('FAI');
      const history: ArchiveLogItem[] = archives.map((a) => ({
        id: a.record_id,
        jobId: a.reference_number || a.metadata?.jobId || 'N/A',
        assemblyName: a.metadata?.assemblyName || 'Unknown Assembly',
        revision: a.metadata?.revision || 'Rev 1.0',
        customer: a.metadata?.customer,
        totalBuildTimeHours: a.metadata?.totalBuildTimeHours,
        serverPath: a.server_path,
        fileName: a.file_name,
        fullPath: a.full_path,
        fileSizeBytes: a.file_size_bytes,
        fileSizeFormatted: a.file_size_formatted,
        operatorName: a.operator_name,
        loggedAt: a.logged_at || new Date().toISOString(),
        status: 'Saved to Server',
      }));

      // Combine with local legacy history if any
      const legacyHistory = loadJsonLog<ArchiveLogItem>(LOG_FILE_PATH);
      const seenIds = new Set(history.map((h) => h.id));
      for (const item of legacyHistory) {
        if (!seenIds.has(item.id)) {
          history.push(item);
        }
      }

      res.json({ history });
    } catch (e: any) {
      const history = loadJsonLog<ArchiveLogItem>(LOG_FILE_PATH);
      res.json({ history });
    }
  });

  // 6. Download Saved Archive directly from host
  app.get('/api/fai/download/:id', (req, res) => {
    const { id } = req.params;
    const history = loadJsonLog<ArchiveLogItem>(LOG_FILE_PATH);
    const item = history.find((h) => h.id === id);

    if (!item || !fs.existsSync(item.fullPath)) {
      return res.status(404).json({ error: 'Archived file not found on server' });
    }

    res.download(item.fullPath, item.fileName);
  });

  // 7. Save Audit PDF to Host Server Location (Dual-Storage)
  app.post('/api/audits/save-pdf', async (req, res) => {
    try {
      const {
        serverPath,
        fileName,
        pdfBase64,
        auditData,
        leadAuditor = 'Lead QMS Auditor',
      } = req.body;

      if (!fileName || !pdfBase64) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters (fileName, pdfBase64)',
        });
      }

      // Save PDF to filesystem using shared helper
      const saved = savePdfToFileSystem(DEFAULT_AUDIT_STORAGE_DIR, serverPath, fileName, pdfBase64);
      const formattedSize = formatBytes(saved.size);

      // Insert into PostgreSQL document_archives
      const archiveRecord = await insertDocumentArchive({
        record_id: `AUD-LOG-${Date.now()}`,
        module_type: 'Audit',
        reference_number: auditData?.id || 'N/A',
        server_path: saved.targetDir,
        file_name: saved.safeFileName,
        full_path: saved.finalFilePath,
        file_size_bytes: saved.size,
        file_size_formatted: formattedSize,
        operator_name: leadAuditor,
        metadata: {
          auditId: auditData?.id,
          title: auditData?.title,
          standard: auditData?.standard,
          cadence: auditData?.cadence,
          status: auditData?.status,
        },
        logged_at: new Date().toISOString(),
      });

      // Record to audit archive log
      const history = loadJsonLog(AUDIT_LOG_FILE_PATH);
      const newRecord = {
        id: archiveRecord.record_id,
        auditId: auditData?.id || 'N/A',
        title: auditData?.title || 'Audit Event',
        standard: auditData?.standard || 'AS9100D',
        cadence: auditData?.cadence,
        status: auditData?.status || 'Compliant',
        serverPath: saved.targetDir,
        fileName: saved.safeFileName,
        fullPath: saved.finalFilePath,
        fileSizeBytes: saved.size,
        fileSizeFormatted: formattedSize,
        leadAuditor,
        loggedAt: archiveRecord.logged_at || new Date().toISOString(),
      };

      history.unshift(newRecord);
      saveJsonLog(AUDIT_LOG_FILE_PATH, history.slice(0, 100));

      return res.json({
        success: true,
        message: 'Audit report PDF saved successfully to host server',
        record: newRecord,
        archiveRecord,
        savedPath: saved.finalFilePath,
        fileName: saved.safeFileName,
        fileSize: formattedSize,
        timestamp: newRecord.loggedAt,
      });
    } catch (err: any) {
      console.error('Failed to save audit PDF on server:', err);
      return res.status(500).json({
        success: false,
        message: `Failed to save audit PDF to server: ${err.message || 'Unknown error'}`,
      });
    }
  });

  // 9. Generic Document Save PDF (Dual-Storage)
  app.post('/api/documents/save-pdf', async (req, res) => {
    try {
      const {
        serverPath,
        fileName,
        pdfBase64,
        documentType = 'Report',
        referenceNumber = 'DOC-REF',
        operatorName = 'Manufacturing Engineer',
      } = req.body;

      if (!fileName || !pdfBase64) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters (fileName, pdfBase64)',
        });
      }

      const defaultDir = path.join(BASE_REPORTS_DIR, documentType);
      const saved = savePdfToFileSystem(defaultDir, serverPath, fileName, pdfBase64);
      const formattedSize = formatBytes(saved.size);

      // Record to PostgreSQL document_archives
      const archiveRecord = await insertDocumentArchive({
        record_id: `DOC-LOG-${Date.now()}`,
        module_type: 'Report',
        reference_number: referenceNumber,
        server_path: saved.targetDir,
        file_name: saved.safeFileName,
        full_path: saved.finalFilePath,
        file_size_bytes: saved.size,
        file_size_formatted: formattedSize,
        operator_name: operatorName,
        metadata: { documentType },
        logged_at: new Date().toISOString(),
      });

      return res.json({
        success: true,
        message: 'Document PDF saved successfully to host server',
        archiveRecord,
        savedPath: saved.finalFilePath,
        fileName: saved.safeFileName,
        fileSize: formattedSize,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Failed to save document PDF on server:', err);
      return res.status(500).json({
        success: false,
        message: `Failed to save document PDF to server: ${err.message || 'Unknown error'}`,
      });
    }
  });

  // 9. Save NCR PDF to Host Server Location (Dual-Storage)
  app.post('/api/ncrs/save-pdf', async (req, res) => {
    try {
      const {
        serverPath,
        fileName,
        pdfBase64,
        ncrData,
        editor = 'Quality Engineer',
      } = req.body;

      if (!fileName || !pdfBase64) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters (fileName, pdfBase64)',
        });
      }

      // Save PDF to filesystem using shared helper
      const saved = savePdfToFileSystem(DEFAULT_NCR_STORAGE_DIR, serverPath, fileName, pdfBase64);
      const formattedSize = formatBytes(saved.size);

      // Insert into PostgreSQL document_archives
      const archiveRecord = await insertDocumentArchive({
        record_id: `NCR-LOG-${Date.now()}`,
        module_type: 'NCR',
        reference_number: ncrData?.ncrNumber || 'NCR-RECORD',
        server_path: saved.targetDir,
        file_name: saved.safeFileName,
        full_path: saved.finalFilePath,
        file_size_bytes: saved.size,
        file_size_formatted: formattedSize,
        operator_name: editor,
        metadata: {
          ncrId: ncrData?.id,
          ncrNumber: ncrData?.ncrNumber,
          serialNumber: ncrData?.serialNumber,
          assemblyPartNumber: ncrData?.assemblyPartNumber,
          assemblyRevision: ncrData?.assemblyRevision,
          severity: ncrData?.severity,
          status: ncrData?.status,
        },
        logged_at: new Date().toISOString(),
      });

      // Record to NCR archive log
      const history = loadJsonLog(NCR_LOG_FILE_PATH);
      const newRecord = {
        id: archiveRecord.record_id,
        ncrId: ncrData?.id || 'N/A',
        ncrNumber: ncrData?.ncrNumber || 'NCR-RECORD',
        serialNumber: ncrData?.serialNumber || 'N/A',
        assemblyPartNumber: ncrData?.assemblyPartNumber || 'N/A',
        assemblyRevision: ncrData?.assemblyRevision || 'N/A',
        severity: ncrData?.severity || 'Major',
        status: ncrData?.status || 'Open',
        serverPath: saved.targetDir,
        fileName: saved.safeFileName,
        fullPath: saved.finalFilePath,
        fileSizeBytes: saved.size,
        fileSizeFormatted: formattedSize,
        editor,
        lastEditedAt: ncrData?.lastEditedAt || new Date().toISOString(),
        loggedAt: archiveRecord.logged_at || new Date().toISOString(),
      };

      history.unshift(newRecord);
      saveJsonLog(NCR_LOG_FILE_PATH, history.slice(0, 100));

      return res.json({
        success: true,
        message: 'NCR report PDF saved successfully to host server',
        record: newRecord,
        archiveRecord,
        savedPath: saved.finalFilePath,
        fileName: saved.safeFileName,
        fileSize: formattedSize,
        timestamp: newRecord.loggedAt,
      });
    } catch (err: any) {
      console.error('Failed to save NCR PDF on server:', err);
      return res.status(500).json({
        success: false,
        message: `Failed to save NCR PDF to server: ${err.message || 'Unknown error'}`,
      });
    }
  });

  // -------------------------------------------------------------
  // 12. DATABASE & REGISTRY PERSISTENCE API (Phase 3 Decoupling)
  // -------------------------------------------------------------

  // Database Connection & Storage Status
  app.get('/api/db/status', (req, res) => {
    const connected = isDatabaseConnected();
    res.json({
      connected,
      mode: connected
        ? 'Supabase PostgreSQL'
        : 'Local Disk Fallback (Persistent JSON in saved_reports/data/)',
      supabaseConfigured: connected,
      baseReportsDir: BASE_REPORTS_DIR,
    });
  });

  // --- Asset Calibration Registry ---
  app.get('/api/registry/assets', async (req, res) => {
    try {
      const assets = await getAssets();
      res.json({ success: true, assets });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/registry/assets', async (req, res) => {
    try {
      const asset = req.body;
      if (!asset || !asset.id || !asset.assetId) {
        return res.status(400).json({ success: false, message: 'Invalid asset payload' });
      }
      const saved = await updateSingleAsset(asset);
      res.json({ success: true, asset: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.put('/api/registry/assets/:id', async (req, res) => {
    try {
      const asset = { ...req.body, id: req.params.id };
      const saved = await updateSingleAsset(asset);
      res.json({ success: true, asset: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/registry/assets/batch', async (req, res) => {
    try {
      const { assets } = req.body;
      if (!Array.isArray(assets)) {
        return res.status(400).json({ success: false, message: 'Expected array of assets' });
      }
      await saveAllAssets(assets);
      res.json({ success: true, count: assets.length });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/registry/assets/:id/calibrate', async (req, res) => {
    try {
      const { id } = req.params;
      const { calibratedDate = new Date().toISOString().split('T')[0] } = req.body;
      const currentAssets = await getAssets();
      const asset = currentAssets.find((a) => a.id === id);
      if (!asset) {
        return res.status(404).json({ success: false, message: 'Asset not found' });
      }
      const baseDate = new Date(calibratedDate);
      const nextDue = new Date(baseDate);
      nextDue.setDate(nextDue.getDate() + (asset.intervalDays || 180));

      const updatedAsset = {
        ...asset,
        lastCompleted: calibratedDate,
        nextDueDate: nextDue.toISOString().split('T')[0],
        status: 'Operational / Calibrated' as const,
      };

      await updateSingleAsset(updatedAsset);
      res.json({ success: true, asset: updatedAsset });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // --- Non-Conformance Reports (NCRs) ---
  app.get('/api/registry/ncrs', async (req, res) => {
    try {
      const ncrs = await getNcrs();
      res.json({ success: true, ncrs });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/registry/ncrs', async (req, res) => {
    try {
      const ncr = req.body;
      if (!ncr || !ncr.id) {
        return res.status(400).json({ success: false, message: 'Invalid NCR payload' });
      }
      const saved = await updateSingleNcr(ncr);
      res.json({ success: true, ncr: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.put('/api/registry/ncrs/:id', async (req, res) => {
    try {
      const ncr = { ...req.body, id: req.params.id };
      const saved = await updateSingleNcr(ncr);
      res.json({ success: true, ncr: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/registry/ncrs/batch', async (req, res) => {
    try {
      const { ncrs } = req.body;
      if (!Array.isArray(ncrs)) {
        return res.status(400).json({ success: false, message: 'Expected array of ncrs' });
      }
      await saveAllNcrs(ncrs);
      res.json({ success: true, count: ncrs.length });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // --- Compliance Audits ---
  app.get('/api/registry/audits', async (req, res) => {
    try {
      const audits = await getAudits();
      res.json({ success: true, audits });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/registry/audits/batch', async (req, res) => {
    try {
      const { audits } = req.body;
      if (!Array.isArray(audits)) {
        return res.status(400).json({ success: false, message: 'Expected array of audits' });
      }
      await saveAllAudits(audits);
      res.json({ success: true, count: audits.length });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // --- Operator Training ---
  app.get('/api/registry/training', async (req, res) => {
    try {
      const training = await getTraining();
      res.json({ success: true, training });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/registry/training/batch', async (req, res) => {
    try {
      const { training } = req.body;
      if (!Array.isArray(training)) {
        return res.status(400).json({ success: false, message: 'Expected array of training records' });
      }
      await saveAllTraining(training);
      res.json({ success: true, count: training.length });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // --- Engineering Jobs ---
  app.get('/api/registry/jobs', async (req, res) => {
    try {
      const jobs = await getJobs();
      res.json({ success: true, jobs });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/registry/jobs/batch', async (req, res) => {
    try {
      const { jobs } = req.body;
      if (!Array.isArray(jobs)) {
        return res.status(400).json({ success: false, message: 'Expected array of jobs' });
      }
      await saveAllJobs(jobs);
      res.json({ success: true, count: jobs.length });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dynamic Engineering Operations server running on port ${PORT}`);
  });
}

startServer();
