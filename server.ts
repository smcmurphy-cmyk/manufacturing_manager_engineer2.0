import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { createServer as createViteServer } from 'vite';
import {
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

const BASE_REPORTS_DIR = process.env.REPORTS_OUTPUT_DIR || 'F:\\SQLData\\Reports';
const DEFAULT_STORAGE_DIR = process.env.FAI_STORAGE_DIR || path.join(BASE_REPORTS_DIR, 'FAI');
const DEFAULT_AUDIT_STORAGE_DIR = process.env.AUDIT_STORAGE_DIR || path.join(BASE_REPORTS_DIR, 'Audits');
const DEFAULT_NCR_STORAGE_DIR = process.env.NCR_STORAGE_DIR || path.join(BASE_REPORTS_DIR, 'NCRs');

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
  const targetDir =
    serverPath && serverPath.trim() !== ''
      ? path.isAbsolute(serverPath.trim())
        ? path.normalize(serverPath.trim())
        : path.resolve(process.cwd(), serverPath.trim())
      : baseDir;

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

  return { finalFilePath, safeFileName, size: fileStats.size, targetDir };
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser (Keeping 25mb for now until frontend is migrated to multipart/form-data)
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // -------------------------------------------------------------
  // SYSTEM & DIAGNOSTICS
  // -------------------------------------------------------------
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.get('/api/db/status', async (req, res) => {
    const connected = await isDatabaseConnected();
    res.json({
      connected,
      mode: connected ? 'Local Microsoft SQL Server' : 'Database Unavailable',
      baseReportsDir: BASE_REPORTS_DIR,
    });
  });

  app.get('/api/:module/server-info', (req, res) => {
    const { module } = req.params;
    const isWindows = process.platform === 'win32';

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
          ]
        : [`${BASE_REPORTS_DIR}/${config.folderName}`],
    });
  });

  app.post('/api/:module/verify-path', (req, res) => {
    const { targetPath } = req.body;
    if (!targetPath || typeof targetPath !== 'string') {
      return res.status(400).json({ valid: false, message: 'Target path is required' });
    }

    try {
      const resolved = path.isAbsolute(targetPath)
        ? path.normalize(targetPath)
        : path.resolve(process.cwd(), targetPath);

      if (!fs.existsSync(resolved)) {
        fs.mkdirSync(resolved, { recursive: true });
      }

      const testFile = path.join(resolved, `.test_write_${Date.now()}`);
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);

      return res.json({ valid: true, resolvedPath: resolved, message: 'Path verified' });
    } catch (err: any) {
      return res.status(200).json({ valid: false, resolvedPath: targetPath, message: err.message });
    }
  });

  // -------------------------------------------------------------
  // DYNAMIC PDF UPLOAD & HISTORY ENDPOINTS
  // -------------------------------------------------------------
  app.post('/api/:module/save-pdf', async (req, res) => {
    try {
      const { module } = req.params;
      const {
        serverPath, fileName, pdfBase64,
        jobData, auditData, ncrData,
        operatorName, leadAuditor, editor,
        documentType, referenceNumber
      } = req.body;

      if (!fileName || !pdfBase64) {
        return res.status(400).json({ success: false, message: 'Missing fileName or pdfBase64' });
      }

      // Map dynamic URL parameter to correct storage and DB metadata logic
      const dirMap: Record<string, { dir: string; type: any }> = {
        fai: { dir: DEFAULT_STORAGE_DIR, type: 'FAI' },
        audits: { dir: DEFAULT_AUDIT_STORAGE_DIR, type: 'Audit' },
        ncrs: { dir: DEFAULT_NCR_STORAGE_DIR, type: 'NCR' },
        documents: { dir: path.join(BASE_REPORTS_DIR, documentType || 'Report'), type: 'Report' }
      };

      const config = dirMap[module.toLowerCase()] || dirMap['documents'];
      const saved = savePdfToFileSystem(config.dir, serverPath, fileName, pdfBase64);
      const formattedSize = formatBytes(saved.size);

      // Construct dynamic metadata based on module type
      let meta = {};
      let ref = 'N/A';
      let op = operatorName || leadAuditor || editor || 'System User';

      if (config.type === 'FAI') {
        ref = jobData?.jobId || 'N/A';
        meta = { jobId: jobData?.jobId, assemblyName: jobData?.assemblyName, revision: jobData?.revision, customer: jobData?.customer, totalBuildTimeHours: jobData?.totalBuildTimeHours };
      } else if (config.type === 'Audit') {
        ref = auditData?.id || 'N/A';
        meta = { auditId: auditData?.id, title: auditData?.title, standard: auditData?.standard, cadence: auditData?.cadence, status: auditData?.status };
      } else if (config.type === 'NCR') {
        ref = ncrData?.ncrNumber || 'NCR-RECORD';
        meta = { ncrId: ncrData?.id, ncrNumber: ncrData?.ncrNumber, serialNumber: ncrData?.serialNumber, assemblyPartNumber: ncrData?.assemblyPartNumber, assemblyRevision: ncrData?.assemblyRevision, severity: ncrData?.severity, status: ncrData?.status };
      } else {
        ref = referenceNumber || 'DOC-REF';
        meta = { documentType };
      }

      const archiveRecord = await insertDocumentArchive({
        record_id: `${config.type}-LOG-${Date.now()}`,
        module_type: config.type,
        reference_number: ref,
        server_path: saved.targetDir,
        file_name: saved.safeFileName,
        full_path: saved.finalFilePath,
        file_size_bytes: saved.size,
        file_size_formatted: formattedSize,
        operator_name: op,
        metadata: meta,
      });

      return res.json({
        success: true,
        message: `${config.type} PDF saved successfully to host server`,
        archiveRecord,
        savedPath: saved.finalFilePath,
        fileName: saved.safeFileName,
        fileSize: formattedSize,
      });
    } catch (err: any) {
      console.error(`Failed to save ${req.params.module} PDF:`, err);
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  app.get('/api/:module/history', async (req, res) => {
    try {
      const { module } = req.params;
      const modMap: Record<string, string> = { fai: 'FAI', audits: 'Audit', ncrs: 'NCR', documents: 'Report' };
      const dbType = modMap[module.toLowerCase()] || 'FAI';
      
      const archives = await getDocumentArchives(dbType);
      
      // Map MS SQL records back to the shape the frontend UI expects
      const history = archives.map((a) => ({
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
        loggedAt: a.logged_at,
        status: 'Saved to Server',
      }));

      res.json({ history });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // -------------------------------------------------------------
  // REGISTRY ENDPOINTS
  // -------------------------------------------------------------
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
      if (!asset || !asset.id || !asset.assetId) return res.status(400).json({ success: false, message: 'Invalid payload' });
      const saved = await updateSingleAsset(asset);
      res.json({ success: true, asset: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.put('/api/registry/assets/:id', async (req, res) => {
    try {
      const saved = await updateSingleAsset({ ...req.body, id: req.params.id });
      res.json({ success: true, asset: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/registry/assets/batch', async (req, res) => {
    try {
      await saveAllAssets(req.body.assets);
      res.json({ success: true, count: req.body.assets.length });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/registry/assets/:id/calibrate', async (req, res) => {
    try {
      const { calibratedDate = new Date().toISOString().split('T')[0] } = req.body;
      const currentAssets = await getAssets();
      const asset = currentAssets.find((a) => a.id === req.params.id);
      
      if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });
      
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

  // NCRs
  app.get('/api/registry/ncrs', async (req, res) => {
    try { res.json({ success: true, ncrs: await getNcrs() }); } 
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  });
  app.post('/api/registry/ncrs', async (req, res) => {
    try { res.json({ success: true, ncr: await updateSingleNcr(req.body) }); } 
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  });
  app.put('/api/registry/ncrs/:id', async (req, res) => {
    try { res.json({ success: true, ncr: await updateSingleNcr({ ...req.body, id: req.params.id }) }); } 
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  });
  app.post('/api/registry/ncrs/batch', async (req, res) => {
    try { await saveAllNcrs(req.body.ncrs); res.json({ success: true, count: req.body.ncrs.length }); } 
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  });

  // Audits
  app.get('/api/registry/audits', async (req, res) => {
    try { res.json({ success: true, audits: await getAudits() }); } 
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  });
  app.post('/api/registry/audits/batch', async (req, res) => {
    try { await saveAllAudits(req.body.audits); res.json({ success: true, count: req.body.audits.length }); } 
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  });

  // Training
  app.get('/api/registry/training', async (req, res) => {
    try { res.json({ success: true, training: await getTraining() }); } 
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  });
  app.post('/api/registry/training/batch', async (req, res) => {
    try { await saveAllTraining(req.body.training); res.json({ success: true, count: req.body.training.length }); } 
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  });

  // Jobs
  app.get('/api/registry/jobs', async (req, res) => {
    try { res.json({ success: true, jobs: await getJobs() }); } 
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  });
  app.post('/api/registry/jobs/batch', async (req, res) => {
    try { await saveAllJobs(req.body.jobs); res.json({ success: true, count: req.body.jobs.length }); } 
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dynamic Engineering Operations server running on port ${PORT}`);
  });
}

startServer();