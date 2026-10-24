import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Layers,
  CalendarClock,
  Globe,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  RotateCw,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { Project, ProjectTrends } from '../../types';
import { apiProjects } from '../../services/api';

interface ProjectTrendsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onOpenSchedule?: () => void;
  onRunNow?: () => void;
}

export const ProjectTrendsDrawer: React.FC<ProjectTrendsDrawerProps> = ({
  isOpen,
  onClose,
  project,
  onOpenSchedule,
  onRunNow,
}) => {
  const navigate = useNavigate();
  const [trends, setTrends] = useState<ProjectTrends | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scores' | 'defects'>('scores');

  const fetchTrends = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiProjects.getTrends(project.id);
      setTrends(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load project trends');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTrends();
    }
  }, [isOpen, project.id]);

  if (!isOpen) return null;

  // Format data for Recharts
  const chartData = (trends?.history || []).map((pt, idx) => {
    const d = new Date(pt.timestamp);
    const dateLabel = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
    return {
      runId: pt.runId,
      date: dateLabel,
      fullDate: d.toLocaleString(),
      trigger: pt.triggerSource || 'MANUAL',
      overall: pt.overallScore,
      functional: pt.functionalScore,
      accessibility: pt.accessibilityScore,
      responsive: pt.responsiveScore,
      seo: pt.seoScore,
      critical: pt.criticalFindings,
      high: pt.highFindings,
      medium: pt.mediumFindings,
      low: pt.lowFindings,
      duration: pt.durationMs ? Math.round(pt.durationMs / 1000) : 0,
    };
  });

  const getGradeColor = (grade?: string) => {
    switch (grade) {
      case 'A':
        return 'from-emerald-400 to-teal-500 text-emerald-300 border-emerald-500/40 bg-emerald-500/10 shadow-emerald-500/20';
      case 'B':
        return 'from-cyan-400 to-blue-500 text-cyan-300 border-cyan-500/40 bg-cyan-500/10 shadow-cyan-500/20';
      case 'C':
        return 'from-amber-400 to-orange-500 text-amber-300 border-amber-500/40 bg-amber-500/10 shadow-amber-500/20';
      case 'D':
        return 'from-orange-500 to-rose-500 text-orange-300 border-orange-500/40 bg-orange-500/10 shadow-orange-500/20';
      default:
        return 'from-rose-500 to-red-600 text-rose-300 border-rose-500/40 bg-rose-500/10 shadow-rose-500/20';
    }
  };

  const getDeltaBadge = () => {
    if (!trends || trends.scoreDelta === null || trends.scoreDelta === undefined) return null;
    const delta = trends.scoreDelta;
    if (delta > 0) {
      return (
        <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>+{delta}% Improving</span>
        </span>
      );
    } else if (delta < 0) {
      return (
        <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
          <TrendingDown className="w-3.5 h-3.5" />
          <span>{delta}% Degraded</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
        <Minus className="w-3.5 h-3.5" />
        <span>Stable (0%)</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-md animate-fadeIn flex justify-end">
      <div className="relative w-full max-w-4xl h-full bg-[#0a0f1d] border-l border-white/10 shadow-2xl flex flex-col text-slate-100 overflow-y-auto">
        {/* Header Bar */}
        <div className="sticky top-0 z-20 bg-[#0a0f1d]/90 backdrop-blur-md px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">{project.name}</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-slate-800 text-slate-300 border border-white/10">
                  {project.id}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <Globe className="w-3 h-3 text-cyan-400" />
                <a
                  href={project.targetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline hover:text-cyan-300 font-mono text-[11px]"
                >
                  {project.targetUrl}
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchTrends}
              disabled={isLoading}
              title="Refresh Analytics"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors disabled:opacity-50"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Schedule Status Banner */}
          <div className="p-4 rounded-2xl glass-panel border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl border ${
                  project.scheduleEnabled
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700'
                }`}
              >
                <CalendarClock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Autonomous Schedule
                  </span>
                  {project.scheduleEnabled ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                      ACTIVE ({project.scheduleFrequency || 'CRON'})
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      PAUSED
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  {project.scheduleEnabled && project.nextRunAt ? (
                    <span>
                      Next trigger in:{' '}
                      <strong className="text-cyan-300 font-mono">
                        {new Date(project.nextRunAt).toLocaleString()}
                      </strong>
                    </span>
                  ) : (
                    <span>No recurring autonomous inspections scheduled.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenSchedule && (
                <button
                  onClick={onOpenSchedule}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 hover:bg-cyan-900/40 transition-colors"
                >
                  Configure Schedule
                </button>
              )}
              {onRunNow && (
                <button
                  onClick={onRunNow}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Audit Now</span>
                </button>
              )}
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Score & Grade */}
            <div className="p-4 rounded-2xl glass-panel border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 font-medium">Quality Score</div>
                <div className="text-2xl font-bold font-mono text-white mt-1">
                  {trends?.latestScore !== null && trends?.latestScore !== undefined
                    ? `${trends.latestScore}%`
                    : 'N/A'}
                </div>
                <div className="mt-1.5">{getDeltaBadge()}</div>
              </div>
              <div
                className={`w-14 h-14 rounded-2xl border flex items-center justify-center font-extrabold text-2xl shadow-lg bg-gradient-to-br ${getGradeColor(
                  trends?.healthGrade
                )}`}
              >
                {trends?.healthGrade || '-'}
              </div>
            </div>

            {/* Historical Average */}
            <div className="p-4 rounded-2xl glass-panel border border-white/10">
              <div className="text-xs text-slate-400 font-medium">Historical Average</div>
              <div className="text-2xl font-bold font-mono text-cyan-300 mt-1">
                {trends?.averageScore ? `${trends.averageScore}%` : 'N/A'}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Across {trends?.completedRuns ?? 0} completed audits
              </p>
            </div>

            {/* Total Audits */}
            <div className="p-4 rounded-2xl glass-panel border border-white/10">
              <div className="text-xs text-slate-400 font-medium">Total Audits Executed</div>
              <div className="text-2xl font-bold font-mono text-indigo-300 mt-1">
                {trends?.totalRuns ?? 0}
              </div>
              <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                <span className="text-emerald-400">
                  {trends?.completedRuns ?? 0} passed/completed
                </span>
              </div>
            </div>

            {/* Trend Direction */}
            <div className="p-4 rounded-2xl glass-panel border border-white/10">
              <div className="text-xs text-slate-400 font-medium">Trajectory Status</div>
              <div className="text-base font-bold text-white mt-1.5 flex items-center gap-2">
                {trends?.trendStatus === 'IMPROVING' ? (
                  <>
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-400">Improving Quality</span>
                  </>
                ) : trends?.trendStatus === 'DEGRADING' ? (
                  <>
                    <TrendingDown className="w-5 h-5 text-rose-400" />
                    <span className="text-rose-400">Regression Detected</span>
                  </>
                ) : (
                  <>
                    <Minus className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-300">Stable Baseline</span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Continuous automated canary</p>
            </div>
          </div>

          {/* Interactive Chart Section */}
          <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>Historical Health & Quality Timeline</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visual evolution of overall and category quality scores over time.
                </p>
              </div>

              {/* Chart Tabs */}
              <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-white/10 text-xs self-start">
                <button
                  onClick={() => setActiveTab('scores')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    activeTab === 'scores'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Quality Scores
                </button>
                <button
                  onClick={() => setActiveTab('defects')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    activeTab === 'defects'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Defect Volume
                </button>
              </div>
            </div>

            {chartData.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                No historical run data recorded for this project yet. Run an inspection to start tracking
                quality trends!
              </div>
            ) : activeTab === 'scores' ? (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                        color: '#f8fafc',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Area
                      type="monotone"
                      dataKey="overall"
                      name="Overall Score"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#scoreGradient)"
                    />
                    <Line
                      type="monotone"
                      dataKey="accessibility"
                      name="Accessibility (a11y)"
                      stroke="#818cf8"
                      strokeWidth={1.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="functional"
                      name="Functional"
                      stroke="#34d399"
                      strokeWidth={1.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="responsive"
                      name="Responsive"
                      stroke="#fbbf24"
                      strokeWidth={1.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="seo"
                      name="SEO"
                      stroke="#c084fc"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                        color: '#f8fafc',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="critical" name="Critical Findings" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="high" name="High Findings" fill="#f97316" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="medium" name="Medium Findings" fill="#eab308" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="low" name="Low Findings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Historical Runs List */}
          <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Historical Inspection Runs</span>
              <span className="text-xs font-normal text-slate-400">
                {(trends?.history || []).length} recorded
              </span>
            </h3>

            {(!trends?.history || trends.history.length === 0) ? (
              <p className="text-xs text-slate-500 text-center py-4">No audits found.</p>
            ) : (
              <div className="space-y-2">
                {[...trends.history].reverse().slice(0, 10).map((run) => (
                  <div
                    key={run.runId}
                    onClick={() => {
                      onClose();
                      navigate(`/runs/${run.runId}`);
                    }}
                    className="p-3 rounded-xl bg-slate-900/60 border border-white/5 hover:border-cyan-500/40 hover:bg-slate-900 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg border flex items-center justify-center font-bold text-xs ${
                          (run.overallScore ?? 0) >= 80
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : (run.overallScore ?? 0) >= 60
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {run.overallScore ?? '-'}%
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors font-mono">
                            {run.runId}
                          </span>
                          {run.triggerSource === 'SCHEDULED' ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                              <CalendarClock className="w-2.5 h-2.5" />
                              <span>SCHEDULED</span>
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                              MANUAL
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(run.timestamp).toLocaleString()} • Duration:{' '}
                          {run.durationMs ? `${Math.round(run.durationMs / 1000)}s` : 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex items-center gap-1 text-[11px]">
                        {run.criticalFindings > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-medium">
                            {run.criticalFindings} Crit
                          </span>
                        )}
                        {run.highFindings > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-medium">
                            {run.highFindings} High
                          </span>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
