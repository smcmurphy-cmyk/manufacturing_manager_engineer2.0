import React, { useState } from 'react';
import { Download, Copy, Check, X, FileText } from 'lucide-react';
import { AssetRecord, ComplianceAudit, EngineeringJob, NCRRecord, TrainingRecord } from '../../types';

interface MarkdownExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  ncrs: NCRRecord[];
  audits: ComplianceAudit[];
  training: TrainingRecord[];
  jobs: EngineeringJob[];
  assets: AssetRecord[];
}

export const MarkdownExportModal: React.FC<MarkdownExportModalProps> = ({
  isOpen,
  onClose,
  ncrs,
  audits,
  training,
  jobs,
  assets,
}) => {
  const [selectedFile, setSelectedFile] = useState<
    '00_daily_dashboard.md' | '01_asset_calibration_pm.md' | '02_workforce_competency.md' | '03_compliance_reporting.md' | '04_engineering_ingestion.md'
  >('00_daily_dashboard.md');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generateMarkdown = (fileType: string) => {
    switch (fileType) {
      case '00_daily_dashboard.md':
        return `# Manufacturing Operations: Master Dashboard

> Last Updated: 2026-08-30 | Role: Manufacturing Manager / Senior Embedded Mfg Engineer
> Organization: Dynamic Engineering | Storage: \\\\NAS\\Data\\

## 🚨 Critical Action Queue (Next 7 Days)
- [ ] **Calibration Overdue**: Keysight Oscilloscope \`EQ-MET-14\` @due(2026-09-05) #alert/critical
- [ ] **IPC Recertification**: M. Smith (IPC-A-610 CIS) @due(2026-09-01) #training
- [ ] **ESD Bench Walkthrough**: Line A and B bench resistivity audit @due(2026-09-10)

## 📋 Active Assembly Jobs & Line Readiness
| FAI# | Assembly Part # | Revision | Due Date | Total Build Time | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
${jobs.map((j) => `| \`${j.jobId}\` | \`${j.partNumber}\` | ${j.revision} | ${j.dueDate || j.projectCode || 'Standard'} | ${j.totalBuildTimeHours ? `${j.totalBuildTimeHours} hrs` : 'N/A'} | ${j.status} |`).join('\n')}
`;

      case '01_asset_calibration_pm.md':
        return `# Asset Calibration, Metrology & Preventative Maintenance

| Asset ID | Equipment Description | Department / Location | Interval | Last Completed | Next Due Date | Assigned Owner | Alert Email |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${assets.map((a) => `| \`${a.assetId}\` | ${a.equipmentDescription} | ${a.departmentLocation} | ${a.intervalDays} Days | ${a.lastCompleted} | ${a.nextDueDate} | ${a.assignedOwner} | ${a.alertEmail} |`).join('\n')}
`;

      case '02_workforce_competency.md':
        return `# Workforce Competency & IPC Certification Matrix

| Operator / Tech | Certification Title | Standard & Class | Issue Date | Expiration Date | Status | Contact Email |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${training.map((t) => `| ${t.operatorName} | ${t.certificationTitle} | ${t.standardLevel} | ${t.issueDate} | ${t.expirationDate} | ${t.status} | ${t.contactEmail} |`).join('\n')}
`;

      case '03_compliance_reporting.md':
        return `# AS9100D / ISO 9001 Compliance & Management Reporting Timelines

## Non-Conformance Reports (NCR)
| NCR ID | Serial # | Assembly / Part # | Defect Description | Standard & Severity | Status | Next Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${ncrs.map((n) => `| \`${n.ncrNumber}\` | ${n.serialNumber ? `\`${n.serialNumber}\`` : 'N/A'} | ${n.assemblyPartNumber} (${n.assemblyRevision}) | ${n.defectDescription} | ${n.standardClause} (${n.severity}) | ${n.status} | ${n.nextAction} |`).join('\n')}

## QMS Audit Cadence
| Audit / Review Event | Standard Clause Ref | Cadence | Last Completed | Next Due Date | Lead Auditor |
| :--- | :--- | :--- | :--- | :--- | :--- |
${audits.map((au) => `| ${au.title} | ${au.standard} | ${au.cadence} | ${au.lastCompleted} | ${au.nextDueDate} | ${au.leadAuditor} |`).join('\n')}
`;

      case '04_engineering_ingestion.md':
        return `# FAI validation & Logging
> **Scope**: Production release validation, DFM checks, Test & QA verification

${jobs
  .map(
    (j) => `### FAI: ${j.jobId} - ${j.assemblyName} (${j.partNumber} ${j.revision})
- **Due Date**: ${j.dueDate || j.projectCode || 'Standard'}
- **Total Build Time**: ${j.totalBuildTimeHours ? `${j.totalBuildTimeHours} Hours` : 'N/A'}
- **Gate Checks**:
  - [${j.checks.xyOdb ? 'x' : ' '}] #1 XY/ODB++
  - [${j.checks.stencilBotTop ? 'x' : ' '}] #2 Stencil File BOT/TOP
  - [${j.checks.spiBotTop ? 'x' : ' '}] #3 SPI File BOT/TOP
  - [${j.checks.pnpBotTop ? 'x' : ' '}] #4 PNP File BOT/TOP
  - [${j.checks.aoiBotTop ? 'x' : ' '}] #5 AOI File BOT/TOP
  - [${j.passedTest === 'Yes' ? 'x' : ' '}] #6 Passed Test? (${j.passedTest || 'No'}${j.passedTestDate ? ` - ${j.passedTestDate}` : ''})
  - [${j.passedQa === 'Yes' ? 'x' : ' '}] #7 Passed QA? (${j.passedQa || 'No'}${j.passedQaDate ? ` - ${j.passedQaDate}` : ''})
  - [${j.checks.aoiFinalBotTop ? 'x' : ' '}] #8 AOI Final File BOT/TOP
- **Status**: ${j.status}
`
  )
  .join('\n---\n\n')}
`;
      default:
        return '';
    }
  };

  const currentContent = generateMarkdown(selectedFile);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', selectedFile);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Modular Markdown Exporter</h3>
              <p className="text-xs text-slate-400">Export clean markdown files formatted for VS Code and Git</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File Selectors */}
        <div className="flex border-b border-slate-200 px-5 bg-slate-50 gap-2 overflow-x-auto">
          {[
            '00_daily_dashboard.md',
            '01_asset_calibration_pm.md',
            '02_workforce_competency.md',
            '03_compliance_reporting.md',
            '04_engineering_ingestion.md',
          ].map((fn) => (
            <button
              key={fn}
              onClick={() => setSelectedFile(fn as any)}
              className={`py-3 px-3 text-xs font-mono font-semibold border-b-2 transition-colors whitespace-nowrap ${
                selectedFile === fn
                  ? 'border-sky-600 text-sky-700 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {fn}
            </button>
          ))}
        </div>

        {/* Code Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-500">File: {selectedFile}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg shadow-2xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied to Clipboard' : 'Copy Markdown'}
              </button>
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sky-700 hover:bg-sky-800 text-white rounded-lg shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                Download {selectedFile}
              </button>
            </div>
          </div>

          <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
            {currentContent}
          </pre>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
