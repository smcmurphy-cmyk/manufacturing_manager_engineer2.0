import express from 'express';
import path from 'path';
import fs from 'fs';
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

const DEFAULT_STORAGE_DIR = process.env.FAI_STORAGE_DIR || path.join(process.cwd(), 'saved_reports', 'fai');
const LOG_FILE_PATH = path.join(process.cwd(), 'saved_reports', 'fai_archive_log.json');

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
      platform: process.platform,
      hostname: require('os').hostname(),
      appDirectory: process.cwd(),
      commonPaths: isWindows
        ? ['C:\\Reports\\FAI_Records', 'D:\\Quality_Logs\\FAI', '.\\saved_reports\\fai']
        : ['/var/log/fai-reports', '/opt/factory/fai_archive', './saved_reports/fai'],
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
      // Handle data URL prefix if present
      const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

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
