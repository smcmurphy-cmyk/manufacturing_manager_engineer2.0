import React, { useState } from 'react';
import {
  Bell,
  Mail,
  Calendar,
  Code,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
  Send
} from 'lucide-react';
import { AssetRecord, ComplianceAudit, NotificationAlert, TrainingRecord } from '../../types';

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: AssetRecord[];
  training: TrainingRecord[];
  audits: ComplianceAudit[];
}

export const AlertsModal: React.FC<AlertsModalProps> = ({
  isOpen,
  onClose,
  assets,
  training,
  audits,
}) => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'email-preview' | 'calendar-ics' | 'python-script'>('alerts');
  const [copied, setCopied] = useState(false);
  const [selectedAlertIndex, setSelectedAlertIndex] = useState(0);

  if (!isOpen) return null;

  const today = new Date('2026-08-30');

  // Compute all alerts
  const collectedAlerts: NotificationAlert[] = [];

  // 1. Assets
  assets.forEach((a) => {
    if (Number(a.intervalDays) === 0 || a.status === 'No Calibration Necessary') {
      return;
    }
    if (!a.nextDueDate || a.nextDueDate.trim() === '') return;
    const due = new Date(a.nextDueDate);
    if (isNaN(due.getTime())) return;
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 3600 * 24));
    if (diff <= 30) {
      collectedAlerts.push({
        id: `alert-asset-${a.id}`,
        category: 'Asset Calibration',
        title: `CALIBRATION DUE: ${a.equipmentDescription} (${a.assetId})`,
        assetOrPerson: a.assetId,
        dueDate: a.nextDueDate,
        daysRemaining: diff,
        severity: diff < 0 ? 'critical' : diff <= 7 ? 'critical' : diff <= 14 ? 'warning' : 'notice',
        recipient: a.alertEmail,
        details: `Asset: ${a.assetId} - ${a.equipmentDescription}\nLocation: ${a.departmentLocation}\nInterval: ${a.intervalDays} Days\nSerial: ${a.serialNumber}`,
      });
    }
  });

  // 2. Training
  training.forEach((t) => {
    const exp = new Date(t.expirationDate);
    const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
    if (diff <= 60) {
      collectedAlerts.push({
        id: `alert-train-${t.id}`,
        category: 'Workforce Cert',
        title: `TRAINING EXPIRING: ${t.operatorName} - ${t.certificationTitle}`,
        assetOrPerson: t.operatorName,
        dueDate: t.expirationDate,
        daysRemaining: diff,
        severity: diff < 0 ? 'critical' : diff <= 14 ? 'critical' : diff <= 30 ? 'warning' : 'notice',
        recipient: t.contactEmail,
        details: `Operator: ${t.operatorName}\nRole: ${t.role}\nCertification: ${t.certificationTitle} (${t.standardLevel})`,
      });
    }
  });

  // 3. Compliance Audits
  audits.forEach((aud) => {
    const due = new Date(aud.nextDueDate);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 3600 * 24));
    if (diff <= 30) {
      collectedAlerts.push({
        id: `alert-aud-${aud.id}`,
        category: 'QMS Audit',
        title: `COMPLIANCE AUDIT DUE: ${aud.title}`,
        assetOrPerson: aud.standard,
        dueDate: aud.nextDueDate,
        daysRemaining: diff,
        severity: diff <= 14 ? 'warning' : 'notice',
        recipient: 'murphy@dyneng.com',
        details: `Event: ${aud.title}\nGoverning Standard: ${aud.standard}\nCadence: ${aud.cadence}\nAuditor: ${aud.leadAuditor}`,
      });
    }
  });

  collectedAlerts.sort((a, b) => a.daysRemaining - b.daysRemaining);

  const selectedAlert = collectedAlerts[selectedAlertIndex] || collectedAlerts[0];

  const generateIcsContent = (alert: NotificationAlert) => {
    const dateFormatted = alert.dueDate.replace(/-/g, '');
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Dynamic Engineering//Mfg Ops Engine//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${alert.id}@dynamic-eng.internal
DTSTAMP:${dateFormatted}T090000Z
DTSTART:${dateFormatted}T090000Z
DTEND:${dateFormatted}T100000Z
SUMMARY:Mfg Alert: ${alert.title}
DESCRIPTION:${alert.details.replace(/\n/g, '\\n')}
PRIORITY:1
BEGIN:VALARM
TRIGGER:-PT1440M
ACTION:DISPLAY
DESCRIPTION:Reminder: ${alert.title}
END:VALARM
END:VEVENT
END:VCALENDAR`;
  };

  const handleDownloadIcs = (alert: NotificationAlert) => {
    const content = generateIcsContent(alert);
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${alert.assetOrPerson}_due_reminder.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Outlook & Calendar Automation Engine</h3>
              <p className="text-xs text-slate-400">
                Active alerts scanner, HTML email generator, and .ics calendar sync
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 px-5 bg-slate-50 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'alerts'
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Active Alerts ({collectedAlerts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('email-preview')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'email-preview'
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Outlook Email Preview</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar-ics')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'calendar-ics'
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Outlook Calendar (.ics)</span>
          </button>

          <button
            onClick={() => setActiveTab('python-script')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'python-script'
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Local Python Runner</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {activeTab === 'alerts' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>The following items are within notification trigger thresholds (30d notice, 14d warning, 7d critical):</span>
                <span className="font-semibold text-slate-800">{collectedAlerts.length} Action Items</span>
              </div>

              <div className="space-y-2">
                {collectedAlerts.map((alert, index) => (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      alert.severity === 'critical'
                        ? 'bg-rose-50/70 border-rose-200'
                        : alert.severity === 'warning'
                        ? 'bg-amber-50/70 border-amber-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          alert.severity === 'critical'
                            ? 'bg-rose-100 text-rose-700'
                            : alert.severity === 'warning'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {alert.severity === 'critical' ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{alert.title}</span>
                          <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-white border border-slate-300 text-slate-700">
                            {alert.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 whitespace-pre-line">{alert.details}</p>
                        <p className="text-[10px] text-slate-400 mt-1">Recipient: {alert.recipient}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-900">{alert.dueDate}</div>
                        <div
                          className={`text-[10px] font-bold ${
                            alert.daysRemaining < 0
                              ? 'text-rose-600'
                              : alert.daysRemaining <= 7
                              ? 'text-rose-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {alert.daysRemaining < 0
                            ? `${Math.abs(alert.daysRemaining)}d Overdue`
                            : `${alert.daysRemaining}d Remaining`}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedAlertIndex(index);
                          setActiveTab('email-preview');
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg shadow-2xs transition-colors"
                      >
                        Preview Email
                      </button>

                      <button
                        onClick={() => handleDownloadIcs(alert)}
                        className="p-1.5 text-slate-700 hover:text-sky-700 hover:bg-sky-50 border border-slate-300 rounded-lg shadow-2xs"
                        title="Download Outlook Calendar .ics Appointment"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'email-preview' && selectedAlert && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Previewing Email for:</span>
                  <select
                    value={selectedAlertIndex}
                    onChange={(e) => setSelectedAlertIndex(Number(e.target.value))}
                    className="p-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-xs text-slate-800"
                  >
                    {collectedAlerts.map((a, i) => (
                      <option key={a.id} value={i}>
                        {a.title} ({a.daysRemaining}d)
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() =>
                    copyToClipboard(
                      `Subject: [ACTION REQUIRED] ${selectedAlert.title}\nTo: ${selectedAlert.recipient}\n\n${selectedAlert.details}`
                    )
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy Plaintext'}
                </button>
              </div>

              {/* Simulated Outlook Client Header */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-slate-100 p-3.5 border-b border-slate-200 space-y-1">
                  <div className="flex items-center text-xs">
                    <span className="w-16 font-semibold text-slate-500">From:</span>
                    <span className="text-slate-800 font-medium">Dynamic Engineering Alerts &lt;ops-engine@dynamic-eng.internal&gt;</span>
                  </div>
                  <div className="flex items-center text-xs">
                    <span className="w-16 font-semibold text-slate-500">To:</span>
                    <span className="text-slate-800 font-mono">{selectedAlert.recipient}</span>
                  </div>
                  <div className="flex items-center text-xs">
                    <span className="w-16 font-semibold text-slate-500">Subject:</span>
                    <span className="font-bold text-slate-900">
                      {selectedAlert.severity === 'critical' ? '🔴 [CRITICAL / ACTION REQUIRED]' : '🟡 [WARNING - 14 DAYS]'}{' '}
                      {selectedAlert.title}
                    </span>
                  </div>
                </div>

                {/* Simulated Outlook Body */}
                <div className="p-6 bg-white space-y-4">
                  <div className="border-b border-slate-200 pb-3">
                    <h2 className="text-base font-bold text-sky-900">Manufacturing Operations Alert System</h2>
                    <p className="text-xs text-slate-500">Dynamic Engineering (AS9100D & IPC Class 3 Facility)</p>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-50 border-l-4 border-sky-700 space-y-2">
                    <p className="font-semibold text-slate-800 text-sm">{selectedAlert.title}</p>
                    <p className="text-xs text-slate-600 whitespace-pre-line font-mono leading-relaxed">
                      {selectedAlert.details}
                    </p>
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Due Date: <strong>{selectedAlert.dueDate}</strong></span>
                      <span className="font-bold text-rose-700">{selectedAlert.daysRemaining} days remaining</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600">
                    Please perform the necessary calibration, maintenance log update, or workforce recertification course.
                    Once complete, log the update in the operational markdown specification.
                  </p>

                  <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
                    Dynamic Engineering Governance Engine • AS9100D Clause 7.1.5 Metrology Compliance
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'calendar-ics' && selectedAlert && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Outlook Calendar Event (.ics) Generator</h4>
                  <p className="text-xs text-slate-500">
                    Creates an automated 1-hour calendar appointment with a 24-hour reminder popup.
                  </p>
                </div>

                <button
                  onClick={() => handleDownloadIcs(selectedAlert)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  Download .ics File
                </button>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Event Title</span>
                    <span className="font-bold text-slate-800">{selectedAlert.title}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Scheduled Date</span>
                    <span className="font-mono font-bold text-slate-800">{selectedAlert.dueDate} (09:00 - 10:00 AM)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Reminder Alarm</span>
                    <span className="text-slate-800 font-medium">1440 Minutes (24 Hours Prior)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Calendar System</span>
                    <span className="text-slate-800 font-medium">Microsoft Outlook / Exchange / Office 365</span>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-slate-600 block mb-1">Raw iCalendar (.ics) Payload:</span>
                  <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[10px] overflow-x-auto">
                    {generateIcsContent(selectedAlert)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'python-script' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Local Outlook COM Automation Script (`run_alerts.py`)</h4>
                  <p className="text-xs text-slate-500">
                    Runs locally on Windows via Python win32com to dispatch actual Outlook emails and calendar events.
                  </p>
                </div>

                <button
                  onClick={() =>
                    copyToClipboard(`python run_alerts.py`)
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded text-slate-800"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Command
                </button>
              </div>

              <div className="p-3.5 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] space-y-2">
                <p className="text-slate-400"># 1. Install Windows Outlook COM dependencies:</p>
                <p className="text-sky-300">pip install pywin32 pyyaml</p>
                <p className="text-slate-400 pt-2"># 2. Execute alert scanner & calendar dispatcher:</p>
                <p className="text-emerald-300">python run_alerts.py</p>
                <p className="text-slate-400 pt-2"># 3. (Optional) Schedule silent 08:00 AM daily run:</p>
                <p className="text-amber-300">schtasks /create /tn "MfgOpsAlerts" /tr "python %CD%\\run_alerts.py" /sc daily /st 08:00</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-2xs"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
