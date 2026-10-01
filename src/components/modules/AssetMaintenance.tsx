import React, { useState, useEffect } from 'react';
import {
  Wrench, Search, Plus, AlertTriangle, CheckCircle2, Clock, Mail, Calendar, 
  Zap, Activity, FileEdit, X, FileCheck, ChevronDown, ChevronUp, Layers, Settings
} from 'lucide-react';
import { AssetRecord, AssetStatus, CapitalEquipmentRecord } from '../../types';
import { EditAssetDocumentModal } from '../modals/EditAssetDocumentModal';
import { EditCapitalEquipmentModal } from '../modals/EditCapitalEquipmentModal';

interface AssetMaintenanceProps {
  assets: AssetRecord[]; // Kept for prop compatibility, but managed internally via DB now
  onAddAsset: (asset: AssetRecord) => void;
  onUpdateAsset?: (asset: AssetRecord) => void;
  onRecalibrate: (id: string) => void;
  onOpenAlertModal: () => void;
}

export const AssetMaintenance: React.FC<AssetMaintenanceProps> = ({
  onAddAsset,
  onUpdateAsset,
  onRecalibrate,
  onOpenAlertModal,
}) => {
  const [activeTab, setActiveTab] = useState<'registry' | 'audit_logs' | 'capital'>('registry');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Database States
  const [calibrationAssets, setCalibrationAssets] = useState<AssetRecord[]>([]);
  const [capitalAssets, setCapitalAssets] = useState<CapitalEquipmentRecord[]>([]);
  
  // Metrology Asset State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAssetForEdit, setSelectedAssetForEdit] = useState<AssetRecord | null>(null);
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  
  // Capital Equipment State
  const [isCapitalModalOpen, setIsCapitalModalOpen] = useState(false);
  const [selectedCapitalAsset, setSelectedCapitalAsset] = useState<CapitalEquipmentRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Fetch records from SQL on mount
  const loadRecords = async () => {
    try {
      const [eqRes, calRes] = await Promise.all([
        fetch('/api/equipment'),
        fetch('/api/calibration')
      ]);

      if (eqRes.ok) {
        const eqData = await eqRes.json();
        // Map SQL schema back to Frontend interface
        const mappedCapital = eqData.map((row: any) => ({
          id: row.AssetTag,
          manufacturer: row.EquipmentName,
          modelNumber: row.Model || '',
          serialNumber: row.SerialNumber || '',
          location: row.Location || '',
          frequencyDays: row.PmFrequency ? parseInt(row.PmFrequency) : 0,
          currentMaintenanceDate: row.LastPmDate ? row.LastPmDate.split('T')[0] : '',
          nextMaintenanceDate: row.NextPmDate ? row.NextPmDate.split('T')[0] : '',
          assignedCustodian: 'Shawn', // Defaulting for display
          alertEmail: 'shawn@dyneng.com',
          status: row.Status || 'Operational'
        }));
        setCapitalAssets(mappedCapital);
      }
      
      if (calRes.ok) {
        const calData = await calRes.json();
        // Map SQL schema back to Frontend interface
        const mappedCal = calData.map((row: any) => ({
          id: row.ToolId,
          assetId: row.ToolId,
          equipmentDescription: row.Description,
          serialNumber: row.SerialNumber || '',
          departmentLocation: row.Location || '',
          intervalDays: row.CalInterval ? parseInt(row.CalInterval) : 365,
          lastCompleted: row.LastCalDate ? row.LastCalDate.split('T')[0] : '',
          nextDueDate: row.CalDueDate ? row.CalDueDate.split('T')[0] : '',
          status: row.Status || 'Operational / Calibrated'
        }));
        setCalibrationAssets(mappedCal);
      }
    } catch (err) {
      console.error('Failed to load maintenance records from DB:', err);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  // 2. Database Save Handlers
const handleSaveCapitalAsset = async (record: CapitalEquipmentRecord) => {
    // Map the React record to the expected SQL database payload
    const dbPayload = {
      AssetTag: record.id || `CAP-${Math.floor(Math.random() * 10000)}`,
      EquipmentName: record.manufacturer || 'Unknown Equipment',
      Model: record.modelNumber || '',
      SerialNumber: record.serialNumber || '',
      Location: record.location || '',
      PmFrequency: record.frequencyDays?.toString() || '0',
      LastPmDate: record.currentMaintenanceDate || null,
      NextPmDate: record.nextMaintenanceDate || null,
      Status: record.status || 'Operational',
      Notes: ''
    };

    try {
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbPayload)
      });

      if (res.ok) {
        showToast(`${dbPayload.EquipmentName} updated successfully in database`);
        await loadRecords(); // Await the refresh so the UI updates instantly
        setIsCapitalModalOpen(false);
      } else {
        // Capture and display exact database rejection reasons
        const errData = await res.json();
        console.error('Server rejected payload:', errData);
        alert(`Failed to save: ${errData.error || 'Invalid data format'}`);
      }
    } catch (err) {
      console.error('Error saving capital equipment:', err);
      alert('Critical Error: Could not connect to the Express backend.');
    }
  };

  const saveCalibrationToDb = async (asset: AssetRecord) => {
    const dbPayload = {
      ToolId: asset.assetId,
      Description: asset.equipmentDescription,
      SerialNumber: asset.serialNumber,
      Location: asset.departmentLocation,
      CalInterval: asset.intervalDays?.toString(),
      LastCalDate: asset.lastCompleted,
      CalDueDate: asset.nextDueDate,
      Status: asset.status,
      Notes: ''
    };

    try {
      const res = await fetch('/api/calibration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbPayload)
      });

      if (res.ok) {
        showToast(`Asset ${asset.assetId} saved to registry`);
        loadRecords();
      }
    } catch (err) {
      console.error('Error saving calibration record:', err);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.equipmentDescription.trim()) return;
    const info = getCalculatedDueInfo(newAsset.lastCompleted, Number(newAsset.intervalDays));
    const asset: AssetRecord = {
      id: `asset-${Date.now()}`,
      ...newAsset,
      intervalDays: Number(newAsset.intervalDays),
      nextDueDate: info.dueDateStr,
      status: info.status,
    };
    
    await saveCalibrationToDb(asset);
    if (onAddAsset) onAddAsset(asset);
    setShowAddModal(false);
  };

  const handleSaveAssetDocument = async (updatedAsset: AssetRecord) => {
    await saveCalibrationToDb(updatedAsset);
    if (onUpdateAsset) onUpdateAsset(updatedAsset);
    setSelectedAssetForEdit(null);
  };

  const openCapitalModal = (asset: CapitalEquipmentRecord | null = null) => {
    setSelectedCapitalAsset(asset);
    setIsCapitalModalOpen(true);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const getCalculatedDueInfo = (lastCompletedStr: string, intervalDays: number, manualDueDate?: string, recordedStatus?: AssetStatus) => {
    if (Number(intervalDays) === 0 || recordedStatus === 'No Calibration Necessary') {
      return { dueDateStr: 'N/A', diffDays: 9999, status: 'Operational / Calibrated' as AssetStatus, isExempt: true };
    }
    const today = new Date(todayStr);
    let dueDate: Date;
    if (manualDueDate && manualDueDate.trim() !== '') {
      dueDate = new Date(manualDueDate);
    } else {
      dueDate = new Date(lastCompletedStr || todayStr);
      dueDate.setDate(dueDate.getDate() + (intervalDays || 365));
    }
    if (isNaN(dueDate.getTime())) {
      return { dueDateStr: 'N/A', diffDays: 9999, status: 'Operational / Calibrated' as AssetStatus, isExempt: true };
    }
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    let status: AssetStatus = 'Operational / Calibrated';
    if (diffDays < 0) status = 'Cal Overdue';
    else if (diffDays <= 14) status = 'Calibration Due Soon';
    return { dueDateStr: dueDate.toISOString().split('T')[0], diffDays, status, isExempt: false };
  };

  const filteredAssets = calibrationAssets.filter((asset) => {
    const info = getCalculatedDueInfo(asset.lastCompleted, asset.intervalDays, asset.nextDueDate, asset.status);
    const matchesSearch = asset.assetId.toLowerCase().includes(searchTerm.toLowerCase()) || asset.equipmentDescription.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || info.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const operationalAssets = calibrationAssets.filter(a => getCalculatedDueInfo(a.lastCompleted, a.intervalDays, a.nextDueDate, a.status).status === 'Operational / Calibrated');
  const dueSoonAssets = calibrationAssets.filter(a => getCalculatedDueInfo(a.lastCompleted, a.intervalDays, a.nextDueDate, a.status).status === 'Calibration Due Soon');
  const overdueAssets = calibrationAssets.filter(a => getCalculatedDueInfo(a.lastCompleted, a.intervalDays, a.nextDueDate, a.status).status === 'Cal Overdue');

  const [newAsset, setNewAsset] = useState({
    assetId: `EQ-MET-0${calibrationAssets.length + 15}`,
    equipmentDescription: '',
    departmentLocation: 'Engineering Test Lab (Bench 1)',
    intervalDays: 365,
    lastCompleted: todayStr,
    assignedOwner: 'Steven McMurphy',
    alertEmail: 'murphy@dyneng.com',
    serialNumber: `SN-${Math.floor(10000 + Math.random() * 90000)}`,
  });

  const getStatusBadgeClass = (status: string, diffDays?: number) => {
    if (status.includes('Operational')) return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold';
    if (status.includes('Overdue') || (diffDays !== undefined && diffDays < 0)) return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
    if (status.includes('Due Soon')) return 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
    return 'bg-slate-100 text-slate-700 border-slate-300';
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs rounded-lg shadow-lg border border-slate-700 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => { setActiveTab('registry'); setStatusFilter('ALL'); setSearchTerm(''); }} className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${activeTab === 'registry' && statusFilter === 'ALL' && !searchTerm ? 'bg-slate-50 border-slate-400 ring-2 ring-slate-800 shadow-xs' : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs'}`}>
          <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase text-slate-500">Tracked Assets</span><Activity className="w-4 h-4 text-sky-600" /></div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{calibrationAssets.length}</p>
          <div className="mt-1 flex items-center justify-between"><p className="text-xs text-slate-500">Metrology & Verification</p><span className="text-[10px] text-sky-700 font-medium">{activeTab === 'registry' && statusFilter === 'ALL' && !searchTerm ? 'Showing all' : 'Click to view all'}</span></div>
        </button>
        <button onClick={() => { setActiveTab('registry'); setStatusFilter(prev => prev === 'Operational / Calibrated' && activeTab === 'registry' ? 'ALL' : 'Operational / Calibrated'); }} className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${activeTab === 'registry' && statusFilter === 'Operational / Calibrated' ? 'bg-emerald-50/50 border-emerald-400 ring-2 ring-emerald-600 shadow-xs' : 'bg-white border-slate-200 shadow-2xs hover:border-emerald-300 hover:shadow-xs'}`}>
          <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase text-slate-500">Calibrated & Current</span><CheckCircle2 className="w-4 h-4 text-emerald-600" /></div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{operationalAssets.length}</p>
          <div className="mt-1 flex items-center justify-between"><p className="text-xs text-emerald-600 font-medium">Within safe tolerance</p></div>
        </button>
        <button onClick={() => { setActiveTab('registry'); setStatusFilter(prev => prev === 'Calibration Due Soon' && activeTab === 'registry' ? 'ALL' : 'Calibration Due Soon'); }} className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${activeTab === 'registry' && statusFilter === 'Calibration Due Soon' ? 'bg-amber-50/50 border-amber-400 ring-2 ring-amber-500 shadow-xs' : 'bg-white border-slate-200 shadow-2xs hover:border-amber-300 hover:shadow-xs'}`}>
          <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase text-slate-500">Due Soon (&lt;14 Days)</span><Clock className="w-4 h-4 text-amber-600" /></div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{dueSoonAssets.length}</p>
          <div className="mt-1 flex items-center justify-between"><p className="text-xs text-amber-600 font-medium">Outlook alerts primed</p></div>
        </button>
        <button onClick={() => { setActiveTab('registry'); setStatusFilter(prev => prev === 'Cal Overdue' && activeTab === 'registry' ? 'ALL' : 'Cal Overdue'); }} className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${activeTab === 'registry' && statusFilter === 'Cal Overdue' ? 'bg-rose-50/50 border-rose-400 ring-2 ring-rose-600 shadow-xs' : 'bg-white border-slate-200 shadow-2xs hover:border-rose-300 hover:shadow-xs'}`}>
          <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase text-slate-500">Cal Overdue</span><AlertTriangle className="w-4 h-4 text-rose-600" /></div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{overdueAssets.length}</p>
          <div className="mt-1 flex items-center justify-between"><p className="text-xs text-rose-600 font-medium">Quarantine lockout</p></div>
        </button>
      </div>

      <div className="p-4 bg-slate-900 text-white rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 border border-sky-400/30 shrink-0"><Mail className="w-5 h-5" /></div>
          <div><h4 className="text-sm font-bold">Outlook Email & Calendar Automation Engine</h4><p className="text-xs text-slate-300">Trigger automated email digests and generate Outlook Calendar (.ics) reminders.</p></div>
        </div>
        <button onClick={onOpenAlertModal} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-sky-400 hover:bg-sky-300 rounded-lg shadow-sm transition-colors self-start sm:self-auto shrink-0 cursor-pointer"><Zap className="w-4 h-4" />Open Alert Engine</button>
      </div>

      {/* Tabs and Controls Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          
          <div className="flex flex-wrap items-center p-1 bg-slate-100 rounded-lg self-start">
            <button onClick={() => setActiveTab('registry')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${activeTab === 'registry' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}>
              Asset Calibration Registry ({filteredAssets.length})
            </button>
            <button onClick={() => setActiveTab('audit_logs')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${activeTab === 'audit_logs' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}>
              AS9100D NIST Metrology Verification Logs
            </button>
            <button onClick={() => setActiveTab('capital')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${activeTab === 'capital' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}>
              Capital Equipment PM Log
            </button>
          </div>

          <button onClick={() => activeTab === 'capital' ? openCapitalModal() : setShowAddModal(true)} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors self-start xl:self-auto cursor-pointer">
            <Plus className="w-4 h-4" />
            {activeTab === 'capital' ? 'Add Capital Equipment' : 'Add Asset / Metrology Tool'}
          </button>
        </div>

        {activeTab === 'capital' ? (
          <div className="p-4 sm:p-5 space-y-4">
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5">Equipment & Model</th>
                    <th className="py-3 px-3.5">Location & S/N</th>
                    <th className="py-3 px-3.5">Interval</th>
                    <th className="py-3 px-3.5">Maint. Dates</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {capitalAssets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3.5 align-top">
                        <span className="font-bold text-slate-900 block">{asset.manufacturer} {asset.modelNumber}</span>
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> {asset.alertEmail} ({asset.assignedCustodian})</p>
                      </td>
                      <td className="py-3.5 px-3.5 align-top">
                        <span className="font-medium text-slate-800 block">{asset.location}</span>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">SN: {asset.serialNumber}</div>
                      </td>
                      <td className="py-3.5 px-3.5 align-top whitespace-nowrap"><span className="font-semibold text-slate-700">{asset.frequencyDays} Days</span></td>
                      <td className="py-3.5 px-3.5 align-top font-mono text-slate-600 whitespace-nowrap">
                        <div>Last: {asset.currentMaintenanceDate}</div>
                        <div className="font-bold text-slate-900 mt-1">Due: {asset.nextMaintenanceDate}</div>
                      </td>
                      <td className="py-3.5 px-3.5 align-top whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-0.5 text-[11px] rounded-full border ${getStatusBadgeClass(asset.status)}`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3.5 align-top whitespace-nowrap">
                        <button onClick={() => openCapitalModal(asset)} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-50 border border-sky-200 rounded cursor-pointer"><FileEdit className="w-3 h-3" />Edit PM Log</button>
                      </td>
                    </tr>
                  ))}
                  {capitalAssets.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-400">No capital equipment registered yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'registry' ? (
          <div className="p-4 sm:p-5 space-y-4">
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
                    const info = getCalculatedDueInfo(asset.lastCompleted, asset.intervalDays, asset.nextDueDate, asset.status);
                    const isExpanded = expandedAssetId === asset.id;
                    return (
                      <React.Fragment key={asset.id}>
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-3.5 align-top">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-900">{asset.assetId}</span>
                              <button onClick={() => setExpandedAssetId(isExpanded ? null : asset.id)} className="text-[10px] text-slate-500 hover:bg-slate-100 px-1 py-0.5 rounded cursor-pointer">{isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}</button>
                            </div>
                            <p className="text-slate-800 font-medium mt-0.5">{asset.equipmentDescription}</p>
                          </td>
                          <td className="py-3.5 px-3.5 align-top"><span className="font-medium text-slate-800">{asset.departmentLocation}</span><div className="text-[10px] font-mono text-slate-400 mt-0.5">SN: {asset.serialNumber}</div></td>
                          <td className="py-3.5 px-3.5 align-top"><span className="font-semibold text-slate-700">{Number(asset.intervalDays) === 0 ? 'No Cal Needed' : `${asset.intervalDays} Days`}</span></td>
                          <td className="py-3.5 px-3.5 align-top font-mono text-slate-600">{asset.lastCompleted}</td>
                          <td className="py-3.5 px-3.5 align-top font-mono"><span className="font-bold text-slate-900">{info.dueDateStr}</span></td>
                          <td className="py-3.5 px-3.5 align-top"><span className={`inline-flex px-2.5 py-0.5 text-[11px] rounded-full border ${getStatusBadgeClass(info.status, info.diffDays)}`}>{info.status}</span></td>
                          <td className="py-3.5 px-3.5 align-top"><button onClick={() => setSelectedAssetForEdit(asset)} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-50 border border-sky-200 rounded cursor-pointer"><FileEdit className="w-3 h-3" />Edit</button></td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                  {filteredAssets.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-slate-400">No active assets found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 space-y-4">
             <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="p-3.5 bg-slate-50 border-b flex items-center gap-2"><FileCheck className="w-4 h-4 text-emerald-600" /><h4 className="font-bold text-slate-700">Metrology Verification Logs</h4></div>
              <div className="p-8 text-center text-slate-500">Log visualization would render here...</div>
            </div>
          </div>
        )}
      </div>

     {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Register Metrology Tool</h3>
                <p className="text-xs text-slate-300">Add a new gage or tool to the AS9100 calibration registry</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="p-4 sm:p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tool ID / Asset Tag</label>
                  <input
                    type="text"
                    value={newAsset.assetId}
                    onChange={(e) => setNewAsset({ ...newAsset, assetId: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono focus:ring-2 focus:ring-sky-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Equipment Description</label>
                  <input
                    type="text"
                    value={newAsset.equipmentDescription}
                    onChange={(e) => setNewAsset({ ...newAsset, equipmentDescription: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded focus:ring-2 focus:ring-sky-500 outline-none"
                    placeholder="e.g. 0-6 inch Digital Calipers"
                    required
                  />
                </div>
                
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Serial Number</label>
                  <input
                    type="text"
                    value={newAsset.serialNumber}
                    onChange={(e) => setNewAsset({ ...newAsset, serialNumber: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded font-mono focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Department / Location</label>
                  <input
                    type="text"
                    value={newAsset.departmentLocation}
                    onChange={(e) => setNewAsset({ ...newAsset, departmentLocation: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Calibration Interval (Days)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={newAsset.intervalDays}
                      onChange={(e) => setNewAsset({ ...newAsset, intervalDays: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 bg-white border border-slate-200 rounded font-mono focus:ring-2 focus:ring-sky-500 outline-none"
                      required
                    />
                    <span className="text-slate-500 font-medium">Days</span>
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Last Calibrated Date</label>
                  <input
                    type="date"
                    value={newAsset.lastCompleted}
                    onChange={(e) => setNewAsset({ ...newAsset, lastCompleted: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded font-mono focus:ring-2 focus:ring-sky-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  Save to Registry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <EditAssetDocumentModal isOpen={Boolean(selectedAssetForEdit)} asset={selectedAssetForEdit} onClose={() => setSelectedAssetForEdit(null)} onSave={handleSaveAssetDocument} />
      <EditCapitalEquipmentModal isOpen={isCapitalModalOpen} record={selectedCapitalAsset} onClose={() => setIsCapitalModalOpen(false)} onSave={handleSaveCapitalAsset} />
    </div>
  );
};