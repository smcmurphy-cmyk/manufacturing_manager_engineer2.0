import React, { useState } from 'react';
import {
  GraduationCap,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Mail,
  UserCheck,
  ShieldCheck,
  Award,
  FileCheck,
  Send,
  RotateCcw,
  BookOpen,
  Calendar,
  Pencil,
  Save,
  X
} from 'lucide-react';
import { TrainingRecord, CertStatus } from '../../types';

interface TrainingTrackerProps {
  records: TrainingRecord[];
  onAddRecord: (record: TrainingRecord) => void;
  onRenewRecord: (id: string) => void;
  onUpdateRecord?: (record: TrainingRecord) => void;
}

type ActiveModalType = 'new-cert' | 'edit-record' | 'renewal-notice' | 'retest-action' | null;

export const TrainingTracker: React.FC<TrainingTrackerProps> = ({
  records,
  onAddRecord,
  onRenewRecord,
  onUpdateRecord,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [standardFilter, setStandardFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeModal, setActiveModal] = useState<ActiveModalType>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Reference date for date calculations
  const todayStr = '2026-08-30';

  const getCalculatedStatus = (expDateStr: string): CertStatus => {
    const today = new Date(todayStr);
    const exp = new Date(expDateStr);
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) return 'Expired';
    if (diffDays <= 30) return 'Expiring Soon';
    return 'Valid';
  };

  const getDaysRemaining = (expDateStr: string): number => {
    const today = new Date(todayStr);
    const exp = new Date(expDateStr);
    return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
  };

  // Filtered dataset
  const filteredRecords = records.filter((r) => {
    const status = getCalculatedStatus(r.expirationDate);
    const matchesSearch =
      r.operatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.certificationTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStandard = standardFilter === 'ALL' || r.standardLevel.includes(standardFilter);
    const matchesStatus = statusFilter === 'ALL' || status === statusFilter;
    return matchesSearch && matchesStandard && matchesStatus;
  });

  // Lists for dropdown selectors in modals
  const validRecords = records.filter((r) => getCalculatedStatus(r.expirationDate) === 'Valid');
  const expiringRecords = records.filter((r) => getCalculatedStatus(r.expirationDate) === 'Expiring Soon');
  const expiredRecords = records.filter((r) => getCalculatedStatus(r.expirationDate) === 'Expired');

  // --- Form 1: New Certification State ---
  const [newRec, setNewRec] = useState({
    operatorName: '',
    role: 'SMT Assembly Technician',
    certificationTitle: 'Certified IPC Specialist (CIS)',
    standardLevel: 'IPC-A-610 Class 3',
    issueDate: todayStr,
    contactEmail: 'murphy@dyneng.com',
    notes: '',
  });

  const handleCreateNewCert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRec.operatorName.trim()) return;

    // 24 months validity standard for IPC
    const issue = new Date(newRec.issueDate);
    const exp = new Date(issue);
    exp.setFullYear(exp.getFullYear() + 2);
    const expirationDate = exp.toISOString().split('T')[0];

    const record: TrainingRecord = {
      id: `tr-${Date.now()}`,
      operatorName: newRec.operatorName,
      role: newRec.role,
      certificationTitle: newRec.certificationTitle,
      standardLevel: newRec.standardLevel,
      issueDate: newRec.issueDate,
      expirationDate: expirationDate,
      status: getCalculatedStatus(expirationDate),
      contactEmail: newRec.contactEmail,
      notes: newRec.notes,
    };

    onAddRecord(record);
    setActiveModal(null);
    showToast(`Recorded certification for ${newRec.operatorName}`);
    setNewRec({
      operatorName: '',
      role: 'SMT Assembly Technician',
      certificationTitle: 'Certified IPC Specialist (CIS)',
      standardLevel: 'IPC-A-610 Class 3',
      issueDate: todayStr,
      contactEmail: 'Smcmurphy@gmail.com',
      notes: '',
    });
  };

  // --- Form 2: Edit Record & Competency State ---
  const [editForm, setEditForm] = useState<TrainingRecord>({
    id: records[0]?.id || '',
    operatorName: records[0]?.operatorName || '',
    role: records[0]?.role || '',
    certificationTitle: records[0]?.certificationTitle || 'IPC-A-610 Specialist (CIS)',
    standardLevel: records[0]?.standardLevel || 'IPC-A-610 Class 3',
    issueDate: records[0]?.issueDate || todayStr,
    expirationDate: records[0]?.expirationDate || todayStr,
    status: records[0]?.status || 'Valid',
    supervisor: records[0]?.supervisor || 'QA Technician',
    contactEmail: records[0]?.contactEmail || 'murphy@dyneng.com',
    notes: records[0]?.notes || '',
  });

  const openEditModal = (rec?: TrainingRecord) => {
    const target = rec || records[0];
    if (target) {
      setEditForm({ ...target });
      setActiveModal('edit-record');
    }
  };

  const handleSaveEditRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.id) return;

    if (onUpdateRecord) {
      onUpdateRecord(editForm);
    }
    setActiveModal(null);
    showToast(`Updated record for ${editForm.operatorName}`);
  };

  // --- Form 3: Renewal & Expiration Dispatch Form State ---
  const [renewalForm, setRenewalForm] = useState({
    operatorId: (expiringRecords[0] || records[0])?.id || '',
    extensionMonths: 24,
    examScore: '96%',
    courseModule: 'IPC-A-610 CIS Recertification Modules 1-6',
    trainerName: 'Master IPC Trainer (MIT-8104)',
    sendNoticeEmail: true,
  });

  const handleProcessRenewal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = records.find((r) => r.id === renewalForm.operatorId);
    if (!target) return;

    const now = new Date(todayStr);
    const exp = new Date(now);
    exp.setMonth(exp.getMonth() + renewalForm.extensionMonths);
    const newExpDate = exp.toISOString().split('T')[0];

    const renewalStamp = `[Renewed ${todayStr}: Score ${renewalForm.examScore}, Module: ${renewalForm.courseModule}, Proctor: ${renewalForm.trainerName}]`;
    const updatedRecord: TrainingRecord = {
      ...target,
      issueDate: todayStr,
      expirationDate: newExpDate,
      status: 'Valid',
      notes: target.notes ? `${target.notes} | ${renewalStamp}` : renewalStamp,
    };

    if (onUpdateRecord) {
      onUpdateRecord(updatedRecord);
    } else {
      onRenewRecord(target.id);
    }

    setActiveModal(null);
    showToast(`Renewed certification for ${target.operatorName} (+${renewalForm.extensionMonths} months)`);
  };

  // --- Form 4: Immediate Re-Test & Recertification Action State ---
  const [retestForm, setRetestForm] = useState({
    operatorId: (expiredRecords[0] || records[0])?.id || '',
    remedialHours: '8 Hours Guided Soldering Lab',
    targetStandard: 'IPC-A-610 Class 3 / J-STD-001',
    retestDate: todayStr,
    proctor: 'Master IPC Trainer (MIT-9012)',
    examScore: '94% Practical, 98% Theory',
    actionOutcome: 'Reinstate Active Class 3 Certification',
    retestNotes: 'Completed remedial bench training, re-took soldering test and demonstrated 100% compliant wetting and fillet heights.',
  });

  const handleProcessRetest = (e: React.FormEvent) => {
    e.preventDefault();
    const target = records.find((r) => r.id === retestForm.operatorId);
    if (!target) return;

    const issue = new Date(retestForm.retestDate);
    const exp = new Date(issue);
    exp.setFullYear(exp.getFullYear() + 2);
    const newExpDate = exp.toISOString().split('T')[0];

    const retestStamp = `[Re-Test Passed ${retestForm.retestDate}: Score ${retestForm.examScore}, Proctor: ${retestForm.proctor}, Outcome: ${retestForm.actionOutcome} - ${retestForm.retestNotes}]`;
    const updatedRecord: TrainingRecord = {
      ...target,
      issueDate: retestForm.retestDate,
      expirationDate: newExpDate,
      status: 'Valid',
      notes: target.notes ? `${target.notes} | ${retestStamp}` : retestStamp,
    };

    if (onUpdateRecord) {
      onUpdateRecord(updatedRecord);
    } else {
      onRenewRecord(target.id);
    }

    setActiveModal(null);
    showToast(`Re-test recorded & ${target.operatorName} reinstated with 2-year validity`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs rounded-lg shadow-lg border border-slate-700 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Metrics Row (Interactive Filter Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Certified Workforce */}
        <button
          id="card-trigger-certified-workforce"
          type="button"
          onClick={() => {
            setStatusFilter('ALL');
            setStandardFilter('ALL');
            setSearchTerm('');
          }}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'ALL' && standardFilter === 'ALL' && !searchTerm
              ? 'bg-slate-50 border-slate-400 ring-2 ring-slate-800 shadow-xs'
              : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Certified Workforce</span>
            <Award className="w-4 h-4 text-sky-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{records.length}</p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-slate-500">IPC Technicians & Engineers</p>
            <span className="text-[10px] text-sky-700 font-medium">
              {statusFilter === 'ALL' && standardFilter === 'ALL' && !searchTerm ? 'Showing all' : 'Click to view all'}
            </span>
          </div>
        </button>

        {/* Card 2: Valid & Current */}
        <button
          id="card-trigger-valid-current"
          type="button"
          onClick={() => {
            setStatusFilter((prev) => (prev === 'Valid' ? 'ALL' : 'Valid'));
          }}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'Valid'
              ? 'bg-emerald-50/50 border-emerald-400 ring-2 ring-emerald-600 shadow-xs'
              : 'bg-white border-slate-200 shadow-2xs hover:border-emerald-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Valid & Current</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {records.filter((r) => getCalculatedStatus(r.expirationDate) === 'Valid').length}
          </p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-emerald-600 font-medium">Class 3 Qualified</p>
            <span className="text-[10px] text-emerald-700 font-medium">
              {statusFilter === 'Valid' ? 'Filtered active' : 'Click to filter'}
            </span>
          </div>
        </button>

        {/* Card 3: Expiring (<30 Days) */}
        <button
          id="card-trigger-expiring-soon"
          type="button"
          onClick={() => {
            setStatusFilter((prev) => (prev === 'Expiring Soon' ? 'ALL' : 'Expiring Soon'));
          }}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'Expiring Soon'
              ? 'bg-amber-50/50 border-amber-400 ring-2 ring-amber-500 shadow-xs'
              : 'bg-white border-slate-200 shadow-2xs hover:border-amber-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Expiring (&lt;30 Days)</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {records.filter((r) => getCalculatedStatus(r.expirationDate) === 'Expiring Soon').length}
          </p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-amber-600 font-medium">Outlook alerts queued</p>
            <span className="text-[10px] text-amber-700 font-medium">
              {statusFilter === 'Expiring Soon' ? 'Filtered active' : 'Click to filter'}
            </span>
          </div>
        </button>

        {/* Card 4: Expired / On Hold */}
        <button
          id="card-trigger-expired-hold"
          type="button"
          onClick={() => {
            setStatusFilter((prev) => (prev === 'Expired' ? 'ALL' : 'Expired'));
          }}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'Expired'
              ? 'bg-rose-50/50 border-rose-400 ring-2 ring-rose-600 shadow-xs'
              : 'bg-white border-slate-200 shadow-2xs hover:border-rose-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Expired / On Hold</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {records.filter((r) => getCalculatedStatus(r.expirationDate) === 'Expired').length}
          </p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-rose-600 font-medium">Requires Immediate Re-test</p>
            <span className="text-[10px] text-rose-700 font-medium">
              {statusFilter === 'Expired' ? 'Filtered active' : 'Click to filter'}
            </span>
          </div>
        </button>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">IPC & ESD Competency Matrix</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Governed by IPC-A-610, J-STD-001, IPC-7711/7721 and ANSI/ESD S20.20
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="add-training-cert-btn"
              onClick={() => setActiveModal('new-cert')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add / Record Certification
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search operator name, badge number, or qualification..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={standardFilter}
                onChange={(e) => setStandardFilter(e.target.value)}
                className="px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="ALL">All Standards</option>
                <option value="IPC-A-610">IPC-A-610</option>
                <option value="J-STD-001">J-STD-001</option>
                <option value="IPC-7711">IPC-7711/7721</option>
                <option value="ESD">ANSI/ESD S20.20</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="Valid">Valid</option>
                <option value="Expiring Soon">Expiring Soon</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
          </div>

          {/* Active Filter Indicators */}
          {(statusFilter !== 'ALL' || standardFilter !== 'ALL' || searchTerm) && (
            <div className="flex items-center gap-2 text-xs pt-1 pb-0.5 flex-wrap">
              <span className="text-slate-500 text-[11px] font-medium">Active filters:</span>
              {statusFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 rounded-md font-medium text-[11px]">
                  Status: {statusFilter}
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className="text-sky-700 hover:text-sky-900 ml-0.5 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              )}
              {standardFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded-md font-medium text-[11px]">
                  Standard: {standardFilter}
                  <button
                    type="button"
                    onClick={() => setStandardFilter('ALL')}
                    className="text-slate-600 hover:text-slate-900 ml-0.5 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              )}
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded-md font-medium text-[11px]">
                  Search: "{searchTerm}"
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="text-slate-600 hover:text-slate-900 ml-0.5 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ALL');
                  setStandardFilter('ALL');
                  setSearchTerm('');
                }}
                className="text-[11px] text-sky-600 hover:text-sky-800 underline ml-1 cursor-pointer"
              >
                Reset all
              </button>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">Operator & Role</th>
                  <th className="py-3 px-3.5">Certification & Standard</th>
                  <th className="py-3 px-3.5">Issue Date</th>
                  <th className="py-3 px-3.5">Expiration Date</th>
                  <th className="py-3 px-3.5">Status & Alert</th>
                  <th className="py-3 px-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((r) => {
                  const status = getCalculatedStatus(r.expirationDate);
                  const daysLeft = getDaysRemaining(r.expirationDate);

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3.5 align-top">
                        <div className="font-bold text-slate-900">
                          {r.operatorName}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{r.role}</p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                          <Mail className="w-3 h-3 text-slate-400" /> {r.contactEmail}
                        </p>
                      </td>
                      <td className="py-3.5 px-3.5 align-top">
                        <span className="font-semibold text-slate-900">{r.certificationTitle}</span>
                        <div className="text-[11px] font-mono text-sky-700 mt-0.5">{r.standardLevel}</div>
                        {r.notes && (
                          <p className="text-[10px] text-slate-500 mt-1 max-w-sm font-sans bg-slate-50 p-1.5 rounded border border-slate-100">
                            {r.notes}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 align-top font-mono text-slate-600">{r.issueDate}</td>
                      <td className="py-3.5 px-3.5 align-top font-mono font-semibold text-slate-900">
                        {r.expirationDate}
                        {status === 'Expiring Soon' && (
                          <div className="text-[10px] text-amber-600 font-sans font-medium mt-0.5">
                            {daysLeft} days remaining
                          </div>
                        )}
                        {status === 'Expired' && (
                          <div className="text-[10px] text-rose-600 font-sans font-medium mt-0.5">
                            {Math.abs(daysLeft)} days overdue
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 align-top whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${
                            status === 'Valid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : status === 'Expiring Soon'
                              ? 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
                              : 'bg-rose-50 text-rose-700 border-rose-300'
                          }`}
                        >
                          {status === 'Valid' && <CheckCircle2 className="w-3 h-3" />}
                          {status === 'Expiring Soon' && <Clock className="w-3 h-3" />}
                          {status === 'Expired' && <AlertTriangle className="w-3 h-3" />}
                          {status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3.5 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setRenewalForm((prev) => ({ ...prev, operatorId: r.id }));
                              setActiveModal('renewal-notice');
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:text-sky-800 hover:bg-sky-50 border border-sky-200 rounded transition-colors cursor-pointer"
                          >
                            Renew (+2 Yrs)
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(r)}
                            className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer flex items-center gap-1"
                            title="Edit Workforce Competency Record"
                          >
                            <Pencil className="w-3 h-3 text-slate-500" />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      No training or certification records match your search filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Record IPC / Workforce Certification Form                        */}
      {/* ========================================================================= */}
      {activeModal === 'new-cert' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-sky-400" />
                  <h3 className="text-sm font-semibold">Record IPC / Workforce Certification</h3>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">IPC-A-610, J-STD-001 & IPC-7711/7721 Compliance</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewCert} className="p-4 sm:p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Operator Full Name</label>
                <input
                  type="text"
                  value={newRec.operatorName}
                  onChange={(e) => setNewRec({ ...newRec, operatorName: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-2 focus:ring-sky-500"
                  placeholder="e.g. Alex Morgan"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Role / Workstation</label>
                  <input
                    type="text"
                    value={newRec.role}
                    onChange={(e) => setNewRec({ ...newRec, role: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-2 focus:ring-sky-500"
                    placeholder="e.g. SMT Line Operator"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Alert & Contact Email</label>
                  <input
                    type="email"
                    value={newRec.contactEmail}
                    onChange={(e) => setNewRec({ ...newRec, contactEmail: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono focus:bg-white focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Certification Title</label>
                  <select
                    value={newRec.certificationTitle}
                    onChange={(e) => setNewRec({ ...newRec, certificationTitle: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value="Certified IPC Specialist (CIS)">Certified IPC Specialist (CIS)</option>
                    <option value="Certified IPC Trainer (CIT)">Certified IPC Trainer (CIT)</option>
                    <option value="Master IPC Trainer (MIT)">Master IPC Trainer (MIT)</option>
                    <option value="Rework & Repair Specialist">Rework & Repair Specialist</option>
                    <option value="ESD Control Custodian">ESD Control Custodian</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Standard & Class</label>
                  <select
                    value={newRec.standardLevel}
                    onChange={(e) => setNewRec({ ...newRec, standardLevel: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value="IPC-A-610 Class 3">IPC-A-610 Class 3 (Aerospace/High Rel)</option>
                    <option value="IPC-A-610 Class 2">IPC-A-610 Class 2 (Dedicated Service)</option>
                    <option value="J-STD-001 Class 3">J-STD-001 Class 3 (Soldered Assemblies)</option>
                    <option value="IPC-7711/7721 Class 3">IPC-7711/7721 Class 3 (Rework & Repair)</option>
                    <option value="ANSI/ESD S20.20">ANSI/ESD S20.20 (ESD Protection)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Certification Issue Date</label>
                <input
                  type="date"
                  value={newRec.issueDate}
                  onChange={(e) => setNewRec({ ...newRec, issueDate: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono focus:bg-white focus:ring-2 focus:ring-sky-500"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Expiration date is automatically calculated to +24 months per IPC qualification standard.
                </p>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Notes / Training Facility / Module Scores</label>
                <input
                  type="text"
                  value={newRec.notes}
                  onChange={(e) => setNewRec({ ...newRec, notes: e.target.value })}
                  placeholder="e.g. Scored 98% on Modules 1-6 testing at Certified IPC Center"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded shadow-xs cursor-pointer"
                >
                  Save Certification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Edit Workforce Competency Record Form                            */}
      {/* ========================================================================= */}
      {activeModal === 'edit-record' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-sky-400" />
                  <h3 className="text-sm font-semibold">Edit Workforce Competency Record</h3>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Update operator certification, role details, and competency status
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRecord} className="p-4 sm:p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Operator Full Name</label>
                <input
                  type="text"
                  value={editForm.operatorName}
                  onChange={(e) => setEditForm({ ...editForm, operatorName: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Role / Workstation</label>
                  <input
                    type="text"
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={editForm.contactEmail}
                    onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Governing Standard</label>
                  <select
                    value={editForm.standardLevel}
                    onChange={(e) => {
                      const std = e.target.value;
                      let title = editForm.certificationTitle;
                      if (std.includes('IPC-A-610')) title = 'IPC-A-610 Specialist (CIS)';
                      else if (std.includes('J-STD-001')) title = 'J-STD-001 Specialist (CIS)';
                      else if (std.includes('IPC-7711')) title = 'IPC-7711/7721 Rework Specialist';
                      else if (std.includes('ESD')) title = 'ESD Program Coordinator';
                      setEditForm({ ...editForm, standardLevel: std, certificationTitle: title });
                    }}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value="IPC-A-610 Class 3">IPC-A-610 Class 3 (Aerospace & Military)</option>
                    <option value="IPC-A-610 Class 2">IPC-A-610 Class 2 (Dedicated Service)</option>
                    <option value="J-STD-001 Class 3">J-STD-001 Class 3 (Space & Flight Addendum)</option>
                    <option value="IPC-7711/7721 Class 3">IPC-7711/7721 Class 3 Rework & Repair</option>
                    <option value="ANSI/ESD S20.20">ANSI/ESD S20.20 Plant Compliance</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Supervisor / Proctor</label>
                  <input
                    type="text"
                    value={editForm.supervisor}
                    onChange={(e) => setEditForm({ ...editForm, supervisor: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={editForm.issueDate}
                    onChange={(e) => setEditForm({ ...editForm, issueDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono focus:bg-white focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Expiration Date</label>
                  <input
                    type="date"
                    value={editForm.expirationDate}
                    onChange={(e) => setEditForm({ ...editForm, expirationDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono focus:bg-white focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Competency Notes & Workmanship Details</label>
                <textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-2 focus:ring-sky-500"
                  placeholder="Module qualifications, certified soldering scopes, microscope audit notes, etc."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Certification Renewal & Expiration Notice Form                   */}
      {/* ========================================================================= */}
      {activeModal === 'renewal-notice' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-4 sm:p-5 bg-amber-800 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-300" />
                  <h3 className="text-sm font-semibold">Certification Renewal & Expiration Notice Form</h3>
                </div>
                <p className="text-xs text-amber-200 mt-0.5">
                  Manage 24-Month IPC Recertifications & Outlook Alert Dispatch
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-amber-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessRenewal} className="p-4 sm:p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Select Technician for Renewal</label>
                <select
                  value={renewalForm.operatorId}
                  onChange={(e) => setRenewalForm({ ...renewalForm, operatorId: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  required
                >
                  {records.map((r) => {
                    const status = getCalculatedStatus(r.expirationDate);
                    const daysLeft = getDaysRemaining(r.expirationDate);
                    return (
                      <option key={r.id} value={r.id}>
                        {r.operatorName} — {r.standardLevel} [{status}: {daysLeft}d left, Exp: {r.expirationDate}]
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Renewal Extension</label>
                  <select
                    value={renewalForm.extensionMonths}
                    onChange={(e) => setRenewalForm({ ...renewalForm, extensionMonths: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value={24}>+24 Months (Standard 2-Yr Cycle)</option>
                    <option value={12}>+12 Months (Provisional Extension)</option>
                    <option value={36}>+36 Months (Master Trainer Endorsement)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Recertification Exam Score</label>
                  <input
                    type="text"
                    value={renewalForm.examScore}
                    onChange={(e) => setRenewalForm({ ...renewalForm, examScore: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono focus:bg-white focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. 96%"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Course Module / Training Unit</label>
                  <input
                    type="text"
                    value={renewalForm.courseModule}
                    onChange={(e) => setRenewalForm({ ...renewalForm, courseModule: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Proctor / Certified MIT</label>
                  <input
                    type="text"
                    value={renewalForm.trainerName}
                    onChange={(e) => setRenewalForm({ ...renewalForm, trainerName: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <label className="flex items-center gap-2 font-medium text-amber-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={renewalForm.sendNoticeEmail}
                    onChange={(e) => setRenewalForm({ ...renewalForm, sendNoticeEmail: e.target.checked })}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Dispatch confirmation notice and update QMS Training Matrix</span>
                </label>
                <p className="text-[11px] text-amber-700 mt-1 pl-5">
                  Sets new issue date to {todayStr} and calculates expiration date to +{renewalForm.extensionMonths} months.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  Process Renewal (+2 Yrs)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Immediate Re-Test & Recertification Action Form                   */}
      {/* ========================================================================= */}
      {activeModal === 'retest-action' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-4 sm:p-5 bg-rose-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-300" />
                  <h3 className="text-sm font-semibold">IPC Immediate Re-Test & Recertification Form</h3>
                </div>
                <p className="text-xs text-rose-200 mt-0.5">
                  Remedial Training & Re-examination for Expired / On-Hold Technicians
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-rose-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessRetest} className="p-4 sm:p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Select Expired / Hold Technician</label>
                <select
                  value={retestForm.operatorId}
                  onChange={(e) => setRetestForm({ ...retestForm, operatorId: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-2 focus:ring-rose-500 cursor-pointer"
                  required
                >
                  {records.map((r) => {
                    const status = getCalculatedStatus(r.expirationDate);
                    return (
                      <option key={r.id} value={r.id}>
                        {r.operatorName} — {r.standardLevel} [{status}: Exp {r.expirationDate}]
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Remedial Training Hours</label>
                  <input
                    type="text"
                    value={retestForm.remedialHours}
                    onChange={(e) => setRetestForm({ ...retestForm, remedialHours: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-2 focus:ring-rose-500"
                    placeholder="e.g. 8 Hours Guided Soldering Lab"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Target Qualification</label>
                  <select
                    value={retestForm.targetStandard}
                    onChange={(e) => setRetestForm({ ...retestForm, targetStandard: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-2 focus:ring-rose-500 cursor-pointer"
                  >
                    <option value="IPC-A-610 Class 3 / J-STD-001">IPC-A-610 Class 3 / J-STD-001</option>
                    <option value="IPC-7711/7721 Class 3 Rework">IPC-7711/7721 Class 3 Rework</option>
                    <option value="ANSI/ESD S20.20 Custodian">ANSI/ESD S20.20 Custodian</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Re-Examination Date</label>
                  <input
                    type="date"
                    value={retestForm.retestDate}
                    onChange={(e) => setRetestForm({ ...retestForm, retestDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono focus:bg-white focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Master Trainer (MIT) Proctor</label>
                  <input
                    type="text"
                    value={retestForm.proctor}
                    onChange={(e) => setRetestForm({ ...retestForm, proctor: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Exam & Practical Score</label>
                  <input
                    type="text"
                    value={retestForm.examScore}
                    onChange={(e) => setRetestForm({ ...retestForm, examScore: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono focus:bg-white focus:ring-2 focus:ring-rose-500"
                    placeholder="e.g. 94% Practical, 98% Theory"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Action Outcome</label>
                  <select
                    value={retestForm.actionOutcome}
                    onChange={(e) => setRetestForm({ ...retestForm, actionOutcome: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-2 focus:ring-rose-500 cursor-pointer font-medium text-rose-900"
                  >
                    <option value="Reinstate Active Class 3 Certification">Reinstate Active Class 3 Certification</option>
                    <option value="Issue 30-Day Supervised Rework Waiver">Issue 30-Day Supervised Rework Waiver</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Re-Test Notes & Lab Evaluation</label>
                <textarea
                  rows={2}
                  value={retestForm.retestNotes}
                  onChange={(e) => setRetestForm({ ...retestForm, retestNotes: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-2 focus:ring-rose-500"
                  placeholder="Record practical soldering test observations, fillet wetting verification, and microscope sign-off..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Award className="w-4 h-4" />
                  Reinstate Certification (+2 Yrs)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
