export type ActiveModule = 'compliance' | 'training' | 'data-ingestion' | 'asset-maintenance' | 'quarterly-reporting';

export interface SystemConfig {
  organization: string;
  roleTitle: string;
  reportingLine: string;
  qmsStandards: string[];
  ipcStandards: string[];
  storageRoot: string;
}

// Quarterly Reporting Types
export type QuarterId = '2026-Q3' | '2026-Q2' | '2026-Q1' | '2025-Q4';

export interface QuarterPeriod {
  id: QuarterId;
  label: string;
  financialQuarter: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  totalDocuments?: number;
}

export type DocumentLifecycleStatus = 'Opened in Quarter' | 'Closed / Completed' | 'Still Active / In-Flight' | 'Action Required / Overdue';

export interface QuarterlyDocumentItem {
  id: string;
  documentNumber: string;
  title: string;
  moduleSource: 'Module 1: Compliance' | 'Module 2: Training' | 'Module 3: FAI Jobs' | 'Module 4: Assets';
  moduleKey: 'compliance' | 'training' | 'data-ingestion' | 'asset-maintenance';
  standardClause: string;
  dateOpened: string;
  dateResolved?: string;
  lifecycleStatus: DocumentLifecycleStatus;
  nativeStatus: string;
  ownerOrLead: string;
  criticality: 'High' | 'Medium' | 'Low' | 'Critical (Class 3)' | 'Major (Class 2)' | 'Minor';
  details: string;
  departmentOrLocation: string;
  rawData?: any;
}

// Module 1: Compliance & Non-Conformance Tracker
export type NCRStatus = 'Open' | 'Fixed' | 'In Development' | 'Scrap';
export type SeverityLevel = 'Critical (Class 3)' | 'Major (Class 2)' | 'Minor';

export interface NCRRecord {
  id: string;
  ncrNumber: string;
  serialNumber?: string;
  assemblyPartNumber: string;
  assemblyRevision: string;
  defectDescription: string;
  standardClause: string;
  severity: SeverityLevel;
  containmentDate: string;
  rootCauseMethod: '5-Why' | '8D' | 'Fishbone' | 'Under Investigation';
  status: NCRStatus;
  nextAction: string;
  owner: string;
}

export interface ComplianceAudit {
  id: string;
  title: string;
  standard: string;
  cadence: string;
  lastCompleted: string;
  nextDueDate: string;
  status: 'Compliant' | 'Due Soon' | 'Action Required';
  leadAuditor: string;
}

// Module 2: Workforce Competency & Training Matrix
export type CertStatus = 'Valid' | 'Expiring Soon' | 'Expired';

export interface TrainingRecord {
  id: string;
  operatorName: string;
  role: string;
  certificationTitle: string;
  standardLevel: string; // e.g. IPC-A-610 Class 3 CIS, J-STD-001 CIT
  issueDate: string;
  expirationDate: string;
  status: CertStatus;
  badgeNumber: string;
  contactEmail: string;
  notes?: string;
}

// Module 3: FAI validation & Logging
export type PipelineStatus = 'Edit' | 'Draft' | 'Validation Complete' | 'Dispatched to Line' | 'Hold';
export type DueDateCategory = 'ASAP' | 'Development' | 'Stock';

export interface EngineeringJob {
  id: string;
  jobId: string; // FAI#
  dueDate: DueDateCategory | string;
  projectCode?: string;
  customer?: string;
  quantity?: number | string;
  assemblyName: string;
  partNumber: string;
  revision: string;
  targetBuildDate?: string; // Build Start Date
  startTime?: string;
  totalBuildTimeHours?: number | string;
  status: PipelineStatus;
  checks: {
    xyOdb: boolean;
    stencilBotTop: boolean;
    spiBotTop: boolean;
    pnpBotTop: boolean;
    aoiBotTop: boolean;
    aoiFinalBotTop: boolean;
  };
  passedTest?: 'Yes' | 'No';
  passedTestDate?: string;
  passedQa?: 'Yes' | 'No';
  passedQaDate?: string;
  smtLine?: string;
  notes?: string;
}

// Module 4: Asset PM, Calibration & ESD Alert Engine
export type AssetStatus = 'Operational / Calibrated' | 'Calibration Due Soon' | 'Cal Overdue' | 'Out of Service';

export interface AssetRecord {
  id: string;
  assetId: string;
  equipmentDescription: string;
  departmentLocation: string;
  intervalDays: number;
  lastCompleted: string;
  nextDueDate: string;
  status: AssetStatus;
  assignedOwner: string;
  alertEmail: string;
  serialNumber: string;
}

export interface NotificationAlert {
  id: string;
  category: 'Asset Calibration' | 'Workforce Cert' | 'QMS Audit' | 'Engineering Gate';
  title: string;
  assetOrPerson: string;
  dueDate: string;
  daysRemaining: number;
  severity: 'critical' | 'warning' | 'notice';
  recipient: string;
  details: string;
}
