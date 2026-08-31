import {
  AssetRecord,
  ComplianceAudit,
  EngineeringJob,
  NCRRecord,
  QuarterId,
  QuarterPeriod,
  QuarterlyDocumentItem,
  TrainingRecord,
} from '../types';
import { HISTORICAL_QUARTER_DOCUMENTS, QUARTER_PERIODS } from '../data/quarterlyArchiveData';

export function getQuarterPeriodById(quarterId: QuarterId): QuarterPeriod {
  const found = QUARTER_PERIODS.find((q) => q.id === quarterId);
  return found || QUARTER_PERIODS[0];
}

/**
 * Transforms live state across Modules 1-4 into unified QuarterlyDocumentItem records for Q3 2026 (July 1 - September 30)
 */
export function buildLiveQ3QuarterlyDocuments(
  ncrs: NCRRecord[],
  audits: ComplianceAudit[],
  training: TrainingRecord[],
  jobs: EngineeringJob[],
  assets: AssetRecord[]
): QuarterlyDocumentItem[] {
  const items: QuarterlyDocumentItem[] = [];

  // 1. Module 1: Compliance - NCRs
  ncrs.forEach((ncr) => {
    let lifecycle: QuarterlyDocumentItem['lifecycleStatus'] = 'Still Active / In-Flight';
    if (ncr.status === 'Fixed' || (ncr.status as string) === 'Closed') {
      lifecycle = 'Closed / Completed';
    } else if (ncr.status === 'Open' || ncr.status === 'Scrap') {
      lifecycle = 'Action Required / Overdue';
    } else {
      lifecycle = 'Opened in Quarter';
    }

    items.push({
      id: `live-${ncr.id}`,
      documentNumber: ncr.ncrNumber,
      title: `${ncr.assemblyPartNumber} (${ncr.assemblyRevision})${ncr.serialNumber ? ` [S/N: ${ncr.serialNumber}]` : ''}: ${ncr.defectDescription}`,
      moduleSource: 'Module 1: Compliance',
      moduleKey: 'compliance',
      standardClause: ncr.standardClause,
      dateOpened: ncr.containmentDate,
      dateResolved: ncr.status === 'Fixed' || (ncr.status as string) === 'Closed' ? '2026-08-14' : undefined,
      lifecycleStatus: lifecycle,
      nativeStatus: ncr.status,
      ownerOrLead: `${ncr.owner} (Containment: ${ncr.rootCauseMethod})`,
      criticality: ncr.severity,
      details: ncr.nextAction,
      departmentOrLocation: `Part: ${ncr.assemblyPartNumber}${ncr.serialNumber ? ` | S/N: ${ncr.serialNumber}` : ''} / Quality Containment Cell`,
      rawData: ncr,
    });
  });

  // 2. Module 1: Compliance - Audits in Q3
  audits.forEach((aud) => {
    let lifecycle: QuarterlyDocumentItem['lifecycleStatus'] = 'Still Active / In-Flight';
    if (aud.status === 'Compliant') {
      lifecycle = 'Closed / Completed';
    } else if (aud.status === 'Due Soon' || aud.status === 'Action Required') {
      lifecycle = 'Action Required / Overdue';
    }

    items.push({
      id: `live-${aud.id}`,
      documentNumber: `AUD-Q3-${aud.id.toUpperCase()}`,
      title: aud.title,
      moduleSource: 'Module 1: Compliance',
      moduleKey: 'compliance',
      standardClause: aud.standard,
      dateOpened: aud.lastCompleted,
      dateResolved: aud.status === 'Compliant' ? aud.lastCompleted : undefined,
      lifecycleStatus: lifecycle,
      nativeStatus: aud.status,
      ownerOrLead: aud.leadAuditor,
      criticality: aud.status === 'Action Required' ? 'High' : 'Medium',
      details: `Cadence: ${aud.cadence} | Next Audit Milestone: ${aud.nextDueDate}`,
      departmentOrLocation: 'QMS Governance / Quality Management System',
      rawData: aud,
    });
  });

  // 3. Module 2: Training Records
  training.forEach((tr) => {
    let lifecycle: QuarterlyDocumentItem['lifecycleStatus'] = 'Still Active / In-Flight';
    if (tr.status === 'Valid') {
      lifecycle = 'Still Active / In-Flight';
    } else if (tr.status === 'Expiring Soon' || tr.status === 'Expired') {
      lifecycle = 'Action Required / Overdue';
    }

    items.push({
      id: `live-${tr.id}`,
      documentNumber: `CERT-${tr.badgeNumber}-${tr.id.toUpperCase()}`,
      title: `${tr.operatorName} (${tr.badgeNumber}) — ${tr.certificationTitle}`,
      moduleSource: 'Module 2: Training',
      moduleKey: 'training',
      standardClause: tr.standardLevel,
      dateOpened: tr.issueDate,
      dateResolved: tr.status === 'Valid' ? tr.expirationDate : undefined,
      lifecycleStatus: lifecycle,
      nativeStatus: tr.status,
      ownerOrLead: `${tr.operatorName} (${tr.role})`,
      criticality: tr.status === 'Expired' ? 'High' : tr.status === 'Expiring Soon' ? 'Medium' : 'Low',
      details: `Standard Level: ${tr.standardLevel} | Expires: ${tr.expirationDate}. Notes: ${tr.notes || 'In Good Standing'}`,
      departmentOrLocation: `Badge: ${tr.badgeNumber} / Contact: ${tr.contactEmail}`,
      rawData: tr,
    });
  });

  // 4. Module 3: Engineering Jobs (FAI & Logging)
  jobs.forEach((job) => {
    let lifecycle: QuarterlyDocumentItem['lifecycleStatus'] = 'Still Active / In-Flight';
    if (job.status === 'Dispatched to Line') {
      lifecycle = 'Closed / Completed';
    } else if (job.status === 'Validation Complete') {
      lifecycle = 'Closed / Completed';
    } else if (job.status === 'Hold') {
      lifecycle = 'Action Required / Overdue';
    } else {
      lifecycle = 'Opened in Quarter';
    }

    const checkCount = Object.values(job.checks).filter(Boolean).length;

    items.push({
      id: `live-${job.id}`,
      documentNumber: job.jobId,
      title: `${job.assemblyName} (${job.partNumber} ${job.revision})`,
      moduleSource: 'Module 3: FAI Jobs',
      moduleKey: 'data-ingestion',
      standardClause: 'AS9102 / IPC Class 3 DFM Release',
      dateOpened: job.targetBuildDate || '2026-08-20',
      dateResolved: (job.passedTest === 'Yes' && job.passedQa === 'Yes') ? job.passedQaDate || job.targetBuildDate : undefined,
      lifecycleStatus: lifecycle,
      nativeStatus: job.status,
      ownerOrLead: `Manufacturing Engineering (${job.dueDate})`,
      criticality: job.dueDate === 'ASAP' ? 'High' : 'Medium',
      details: `DFM Gates: ${checkCount}/6 passed | Test: ${job.passedTest || 'Pending'} | QA: ${job.passedQa || 'Pending'}. ${job.notes || ''}`,
      departmentOrLocation: `Line: ${job.smtLine || 'SMT Line 1 & 2'} / ${job.partNumber}`,
      rawData: job,
    });
  });

  // 5. Module 4: Asset Maintenance & Metrology
  assets.forEach((asset) => {
    let lifecycle: QuarterlyDocumentItem['lifecycleStatus'] = 'Still Active / In-Flight';
    if (asset.status === 'Operational / Calibrated') {
      // If completed in this quarter (July-Sept 2026)
      if (asset.lastCompleted >= '2026-07-01') {
        lifecycle = 'Closed / Completed';
      } else {
        lifecycle = 'Still Active / In-Flight';
      }
    } else if (asset.status === 'Cal Overdue' || asset.status === 'Out of Service') {
      lifecycle = 'Action Required / Overdue';
    } else if (asset.status === 'Calibration Due Soon') {
      lifecycle = 'Action Required / Overdue';
    }

    items.push({
      id: `live-${asset.id}`,
      documentNumber: `CAL-DOC-${asset.assetId}`,
      title: `${asset.assetId}: ${asset.equipmentDescription}`,
      moduleSource: 'Module 4: Assets',
      moduleKey: 'asset-maintenance',
      standardClause: 'AS9100D §7.1.5 & ANSI/ESD S20.20 NIST Metrology',
      dateOpened: asset.lastCompleted,
      dateResolved: asset.status === 'Operational / Calibrated' ? asset.lastCompleted : undefined,
      lifecycleStatus: lifecycle,
      nativeStatus: asset.status,
      ownerOrLead: asset.assignedOwner,
      criticality: asset.status === 'Cal Overdue' ? 'High' : asset.status === 'Calibration Due Soon' ? 'Medium' : 'Low',
      details: `Interval: ${asset.intervalDays} Days | Next Cal Due: ${asset.nextDueDate} | S/N: ${asset.serialNumber}`,
      departmentOrLocation: asset.departmentLocation,
      rawData: asset,
    });
  });

  return items;
}

/**
 * Retrieves documents for any quarter (live Q3 2026, or archived historical quarters)
 */
export function getQuarterDocuments(
  quarterId: QuarterId,
  liveNcrs: NCRRecord[],
  liveAudits: ComplianceAudit[],
  liveTraining: TrainingRecord[],
  liveJobs: EngineeringJob[],
  liveAssets: AssetRecord[]
): QuarterlyDocumentItem[] {
  if (quarterId === '2026-Q3') {
    return buildLiveQ3QuarterlyDocuments(liveNcrs, liveAudits, liveTraining, liveJobs, liveAssets);
  }
  return HISTORICAL_QUARTER_DOCUMENTS[quarterId] || [];
}
