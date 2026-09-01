import { jsPDF } from 'jspdf';
import { ComplianceAudit } from '../types';

export interface AuditPdfOptions {
  audit: ComplianceAudit;
  serverPath?: string;
  fileName?: string;
  leadAuditor?: string;
  scope?: string;
  findings?: string;
  correctiveActions?: string;
  notes?: string;
  timestamp?: string;
}

export function generateAuditPdf(options: AuditPdfOptions): jsPDF {
  const {
    audit,
    serverPath,
    fileName,
    leadAuditor = audit.leadAuditor || 'Lead QMS Auditor',
    scope = audit.scope || 'Quality Management System & Process Workmanship Verification',
    findings = audit.findings || 'All audited processes meet AS9100D §9.2 / ISO 9001 requirements with continuous conformity demonstrated.',
    correctiveActions = audit.correctiveActions || 'No major non-conformances identified. Continuous monitoring through scheduled surveillance.',
    notes = audit.notes || '',
    timestamp = new Date().toLocaleString(),
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Accent Line
  doc.setFillColor(14, 165, 233); // sky-500
  doc.rect(0, 28, pageWidth, 2, 'F');

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('INTERNAL AUDIT & MANAGEMENT REVIEW EVENT REPORT', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(186, 230, 253); // sky-200
  doc.text('AS9100D §9.2 / ISO 9001:2015 High-Reliability Aerospace Quality System', margin, 18);
  doc.text(`Doc ID: AUD-${audit.id.toUpperCase()}  |  Standard: ${audit.standard}  |  Generated: ${timestamp}`, margin, 24);

  let y = 38;

  // Section 1: Audit Governance & Schedule
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(30, 41, 59); // slate-800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('1. AUDIT EVENT & STANDARD GOVERNANCE', margin + 3, y + 5);

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const col1X = margin + 2;
  const col2X = margin + (contentWidth / 2) + 2;

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.text('Audit Event Title:', col1X, y);
  doc.setFont('helvetica', 'normal');
  doc.text(audit.title, col1X + 32, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Audit Cadence:', col2X, y);
  doc.setFont('helvetica', 'normal');
  doc.text(audit.cadence, col2X + 30, y);

  y += 6;
  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.text('Governing Standard:', col1X, y);
  doc.setFont('helvetica', 'normal');
  doc.text(audit.standard, col1X + 32, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Lead / Auditor:', col2X, y);
  doc.setFont('helvetica', 'normal');
  doc.text(leadAuditor, col2X + 30, y);

  y += 6;
  // Row 3
  doc.setFont('helvetica', 'bold');
  doc.text('Last Completed Date:', col1X, y);
  doc.setFont('helvetica', 'normal');
  doc.text(audit.lastCompleted || 'N/A', col1X + 32, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Next Due Date:', col2X, y);
  doc.setFont('helvetica', 'normal');
  doc.text(audit.nextDueDate || 'N/A', col2X + 30, y);

  y += 6;
  // Row 4 - Status
  doc.setFont('helvetica', 'bold');
  doc.text('Conformity Status:', col1X, y);

  if (audit.status === 'Compliant') {
    doc.setTextColor(16, 185, 129); // emerald
    doc.text('● COMPLIANT / IN GOOD STANDING', col1X + 32, y);
  } else if (audit.status === 'Due Soon') {
    doc.setTextColor(217, 119, 6); // amber
    doc.text('▲ DUE SOON (Within Surveillance Window)', col1X + 32, y);
  } else {
    doc.setTextColor(225, 29, 72); // rose
    doc.text('■ ACTION REQUIRED / OVERDUE', col1X + 32, y);
  }
  doc.setTextColor(51, 65, 85);

  y += 10;

  // Section 2: Audit Scope & Process Areas
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('2. AUDIT SCOPE, APPLICABLE WORKSTATIONS & PROCESSES', margin + 3, y + 5);

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const splitScope = doc.splitTextToSize(`Audit Scope: ${scope}`, contentWidth - 6);
  doc.text(splitScope, margin + 3, y);
  y += splitScope.length * 4.2 + 3;

  // Section 3: Findings, Evidence & Workmanship Observations
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('3. FINDINGS, EVIDENCE & COMPLIANCE OBSERVATIONS', margin + 3, y + 5);

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const splitFindings = doc.splitTextToSize(`Audit Findings: ${findings}`, contentWidth - 6);
  doc.text(splitFindings, margin + 3, y);
  y += splitFindings.length * 4.2 + 2;

  if (correctiveActions) {
    const splitCA = doc.splitTextToSize(`Corrective Actions / Next Steps: ${correctiveActions}`, contentWidth - 6);
    doc.text(splitCA, margin + 3, y);
    y += splitCA.length * 4.2 + 2;
  }

  if (notes) {
    const splitNotes = doc.splitTextToSize(`Auditor Notes: ${notes}`, contentWidth - 6);
    doc.text(splitNotes, margin + 3, y);
    y += splitNotes.length * 4.2 + 2;
  }

  y += 2;

  // Section 4: Server Storage & Host File Destination
  if (serverPath || fileName) {
    doc.setFillColor(239, 246, 255); // sky-50
    doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'F');
    doc.setDrawColor(186, 230, 253);
    doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'S');

    doc.setTextColor(3, 105, 161);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('HOST SERVER ARCHIVE DESTINATION:', margin + 3, y + 4.5);

    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    const fullPathStr = `${serverPath || 'C:\\Users\\smcmu\\OneDrive\\Desktop\\Reports\\Audits'}\\${fileName || `AUDIT_${audit.id}.pdf`}`;
    doc.text(fullPathStr, margin + 3, y + 9);

    y += 16;
  } else {
    y += 4;
  }

  // Section 5: Authorization & Sign-Off Blocks
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('4. AUDIT SIGN-OFF & QUALITY ASSURANCE APPROVAL', margin + 3, y + 5);

  y += 10;

  const signBoxWidth = (contentWidth - 6) / 2;

  // Sign Box 1: Lead Auditor
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, signBoxWidth, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('LEAD AUDITOR SIGNATURE & CONCURRENCE', margin + 3, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Lead Auditor: ${leadAuditor}`, margin + 3, y + 10);
  doc.text(`Status: ${audit.status}`, margin + 3, y + 14);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text(`Electronically verified on: ${timestamp}`, margin + 3, y + 19);

  // Sign Box 2: Quality Manager / Executive Review
  const box2X = margin + signBoxWidth + 6;
  doc.setDrawColor(203, 213, 225);
  doc.rect(box2X, y, signBoxWidth, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('QUALITY MANAGEMENT APPROVAL', box2X + 3, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Reviewed by: Director of Quality Assurance', box2X + 3, y + 10);
  doc.text('Standard: AS9100D §9.2 Compliance Verified', box2X + 3, y + 14);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text(`Archived to QMS records on: ${timestamp.split(',')[0]}`, box2X + 3, y + 19);

  // Document Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Dynamic Engineering Operations — AS9100D & ISO 9001 Controlled QMS Document', margin, pageHeight - 8);
  doc.text('Page 1 of 1', pageWidth - margin - 15, pageHeight - 8);

  return doc;
}
