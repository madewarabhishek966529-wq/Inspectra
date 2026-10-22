import React, { useEffect, useRef, useState } from 'react';
import { Terminal, Download, Trash2, ArrowDown, Search } from 'lucide-react';
import { ExecutionEvent } from '../../types';

interface LiveTerminalLogsProps {
  events: ExecutionEvent[];
  onClear?: () => void;
  isRunning?: boolean;
}

export const LiveTerminalLogs: React.FC<LiveTerminalLogsProps> = ({
  events,
  onClear,
  isRunning = false,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  const filteredEvents = events.filter((ev) => {
    if (filterType !== 'ALL' && ev.eventType !== filterType) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMsg = (ev.message || '').toLowerCase().includes(q);
      const matchStep = (ev.step || '').toLowerCase().includes(q);
      return matchMsg || matchStep;
    }
    return true;
  });

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'STEP_SUCCESS':
        return <span className="text-emerald-400 font-semibold">[SUCCESS]</span>;
      case 'STEP_FAILURE':
        return <span className="text-rose-400 font-semibold">[FAIL]</span>;
      case 'STEP_START':
        return <span className="text-cyan-400 font-semibold">[STEP]</span>;
      case 'STATE_CHANGE':
        return <span className="text-purple-400 font-semibold">[STATE]</span>;
      default:
        return <span className="text-slate-400">[INFO]</span>;
    }
  };

  const downloadLogs = () => {
    const text = events
      .map(
        (e) =>
          `[${e.timestamp || new Date().toISOString()}] [${e.eventType}] [${e.step || '-'}] ${
            e.message
          }`
      )
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspectra-execution-log-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl terminal-view overflow-hidden shadow-2xl border border-white/10">
      {/* Terminal Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#0e1627] border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 mr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-semibold text-slate-300">
            inspectra-execution.stream
          </span>
          {isRunning && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800 animate-pulse">
              LIVE
            </span>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
            <input
              type="text"
              placeholder="Search stream..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2 py-1 text-xs bg-slate-900 border border-white/10 rounded-md text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs bg-slate-900 border border-white/10 rounded-md px-2 py-1 text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Events</option>
            <option value="STEP_START">Step Starts</option>
            <option value="STEP_SUCCESS">Successes</option>
            <option value="STEP_FAILURE">Failures</option>
            <option value="STATE_CHANGE">State Changes</option>
            <option value="LOG">Logs</option>
          </select>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? 'Disable Auto-scroll' : 'Enable Auto-scroll'}
            className={`p-1 rounded text-xs border ${
              autoScroll
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-900 border-white/10 text-slate-500'
            }`}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={downloadLogs}
            title="Download Logs"
            className="p-1 rounded text-xs bg-slate-900 border border-white/10 text-slate-400 hover:text-slate-200"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {onClear && (
            <button
              onClick={onClear}
              title="Clear Logs"
              className="p-1 rounded text-xs bg-slate-900 border border-white/10 text-slate-400 hover:text-rose-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Output */}
      <div
        ref={terminalRef}
        className="h-80 overflow-y-auto p-4 space-y-1.5 font-mono text-xs select-text"
      >
        {filteredEvents.length === 0 ? (
          <div className="text-slate-500 italic py-6 text-center">
            {events.length === 0 ? 'Connecting to live event stream...' : 'No events match active filter.'}
          </div>
        ) : (
          filteredEvents.map((ev, idx) => (
            <div key={idx} className="flex items-start gap-2 text-slate-300 hover:bg-white/[0.02] py-0.5 px-1 rounded">
              <span className="text-slate-600 shrink-0 text-[11px]">
                {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : `[#${idx + 1}]`}
              </span>
              <span className="shrink-0">{getEventBadge(ev.eventType)}</span>
              {ev.step && (
                <span className="text-indigo-400 font-semibold shrink-0">
                  [{ev.step}]
                </span>
              )}
              <span className="text-slate-200 break-all">{ev.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
