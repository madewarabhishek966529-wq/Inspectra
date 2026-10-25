import React, { useEffect, useState } from 'react';
import {
  X,
  GitCompare,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ShieldAlert,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { RunComparison, TestRun } from '../../types';
import { apiRuns } from '../../services/api';
import { SeverityBadge } from '../common/StatusBadge';

interface RunComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRunId?: string;
  availableRuns?: TestRun[];
}

export const RunComparisonModal: React.FC<RunComparisonModalProps> = ({
  isOpen,
  onClose,
  currentRunId,
  availableRuns = [],
}) => {
  const [runsList, setRunsList] = useState<TestRun[]>(availableRuns);
  const [baseRunId, setBaseRunId] = useState<string>('');
  const [targetRunId, setTargetRunId] = useState<string>(currentRunId || '');
  const [comparison, setComparison] = useState<RunComparison | null>(null);
  const [activeTab, setActiveTab] = useState<'new' | 'resolved' | 'persistent'>('new');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (runsList.length === 0) {
        apiRuns.list().then(list => {
          const completed = list.filter(r => r.status === 'COMPLETED');
          setRunsList(completed);
          if (completed.length >= 2) {
            setTargetRunId(currentRunId || completed[0].id);
            setBaseRunId(completed.find(r => r.id !== (currentRunId || completed[0].id))?.id || completed[1].id);
          }
        }).catch(() => {});
      } else if (runsList.length >= 2) {
        const target = currentRunId || runsList[0].id;
        setTargetRunId(target);
        const other = runsList.find(r => r.id !== target) || runsList[1];
        setBaseRunId(other.id);
      }
    }
  }, [isOpen, currentRunId]);

  useEffect(() => {
    if (baseRunId && targetRunId && baseRunId !== targetRunId) {
      loadComparison();
    }
  }, [baseRunId, targetRunId]);

  const loadComparison = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRuns.compare(baseRunId, targetRunId);
      setComparison(data);
    } catch (err: any) {
      setError(err.message || 'Failed to compare runs');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const scoreDelta = comparison?.scoreDelta ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl glass-panel-elevated border border-white/10 shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Historical Audit Comparison & Regression Diff
              </h2>
              <p className="text-xs text-slate-400">
                Compare defect telemetry and score drift between two automated scan sessions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Run Selector Bar */}
        <div className="p-6 bg-slate-950/40 border-b border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                Baseline Run (Previous)
              </label>
              <select
                value={baseRunId}
                onChange={e => setBaseRunId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl glass-input text-xs text-slate-100 bg-slate-900 border border-white/10 focus:border-cyan-500"
              >
                {runsList.map(r => (
                  <option key={r.id} value={r.id} disabled={r.id === targetRunId}>
                    {r.id} ({r.targetUrl}) - Score: {r.overallScore ?? 'N/A'}/100 - {new Date(r.createdAt || '').toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                Comparison Run (Current / Target)
              </label>
              <select
                value={targetRunId}
                onChange={e => setTargetRunId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl glass-input text-xs text-slate-100 bg-slate-900 border border-white/10 focus:border-cyan-500"
              >
                {runsList.map(r => (
                  <option key={r.id} value={r.id} disabled={r.id === baseRunId}>
                    {r.id} ({r.targetUrl}) - Score: {r.overallScore ?? 'N/A'}/100 - {new Date(r.createdAt || '').toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Comparison Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-20 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3" />
              <div className="text-xs font-semibold text-slate-400">Computing differential metrics...</div>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center">
              {error}
            </div>
          ) : comparison ? (
            <>
              {/* Score Drift Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/5 text-center">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Baseline Score</div>
                  <div className="text-3xl font-extrabold text-slate-200 mt-1">
                    {comparison.baseOverallScore != null ? `${comparison.baseOverallScore}/100` : 'N/A'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Run: {comparison.baseRunId}</div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/5 text-center flex flex-col items-center justify-center">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quality Delta</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {scoreDelta != null ? (
                      scoreDelta > 0 ? (
                        <div className="flex items-center gap-1 text-2xl font-extrabold text-emerald-400">
                          <TrendingUp className="w-6 h-6" />
                          <span>+{scoreDelta} pts</span>
                        </div>
                      ) : scoreDelta < 0 ? (
                        <div className="flex items-center gap-1 text-2xl font-extrabold text-rose-400">
                          <TrendingDown className="w-6 h-6" />
                          <span>{scoreDelta} pts</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-2xl font-extrabold text-slate-400">
                          <Minus className="w-6 h-6" />
                          <span>No change</span>
                        </div>
                      )
                    ) : (
                      <span className="text-slate-500">N/A</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Net quality impact</div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/5 text-center">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Score</div>
                  <div className="text-3xl font-extrabold text-cyan-400 mt-1">
                    {comparison.targetOverallScore != null ? `${comparison.targetOverallScore}/100` : 'N/A'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Run: {comparison.targetRunId}</div>
                </div>
              </div>

              {/* Findings Summary Stats */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setActiveTab('new')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    activeTab === 'new'
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                      : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10'
                  }`}
                >
                  <div className="text-xl font-bold">{comparison.totalNewFindings}</div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider">New Regressions</div>
                </button>

                <button
                  onClick={() => setActiveTab('resolved')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    activeTab === 'resolved'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10'
                  }`}
                >
                  <div className="text-xl font-bold">{comparison.totalResolvedFindings}</div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider">Resolved Issues</div>
                </button>

                <button
                  onClick={() => setActiveTab('persistent')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    activeTab === 'persistent'
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                      : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10'
                  }`}
                >
                  <div className="text-xl font-bold">{comparison.totalPersistentFindings}</div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider">Persistent Defects</div>
                </button>
              </div>

              {/* Findings Diff List */}
              <div className="space-y-3">
                {activeTab === 'new' && (
                  <div>
                    <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">
                      Newly Discovered Defects ({comparison.newFindings.length})
                    </h3>
                    {comparison.newFindings.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 text-center text-xs text-slate-400">
                        Zero new regressions detected in this audit!
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {comparison.newFindings.map(f => (
                          <div key={f.id} className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs space-y-1">
                            <div className="flex items-center gap-2">
                              <SeverityBadge severity={f.severity} />
                              <span className="font-bold text-slate-200">{f.title}</span>
                            </div>
                            <div className="text-slate-400 truncate">{f.description}</div>
                            <div className="text-[11px] text-slate-500 font-mono truncate">{f.affectedUrl}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'resolved' && (
                  <div>
                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                      Resolved / Fixed Defects ({comparison.resolvedFindings.length})
                    </h3>
                    {comparison.resolvedFindings.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 text-center text-xs text-slate-400">
                        No previous findings were resolved in this run.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {comparison.resolvedFindings.map(f => (
                          <div key={f.id} className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                FIXED
                              </span>
                              <span className="font-bold text-slate-300 line-through">{f.title}</span>
                            </div>
                            <div className="text-slate-400 truncate">{f.description}</div>
                            <div className="text-[11px] text-slate-500 font-mono truncate">{f.affectedUrl}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'persistent' && (
                  <div>
                    <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                      Persistent Unresolved Defects ({comparison.persistentFindings.length})
                    </h3>
                    {comparison.persistentFindings.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 text-center text-xs text-slate-400">
                        No persistent defects found.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {comparison.persistentFindings.map(f => (
                          <div key={f.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs space-y-1">
                            <div className="flex items-center gap-2">
                              <SeverityBadge severity={f.severity} />
                              <span className="font-bold text-slate-200">{f.title}</span>
                            </div>
                            <div className="text-slate-400 truncate">{f.description}</div>
                            <div className="text-[11px] text-slate-500 font-mono truncate">{f.affectedUrl}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-xs text-slate-400">
              Select two completed test runs to view differential comparison.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
