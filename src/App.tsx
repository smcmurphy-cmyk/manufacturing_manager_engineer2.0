import React, { useState, useEffect } from 'react';
import { ActiveModule, AssetRecord, ComplianceAudit, EngineeringJob, NCRRecord, NCRStatus, TrainingRecord } from './types';
import {
  INITIAL_ASSETS,
  INITIAL_AUDITS,
  INITIAL_JOBS,
  INITIAL_NCRS,
  INITIAL_TRAINING,
} from './data/initialData';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ComplianceTracker } from './components/modules/ComplianceTracker';
import { TrainingTracker } from './components/modules/TrainingTracker';
import { DataIngestion } from './components/modules/DataIngestion';
import { AssetMaintenance } from './components/modules/AssetMaintenance';
import { QuarterlyReporting } from './components/modules/QuarterlyReporting';
import { AlertsModal } from './components/modals/AlertsModal';
import { MarkdownExportModal } from './components/modals/MarkdownExportModal';
import { buildLiveQ3QuarterlyDocuments } from './utils/quarterlyData';

// Local storage cache keys for zero-latency instant reload
const CACHE_KEYS = {
  ASSETS: 'QMS_ASSET_REGISTRY_V2',
  NCRS: 'QMS_NCR_REGISTRY_V2',
  AUDITS: 'QMS_AUDIT_REGISTRY_V2',
  TRAINING: 'QMS_TRAINING_REGISTRY_V2',
  JOBS: 'QMS_ENGINEERING_JOBS_V2',
};

function getCached<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setCached(key: string, data: any) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`LocalStorage write error for ${key}:`, err);
  }
}

