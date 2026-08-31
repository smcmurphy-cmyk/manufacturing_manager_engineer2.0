import React, { useState, useEffect } from 'react';
import { EngineeringJob } from '../../types';
import { generateFaiCompletionPdf } from '../../utils/faiPdfGenerator';
import { APP_PATHS } from '../../config/paths';
import {
  FileText,
  FolderTree,
  Server,
  CheckCircle2,
  Download,
  AlertCircle,
  Clock,
  User,
  ExternalLink,
  HardDrive,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';

interface FaiCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: EngineeringJob | null;
  onLoggedSuccess: (jobId: string) => void;
}

export const FaiCompletionModal: React.FC<FaiCompletionModalProps> = ({
  isOpen,
  onClose,
  job,
  onLoggedSuccess,
}) => {
  const [serverPath, setServerPath] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [operatorName, setOperatorName] = useState<string>('Manufacturing Engineer');
  const [operatorNotes, setOperatorNotes] = useState<string>('');

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

  useEffect(() => {
    if (!isOpen || !job) return;

    setSaveSuccess(false);
    setSavedDetails(null);
    setErrorMessage(null);
    setVerificationResult(null);

    // Generate clean default filename
    const dateStr = new Date().toISOString().split('T')[0];
    const safeJobId = (job.jobId || 'FAI-JOB').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeAssembly = (job.assemblyName || 'Assembly').replace(/[^a-zA-Z0-9_-]/g, '_');
    const defaultName = `${safeJobId}_${safeAssembly}_Signoff_${dateStr}.pdf`;
    setFileName(defaultName);

    // Fetch server host info
    fetch('/api/fai/server-info')
      .then((res) => res.json())
      .then((info) => {
        setServerInfo(info);
        // Check localStorage for user-remembered custom server path
        const storedPath = localStorage.getItem('fai_custom_server_path');
        if (storedPath) {
          setServerPath(storedPath);
        } else if (info.defaultStorageDir) {
          setServerPath(info.defaultStorageDir);
        } else {
          setServerPath(APP_PATHS.FAI_REPORTS);
        }
      })
      .catch(() => {
        const storedPath = localStorage.getItem('fai_custom_server_path');
        setServerPath(storedPath || APP_PATHS.FAI_REPORTS);
      });
  }, [isOpen, job]);

  if (!isOpen || !job) return null;

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
        message: data.message || (data.valid ? 'Server destination path is writable' : 'Directory not writable'),
      });
    } catch (err: any) {
      setVerificationResult({
        checked: true,
        valid: false,
        message: `Network/Server error: ${err.message}`,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveAndLog = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      // 1. Remember server path in localStorage
      if (serverPath.trim()) {
        localStorage.setItem('fai_custom_server_path', serverPath.trim());
      }

      // 2. Generate PDF using jsPDF
      const timestampStr = new Date().toLocaleString();
      const pdfDoc = generateFaiCompletionPdf({
        job,
        serverPath: serverPath.trim(),
        fileName: fileName.trim(),
        operatorName: operatorName.trim() || 'Lead SMT Quality Engineer',
        operatorNotes: operatorNotes.trim(),
        timestamp: timestampStr,
      });

      // 3. Extract binary base64
      // jsPDF output('datauristring') produces "data:application/pdf;filename=generated.pdf;base64,JVBERi..."
      // or output('datauristring') / output('arraybuffer')
      // Let's generate both datauristring and pure base64
      let pdfBase64 = pdfDoc.output('datauristring');
      
      // Verification log as requested: Log the first 50 chars of pdfBase64
      console.log('PDF Base64 Prefix (first 50 chars):', pdfBase64.substring(0, 50));

      // 4. Send to server backend to save directly on host disk
      const response = await fetch('/api/fai/save-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverPath: serverPath.trim(),
          fileName: fileName.trim(),
          pdfBase64,
          operatorName: operatorName.trim(),
          operatorNotes: operatorNotes.trim(),
          jobData: {
            id: job.id,
            jobId: job.jobId,
            assemblyName: job.assemblyName,
            revision: job.revision,
            customer: job.customer,
            totalBuildTimeHours: job.totalBuildTimeHours,
            checks: job.checks,
            passedTest: job.passedTest,
            passedTestDate: job.passedTestDate,
            passedQa: job.passedQa,
            passedQaDate: job.passedQaDate,
            smtLine: job.smtLine,
            notes: job.notes,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Server failed to save PDF');
      }

      // 5. Set success state
      setSavedDetails({
        savedPath: result.savedPath,
        fileName: result.fileName,
        fileSize: result.fileSize,
        timestamp: result.timestamp,
      });
      setSaveSuccess(true);

      // 7. Notify parent to mark job as Dispatched / Logged
      onLoggedSuccess(job.id);
    } catch (err: any) {
      console.error('Save error:', err);
      setErrorMessage(err.message || 'Failed to save PDF to server path');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyPath = () => {
    if (savedDetails?.savedPath) {
      navigator.clipboard.writeText(savedDetails.savedPath);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg border border-sky-500/30">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                Log FAI Build Completion & Server Archiving
              </h3>
              <p className="text-xs text-slate-300">
                Generate signed PDF certificate and save to your self-hosted server location
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {saveSuccess && savedDetails ? (
            /* Success View */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2.5 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>FAI Completion PDF Archived to Server Successfully!</span>
                </div>
                <p className="text-emerald-700 text-xs leading-relaxed">
                  The First Article Inspection sign-off certificate for <strong>{job.jobId}</strong> ({job.assemblyName}) has been generated and written to your server storage path.
                </p>

                <div className="p-3 bg-white rounded-lg border border-emerald-200 space-y-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold block">
                      Server Saved Location (Full Path)
                    </span>
                    <div className="flex items-center justify-between gap-2 mt-1 p-2 bg-slate-50 border border-slate-200 rounded font-mono text-[11px] text-slate-800 break-all select-all">
                      <span>{savedDetails.savedPath}</span>
                      <button
                        type="button"
                        onClick={handleCopyPath}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs shrink-0 cursor-pointer"
                      >
                        {copiedPath ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">File Size:</span>
                      <span className="font-semibold text-slate-800 font-mono">{savedDetails.fileSize}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">File Name:</span>
                      <span className="font-semibold text-slate-800 font-mono truncate">{savedDetails.fileName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Logged At:</span>
                      <span className="font-semibold text-slate-800">{new Date(savedDetails.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const doc = generateFaiCompletionPdf({
                      job,
                      serverPath: serverPath.trim(),
                      fileName: fileName.trim(),
                      operatorName: operatorName.trim(),
                    });
                    doc.save(fileName);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-300 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Re-Download PDF Copy
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Done & Close
                </button>
              </div>
            </div>
          ) : (
            /* Configuration Form */
            <div className="space-y-4">
              {/* Job Summary Banner */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-sky-100 text-sky-800 border border-sky-300 font-mono font-bold rounded text-xs">
                      {job.jobId}
                    </span>
                    <span className="font-bold text-slate-800 text-sm">{job.assemblyName}</span>
                    <span className="text-slate-500 font-mono text-xs">({job.revision || 'Rev 1.0'})</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-sky-600" />
                    <span>Total Build Time: <strong>{job.totalBuildTimeHours || '0.0'} hrs</strong></span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-2.5 border-t border-slate-200 text-[11px]">
                  <div>
                    <span className="text-slate-500">Customer:</span>
                    <p className="font-semibold text-slate-700 truncate">{job.customer || 'Internal'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">SMT Line:</span>
                    <p className="font-semibold text-slate-700 truncate">{job.smtLine || 'Line 01'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Test Passed Date:</span>
                    <p className="font-semibold text-emerald-700">{job.passedTestDate || 'Approved'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">QA Passed Date:</span>
                    <p className="font-semibold text-emerald-700">{job.passedQaDate || 'Approved'}</p>
                  </div>
                </div>
              </div>

              {/* Server Destination Path Field */}
              <div className="space-y-2 p-3.5 bg-sky-50/40 rounded-xl border border-sky-200">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 font-bold text-slate-800">
                    <HardDrive className="w-4 h-4 text-sky-600" />
                    <span>Server Storage Location Path</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleVerifyPath}
                    disabled={isVerifying || !serverPath.trim()}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:text-sky-900 bg-white px-2 py-0.5 border border-sky-300 rounded hover:bg-sky-50 cursor-pointer disabled:opacity-50"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-sky-600" />
                        <span>Test Path</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-slate-600">
                  Enter the absolute or relative folder directory on your host machine where this PDF report will be saved.
                </p>

                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={serverPath}
                    onChange={(e) => {
                      setServerPath(e.target.value);
                      setVerificationResult(null);
                    }}
                    placeholder={APP_PATHS.FAI_REPORTS}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    required
                  />

                  {verificationResult && (
                    <div
                      className={`p-2 rounded text-[11px] flex items-center gap-1.5 ${
                        verificationResult.valid
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {verificationResult.valid ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      )}
                      <span>{verificationResult.message}</span>
                    </div>
                  )}

                  {/* Preset Buttons */}
                  {serverInfo?.commonPaths && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                      <span className="text-slate-500 font-medium">Quick Presets:</span>
                      {serverInfo.commonPaths.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setServerPath(preset);
                            setVerificationResult(null);
                          }}
                          className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-mono rounded text-[10px] cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* File Name Field */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  PDF File Name
                </label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              {/* Operator Name & Sign-Off Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Manufacturing Engineer Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={operatorName}
                      onChange={(e) => setOperatorName(e.target.value)}
                      placeholder="e.g. Manufacturing Engineer"
                      className="w-full p-2 pl-7 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    />
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Optional Sign-Off Remarks
                  </label>
                  <input
                    type="text"
                    value={operatorNotes}
                    onChange={(e) => setOperatorNotes(e.target.value)}
                    placeholder="e.g. All 8 gates verified, cleared for line run"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-200 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveAndLog}
                  disabled={isSaving || !serverPath.trim() || !fileName.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving to Server...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Save PDF to Server</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
