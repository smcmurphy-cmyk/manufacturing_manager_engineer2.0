import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  AlertOctagon,
  Clock,
  FileCheck,
  ChevronDown,
  Calendar,
  Layers,
  ArrowUpRight,
  FileEdit,
  FolderTree,
  FileText
} from 'lucide-react';
import { ComplianceAudit, NCRRecord, SeverityLevel, NCRStatus } from '../../types';
import { EditAuditModal } from '../modals/EditAuditModal';
import { EditNcrModal } from '../modals/EditNcrModal';

interface ComplianceTrackerProps {
  ncrs: NCRRecord[];
  audits: ComplianceAudit[];
  onAddNcr: (ncr: NCRRecord) => void;
  onUpdateNcr?: (updatedNcr: NCRRecord) => void;
  onUpdateNcrStatus: (id: string, newStatus: NCRStatus) => void;
  onUpdateAudit?: (updatedAudit: ComplianceAudit) => void;
  onAddAudit?: (newAudit: ComplianceAudit) => void;
}

export const ComplianceTracker: React.FC<ComplianceTrackerProps> = ({
  ncrs,
  audits,
  onAddNcr,
  onUpdateNcr,
  onUpdateNcrStatus,
  onUpdateAudit,
  onAddAudit,
}) => {
  const [activeTab, setActiveTab] = useState<'ncrs' | 'audits'>('ncrs');
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAuditForEdit, setSelectedAuditForEdit] = useState<ComplianceAudit | null>(null);
  const [selectedNcrForEdit, setSelectedNcrForEdit] = useState<NCRRecord | null>(null);

  // Form state for new NCR
  const [newNcr, setNewNcr] = useState<{
    ncrNumber: string;
    serialNumber: string;
    assemblyPartNumber: string;
    assemblyRevision: string;
    defectDescription: string;
    standardClause: string;
    severity: SeverityLevel;
    rootCauseMethod: '5-Why' | '8D' | 'Fishbone' | 'Under Investigation';
    owner: string;
    nextAction: string;
  }>({
    ncrNumber: `NCR-2026-0${ncrs.length + 43}`,
    serialNumber: '',
    assemblyPartNumber: 'PCA-8840-MCU',
    assemblyRevision: 'Rev D',
    defectDescription: '',
    standardClause: 'AS9100D §8.7 / IPC-A-610 Class 3',
    severity: 'Critical (Class 3)',
    rootCauseMethod: '5-Why',
    owner: 'Manufacturing Engineering',
    nextAction: '',
  });

  const filteredNcrs = ncrs.filter((ncr) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      ncr.ncrNumber.toLowerCase().includes(term) ||
      (ncr.serialNumber && ncr.serialNumber.toLowerCase().includes(term)) ||
      ncr.assemblyPartNumber.toLowerCase().includes(term) ||
      ncr.assemblyRevision.toLowerCase().includes(term) ||
      ncr.defectDescription.toLowerCase().includes(term) ||
      ncr.standardClause.toLowerCase().includes(term) ||
      ncr.owner.toLowerCase().includes(term) ||
      ncr.nextAction.toLowerCase().includes(term);
    const matchesSeverity = severityFilter === 'ALL' || ncr.severity === severityFilter;
    const matchesStatus = statusFilter === 'ALL' || ncr.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const handleCreateNcr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNcr.defectDescription.trim()) return;

    const now = new Date();
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const record: NCRRecord = {
      id: `ncr-${Date.now()}`,
      ncrNumber: newNcr.ncrNumber,
      serialNumber: newNcr.serialNumber.trim() || undefined,
      assemblyPartNumber: newNcr.assemblyPartNumber,
      assemblyRevision: newNcr.assemblyRevision,
      defectDescription: newNcr.defectDescription,
      standardClause: newNcr.standardClause,
      severity: newNcr.severity,
      containmentDate: todayStr,
      rootCauseMethod: newNcr.rootCauseMethod,
      status: 'Open',
      nextAction: newNcr.nextAction || 'Initiate quarantine & 5-Why root cause determination.',
      owner: newNcr.owner,
      createdAt: timeStr,
      lastEditedAt: timeStr,
      lastEditedBy: newNcr.owner || 'Quality Assurance',
      editHistory: [
        {
          timestamp: timeStr,
          editedBy: newNcr.owner || 'Quality Assurance',
          summary: 'Initial Non-Conformance Report logged and containment baseline established.',
          newStatus: 'Open',
        },
      ],
    };

    onAddNcr(record);
    setShowAddModal(false);
    setNewNcr({
      ncrNumber: `NCR-2026-0${ncrs.length + 44}`,
      serialNumber: '',
      assemblyPartNumber: 'PCA-8840-MCU',
      assemblyRevision: 'Rev D',
      defectDescription: '',
      standardClause: 'AS9100D §8.7 / IPC-A-610 Class 3',
      severity: 'Critical (Class 3)',
      rootCauseMethod: '5-Why',
      owner: 'Manufacturing Engineering',
      nextAction: '',
    });
  };

  const getSeverityBadge = (sev: SeverityLevel) => {
    switch (sev) {
      case 'Critical (Class 3)':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Major (Class 2)':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Minor':
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (st: NCRStatus | string) => {
    switch (st) {
      case 'Open':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Fixed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold';
      case 'In Development':
      case 'In development':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Scrap':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row (Interactive Filter Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active NCRs */}
        <button
          id="card-filter-active-ncrs"
          type="button"
          onClick={() => {
            setActiveTab('ncrs');
            setStatusFilter('ALL');
            setSeverityFilter('ALL');
            setSearchTerm('');
          }}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'ncrs' && statusFilter === 'ALL' && severityFilter === 'ALL' && !searchTerm
              ? 'bg-slate-50 border-slate-400 ring-2 ring-slate-800 shadow-xs'
              : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Active NCRs</span>
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {ncrs.filter((n) => n.status !== 'Fixed').length}
          </p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-rose-600 font-medium">
              {ncrs.filter((n) => n.severity === 'Critical (Class 3)').length} Critical (Class 3)
            </p>
            <span className="text-[10px] text-slate-400 font-medium">Click to view all</span>
          </div>
        </button>

        {/* Card 2: In Development */}
        <button
          id="card-filter-in-development"
          type="button"
          onClick={() => {
            setActiveTab('ncrs');
            setStatusFilter((prev) => (prev === 'In Development' && activeTab === 'ncrs' ? 'ALL' : 'In Development'));
          }}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'ncrs' && (statusFilter === 'In Development' || statusFilter === 'In development')
              ? 'bg-amber-50/50 border-amber-400 ring-2 ring-amber-500 shadow-xs'
              : 'bg-white border-slate-200 shadow-2xs hover:border-amber-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">In Development</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {ncrs.filter((n) => n.status === 'In Development' || n.status === ('In development' as any)).length}
          </p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-slate-500">Quarantine lot verification</p>
            <span className="text-[10px] text-amber-700 font-medium">
              {activeTab === 'ncrs' && (statusFilter === 'In Development' || statusFilter === 'In development') ? 'Filtered active' : 'Click to filter'}
            </span>
          </div>
        </button>

        {/* Card 3: 5 Whys / Pareto Analyses */}
        <button
          id="card-filter-5-whys"
          type="button"
          onClick={() => {
            setActiveTab('ncrs');
            setStatusFilter('ALL');
            setSearchTerm((prev) => (prev === '5-Why' ? '' : '5-Why'));
          }}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'ncrs' && searchTerm === '5-Why'
              ? 'bg-indigo-50/50 border-indigo-400 ring-2 ring-indigo-500 shadow-xs'
              : 'bg-white border-slate-200 shadow-2xs hover:border-indigo-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">5 Whys / Pareto Analyses</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {ncrs.filter((n) => n.rootCauseMethod === '5-Why' || n.rootCauseMethod === '8D' || n.rootCauseMethod === 'Fishbone').length}
          </p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-slate-500">Root cause & corrective action</p>
            <span className="text-[10px] text-indigo-700 font-medium">
              {activeTab === 'ncrs' && searchTerm === '5-Why' ? 'Filtered active' : 'Click to filter'}
            </span>
          </div>
        </button>

        {/* Card 4: QMS Audit Events */}
        <button
          id="card-filter-qms-audits"
          type="button"
          onClick={() => {
            setActiveTab('audits');
          }}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'audits'
              ? 'bg-emerald-50/50 border-emerald-400 ring-2 ring-emerald-600 shadow-xs'
              : 'bg-white border-slate-200 shadow-2xs hover:border-emerald-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">QMS Audit Events</span>
            <FileCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{audits.length}</p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-emerald-600 font-medium">AS9100D & ISO 9001 Cadences</p>
            <span className="text-[10px] text-emerald-700 font-medium">
              {activeTab === 'audits' ? 'Active view' : 'Click to view'}
            </span>
          </div>
        </button>
      </div>

      {/* Tabs and Controls */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Sub Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg self-start">
            <button
              id="tab-ncrs"
              onClick={() => setActiveTab('ncrs')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'ncrs' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Non-Conformance Reports (NCR)
            </button>
            <button
              id="tab-audits"
              onClick={() => setActiveTab('audits')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'audits' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              AS9100D & ISO Audit Schedule
            </button>
          </div>

          {activeTab === 'ncrs' && (
            <button
              id="open-new-ncr-modal-btn"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              Log Non-Conformance (NCR)
            </button>
          )}
        </div>

        {activeTab === 'ncrs' ? (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Serial # (S/N), NCR #, Part #, Defect..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                >
                  <option value="ALL">All Severities</option>
                  <option value="Critical (Class 3)">Critical (Class 3)</option>
                  <option value="Major (Class 2)">Major (Class 2)</option>
                  <option value="Minor">Minor</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="Fixed">Fixed</option>
                  <option value="In Development">In Development</option>
                  <option value="Scrap">Scrap</option>
                </select>
              </div>
            </div>

            {/* Active Filter Indicator */}
            {(statusFilter !== 'ALL' || severityFilter !== 'ALL' || searchTerm) && (
              <div className="flex items-center gap-2 text-xs pt-1 pb-0.5">
                <span className="text-slate-500 text-[11px] font-medium">Active filters:</span>
                {statusFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-medium text-[11px]">
                    Status: {statusFilter}
                    <button
                      type="button"
                      onClick={() => setStatusFilter('ALL')}
                      className="text-amber-700 hover:text-amber-900 ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                )}
                {severityFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded-md font-medium text-[11px]">
                    Severity: {severityFilter}
                    <button
                      type="button"
                      onClick={() => setSeverityFilter('ALL')}
                      className="text-slate-600 hover:text-slate-900 ml-0.5"
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
                      className="text-slate-600 hover:text-slate-900 ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('ALL');
                    setSeverityFilter('ALL');
                    setSearchTerm('');
                  }}
                  className="text-[11px] text-sky-600 hover:text-sky-800 underline ml-1"
                >
                  Reset all
                </button>
              </div>
            )}

            {/* NCR Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5">NCR # & Board S/N</th>
                    <th className="py-3 px-3.5">Defect Description</th>
                    <th className="py-3 px-3.5">Standard & Severity</th>
                    <th className="py-3 px-3.5">Analysis & Owner</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5">Next Action & Timestamps</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredNcrs.map((ncr) => (
                    <tr key={ncr.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3.5 align-top font-mono">
                        <span className="font-bold text-slate-900">{ncr.ncrNumber}</span>
                        {ncr.serialNumber ? (
                          <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 bg-sky-50 text-sky-800 text-[10px] font-mono font-semibold rounded border border-sky-200">
                            <span className="text-sky-500 font-normal">S/N:</span> {ncr.serialNumber}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 font-sans italic mt-0.5">No S/N recorded</div>
                        )}
                        <div className="text-[11px] text-slate-600 font-sans mt-1">
                          {ncr.assemblyPartNumber} ({ncr.assemblyRevision})
                        </div>
                      </td>
                      <td className="py-3.5 px-3.5 align-top max-w-xs">
                        <p className="text-slate-800 leading-snug">{ncr.defectDescription}</p>
                      </td>
                      <td className="py-3.5 px-3.5 align-top whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded border ${getSeverityBadge(ncr.severity)}`}>
                          {ncr.severity}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-1 font-mono">{ncr.standardClause}</div>
                      </td>
                      <td className="py-3.5 px-3.5 align-top whitespace-nowrap">
                        <span className="font-medium text-slate-800">{ncr.rootCauseMethod}</span>
                        <div className="text-[11px] text-slate-500 mt-0.5">{ncr.owner}</div>
                      </td>
                      <td className="py-3.5 px-3.5 align-top whitespace-nowrap">
                        <select
                          value={ncr.status}
                          onChange={(e) => onUpdateNcrStatus(ncr.id, e.target.value as NCRStatus)}
                          className={`text-[11px] font-semibold px-2 py-1 rounded border focus:outline-hidden focus:ring-1 focus:ring-sky-500 cursor-pointer ${getStatusBadge(ncr.status)}`}
                        >
                          <option value="Open">Open</option>
                          <option value="Fixed">Fixed</option>
                          <option value="In Development">In Development</option>
                          <option value="Scrap">Scrap</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-3.5 align-top max-w-sm">
                        <p className="text-slate-600 text-[11px] leading-snug">{ncr.nextAction}</p>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1.5 pt-1 border-t border-slate-100">
                          <span className="text-[10px] text-slate-400">Containment: <strong className="font-mono text-slate-600 font-semibold">{ncr.containmentDate}</strong></span>
                          {ncr.lastEditedAt && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50/70 px-1.5 py-0.5 rounded border border-indigo-100 font-mono">
                              <Clock className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                              <span>Edited: {ncr.lastEditedAt}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3.5 align-top text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedNcrForEdit(ncr)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                          title="Edit Non-Conformance Report & CAPA"
                        >
                          <FileEdit className="w-3.5 h-3.5 text-sky-600" />
                          <span>Edit NCR</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredNcrs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        No non-conformance records match your filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Audits View */
          <div className="p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">AS9100D & ISO 9001 Audits & Management Reviews</h3>
                <p className="text-xs text-slate-500">
                  Track surveillance cycles, governing standard clauses, last completed dates, and generate archived PDF reports.
                </p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 min-w-[760px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5">Audit / Review Event</th>
                    <th className="py-3 px-3.5">Governing Standard</th>
                    <th className="py-3 px-3.5">Cadence</th>
                    <th className="py-3 px-3.5">Last Completed</th>
                    <th className="py-3 px-3.5">Next Due Date</th>
                    <th className="py-3 px-3.5">Lead / Auditor</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {audits.map((aud) => (
                    <tr key={aud.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3.5 font-medium text-slate-900">
                        <div className="font-semibold text-slate-900">{aud.title}</div>
                        {aud.savedPdfPath && (
                          <div className="flex items-center gap-1 text-[10px] text-sky-700 font-mono mt-0.5 truncate max-w-xs" title={aud.savedPdfPath}>
                            <FolderTree className="w-3 h-3 text-sky-500 shrink-0" />
                            <span className="truncate">{aud.savedPdfPath.split('\\').pop() || 'PDF Saved'}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 font-mono text-[11px] text-sky-700">{aud.standard}</td>
                      <td className="py-3.5 px-3.5 text-slate-600">{aud.cadence}</td>
                      <td className="py-3.5 px-3.5 font-mono text-slate-600">{aud.lastCompleted}</td>
                      <td className="py-3.5 px-3.5 font-mono font-semibold text-slate-900">{aud.nextDueDate}</td>
                      <td className="py-3.5 px-3.5 text-slate-600">{aud.leadAuditor}</td>
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${
                            aud.status === 'Compliant'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : aud.status === 'Due Soon'
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-rose-100 text-rose-800 border-rose-200'
                          }`}
                        >
                          {aud.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedAuditForEdit(aud)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-md border border-sky-200 transition-colors cursor-pointer shadow-2xs"
                          title="Edit Audit Event & Generate PDF"
                        >
                          <FileEdit className="w-3.5 h-3.5 text-sky-600" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* New NCR Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Log New Non-Conformance (NCR)</h3>
                <p className="text-xs text-slate-300">AS9100D §8.7 & IPC Classification</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNcr} className="p-4 sm:p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">NCR Number</label>
                  <input
                    type="text"
                    value={newNcr.ncrNumber}
                    onChange={(e) => setNewNcr({ ...newNcr, ncrNumber: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Board Serial Number (S/N)
                  </label>
                  <input
                    type="text"
                    value={newNcr.serialNumber}
                    onChange={(e) => setNewNcr({ ...newNcr, serialNumber: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono placeholder:font-sans"
                    placeholder="e.g. SN-8840-0921"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Assembly Part # & Rev</label>
                <input
                  type="text"
                  value={newNcr.assemblyPartNumber}
                  onChange={(e) => setNewNcr({ ...newNcr, assemblyPartNumber: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded"
                  placeholder="e.g. PCA-8840-MCU (Rev D)"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Defect Description</label>
                <textarea
                  value={newNcr.defectDescription}
                  onChange={(e) => setNewNcr({ ...newNcr, defectDescription: e.target.value })}
                  rows={2}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded"
                  placeholder="Describe the failure, visual anomaly, or test out-of-spec condition..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Severity & Class</label>
                  <select
                    value={newNcr.severity}
                    onChange={(e) => setNewNcr({ ...newNcr, severity: e.target.value as SeverityLevel })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded"
                  >
                    <option value="Critical (Class 3)">Critical (Class 3)</option>
                    <option value="Major (Class 2)">Major (Class 2)</option>
                    <option value="Minor">Minor</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Root Cause Methodology</label>
                  <select
                    value={newNcr.rootCauseMethod}
                    onChange={(e) => setNewNcr({ ...newNcr, rootCauseMethod: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded"
                  >
                    <option value="5-Why">5-Why Analysis</option>
                    <option value="8D">8D Methodology</option>
                    <option value="Fishbone">Ishikawa / Fishbone</option>
                    <option value="Under Investigation">Under Investigation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Immediate Containment & Next Action</label>
                <input
                  type="text"
                  value={newNcr.nextAction}
                  onChange={(e) => setNewNcr({ ...newNcr, nextAction: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded"
                  placeholder="e.g. Quarantine bin SMT-04; microscope rework under IPC-7711."
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
                  Record NCR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Audit / Review Event Modal */}
      {selectedAuditForEdit && (
        <EditAuditModal
          isOpen={!!selectedAuditForEdit}
          audit={selectedAuditForEdit}
          onClose={() => setSelectedAuditForEdit(null)}
          onSave={(updated) => {
            onUpdateAudit?.(updated);
            setSelectedAuditForEdit(null);
          }}
        />
      )}
      {/* Edit Non-Conformance Report (NCR) Modal */}
      {selectedNcrForEdit && (
        <EditNcrModal
          isOpen={!!selectedNcrForEdit}
          ncr={selectedNcrForEdit}
          onClose={() => setSelectedNcrForEdit(null)}
          onSave={(updated) => {
            onUpdateNcr?.(updated);
            setSelectedNcrForEdit(null);
          }}
        />
      )}
    </div>
  );
};
