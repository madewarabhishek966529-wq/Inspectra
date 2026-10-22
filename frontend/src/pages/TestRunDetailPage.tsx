import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Layers,
  Globe,
  Clock,
  RotateCw,
  StopCircle,
  Download,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Sparkles,
  Terminal,
  FileText,
  Search,
  Filter,
  Share2,
} from 'lucide-react';
import {
  DiscoveredPage,
  ExecutionEvent,
  Finding,
  QualityMetrics,
  TestResult,
  TestRun,
} from '../types';
import { apiFindings, apiRuns, subscribeToRunEvents } from '../services/api';
import { RunStatusBadge, SeverityBadge, TestStatusBadge } from '../components/common/StatusBadge';
import { ScoreGauge } from '../components/common/ScoreGauge';
import { LiveExecutionStepper } from '../components/runs/LiveExecutionStepper';
import { LiveTerminalLogs } from '../components/runs/LiveTerminalLogs';
import { FindingDetailModal } from '../components/modal/FindingDetailModal';

export const TestRunDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [run, setRun] = useState<TestRun | null>(null);
  const [report, setReport] = useState<{
    metrics: QualityMetrics;
    results: TestResult[];
    findings: Finding[];
  } | null>(null);

  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'findings' | 'tests' | 'pages' | 'logs'>('findings');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [hasConfettiTriggered, setHasConfettiTriggered] = useState<boolean>(false);

  // Load initial run data
  const loadRun = async () => {
    if (!id) return;
    try {
      const data = await apiRuns.get(id);
      setRun(data);

      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        const rep = await apiRuns.getReport(id);
        setReport({
          metrics: rep.metrics,
          results: rep.results || [],
          findings: rep.findings || [],
        });

        // Trigger confetti for high score
        if (data.overallScore && data.overallScore >= 90 && !hasConfettiTriggered) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
          setHasConfettiTriggered(true);
        }
      }
    } catch (err) {
      console.error('Failed to load run details', err);
    }
  };

  useEffect(() => {
    loadRun();
  }, [id]);

  // Subscribe to SSE events if run is QUEUED or RUNNING
  useEffect(() => {
    if (!id) return;
    if (run && (run.status === 'COMPLETED' || run.status === 'FAILED' || run.status === 'CANCELLED')) {
      return;
    }

    const unsubscribe = subscribeToRunEvents(
      id,
      (ev: ExecutionEvent) => {
        setEvents((prev) => [...prev, ev]);

        // If completion event received, refresh full report
        if (ev.eventType === 'COMPLETE' || ev.step === 'COMPLETED' || ev.step === 'FAILED') {
          setTimeout(loadRun, 1500);
        }
      },
      (err) => {
        console.warn('SSE stream error', err);
      }
    );

    // Poll periodically while running to detect status updates
    const pollInterval = setInterval(() => {
      if (run?.status === 'RUNNING' || run?.status === 'QUEUED') {
        loadRun();
      }
    }, 4000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [id, run?.status]);

  if (!run) {
    return (
      <div className="py-20 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4" />
        <div className="text-sm font-semibold text-slate-300">Loading Inspection Session...</div>
      </div>
    );
  }

  const isLive = run.status === 'RUNNING' || run.status === 'QUEUED';

  const handleCancel = async () => {
    if (!id) return;
    setIsCancelling(true);
    try {
      await apiRuns.cancel(id);
      loadRun();
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRetry = async () => {
    if (!id) return;
    setIsRetrying(true);
    try {
      const newRun = await apiRuns.retry(id);
      navigate(`/runs/${newRun.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to retry run');
    } finally {
      setIsRetrying(false);
    }
  };

  const findings = report?.findings || [];
  const results = report?.results || [];

  const filteredFindings = findings.filter((f) => {
    if (severityFilter !== 'ALL' && f.severity.toLowerCase() !== severityFilter.toLowerCase()) {
      return false;
    }
    if (categoryFilter !== 'ALL' && f.category.toLowerCase() !== categoryFilter.toLowerCase()) {
      return false;
    }
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchTitle = f.title.toLowerCase().includes(q);
      const matchUrl = f.affectedUrl.toLowerCase().includes(q);
      const matchDesc = (f.description || '').toLowerCase().includes(q);
      return matchTitle || matchUrl || matchDesc;
    }
    return true;
  });

  const categoriesList = Array.from(new Set(findings.map((f) => f.category.toLowerCase())));

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Top Banner Navigation & Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl glass-panel border border-white/10">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/runs"
              className="text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              <span>Inspections</span>
              <span>/</span>
            </Link>
            <span className="font-mono text-xs font-bold text-cyan-400">{run.id}</span>
            <RunStatusBadge status={run.status} />
          </div>

          <div className="flex items-center gap-2 text-base font-bold text-white font-mono">
            <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
            <a
              href={run.targetUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:underline flex items-center gap-1 truncate max-w-xl"
            >
              {run.targetUrl}
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Started: {new Date(run.createdAt).toLocaleTimeString()}</span>
            </div>
            {run.durationMs && (
              <div className="flex items-center gap-1 font-mono">
                <span className="text-slate-500">Duration:</span>
                <span className="text-slate-200 font-semibold">
                  {(run.durationMs / 1000).toFixed(1)}s
                </span>
              </div>
            )}
            <div className="text-slate-500 font-mono text-[11px]">
              Engine: Scoring v{run.scoringVersion || '1.0'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isLive ? (
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-all"
            >
              <StopCircle className="w-4 h-4" />
              <span>{isCancelling ? 'Cancelling...' : 'Cancel Run'}</span>
            </button>
          ) : (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-700 transition-all border border-white/5"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Re-run Inspection</span>
            </button>
          )}

          {/* Export Downloads */}
          <a
            href={apiRuns.getPdfUrl(run.id)}
            target="_blank"
            rel="noreferrer"
            download
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 hover:bg-cyan-900/40 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF Report</span>
          </a>

          <a
            href={apiRuns.getJsonUrl(run.id)}
            target="_blank"
            rel="noreferrer"
            download
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 border border-white/10 hover:bg-slate-800 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </a>
        </div>
      </div>

      {/* Live Execution Stepper */}
      <LiveExecutionStepper
        status={run.status}
        currentStep={events[events.length - 1]?.step || run.status}
      />

      {/* If LIVE, show Streaming Terminal at the top */}
      {isLive && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              Live Playwright Execution Stream
            </span>
            <span className="font-mono text-cyan-400">{events.length} events logged</span>
          </div>
          <LiveTerminalLogs events={events} isRunning={true} />
        </div>
      )}

      {/* Quality Scorecard & Category Breakdown */}
      {run.overallScore !== null && run.overallScore !== undefined && report?.metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Scorecard */}
          <div className="p-6 rounded-3xl glass-panel-elevated border border-white/10 flex flex-col items-center justify-center text-center">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Website Health & Quality Score
            </div>
            <ScoreGauge score={run.overallScore} size={150} strokeWidth={12} />
            <div className="mt-4 text-xs text-slate-400 max-w-xs">
              Autonomous composite score penalized for critical and high severity defects.
            </div>
          </div>

          {/* Category Scores */}
          <div className="lg:col-span-2 p-6 rounded-3xl glass-panel border border-white/10 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Category Breakdown
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Functional Health', score: report.metrics.functionalScore, color: 'bg-cyan-500' },
                { label: 'Responsive Layout', score: report.metrics.responsiveScore, color: 'bg-indigo-500' },
                { label: 'Accessibility WCAG', score: report.metrics.accessibilityScore, color: 'bg-emerald-500' },
                { label: 'SEO & Meta Tags', score: report.metrics.seoScore, color: 'bg-amber-500' },
                { label: 'Visual Rendering', score: report.metrics.visualScore, color: 'bg-purple-500' },
              ].map((cat) => (
                <div key={cat.label} className="p-3.5 rounded-xl bg-slate-900/50 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-300">{cat.label}</span>
                    <span className="font-mono font-bold text-white">{cat.score}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${cat.color} transition-all duration-1000`}
                      style={{ width: `${cat.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Test Summary Pill Matrix */}
            <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-slate-400">Tests:</span>
                <span className="text-emerald-400 font-semibold">
                  {report.metrics.passedCount} Passed
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-rose-400 font-semibold">
                  {report.metrics.failedCount} Failed
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">
                  {report.metrics.skippedCount} Skipped
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Defects:</span>
                <span className="text-rose-400 font-semibold font-mono">
                  {report.metrics.criticalFindings} Critical
                </span>
                <span className="text-amber-400 font-semibold font-mono">
                  {report.metrics.highFindings} High
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs & Content */}
      <div className="rounded-3xl glass-panel border border-white/10 overflow-hidden">
        {/* Tab Headers */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 pt-4 border-b border-white/10 bg-slate-950/40">
          <div className="flex gap-2">
            {[
              { id: 'findings', label: `Findings (${findings.length})`, icon: ShieldAlert },
              { id: 'tests', label: `Test Matrix (${results.length})`, icon: CheckCircle2 },
              { id: 'logs', label: `Execution Logs (${events.length})`, icon: Terminal },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                    isActive
                      ? 'border-cyan-400 text-cyan-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Filters for Findings */}
          {activeTab === 'findings' && (
            <div className="flex items-center gap-2 pb-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter findings..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="text-xs bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="info">Info</option>
              </select>

              {categoriesList.length > 0 && (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="text-xs bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none capitalize"
                >
                  <option value="ALL">All Categories</option>
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat} className="capitalize">
                      {cat}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Tab Body */}
        <div className="p-6">
          {activeTab === 'findings' && (
            <div>
              {filteredFindings.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                  <div className="text-sm font-semibold text-slate-200">
                    {findings.length === 0
                      ? isLive
                        ? 'Inspection in progress... Findings will appear here.'
                        : 'No issues found! Everything passed inspection.'
                      : 'No findings match current search/filter.'}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredFindings.map((finding) => (
                    <div
                      key={finding.id}
                      onClick={() => setSelectedFinding(finding)}
                      className="p-5 rounded-2xl glass-panel border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer flex flex-col justify-between group hover:shadow-lg hover:shadow-cyan-500/5"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <SeverityBadge severity={finding.severity} size="sm" />
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-400">
                              {finding.category}
                            </span>
                          </div>

                          {finding.aiEnhanced && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                              <Sparkles className="w-3 h-3 text-indigo-400" />
                              AI Analysis
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2">
                          {finding.title}
                        </h3>

                        {finding.description && (
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {finding.description}
                          </p>
                        )}

                        <div className="text-[11px] font-mono text-cyan-400 truncate">
                          {finding.affectedUrl}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                        <span className="text-[10px] text-slate-500 capitalize">
                          Status: {finding.verificationStatus || 'verified'}
                        </span>
                        <span className="text-xs font-semibold text-cyan-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                          <span>Inspect</span>
                          <span>&rarr;</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tests' && (
            <div className="overflow-x-auto">
              {results.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  {isLive ? 'Executing test suites...' : 'No test results logged for this run.'}
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-white/5">
                    <tr>
                      <th className="py-3 px-4">Test Case</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Outcome Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {results.map((r) => (
                      <tr key={r.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-medium text-white max-w-xs">{r.name}</td>
                        <td className="py-3 px-4 uppercase text-[10px] font-semibold text-slate-400">
                          {r.category}
                        </td>
                        <td className="py-3 px-4">
                          <TestStatusBadge status={r.status} />
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {r.durationMs ? `${r.durationMs}ms` : '--'}
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-mono text-[11px] max-w-sm truncate">
                          {r.errorSummary || r.actualOutcome || r.expectedOutcome || '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div>
              <LiveTerminalLogs events={events} isRunning={isLive} />
            </div>
          )}
        </div>
      </div>

      {/* Finding Detail Modal */}
      <FindingDetailModal
        finding={selectedFinding}
        onClose={() => setSelectedFinding(null)}
        onStatusUpdated={(updated) => {
          setSelectedFinding(updated);
          loadRun();
        }}
      />
    </div>
  );
};
