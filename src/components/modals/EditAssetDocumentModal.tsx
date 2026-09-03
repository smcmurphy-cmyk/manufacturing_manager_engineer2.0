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
  Building,
  UserCheck,
  Mail,
  ShieldCheck,
  Layers,
  FileText
} from 'lucide-react';
import { AssetRecord, AssetStatus } from '../../types';

interface EditAssetDocumentModalProps {
  isOpen: boolean;
  asset: AssetRecord | null;
  onClose: () => void;
  onSave: (updatedAsset: AssetRecord) => void;
  onOpenCertificate?: (asset: AssetRecord) => void;
}

export const EditAssetDocumentModal: React.FC<EditAssetDocumentModalProps> = ({
  isOpen,
  asset,
  onClose,
  onSave,
  onOpenCertificate,
}) => {
  const todayStr = '2026-08-30';

  const [formData, setFormData] = useState<AssetRecord | null>(null);
  const [autoCalculateDueDate, setAutoCalculateDueDate] = useState(true);

  useEffect(() => {
    if (asset) {
      setFormData({ ...asset });
      setAutoCalculateDueDate(true);
    }
  }, [asset]);

  if (!isOpen || !formData || !asset) return null;

  const isNoCal = Number(formData.intervalDays) === 0 || formData.status === 'No Calibration Necessary';

  const calculateDueDate = (lastCompleted: string, intervalDays: number) => {
    const last = new Date(lastCompleted);
    const due = new Date(last);
    due.setDate(due.getDate() + Number(intervalDays));
    return due.toISOString().split('T')[0];
  };

  const getComputedStatus = (dueDateStr: string): AssetStatus => {
    if (isNoCal) return 'No Calibration Necessary';
    const today = new Date(todayStr);
    const due = new Date(dueDateStr);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) return 'Cal Overdue';
    if (diffDays <= 14) return 'Calibration Due Soon';
    return 'Operational / Calibrated';
  };

  const handleLastCompletedChange = (newDate: string) => {
    if (isNoCal) {
      setFormData({
        ...formData,
        lastCompleted: newDate,
      });
      return;
    }

    if (autoCalculateDueDate) {
      const nextDue = calculateDueDate(newDate, formData.intervalDays);
      const computedStatus = getComputedStatus(nextDue);
      setFormData({
        ...formData,
        lastCompleted: newDate,
        nextDueDate: nextDue,
        status: computedStatus,
      });
    } else {
      setFormData({
        ...formData,
        lastCompleted: newDate,
      });
    }
  };

  const handleIntervalChange = (interval: number) => {
    if (interval === 0) {
      setFormData({
        ...formData,
        intervalDays: 0,
        nextDueDate: '',
        status: 'No Calibration Necessary',
      });
      return;
    }

    const baseDate = formData.lastCompleted || todayStr;
    if (autoCalculateDueDate) {
      const nextDue = calculateDueDate(baseDate, interval);
      const computedStatus = getComputedStatus(nextDue);
      setFormData({
        ...formData,
        intervalDays: interval,
        nextDueDate: nextDue,
        status: computedStatus,
      });
    } else {
      setFormData({
        ...formData,
        intervalDays: interval,
      });
    }
  };

  const handleDueDateChange = (newDueDate: string) => {
    setAutoCalculateDueDate(false);
    const computedStatus = getComputedStatus(newDueDate);
    setFormData({
      ...formData,
      nextDueDate: newDueDate,
      status: computedStatus,
    });
  };

  const handleStampCalibratedToday = () => {
    if (formData.intervalDays === 0 || formData.status === 'No Calibration Necessary') {
      setFormData({
        ...formData,
        lastCompleted: todayStr,
        nextDueDate: '',
        status: 'No Calibration Necessary',
      });
      return;
    }

    const nextDue = calculateDueDate(todayStr, formData.intervalDays);
    setFormData({
      ...formData,
      lastCompleted: todayStr,
      nextDueDate: nextDue,
      status: 'Operational / Calibrated',
    });
    setAutoCalculateDueDate(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    onSave(formData);
    onClose();
  };

  const today = new Date(todayStr);
  const currentDueDate = formData.nextDueDate ? new Date(formData.nextDueDate) : null;
  const diffDays = currentDueDate
    ? Math.ceil((currentDueDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
    : 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl my-6 bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden animate-fade-in text-slate-800">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/30">
              <FileEdit className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Edit Calibration Document & Asset Data</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 border border-sky-600/50 text-sky-300">
                  {formData.assetId}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                AS9100D §7.1.5 NIST Metrology Verification & Traceability Record
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stamping Banner */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Document ID: <strong className="font-mono text-slate-800">CAL-DOC-{formData.assetId}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStampCalibratedToday}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded transition-colors cursor-pointer"
              title="Reset last calibration date to today"
            >
              <RotateCw className="w-3 h-3 text-emerald-700" />
              <span>Stamp Calibrated Today ({todayStr})</span>
            </button>

            {onOpenCertificate && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCertificate(formData);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded transition-colors cursor-pointer"
              >
                <FileText className="w-3 h-3 text-sky-600" />
                <span>View Certificate</span>
              </button>
            )}
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          
          {/* Section 1: Equipment Identification */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>1. Equipment & Identification Data</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Asset Tag ID</label>
                <input
                  type="text"
                  value={formData.assetId}
                  onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Serial Number (S/N)</label>
                <input
                  type="text"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Equipment Description / Model</label>
              <input
                type="text"
                value={formData.equipmentDescription}
                onChange={(e) => setFormData({ ...formData, equipmentDescription: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department / Lab Workcell Location</label>
              <input
                type="text"
                value={formData.departmentLocation}
                onChange={(e) => setFormData({ ...formData, departmentLocation: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                required
              />
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Section 2: Calibration Cycle & Dates */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>2. Metrology Calibration Cycle & Due Dates</span>
              </h4>
              <span
                id="asset-calibration-status-badge"
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isNoCal
                    ? 'bg-slate-100 text-slate-700 border-slate-300'
                    : diffDays < 0
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : diffDays <= 14
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}
              >
                {isNoCal
                  ? 'No calibration necessary'
                  : diffDays < 0
                  ? `${Math.abs(diffDays)}d Overdue`
                  : `${diffDays}d Remaining`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Calibration Interval</label>
                <select
                  value={formData.intervalDays}
                  onChange={(e) => handleIntervalChange(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
                >
                  <option value={0}>No calibration needed</option>
                  <option value={30}>30 Days (Monthly)</option>
                  <option value={90}>90 Days (Quarterly)</option>
                  <option value={180}>180 Days (Semi-Annual)</option>
                  <option value={365}>365 Days (Annual)</option>
                  <option value={730}>Bi-annual (Every two years)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Last Calibrated Date</label>
                <input
                  type="date"
                  value={formData.lastCompleted}
                  onChange={(e) => handleLastCompletedChange(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Next Due Date {autoCalculateDueDate && !isNoCal && <span className="text-[10px] text-slate-400 font-normal">(Auto)</span>}
                </label>
                {isNoCal ? (
                  <input
                    type="text"
                    value="N/A - No calibration necessary"
                    disabled
                    className="w-full p-2 bg-slate-100 border border-slate-200 text-slate-500 rounded-lg text-xs cursor-not-allowed font-medium select-none"
                  />
                ) : (
                  <input
                    type="date"
                    value={formData.nextDueDate}
                    onChange={(e) => handleDueDateChange(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    required
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Operational Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => {
                    const newStatus = e.target.value as AssetStatus;
                    if (newStatus === 'No Calibration Necessary') {
                      setFormData({
                        ...formData,
                        status: newStatus,
                        intervalDays: 0,
                        nextDueDate: '',
                      });
                    } else {
                      setFormData({ ...formData, status: newStatus });
                    }
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="Operational / Calibrated">Operational / Calibrated</option>
                  <option value="Calibration Due Soon">Calibration Due Soon</option>
                  <option value="Cal Overdue">Cal Overdue</option>
                  <option value="Out of Service">Out of Service</option>
                  <option value="No Calibration Necessary">No Calibration Necessary</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="auto-calc-due"
                  checked={autoCalculateDueDate}
                  onChange={(e) => {
                    setAutoCalculateDueDate(e.target.checked);
                    if (e.target.checked) {
                      const nextDue = calculateDueDate(formData.lastCompleted, formData.intervalDays);
                      setFormData({ ...formData, nextDueDate: nextDue, status: getComputedStatus(nextDue) });
                    }
                  }}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                />
                <label htmlFor="auto-calc-due" className="text-slate-600 text-xs cursor-pointer select-none">
                  Auto-sync Next Due Date from Interval
                </label>
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Section 3: Custodian & Notification Settings */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>3. Metrology Custodian & Notification Contact</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Custodian / Technician</label>
                <input
                  type="text"
                  value={formData.assignedOwner}
                  onChange={(e) => setFormData({ ...formData, assignedOwner: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alert Notification Email</label>
                <input
                  type="email"
                  value={formData.alertEmail}
                  onChange={(e) => setFormData({ ...formData, alertEmail: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>Save Document Changes</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
