import React, { useState, useEffect } from 'react';
import {
  FolderArchive,
  HardDrive,
  Download,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  RefreshCw,
  FileText,
  Copy,
  Check,
} from 'lucide-react';

interface ArchiveLogItem {
  id: string;
  jobId: string;
  assemblyName: string;
  revision: string;
  customer?: string;
  totalBuildTimeHours?: number | string;
  serverPath: string;
  fileName: string;
  fullPath: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  operatorName: string;
  loggedAt: string;
  status: string;
}

interface FaiArchiveHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FaiArchiveHistoryModal: React.FC<FaiArchiveHistoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [history, setHistory] = useState<ArchiveLogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchHistory = () => {
    setIsLoading(true);
    fetch('/api/fai/history')
      .then((res) => res.json())
      .then((data) => {
        setHistory(data.history || []);
      })
      .catch((err) => {
        console.error('Failed to load archive history:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyPath = (pathStr: string, id: string) => {
    navigator.clipboard.writeText(pathStr);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg border border-sky-500/30">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                Server FAI Archival Records
              </h3>
              <p className="text-xs text-slate-300">
                PDF completion certificates saved directly on your host filesystem
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchHistory}
              title="Refresh Records"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-sky-600" />
              <span>Loading saved server records...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <HardDrive className="w-8 h-8 mx-auto text-slate-400" />
              <p className="font-semibold text-slate-700">No FAI Reports Saved to Server Yet</p>
              <p className="text-xs max-w-sm mx-auto text-slate-500">
                When you click <strong>Log FAI Build Completion</strong> on any verified assembly job, you can configure your server storage folder and save PDF sign-offs here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="p-3.5 bg-slate-50 hover:bg-white rounded-xl border border-slate-200 transition-all shadow-2xs hover:shadow-xs space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-sky-100 text-sky-800 border border-sky-300 font-mono font-bold rounded text-xs">
                        {record.jobId}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">{record.assemblyName}</span>
                      <span className="text-slate-500 font-mono text-xs">({record.revision})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-semibold text-[10px]">
                        <CheckCircle2 className="w-3 h-3" />
                        {record.fileSizeFormatted}
                      </span>
                      <a
                        href={`/api/fai/download/${record.id}`}
                        download={record.fileName}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-sky-50 text-sky-700 border border-sky-300 rounded-lg text-xs font-semibold cursor-pointer shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                    </div>
                  </div>

                  {/* Server Location Row */}
                  <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200 text-[11px] font-mono text-slate-700 break-all select-all">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <HardDrive className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{record.fullPath}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyPath(record.fullPath, record.id)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] shrink-0 cursor-pointer font-sans"
                    >
                      {copiedId === record.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Path</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Metadata footer */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 pt-1">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {record.operatorName}
                      </span>
                      {record.totalBuildTimeHours && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-sky-600" />
                          {record.totalBuildTimeHours} hrs build time
                        </span>
                      )}
                    </div>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(record.loggedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Total Saved Archive Records: <strong>{history.length}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
