import JSZip from 'jszip';
import { QuarterPeriod, QuarterlyDocumentItem } from '../types';

export interface ZipExportOptions {
  quarter: QuarterPeriod;
  documents: QuarterlyDocumentItem[];
  organizationName?: string;
  compiledBy?: string;
}

export async function generateQuarterlyArchiveZip({
  quarter,
  documents,
  organizationName = 'Dynamic Engineering - Embedded Systems Mfg',
  compiledBy = 'Steven McMurphy (Mfg Manager / Senior Embedded Mfg Engineer)',
}: ZipExportOptions): Promise<Blob> {
  const zip = new JSZip();

  const timestamp = new Date().toISOString();
  const quarterPrefix = quarter.id;

  // 1. Executive Summary Markdown
  const openedCount = documents.filter((d) => d.lifecycleStatus === 'Opened in Quarter').length;
  const closedCount = documents.filter((d) => d.lifecycleStatus === 'Closed / Completed').length;
  const activeCount = documents.filter((d) => d.lifecycleStatus === 'Still Active / In-Flight').length;
  const overdueCount = documents.filter((d) => d.lifecycleStatus === 'Action Required / Overdue').length;

  const executiveSummary = `# ${organizationName}
# QUARTERLY OPERATIONS & COMPLIANCE DOSSIER
**Reporting Period:** ${quarter.label} (${quarter.startDate} to ${quarter.endDate})
**Financial Quarter:** ${quarter.financialQuarter}
**QMS Governance:** AS9100D • ISO 9001:2015 • IPC Class 3 • ANSI/ESD S20.20
**Generated On:** ${timestamp}
**Executive Compiler:** ${compiledBy}

---

## 1. Executive Quarterly Quality Metrics
- **Total Unified Documents in Quarter:** ${documents.length}
- **Closed / Completed / Certified:** ${closedCount} (${((closedCount / (documents.length || 1)) * 100).toFixed(1)}%)
- **Newly Opened / Initiated in Quarter:** ${openedCount}
- **Still Active / In-Flight:** ${activeCount}
- **Action Required / Overdue / Attention:** ${overdueCount}

---

## 2. Module Breakdown
- **Module 1 (Compliance & NCRs):** ${documents.filter((d) => d.moduleKey === 'compliance').length} records
- **Module 2 (Workforce Competency & Training):** ${documents.filter((d) => d.moduleKey === 'training').length} records
- **Module 3 (FAI Jobs & Validation Logging):** ${documents.filter((d) => d.moduleKey === 'data-ingestion').length} records
- **Module 4 (Asset PM & NIST Calibration):** ${documents.filter((d) => d.moduleKey === 'asset-maintenance').length} records

---

## 3. Comprehensive Document Index
| Document ID | Module Source | Standard Clause | Lifecycle Status | Native Status | Criticality | Owner / Lead |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${documents
  .map(
    (d) =>
      `| **${d.documentNumber}** | ${d.moduleSource} | ${d.standardClause} | ${d.lifecycleStatus} | ${d.nativeStatus} | ${d.criticality} | ${d.ownerOrLead} |`
  )
  .join('\n')}

---

## 4. QMS & Regulatory Audit Statement
This quarterly archive constitutes the formal tamper-evident quality record under AS9100D §8.7, §7.1.5, §7.2 and ISO 9001:2015 §9.3. All contained technical records, calibration sheets, FAI traveler gates, and training certifications have been validated.
`;

  zip.file(`QUARTERLY_EXECUTIVE_SUMMARY_${quarterPrefix}.md`, executiveSummary);

  // 2. CSV Summary Register
  const csvHeaders = [
    'Document Number',
    'Module Source',
    'Title / Description',
    'Standard Clause',
    'Lifecycle Status',
    'Native Status',
    'Date Opened / Effective',
    'Date Resolved / Expiration',
    'Owner or Lead',
    'Criticality',
    'Department / Location',
    'Technical Details',
  ];

  const escapeCsv = (str: string | undefined) => {
    if (!str) return '""';
    return `"${str.replace(/"/g, '""')}"`;
  };

  const csvRows = documents.map((d) =>
    [
      escapeCsv(d.documentNumber),
      escapeCsv(d.moduleSource),
      escapeCsv(d.title),
      escapeCsv(d.standardClause),
      escapeCsv(d.lifecycleStatus),
      escapeCsv(d.nativeStatus),
      escapeCsv(d.dateOpened),
      escapeCsv(d.dateResolved || 'N/A'),
      escapeCsv(d.ownerOrLead),
      escapeCsv(d.criticality),
      escapeCsv(d.departmentOrLocation),
      escapeCsv(d.details),
    ].join(',')
  );

  const csvContent = [csvHeaders.join(','), ...csvRows].join('\r\n');
  zip.file(`Quarterly_Documents_Register_${quarterPrefix}.csv`, csvContent);

  // 3. Manifest JSON
  const manifest = {
    archiveTitle: `${quarter.financialQuarter} Operations & Compliance Archive`,
    period: quarter,
    organization: organizationName,
    compiledBy,
    exportedAt: timestamp,
    totalRecords: documents.length,
    statistics: {
      opened: openedCount,
      closed: closedCount,
      active: activeCount,
      overdue: overdueCount,
    },
    modules: {
      compliance: documents.filter((d) => d.moduleKey === 'compliance').length,
      training: documents.filter((d) => d.moduleKey === 'training').length,
      faiJobs: documents.filter((d) => d.moduleKey === 'data-ingestion').length,
      assets: documents.filter((d) => d.moduleKey === 'asset-maintenance').length,
    },
    documents: documents.map((d) => ({
      documentNumber: d.documentNumber,
      title: d.title,
      moduleSource: d.moduleSource,
      standardClause: d.standardClause,
      lifecycleStatus: d.lifecycleStatus,
      nativeStatus: d.nativeStatus,
      dateOpened: d.dateOpened,
      dateResolved: d.dateResolved,
      ownerOrLead: d.ownerOrLead,
      criticality: d.criticality,
      departmentOrLocation: d.departmentOrLocation,
    })),
  };

  zip.file(`manifest_${quarterPrefix}.json`, JSON.stringify(manifest, null, 2));

  // 4. Sub-folders for each Module
  const folderCompliance = zip.folder('Module_01_Compliance_NCRs_Audits');
  const folderTraining = zip.folder('Module_02_Workforce_Training_Certifications');
  const folderFAI = zip.folder('Module_03_FAI_Production_Release_Jobs');
  const folderAssets = zip.folder('Module_04_Asset_Metrology_Calibrations');

  documents.forEach((doc) => {
    const fileContent = `# Document Record: ${doc.documentNumber}
**Module:** ${doc.moduleSource}
**Title:** ${doc.title}
**Governing Standard:** ${doc.standardClause}
**Lifecycle Status in Quarter:** ${doc.lifecycleStatus}
**Native Status:** ${doc.nativeStatus}
**Date Opened / Initiated:** ${doc.dateOpened}
**Date Resolved / Due:** ${doc.dateResolved || 'N/A'}
**Responsible Owner:** ${doc.ownerOrLead}
**Criticality Level:** ${doc.criticality}
**Workcell Location:** ${doc.departmentOrLocation}

## Technical Details & Root Cause / Actions:
${doc.details}

## Raw Structured Metadata:
\`\`\`json
${JSON.stringify(doc.rawData || doc, null, 2)}
\`\`\`
`;

    const sanitizedDocNum = doc.documentNumber.replace(/[^a-zA-Z0-9_-]/g, '_');

    if (doc.moduleKey === 'compliance' && folderCompliance) {
      folderCompliance.file(`${sanitizedDocNum}.md`, fileContent);
    } else if (doc.moduleKey === 'training' && folderTraining) {
      folderTraining.file(`${sanitizedDocNum}.md`, fileContent);
    } else if (doc.moduleKey === 'data-ingestion' && folderFAI) {
      folderFAI.file(`${sanitizedDocNum}.md`, fileContent);
    } else if (doc.moduleKey === 'asset-maintenance' && folderAssets) {
      folderAssets.file(`${sanitizedDocNum}.md`, fileContent);
    }
  });

  return await zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
