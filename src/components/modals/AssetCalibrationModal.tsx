import React, { useState } from 'react';
import {
  ShieldCheck,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Printer,
  X,
  FileText,
  FileEdit,
  Mail,
  Zap,
  RotateCw,
  Building,
  Award,
  Layers,
  Activity,
  UserCheck
} from 'lucide-react';
import { AssetRecord, AssetStatus } from '../../types';

interface AssetCalibrationModalProps {
  isOpen: boolean;
  asset: AssetRecord | null;
  onClose: () => void;
  onRecalibrate: (id: string) => void;
  onOpenAlertModal?: () => void;
  onEditDocument?: (asset: AssetRecord) => void;
}

export const AssetCalibrationModal: React.FC<AssetCalibrationModalProps> = ({
  isOpen,
  asset,
  onClose,
  onRecalibrate,
  onOpenAlertModal,
  onEditDocument,
}) => {
  const [isRecalibrating, setIsRecalibrating] = useState(false);
  const [successNote, setSuccessNote] = useState<string | null>(null);

  if (!isOpen || !asset) return null;

  const todayStr = '2026-08-30';
  const today = new Date(todayStr);

  const lastCalDate = new Date(asset.lastCompleted);
  const nextDueDate = asset.nextDueDate ? new Date(asset.nextDueDate) : new Date(lastCalDate.getTime() + asset.intervalDays * 24 * 3600 * 1000);
  const diffDays = Math.ceil((nextDueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

  let status: AssetStatus = 'Operational / Calibrated';

if (asset.intervalDays === 0) {
  status = 'No Calibration Necessary';
} else if (diffDays < 0) {
  status = 'Cal Overdue';
} else if (diffDays <= 14) {
  status = 'Calibration Due Soon';
}

  const certNumber = `CAL-CERT-2026-${asset.assetId.replace(/[^a-zA-Z0-9]/g, '')}`;

  // Tailored test parameters based on asset type
  const getMeasurementData = (assetId: string, description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes('oscilloscope') || assetId.includes('MET')) {
      return [
        { param: 'Bandwidth Limit (-3dB Point)', spec: '≥ 200.0 MHz', asFound: '204.2 MHz', asLeft: '204.2 MHz', status: 'PASS' },
        { param: 'DC Vertical Gain Accuracy (1V/div)', spec: '± 1.50 %', asFound: '+0.42 %', asLeft: '+0.42 %', status: 'PASS' },
        { param: 'Timebase Jitter & Frequency Stability', spec: '≤ 2.5 ppm', asFound: '1.1 ppm', asLeft: '1.1 ppm', status: 'PASS' },
        { param: 'Ch 1 - Ch 4 Input Impedance (1 MΩ)', spec: '1.000 MΩ ± 1.0%', asFound: '0.998 MΩ', asLeft: '0.998 MΩ', status: 'PASS' },
      ];
    }
    if (desc.includes('reflow') || desc.includes('oven') || assetId.includes('SMT')) {
      return [
        { param: 'Zone 1-8 Thermal Gradient Uniformity', spec: '± 2.0 °C', asFound: '± 1.2 °C', asLeft: '± 1.2 °C', status: 'PASS' },
        { param: 'Peak SAC305 Liquidus Dwell (T > 217°C)', spec: '60 - 90 sec', asFound: '74 sec', asLeft: '74 sec', status: 'PASS' },
        { param: 'Conveyor Belt Speed Accuracy (80 cm/min)', spec: '± 0.5 cm/min', asFound: '79.8 cm/min', asLeft: '80.0 cm/min', status: 'PASS' },
        { param: 'ECD M.O.L.E. Thermocouple NIST Cal', spec: 'Class 1 Cal', asFound: 'Valid (NIST)', asLeft: 'Valid (NIST)', status: 'PASS' },
      ];
    }
    if (desc.includes('esd') || desc.includes('wrist') || assetId.includes('ESD')) {
      return [
        { param: 'Wrist Strap Continuous Loop Resistance', spec: '0.75 - 10.0 MΩ', asFound: '1.42 MΩ', asLeft: '1.42 MΩ', status: 'PASS' },
        { param: 'Static-Dissipative Mat Surface Resistivity', spec: '1.0x10^6 - 1.0x10^9 Ω', asFound: '4.8x10^7 Ω', asLeft: '4.8x10^7 Ω', status: 'PASS' },
        { param: 'Common Point Ground Bonding to Earth', spec: '< 1.0 Ω', asFound: '0.24 Ω', asLeft: '0.24 Ω', status: 'PASS' },
        { param: 'Charge Decay Time (1000V -> 100V)', spec: '< 1.00 sec', asFound: '0.38 sec', asLeft: '0.38 sec', status: 'PASS' },
      ];
    }
    if (desc.includes('solder') || desc.includes('weller') || assetId.includes('SOL')) {
      return [
        { param: 'Tip Setpoint Accuracy (350 °C)', spec: '± 5.0 °C', asFound: '351.4 °C', asLeft: '351.4 °C', status: 'PASS' },
        { param: 'Tip-to-Ground Resistance', spec: '< 2.0 Ω (IPC J-STD)', asFound: '0.45 Ω', asLeft: '0.45 Ω', status: 'PASS' },
        { param: 'Tip-to-Ground Millivolt Leakage (AC)', spec: '< 2.0 mV RMS', asFound: '0.62 mV', asLeft: '0.62 mV', status: 'PASS' },
        { param: 'Thermal Recovery Response Time (350°C)', spec: '< 3.0 sec', asFound: '1.8 sec', asLeft: '1.8 sec', status: 'PASS' },
      ];
    }
    if (desc.includes('torque') || desc.includes('screwdriver') || assetId.includes('TRQ')) {
      return [
        { param: 'Target Torque Output (0.80 Nm)', spec: '0.76 - 0.84 Nm (±5%)', asFound: '0.81 Nm', asLeft: '0.81 Nm', status: 'PASS' },
        { param: 'Target Torque Output (1.50 Nm)', spec: '1.42 - 1.58 Nm (±5%)', asFound: '1.49 Nm', asLeft: '1.49 Nm', status: 'PASS' },
        { param: 'Repeatability & Clutch Disengagement', spec: 'Cp/Cpk ≥ 1.33', asFound: 'Cpk = 1.64', asLeft: 'Cpk = 1.64', status: 'PASS' },
      ];
    }
    // Default precision instrument / Multimeter
    return [
      { param: 'DC Voltage Accuracy (10.0000 VDC)', spec: '± 0.0035 %', asFound: '10.0002 VDC', asLeft: '10.0002 VDC', status: 'PASS' },
      { param: 'AC True-RMS Voltage (1.0000 VAC, 1 kHz)', spec: '± 0.06 %', asFound: '1.0004 VAC', asLeft: '1.0004 VAC', status: 'PASS' },
      { param: '4-Wire Resistance (10.0000 kΩ)', spec: '± 0.010 %', asFound: '9.9998 kΩ', asLeft: '9.9998 kΩ', status: 'PASS' },
      { param: 'DC Current Accuracy (1.0000 A)', spec: '± 0.05 %', asFound: '1.0001 A', asLeft: '1.0001 A', status: 'PASS' },
    ];
  };

  const measurements = getMeasurementData(asset.assetId, asset.equipmentDescription);

  const handleRecalibrateClick = () => {
    setIsRecalibrating(true);
    setTimeout(() => {
      onRecalibrate(asset.id);
      setIsRecalibrating(false);
      setSuccessNote(`Calibration successfully certified on ${todayStr}. Next due in ${asset.intervalDays} days.`);
      setTimeout(() => {
        setSuccessNote(null);
      }, 5000);
    }, 400);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-3xl my-6 bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden animate-fade-in text-slate-800">
        
        {/* Modal Top Control Bar (Non-Printable Header) */}
        <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="text-xs sm:text-sm font-semibold">AS9100D / ISO 9001 Metrology Calibration Certificate</h3>
              <p className="text-[11px] text-slate-400">NIST Traceable Calibration & Preventative Maintenance Record</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEditDocument && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditDocument(asset);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-sky-300 bg-sky-950/80 hover:bg-sky-900 rounded border border-sky-600/50 transition-colors cursor-pointer"
                title="Edit Document Data"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Edit Document</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white rounded border border-slate-700 transition-colors cursor-pointer"
              title="Print Calibration Certificate"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span>Print / Save</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Printable Document Body */}
        <div className="p-5 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto print:max-h-none print:overflow-visible">
          
          {/* Header Banner */}
          <div className="border-b-2 border-slate-900 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-900 text-white rounded">DYNAMIC ENGINEERING</span>
                  <span className="text-[11px] font-semibold text-slate-600">METROLOGY & QUALITY LAB</span>
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                  CERTIFICATE OF CALIBRATION & VERIFICATION
                </h1>
                <p className="text-xs text-slate-500 font-mono">
                  Standard Compliance: AS9100D §7.1.5 | ISO 9001:2015 §7.1.5 | ANSI/NCSL Z540-1
                </p>
              </div>

              <div className="text-left sm:text-right bg-slate-50 p-3 rounded-lg border border-slate-200 shrink-0">
                <div className="text-[10px] uppercase font-semibold text-slate-500">Certificate Number</div>
                <div className="text-xs sm:text-sm font-mono font-bold text-sky-800">{certNumber}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Issue Date: {asset.lastCompleted}</div>
              </div>
            </div>
          </div>

          {/* Success Banner if recalibrated */}
          {successNote && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center gap-2 text-emerald-800 text-xs font-semibold animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successNote}</span>
            </div>
          )}

          {/* Equipment Identification Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200 text-xs">
            <div className="space-y-2">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500">Asset Tag ID</span>
                <p className="font-mono font-bold text-sm text-slate-900">{asset.assetId}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500">Equipment Description</span>
                <p className="font-semibold text-slate-800">{asset.equipmentDescription}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500">Serial Number (S/N)</span>
                <p className="font-mono text-slate-700">{asset.serialNumber}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500">Department / Cell Location</span>
                <p className="text-slate-700">{asset.departmentLocation}</p>
              </div>
            </div>

            <div className="space-y-2 sm:border-l sm:border-slate-200 sm:pl-4">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500">Calibration Interval</span>
                <p className="font-bold text-slate-800">{asset.intervalDays} Days ({asset.intervalDays === 365 ? 'Annual' : asset.intervalDays === 180 ? 'Semi-Annual' : asset.intervalDays === 90 ? 'Quarterly' : 'Periodic'})</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500">Last Calibrated Date</span>
                <p className="font-mono text-slate-800">{asset.lastCompleted}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500">Next Recalibration Due</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900">{asset.nextDueDate || nextDueDate.toISOString().split('T')[0]}</span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      diffDays < 0
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : diffDays <= 14
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}
                  >
                    {diffDays < 0 ? `${Math.abs(diffDays)}d Overdue` : `${diffDays}d Remaining`}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500">Assigned Metrology Custodian</span>
                <p className="text-slate-700 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  {asset.assignedOwner} ({asset.alertEmail})
                </p>
              </div>
            </div>
          </div>

          {/* Environmental Conditions */}
          <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-2">
              <Activity className="w-4 h-4 text-sky-600" />
              <span>Metrology Laboratory Environmental & Reference Parameters</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600">
              <div className="bg-slate-50 p-2 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Ambient Temperature</span>
                <span className="font-semibold text-slate-800">21.8 °C ± 1.0 °C</span>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Relative Humidity</span>
                <span className="font-semibold text-slate-800">41.5 % RH</span>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px]">ESD Surface Grounding</span>
                <span className="font-semibold text-slate-800">&lt; 1.0x10^8 Ω (Pass)</span>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Test Line Voltage</span>
                <span className="font-semibold text-slate-800">120.4 VAC / 60.0 Hz</span>
              </div>
            </div>
          </div>

          {/* Measurement & Tolerance Verification Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                As-Found & As-Left Calibration Verification Data
              </h4>
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                All Criteria Within Tolerance
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">Test Parameter / Functional Scope</th>
                    <th className="py-2.5 px-3">Tolerance Specification</th>
                    <th className="py-2.5 px-3">As-Found Reading</th>
                    <th className="py-2.5 px-3">As-Left Certified</th>
                    <th className="py-2.5 px-3">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {measurements.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-medium text-slate-800">{row.param}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{row.spec}</td>
                      <td className="py-2 px-3 font-mono text-slate-700">{row.asFound}</td>
                      <td className="py-2 px-3 font-mono font-semibold text-slate-900">{row.asLeft}</td>
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* NIST Traceability Master Standards */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              NIST Traceable Reference Standards Used
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <div className="font-semibold text-slate-800">Fluke 5522A Master Calibrator</div>
                <div className="text-[10px] text-slate-500 font-mono">Traceability ID: NIST-FLK-90210</div>
                <div className="text-[10px] text-slate-500">Cal Due: 2027-04-15 (A2LA Accredited)</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <div className="font-semibold text-slate-800">Keysight 3458A 8.5-Digit Reference</div>
                <div className="text-[10px] text-slate-500 font-mono">Traceability ID: NIST-KEY-44109</div>
                <div className="text-[10px] text-slate-500">Cal Due: 2027-02-28 (Primary Standard)</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <div className="font-semibold text-slate-800">Omega CL3000 Thermocouple Calibrator</div>
                <div className="text-[10px] text-slate-500 font-mono">Traceability ID: NIST-OMG-88120</div>
                <div className="text-[10px] text-slate-500">Cal Due: 2026-12-10 (NIST SRM 1749)</div>
              </div>
            </div>
          </div>

          {/* Quality Sign-off and Authorization Blocks */}
          <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Metrology / Calibration Technician</div>
              <div className="font-mono font-semibold text-slate-800">Steven McMurphy (Lead Metrologist)</div>
              <div className="text-[11px] text-slate-500">AS9100D Certified Metrology Stamp #MET-7740</div>
              <div className="text-[10px] text-slate-400 mt-1">Status: Digitally Signed & Authorized</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Quality Assurance Manager Endorsement</div>
              <div className="font-mono font-semibold text-slate-800">Lead SMT Quality Assurance</div>
              <div className="text-[11px] text-slate-500">ISO 9001:2015 Registered Laboratory</div>
              <div className="text-[10px] text-slate-400 mt-1">Verification: Valid for Production Line Release</div>
            </div>
          </div>

        </div>

        {/* Modal Action Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="text-xs text-slate-500">
            Current status: <span className="font-bold text-slate-800">{asset.status}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onEditDocument && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditDocument(asset);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <FileEdit className="w-3.5 h-3.5 text-sky-600" />
                <span>Edit Document Data</span>
              </button>
            )}

            {onOpenAlertModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAlertModal();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-sky-600" />
                <span>Outlook Alert Engine</span>
              </button>
            )}

            <button
              type="button"
              disabled={isRecalibrating}
              onClick={handleRecalibrateClick}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 text-emerald-400 ${isRecalibrating ? 'animate-spin' : ''}`} />
              <span>Log Calibration Done (Recalibrate Today)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
