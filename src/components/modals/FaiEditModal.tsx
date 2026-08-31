import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Cpu,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  AlertCircle,
  Hash,
  Layers,
  Sparkles,
} from 'lucide-react';
import { DueDateCategory, EngineeringJob, PipelineStatus } from '../../types';

interface FaiEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: EngineeringJob | null;
  onSaveJob: (updatedJob: EngineeringJob) => void;
}

export const FaiEditModal: React.FC<FaiEditModalProps> = ({
  isOpen,
  onClose,
  job,
  onSaveJob,
}) => {
  const [formData, setFormData] = useState<EngineeringJob | null>(null);

  useEffect(() => {
    if (job) {
      // Normalize 'Draft' to 'Edit' if present
      const currentStatus = (job.status === ('Draft' as any) ? 'Edit' : job.status) as PipelineStatus;
      setFormData({
        ...job,
        status: currentStatus,
        totalBuildTimeHours: job.totalBuildTimeHours !== undefined ? job.totalBuildTimeHours : '',
        passedTest: job.passedTest || 'No',
        passedTestDate: job.passedTestDate || '',
        passedQa: job.passedQa || 'No',
        passedQaDate: job.passedQaDate || '',
        targetBuildDate: job.targetBuildDate || '',
        startTime: job.startTime || '',
        smtLine: job.smtLine || 'Line 1 - SMT Apex',
        notes: job.notes || '',
        checks: {
          xyOdb: Boolean(job.checks?.xyOdb),
          stencilBotTop: Boolean(job.checks?.stencilBotTop),
          spiBotTop: Boolean(job.checks?.spiBotTop),
          pnpBotTop: Boolean(job.checks?.pnpBotTop),
          aoiBotTop: Boolean(job.checks?.aoiBotTop),
          aoiFinalBotTop: Boolean(job.checks?.aoiFinalBotTop),
        },
      });
    } else {
      setFormData(null);
    }
  }, [job, isOpen]);

  if (!isOpen || !formData) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assemblyName.trim()) return;

    // Check if all gates pass
    const allChecks = Object.values(formData.checks).every(Boolean);
    const testPassed = formData.passedTest === 'Yes';
    const qaPassed = formData.passedQa === 'Yes';
    const allPassed = allChecks && testPassed && qaPassed;

    let finalStatus: PipelineStatus = formData.status;
    if (finalStatus === 'Edit' && allPassed) {
      finalStatus = 'Validation Complete';
    } else if (finalStatus === 'Validation Complete' && !allPassed) {
      finalStatus = 'Edit';
    }

    const updatedJob: EngineeringJob = {
      ...formData,
      status: finalStatus,
    };

    onSaveJob(updatedJob);
    onClose();
  };

  const handleToggleCheck = (checkKey: keyof EngineeringJob['checks']) => {
    setFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        checks: {
          ...prev.checks,
          [checkKey]: !prev.checks[checkKey],
        },
      };
    });
  };

  const handleSetAllChecks = (value: boolean) => {
    setFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        checks: {
          xyOdb: value,
          stencilBotTop: value,
          spiBotTop: value,
          pnpBotTop: value,
          aoiBotTop: value,
          aoiFinalBotTop: value,
        },
        passedTest: value ? 'Yes' : 'No',
        passedQa: value ? 'Yes' : 'No',
      };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                Edit FAI Document & Release Record
                <span className="text-xs px-2 py-0.5 font-mono font-semibold rounded bg-sky-400/20 text-sky-300 border border-sky-400/30">
                  {formData.jobId}
                </span>
              </h3>
              <p className="text-xs text-slate-300">Modify assembly metadata, gate verifications, dates, and build timing</p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          {/* Primary Identification */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                FAI Number / Job ID
              </label>
              <input
                type="text"
                value={formData.jobId}
                onChange={(e) => setFormData({ ...formData, jobId: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Due Date / Priority</label>
              <select
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dueDate: e.target.value as DueDateCategory,
                    projectCode: e.target.value,
                  })
                }
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500"
                required
              >
                <option value="ASAP">ASAP (Urgent / Line Stop)</option>
                <option value="Development">Development (Standard Run)</option>
                <option value="Stock">Stock (Inventory Buffer)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Document Status</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as PipelineStatus })
                }
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500"
              >
                <option value="Edit">Edit (In Progress)</option>
                <option value="Validation Complete">Validation Complete</option>
                <option value="Dispatched to Line">Dispatched to Line / Logged</option>
                <option value="Hold">Hold / Blocked</option>
              </select>
            </div>
          </div>

          {/* Assembly Details */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">Assembly Name</label>
            <input
              type="text"
              value={formData.assemblyName}
              onChange={(e) => setFormData({ ...formData, assemblyName: e.target.value })}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-sky-500"
              placeholder="e.g. Flight Accelerometer Node"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Part Number</label>
              <input
                type="text"
                value={formData.partNumber}
                onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
                placeholder="e.g. PCA-9100-ACC"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Revision</label>
              <input
                type="text"
                value={formData.revision}
                onChange={(e) => setFormData({ ...formData, revision: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
                placeholder="e.g. Rev A"
                required
              />
            </div>
          </div>

          {/* Schedule & Build Timing */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              Build Timing & Production Dispatch Details
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Target Build Start Date</label>
                <input
                  type="date"
                  value={formData.targetBuildDate || ''}
                  onChange={(e) => setFormData({ ...formData, targetBuildDate: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-200 rounded font-mono text-slate-900 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={formData.startTime || ''}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-200 rounded font-mono text-slate-900 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Total Build Time in Hours</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.totalBuildTimeHours !== undefined ? formData.totalBuildTimeHours : ''}
                    onChange={(e) => setFormData({ ...formData, totalBuildTimeHours: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded font-mono font-bold text-slate-900 focus:ring-2 focus:ring-sky-500"
                    placeholder="3.5"
                  />
                  <span className="text-slate-500 font-medium shrink-0">Hours</span>
                </div>
              </div>
            </div>
          </div>

          {/* 8 Quality Gates Section */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Pre-Dispatch Quality Gates (8-Gate Matrix)
                </span>
                <p className="text-[11px] text-slate-500">Toggle verification flags and record sign-off pass dates</p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetAllChecks(true)}
                  className="px-2 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors"
                >
                  Pass All Gates
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllChecks(false)}
                  className="px-2 py-1 text-[10px] font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded transition-colors"
                >
                  Reset All
                </button>
              </div>
            </div>

            {/* Checkboxes 1 to 5 & 8 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.checks.xyOdb}
                  onChange={() => handleToggleCheck('xyOdb')}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <span className="text-slate-700 font-medium">#1 XY / ODB++ Verified</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.checks.stencilBotTop}
                  onChange={() => handleToggleCheck('stencilBotTop')}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <span className="text-slate-700 font-medium">#2 Stencil File BOT/TOP</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.checks.spiBotTop}
                  onChange={() => handleToggleCheck('spiBotTop')}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <span className="text-slate-700 font-medium">#3 SPI File BOT/TOP</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.checks.pnpBotTop}
                  onChange={() => handleToggleCheck('pnpBotTop')}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <span className="text-slate-700 font-medium">#4 PNP File BOT/TOP</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.checks.aoiBotTop}
                  onChange={() => handleToggleCheck('aoiBotTop')}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <span className="text-slate-700 font-medium">#5 AOI File BOT/TOP</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.checks.aoiFinalBotTop}
                  onChange={() => handleToggleCheck('aoiFinalBotTop')}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <span className="text-slate-700 font-medium">#8 AOI Final File BOT/TOP</span>
              </label>
            </div>

            {/* Test & QA Gate Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">#6 Passed Test?</span>
                  <select
                    value={formData.passedTest || 'No'}
                    onChange={(e) => setFormData({ ...formData, passedTest: e.target.value as 'Yes' | 'No' })}
                    className={`text-[11px] font-bold px-2 py-1 rounded border ${
                      formData.passedTest === 'Yes'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Test Pass Date</label>
                  <input
                    type="date"
                    value={formData.passedTestDate || ''}
                    onChange={(e) => setFormData({ ...formData, passedTestDate: e.target.value })}
                    className="w-full text-xs font-mono p-1.5 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">#7 Passed QA?</span>
                  <select
                    value={formData.passedQa || 'No'}
                    onChange={(e) => setFormData({ ...formData, passedQa: e.target.value as 'Yes' | 'No' })}
                    className={`text-[11px] font-bold px-2 py-1 rounded border ${
                      formData.passedQa === 'Yes'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-medium mb-0.5">QA Pass Date</label>
                  <input
                    type="date"
                    value={formData.passedQaDate || ''}
                    onChange={(e) => setFormData({ ...formData, passedQaDate: e.target.value })}
                    className="w-full text-xs font-mono p-1.5 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Engineering Notes / Special Instructions
            </label>
            <textarea
              rows={2}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Special nitrogen reflow atmosphere or BGA void inspection requirements"
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <span className="text-[11px] text-slate-500">
              * Changes to metadata and gate parameters will take effect across all dashboard views and PDF exports.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Save FAI Form Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
