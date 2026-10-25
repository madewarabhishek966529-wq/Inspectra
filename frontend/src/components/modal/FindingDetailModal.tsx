import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Sparkles,
  CheckCircle,
  Copy,
  Check,
  Code,
  ListOrdered,
  AlertOctagon,
  FileSearch,
} from 'lucide-react';
import { Finding } from '../../types';
import { SeverityBadge } from '../common/StatusBadge';
import { apiFindings } from '../../services/api';

interface FindingDetailModalProps {
  finding: Finding | null;
  onClose: () => void;
  onStatusUpdated?: (updated: Finding) => void;
}

export const FindingDetailModal: React.FC<FindingDetailModalProps> = ({
  finding,
  onClose,
  onStatusUpdated,
}) => {
  if (!finding) return null;

  const [currentStatus, setCurrentStatus] = useState<string>(
    finding.verificationStatus || 'verified'
  );
  const [currentRemediationStatus, setCurrentRemediationStatus] = useState<string>(
    finding.remediationStatus || 'OPEN'
  );
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [copiedFix, setCopiedFix] = useState<boolean>(false);

  let reproductionSteps: string[] = [];
  try {
    if (finding.reproductionStepsJson) {
      reproductionSteps = JSON.parse(finding.reproductionStepsJson);
    }
  } catch {
    // fallback
  }

  let evidence: any = null;
  try {
    if (finding.evidenceJson) {
      evidence = JSON.parse(finding.evidenceJson);
    }
  } catch {
    // fallback
  }

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      const updated = await apiFindings.update(finding.id, {
        verificationStatus: newStatus,
      });
      setCurrentStatus(newStatus);
      if (onStatusUpdated) onStatusUpdated(updated);
    } catch (err) {
      console.error('Failed to update finding status', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRemediationStatusChange = async (newRemediationStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      const updated = await apiFindings.update(finding.id, {
        remediationStatus: newRemediationStatus,
      });
      setCurrentRemediationStatus(newRemediationStatus);
      if (onStatusUpdated) onStatusUpdated(updated);
    } catch (err) {
      console.error('Failed to update remediation status', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCopyFix = () => {
    if (finding.suggestedFix) {
      navigator.clipboard.writeText(finding.suggestedFix);
      setCopiedFix(true);
      setTimeout(() => setCopiedFix(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl glass-panel-elevated p-6 sm:p-8 shadow-2xl border border-white/10 text-slate-100">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={finding.severity} size="md" />
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                {finding.category}
              </span>
              {finding.detectionMethod && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800/80 text-cyan-300 border border-cyan-500/30">
                  {finding.detectionMethod}
                </span>
              )}
              {finding.aiEnhanced && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  AI Diagnosed
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white leading-tight">{finding.title}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Target URL:</span>
              <a
                href={finding.affectedUrl}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline flex items-center gap-1 font-mono truncate max-w-md"
              >
                {finding.affectedUrl}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="mt-6 space-y-6">
          {/* Description */}
          {finding.description && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Issue Description
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed bg-slate-900/40 p-4 rounded-xl border border-white/5">
                {finding.description}
              </p>
            </div>
          )}

          {/* Expected vs Actual Outcome */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">
                <CheckCircle className="w-4 h-4" />
                Expected Behavior
              </div>
              <div className="text-xs text-slate-200 leading-relaxed font-mono">
                {finding.expectedResult || 'Expected smooth execution without errors.'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/20">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-400 mb-2">
                <AlertOctagon className="w-4 h-4" />
                Actual Behavior Observed
              </div>
              <div className="text-xs text-slate-200 leading-relaxed font-mono">
                {finding.actualResult || 'Anomalous or failing state detected during automated check.'}
              </div>
            </div>
          </div>

          {/* Step-by-Step Reproduction Steps */}
          {reproductionSteps.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                <ListOrdered className="w-4 h-4 text-cyan-400" />
                Reproduction Steps
              </div>
              <div className="space-y-2">
                {reproductionSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/40 border border-white/5 text-xs text-slate-200 font-mono"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-cyan-500/20 text-cyan-400 font-semibold text-[10px]">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Suggested Fix & Remediation */}
          {finding.suggestedFix && (
            <div className="rounded-xl p-4 bg-gradient-to-br from-indigo-950/40 to-cyan-950/30 border border-indigo-500/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                    Recommended Fix & Root Cause
                  </span>
                </div>
                <button
                  onClick={handleCopyFix}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
                >
                  {copiedFix ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Fix</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-3 rounded-lg bg-black/60 border border-white/10 font-mono text-xs text-cyan-200 whitespace-pre-wrap leading-relaxed">
                {finding.suggestedFix}
              </div>
            </div>
          )}

          {/* Technical Explanation */}
          {finding.technicalExplanation && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Technical Explanation & Mechanics
              </h3>
              <p className="text-xs text-slate-300 font-mono leading-relaxed bg-slate-900/50 p-4 rounded-xl border border-white/5">
                {finding.technicalExplanation}
              </p>
            </div>
          )}

          {/* Verification Procedure */}
          {finding.verificationProcedure && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-indigo-500/20">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2">
                <CheckCircle className="w-4 h-4" />
                Fix Verification Procedure
              </div>
              <div className="text-xs text-slate-300 font-mono leading-relaxed">
                {finding.verificationProcedure}
              </div>
            </div>
          )}

          {/* Evidence Details */}
          {evidence && (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                <FileSearch className="w-4 h-4 text-cyan-400" />
                Technical Evidence
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 text-xs font-mono space-y-2">
                {evidence.selector && (
                  <div>
                    <span className="text-slate-500">Selector: </span>
                    <span className="text-cyan-300 font-bold">{evidence.selector}</span>
                  </div>
                )}
                {evidence.ruleId && (
                  <div>
                    <span className="text-slate-500">Rule ID: </span>
                    <span className="text-amber-400">{evidence.ruleId}</span>
                  </div>
                )}
                {evidence.networkCode && (
                  <div>
                    <span className="text-slate-500">HTTP Status: </span>
                    <span className="text-rose-400">{evidence.networkCode}</span>
                  </div>
                )}
                {evidence.logs && evidence.logs.length > 0 && (
                  <div>
                    <span className="text-slate-500">Captured Logs:</span>
                    <ul className="list-disc list-inside mt-1 space-y-1 text-slate-300">
                      {evidence.logs.map((lg: string, i: number) => (
                        <li key={i}>{lg}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Remediation Lifecycle Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-white/10">
            <div>
              <div className="text-xs font-semibold text-slate-200">Remediation Lifecycle</div>
              <div className="text-[11px] text-slate-400">
                Actionable defect resolution status.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(['OPEN', 'IN_PROGRESS', 'FIXED', 'ACCEPTED', 'FALSE_POSITIVE'] as const).map((rst) => {
                const isActive = (currentRemediationStatus || 'OPEN').toUpperCase() === rst;
                return (
                  <button
                    key={rst}
                    disabled={isUpdatingStatus}
                    onClick={() => handleRemediationStatusChange(rst)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide border transition-all ${
                      isActive
                        ? rst === 'FIXED'
                          ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-sm shadow-emerald-500/20'
                          : rst === 'IN_PROGRESS'
                          ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                          : rst === 'FALSE_POSITIVE' || rst === 'ACCEPTED'
                          ? 'bg-slate-700/50 border-slate-600 text-slate-300'
                          : 'bg-rose-500/20 border-rose-500/60 text-rose-300'
                        : 'bg-slate-900/80 border-white/5 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    {rst.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Verification Status Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-white/10">
            <div>
              <div className="text-xs font-semibold text-slate-200">Triage & Verification Status</div>
              <div className="text-[11px] text-slate-400">
                Update finding tracking across team workflows.
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(['verified', 'in_progress', 'resolved', 'ignored'] as const).map((st) => {
                const isActive = currentStatus === st;
                return (
                  <button
                    key={st}
                    disabled={isUpdatingStatus}
                    onClick={() => handleStatusChange(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-all ${
                      isActive
                        ? st === 'resolved'
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                          : st === 'ignored'
                          ? 'bg-slate-700/50 border-slate-600 text-slate-400'
                          : st === 'in_progress'
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                        : 'bg-slate-900 border-white/5 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
