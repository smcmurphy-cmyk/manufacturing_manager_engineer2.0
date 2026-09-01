import React, { useState, useEffect } from 'react';
import {
  FileEdit,
  X,
  Save,
  CheckCircle2,
  Calendar,
  Clock,
  AlertTriangle,
  RotateCw,
  ShieldCheck,
  FileText,
  FolderTree,
  Server,
  Download,
  Copy,
  Check,
  RefreshCw,
  History,
  Layers,
  UserCheck,
  CheckCircle,
  AlertOctagon,
} from 'lucide-react';
import { NCRRecord, SeverityLevel, NCRStatus, NCREditLogEntry } from '../../types';
import { APP_PATHS } from '../../config/paths';
import { generateNcrPdf } from '../../utils/ncrPdfGenerator';

interface EditNcrModalProps {
  isOpen: boolean;
  ncr: NCRRecord | null;
  onClose: () => void;
  onSave: (updatedNcr: NCRRecord) => void;
}

export const EditNcrModal: React.FC<EditNcrModalProps> = ({
  isOpen,
  ncr,
  onClose,
  onSave,
}) => {
  const getNowFormatted = (): string => {
    const d = new Date();
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    return `${dateStr} ${timeStr}`;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState<NCRRecord | null>(null);
  const [editorName, setEditorName] = useState<string>('Lead Quality Engineer');
  const [changeNote, setChangeNote] = useState<string>('');
  const [serverPath, setServerPath] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [savedDetails, setSavedDetails] = useState<{
    savedPath: string;
    fileName: string;
    fileSize: string;
    timestamp: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [serverInfo, setServerInfo] = useState<{
    defaultStorageDir: string;
    platform: string;
    hostname: string;
    commonPaths: string[];
  } | null>(null);

  const [copiedPath, setCopiedPath] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<{
    checked: boolean;
    valid: boolean;
    message: string;
  } | null>(null);

  const [liveTimestamp, setLiveTimestamp] = useState<string>(getNowFormatted());

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setLiveTimestamp(getNowFormatted());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !ncr) return;

    setFormData({
      ...ncr,
      rootCauseAnalysis: ncr.rootCauseAnalysis || 'Root cause investigation under AS9100D §8.7 and IPC-A-610 Class 3.',
      correctiveActionPlan: ncr.correctiveActionPlan || ncr.nextAction || 'Implement verified containment and process parameter updates.',
    });

    setEditorName(ncr.lastEditedBy || 'Lead Quality Engineer');
    setChangeNote('');
    setSaveSuccess(false);
    setSavedDetails(null);
    setErrorMessage(null);
    setVerificationResult(null);

    // Auto-generate clean PDF filename
    const safeNcrNum = (ncr.ncrNumber || 'NCR').replace(/[^a-zA-Z0-9]/g, '_');
    const safePart = (ncr.assemblyPartNumber || 'PART').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    const defaultName = `${safeNcrNum}_${safePart}_${todayStr}.pdf`;
    setFileName(defaultName);

    // Fetch server host storage info
    fetch('/api/ncrs/server-info')
      .then((res) => res.json())
      .then((info) => {
        setServerInfo(info);
        const storedPath = localStorage.getItem('ncr_custom_server_path');
        if (storedPath) {
          setServerPath(storedPath);
        } else if (info.defaultStorageDir) {
          setServerPath(info.defaultStorageDir);
        } else {
          setServerPath(APP_PATHS.NCR_REPORTS);
        }
      })
      .catch(() => {
        const storedPath = localStorage.getItem('ncr_custom_server_path');
        setServerPath(storedPath || APP_PATHS.NCR_REPORTS);
      });
  }, [isOpen, ncr]);

  if (!isOpen || !formData || !ncr) return null;

  const handleVerifyPath = async () => {
    if (!serverPath.trim()) return;
    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const res = await fetch('/api/fai/verify-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath: serverPath.trim() }),
      });
      const data = await res.json();
      setVerificationResult({
        checked: true,
        valid: data.valid,
        message: data.message || (data.valid ? 'Server storage path is verified and writable' : 'Directory not writable'),
      });
    } catch (err: any) {
      setVerificationResult({
        checked: true,
        valid: false,
        message: `Network/Server check failed: ${err.message}`,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const constructUpdatedNcr = (): { updatedNcr: NCRRecord; editTimestamp: string } => {
    const editTimestamp = getNowFormatted();

    // Auto generate change summary
    let summaryText = changeNote.trim();
    if (!summaryText) {
      const changes: string[] = [];
      if (formData.status !== ncr.status) {
        changes.push(`Status changed from '${ncr.status}' to '${formData.status}'`);
      }
      if (formData.severity !== ncr.severity) {
        changes.push(`Severity set to ${formData.severity}`);
      }
      if (formData.rootCauseMethod !== ncr.rootCauseMethod) {
        changes.push(`Root cause method: ${formData.rootCauseMethod}`);
      }
      if (formData.nextAction !== ncr.nextAction) {
        changes.push('Containment action updated');
      }
      if (formData.defectDescription !== ncr.defectDescription) {
        changes.push('Defect description edited');
      }
      summaryText = changes.length > 0 ? changes.join('; ') : 'NCR details updated and verified.';
    }

    const newEditEntry: NCREditLogEntry = {
      timestamp: editTimestamp,
      editedBy: editorName.trim() || 'Quality Staff',
      summary: summaryText,
      previousStatus: ncr.status,
      newStatus: formData.status,
    };

    const existingHistory = formData.editHistory || [];
    const updatedHistory = [newEditEntry, ...existingHistory];

    const updatedNcr: NCRRecord = {
      ...formData,
      lastEditedAt: editTimestamp,
      lastEditedBy: editorName.trim() || 'Quality Staff',
      editHistory: updatedHistory,
      savedPdfPath: `${serverPath.trim()}\\${fileName.trim()}`,
    };

    return { updatedNcr, editTimestamp };
  };

  const handleSaveOnly = () => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (serverPath.trim()) {
        localStorage.setItem('ncr_custom_server_path', serverPath.trim());
      }

      const { updatedNcr, editTimestamp } = constructUpdatedNcr();

      // Persist to parent
      onSave(updatedNcr);

      setSavedDetails({
        savedPath: updatedNcr.savedPdfPath || `${serverPath.trim()}\\${fileName.trim()}`,
        fileName: fileName.trim(),
        fileSize: 'Metadata Updated',
        timestamp: editTimestamp,
      });
      setSaveSuccess(true);
    } catch (err: any) {
      console.error('Failed to save NCR:', err);
      setErrorMessage(err.message || 'Failed to update NCR record');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndArchivePdf = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (serverPath.trim()) {
        localStorage.setItem('ncr_custom_server_path', serverPath.trim());
      }

      const { updatedNcr, editTimestamp } = constructUpdatedNcr();

      // 1. Generate PDF
      const pdfDoc = generateNcrPdf({
        ncr: updatedNcr,
        serverPath: serverPath.trim(),
        fileName: fileName.trim(),
        editor: editorName.trim(),
        rootCauseNotes: updatedNcr.rootCauseAnalysis,
        correctiveActionNotes: updatedNcr.correctiveActionPlan || updatedNcr.nextAction,
        timestamp: editTimestamp,
      });

      // 2. Extract Base64
      const pdfBase64 = pdfDoc.output('datauristring');

      // 3. Send to Server Backend
      const response = await fetch('/api/ncrs/save-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverPath: serverPath.trim(),
          fileName: fileName.trim(),
          pdfBase64,
          ncrData: updatedNcr,
          editor: editorName.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Server rejected NCR PDF save request');
      }

      // Update state
      setSavedDetails({
        savedPath: result.savedPath || `${serverPath.trim()}\\${fileName.trim()}`,
        fileName: result.fileName || fileName.trim(),
        fileSize: result.fileSize || 'Standard PDF',
        timestamp: result.timestamp || editTimestamp,
      });
      setSaveSuccess(true);

      // Persist to parent
      onSave(updatedNcr);
    } catch (err: any) {
      console.error('Error archiving NCR PDF:', err);
      setErrorMessage(err.message || 'Failed to archive NCR PDF to host server');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadLocalPdf = () => {
    try {
      const { updatedNcr, editTimestamp } = constructUpdatedNcr();
      const pdfDoc = generateNcrPdf({
        ncr: updatedNcr,
        serverPath: serverPath.trim(),
        fileName: fileName.trim(),
        editor: editorName.trim(),
        rootCauseNotes: updatedNcr.rootCauseAnalysis,
        correctiveActionNotes: updatedNcr.correctiveActionPlan || updatedNcr.nextAction,
        timestamp: editTimestamp,
      });
      pdfDoc.save(fileName.trim() || `${ncr.ncrNumber}.pdf`);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleCopyPath = () => {
    if (!savedDetails?.savedPath) return;
    navigator.clipboard.writeText(savedDetails.savedPath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2500);
  };

  const getStatusColorClass = (st: NCRStatus) => {
    switch (st) {
      case 'Fixed':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'In Development':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'Scrap':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      default:
        return 'bg-rose-50 text-rose-800 border-rose-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-3xl my-6 bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden animate-fade-in text-slate-800">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-400/30">
              <FileEdit className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Edit Non-Conformance Report (NCR) & CAPA</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 border border-rose-600/50 text-rose-300 font-bold">
                  {formData.ncrNumber}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${getStatusColorClass(formData.status)}`}>
                  {formData.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                AS9100D §8.7 Control of Nonconforming Outputs & IPC Workmanship Compliance
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs">
          
          {/* Automatic Date & Time Live Tracking Banner */}
          <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <span className="font-bold text-indigo-900">Automatic Modification Date & Time Tracking:</span>
                <span className="ml-1.5 font-mono text-xs font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                  {liveTimestamp}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <History className="w-3.5 h-3.5 text-indigo-500" />
              <span>
                Last Saved: <strong className="font-mono text-slate-800">{formData.lastEditedAt || formData.containmentDate || 'Initial Baseline'}</strong>
              </span>
            </div>
          </div>

          {/* Success Banner */}
          {saveSuccess && savedDetails && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-3 animate-fade-in">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-emerald-900">NCR Record Updated & Timestamp Recorded!</h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Modifications logged with timestamp <strong className="font-mono">{savedDetails.timestamp}</strong>.
                  </p>
                </div>
              </div>

              {/* Destination Path Display */}
              <div className="p-3 bg-white/90 rounded-lg border border-emerald-200 space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-600 font-sans text-xs">
                  <span className="font-semibold flex items-center gap-1.5 text-slate-800">
                    <Server className="w-3.5 h-3.5 text-emerald-600" />
                    Host Archive Destination:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPath}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-100/70 hover:bg-emerald-200/70 rounded transition-colors"
                  >
                    {copiedPath ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedPath ? 'Copied' : 'Copy Path'}
                  </button>
                </div>
                <div className="text-slate-900 break-all bg-slate-50 p-2 rounded border border-slate-200">
                  {savedDetails.savedPath}
                </div>
                <div className="flex items-center gap-4 text-[10px] text-slate-500 font-sans pt-1">
                  <span>File: <strong className="font-mono text-slate-700">{savedDetails.fileName}</strong></span>
                  <span>Size: <strong className="text-slate-700">{savedDetails.fileSize}</strong></span>
                  <span>Recorded: <strong className="font-mono text-slate-700">{savedDetails.timestamp}</strong></span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadLocalPdf}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Local PDF Backup</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 rounded-lg hover:bg-slate-100 font-medium border border-slate-300 transition-colors cursor-pointer"
                >
                  <span>Close Window</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Non-Conformance Header Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <ShieldCheck className="w-4 h-4 text-sky-600" />
              Hardware Identification & Standard Clause
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">NCR Number</label>
                <input
                  type="text"
                  value={formData.ncrNumber}
                  onChange={(e) => setFormData({ ...formData, ncrNumber: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="e.g. NCR-2026-042"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Board Serial Number (S/N)</label>
                <input
                  type="text"
                  value={formData.serialNumber || ''}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="e.g. SN-8840-0921"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Assembly Part # & Rev</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={formData.assemblyPartNumber}
                    onChange={(e) => setFormData({ ...formData, assemblyPartNumber: e.target.value })}
                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="PCA-8840-MCU"
                    required
                  />
                  <input
                    type="text"
                    value={formData.assemblyRevision}
                    onChange={(e) => setFormData({ ...formData, assemblyRevision: e.target.value })}
                    className="w-20 p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none text-center"
                    placeholder="Rev D"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Current Lifecycle Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as NCRStatus })}
                  className={`w-full p-2 border rounded-lg font-bold focus:outline-none cursor-pointer ${getStatusColorClass(
                    formData.status
                  )}`}
                >
                  <option value="Open">Open</option>
                  <option value="In Development">In Development</option>
                  <option value="Fixed">Fixed / Resolved</option>
                  <option value="Scrap">Scrap / MRB Review</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Severity & Class</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value as SeverityLevel })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="Critical (Class 3)">Critical (Class 3)</option>
                  <option value="Major (Class 2)">Major (Class 2)</option>
                  <option value="Minor">Minor</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Governing Standard & Clause</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={formData.standardClause}
                    onChange={(e) => setFormData({ ...formData, standardClause: e.target.value })}
                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="AS9100D §8.7 / IPC-A-610 Class 3"
                    required
                  />
                  <select
                    onChange={(e) => {
                      if (e.target.value) setFormData({ ...formData, standardClause: e.target.value });
                    }}
                    className="p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    value=""
                  >
                    <option value="" disabled>Presets...</option>
                    <option value="AS9100D §8.7 / IPC-A-610 Class 3">AS9100D §8.7 / IPC-A-610 Class 3</option>
                    <option value="AS9100D §8.5.1 / J-STD-001">AS9100D §8.5.1 / J-STD-001</option>
                    <option value="IPC-A-610 Class 3 §7.3.5">IPC-A-610 Class 3 §7.3.5</option>
                    <option value="IPC-CC-830 / AS9100D">IPC-CC-830 / AS9100D</option>
                    <option value="ANSI/ESD S20.20 Clause 6">ANSI/ESD S20.20 Clause 6</option>
                    <option value="AS9102 Rev B (FAI Non-conformance)">AS9102 Rev B (FAI Non-conformance)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Defect Description & Objective Evidence */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <FileText className="w-4 h-4 text-sky-600" />
              Defect Description & Containment Action
            </h4>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Defect Description & Failure Mode</label>
              <textarea
                rows={2}
                value={formData.defectDescription}
                onChange={(e) => setFormData({ ...formData, defectDescription: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none leading-relaxed"
                placeholder="Detailed description of non-conformance observed during AOI, SPI, or functional test..."
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Immediate Containment & Next Action</label>
                <textarea
                  rows={2}
                  value={formData.nextAction}
                  onChange={(e) => setFormData({ ...formData, nextAction: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none leading-relaxed"
                  placeholder="Quarantine bin, microscope rework, lot hold..."
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Corrective Action Plan (CAPA)</label>
                <textarea
                  rows={2}
                  value={formData.correctiveActionPlan || ''}
                  onChange={(e) => setFormData({ ...formData, correctiveActionPlan: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none leading-relaxed"
                  placeholder="Preventative steps, stencil aperture revisions, tooling calibrations..."
                />
              </div>
            </div>
          </div>

          {/* Section 3: Root Cause & Ownership */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-sky-600" />
              Root Cause Methodology & Assigned Owner
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Root Cause Methodology</label>
                <select
                  value={formData.rootCauseMethod}
                  onChange={(e) => setFormData({ ...formData, rootCauseMethod: e.target.value as any })}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="5-Why">5-Why Analysis</option>
                  <option value="8D">8D Methodology</option>
                  <option value="Fishbone">Ishikawa / Fishbone</option>
                  <option value="Under Investigation">Under Investigation</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Assigned Department / Owner</label>
                <input
                  type="text"
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="Manufacturing Engineering"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-medium text-slate-600">Containment Date</label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, containmentDate: todayStr })}
                    className="text-[10px] text-sky-600 hover:text-sky-800 underline cursor-pointer"
                  >
                    Set Today
                  </button>
                </div>
                <input
                  type="date"
                  value={formData.containmentDate}
                  onChange={(e) => setFormData({ ...formData, containmentDate: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">Root Cause Investigation Notes & Findings</label>
              <textarea
                rows={2}
                value={formData.rootCauseAnalysis || ''}
                onChange={(e) => setFormData({ ...formData, rootCauseAnalysis: e.target.value })}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none leading-relaxed"
                placeholder="Findings regarding paste volume, thermal mass, line pressure, or operator factors..."
              />
            </div>
          </div>

          {/* Section 4: Audit Trail, Revisions & Modification Timestamps */}
          <div className="p-4 bg-slate-900 text-slate-100 rounded-xl space-y-3 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                Automatic Edit Timestamp & Revision History
              </span>
              <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-700/50">
                AS9100D Traceable Audit Log
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Editing Quality Engineer / Role</label>
                <input
                  type="text"
                  value={editorName}
                  onChange={(e) => setEditorName(e.target.value)}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-medium focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  placeholder="e.g. Lead Quality Engineer"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Change Reason / Summary Note (Optional)</label>
                <input
                  type="text"
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  placeholder="e.g. Completed microscope rework; verified IPC-7711 compliance."
                />
              </div>
            </div>

            {/* Existing History Entries */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400">Previous Revision Audit Entries:</span>
              <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                {formData.editHistory && formData.editHistory.length > 0 ? (
                  formData.editHistory.map((entry, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-slate-800/80 rounded border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] gap-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-indigo-300 font-semibold">{entry.timestamp}</span>
                        <span className="text-slate-400">|</span>
                        <span className="text-slate-200 font-medium">{entry.editedBy || 'Quality Engineer'}</span>
                      </div>
                      <span className="text-slate-300 italic text-[10px]">{entry.summary || 'Record updated'}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-2 bg-slate-800/40 rounded border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Baseline created on <strong className="font-mono text-slate-200">{formData.createdAt || formData.containmentDate}</strong></span>
                    <span className="italic text-[10px]">No subsequent edits logged yet</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 5: Host Storage Destination & PDF Options */}
          <div className="p-4 bg-sky-50/60 rounded-xl border border-sky-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-950 flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-sky-600" />
                Server Storage Pathing & PDF Destination
              </span>
              <button
                type="button"
                onClick={handleVerifyPath}
                disabled={isVerifying || !serverPath.trim()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white text-sky-700 rounded-md border border-sky-300 hover:bg-sky-50 font-medium transition-colors disabled:opacity-50 cursor-pointer text-xs"
              >
                {isVerifying ? <RefreshCw className="w-3 h-3 animate-spin text-sky-600" /> : <CheckCircle2 className="w-3 h-3 text-sky-600" />}
                <span>Test Server Path</span>
              </button>
            </div>

            {/* Path verification alert */}
            {verificationResult && (
              <div
                className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                  verificationResult.valid
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-rose-50 border-rose-300 text-rose-800'
                }`}
              >
                {verificationResult.valid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{verificationResult.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Server Directory Location
                </label>
                <input
                  type="text"
                  value={serverPath}
                  onChange={(e) => setServerPath(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded font-mono text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="e.g. C:\Users\smcmu\OneDrive\Desktop\Reports\NCRs"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Generated PDF File Name
                </label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded font-mono text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="e.g. NCR_2026_042_PCA_8840.pdf"
                  required
                />
              </div>
            </div>

            {/* Quick suggested path presets */}
            {serverInfo?.commonPaths && serverInfo.commonPaths.length > 0 && (
              <div className="pt-1">
                <span className="text-[11px] text-slate-500 font-medium">Quick Path Suggestions:</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {serverInfo.commonPaths.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setServerPath(p)}
                      className="px-2 py-0.5 text-[10px] font-mono bg-white hover:bg-sky-100 text-slate-700 hover:text-sky-900 border border-slate-200 rounded transition-colors cursor-pointer"
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setServerPath(APP_PATHS.NCR_REPORTS)}
                    className="px-2 py-0.5 text-[10px] font-mono bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300 rounded font-semibold transition-colors cursor-pointer"
                  >
                    {APP_PATHS.NCR_REPORTS}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadLocalPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-50 border border-slate-300 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Download PDF Only</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveOnly}
              disabled={isSaving || !formData.ncrNumber.trim()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4 text-slate-700" />
              <span>Save Changes & Record Timestamp</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndArchivePdf}
              disabled={isSaving || !formData.ncrNumber.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Archiving PDF to Server...</span>
                </>
              ) : (
                <>
                  <Server className="w-4 h-4" />
                  <span>Save & Archive PDF to Server</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
