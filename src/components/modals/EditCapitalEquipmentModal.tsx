import React, { useState, useEffect } from 'react';
import { X, Save, Wrench, Calendar, Settings, User } from 'lucide-react';
import { CapitalEquipmentRecord } from '../../types';

interface EditCapitalEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: CapitalEquipmentRecord | null;
  onSave: (record: CapitalEquipmentRecord) => void;
}

export const EditCapitalEquipmentModal: React.FC<EditCapitalEquipmentModalProps> = ({
  isOpen, onClose, record, onSave
}) => {
  const [formData, setFormData] = useState<Partial<CapitalEquipmentRecord>>({});

  useEffect(() => {
    if (record) {
      setFormData(record);
    } else {
      setFormData({
        status: 'Operational',
        frequencyDays: 90,
      });
    }
  }, [record, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as CapitalEquipmentRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                {record ? 'Edit Equipment PM Record' : 'Add Capital Equipment'}
              </h3>
              <p className="text-xs text-slate-300">Log preventive maintenance and set alert intervals</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Manufacturer</label>
              <input
                type="text"
                value={formData.manufacturer || ''}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                placeholder="e.g., SAKI, Panasonic"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Model #</label>
              <input
                type="text"
                value={formData.modelNumber || ''}
                onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                placeholder="e.g., 3Di-LS2"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Serial #</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.serialNumber || ''}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  className="w-full p-2 pl-7 bg-slate-50 border border-slate-200 rounded font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
                  required
                />
                <Settings className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Facility Location</label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., SMT Line 1"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-600" /> Maintenance Schedule
            </span>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Original In-Service Date</label>
                <input
                  type="date"
                  value={formData.inServiceDate || ''}
                  onChange={(e) => setFormData({ ...formData, inServiceDate: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-200 rounded font-mono text-slate-900 focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Current Maint. Date</label>
                <input
                  type="date"
                  value={formData.currentMaintenanceDate || ''}
                  onChange={(e) => setFormData({ ...formData, currentMaintenanceDate: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-200 rounded font-mono text-slate-900 focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Next Maint. Date</label>
                <input
                  type="date"
                  value={formData.nextMaintenanceDate || ''}
                  onChange={(e) => setFormData({ ...formData, nextMaintenanceDate: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-200 rounded font-mono text-slate-900 focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
               <div>
                <label className="block font-medium text-slate-700 mb-1">Frequency (Days)</label>
                <input
                  type="number"
                  value={formData.frequencyDays || ''}
                  onChange={(e) => setFormData({ ...formData, frequencyDays: parseInt(e.target.value, 10) })}
                  className="w-full p-2 bg-white border border-slate-200 rounded font-mono font-bold text-slate-900 focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Equipment Status</label>
                <select
                  value={formData.status || 'Operational'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full p-2 bg-white border border-slate-200 rounded font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500 cursor-pointer"
                >
                  <option value="Operational">Operational</option>
                  <option value="Maintenance Required">Maintenance Required</option>
                  <option value="Out of Service">Out of Service</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Assigned Custodian</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.assignedCustodian || ''}
                  onChange={(e) => setFormData({ ...formData, assignedCustodian: e.target.value })}
                  className="w-full p-2 pl-7 bg-slate-50 border border-slate-200 rounded text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
                  required
                />
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Alert Email Notification</label>
              <input
                type="email"
                value={formData.alertEmail || ''}
                onChange={(e) => setFormData({ ...formData, alertEmail: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-slate-200 gap-2">
            <button type="button" onClick={onClose} className="px-3.5 py-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium cursor-pointer">
              Cancel
            </button>
            <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm cursor-pointer">
              <Save className="w-3.5 h-3.5" /> Save Equipment Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};