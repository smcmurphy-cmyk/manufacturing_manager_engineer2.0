import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Archive,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Search,
  Filter,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
  Building,
  UserCheck,
  FolderArchive,
  RefreshCw,
  Printer,
  Sparkles,
  ExternalLink,
  Package,
  HardDrive
} from 'lucide-react';
import {
  AssetRecord,
  ComplianceAudit,
  DocumentLifecycleStatus,
  EngineeringJob,
  NCRRecord,
  QuarterId,
  QuarterPeriod,
  QuarterlyDocumentItem,
  TrainingRecord,
} from '../../types';
import { QUARTER_PERIODS, HISTORICAL_QUARTER_DOCUMENTS } from '../../data/quarterlyArchiveData';
import { getQuarterDocuments, getQuarterPeriodById } from '../../utils/quarterlyData';
import { downloadBlob, generateQuarterlyArchiveZip } from '../../utils/zipExporter';

interface QuarterlyReportingProps {
  ncrs: NCRRecord[];
  audits: ComplianceAudit[];
  training: TrainingRecord[];
  jobs: EngineeringJob[];
  assets: AssetRecord[];
  onNavigateModule?: (moduleKey: string) => void;
}

export const QuarterlyReporting: React.FC<QuarterlyReportingProps> = ({
  ncrs,
  audits,
  training,
  jobs,
  assets,
  onNavigateModule,
}) => {
  const [selectedQuarterId, setSelectedQuarterId] = useState<QuarterId>('2026-Q3');
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('ALL');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<QuarterlyDocumentItem | null>(null);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [zipToastMessage, setZipToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setZipToastMessage(msg);
    setTimeout(() => setZipToastMessage(null), 4000);
  };

  const selectedQuarter = useMemo(() => {
    return getQuarterPeriodById(selectedQuarterId);
  }, [selectedQuarterId]);

  // Compute all documents for the selected quarter
  const allQuarterDocuments = useMemo(() => {
    return getQuarterDocuments(selectedQuarterId, ncrs, audits, training, jobs, assets);
  }, [selectedQuarterId, ncrs, audits, training, jobs, assets]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return allQuarterDocuments.filter((doc) => {
      // Status tab filter
      if (selectedStatusTab !== 'ALL' && doc.lifecycleStatus !== selectedStatusTab) {
        return false;
      }
      // Module filter
      if (selectedModuleFilter !== 'ALL' && doc.moduleKey !== selectedModuleFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchNumber = doc.documentNumber.toLowerCase().includes(query);
        const matchTitle = doc.title.toLowerCase().includes(query);
        const matchOwner = doc.ownerOrLead.toLowerCase().includes(query);
        const matchClause = doc.standardClause.toLowerCase().includes(query);
        const matchDept = doc.departmentOrLocation.toLowerCase().includes(query);
        return matchNumber || matchTitle || matchOwner || matchClause || matchDept;
      }
      return true;
    });
  }, [allQuarterDocuments, selectedStatusTab, selectedModuleFilter, searchQuery]);

  // KPI Metrics
  const totalCount = allQuarterDocuments.length;
  const openedCount = allQuarterDocuments.filter((d) => d.lifecycleStatus === 'Opened in Quarter').length;
  const closedCount = allQuarterDocuments.filter((d) => d.lifecycleStatus === 'Closed / Completed').length;
  const activeCount = allQuarterDocuments.filter((d) => d.lifecycleStatus === 'Still Active / In-Flight').length;
  const overdueCount = allQuarterDocuments.filter((d) => d.lifecycleStatus === 'Action Required / Overdue').length;

  const completionRate = totalCount > 0 ? Math.round((closedCount / totalCount) * 100) : 0;

  // Module counts
  const complianceCount = allQuarterDocuments.filter((d) => d.moduleKey === 'compliance').length;
  const trainingCount = allQuarterDocuments.filter((d) => d.moduleKey === 'training').length;
  const jobsCount = allQuarterDocuments.filter((d) => d.moduleKey === 'data-ingestion').length;
  const assetsCount = allQuarterDocuments.filter((d) => d.moduleKey === 'asset-maintenance').length;

  // Export current selected quarter as ZIP
  const handleExportSelectedQuarterZip = async () => {
    try {
      setIsExportingZip(true);
      const blob = await generateQuarterlyArchiveZip({
        quarter: selectedQuarter,
        documents: allQuarterDocuments,
      });
      const filename = `Dynamic_Engineering_${selectedQuarter.financialQuarter.replace(/\s+/g, '_')}_Operations_Archive.zip`;
      downloadBlob(blob, filename);
      showToast(`Successfully generated & downloaded ${filename}`);
    } catch (err) {
      console.error('Failed to generate ZIP archive', err);
      showToast('Error creating ZIP archive file.');
    } finally {
      setIsExportingZip(false);
    }
  };

  // Export specific historical quarter
  const handleExportHistoricalQuarterZip = async (quarterId: QuarterId) => {
    try {
      setIsExportingZip(true);
      const targetQuarter = getQuarterPeriodById(quarterId);
      const docs = getQuarterDocuments(quarterId, ncrs, audits, training, jobs, assets);
      const blob = await generateQuarterlyArchiveZip({
        quarter: targetQuarter,
        documents: docs,
      });
      const filename = `Dynamic_Engineering_${targetQuarter.financialQuarter.replace(/\s+/g, '_')}_Archive.zip`;
      downloadBlob(blob, filename);
      showToast(`Downloaded historical archive: ${filename}`);
    } catch (err) {
      console.error('Failed to export historical zip', err);
      showToast('Error exporting historical quarter archive.');
    } finally {
      setIsExportingZip(false);
    }
  };

  // Export master multi-quarter zip package
  const handleExportMasterAllQuartersZip = async () => {
    try {
      setIsExportingZip(true);
      const masterDocs: QuarterlyDocumentItem[] = [];
      QUARTER_PERIODS.forEach((q) => {
        const docs = getQuarterDocuments(q.id, ncrs, audits, training, jobs, assets);
        masterDocs.push(...docs);
      });

      const blob = await generateQuarterlyArchiveZip({
        quarter: {
          id: '2026-Q3',
          label: 'Comprehensive Multi-Quarter Master Vault (Q4 2025 - Q3 2026)',
          financialQuarter: 'FY2025-FY2026 Multi-Quarter Vault',
          startDate: '2025-10-01',
          endDate: '2026-09-30',
          isCurrent: false,
        },
        documents: masterDocs,
      });
      const filename = 'Dynamic_Engineering_All_Quarters_Master_Archive.zip';
      downloadBlob(blob, filename);
      showToast(`Master archive downloaded (${masterDocs.length} total documents packaged in ZIP)`);
    } catch (err) {
      console.error('Failed to export master zip', err);
      showToast('Error creating master archive.');
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      
      {/* Toast Notification */}
      {zipToastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl border border-sky-500/40 flex items-center gap-3 animate-fade-in text-xs font-medium">
          <Archive className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{zipToastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: HEADER & FINANCIAL QUARTER SELECTOR BANNER                     */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 bg-white rounded-xl shadow-xs border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-300">
                MODULE 05 • AS9100D §9.3 & ISO 9001
              </span>
              {selectedQuarter.isCurrent ? (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Financial Quarter
                </span>
              ) : (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                  Archived Historical Quarter
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-slate-900 mt-1.5">
              Quarterly Operations & Document Quality Dossier
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Consolidated registry of all opened, closed, active, and completed documents across Modules 1–4.
              Current reporting window: <strong className="text-slate-700 font-medium">July 1, 2026 – September 30, 2026 (Q3)</strong>.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleExportSelectedQuarterZip}
              disabled={isExportingZip}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 active:scale-98 rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Generate and download ZIP archive of all documents in the selected quarter"
            >
              <Archive className="w-4 h-4 text-sky-200" />
              <span>{isExportingZip ? 'Packaging ZIP...' : `Archive ${selectedQuarter.financialQuarter} (.zip)`}</span>
            </button>

            <button
              type="button"
              onClick={handleExportMasterAllQuartersZip}
              disabled={isExportingZip}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors cursor-pointer disabled:opacity-50"
              title="Download full multi-quarter archive containing all quarters data in a zip"
            >
              <FolderArchive className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Master All-Quarters Vault (.zip)</span>
            </button>
          </div>
        </div>

        {/* Financial Quarter Tab Switcher */}
        <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-slate-500 mr-1 shrink-0 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Quarter:</span>
            </span>

            {QUARTER_PERIODS.map((q) => {
              const isSelected = selectedQuarterId === q.id;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setSelectedQuarterId(q.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  <span className="font-semibold">{q.financialQuarter}</span>
                  <span className={`text-[10px] ml-1.5 ${isSelected ? 'text-sky-300' : 'text-slate-500'}`}>
                    ({q.startDate.slice(5)} to {q.endDate.slice(5)})
                  </span>
                  {q.isCurrent && (
                    <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-emerald-400" title="Current Active Quarter" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Range: <strong>{selectedQuarter.startDate}</strong> through <strong>{selectedQuarter.endDate}</strong></span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: QUARTERLY KPIS & METRIC CARDS                                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Total Documents */}
        <div className="p-4 bg-white rounded-xl shadow-xs border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Total Quarter Documents</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalCount}</span>
            <span className="text-[11px] text-slate-500">records</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Across Modules 1, 2, 3, & 4</p>
        </div>

        {/* Opened in Quarter */}
        <div className="p-4 bg-white rounded-xl shadow-xs border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Opened in Quarter</span>
            <Sparkles className="w-4 h-4 text-sky-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-sky-700">{openedCount}</span>
            <span className="text-[11px] font-medium text-sky-600">New Items</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Initiated between Jul 1 - Sep 30</p>
        </div>

        {/* Closed / Completed */}
        <div className="p-4 bg-white rounded-xl shadow-xs border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Closed / Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">{closedCount}</span>
            <span className="text-[11px] font-semibold text-emerald-600">({completionRate}%)</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Resolved, certified & released</p>
        </div>

        {/* Still Active / In-Flight */}
        <div className="p-4 bg-white rounded-xl shadow-xs border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Still Active / In-Flight</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-700">{activeCount}</span>
            <span className="text-[11px] text-blue-600">In Progress</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Under ongoing execution</p>
        </div>

        {/* Action Required / Overdue */}
        <div className="p-4 bg-white rounded-xl shadow-xs border border-slate-200 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Action Required / Overdue</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">{overdueCount}</span>
            <span className="text-[11px] font-medium text-amber-600">Pending Gate</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Escalated for immediate review</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: MODULE DISTRIBUTION & PROGRESS BREAKDOWN                       */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 bg-white rounded-xl shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Module Contribution Breakdown ({selectedQuarter.financialQuarter})
            </h3>
            <p className="text-[11px] text-slate-500">
              Distribution of documents originating across the four functional operational modules
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-700">
            Total Dossier Volume: <span className="font-mono text-sky-700">{totalCount} Documents</span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
          <div
            style={{ width: `${(complianceCount / (totalCount || 1)) * 100}%` }}
            className="bg-amber-500 transition-all duration-300"
            title={`Module 1 (Compliance): ${complianceCount} docs`}
          />
          <div
            style={{ width: `${(trainingCount / (totalCount || 1)) * 100}%` }}
            className="bg-indigo-500 transition-all duration-300"
            title={`Module 2 (Training): ${trainingCount} docs`}
          />
          <div
            style={{ width: `${(jobsCount / (totalCount || 1)) * 100}%` }}
            className="bg-sky-500 transition-all duration-300"
            title={`Module 3 (FAI Jobs): ${jobsCount} docs`}
          />
          <div
            style={{ width: `${(assetsCount / (totalCount || 1)) * 100}%` }}
            className="bg-emerald-500 transition-all duration-300"
            title={`Module 4 (Assets): ${assetsCount} docs`}
          />
        </div>

        {/* Module Legend Buttons */}
        <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setSelectedModuleFilter(selectedModuleFilter === 'compliance' ? 'ALL' : 'compliance')}
            className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
              selectedModuleFilter === 'compliance'
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/40'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-1.5 text-amber-800 font-semibold">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
              <span>Mod 1: Compliance</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{complianceCount} NCRs & Audits</p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedModuleFilter(selectedModuleFilter === 'training' ? 'ALL' : 'training')}
            className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
              selectedModuleFilter === 'training'
                ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-400/40'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-1.5 text-indigo-800 font-semibold">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
              <span>Mod 2: Training</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{trainingCount} Certifications</p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedModuleFilter(selectedModuleFilter === 'data-ingestion' ? 'ALL' : 'data-ingestion')}
            className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
              selectedModuleFilter === 'data-ingestion'
                ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-400/40'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-1.5 text-sky-800 font-semibold">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" />
              <span>Mod 3: FAI Jobs</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{jobsCount} Production Gates</p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedModuleFilter(selectedModuleFilter === 'asset-maintenance' ? 'ALL' : 'asset-maintenance')}
            className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
              selectedModuleFilter === 'asset-maintenance'
                ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/40'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span>Mod 4: Assets</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{assetsCount} Metrology Tools</p>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4: UNIFIED QUARTERLY DOCUMENT REGISTER & FILTER TABS              */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        
        {/* Filter Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3">
          
          {/* Status Tabs */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSelectedStatusTab('ALL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  selectedStatusTab === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Documents ({totalCount})
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatusTab('Opened in Quarter')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  selectedStatusTab === 'Opened in Quarter'
                    ? 'bg-sky-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Opened in Quarter ({openedCount})
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatusTab('Closed / Completed')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  selectedStatusTab === 'Closed / Completed'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Closed / Completed ({closedCount})
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatusTab('Still Active / In-Flight')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  selectedStatusTab === 'Still Active / In-Flight'
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Still Active ({activeCount})
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatusTab('Action Required / Overdue')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  selectedStatusTab === 'Action Required / Overdue'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Action Required ({overdueCount})
              </button>
            </div>

            {/* Selected Module Filter Badge */}
            {selectedModuleFilter !== 'ALL' && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Filtered by:</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                  {selectedModuleFilter}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedModuleFilter('ALL')}
                  className="text-xs text-rose-600 hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Search Input Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search quarterly documents by Document ID, Title, Standard Clause, Owner, or Workcell..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Documents Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Document ID & Standard</th>
                <th className="py-3 px-4">Document Title & Summary</th>
                <th className="py-3 px-4">Quarter Lifecycle</th>
                <th className="py-3 px-4">Timeline (Open / Resolved)</th>
                <th className="py-3 px-4">Responsible Lead</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-sm text-slate-600">No matching documents found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting the status tabs, module filter chips, or search keyword.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => {
                  const getModuleBadgeColor = () => {
                    switch (doc.moduleKey) {
                      case 'compliance':
                        return 'bg-amber-100 text-amber-900 border-amber-300';
                      case 'training':
                        return 'bg-indigo-100 text-indigo-900 border-indigo-300';
                      case 'data-ingestion':
                        return 'bg-sky-100 text-sky-900 border-sky-300';
                      case 'asset-maintenance':
                        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
                    }
                  };

                  const getLifecycleBadge = () => {
                    switch (doc.lifecycleStatus) {
                      case 'Opened in Quarter':
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-800 border border-sky-300">
                            <Sparkles className="w-3 h-3 text-sky-600" />
                            <span>Opened in Qtr</span>
                          </span>
                        );
                      case 'Closed / Completed':
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Closed / Done</span>
                          </span>
                        );
                      case 'Still Active / In-Flight':
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                            <Clock className="w-3 h-3 text-blue-600" />
                            <span>Still Active</span>
                          </span>
                        );
                      case 'Action Required / Overdue':
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Action Required</span>
                          </span>
                        );
                    }
                  };

                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50/90 transition-colors group cursor-pointer"
                      onClick={() => setSelectedDocForPreview(doc)}
                    >
                      {/* Document ID & Standard */}
                      <td className="py-3 px-4 align-top">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {doc.documentNumber}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${getModuleBadgeColor()}`}>
                            {doc.moduleSource.replace('Module ', 'M')}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium truncate max-w-[140px]" title={doc.standardClause}>
                            {doc.standardClause}
                          </span>
                        </div>
                      </td>

                      {/* Title & Summary */}
                      <td className="py-3 px-4 align-top max-w-sm">
                        <p className="font-semibold text-slate-800 leading-tight">
                          {doc.title}
                        </p>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                          {doc.details}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{doc.departmentOrLocation}</span>
                        </p>
                      </td>

                      {/* Lifecycle Status */}
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        {getLifecycleBadge()}
                        <div className="mt-1 text-[10px] text-slate-500">
                          Native: <strong className="text-slate-700">{doc.nativeStatus}</strong>
                        </div>
                      </td>

                      {/* Timeline */}
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <div className="text-[11px] font-mono text-slate-700">
                          Opened: {doc.dateOpened}
                        </div>
                        {doc.dateResolved ? (
                          <div className="text-[11px] font-mono text-emerald-700 mt-0.5">
                            Closed: {doc.dateResolved}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic mt-0.5">
                            In-Flight in Q3
                          </div>
                        )}
                      </td>

                      {/* Owner */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[130px]">{doc.ownerOrLead}</span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDocForPreview(doc);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded transition-colors cursor-pointer"
                        >
                          <FileText className="w-3 h-3 text-sky-600" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info bar */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Showing <strong>{filteredDocuments.length}</strong> of <strong>{totalCount}</strong> unified documents for{' '}
              <strong>{selectedQuarter.financialQuarter}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-slate-400">
              Storage: \\NAS\Data\QuarterlyReports\{selectedQuarter.id}\
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 5: HISTORICAL QUARTERS ARCHIVAL HUB                               */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 bg-white rounded-xl shadow-xs border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Previous Quarters Archival & Export Center
              </h3>
              <p className="text-xs text-slate-500">
                Download verified ZIP archives for historical financial quarters with audit manifests, CSV registers, and AS9100D dossiers.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportMasterAllQuartersZip}
            disabled={isExportingZip}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-lg transition-colors cursor-pointer"
          >
            <FolderArchive className="w-4 h-4" />
            <span>Download All Historical Quarters (.zip)</span>
          </button>
        </div>

        {/* Historical Quarter Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
          
          {/* Q2 2026 Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold font-mono text-slate-900">Q2 2026 Archive</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                100% Closed & Audited
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Financial Quarter: <strong>Apr 1, 2026 – Jun 30, 2026</strong>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Contains 9 validated records across SMT vacuum reflow NCRs, J-STD-001 Space training, FAI actuators, and oven profiles.
            </p>

            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelectedQuarterId('2026-Q2')}
                className="text-xs font-medium text-slate-700 hover:text-sky-700 cursor-pointer"
              >
                View in Register &rarr;
              </button>
              <button
                type="button"
                onClick={() => handleExportHistoricalQuarterZip('2026-Q2')}
                disabled={isExportingZip}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-md transition-colors cursor-pointer"
              >
                <Download className="w-3 h-3 text-emerald-400" />
                <span>Zip Archive</span>
              </button>
            </div>
          </div>

          {/* Q1 2026 Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold font-mono text-slate-900">Q1 2026 Archive</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                Surveillance Passed
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Financial Quarter: <strong>Jan 1, 2026 – Mar 31, 2026</strong>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Contains 4 records: Crystal oscillator wetting NCRs, AS9100D Material Traceability Audit, and CAN bus FAI release.
            </p>

            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelectedQuarterId('2026-Q1')}
                className="text-xs font-medium text-slate-700 hover:text-sky-700 cursor-pointer"
              >
                View in Register &rarr;
              </button>
              <button
                type="button"
                onClick={() => handleExportHistoricalQuarterZip('2026-Q1')}
                disabled={isExportingZip}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-md transition-colors cursor-pointer"
              >
                <Download className="w-3 h-3 text-emerald-400" />
                <span>Zip Archive</span>
              </button>
            </div>
          </div>

          {/* Q4 2025 Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold font-mono text-slate-900">Q4 2025 Archive</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300">
                Year-End QMS Signoff
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Financial Quarter: <strong>Oct 1, 2025 – Dec 31, 2025</strong>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Contains 3 records: BGA mask dam SCAR vendor action, Executive Management Review, and DSOX Oscilloscope annual cal.
            </p>

            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelectedQuarterId('2025-Q4')}
                className="text-xs font-medium text-slate-700 hover:text-sky-700 cursor-pointer"
              >
                View in Register &rarr;
              </button>
              <button
                type="button"
                onClick={() => handleExportHistoricalQuarterZip('2025-Q4')}
                disabled={isExportingZip}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-md transition-colors cursor-pointer"
              >
                <Download className="w-3 h-3 text-emerald-400" />
                <span>Zip Archive</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 6: INSPECT DOCUMENT MODAL (DETAILED AUDIT DOSSIER)                 */}
      {/* ========================================================================= */}
      {selectedDocForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl my-6 bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden animate-fade-in text-slate-800">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/30">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">Quarterly Document Inspection</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 border border-sky-600/50 text-sky-300">
                      {selectedDocForPreview.documentNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedDocForPreview.moduleSource} • {selectedQuarter.financialQuarter}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDocForPreview(null)}
                className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              
              {/* Document Overview Header */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Governing Standard
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                    {selectedDocForPreview.standardClause}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                  {selectedDocForPreview.title}
                </h4>
              </div>

              {/* Status and Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-[10px] uppercase text-slate-400 font-semibold">Quarter Lifecycle</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedDocForPreview.lifecycleStatus}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-[10px] uppercase text-slate-400 font-semibold">Native Status</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedDocForPreview.nativeStatus}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-[10px] uppercase text-slate-400 font-semibold">Date Opened</p>
                  <p className="text-xs font-mono font-bold text-slate-800 mt-0.5">{selectedDocForPreview.dateOpened}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-[10px] uppercase text-slate-400 font-semibold">Date Resolved</p>
                  <p className="text-xs font-mono font-bold text-emerald-700 mt-0.5">
                    {selectedDocForPreview.dateResolved || 'Still Active in Q3'}
                  </p>
                </div>
              </div>

              {/* Responsible Lead and Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-[10px] uppercase text-slate-400 font-semibold">Responsible Owner / Lead</p>
                  <p className="text-xs font-medium text-slate-800 mt-0.5">{selectedDocForPreview.ownerOrLead}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-[10px] uppercase text-slate-400 font-semibold">Department / Workcell</p>
                  <p className="text-xs font-medium text-slate-800 mt-0.5">{selectedDocForPreview.departmentOrLocation}</p>
                </div>
              </div>

              {/* Technical Details & Actions */}
              <div className="space-y-1.5">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Technical Details, Root Cause Containment & Corrective Actions
                </h5>
                <div className="p-3.5 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] leading-relaxed">
                  {selectedDocForPreview.details}
                </div>
              </div>

              {/* Raw Data Preview */}
              {selectedDocForPreview.rawData && (
                <div className="space-y-1">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Underlying System Record (JSON)
                  </h5>
                  <pre className="p-3 bg-slate-100 rounded-lg text-[10px] font-mono text-slate-700 overflow-x-auto max-h-36">
                    {JSON.stringify(selectedDocForPreview.rawData, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500">
                AS9100D §7.5 Controlled Document Record
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDocForPreview(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
