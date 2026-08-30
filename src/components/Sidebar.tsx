import React from 'react';
import {
  ShieldAlert,
  GraduationCap,
  Cpu,
  Wrench,
  ChevronRight,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Menu,
  X,
  Factory,
  FileSpreadsheet,
  Archive
} from 'lucide-react';
import { ActiveModule } from '../types';

interface SidebarProps {
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
  ncrCount: number;
  expiringCertsCount: number;
  activeJobsCount: number;
  calAlertsCount: number;
  quarterlyDocsCount?: number;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  ncrCount,
  expiringCertsCount,
  activeJobsCount,
  calAlertsCount,
  quarterlyDocsCount,
  isOpen,
  onToggleOpen,
}) => {
  const navItems = [
    {
      id: 'compliance' as ActiveModule,
      name: 'Compliance Tracker',
      subtitle: 'AS9100D • NCR & CAPA',
      icon: ShieldAlert,
      badge: ncrCount > 0 ? `${ncrCount} Active` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    {
      id: 'training' as ActiveModule,
      name: 'Training Tracker',
      subtitle: 'IPC-A-610 • J-STD-001',
      icon: GraduationCap,
      badge: expiringCertsCount > 0 ? `${expiringCertsCount} Expiring` : undefined,
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    },
    {
      id: 'data-ingestion' as ActiveModule,
      name: 'FAI Validation & Logging',
      subtitle: 'DFM • Test & QA Verification',
      icon: Cpu,
      badge: `${activeJobsCount} Jobs`,
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    },
    {
      id: 'asset-maintenance' as ActiveModule,
      name: 'Asset Maintenance',
      subtitle: 'PM • Calibrations • ESD Alerts',
      icon: Wrench,
      badge: calAlertsCount > 0 ? `${calAlertsCount} Due` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    {
      id: 'quarterly-reporting' as ActiveModule,
      name: 'Quarterly Reporting',
      subtitle: 'Q3 (Jul 1 - Sep 30) • ZIP Archive',
      icon: FileSpreadsheet,
      badge: quarterlyDocsCount !== undefined ? `${quarterlyDocsCount} Docs` : 'Q3 Active',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          id="mobile-sidebar-backdrop"
          onClick={onToggleOpen}
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col w-72 bg-slate-900 text-slate-100 border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Company Header */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-sky-600/20 text-sky-400 border border-sky-500/30">
                <Factory className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-semibold tracking-tight text-white">Dynamic Engineering</h1>
                <p className="text-xs text-slate-400">Embedded Systems Mfg</p>
              </div>
            </div>
            <button
              id="sidebar-close-btn"
              onClick={onToggleOpen}
              className="p-1 text-slate-400 rounded hover:text-white hover:bg-slate-800 lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 p-2.5 rounded-md bg-slate-800/80 border border-slate-700/60">
            <p className="text-[10px] font-medium tracking-wide uppercase text-sky-400">Role Governance</p>
            <p className="text-xs font-medium text-slate-200 mt-0.5">Mfg Manager / Sr Embedded Mfg Engineer</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Reporting: Executive Management / Owners</p>
          </div>
        </div>

        {/* Navigation Modules */}
        <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Manufacturing Modules
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => {
                  onSelectModule(item.id);
                  if (window.innerWidth < 1024) onToggleOpen();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all duration-150 ${
                  isActive
                    ? 'bg-sky-600 text-white font-medium shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/90 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <div className="truncate">
                    <p className="text-xs font-semibold leading-tight truncate">{item.name}</p>
                    <p className={`text-[10px] truncate ${isActive ? 'text-sky-100' : 'text-slate-400'}`}>
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {item.badge && (
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                        isActive
                          ? 'bg-white/20 text-white border-white/30'
                          : item.badgeColor
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight
                    className={`w-4 h-4 transition-transform ${
                      isActive ? 'text-white rotate-90 lg:rotate-0' : 'text-slate-500'
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Standards & QMS Badges */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Governing Standards
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">
              AS9100D
            </span>
            <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">
              ISO 9001
            </span>
            <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/50">
              IPC Class 3
            </span>
            <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/50">
              ANSI/ESD S20.20
            </span>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
            <HardDrive className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate font-mono text-[10px]">Storage: \\NAS\Data\</span>
          </div>
        </div>
      </aside>
    </>
  );
};
