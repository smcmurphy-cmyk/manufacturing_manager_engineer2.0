import React, { useState, useEffect, useRef } from 'react';
import { 
  ScanLine, 
  CheckCircle2, 
  AlertTriangle, 
  LogIn, 
  LogOut, 
  MonitorSmartphone 
} from 'lucide-react';

const STATIONS = [
  { seq: 10, name: 'Assembly' },
  { seq: 20, name: 'AOI' },
  { seq: 30, name: 'Touchup' },
  { seq: 40, name: 'Test' },
  { seq: 50, name: 'Final AOI' },
  { seq: 60, name: 'QA' }
];

export const StationKiosk: React.FC = () => {
  // Load saved station from local storage so it survives reboots
  const [stationSeq, setStationSeq] = useState<number>(() => {
    const saved = localStorage.getItem('kiosk_station_seq');
    return saved ? parseInt(saved, 10) : 10;
  });
  
  const [action, setAction] = useState<'START' | 'COMPLETE'>('START');
  const [barcode, setBarcode] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  let feedbackTimeout: ReturnType<typeof setTimeout>;

  // Save station to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem('kiosk_station_seq', stationSeq.toString());
    inputRef.current?.focus();
  }, [stationSeq]);

  // Aggressive auto-focus to ensure the scanner is always ready
  useEffect(() => {
    const enforceFocus = () => {
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    };
    
    document.addEventListener('click', enforceFocus);
    return () => document.removeEventListener('click', enforceFocus);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    const currentBarcode = barcode.trim().toUpperCase();
    setBarcode(''); // Instantly clear for the next scan
    setIsProcessing(true);
    
    // Clear old feedback timeout if rapid scanning
    if (feedbackTimeout) clearTimeout(feedbackTimeout);

    try {
      const res = await fetch('/api/wip/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: currentBarcode,
          stationSequence: stationSeq,
          action: action
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'Server rejected scan.' });
        // Optional: Play a harsh error beep here
      } else {
        setFeedback({ type: 'success', message: data.message });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'CRITICAL: Network connection to server lost.' });
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
      
      // Auto-hide feedback after 6 seconds
      feedbackTimeout = setTimeout(() => {
        setFeedback(null);
      }, 6000);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col bg-slate-900 rounded-2xl shadow-2xl overflow-hidden font-sans border border-slate-700">
      
      {/* Header & Station Selector */}
      <div className="bg-slate-950 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-sky-500/20 flex items-center justify-center rounded-xl border border-sky-500/30">
            <MonitorSmartphone className="w-8 h-8 text-sky-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Shop Floor Routing</h1>
            <p className="text-slate-400 text-sm mt-1">AS9100D Work-In-Process Enforcement</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-xl border border-slate-700">
          <label className="text-slate-400 font-bold uppercase tracking-wider text-xs pl-2">Current Station:</label>
          <select 
            value={stationSeq}
            onChange={(e) => setStationSeq(Number(e.target.value))}
            className="bg-slate-800 text-white font-bold text-lg px-4 py-2 rounded-lg border border-slate-600 focus:ring-2 focus:ring-sky-500 cursor-pointer"
          >
            {STATIONS.map(st => (
              <option key={st.seq} value={st.seq}>{st.seq} - {st.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Kiosk Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
        
        {/* Action Toggle Switch */}
        <div className="flex p-1.5 bg-slate-800 rounded-2xl mb-12 w-full max-w-2xl border border-slate-700 shadow-inner">
          <button
            type="button"
            onClick={() => { setAction('START'); inputRef.current?.focus(); }}
            className={`flex-1 flex items-center justify-center gap-3 py-6 rounded-xl text-xl font-bold transition-all ${
              action === 'START' 
                ? 'bg-sky-500 text-white shadow-lg scale-100' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 scale-95'
            }`}
          >
            <LogIn className="w-7 h-7" /> SCAN IN (START)
          </button>
          <button
            type="button"
            onClick={() => { setAction('COMPLETE'); inputRef.current?.focus(); }}
            className={`flex-1 flex items-center justify-center gap-3 py-6 rounded-xl text-xl font-bold transition-all ${
              action === 'COMPLETE' 
                ? 'bg-emerald-500 text-white shadow-lg scale-100' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 scale-95'
            }`}
          >
            <LogOut className="w-7 h-7" /> SCAN OUT (COMPLETE)
          </button>
        </div>

        {/* Barcode Input Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-2xl relative">
          <div className={`absolute -inset-1 rounded-2xl blur opacity-20 ${action === 'START' ? 'bg-sky-400' : 'bg-emerald-400'}`}></div>
          <div className="relative bg-slate-950 p-4 rounded-2xl border border-slate-700 shadow-2xl flex items-center gap-4">
            <ScanLine className={`w-10 h-10 ml-4 ${action === 'START' ? 'text-sky-500' : 'text-emerald-500'}`} />
            <input
              ref={inputRef}
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="AWAITING BARCODE SCAN..."
              disabled={isProcessing}
              className="w-full bg-transparent border-none text-white text-3xl font-mono font-bold placeholder-slate-600 focus:outline-none py-6 uppercase tracking-widest"
              autoFocus
              autoComplete="off"
            />
          </div>
          <p className="text-center text-slate-500 mt-6 font-medium animate-pulse">
            Scanner must be programmed to transmit an 'ENTER' suffix.
          </p>
        </form>

      </div>

      {/* Massive Feedback Banner */}
      <div className={`h-40 transition-colors duration-300 flex items-center justify-center p-6 ${
        !feedback ? 'bg-slate-950 border-t border-slate-800' :
        feedback.type === 'success' ? 'bg-emerald-500' : 'bg-rose-600'
      }`}>
        {!feedback ? (
          <span className="text-slate-700 text-2xl font-bold tracking-widest uppercase">System Ready</span>
        ) : (
          <div className="flex items-center gap-6 text-white animate-fade-in">
            {feedback.type === 'success' ? <CheckCircle2 className="w-16 h-16" /> : <AlertTriangle className="w-16 h-16" />}
            <span className="text-3xl sm:text-4xl font-black uppercase tracking-wide leading-tight">
              {feedback.message}
            </span>
          </div>
        )}
      </div>

    </div>
  );
};