export default function App() {
  const [activeModule, setActiveModule] = useState<ActiveModule>('compliance');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; mode: string } | null>(null);

  // State for all 4 operational modules initialized with local cache fallback
  const [ncrs, setNcrs] = useState<NCRRecord[]>(() => getCached(CACHE_KEYS.NCRS, INITIAL_NCRS));
  const [audits, setAudits] = useState<ComplianceAudit[]>(() => getCached(CACHE_KEYS.AUDITS, INITIAL_AUDITS));
  const [training, setTraining] = useState<TrainingRecord[]>(() => getCached(CACHE_KEYS.TRAINING, INITIAL_TRAINING));
  const [jobs, setJobs] = useState<EngineeringJob[]>(() => getCached(CACHE_KEYS.JOBS, INITIAL_JOBS));
  const [assets, setAssets] = useState<AssetRecord[]>(() => getCached(CACHE_KEYS.ASSETS, INITIAL_ASSETS));

  // Initial Sync from Backend (Postgres or Host Server JSON store)
  useEffect(() => {
    // 1. Fetch DB Status
    fetch('/api/db/status')
      .then((res) => res.json())
      .then((status) => {
        setDbStatus(status);
      })
      .catch((err) => console.warn('Could not query DB status:', err));

    // 2. Fetch Assets
    fetch('/api/registry/assets')
      .then((res) => res.json())
      .then((data) => {
        if (data?.assets && Array.isArray(data.assets) && data.assets.length > 0) {
          setAssets(data.assets);
          setCached(CACHE_KEYS.ASSETS, data.assets);
        }
      })
      .catch((err) => console.warn('Using cached assets:', err));

    // 3. Fetch NCRs
    fetch('/api/registry/ncrs')
      .then((res) => res.json())
      .then((data) => {
        if (data?.ncrs && Array.isArray(data.ncrs) && data.ncrs.length > 0) {
          setNcrs(data.ncrs);
          setCached(CACHE_KEYS.NCRS, data.ncrs);
        }
      })
      .catch((err) => console.warn('Using cached NCRs:', err));

    // 4. Fetch Audits
    fetch('/api/registry/audits')
      .then((res) => res.json())
      .then((data) => {
        if (data?.audits && Array.isArray(data.audits) && data.audits.length > 0) {
          setAudits(data.audits);
          setCached(CACHE_KEYS.AUDITS, data.audits);
        }
      })
      .catch((err) => console.warn('Using cached audits:', err));

    // 5. Fetch Training
    fetch('/api/registry/training')
      .then((res) => res.json())
      .then((data) => {
        if (data?.training && Array.isArray(data.training) && data.training.length > 0) {
          setTraining(data.training);
          setCached(CACHE_KEYS.TRAINING, data.training);
        }
      })
      .catch((err) => console.warn('Using cached training:', err));

    // 6. Fetch Jobs
    fetch('/api/registry/jobs')
      .then((res) => res.json())
      .then((data) => {
        if (data?.jobs && Array.isArray(data.jobs) && data.jobs.length > 0) {
          setJobs(data.jobs);
          setCached(CACHE_KEYS.JOBS, data.jobs);
        }
      })
      .catch((err) => console.warn('Using cached jobs:', err));
  }, []);

  // Handlers for Module 1: Compliance
  const handleAddNcr = (newNcr: NCRRecord) => {
    const updated = [newNcr, ...ncrs];
    setNcrs(updated);
    setCached(CACHE_KEYS.NCRS, updated);
    fetch('/api/registry/ncrs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNcr),
    }).catch((err) => console.warn('Backend NCR save failed:', err));
  };

  const handleUpdateNcr = (updatedNcr: NCRRecord) => {
    const updated = ncrs.map((n) => (n.id === updatedNcr.id ? updatedNcr : n));
    setNcrs(updated);
    setCached(CACHE_KEYS.NCRS, updated);
    fetch(`/api/registry/ncrs/${encodeURIComponent(updatedNcr.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedNcr),
    }).catch((err) => console.warn('Backend NCR update failed:', err));
  };

  const handleUpdateNcrStatus = (id: string, newStatus: NCRStatus) => {
    const now = new Date();
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    let targetNcr: NCRRecord | null = null;
    const updated = ncrs.map((n) => {
      if (n.id !== id) return n;
      const entry = {
        timestamp: timeStr,
        editedBy: 'Quality Assurance',
        summary: `Status transitioned from '${n.status}' to '${newStatus}'`,
        previousStatus: n.status,
        newStatus,
      };
      targetNcr = {
        ...n,
        status: newStatus,
        lastEditedAt: timeStr,
        lastEditedBy: 'Quality Assurance',
        editHistory: [entry, ...(n.editHistory || [])],
      };
      return targetNcr;
    });

    setNcrs(updated);
    setCached(CACHE_KEYS.NCRS, updated);

    if (targetNcr) {
      fetch(`/api/registry/ncrs/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetNcr),
      }).catch((err) => console.warn('Backend NCR status update failed:', err));
    }
  };

  const handleUpdateAudit = (updatedAudit: ComplianceAudit) => {
    const updated = audits.map((a) => (a.id === updatedAudit.id ? updatedAudit : a));
    setAudits(updated);
    setCached(CACHE_KEYS.AUDITS, updated);
    fetch('/api/registry/audits/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audits: updated }),
    }).catch((err) => console.warn('Backend audits sync failed:', err));
  };

  // Handlers for Module 2: Training
  const handleAddTraining = (newRec: TrainingRecord) => {
    const updated = [newRec, ...training];
    setTraining(updated);
    setCached(CACHE_KEYS.TRAINING, updated);
    fetch('/api/registry/training/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ training: updated }),
    }).catch((err) => console.warn('Backend training sync failed:', err));
  };

  const handleUpdateTrainingRecord = (updatedRec: TrainingRecord) => {
    const updated = training.map((t) => (t.id === updatedRec.id ? updatedRec : t));
    setTraining(updated);
    setCached(CACHE_KEYS.TRAINING, updated);
    fetch('/api/registry/training/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ training: updated }),
    }).catch((err) => console.warn('Backend training sync failed:', err));
  };

  const handleRenewTraining = (id: string) => {
    const updated = training.map((t) => {
      if (t.id !== id) return t;
      const now = new Date();
      const exp = new Date(now);
      exp.setFullYear(exp.getFullYear() + 2);
      return {
        ...t,
        issueDate: now.toISOString().split('T')[0],
        expirationDate: exp.toISOString().split('T')[0],
        status: 'Valid' as const,
        notes: `${t.notes ? t.notes + ' | ' : ''}Renewed on ${now.toISOString().split('T')[0]}`,
      };
    });
    setTraining(updated);
    setCached(CACHE_KEYS.TRAINING, updated);
    fetch('/api/registry/training/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ training: updated }),
    }).catch((err) => console.warn('Backend training sync failed:', err));
  };

  // Handlers for Module 3: Data Ingestion
  const handleAddJob = (newJob: EngineeringJob) => {
    const updated = [newJob, ...jobs];
    setJobs(updated);
    setCached(CACHE_KEYS.JOBS, updated);
    fetch('/api/registry/jobs/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobs: updated }),
    }).catch((err) => console.warn('Backend jobs sync failed:', err));
  };

  const handleToggleCheck = (jobId: string, checkKey: keyof EngineeringJob['checks']) => {
    const updated = jobs.map((j) => {
      if (j.id !== jobId) return j;
      const updatedChecks = {
        ...j.checks,
        [checkKey]: !j.checks[checkKey],
      };
      const allChecks = Object.values(updatedChecks).every(Boolean);
      const testPassed = j.passedTest === 'Yes';
      const qaPassed = j.passedQa === 'Yes';
      const allPassed = allChecks && testPassed && qaPassed;
      return {
        ...j,
        checks: updatedChecks,
        status: allPassed && (j.status === 'Edit' || (j.status as string) === 'Draft') ? 'Validation Complete' : (j.status === 'Validation Complete' && !allPassed ? 'Edit' : j.status),
      };
    });
    setJobs(updated);
    setCached(CACHE_KEYS.JOBS, updated);
    fetch('/api/registry/jobs/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobs: updated }),
    }).catch((err) => console.warn('Backend jobs sync failed:', err));
  };

  const handleUpdatePassedTest = (jobId: string, passedTest: 'Yes' | 'No', testDate?: string) => {
    const updated = jobs.map((j) => {
      if (j.id !== jobId) return j;
      const updatedJob = {
        ...j,
        passedTest,
        passedTestDate: testDate !== undefined ? testDate : j.passedTestDate,
      };
      const allChecks = Object.values(updatedJob.checks).every(Boolean);
      const testPassed = updatedJob.passedTest === 'Yes';
      const qaPassed = updatedJob.passedQa === 'Yes';
      const allPassed = allChecks && testPassed && qaPassed;
      return {
        ...updatedJob,
        status: allPassed && (updatedJob.status === 'Edit' || (updatedJob.status as string) === 'Draft') ? 'Validation Complete' : (updatedJob.status === 'Validation Complete' && !allPassed ? 'Edit' : updatedJob.status),
      };
    });
    setJobs(updated);
    setCached(CACHE_KEYS.JOBS, updated);
    fetch('/api/registry/jobs/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobs: updated }),
    }).catch((err) => console.warn('Backend jobs sync failed:', err));
  };

  const handleUpdatePassedQa = (jobId: string, passedQa: 'Yes' | 'No', qaDate?: string) => {
    const updated = jobs.map((j) => {
      if (j.id !== jobId) return j;
      const updatedJob = {
        ...j,
        passedQa,
        passedQaDate: qaDate !== undefined ? qaDate : j.passedQaDate,
      };
      const allChecks = Object.values(updatedJob.checks).every(Boolean);
      const testPassed = updatedJob.passedTest === 'Yes';
      const qaPassed = updatedJob.passedQa === 'Yes';
      const allPassed = allChecks && testPassed && qaPassed;
      return {
        ...updatedJob,
        status: allPassed && (updatedJob.status === 'Edit' || (updatedJob.status as string) === 'Draft') ? 'Validation Complete' : (updatedJob.status === 'Validation Complete' && !allPassed ? 'Edit' : updatedJob.status),
      };
    });
    setJobs(updated);
    setCached(CACHE_KEYS.JOBS, updated);
    fetch('/api/registry/jobs/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobs: updated }),
    }).catch((err) => console.warn('Backend jobs sync failed:', err));
  };

  const handleUpdateJob = (updatedJob: EngineeringJob) => {
    const updated = jobs.map((j) => (j.id === updatedJob.id ? updatedJob : j));
    setJobs(updated);
    setCached(CACHE_KEYS.JOBS, updated);
    fetch('/api/registry/jobs/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobs: updated }),
    }).catch((err) => console.warn('Backend jobs sync failed:', err));
  };

  const handleUpdateJobStatus = (jobId: string, status: EngineeringJob['status']) => {
    const updated = jobs.map((j) => (j.id === jobId ? { ...j, status } : j));
    setJobs(updated);
    setCached(CACHE_KEYS.JOBS, updated);
    fetch('/api/registry/jobs/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobs: updated }),
    }).catch((err) => console.warn('Backend jobs sync failed:', err));
  };

  const handleUpdateTotalBuildTime = (jobId: string, totalBuildTimeHours: number | string) => {
    const updated = jobs.map((j) => (j.id === jobId ? { ...j, totalBuildTimeHours } : j));
    setJobs(updated);
    setCached(CACHE_KEYS.JOBS, updated);
    fetch('/api/registry/jobs/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobs: updated }),
    }).catch((err) => console.warn('Backend jobs sync failed:', err));
  };

  // Handlers for Module 4: Asset Maintenance (Persistent via PostgreSQL/JSON)
  const handleAddAsset = (newAsset: AssetRecord) => {
    const updated = [newAsset, ...assets];
    setAssets(updated);
    setCached(CACHE_KEYS.ASSETS, updated);
    fetch('/api/registry/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAsset),
    }).catch((err) => console.warn('Backend asset save failed:', err));
  };

  const handleUpdateAsset = (updatedAsset: AssetRecord) => {
    const updated = assets.map((a) => (a.id === updatedAsset.id ? updatedAsset : a));
    setAssets(updated);
    setCached(CACHE_KEYS.ASSETS, updated);
    fetch(`/api/registry/assets/${encodeURIComponent(updatedAsset.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedAsset),
    }).catch((err) => console.warn('Backend asset update failed:', err));
  };

  const handleRecalibrateAsset = (id: string) => {
    const today = new Date('2026-08-30');
    let calibratedAsset: AssetRecord | null = null;
    const updated = assets.map((a) => {
      if (a.id !== id) return a;
      const nextDue = new Date(today);
      nextDue.setDate(nextDue.getDate() + a.intervalDays);
      calibratedAsset = {
        ...a,
        lastCompleted: today.toISOString().split('T')[0],
        nextDueDate: nextDue.toISOString().split('T')[0],
        status: 'Operational / Calibrated' as const,
      };
      return calibratedAsset;
    });

    setAssets(updated);
    setCached(CACHE_KEYS.ASSETS, updated);

    fetch(`/api/registry/assets/${encodeURIComponent(id)}/calibrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calibratedDate: today.toISOString().split('T')[0] }),
    }).catch((err) => console.warn('Backend asset calibrate failed:', err));
  };

  // Compute Badge Counters
  const activeNcrCount = ncrs.filter((n) => n.status === 'Open' || n.status === 'In Development').length;

  const today = new Date('2026-08-30');
  const expiringTrainingCount = training.filter((t) => {
    const diff = Math.ceil((new Date(t.expirationDate).getTime() - today.getTime()) / (1000 * 3600 * 24));
    return diff <= 30;
  }).length;

  const activeJobsCount = jobs.length;

  const calAlertsCount = assets.filter((a) => {
    const diff = Math.ceil((new Date(a.nextDueDate).getTime() - today.getTime()) / (1000 * 3600 * 24));
    return diff <= 14;
  }).length;

  const quarterlyDocsCount = buildLiveQ3QuarterlyDocuments(ncrs, audits, training, jobs, assets).length;

  const totalAlertCount = expiringTrainingCount + calAlertsCount;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 font-sans flex flex-col antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        ncrCount={activeNcrCount}
        expiringCertsCount={expiringTrainingCount}
        activeJobsCount={activeJobsCount}
        calAlertsCount={calAlertsCount}
        quarterlyDocsCount={quarterlyDocsCount}
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content Area (Offset by sidebar width on desktop) */}
      <div className="flex-1 flex flex-col lg:pl-72 min-w-0">
        {/* Top Header */}
        <Header
          activeModule={activeModule}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenAlertModal={() => setIsAlertModalOpen(true)}
          onExportMarkdown={() => setIsExportModalOpen(true)}
          totalAlertCount={totalAlertCount}
          dbStatus={dbStatus || undefined}
        />

        {/* Module Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeModule === 'compliance' && (
            <ComplianceTracker
              ncrs={ncrs}
              audits={audits}
              onAddNcr={handleAddNcr}
              onUpdateNcr={handleUpdateNcr}
              onUpdateNcrStatus={handleUpdateNcrStatus}
              onUpdateAudit={handleUpdateAudit}
            />
          )}

          {activeModule === 'training' && (
            <TrainingTracker
              records={training}
              onAddRecord={handleAddTraining}
              onRenewRecord={handleRenewTraining}
              onUpdateRecord={handleUpdateTrainingRecord}
            />
          )}

          {activeModule === 'data-ingestion' && (
            <DataIngestion
              jobs={jobs}
              onAddJob={handleAddJob}
              onUpdateJob={handleUpdateJob}
              onToggleCheck={handleToggleCheck}
              onUpdatePassedTest={handleUpdatePassedTest}
              onUpdatePassedQa={handleUpdatePassedQa}
              onUpdateTotalBuildTime={handleUpdateTotalBuildTime}
              onUpdateStatus={handleUpdateJobStatus}
            />
          )}

          {activeModule === 'asset-maintenance' && (
            <AssetMaintenance
              assets={assets}
              onAddAsset={handleAddAsset}
              onUpdateAsset={handleUpdateAsset}
              onRecalibrate={handleRecalibrateAsset}
              onOpenAlertModal={() => setIsAlertModalOpen(true)}
            />
          )}

          {activeModule === 'quarterly-reporting' && (
            <QuarterlyReporting
              ncrs={ncrs}
              audits={audits}
              training={training}
              jobs={jobs}
              assets={assets}
              onNavigateModule={(mod) => setActiveModule(mod as ActiveModule)}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <AlertsModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        assets={assets}
        training={training}
        audits={audits}
      />

      <MarkdownExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        ncrs={ncrs}
        audits={audits}
        training={training}
        jobs={jobs}
        assets={assets}
      />
    </div>
  );
}
