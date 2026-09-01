import { jsPDF } from 'jspdf';
import { NCRRecord } from '../types';

export interface NcrPdfOptions {
  ncr: NCRRecord;
  serverPath?: string;
  fileName?: string;
  editor?: string;
  rootCauseNotes?: string;
  correctiveActionNotes?: string;
  timestamp?: string;
}

export function generateNcrPdf(options: NcrPdfOptions): jsPDF {
  const {
    ncr,
    serverPath,
    fileName,
    editor = ncr.lastEditedBy || ncr.owner || 'Quality Assurance',
    rootCauseNotes = ncr.rootCauseAnalysis || 'Root cause investigation performed in accordance with AS9100D §8.7 and IPC-A-610 standards.',
    correctiveActionNotes = ncr.correctiveActionPlan || ncr.nextAction || 'Implement verified containment and process parameter updates.',
    timestamp = new Date().toLocaleString(),
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Accent Line (Rose for critical, Amber for major/in dev, Emerald for fixed)
  if (ncr.status === 'Fixed') {
    doc.setFillColor(16, 185, 129); // emerald-500
  } else if (ncr.severity === 'Critical (Class 3)') {
    doc.setFillColor(244, 63, 94); // rose-500
  } else {
    doc.setFillColor(245, 158, 11); // amber-500
  }
  doc.rect(0, 28, pageWidth, 2, 'F');

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('NON-CONFORMANCE REPORT (NCR) & CAPA RECORD', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(186, 230, 253); // sky-200
  doc.text('AS9100D §8.7 Control of Nonconforming Outputs  |  IPC-A-610 Class 3 / J-STD-001', margin, 18);
  doc.text(`NCR #: ${ncr.ncrNumber}  |  Status: ${ncr.status.toUpperCase()}  |  Archived: ${timestamp}`, margin, 24);

  let y = 38;

  // Section 1: Hardware Identification & Containment
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(30, 41, 59); // slate-800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('1. HARDWARE IDENTIFICATION & DISCREPANCY PROFILE', margin + 3, y + 5);

  y += 11;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const col1X = margin + 2;
  const col2X = margin + (contentWidth / 2) + 2;

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.text('NCR Number:', col1X, y);
  doc.setFont('helvetica', 'normal');
  doc.text(ncr.ncrNumber, col1X + 32, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Severity Class:', col2X, y);
  doc.setFont('helvetica', 'normal');
  doc.text(ncr.severity, col2X + 30, y);

  y += 6;
  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.text('Assembly Part #:', col1X, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${ncr.assemblyPartNumber} (${ncr.assemblyRevision})`, col1X + 32, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Current Status:', col2X, y);
  doc.setFont('helvetica', 'normal');
  doc.text(ncr.status, col2X + 30, y);

  y += 6;
  // Row 3
  doc.setFont('helvetica', 'bold');
  doc.text('Board Serial (S/N):', col1X, y);
  doc.setFont('helvetica', 'normal');
  doc.text(ncr.serialNumber || 'N/A (Batch/Lot Level)', col1X + 32, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Containment Date:', col2X, y);
  doc.setFont('helvetica', 'normal');
  doc.text(ncr.containmentDate || 'N/A', col2X + 30, y);

  y += 6;
  // Row 4
  doc.setFont('helvetica', 'bold');
  doc.text('Standard Clause:', col1X, y);
  doc.setFont('helvetica', 'normal');
  doc.text(ncr.standardClause, col1X + 32, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Assigned Owner:', col2X, y);
  doc.setFont('helvetica', 'normal');
  doc.text(ncr.owner, col2X + 30, y);

  y += 9;

  // Section 2: Defect Description & Non-Conformance Evidence
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('2. DEFECT DESCRIPTION & OBJECTIVE NON-CONFORMANCE EVIDENCE', margin + 3, y + 5);

  y += 11;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const defectLines = doc.splitTextToSize(ncr.defectDescription, contentWidth - 4);
  doc.text(defectLines, margin + 2, y);
  y += defectLines.length * 4.5 + 4;

  // Section 3: Root Cause Analysis
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`3. ROOT CAUSE ANALYSIS [METHODOLOGY: ${ncr.rootCauseMethod.toUpperCase()}]`, margin + 3, y + 5);

  y += 11;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const rootCauseLines = doc.splitTextToSize(rootCauseNotes, contentWidth - 4);
  doc.text(rootCauseLines, margin + 2, y);
  y += rootCauseLines.length * 4.5 + 4;

  // Section 4: Containment, Corrective Action Plan & CAPA
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('4. IMMEDIATE CONTAINMENT & CORRECTIVE / PREVENTATIVE ACTIONS (CAPA)', margin + 3, y + 5);

  y += 11;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const capaLines = doc.splitTextToSize(correctiveActionNotes, contentWidth - 4);
  doc.text(capaLines, margin + 2, y);
  y += capaLines.length * 4.5 + 4;

  // Section 5: Modification & Audit Trail Log (Exact Dates & Times)
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('5. AUDIT TRAIL, RECORD REVISIONS & MODIFICATION TIMESTAMPS', margin + 3, y + 5);

  y += 11;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  // Table header for audit trail
  doc.setFillColor(226, 232, 240); // slate-200
  doc.rect(margin, y, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Date & Time (UTC/Local)', margin + 2, y + 3.5);
  doc.text('Author / Role', margin + 45, y + 3.5);
  doc.text('Change Details & Lifecycle Status', margin + 90, y + 3.5);
  y += 6;

  const historyEntries = ncr.editHistory && ncr.editHistory.length > 0
    ? ncr.editHistory
    : [
        {
          timestamp: ncr.createdAt || ncr.containmentDate,
          editedBy: ncr.owner || 'Quality Assurance',
          summary: 'Initial NCR log creation and containment baseline.',
        },
        ...(ncr.lastEditedAt
          ? [
              {
                timestamp: ncr.lastEditedAt,
                editedBy: ncr.lastEditedBy || editor,
                summary: `NCR record updated; status: ${ncr.status}.`,
              },
            ]
          : []),
      ];

  doc.setFont('helvetica', 'normal');
  historyEntries.slice(0, 4).forEach((entry) => {
    doc.setTextColor(51, 65, 85);
    doc.text(entry.timestamp, margin + 2, y + 3.5);
    doc.text((entry.editedBy || 'Quality Staff').substring(0, 20), margin + 45, y + 3.5);
    const summaryText = doc.splitTextToSize(entry.summary || 'Record modified', contentWidth - 92);
    doc.text(summaryText[0] || 'Record modified', margin + 90, y + 3.5);
    y += 5.5;
  });

  y += 2;

  // Section 6: Quality Assurance Sign-Off
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('6. QUALITY ENGINEERING VERIFICATION & CONCURRENCE', margin + 3, y + 5);

  y += 11;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  doc.text(`Reviewed & Verified By: ${editor}`, margin + 2, y);
  doc.text(`Sign-off Timestamp: ${timestamp}`, col2X, y);
  y += 5;
  doc.text('QMS Authorization: AS9100D §8.7 / IPC-A-610 Certified Delegated Quality Authority', margin + 2, y);
  doc.text('Conformance Decision: Disposition verified & closed in compliance matrix.', col2X, y);

  // Footer Banner
  const footerY = pageHeight - 15;
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Dynamic Engineering Operations — AS9100D QMS & IPC-A-610 Quality Records', margin, footerY + 4);

  if (serverPath) {
    const displayPath = `${serverPath}\\${fileName || `${ncr.ncrNumber}.pdf`}`;
    doc.text(`Host Storage Path: ${displayPath}`, margin, footerY + 8);
  } else {
    doc.text(`Host Storage Path: Reports\\NCRs\\${fileName || `${ncr.ncrNumber}.pdf`}`, margin, footerY + 8);
  }

  doc.text(`Page 1 of 1  |  Generated: ${timestamp}`, pageWidth - margin - 45, footerY + 4);

  return doc;
}
