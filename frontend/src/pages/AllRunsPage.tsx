import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Search, Filter, RotateCw, ArrowRight, Globe, Play } from 'lucide-react';
import { TestRun } from '../types';
import { apiRuns } from '../services/api';
import { RunStatusBadge } from '../components/common/StatusBadge';
import { useAuth } from '../context/AuthContext';

interface AllRunsPageProps {
  onOpenNewRun: (defaultUrl?: string) => void;
}

export const AllRunsPage: React.FC<AllRunsPageProps> = ({ onOpenNewRun }) => {
  const { isAuthenticated, demoLogin } = useAuth();
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadRuns = async () => {
    setIsLoading(true);
    try {
      if (isAuthenticated) {
        const list = await apiRuns.list();
        setRuns(list);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, [isAuthenticated]);

  const filteredRuns = runs.filter((r) => {
    if (statusFilter !== 'ALL' && r.status.toUpperCase() !== statusFilter.toUpperCase()) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return r.id.toLowerCase().includes(q) || r.targetUrl.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Inspection History</h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse all historical and live autonomous testing sessions across projects.
          </p>
        </div>

        <button
          onClick={() => onOpenNewRun()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 shadow-md shadow-cyan-500/20 transition-all self-start sm:self-auto"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Launch Run</span>
        </button>
      </div>

      {!isAuthenticated && (
        <div className="p-4 rounded-xl glass-panel border border-cyan-500/30 flex items-center justify-between">
          <div className="text-xs text-slate-300">
            Sign in to view your complete multi-session inspection history.
          </div>
          <button
            onClick={demoLogin}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 text-slate-950"
          >
            Demo Sign In
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl glass-panel border border-white/10">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Run ID or URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-xs text-slate-200 placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="RUNNING">Running</option>
            <option value="QUEUED">Queued</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <button
            onClick={loadRuns}
            title="Refresh"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl glass-panel border border-white/10 overflow-hidden">
        {filteredRuns.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-slate-300">No inspections found</div>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or start a new run.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-white/5">
                <tr>
                  <th className="py-3 px-4">Run ID</th>
                  <th className="py-3 px-4">Target Website</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Executed At</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-cyan-400">
                      <Link to={`/runs/${run.id}`} className="hover:underline">
                        {run.id}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-mono truncate max-w-sm">
                      {run.targetUrl}
                    </td>
                    <td className="py-3 px-4">
                      <RunStatusBadge status={run.status} />
                    </td>
                    <td className="py-3 px-4">
                      {run.overallScore !== null && run.overallScore !== undefined ? (
                        <span
                          className={`font-mono font-bold ${
                            run.overallScore >= 80
                              ? 'text-emerald-400'
                              : run.overallScore >= 60
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {run.overallScore}%
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono">--</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : '--'}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(run.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/runs/${run.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors"
                      >
                        <span>View Cockpit</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
