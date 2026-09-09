import React, { useState, useEffect } from 'react';
import {
  FileEdit, X, Save, Calendar, RotateCw, ShieldCheck, Layers, UserCheck
} from 'lucide-react';
import { AssetRecord, AssetStatus } from '../../types';

interface EditAssetDocumentModalProps {
  isOpen: boolean;
  asset: AssetRecord | null;
  onClose: () => void;
  onSave: (updatedAsset: AssetRecord) => void;
}

export const EditAssetDocumentModal: React.FC<EditAssetDocumentModalProps> = ({
  isOpen, asset, onClose, onSave,
}) => {
  const [formData, setFormData] = useState<AssetRecord | null>(null);
  const [autoCalc, setAutoCalc] = useState(true);
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (asset) {
      setFormData({ ...asset });
      setAutoCalc(true);
    }
  }, [asset]);

  if (!isOpen || !formData || !asset) return null;

  const isNoCal = Number(formData.intervalDays) === 0 || formData.status === 'No Calibration Necessary';

  const updateCalibrationData = (updates: Partial<AssetRecord>, overrideAutoCalc?: boolean) => {
    let nextData = { ...formData, ...updates };
    const shouldUseAuto = overrideAutoCalc !== undefined ? overrideAutoCalc : autoCalc;

    if (nextData.intervalDays === 0 || nextData.status === 'No Calibration Necessary') {
      nextData.intervalDays = 0;
      nextData.nextDueDate = '';
      nextData.status = 'No Calibration Necessary';
    } else if (shouldUseAuto && nextData.lastCompleted) {
      const due = new Date(nextData.lastCompleted);
      due.setDate(due.getDate() + Number(nextData.intervalDays));
      nextData.nextDueDate = due.toISOString().split('T')[0];
      
      const diffDays = Math.ceil((due.getTime() - new Date(todayStr).getTime()) / (1000 * 3600 * 24));
      if (diffDays < 0) nextData.status = 'Cal Overdue';
      else if (diffDays <= 14) nextData.status = 'Calibration Due Soon';
      else nextData.status = 'Operational / Calibrated';
    }

    setFormData(nextData);
  };

  const handleManualDueDate = (newDate: string) => {
    setAutoCalc(false);
    const due = new Date(newDate);
    const diffDays = Math.ceil((due.getTime() - new Date(todayStr).getTime()) / (1000 * 3600 * 24));
    let status: AssetStatus = 'Operational / Calibrated';
    if (diffDays < 0) status = 'Cal Overdue';
    else if (diffDays <= 14) status = 'Calibration Due Soon';
    
    setFormData({ ...formData, nextDueDate: newDate, status });
  };

  const diffDays = formData.nextDueDate && !isNoCal
    ? Math.ceil((new Date(formData.nextDueDate).getTime() - new Date(todayStr).getTime()) / (1000 * 3600 * 24))
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden text-slate-800">
        
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/30">
              <FileEdit className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Edit Calibration Record</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 border border-sky-600/50 text-sky-300">{formData.assetId}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">AS9100D §7.1.5 NIST Metrology Verification</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-5 py-3 bg-slate-50 border-b flex justify-between items-center text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Document ID: <strong className="font-mono text-slate-800">CAL-DOC-{formData.assetId}</strong></span>
          </div>
          <button
            type="button"
            onClick={() => { setAutoCalc(true); updateCalibrationData({ lastCompleted: todayStr }, true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded cursor-pointer transition-colors"
          >
            <RotateCw className="w-3 h-3 text-emerald-700" /> Stamp Calibrated Today
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); onClose(); }} className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          
          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 border-b pb-1">
              <Layers className="w-3.5 h-3.5" /> 1. Equipment Data
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block font-semibold mb-1">Asset Tag ID</label><input type="text" value={formData.assetId} onChange={e => setFormData({...formData, assetId: e.target.value})} className="w-full p-2 border rounded bg-slate-50 font-mono" required /></div>
              <div><label className="block font-semibold mb-1">Serial Number</label><input type="text" value={formData.serialNumber} onChange={e => setFormData({...formData, serialNumber: e.target.value})} className="w-full p-2 border rounded font-mono" required /></div>
            </div>
            <div><label className="block font-semibold mb-1">Equipment Description / Model</label><input type="text" value={formData.equipmentDescription} onChange={e => setFormData({...formData, equipmentDescription: e.target.value})} className="w-full p-2 border rounded" required /></div>
            <div><label className="block font-semibold mb-1">Department / Workcell Location</label><input type="text" value={formData.departmentLocation} onChange={e => setFormData({...formData, departmentLocation: e.target.value})} className="w-full p-2 border rounded" required /></div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-1">
              <h4 className="font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> 2. Calibration Cycle
              </h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isNoCal ? 'bg-slate-100 text-slate-700' : diffDays < 0 ? 'bg-rose-100 text-rose-800' : diffDays <= 14 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                {isNoCal ? 'No calibration necessary' : diffDays < 0 ? `${Math.abs(diffDays)}d Overdue` : `${diffDays}d Remaining`}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1">Interval</label>
                <select value={formData.intervalDays} onChange={e => updateCalibrationData({ intervalDays: Number(e.target.value) })} className="w-full p-2 border rounded bg-slate-50">
                  <option value={0}>None</option><option value={30}>30 Days</option><option value={90}>90 Days</option><option value={180}>180 Days</option><option value={365}>Annual</option><option value={730}>Bi-annual</option>
                </select>
              </div>
              <div><label className="block font-semibold mb-1">Last Calibrated</label><input type="date" value={formData.lastCompleted || ''} onChange={e => updateCalibrationData({ lastCompleted: e.target.value })} className="w-full p-2 border rounded font-mono" required={!isNoCal} /></div>
              <div>
                <label className="block font-semibold mb-1">Next Due {autoCalc && !isNoCal && <span className="text-slate-400 font-normal">(Auto)</span>}</label>
                {isNoCal ? (
                  <input type="text" value="N/A" disabled className="w-full p-2 bg-slate-100 border rounded cursor-not-allowed text-center" />
                ) : (
                  <input type="date" value={formData.nextDueDate || ''} onChange={e => handleManualDueDate(e.target.value)} className="w-full p-2 border rounded font-mono" required />
                )}
              </div>
            </div>
            <div className="flex justify-between items-end">
              <div className="w-1/2">
                <label className="block font-semibold mb-1">Status</label>
                <select value={formData.status} onChange={e => updateCalibrationData({ status: e.target.value as AssetStatus })} className="w-full p-2 border rounded bg-slate-50">
                  <option>Operational / Calibrated</option><option>Calibration Due Soon</option><option>Cal Overdue</option><option>Out of Service</option><option>No Calibration Necessary</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pb-2">
                <input type="checkbox" id="auto-calc" checked={autoCalc} onChange={e => { setAutoCalc(e.target.checked); updateCalibrationData({}, e.target.checked); }} className="w-4 h-4 cursor-pointer" />
                <label htmlFor="auto-calc" className="text-slate-600 cursor-pointer select-none">Auto-sync Due Date</label>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 border-b pb-1">
              <UserCheck className="w-3.5 h-3.5" /> 3. Custodian & Notifications
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block font-semibold mb-1">Assigned Custodian</label><input type="text" value={formData.assignedOwner} onChange={e => setFormData({...formData, assignedOwner: e.target.value})} className="w-full p-2 border rounded" required /></div>
              <div><label className="block font-semibold mb-1">Alert Email</label><input type="email" value={formData.alertEmail} onChange={e => setFormData({...formData, alertEmail: e.target.value})} className="w-full p-2 border rounded font-mono" required /></div>
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-semibold cursor-pointer">Cancel</button>
            <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold cursor-pointer">
              <Save className="w-4 h-4 text-emerald-400" /> Save Record
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};