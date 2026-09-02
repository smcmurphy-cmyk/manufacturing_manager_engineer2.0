import React from 'react';
import {
  Menu,
  Bell,
  FileText,
  Clock,
  Send,
  Calendar,
  Layers,
  Sparkles,
  Download,
  Database
} from 'lucide-react';
import { ActiveModule } from '../types';

interface HeaderProps {
  activeModule: ActiveModule;
  onToggleSidebar: () => void;
  onOpenAlertModal: () => void;
  onExportMarkdown: () => void;
  totalAlertCount: number;
  dbStatus?: { connected: boolean; mode: string };
}

export const Header: React.FC<HeaderProps> = ({
  activeModule,
  onToggleSidebar,
  onOpenAlertModal,
  onExportMarkdown,
  totalAlertCount,
  dbStatus,
}) => {
  const getModuleDetails = () => {
    switch (activeModule) {
      case 'compliance':
        return {
          title: 'Compliance & Non-Conformance Tracker',
          code: 'Module 01 • AS9100D §8.7 & ISO 9001:2015',
          description: 'Defect containment, 5-Why/8D root cause, IPC Class 2/3 classification & QMS audit schedules',
        };
      case 'training':
        return {
          title: 'Workforce Competency & Training Matrix',
          code: 'Module 02 • IPC-A-610, J-STD-001, IPC-7711/7721',
          description: 'Operator certifications, technician qualifications, CIT/CIS status & 24-month renewal timelines',
        };
      case 'data-ingestion':
        return {
          title: 'FAI validation & Logging',
          code: 'Module 03 • XY/ODB++, Stencils, SPI, PNP & AOI Files',
          description: 'Production release validation, DFM checks, Test & QA verification',
        };
      case 'asset-maintenance':
        return {
          title: 'Asset PM, Calibration & ESD Alert Engine',
          code: 'Module 04 • Metrology, Thermal Profiles & ANSI/ESD S20.20',
          description: 'Equipment calibration intervals, oven profiling schedules, Outlook alerts & calendar sync',
        };
      case 'quarterly-reporting':
        return {
          title: 'Executive Quarterly Operations & Compliance Dossier',
          code: 'Module 05 • Q3 FY2026 (Jul 1 – Sep 30) • AS9100D & ISO 9001',
          description: 'Aggregated documents from Modules 1–4 (Opened, Closed, Active, Completed) & ZIP archival engine',
        };
    }
  };

  const details = getModuleDetails();

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            id="mobile-sidebar-toggle"
            onClick={onToggleSidebar}
            className="p-2 -ml-2 text-slate-600 rounded-lg hover:bg-slate-100 lg:hidden"
            aria-label="Toggle Sidebar Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-700 font-mono">
                {details.code}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-tight">
              {details.title}
            </h2>
            <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
              {details.description}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {dbStatus && (
            <div
              id="persistence-status-indicator"
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md border ${
                dbStatus.connected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}
              title={`Active Persistence: ${dbStatus.mode}`}
            >
              <Database className="w-3.5 h-3.5 text-current" />
              <span className="font-semibold">
                {dbStatus.connected ? 'Postgres (Supabase)' : 'Host Disk (JSON)'}
              </span>
            </div>
          )}

          <button
            id="export-markdown-btn"
            onClick={onExportMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-md transition-colors"
            title="Export full modular markdown specification"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">Export Markdown</span>
          </button>

          <button
            id="alert-engine-btn"
            onClick={onOpenAlertModal}
            className="relative inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-md shadow-xs transition-colors"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Outlook & Cal Alerts</span>
            {totalAlertCount > 0 && (
              <span className="flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold bg-amber-400 text-slate-950 rounded-full">
                {totalAlertCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
