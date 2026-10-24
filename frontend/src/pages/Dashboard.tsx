import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Layers,
  FolderGit2,
  ShieldAlert,
  Play,
  ArrowRight,
  Sparkles,
  ExternalLink,
  RotateCw,
  Cpu,
  CheckCircle2,
  Clock,
  CalendarClock,
  Terminal,
} from 'lucide-react';

import { Project, TestRun, SystemHealth } from '../types';
import { apiProjects, apiRuns, apiSystem } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { RunStatusBadge } from '../components/common/StatusBadge';
import { ScoreGauge } from '../components/common/ScoreGauge';

interface DashboardProps {
  onOpenNewRun: (defaultUrl?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenNewRun }) => {
  const { isAuthenticated, demoLogin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [quickUrl, setQuickUrl] = useState<string>('http://localhost:4000');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (isAuthenticated) {
        const [projList, runList, sysHealth] = await Promise.all([
          apiProjects.list().catch(() => []),
          apiRuns.list().catch(() => []),
          apiSystem.getHealth().catch(() => null),
        ]);
        setProjects(projList);
        setRuns(runList);
        setHealth(sysHealth);
      } else {
        const sysHealth = await apiSystem.getHealth().catch(() => null);
        setHealth(sysHealth);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  const completedRuns = runs.filter((r) => r.status === 'COMPLETED' && r.overallScore !== null);
  const avgScore =
    completedRuns.length > 0
      ? Math.round(
          completedRuns.reduce((acc, r) => acc + (r.overallScore || 0), 0) / completedRuns.length
        )
      : null;

  const handleQuickRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickUrl.trim()) {
      onOpenNewRun(quickUrl.trim());
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-8 sm:p-10 border border-white/10 bg-gradient-to-r from-slate-950 via-[#0a101f] to-[#0f1d38]">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Autonomous AI QA Engine v1.0
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Autonomous Website Testing &{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
              Diagnostic Intelligence
            </span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            Simulate realistic user journeys, catch broken workflows, audit accessibility and
            responsiveness, and diagnose root causes instantly with deterministic analysis and Ollama AI.
          </p>

          {/* Quick Launch Input */}
          <form onSubmit={handleQuickRun} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-xl">
            <input
              type="url"
              placeholder="Enter target URL (e.g. http://localhost:4000)"
              value={quickUrl}
              onChange={(e) => setQuickUrl(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl glass-input text-sm text-slate-100 placeholder:text-slate-500"
            />
            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 shadow-lg shadow-cyan-500/30 transition-all active:scale-95 whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Inspect URL</span>
            </button>
          </form>

          {/* Demo fixture hint */}
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <span>Includes test fixture:</span>
            <button
              type="button"
              onClick={() => setQuickUrl('http://localhost:4000')}
              className="text-cyan-400 hover:underline font-mono"
            >
              http://localhost:4000
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={() => setQuickUrl('https://example.com')}
              className="text-cyan-400 hover:underline font-mono"
            >
              https://example.com
            </button>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects */}
        <div className="p-5 rounded-2xl glass-panel border border-white/5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Projects
            </div>
            <div className="text-2xl font-bold text-white mt-1">{projects.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">Configured inspection targets</div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <FolderGit2 className="w-6 h-6" />
          </div>
        </div>

        {/* Total Runs */}
        <div className="p-5 rounded-2xl glass-panel border border-white/5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Inspections Run
            </div>
            <div className="text-2xl font-bold text-white mt-1">{runs.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">Total QA executions recorded</div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Average Quality Score */}
        <div className="p-5 rounded-2xl glass-panel border border-white/5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Avg Quality Score
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {avgScore !== null ? `${avgScore} / 100` : '--'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Across all completed runs</div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* System Engine Status */}
        <div className="p-5 rounded-2xl glass-panel border border-white/5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Platform Engine
            </div>
            <div className="text-base font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Operational
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              Spring Boot + Playwright
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Cpu className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Unauthenticated Quick Demo Callout */}
      {!isAuthenticated && (
        <div className="p-5 rounded-2xl glass-panel-elevated border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Instant Demo Mode Active</div>
              <p className="text-xs text-slate-300">
                You can test without manual signup. Click Instant Sign-In to unlock full project & run
                history.
              </p>
            </div>
          </div>
          <button
            onClick={demoLogin}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 transition-all shrink-0"
          >
            Sign In with 1-Click Demo
          </button>
        </div>
      )}

      {/* Recent Inspections Table */}
      <div className="rounded-2xl glass-panel border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <h2 className="text-base font-bold text-white">Recent Inspection Runs</h2>
            <p className="text-xs text-slate-400">Latest autonomous website audits and reports.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              title="Refresh"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <Link
              to="/runs"
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {runs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Terminal className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <div className="text-sm font-medium text-slate-300">No inspection runs recorded yet</div>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Launch your first automated inspection above or click Run Inspection to test against the
              included test fixture.
            </p>
            <button
              onClick={() => onOpenNewRun('http://localhost:4000')}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-all"
            >
              Test with Local Fixture
            </button>
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
                {runs.slice(0, 8).map((run) => (
                  <tr key={run.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-cyan-400">
                      <div className="flex items-center gap-1.5">
                        <Link to={`/runs/${run.id}`} className="hover:underline">
                          {run.id}
                        </Link>
                        {run.triggerSource === 'SCHEDULED' && (
                          <span
                            title="Triggered by autonomous cron schedule"
                            className="p-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
                          >
                            <CalendarClock className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-mono truncate max-w-xs">

                      {run.targetUrl}
                    </td>
                    <td className="py-3 px-4">
                      <RunStatusBadge status={run.status} />
                    </td>
                    <td className="py-3 px-4">
                      {run.overallScore !== null && run.overallScore !== undefined ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold font-mono text-sm ${
                              run.overallScore >= 80
                                ? 'text-emerald-400'
                                : run.overallScore >= 60
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {run.overallScore}
                          </span>
                          <span className="text-[10px] text-slate-500">/ 100</span>
                        </div>
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
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 transition-colors"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3 h-3" />
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
