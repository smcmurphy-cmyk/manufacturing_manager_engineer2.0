export type ActiveModule = 'compliance' | 'training' | 'data-ingestion' | 'asset-maintenance';

export interface SystemConfig {
  organization: string;
  roleTitle: string;
  reportingLine: string;
  qmsStandards: string[];
  ipcStandards: string[];
  storageRoot: string;
}

// Module 1: Compliance & Non-Conformance Tracker
export type NCRStatus = 'Open' | 'Closed' | 'In development' | 'Scrap';
export type SeverityLevel = 'Critical (Class 3)' | 'Major (Class 2)' | 'Minor';

export interface NCRRecord {
  id: string;
  ncrNumber: string;
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
export type PipelineStatus = 'Draft' | 'Validation Complete' | 'Dispatched to Line' | 'Hold';
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
