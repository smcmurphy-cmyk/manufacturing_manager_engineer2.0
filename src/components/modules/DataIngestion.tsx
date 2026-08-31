import React, { useState } from 'react';
import {
  Cpu,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  FileCode,
  Layers,
  Sparkles,
  ShieldCheck,
  Share2,
  Play,
  Clock,
  HardDrive,
  FolderArchive,
  FileText,
  Pencil,
} from 'lucide-react';
import { DueDateCategory, EngineeringJob, PipelineStatus } from '../../types';
import { FaiCompletionModal } from '../modals/FaiCompletionModal';
import { FaiArchiveHistoryModal } from '../modals/FaiArchiveHistoryModal';
import { FaiEditModal } from '../modals/FaiEditModal';

interface DataIngestionProps {
  jobs: EngineeringJob[];
  onAddJob: (job: EngineeringJob) => void;
  onUpdateJob?: (job: EngineeringJob) => void;
  onToggleCheck: (jobId: string, checkKey: keyof EngineeringJob['checks']) => void;
  onUpdatePassedTest?: (jobId: string, passedTest: 'Yes' | 'No', testDate?: string) => void;
  onUpdatePassedQa?: (jobId: string, passedQa: 'Yes' | 'No', qaDate?: string) => void;
  onUpdateTotalBuildTime?: (jobId: string, totalBuildTimeHours: number | string) => void;
  onUpdateStatus: (jobId: string, status: PipelineStatus) => void;
}

