import React, { useState, useEffect } from 'react';
import {
  FileEdit, X, Save, CheckCircle2, Calendar, AlertTriangle, RotateCw, ShieldCheck, FileText, FolderTree, Server, Download, Copy, Check, RefreshCw
} from 'lucide-react';
import { ComplianceAudit } from '../../types';
import { generateAuditPdf } from '../../utils/auditPdfGenerator';

interface EditAuditModalProps {
  isOpen: boolean;
  audit: ComplianceAudit | null;
  onClose: () => void;
  onSave: (updatedAudit: ComplianceAudit) => void;
}

export const EditAuditModal: React.FC<EditAuditModalProps> = ({
  isOpen, audit, onClose, onSave,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState<ComplianceAudit | null>(null);
  const [serverPath, setServerPath] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [scope, setScope] = useState<string>('');
  const [findings, setFindings] = useState<string>('');
  const [correctiveActions, setCorrectiveActions] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [savedDetails, setSavedDetails] = useState<{ savedPath: string; fileName: string; fileSize: string; timestamp: string; } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !audit) return;

    setFormData({ ...audit });
    setScope(audit.scope || 'Verification of AS9100D QMS processes, operator workmanship, lot traceability, and environmental controls.');
    setFindings(audit.findings || 'All audited areas demonstrated conformity with standard requirements. Workmanship criteria adhered to Class 3 standards.');
    setCorrectiveActions(audit.correctiveActions || 'No critical corrective action requests (CARs) pending. Continuous monitoring.');
    setNotes(audit.notes || '');

    setSaveSuccess(false);
    setSavedDetails(null);
    setErrorMessage(null);

    const safeTitle = (audit.title || 'Audit_Event').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').substring(0, 35);
    const safeStandard = (audit.standard || 'AS9100D').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').substring(0, 20);
    setFileName(`AUDIT_${safeStandard}_${safeTitle}_${todayStr}.pdf`);

    // Strictly fetch from backend, ignoring local storage cache
    fetch('/api/audits/server-info')
      .then((res) => res.json())
      .then((info) => {
        if (info.defaultStorageDir) setServerPath(info.defaultStorageDir);
      })
      .catch((err) => console.error('Failed to fetch server paths:', err));
  }, [isOpen, audit, todayStr]);

  if (!isOpen || !formData || !audit) return null;

  const calculateNextDueDate = (lastCompletedDate: string, cadenceStr: string): string => {
    try {
      const last = new Date(lastCompletedDate);
      if (isNaN(last.getTime())) return lastCompletedDate;

      const due = new Date(last);
      const lower = cadenceStr.toLowerCase();

      if (lower.includes('30') || lower.includes('month')) due.setDate(due.getDate() + 30);
      else if (lower.includes('90') || lower.includes('quarter')) due.setDate(due.getDate() + 90);
      else if (lower.includes('180') || lower.includes('bi-annual') || lower.includes('semi')) due.setDate(due.getDate() + 180);
      else if (lower.includes('365') || lower.includes('annual') || lower.includes('year')) due.setDate(due.getDate() + 365);
      else due.setDate(due.getDate() + 90);

      return due.toISOString().split('T')[0];
    } catch { return lastCompletedDate; }
  };

  const getComputedStatus = (dueDateStr: string): 'Compliant' | 'Due Soon' | 'Action Required' => {
    try {
      const today = new Date(todayStr);
      const due = new Date(dueDateStr);
      const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 3600 * 24));

      if (diffDays < 0) return 'Action Required';
      if (diffDays <= 30) return 'Due Soon';
      return 'Compliant';
    } catch { return 'Compliant'; }
  };

  const handleLastCompletedChange = (newDate: string) => {
    const nextDue = calculateNextDueDate(newDate, formData.cadence);
    setFormData({ ...formData, lastCompleted: newDate, nextDueDate: nextDue, status: getComputedStatus(nextDue) });
  };

  const handleCadenceChange = (newCadence: string) => {
    const nextDue = calculateNextDueDate(formData.lastCompleted, newCadence);
    setFormData({ ...formData, cadence: newCadence, nextDueDate: nextDue, status: getComputedStatus(nextDue) });
  };

  const handleStampToday = () => {
    const nextDue = calculateNextDueDate(todayStr, formData.cadence);
    setFormData({ ...formData, lastCompleted: todayStr, nextDueDate: nextDue, status: getComputedStatus(nextDue) });
  };

  const constructUpdatedAudit = (): ComplianceAudit => ({
    ...formData,
    scope: scope.trim(),
    findings: findings.trim(),
    correctiveActions: correctiveActions.trim(),
    notes: notes.trim(),
    savedPdfPath: `${serverPath.trim()}\\${fileName.trim()}`,
    lastSavedAt: new Date().toISOString(),
  });

  const handleSaveAndGeneratePdf = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updatedAuditRecord = constructUpdatedAudit();
      const timestampStr = new Date().toLocaleString();
      
      const pdfDoc = generateAuditPdf({
        audit: updatedAuditRecord,
        serverPath: serverPath.trim(),
        fileName: fileName.trim(),
        leadAuditor: formData.leadAuditor,
        scope: scope.trim(),
        findings: findings.trim(),
        correctiveActions: correctiveActions.trim(),
        notes: notes.trim(),
        timestamp: timestampStr,
      });

      const pdfBase64 = pdfDoc.output('datauristring');

      const response = await fetch('/api/audits/save-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverPath: serverPath.trim(),
          fileName: fileName.trim(),
          pdfBase64,
          auditData: updatedAuditRecord,
          leadAuditor: formData.leadAuditor,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) throw new Error(result.message || 'Server rejected PDF save request');

      setSavedDetails({
        savedPath: result.savedPath || updatedAuditRecord.savedPdfPath,
        fileName: result.fileName || fileName.trim(),
        fileSize: result.fileSize || 'Standard PDF',
        timestamp: result.timestamp || timestampStr,
      });
      setSaveSuccess(true);
      onSave(updatedAuditRecord);
    } catch (err: any) {
      console.error('Error saving audit document:', err);
      setErrorMessage(err.message || 'Failed to save audit document PDF to server');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadLocalBackup = () => {
    try {
      const updatedAuditRecord = constructUpdatedAudit();
      const pdfDoc = generateAuditPdf({
        audit: updatedAuditRecord,
        serverPath: serverPath.trim(),
        fileName: fileName.trim(),
        leadAuditor: formData.leadAuditor,
        scope: scope.trim(),
        findings: findings.trim(),
        correctiveActions: correctiveActions.trim(),
        notes: notes.trim(),
      });
      pdfDoc.save(fileName.trim() || `AUDIT_${audit.id}.pdf`);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-3xl my-6 bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden text-slate-800">
        
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/30">
              <FileEdit className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Edit Audit / Review Event & PDF Report</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 border border-sky-600/50 text-sky-300">
                  {formData.id.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-400">AS9100D §9.2 / ISO 9001:2015 QMS Surveillance & Audit Records</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs">
          
          {saveSuccess && savedDetails && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-emerald-900">Audit Document & PDF Successfully Saved!</h4>
                  <p className="text-xs text-emerald-700 mt-0.5">Audit event record updated and PDF successfully archived to host server path.</p>
                </div>
              </div>

              <div className="p-3 bg-white/90 rounded-lg border border-emerald-200 space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-600 font-sans text-xs">
                  <span className="font-semibold flex items-center gap-1.5 text-slate-800">
                    <Server className="w-3.5 h-3.5 text-emerald-600" /> Host File Path:
                  </span>
                  <button onClick={handleCopyPath} className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-100/70 hover:bg-emerald-200/70 rounded transition-colors cursor-pointer">
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
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <ShieldCheck className="w-4 h-4 text-sky-600" /> Audit / Review Event Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Audit / Event Title</label>
                <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none" required />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Governing Standard</label>
                <div className="flex gap-1.5">
                  <input type="text" value={formData.standard} onChange={e => setFormData({ ...formData, standard: e.target.value })} className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none" required />
                  <select onChange={e => { if (e.target.value) setFormData({ ...formData, standard: e.target.value }); }} className="p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer" value="">
                    <option value="" disabled>Presets...</option>
                    <option value="AS9100D §9.2 & §8.5">AS9100D §9.2 & §8.5</option>
                    <option value="ISO 9001:2015 §9.3">ISO 9001:2015 §9.3</option>
                    <option value="ANSI/ESD S20.20 Clause 6">ANSI/ESD S20.20 Clause 6</option>
                    <option value="J-STD-001 §3.2.1">J-STD-001 §3.2.1</option>
                    <option value="IPC-A-610 Class 3">IPC-A-610 Class 3</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Audit Cadence</label>
                <select value={formData.cadence} onChange={e => handleCadenceChange(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer">
                  <option value="Monthly (30 Days)">Monthly (30 Days)</option>
                  <option value="Quarterly (90 Days)">Quarterly (90 Days)</option>
                  <option value="Bi-Annual (180 Days)">Bi-Annual (180 Days)</option>
                  <option value="Annual (365 Days)">Annual (365 Days)</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Lead Auditor / Reviewer</label>
                <input type="text" value={formData.leadAuditor} onChange={e => setFormData({ ...formData, leadAuditor: e.target.value })} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none" required />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Conformity Status</label>
                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })} className={`w-full p-2 border rounded-lg font-semibold focus:outline-none cursor-pointer ${formData.status === 'Compliant' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : formData.status === 'Due Soon' ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-rose-50 text-rose-800 border-rose-300'}`}>
                  <option value="Compliant">Compliant / Good Standing</option>
                  <option value="Due Soon">Due Soon (Surveillance Window)</option>
                  <option value="Action Required">Action Required / Overdue</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-sky-600" /> Audit Dates & Recurrence
              </span>
              <button type="button" onClick={handleStampToday} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-100 hover:bg-sky-200 rounded-md border border-sky-300 transition-colors cursor-pointer">
                <RotateCw className="w-3.5 h-3.5 text-sky-600" /> <span>Stamp Audited Today</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Last Completed Date</label>
                <input type="date" value={formData.lastCompleted} onChange={e => handleLastCompletedChange(e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded font-mono text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none" />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">Next Due Date (Auto-calculated)</label>
                <input type="date" value={formData.nextDueDate} onChange={e => setFormData({ ...formData, nextDueDate: e.target.value })} className="w-full p-2 bg-white border border-slate-200 rounded font-mono font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <FileText className="w-4 h-4 text-sky-600" /> Scope, Evidence & Findings
            </h4>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Audit Scope & Process Areas</label>
              <textarea rows={2} value={scope} onChange={e => setScope(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none leading-relaxed" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Findings & Evidence Observed</label>
                <textarea rows={2} value={findings} onChange={e => setFindings(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none leading-relaxed" />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Corrective Actions / Next Steps (CAR)</label>
                <textarea rows={2} value={correctiveActions} onChange={e => setCorrectiveActions(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none leading-relaxed" />
              </div>
            </div>
          </div>

          <div className="p-4 bg-sky-50/60 rounded-xl border border-sky-200 space-y-3.5">
            <span className="font-bold text-sky-950 flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-sky-600" /> Server Storage Pathing & PDF Destination
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Server Directory Location</label>
                <input type="text" value={serverPath} onChange={e => setServerPath(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded font-mono text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none" required />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Generated PDF File Name</label>
                <input type="text" value={fileName} onChange={e => setFileName(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded font-mono text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none" required />
              </div>
            </div>
          </div>

        </div>

        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={handleDownloadLocalBackup} className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-50 border border-slate-300 text-xs font-semibold shadow-2xs transition-colors cursor-pointer">
            <Download className="w-3.5 h-3.5 text-slate-600" /> Download PDF Only
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="button" onClick={handleSaveAndGeneratePdf} disabled={isSaving || !formData.title.trim()} className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer">
              {isSaving ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Saving & Archiving PDF...</span></> : <><Save className="w-4 h-4" /><span>Save Changes & Archive PDF</span></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};