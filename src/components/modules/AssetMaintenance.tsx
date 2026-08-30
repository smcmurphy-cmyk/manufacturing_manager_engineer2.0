import React, { useState } from 'react';
import {
  Wrench,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Mail,
  Calendar,
  Zap,
  Activity,
  Download,
  Send,
  RefreshCw,
  SlidersHorizontal,
  FileText,
  FileEdit,
  ShieldCheck,
  Award,
  X,
  FileCheck,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Layers,
  ArrowUpRight,
  Printer
} from 'lucide-react';
import { AssetRecord, AssetStatus } from '../../types';
import { AssetCalibrationModal } from '../modals/AssetCalibrationModal';
import { EditAssetDocumentModal } from '../modals/EditAssetDocumentModal';

interface AssetMaintenanceProps {
  assets: AssetRecord[];
  onAddAsset: (asset: AssetRecord) => void;
  onUpdateAsset?: (asset: AssetRecord) => void;
  onRecalibrate: (id: string) => void;
  onOpenAlertModal: () => void;
}

export const AssetMaintenance: React.FC<AssetMaintenanceProps> = ({
  assets,
  onAddAsset,
  onUpdateAsset,
  onRecalibrate,
  onOpenAlertModal,
}) => {
  const [activeTab, setActiveTab] = useState<'registry' | 'audit_logs'>('registry');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAssetForCert, setSelectedAssetForCert] = useState<AssetRecord | null>(null);
  const [selectedAssetForEdit, setSelectedAssetForEdit] = useState<AssetRecord | null>(null);
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSaveAssetDocument = (updatedAsset: AssetRecord) => {
    if (onUpdateAsset) {
      onUpdateAsset(updatedAsset);
    }
    showToast(`Document for ${updatedAsset.assetId} updated successfully`);
  };

  const todayStr = '2026-08-30'; // reference app time

  const getCalculatedDueInfo = (lastCompletedStr: string, intervalDays: number, manualDueDate?: string) => {
    const today = new Date(todayStr);
    let dueDate: Date;

    if (manualDueDate) {
      dueDate = new Date(manualDueDate);
    } else {
      const last = new Date(lastCompletedStr);
      dueDate = new Date(last);
      dueDate.setDate(dueDate.getDate() + intervalDays);
    }

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));

    let status: AssetStatus = 'Operational / Calibrated';
    if (diffDays < 0) {
      status = 'Cal Overdue';
    } else if (diffDays <= 14) {
      status = 'Calibration Due Soon';
    }

    return {
      dueDateStr: dueDate.toISOString().split('T')[0],
      diffDays,
      status,
    };
  };

  const filteredAssets = assets.filter((asset) => {
    const info = getCalculatedDueInfo(asset.lastCompleted, asset.intervalDays, asset.nextDueDate);
    const matchesSearch =
      asset.assetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.equipmentDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.departmentLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.assignedOwner.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || info.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const operationalAssets = assets.filter((a) => getCalculatedDueInfo(a.lastCompleted, a.intervalDays, a.nextDueDate).diffDays > 14);
  const dueSoonAssets = assets.filter((a) => {
    const diff = getCalculatedDueInfo(a.lastCompleted, a.intervalDays, a.nextDueDate).diffDays;
    return diff >= 0 && diff <= 14;
  });
  const overdueAssets = assets.filter((a) => getCalculatedDueInfo(a.lastCompleted, a.intervalDays, a.nextDueDate).diffDays < 0);

  // New Asset Form State
  const [newAsset, setNewAsset] = useState({
    assetId: `EQ-MET-0${assets.length + 15}`,
    equipmentDescription: '',
    departmentLocation: 'Engineering Test Lab (Bench 1)',
    intervalDays: 365,
    lastCompleted: todayStr,
    assignedOwner: 'Steven McMurphy (Quality Metrology Lead)',
    alertEmail: 'Smcmurphy@gmail.com',
    serialNumber: `SN-${Math.floor(10000 + Math.random() * 90000)}`,
  });

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.equipmentDescription.trim()) return;

    const info = getCalculatedDueInfo(newAsset.lastCompleted, Number(newAsset.intervalDays));

    const asset: AssetRecord = {
      id: `asset-${Date.now()}`,
      assetId: newAsset.assetId,
      equipmentDescription: newAsset.equipmentDescription,
      departmentLocation: newAsset.departmentLocation,
      intervalDays: Number(newAsset.intervalDays),
      lastCompleted: newAsset.lastCompleted,
      nextDueDate: info.dueDateStr,
      status: info.status,
      assignedOwner: newAsset.assignedOwner,
      alertEmail: newAsset.alertEmail,
      serialNumber: newAsset.serialNumber,
    };

    onAddAsset(asset);
    setShowAddModal(false);
    showToast(`Asset ${asset.assetId} successfully registered`);

    setNewAsset({
      assetId: `EQ-MET-0${assets.length + 16}`,
      equipmentDescription: '',
      departmentLocation: 'Engineering Test Lab (Bench 1)',
      intervalDays: 365,
      lastCompleted: todayStr,
      assignedOwner: 'Steven McMurphy (Quality Metrology Lead)',
      alertEmail: 'Smcmurphy@gmail.com',
      serialNumber: `SN-${Math.floor(10000 + Math.random() * 90000)}`,
    });
  };

  const getStatusBadgeClass = (status: AssetStatus, diffDays: number) => {
    if (diffDays < 0 || status === 'Cal Overdue') {
      return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
    }
    if (diffDays <= 7) {
      return 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse font-semibold';
    }
    if (diffDays <= 14) {
      return 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
    }
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
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

      {/* Metrics Row (Interactive Filter Cards - Exactly like Module 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Tracked Assets */}
        <button
          id="card-filter-tracked-assets"
          type="button"
          onClick={() => {
            setActiveTab('registry');
            setStatusFilter('ALL');
            setSearchTerm('');
          }}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'registry' && statusFilter === 'ALL' && !searchTerm
              ? 'bg-slate-50 border-slate-400 ring-2 ring-slate-800 shadow-xs'
              : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Tracked Assets</span>
            <Activity className="w-4 h-4 text-sky-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{assets.length}</p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-slate-500">Metrology, Reflow & ESD</p>
            <span className="text-[10px] text-sky-700 font-medium">
              {activeTab === 'registry' && statusFilter === 'ALL' && !searchTerm ? 'Showing all' : 'Click to view all'}
            </span>
          </div>
        </button>

        {/* Card 2: Calibrated & Current */}
        <button
          id="card-filter-calibrated-current"
          type="button"
          onClick={() => {
            setActiveTab('registry');
            setStatusFilter((prev) => (prev === 'Operational / Calibrated' && activeTab === 'registry' ? 'ALL' : 'Operational / Calibrated'));
          }}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'registry' && statusFilter === 'Operational / Calibrated'
              ? 'bg-emerald-50/50 border-emerald-400 ring-2 ring-emerald-600 shadow-xs'
              : 'bg-white border-slate-200 shadow-2xs hover:border-emerald-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Calibrated & Current</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{operationalAssets.length}</p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-emerald-600 font-medium">Within safe tolerance</p>
            <span className="text-[10px] text-emerald-700 font-medium">
              {activeTab === 'registry' && statusFilter === 'Operational / Calibrated' ? 'Filtered active' : 'Click to filter'}
            </span>
          </div>
        </button>

        {/* Card 3: Due Soon (<14 Days) */}
        <button
          id="card-filter-due-soon"
          type="button"
          onClick={() => {
            setActiveTab('registry');
            setStatusFilter((prev) => (prev === 'Calibration Due Soon' && activeTab === 'registry' ? 'ALL' : 'Calibration Due Soon'));
          }}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'registry' && statusFilter === 'Calibration Due Soon'
              ? 'bg-amber-50/50 border-amber-400 ring-2 ring-amber-500 shadow-xs'
              : 'bg-white border-slate-200 shadow-2xs hover:border-amber-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Due Soon (&lt;14 Days)</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{dueSoonAssets.length}</p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-amber-600 font-medium">Outlook alerts primed</p>
            <span className="text-[10px] text-amber-700 font-medium">
              {activeTab === 'registry' && statusFilter === 'Calibration Due Soon' ? 'Filtered active' : 'Click to filter'}
            </span>
          </div>
        </button>

        {/* Card 4: Cal Overdue */}
        <button
          id="card-filter-cal-overdue"
          type="button"
          onClick={() => {
            setActiveTab('registry');
            setStatusFilter((prev) => (prev === 'Cal Overdue' && activeTab === 'registry' ? 'ALL' : 'Cal Overdue'));
          }}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'registry' && statusFilter === 'Cal Overdue'
              ? 'bg-rose-50/50 border-rose-400 ring-2 ring-rose-600 shadow-xs'
              : 'bg-white border-slate-200 shadow-2xs hover:border-rose-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Cal Overdue</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{overdueAssets.length}</p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-rose-600 font-medium">Quarantine lockout</p>
            <span className="text-[10px] text-rose-700 font-medium">
              {activeTab === 'registry' && statusFilter === 'Cal Overdue' ? 'Filtered active' : 'Click to filter'}
            </span>
          </div>
        </button>
      </div>

      {/* Action Banner for Outlook Engine */}
      <div className="p-4 bg-slate-900 text-white rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 border border-sky-400/30 shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold">Outlook Email & Calendar Automation Engine</h4>
            <p className="text-xs text-slate-300">
              Trigger automated email digests and generate Outlook Calendar (.ics) reminders for upcoming calibration due dates.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAlertModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-sky-400 hover:bg-sky-300 rounded-lg shadow-sm transition-colors self-start sm:self-auto shrink-0 cursor-pointer"
        >
          <Zap className="w-4 h-4" />
          Open Alert Engine
        </button>
      </div>

      {/* Tabs and Controls Container (Matching Module 1 structure) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Sub Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg self-start">
            <button
              id="tab-asset-registry"
              onClick={() => setActiveTab('registry')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'registry' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Asset Calibration Registry ({filteredAssets.length})
            </button>
            <button
              id="tab-audit-logs"
              onClick={() => setActiveTab('audit_logs')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'audit_logs' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              AS9100D NIST Metrology Verification Logs
            </button>
          </div>

          <button
            id="add-asset-btn"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Asset / Metrology Tool
          </button>
        </div>

        {activeTab === 'registry' ? (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Asset ID, Description, Location, Serial #, Owner..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Operational / Calibrated">Operational / Calibrated</option>
                  <option value="Calibration Due Soon">Calibration Due Soon</option>
                  <option value="Cal Overdue">Cal Overdue</option>
                </select>

                {(statusFilter !== 'ALL' || searchTerm) && (
                  <button
                    onClick={() => {
                      setStatusFilter('ALL');
                      setSearchTerm('');
                    }}
                    className="px-2.5 py-2 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </div>

            {/* Active Filter Pill Notice */}
            {statusFilter !== 'ALL' && (
              <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-800">Filtered view:</span>
                <span className="px-2 py-0.5 rounded bg-white font-medium border border-slate-300 text-slate-800">
                  {statusFilter}
                </span>
                <span className="text-slate-400 text-[11px]">({filteredAssets.length} assets found)</span>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5">Asset ID & Equipment</th>
                    <th className="py-3 px-3.5">Location & S/N</th>
                    <th className="py-3 px-3.5">Interval</th>
                    <th className="py-3 px-3.5">Last Calibrated</th>
                    <th className="py-3 px-3.5">Next Due Date</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssets.map((asset) => {
                    const info = getCalculatedDueInfo(asset.lastCompleted, asset.intervalDays, asset.nextDueDate);
                    const isExpanded = expandedAssetId === asset.id;

                    return (
                      <React.Fragment key={asset.id}>
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-3.5 align-top">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-900">
                                {asset.assetId}
                              </span>
                              <button
                                type="button"
                                onClick={() => setExpandedAssetId(isExpanded ? null : asset.id)}
                                className="text-[10px] text-slate-500 hover:text-sky-700 px-1 py-0.5 rounded hover:bg-slate-100 inline-flex items-center gap-0.5 cursor-pointer"
                                title="Expand details"
                              >
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            </div>
                            <p className="text-slate-800 text-xs font-medium mt-0.5 max-w-sm">
                              {asset.equipmentDescription}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" /> {asset.alertEmail} ({asset.assignedOwner})
                            </p>
                          </td>
                          <td className="py-3.5 px-3.5 align-top">
                            <span className="font-medium text-slate-800">{asset.departmentLocation}</span>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">SN: {asset.serialNumber}</div>
                          </td>
                          <td className="py-3.5 px-3.5 align-top whitespace-nowrap">
                            <span className="font-semibold text-slate-700">{asset.intervalDays} Days</span>
                          </td>
                          <td className="py-3.5 px-3.5 align-top font-mono text-slate-600 whitespace-nowrap">
                            {asset.lastCompleted}
                          </td>
                          <td className="py-3.5 px-3.5 align-top font-mono whitespace-nowrap">
                            <span className="font-bold text-slate-900">{info.dueDateStr}</span>
                            <div
                              className={`text-[10px] font-sans mt-0.5 font-semibold ${
                                info.diffDays < 0
                                  ? 'text-rose-600'
                                  : info.diffDays <= 14
                                  ? 'text-amber-600'
                                  : 'text-slate-500'
                              }`}
                            >
                              {info.diffDays < 0
                                ? `${Math.abs(info.diffDays)} days overdue`
                                : `${info.diffDays} days remaining`}
                            </div>
                          </td>
                          <td className="py-3.5 px-3.5 align-top whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] rounded-full border ${getStatusBadgeClass(
                                info.status,
                                info.diffDays
                              )}`}
                            >
                              {info.diffDays < 0 && <AlertTriangle className="w-3 h-3" />}
                              {info.diffDays >= 0 && info.diffDays <= 14 && <Clock className="w-3 h-3" />}
                              {info.diffDays > 14 && <CheckCircle2 className="w-3 h-3" />}
                              {info.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-3.5 align-top whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedAssetForCert(asset)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded shadow-2xs transition-colors cursor-pointer"
                                title="View & Print Official Calibration Certificate"
                              >
                                <FileText className="w-3 h-3 text-sky-600" />
                                <span>Certificate</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setSelectedAssetForEdit(asset)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:text-sky-800 hover:bg-sky-50 border border-sky-200 rounded transition-colors cursor-pointer"
                                title="Open & Edit Calibration Document Data"
                              >
                                <FileEdit className="w-3 h-3 text-sky-600" />
                                <span>Edit Document</span>
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Inline Expandable Details Row */}
                        {isExpanded && (
                          <tr className="bg-slate-50/70 border-b border-slate-200">
                            <td colSpan={7} className="p-3.5 text-xs space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-lg border border-slate-200">
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block">AS9100D Standard Scope</span>
                                  <span className="font-semibold text-slate-800">AS9100D §7.1.5 Metrology & Monitoring Resources</span>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block">NIST Traceability ID</span>
                                  <span className="font-mono text-sky-800">CAL-NIST-2026-{asset.assetId}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Metrology Custodian</span>
                                  <span className="text-slate-700">{asset.assignedOwner} ({asset.alertEmail})</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {filteredAssets.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        No assets found matching your filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Sub-tab 2: NIST Metrology Verification Logs View (Direct In-List Display) */
          <div className="p-4 sm:p-5 space-y-4">
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    AS9100D §7.1.5 NIST Traceable Metrology & Calibration Log Events
                  </h4>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  All Active Standards In Compliance
                </span>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {assets.map((asset) => {
                  const info = getCalculatedDueInfo(asset.lastCompleted, asset.intervalDays, asset.nextDueDate);
                  return (
                    <div key={asset.id} className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{asset.assetId}</span>
                          <span className="text-slate-500">—</span>
                          <span className="font-semibold text-slate-800">{asset.equipmentDescription}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusBadgeClass(info.status, info.diffDays)}`}>
                            {info.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>Location: <strong className="text-slate-700">{asset.departmentLocation}</strong></span>
                          <span>S/N: <strong className="font-mono text-slate-700">{asset.serialNumber}</strong></span>
                          <span>Interval: <strong className="text-slate-700">{asset.intervalDays} Days</strong></span>
                          <span>Last Cal: <strong className="font-mono text-slate-700">{asset.lastCompleted}</strong></span>
                          <span>Next Due: <strong className="font-mono text-slate-900">{info.dueDateStr}</strong></span>
                        </div>
                        <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 mt-1 font-mono">
                          NIST Master Traceability: Fluke 5522A / Keysight Reference | Cal Stamp: #MET-7740 (Steven McMurphy)
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedAssetForCert(asset)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded shadow-2xs transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-sky-600" />
                          <span>View Full Certificate</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedAssetForEdit(asset)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-sky-50 hover:bg-sky-100 border border-sky-300 rounded shadow-2xs transition-colors cursor-pointer"
                          title="Open and edit calibration document data"
                        >
                          <FileEdit className="w-3.5 h-3.5 text-sky-700" />
                          <span>Edit Document</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Register New Asset Form (Only shown when clicking "+ Add Asset")    */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-sky-400" />
                  <h3 className="text-sm font-semibold">Register New Asset & Metrology Specification</h3>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">AS9100D §7.1.5 Calibration & Preventative Maintenance Registry</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="p-4 sm:p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Asset ID (Tag Number)</label>
                  <input
                    type="text"
                    value={newAsset.assetId}
                    onChange={(e) => setNewAsset({ ...newAsset, assetId: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono focus:bg-white focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Serial Number (S/N)</label>
                  <input
                    type="text"
                    value={newAsset.serialNumber}
                    onChange={(e) => setNewAsset({ ...newAsset, serialNumber: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono focus:bg-white focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Equipment Model & Description</label>
                <input
                  type="text"
                  value={newAsset.equipmentDescription}
                  onChange={(e) => setNewAsset({ ...newAsset, equipmentDescription: e.target.value })}
                  placeholder="e.g. Keithley 2450 SourceMeter (SMU 200V, 1A)"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Department / Cell Location</label>
                  <input
                    type="text"
                    value={newAsset.departmentLocation}
                    onChange={(e) => setNewAsset({ ...newAsset, departmentLocation: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Calibration Interval</label>
                  <select
                    value={newAsset.intervalDays}
                    onChange={(e) => setNewAsset({ ...newAsset, intervalDays: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value={90}>90 Days (Quarterly / Thermal Profiler)</option>
                    <option value={180}>180 Days (Semi-Annual / ESD System)</option>
                    <option value={365}>365 Days (Annual / Metrology Tool)</option>
                    <option value={30}>30 Days (Monthly Solder Dross/PM)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Last Calibration Date</label>
                  <input
                    type="date"
                    value={newAsset.lastCompleted}
                    onChange={(e) => setNewAsset({ ...newAsset, lastCompleted: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono focus:bg-white focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Assigned Metrology Owner</label>
                  <input
                    type="text"
                    value={newAsset.assignedOwner}
                    onChange={(e) => setNewAsset({ ...newAsset, assignedOwner: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Alert Notification Email</label>
                <input
                  type="email"
                  value={newAsset.alertEmail}
                  onChange={(e) => setNewAsset({ ...newAsset, alertEmail: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono focus:bg-white focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded shadow-xs cursor-pointer"
                >
                  Save Asset Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OPTIONAL DOCUMENT MODAL: Calibration Certificate (Triggered via Cert btn) */}
      {/* ========================================================================= */}
      <AssetCalibrationModal
        isOpen={Boolean(selectedAssetForCert)}
        asset={selectedAssetForCert}
        onClose={() => setSelectedAssetForCert(null)}
        onRecalibrate={(id) => {
          onRecalibrate(id);
          showToast('Calibration verified & certificate updated to today');
        }}
        onOpenAlertModal={onOpenAlertModal}
        onEditDocument={(asset) => setSelectedAssetForEdit(asset)}
      />

      {/* ========================================================================= */}
      {/* DOCUMENT EDITOR MODAL: Edit Asset & Calibration Document Data             */}
      {/* ========================================================================= */}
      <EditAssetDocumentModal
        isOpen={Boolean(selectedAssetForEdit)}
        asset={selectedAssetForEdit}
        onClose={() => setSelectedAssetForEdit(null)}
        onSave={handleSaveAssetDocument}
        onOpenCertificate={(asset) => setSelectedAssetForCert(asset)}
      />
    </div>
  );
};