export const DataIngestion: React.FC<DataIngestionProps> = ({
  jobs,
  onAddJob,
  onUpdateJob,
  onToggleCheck,
  onUpdatePassedTest,
  onUpdatePassedQa,
  onUpdateTotalBuildTime,
  onUpdateStatus,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedJobForCompletion, setSelectedJobForCompletion] = useState<EngineeringJob | null>(null);
  const [selectedJobForEdit, setSelectedJobForEdit] = useState<EngineeringJob | null>(null);
  const [showArchiveHistoryModal, setShowArchiveHistoryModal] = useState(false);

  const [newJob, setNewJob] = useState<{
    jobId: string;
    dueDate: DueDateCategory;
    assemblyName: string;
    partNumber: string;
    revision: string;
    totalBuildTimeHours: string;
    passedTest: 'Yes' | 'No';
    passedTestDate: string;
    passedQa: 'Yes' | 'No';
    passedQaDate: string;
    notes: string;
  }>({
    jobId: `FAI-${Math.floor(400 + Math.random() * 90)}`,
    dueDate: 'ASAP',
    assemblyName: 'High-G Flight Accelerometer Node',
    partNumber: 'PCA-9100-ACC',
    revision: 'Rev A',
    totalBuildTimeHours: '3.5',
    passedTest: 'No',
    passedTestDate: '2026-09-12',
    passedQa: 'No',
    passedQaDate: '2026-09-12',
    notes: '0.35mm pitch BGA-64, requires AOI and 3D X-ray void inspection.',
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.assemblyName.trim()) return;

    const job: EngineeringJob = {
      id: `job-${Date.now()}`,
      jobId: newJob.jobId,
      dueDate: newJob.dueDate,
      projectCode: newJob.dueDate,
      assemblyName: newJob.assemblyName,
      partNumber: newJob.partNumber,
      revision: newJob.revision,
      totalBuildTimeHours: newJob.totalBuildTimeHours,
      passedTest: newJob.passedTest,
      passedTestDate: newJob.passedTestDate,
      passedQa: newJob.passedQa,
      passedQaDate: newJob.passedQaDate,
      status: 'Edit',
      checks: {
        xyOdb: true,
        stencilBotTop: false,
        spiBotTop: false,
        pnpBotTop: false,
        aoiBotTop: false,
        aoiFinalBotTop: false,
      },
      notes: newJob.notes,
    };

    onAddJob(job);
    setShowAddModal(false);
  };

  const getStatusBadge = (status: PipelineStatus) => {
    switch (status) {
      case 'Edit':
      case 'Draft' as any:
        return 'bg-amber-50 text-amber-800 border-amber-300 font-semibold';
      case 'Validation Complete':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'Dispatched to Line':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
      case 'Hold':
        return 'bg-rose-100 text-rose-800 border-rose-300';
    }
  };

  const getDueDateBadge = (dueDate?: string) => {
    switch (dueDate) {
      case 'ASAP':
        return 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
      case 'Development':
        return 'bg-sky-50 text-sky-700 border-sky-200 font-semibold';
      case 'Stock':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Workflow Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-semibold">
              FAI Validation & Logging Pipeline
            </span>
            <h3 className="text-base font-bold mt-0.5">Production Release Validation, DFM Checks & Gate Controls</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Strict 8-gate validation ensures XY/ODB++, Stencil, SPI, PNP, AOI, Test, QA, and AOI Final verification packages
              are fully verified prior to completion.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
            <button
              onClick={() => setShowArchiveHistoryModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <FolderArchive className="w-3.5 h-3.5 text-sky-400" />
              Server PDF Archives
            </button>

            <button
              id="new-assembly-job-btn"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-sky-400 hover:bg-sky-300 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Start NEW FAI Job
            </button>
          </div>
        </div>

        {/* Pipeline Stage Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mt-4 pt-4 border-t border-slate-700/80 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold">1</span>
            <span>XY/ODB++</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold">2</span>
            <span>Stencil BOT/TOP</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold">3</span>
            <span>SPI BOT/TOP</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold">4</span>
            <span>PNP BOT/TOP</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold">5</span>
            <span>AOI BOT/TOP</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold">6</span>
            <span>Passed Test?</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold">7</span>
            <span>Passed QA?</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-sky-500 text-slate-900 text-[10px] font-bold">8</span>
            <span className="font-semibold text-white">AOI Final File</span>
          </div>
        </div>
      </div>

      {/* Job Cards */}
      <div className="space-y-4">
        {jobs.map((job) => {
          const isPassedTest = job.passedTest === 'Yes';
          const isPassedQa = job.passedQa === 'Yes';
          const checkedCount =
            Object.values(job.checks).filter(Boolean).length +
            (isPassedTest ? 1 : 0) +
            (isPassedQa ? 1 : 0);
          const allChecksPassed =
            Object.values(job.checks).every(Boolean) && isPassedTest && isPassedQa;
          const dueLabel = job.dueDate || job.projectCode || 'Standard';

          return (
            <div
              key={job.id}
              className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-4"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 shrink-0">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 font-mono">{job.jobId}</span>
                      <span className={`px-2 py-0.5 text-[10px] rounded border ${getDueDateBadge(dueLabel)}`}>
                        Due: {dueLabel}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {job.partNumber} ({job.revision})
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-slate-800 mt-0.5">{job.assemblyName}</h4>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                  {/* Status Badge - Change Draft to Edit with direct click-to-edit action */}
                  {job.status === 'Edit' || (job.status as string) === 'Draft' ? (
                    <button
                      type="button"
                      onClick={() => setSelectedJobForEdit(job)}
                      title="Document in Edit mode — Click to modify FAI parameters"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Pencil className="w-3 h-3 text-amber-700" />
                      <span>Edit</span>
                    </button>
                  ) : (
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(job.status)}`}>
                      {job.status === 'Dispatched to Line' ? `${job.jobId} Logged` : job.status}
                    </span>
                  )}

                  {/* Dedicated Edit FAI Form Action Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedJobForEdit(job)}
                    title="Edit FAI Form / Document Details"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3 h-3 text-sky-600" />
                    <span>Edit Form</span>
                  </button>
                </div>
              </div>

              {/* Ingestion Verification Gate Checkboxes */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                    Pre-Dispatch Quality Gates ({checkedCount}/8 Verified)
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    Build Start: {job.targetBuildDate ? `${job.targetBuildDate}${job.startTime ? ` @ ${job.startTime}` : ''}` : (job.startTime ? `@ ${job.startTime}` : 'Schedule on Demand')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2 pt-1 text-xs">
                  <label className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={job.checks.xyOdb}
                      onChange={() => onToggleCheck(job.id, 'xyOdb')}
                      className="w-4 h-4 text-sky-600 rounded"
                    />
                    <span className="text-slate-700 font-medium">#1 XY/ODB++</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={job.checks.stencilBotTop}
                      onChange={() => onToggleCheck(job.id, 'stencilBotTop')}
                      className="w-4 h-4 text-sky-600 rounded"
                    />
                    <span className="text-slate-700 font-medium">#2 Stencil File BOT/TOP</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={job.checks.spiBotTop}
                      onChange={() => onToggleCheck(job.id, 'spiBotTop')}
                      className="w-4 h-4 text-sky-600 rounded"
                    />
                    <span className="text-slate-700 font-medium">#3 SPI File BOT/TOP</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={job.checks.pnpBotTop}
                      onChange={() => onToggleCheck(job.id, 'pnpBotTop')}
                      className="w-4 h-4 text-sky-600 rounded"
                    />
                    <span className="text-slate-700 font-medium">#4 PNP File BOT/TOP</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={job.checks.aoiBotTop}
                      onChange={() => onToggleCheck(job.id, 'aoiBotTop')}
                      className="w-4 h-4 text-sky-600 rounded"
                    />
                    <span className="text-slate-700 font-medium">#5 AOI File BOT/TOP</span>
                  </label>

                  {/* #6 Passed Test? Gate */}
                  <div
                    className={`p-2.5 bg-white rounded-lg border transition-colors flex flex-col justify-between gap-1.5 ${
                      job.passedTest === 'Yes'
                        ? 'border-emerald-300 bg-emerald-50/40'
                        : job.passedTest === 'No'
                        ? 'border-rose-200 bg-rose-50/20'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-slate-700 font-medium whitespace-nowrap">#6 Passed Test?</span>
                      <select
                        value={job.passedTest || 'No'}
                        onChange={(e) =>
                          onUpdatePassedTest?.(job.id, e.target.value as 'Yes' | 'No', job.passedTestDate)
                        }
                        className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${
                          job.passedTest === 'Yes'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 font-medium shrink-0">Date:</span>
                      <input
                        type="date"
                        value={job.passedTestDate || ''}
                        onChange={(e) =>
                          onUpdatePassedTest?.(job.id, job.passedTest || 'No', e.target.value)
                        }
                        className="w-full text-[11px] font-mono p-1 bg-slate-50 border border-slate-200 rounded leading-none"
                      />
                    </div>
                  </div>

                  {/* #7 Passed QA? Gate */}
                  <div
                    className={`p-2.5 bg-white rounded-lg border transition-colors flex flex-col justify-between gap-1.5 ${
                      job.passedQa === 'Yes'
                        ? 'border-emerald-300 bg-emerald-50/40'
                        : job.passedQa === 'No'
                        ? 'border-rose-200 bg-rose-50/20'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-slate-700 font-medium whitespace-nowrap">#7 Passed QA?</span>
                      <select
                        value={job.passedQa || 'No'}
                        onChange={(e) =>
                          onUpdatePassedQa?.(job.id, e.target.value as 'Yes' | 'No', job.passedQaDate)
                        }
                        className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${
                          job.passedQa === 'Yes'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 font-medium shrink-0">Date:</span>
                      <input
                        type="date"
                        value={job.passedQaDate || ''}
                        onChange={(e) =>
                          onUpdatePassedQa?.(job.id, job.passedQa || 'No', e.target.value)
                        }
                        className="w-full text-[11px] font-mono p-1 bg-slate-50 border border-slate-200 rounded leading-none"
                      />
                    </div>
                  </div>

                  {/* #8 AOI Final File BOT/TOP Gate */}
                  <label className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={job.checks.aoiFinalBotTop}
                      onChange={() => onToggleCheck(job.id, 'aoiFinalBotTop')}
                      className="w-4 h-4 text-sky-600 rounded"
                    />
                    <span className="text-slate-700 font-medium">#8 AOI Final File BOT/TOP</span>
                  </label>
                </div>
              </div>

              {/* Total Build Time in Hours & Dispatch Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">Total Build Time in Hours:</span>
                  <div className="inline-flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={job.totalBuildTimeHours !== undefined ? job.totalBuildTimeHours : ''}
                      placeholder="0.0"
                      onChange={(e) =>
                        onUpdateTotalBuildTime?.(job.id, e.target.value)
                      }
                      className="w-20 px-2.5 py-1 text-xs font-mono font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    />
                    <span className="text-slate-500 font-medium text-xs">hrs</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {job.status === 'Dispatched to Line' ? (
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {job.jobId} is logged
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedJobForCompletion(job)}
                        title="Re-open Server Archiving & PDF Generator"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-sky-600" />
                        <span>View / Re-Save PDF</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      disabled={!allChecksPassed}
                      onClick={() => setSelectedJobForCompletion(job)}
                      className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-colors ${
                        allChecksPassed
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Log FAI Build Completion
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ingest Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Start NEW FAI Job</h3>
                <p className="text-xs text-slate-300">BOM, Gerber & Machine Dispatch Record</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-4 sm:p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">FAI#</label>
                  <input
                    type="text"
                    value={newJob.jobId}
                    onChange={(e) => setNewJob({ ...newJob, jobId: e.target.value })}
                    placeholder="e.g. FAI-404"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Due Date</label>
                  <select
                    value={newJob.dueDate}
                    onChange={(e) => setNewJob({ ...newJob, dueDate: e.target.value as DueDateCategory })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-medium text-slate-800"
                    required
                  >
                    <option value="ASAP">ASAP</option>
                    <option value="Development">Development</option>
                    <option value="Stock">Stock</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Assembly Name</label>
                <input
                  type="text"
                  value={newJob.assemblyName}
                  onChange={(e) => setNewJob({ ...newJob, assemblyName: e.target.value })}
                  placeholder="e.g. Telemetry RF Power Node"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">Part Number</label>
                  <input
                    type="text"
                    value={newJob.partNumber}
                    onChange={(e) => setNewJob({ ...newJob, partNumber: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Revision</label>
                  <input
                    type="text"
                    value={newJob.revision}
                    onChange={(e) => setNewJob({ ...newJob, revision: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Total Build Time in Hours</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={newJob.totalBuildTimeHours}
                    onChange={(e) => setNewJob({ ...newJob, totalBuildTimeHours: e.target.value })}
                    className="w-32 p-2 bg-slate-50 border border-slate-200 rounded font-mono"
                    placeholder="3.5"
                  />
                  <span className="text-slate-500 font-medium text-xs">Hours</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid grid-cols-2 gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">#6 Passed Test?</label>
                    <select
                      value={newJob.passedTest}
                      onChange={(e) => setNewJob({ ...newJob, passedTest: e.target.value as 'Yes' | 'No' })}
                      className="w-full p-2 bg-white border border-slate-200 rounded font-medium text-slate-800"
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Test Pass Date</label>
                    <input
                      type="date"
                      value={newJob.passedTestDate}
                      onChange={(e) => setNewJob({ ...newJob, passedTestDate: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">#7 Passed QA?</label>
                    <select
                      value={newJob.passedQa}
                      onChange={(e) => setNewJob({ ...newJob, passedQa: e.target.value as 'Yes' | 'No' })}
                      className="w-full p-2 bg-white border border-slate-200 rounded font-medium text-slate-800"
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">QA Pass Date</label>
                    <input
                      type="date"
                      value={newJob.passedQaDate}
                      onChange={(e) => setNewJob({ ...newJob, passedQaDate: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Engineering Notes / Special Instructions</label>
                <input
                  type="text"
                  value={newJob.notes}
                  onChange={(e) => setNewJob({ ...newJob, notes: e.target.value })}
                  placeholder="e.g. Special nitrogen reflow atmosphere or BGA void inspection"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded shadow-xs"
                >
                  Create Assembly Ingestion Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit FAI Form & Quality Parameters Modal */}
      <FaiEditModal
        isOpen={Boolean(selectedJobForEdit)}
        job={selectedJobForEdit}
        onClose={() => setSelectedJobForEdit(null)}
        onSaveJob={(updatedJob) => {
          onUpdateJob?.(updatedJob);
        }}
      />

      {/* Log FAI Build Completion & Server Archiving Modal */}
      <FaiCompletionModal
        isOpen={Boolean(selectedJobForCompletion)}
        job={selectedJobForCompletion}
        onClose={() => setSelectedJobForCompletion(null)}
        onLoggedSuccess={(jobId) => {
          onUpdateStatus(jobId, 'Dispatched to Line');
        }}
      />

      {/* Server Archive History Modal */}
      <FaiArchiveHistoryModal
        isOpen={showArchiveHistoryModal}
        onClose={() => setShowArchiveHistoryModal(false)}
      />
    </div>
  );
};
