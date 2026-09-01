import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { createServer as createViteServer } from 'vite';

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

const BASE_REPORTS_DIR = process.env.REPORTS_OUTPUT_DIR || 'C:\\Users\\smcmu\\OneDrive\\Desktop\\Reports';
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

function loadArchiveLog(): ArchiveLogItem[] {
  try {
    if (fs.existsSync(LOG_FILE_PATH)) {
      const data = fs.readFileSync(LOG_FILE_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading archive log:', err);
  }
  return [];
}

function saveArchiveLog(items: ArchiveLogItem[]) {
  try {
    ensureDirectoryExistence(LOG_FILE_PATH);
    fs.writeFileSync(LOG_FILE_PATH, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving archive log:', err);
  }
}

function loadAuditArchiveLog(): any[] {
  try {
    if (fs.existsSync(AUDIT_LOG_FILE_PATH)) {
      const data = fs.readFileSync(AUDIT_LOG_FILE_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading audit archive log:', err);
  }
  return [];
}

function saveAuditArchiveLog(items: any[]) {
  try {
    ensureDirectoryExistence(AUDIT_LOG_FILE_PATH);
    fs.writeFileSync(AUDIT_LOG_FILE_PATH, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving audit archive log:', err);
  }
}

function loadNcrArchiveLog(): any[] {
  try {
    if (fs.existsSync(NCR_LOG_FILE_PATH)) {
      const data = fs.readFileSync(NCR_LOG_FILE_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading NCR archive log:', err);
  }
  return [];
}

function saveNcrArchiveLog(items: any[]) {
  try {
    ensureDirectoryExistence(NCR_LOG_FILE_PATH);
    fs.writeFileSync(NCR_LOG_FILE_PATH, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving NCR archive log:', err);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

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

  // 2. Server Host Info & Default Storage Path
  app.get('/api/fai/server-info', (req, res) => {
    const isWindows = process.platform === 'win32';
    const defaultSuggested = DEFAULT_STORAGE_DIR;

    res.json({
      defaultStorageDir: defaultSuggested,
      baseReportsDir: BASE_REPORTS_DIR,
      platform: process.platform,
      hostname: os.hostname(),
      appDirectory: process.cwd(),
      commonPaths: isWindows
        ? [
            `${BASE_REPORTS_DIR}\\FAI`,
            BASE_REPORTS_DIR,
            'C:\\Users\\smcmu\\OneDrive\\Desktop\\Reports\\FAI',
            'C:\\Reports\\FAI_Records',
            '.\\saved_reports\\fai',
          ]
        : [
            `${BASE_REPORTS_DIR}/FAI`,
            '/var/log/fai-reports',
            '/opt/factory/fai_archive',
            './saved_reports/fai',
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

  // 4. Save PDF to Host Server Location
  app.post('/api/fai/save-pdf', (req, res) => {
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

      // Determine target destination folder
      const targetDir = serverPath && serverPath.trim() !== ''
        ? (path.isAbsolute(serverPath.trim()) ? path.normalize(serverPath.trim()) : path.resolve(process.cwd(), serverPath.trim()))
        : DEFAULT_STORAGE_DIR;

      // Ensure directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Clean file name
      const safeFileName = fileName.replace(/[/\\?%*:|"<>]/g, '_');
      const finalFilePath = path.join(targetDir, safeFileName);

      // Convert base64 data to binary buffer
      // Handle data URL prefix variants from jsPDF (e.g. data:application/pdf;filename=...;base64, or data:application/pdf;base64,)
      let cleanBase64 = pdfBase64;
      if (cleanBase64.includes(';base64,')) {
        cleanBase64 = cleanBase64.split(';base64,')[1];
      } else if (cleanBase64.startsWith('data:')) {
        cleanBase64 = cleanBase64.replace(/^data:[^,]+,/, '');
      }
      
      const buffer = Buffer.from(cleanBase64.trim(), 'base64');

      // Write file to host disk
      fs.writeFileSync(finalFilePath, buffer);

      const fileStats = fs.statSync(finalFilePath);
      const formattedSize = formatBytes(fileStats.size);

      // Record to archive audit history log
      const history = loadArchiveLog();
      const newRecord: ArchiveLogItem = {
        id: `LOG-${Date.now()}`,
        jobId: jobData?.jobId || 'N/A',
        assemblyName: jobData?.assemblyName || 'Unknown Assembly',
        revision: jobData?.revision || 'Rev 1.0',
        customer: jobData?.customer,
        totalBuildTimeHours: jobData?.totalBuildTimeHours,
        serverPath: targetDir,
        fileName: safeFileName,
        fullPath: finalFilePath,
        fileSizeBytes: fileStats.size,
        fileSizeFormatted: formattedSize,
        operatorName,
        loggedAt: new Date().toISOString(),
        status: 'Saved to Server',
      };

      history.unshift(newRecord);
      saveArchiveLog(history.slice(0, 100)); // keep last 100 records

      return res.json({
        success: true,
        message: 'FAI completion PDF saved successfully to host server',
        record: newRecord,
        savedPath: finalFilePath,
        fileName: safeFileName,
        fileSize: formattedSize,
        timestamp: newRecord.loggedAt,
      });
    } catch (err: any) {
      console.error('Failed to save PDF on server:', err);
      return res.status(500).json({
        success: false,
        message: `Failed to save PDF to server: ${err.message || 'Unknown error'}`,
      });
    }
  });

  // 5. Get Saved Archives History
  app.get('/api/fai/history', (req, res) => {
    const history = loadArchiveLog();
    res.json({ history });
  });

  // 6. Download Saved Archive directly from host
  app.get('/api/fai/download/:id', (req, res) => {
    const { id } = req.params;
    const history = loadArchiveLog();
    const item = history.find((h) => h.id === id);

    if (!item || !fs.existsSync(item.fullPath)) {
      return res.status(404).json({ error: 'Archived file not found on server' });
    }

    res.download(item.fullPath, item.fileName);
  });

  // 7. Audit Server Info & Storage Path
  app.get('/api/audits/server-info', (req, res) => {
    const isWindows = process.platform === 'win32';
    const defaultSuggested = DEFAULT_AUDIT_STORAGE_DIR;

    res.json({
      defaultStorageDir: defaultSuggested,
      baseReportsDir: BASE_REPORTS_DIR,
      platform: process.platform,
      hostname: os.hostname(),
      appDirectory: process.cwd(),
      commonPaths: isWindows
        ? [
            `${BASE_REPORTS_DIR}\\Audits`,
            `${BASE_REPORTS_DIR}\\Compliance`,
            BASE_REPORTS_DIR,
            'C:\\Users\\smcmu\\OneDrive\\Desktop\\Reports\\Audits',
            'C:\\Reports\\Audit_Records',
            '.\\saved_reports\\audits',
          ]
        : [
            `${BASE_REPORTS_DIR}/Audits`,
            `${BASE_REPORTS_DIR}/Compliance`,
            '/var/log/audit-reports',
            './saved_reports/audits',
          ],
    });
  });

  // 8. Save Audit PDF to Host Server Location
  app.post('/api/audits/save-pdf', (req, res) => {
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

      // Determine target destination folder
      const targetDir = serverPath && serverPath.trim() !== ''
        ? (path.isAbsolute(serverPath.trim()) ? path.normalize(serverPath.trim()) : path.resolve(process.cwd(), serverPath.trim()))
        : DEFAULT_AUDIT_STORAGE_DIR;

      // Ensure directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Clean file name
      const safeFileName = fileName.replace(/[/\\?%*:|"<>]/g, '_');
      const finalFilePath = path.join(targetDir, safeFileName);

      // Clean base64 buffer
      let cleanBase64 = pdfBase64;
      if (cleanBase64.includes(';base64,')) {
        cleanBase64 = cleanBase64.split(';base64,')[1];
      } else if (cleanBase64.startsWith('data:')) {
        cleanBase64 = cleanBase64.replace(/^data:[^,]+,/, '');
      }

      const buffer = Buffer.from(cleanBase64.trim(), 'base64');
      fs.writeFileSync(finalFilePath, buffer);

      const fileStats = fs.statSync(finalFilePath);
      const formattedSize = formatBytes(fileStats.size);

      // Record to audit archive log
      const history = loadAuditArchiveLog();
      const newRecord = {
        id: `AUD-LOG-${Date.now()}`,
        auditId: auditData?.id || 'N/A',
        title: auditData?.title || 'Audit Event',
        standard: auditData?.standard || 'AS9100D',
        cadence: auditData?.cadence,
        status: auditData?.status || 'Compliant',
        serverPath: targetDir,
        fileName: safeFileName,
        fullPath: finalFilePath,
        fileSizeBytes: fileStats.size,
        fileSizeFormatted: formattedSize,
        leadAuditor,
        loggedAt: new Date().toISOString(),
      };

      history.unshift(newRecord);
      saveAuditArchiveLog(history.slice(0, 100));

      return res.json({
        success: true,
        message: 'Audit report PDF saved successfully to host server',
        record: newRecord,
        savedPath: finalFilePath,
        fileName: safeFileName,
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

  // 9. Generic Document Save PDF
  app.post('/api/documents/save-pdf', (req, res) => {
    try {
      const {
        serverPath,
        fileName,
        pdfBase64,
        documentType = 'Report',
        metadata = {},
      } = req.body;

      if (!fileName || !pdfBase64) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters (fileName, pdfBase64)',
        });
      }

      const targetDir = serverPath && serverPath.trim() !== ''
        ? (path.isAbsolute(serverPath.trim()) ? path.normalize(serverPath.trim()) : path.resolve(process.cwd(), serverPath.trim()))
        : path.join(BASE_REPORTS_DIR, documentType);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const safeFileName = fileName.replace(/[/\\?%*:|"<>]/g, '_');
      const finalFilePath = path.join(targetDir, safeFileName);

      let cleanBase64 = pdfBase64;
      if (cleanBase64.includes(';base64,')) {
        cleanBase64 = cleanBase64.split(';base64,')[1];
      } else if (cleanBase64.startsWith('data:')) {
        cleanBase64 = cleanBase64.replace(/^data:[^,]+,/, '');
      }

      const buffer = Buffer.from(cleanBase64.trim(), 'base64');
      fs.writeFileSync(finalFilePath, buffer);

      const fileStats = fs.statSync(finalFilePath);
      const formattedSize = formatBytes(fileStats.size);

      return res.json({
        success: true,
        message: 'Document PDF saved successfully to host server',
        savedPath: finalFilePath,
        fileName: safeFileName,
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

  // 10. NCR Server Info & Storage Path
  app.get('/api/ncrs/server-info', (req, res) => {
    const isWindows = process.platform === 'win32';
    const defaultSuggested = DEFAULT_NCR_STORAGE_DIR;

    res.json({
      defaultStorageDir: defaultSuggested,
      baseReportsDir: BASE_REPORTS_DIR,
      platform: process.platform,
      hostname: os.hostname(),
      appDirectory: process.cwd(),
      commonPaths: isWindows
        ? [
            `${BASE_REPORTS_DIR}\\NCRs`,
            `${BASE_REPORTS_DIR}\\Compliance`,
            `${BASE_REPORTS_DIR}\\QA`,
            BASE_REPORTS_DIR,
            'C:\\Users\\smcmu\\OneDrive\\Desktop\\Reports\\NCRs',
            'C:\\Reports\\NCR_Records',
            '.\\saved_reports\\ncrs',
          ]
        : [
            `${BASE_REPORTS_DIR}/NCRs`,
            `${BASE_REPORTS_DIR}/Compliance`,
            '/var/log/ncr-reports',
            './saved_reports/ncrs',
          ],
    });
  });

  // 11. Save NCR PDF to Host Server Location
  app.post('/api/ncrs/save-pdf', (req, res) => {
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

      // Determine target destination folder
      const targetDir = serverPath && serverPath.trim() !== ''
        ? (path.isAbsolute(serverPath.trim()) ? path.normalize(serverPath.trim()) : path.resolve(process.cwd(), serverPath.trim()))
        : DEFAULT_NCR_STORAGE_DIR;

      // Ensure directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Clean file name
      const safeFileName = fileName.replace(/[/\\?%*:|"<>]/g, '_');
      const finalFilePath = path.join(targetDir, safeFileName);

      // Clean base64 buffer
      let cleanBase64 = pdfBase64;
      if (cleanBase64.includes(';base64,')) {
        cleanBase64 = cleanBase64.split(';base64,')[1];
      } else if (cleanBase64.startsWith('data:')) {
        cleanBase64 = cleanBase64.replace(/^data:[^,]+,/, '');
      }

      const buffer = Buffer.from(cleanBase64.trim(), 'base64');
      fs.writeFileSync(finalFilePath, buffer);

      const fileStats = fs.statSync(finalFilePath);
      const formattedSize = formatBytes(fileStats.size);

      // Record to NCR archive log
      const history = loadNcrArchiveLog();
      const newRecord = {
        id: `NCR-LOG-${Date.now()}`,
        ncrId: ncrData?.id || 'N/A',
        ncrNumber: ncrData?.ncrNumber || 'NCR-RECORD',
        serialNumber: ncrData?.serialNumber || 'N/A',
        assemblyPartNumber: ncrData?.assemblyPartNumber || 'N/A',
        assemblyRevision: ncrData?.assemblyRevision || 'N/A',
        severity: ncrData?.severity || 'Major',
        status: ncrData?.status || 'Open',
        serverPath: targetDir,
        fileName: safeFileName,
        fullPath: finalFilePath,
        fileSizeBytes: fileStats.size,
        fileSizeFormatted: formattedSize,
        editor,
        lastEditedAt: ncrData?.lastEditedAt || new Date().toISOString(),
        loggedAt: new Date().toISOString(),
      };

      history.unshift(newRecord);
      saveNcrArchiveLog(history.slice(0, 100));

      return res.json({
        success: true,
        message: 'NCR report PDF saved successfully to host server',
        record: newRecord,
        savedPath: finalFilePath,
        fileName: safeFileName,
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
