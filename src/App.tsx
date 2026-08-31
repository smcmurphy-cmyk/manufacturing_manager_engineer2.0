import React, { useState } from 'react';
import { ActiveModule, AssetRecord, EngineeringJob, NCRRecord, NCRStatus, TrainingRecord } from './types';
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

export default function App() {
  const [activeModule, setActiveModule] = useState<ActiveModule>('compliance');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // State for all 4 operational modules
  const [ncrs, setNcrs] = useState<NCRRecord[]>(INITIAL_NCRS);
  const [audits, setAudits] = useState(INITIAL_AUDITS);
  const [training, setTraining] = useState<TrainingRecord[]>(INITIAL_TRAINING);
  const [jobs, setJobs] = useState<EngineeringJob[]>(INITIAL_JOBS);
  const [assets, setAssets] = useState<AssetRecord[]>(INITIAL_ASSETS);

  // Handlers for Module 1: Compliance
  const handleAddNcr = (newNcr: NCRRecord) => {
    setNcrs([newNcr, ...ncrs]);
  };

  const handleUpdateNcrStatus = (id: string, newStatus: NCRStatus) => {
    setNcrs(ncrs.map((n) => (n.id === id ? { ...n, status: newStatus } : n)));
  };

  // Handlers for Module 2: Training
  const handleAddTraining = (newRec: TrainingRecord) => {
    setTraining([newRec, ...training]);
  };

  const handleUpdateTrainingRecord = (updatedRec: TrainingRecord) => {
    setTraining(training.map((t) => (t.id === updatedRec.id ? updatedRec : t)));
  };

  const handleRenewTraining = (id: string) => {
    setTraining(
      training.map((t) => {
        if (t.id !== id) return t;
        const now = new Date();
        const exp = new Date(now);
        exp.setFullYear(exp.getFullYear() + 2);
        return {
          ...t,
          issueDate: now.toISOString().split('T')[0],
          expirationDate: exp.toISOString().split('T')[0],
          status: 'Valid',
          notes: `${t.notes ? t.notes + ' | ' : ''}Renewed on ${now.toISOString().split('T')[0]}`,
        };
      })
    );
  };

  // Handlers for Module 3: Data Ingestion
  const handleAddJob = (newJob: EngineeringJob) => {
    setJobs([newJob, ...jobs]);
  };

  const handleToggleCheck = (jobId: string, checkKey: keyof EngineeringJob['checks']) => {
    setJobs(
      jobs.map((j) => {
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
      })
    );
  };

  const handleUpdatePassedTest = (jobId: string, passedTest: 'Yes' | 'No', testDate?: string) => {
    setJobs(
      jobs.map((j) => {
        if (j.id !== jobId) return j;
        const updated = {
          ...j,
          passedTest,
          passedTestDate: testDate !== undefined ? testDate : j.passedTestDate,
        };
        const allChecks = Object.values(updated.checks).every(Boolean);
        const testPassed = updated.passedTest === 'Yes';
        const qaPassed = updated.passedQa === 'Yes';
        const allPassed = allChecks && testPassed && qaPassed;
        return {
          ...updated,
          status: allPassed && (updated.status === 'Edit' || (updated.status as string) === 'Draft') ? 'Validation Complete' : (updated.status === 'Validation Complete' && !allPassed ? 'Edit' : updated.status),
        };
      })
    );
  };

  const handleUpdatePassedQa = (jobId: string, passedQa: 'Yes' | 'No', qaDate?: string) => {
    setJobs(
      jobs.map((j) => {
        if (j.id !== jobId) return j;
        const updated = {
          ...j,
          passedQa,
          passedQaDate: qaDate !== undefined ? qaDate : j.passedQaDate,
        };
        const allChecks = Object.values(updated.checks).every(Boolean);
        const testPassed = updated.passedTest === 'Yes';
        const qaPassed = updated.passedQa === 'Yes';
        const allPassed = allChecks && testPassed && qaPassed;
        return {
          ...updated,
          status: allPassed && (updated.status === 'Edit' || (updated.status as string) === 'Draft') ? 'Validation Complete' : (updated.status === 'Validation Complete' && !allPassed ? 'Edit' : updated.status),
        };
      })
    );
  };

  const handleUpdateJob = (updatedJob: EngineeringJob) => {
    setJobs(jobs.map((j) => (j.id === updatedJob.id ? updatedJob : j)));
  };

  const handleUpdateJobStatus = (jobId: string, status: EngineeringJob['status']) => {
    setJobs(jobs.map((j) => (j.id === jobId ? { ...j, status } : j)));
  };

  const handleUpdateTotalBuildTime = (jobId: string, totalBuildTimeHours: number | string) => {
    setJobs(jobs.map((j) => (j.id === jobId ? { ...j, totalBuildTimeHours } : j)));
  };

  // Handlers for Module 4: Asset Maintenance
  const handleAddAsset = (newAsset: AssetRecord) => {
    setAssets([newAsset, ...assets]);
  };

  const handleUpdateAsset = (updatedAsset: AssetRecord) => {
    setAssets(assets.map((a) => (a.id === updatedAsset.id ? updatedAsset : a)));
  };

  const handleRecalibrateAsset = (id: string) => {
    setAssets(
      assets.map((a) => {
        if (a.id !== id) return a;
        const today = new Date('2026-08-30');
        const nextDue = new Date(today);
        nextDue.setDate(nextDue.getDate() + a.intervalDays);
        return {
          ...a,
          lastCompleted: today.toISOString().split('T')[0],
          nextDueDate: nextDue.toISOString().split('T')[0],
          status: 'Operational / Calibrated',
        };
      })
    );
  };

  // Compute Badge Counters
  const activeNcrCount = ncrs.filter((n) => n.status !== 'Closed').length;

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
        />

        {/* Module Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeModule === 'compliance' && (
            <ComplianceTracker
              ncrs={ncrs}
              audits={audits}
              onAddNcr={handleAddNcr}
              onUpdateNcrStatus={handleUpdateNcrStatus}
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
