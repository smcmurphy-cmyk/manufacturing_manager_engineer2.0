import React, { useState, useEffect } from 'react';
import { Activity, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface WipJob {
  JobId: string;
  StationSequence: number;
  StationName: string;
  StartedAt: string | null;
  CompletedAt: string | null;
}

const STATIONS = [
  { seq: 10, name: 'Assembly' },
  { seq: 20, name: 'AOI' },
  { seq: 30, name: 'Touchup' },
  { seq: 40, name: 'Test' },
  { seq: 50, name: 'Final AOI' },
  { seq: 60, name: 'QA' }
];

export const LiveWipDashboard: React.FC = () => {
  const [activeJobs, setActiveJobs] = useState<WipJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActiveWip = async () => {
    try {
      const res = await fetch('/api/wip/active');
      if (res.ok) {
        const data = await res.json();
        setActiveJobs(data);
      }
    } catch (err) {
      console.error('Failed to fetch WIP data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveWip();
    // Auto-refresh the board every 30 seconds
    const interval = setInterval(fetchActiveWip, 30000);
    return () => clearInterval(interval);
  }, []);

  // Helper to calculate time spent at the station
  const getTimeInStation = (startedAt: string) => {
    const start = new Date(startedAt).getTime();
    const now = new Date().getTime();
    const diffMins = Math.floor((now - start) / 60000);
    
    if (diffMins < 60) return `${diffMins}m`;
    const hours = Math.floor(diffMins / 60);
    return `${hours}h ${diffMins % 60}m`;
  };

  if (isLoading) {
    return <div className="flex justify-center p-12 text-slate-400">Loading shop floor data...</div>;
  }

  return (
    <div className="min-h-[80vh] flex flex-col bg-slate-900 rounded-2xl shadow-2xl overflow-hidden font-sans border border-slate-700">
      
      {/* Header */}
      <div className="bg-slate-950 p-6 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/20 flex items-center justify-center rounded-xl border border-emerald-500/30">
            <Activity className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Live WIP Board</h1>
            <p className="text-slate-400 text-sm mt-1">{activeJobs.length} Active Lots on Floor</p>
          </div>
        </div>
        <button 
          onClick={fetchActiveWip}
          className="text-xs font-semibold px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-600"
        >
          Refresh Board
        </button>
      </div>

      {/* Kanban Grid */}
      <div className="flex-1 p-6 overflow-x-auto">
        <div className="flex gap-6 min-w-max h-full">
          {STATIONS.map((station) => {
            const stationJobs = activeJobs.filter(job => job.StationSequence === station.seq);
            
            return (
              <div key={station.seq} className="w-80 flex flex-col bg-slate-800/50 rounded-xl border border-slate-700/50">
                {/* Column Header */}
                <div className="p-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/80 rounded-t-xl">
                  <h2 className="font-bold text-slate-200">
                    {station.seq} - {station.name}
                  </h2>
                  <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2.5 py-1 rounded-md">
                    {stationJobs.length}
                  </span>
                </div>

                {/* Job Cards */}
                <div className="p-3 flex-1 overflow-y-auto space-y-3">
                  {stationJobs.map(job => (
                    <div 
                      key={job.JobId} 
                      className={`p-4 rounded-lg border shadow-sm ${
                        job.CompletedAt 
                          ? 'bg-slate-800/80 border-emerald-500/30' 
                          : 'bg-slate-900 border-sky-500/30'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-sm font-bold text-white tracking-wider">{job.JobId}</span>
                        {job.CompletedAt ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Activity className="w-4 h-4 text-sky-400" />
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className={job.CompletedAt ? 'text-emerald-400/80 font-medium' : 'text-sky-400/80 font-medium'}>
                          {job.CompletedAt ? 'Queued for Next' : 'In Process'}
                        </span>
                        
                        {job.StartedAt && !job.CompletedAt && (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Clock className="w-3.5 h-3.5" />
                            {getTimeInStation(job.StartedAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {stationJobs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-24 text-slate-500/50">
                      <AlertCircle className="w-6 h-6 mb-2" />
                      <span className="text-xs font-medium">Empty Station</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};