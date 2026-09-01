/**
 * Shared Application Path Configurations
 * Centralized report directory routing for AS9100D QMS modules
 * (FAI Signoffs, Quality QA, Dispatch, AOI/SPI logs, Asset Maintenance, Training)
 */

// Base Reports Directory from environment variable or standard default
export const BASE_REPORTS_DIR: string =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_REPORTS_DIR) ||
  'C:\\Users\\smcmu\\OneDrive\\Desktop\\Reports';

export const APP_PATHS = {
  // Base Root Directory
  REPORTS_DIR: BASE_REPORTS_DIR,

  // Module-Specific Storage Destinations
  FAI_REPORTS: `${BASE_REPORTS_DIR}\\FAI`,
  AUDIT_REPORTS: `${BASE_REPORTS_DIR}\\Audits`,
  NCR_REPORTS: `${BASE_REPORTS_DIR}\\NCRs`,
  COMPLIANCE_REPORTS: `${BASE_REPORTS_DIR}\\Compliance`,
  QA_REPORTS: `${BASE_REPORTS_DIR}\\QA`,
  DISPATCH_REPORTS: `${BASE_REPORTS_DIR}\\Dispatch`,
  MAINTENANCE_REPORTS: `${BASE_REPORTS_DIR}\\Maintenance`,
  CALIBRATION_REPORTS: `${BASE_REPORTS_DIR}\\Calibration`,
  AOI_SPI_REPORTS: `${BASE_REPORTS_DIR}\\AOI_SPI_Logs`,
  TRAINING_REPORTS: `${BASE_REPORTS_DIR}\\Training`,
} as const;

/**
 * Helper to build custom subfolder path under the configured base reports directory
 */
export function getReportPath(moduleSubdir: string): string {
  const cleanSubdir = moduleSubdir.replace(/^[/\\]+/, '');
  // Format with Windows separator if base looks like a Windows path, else POSIX
  const isWindows = BASE_REPORTS_DIR.includes('\\') || BASE_REPORTS_DIR.includes(':');
  const separator = isWindows ? '\\' : '/';
  return `${BASE_REPORTS_DIR}${separator}${cleanSubdir}`;
}
