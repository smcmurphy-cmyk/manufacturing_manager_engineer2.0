import React, { useState, useEffect } from 'react';
import {
  FileEdit, X, Save, CheckCircle2, AlertTriangle, ShieldCheck, FileText, Layers, FolderTree, Server, Download, Copy, Check, RefreshCw
} from 'lucide-react';
import { NCRRecord, SeverityLevel, NCRStatus, NCREditLogEntry } from '../../types';
import { generateNcrPdf } from '../../utils/ncrPdfGenerator';

interface EditNcrModalProps {
  isOpen: boolean;
  ncr: NCRRecord | null;
  onClose: () => void;
  onSave: (updatedNcr: NCRRecord) => void;
}

export const EditNcrModal: React.FC<EditNcrModalProps> = ({ isOpen, ncr, onClose, onSave }) => {
  const getNowFormatted = (): string => {
    const d = new Date();
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState<NCRRecord | null>(null);
  const [editorName, setEditorName] = useState<string>('Lead Quality Engineer');
  const [changeNote, setChangeNote] = useState<string>('');
  const [serverPath, setServerPath] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedDetails, setSavedDetails] = useState<{ savedPath: string; fileName: string; fileSize: string; timestamp: string; } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !ncr) return;

    setFormData({
      ...ncr,
      rootCauseAnalysis: ncr.rootCauseAnalysis || 'Root cause investigation under AS9100D §8.7 and IPC-A-610 Class 3.',
      correctiveActionPlan: ncr.correctiveActionPlan || ncr.nextAction || 'Implement verified containment and process parameter updates.',
    });

    setEditorName(ncr.lastEditedBy || 'Lead Quality Engineer');
    setChangeNote('');
    setSavedDetails(null);
    setErrorMessage(null);

    const safeNcrNum = (ncr.ncrNumber || 'NCR').replace(/[^a-zA-Z0-9]/g, '_');
    const safePart = (ncr.assemblyPartNumber || 'PART').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    setFileName(`${safeNcrNum}_${safePart}_${todayStr}.pdf`);

    // Strictly fetch from the new backend, ignoring local storage cache
    fetch('/api/ncrs/server-info')
      .then((res) => res.json())
      .then((info) => {
        if (info.defaultStorageDir) setServerPath(info.defaultStorageDir);
      })
      .catch((err) => console.error('Failed to fetch server paths:', err));
  }, [isOpen, ncr]);

  if (!isOpen || !formData || !ncr) return null;

  const constructUpdatedNcr = (): { updatedNcr: NCRRecord; editTimestamp: string } => {
    const editTimestamp = getNowFormatted();
    let summaryText = changeNote.trim() || 'NCR details updated and verified.';

    const newEditEntry: NCREditLogEntry = {
      timestamp: editTimestamp,
      editedBy: editorName.trim() || 'Quality Staff',
      summary: summaryText,
      previousStatus: ncr.status,
      newStatus: formData.status,
    };

    return {
      updatedNcr: {
        ...formData,
        lastEditedAt: editTimestamp,
        lastEditedBy: editorName.trim() || 'Quality Staff',
        editHistory: [newEditEntry, ...(formData.editHistory || [])],
        savedPdfPath: `${serverPath.trim()}\\${fileName.trim()}`,
      },
      editTimestamp,
    };
  };

  const handleSaveOnly = () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const { updatedNcr, editTimestamp } = constructUpdatedNcr();
      onSave(updatedNcr);
      setSavedDetails({ savedPath: updatedNcr.savedPdfPath || '', fileName: fileName.trim(), fileSize: 'Metadata Updated', timestamp: editTimestamp });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update NCR record');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndArchivePdf = async () => {
    setIsSaving(true);
    setErrorMessage(null);
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

      const pdfBase64 = pdfDoc.output('datauristring');

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
      if (!response.ok || !result.success) throw new Error(result.message || 'Server rejected PDF save');

      setSavedDetails({ savedPath: result.savedPath, fileName: result.fileName, fileSize: result.fileSize, timestamp: result.timestamp });
      onSave(updatedNcr);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to archive NCR PDF to server');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadLocalPdf = () => {
    const { updatedNcr, editTimestamp } = constructUpdatedNcr();
    const pdfDoc = generateNcrPdf({
      ncr: updatedNcr, serverPath: serverPath.trim(), fileName: fileName.trim(),
      editor: editorName.trim(), rootCauseNotes: updatedNcr.rootCauseAnalysis,
      correctiveActionNotes: updatedNcr.correctiveActionPlan || updatedNcr.nextAction, timestamp: editTimestamp,
    });
    pdfDoc.save(fileName.trim() || `${ncr.ncrNumber}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden text-slate-800">
        
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-400/30">
              <FileEdit className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Edit NCR & CAPA</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 border border-rose-600/50 text-rose-300">{formData.ncrNumber}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
          
          {savedDetails && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl space-y-3">
              <div className="flex items-center gap-2 font-bold"><CheckCircle2 className="w-5 h-5 text-emerald-600" /> Record Updated Successfully</div>
              <div className="p-3 bg-white rounded border border-emerald-200">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-bold flex items-center gap-1"><Server className="w-3 h-3 text-emerald-600"/> Host Path</span>
                  <button onClick={() => { navigator.clipboard.writeText(savedDetails.savedPath); setCopiedPath(true); setTimeout(() => setCopiedPath(false), 2000); }} className="text-emerald-700 hover:underline">
                    {copiedPath ? 'Copied!' : 'Copy Path'}
                  </button>
                </div>
                <div className="font-mono bg-slate-50 p-2 rounded border">{savedDetails.savedPath}</div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" /> {errorMessage}
            </div>
          )}

          <div className="space-y-3">
            <h4 className="font-bold uppercase flex items-center gap-2 border-b pb-1"><ShieldCheck className="w-4 h-4 text-sky-600"/> Hardware & Clause</h4>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block mb-1 font-medium">NCR Number</label><input type="text" value={formData.ncrNumber} onChange={e => setFormData({...formData, ncrNumber: e.target.value})} className="w-full p-2 border rounded bg-slate-50 font-mono" /></div>
              <div><label className="block mb-1 font-medium">Serial Number (S/N)</label><input type="text" value={formData.serialNumber} onChange={e => setFormData({...formData, serialNumber: e.target.value})} className="w-full p-2 border rounded font-mono" /></div>
              <div><label className="block mb-1 font-medium">Status</label><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as NCRStatus})} className="w-full p-2 border rounded font-bold"><option>Open</option><option>In Development</option><option>Fixed</option><option>Scrap</option></select></div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold uppercase flex items-center gap-2 border-b pb-1"><FileText className="w-4 h-4 text-sky-600"/> Defect & Containment</h4>
            <textarea rows={2} value={formData.defectDescription} onChange={e => setFormData({...formData, defectDescription: e.target.value})} className="w-full p-2 border rounded" placeholder="Defect Description..." />
            <div className="grid grid-cols-2 gap-3">
              <textarea rows={2} value={formData.nextAction} onChange={e => setFormData({...formData, nextAction: e.target.value})} className="w-full p-2 border rounded" placeholder="Containment Action..." />
              <textarea rows={2} value={formData.correctiveActionPlan} onChange={e => setFormData({...formData, correctiveActionPlan: e.target.value})} className="w-full p-2 border rounded" placeholder="CAPA..." />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold uppercase flex items-center gap-2 border-b pb-1"><FolderTree className="w-4 h-4 text-sky-600"/> Storage Destination</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block mb-1 font-medium">Server Path</label><input type="text" value={serverPath} onChange={e => setServerPath(e.target.value)} className="w-full p-2 border rounded font-mono" /></div>
              <div><label className="block mb-1 font-medium">File Name</label><input type="text" value={fileName} onChange={e => setFileName(e.target.value)} className="w-full p-2 border rounded font-mono" /></div>
            </div>
          </div>

        </div>

        <div className="p-4 bg-slate-100 border-t flex justify-between gap-3">
          <button onClick={handleDownloadLocalPdf} className="px-4 py-2 bg-white text-slate-700 rounded border hover:bg-slate-50 font-semibold shadow-sm text-xs flex items-center gap-2">
            <Download className="w-4 h-4" /> Local Backup
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-white border rounded hover:bg-slate-50 text-xs font-semibold">Cancel</button>
            <button onClick={handleSaveOnly} disabled={isSaving} className="px-4 py-2 bg-white border rounded hover:bg-slate-50 font-bold text-xs flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Record
            </button>
            <button onClick={handleSaveAndArchivePdf} disabled={isSaving} className="px-4 py-2 bg-rose-600 text-white rounded hover:bg-rose-700 font-bold text-xs flex items-center gap-2 shadow-sm">
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />} Archive to Server
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};