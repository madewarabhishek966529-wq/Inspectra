import React, { useState } from 'react';
import {
  X,
  CalendarClock,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Save,
  HelpCircle,
  Zap,
  RotateCw,
  Sparkles,
  Layers,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Project } from '../../types';
import { apiProjects } from '../../services/api';

interface ProjectScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onUpdated: (updatedProject: Project) => void;
  onTriggerNow?: (projectId: string) => void;
}

const FREQUENCY_PRESETS = [
  {
    id: 'HOURLY',
    name: 'Every Hour',
    cron: '0 0 * * * *',
    description: 'Hourly canary audits for critical high-velocity deployments.',
    badge: 'High Frequency',
  },
  {
    id: 'SIX_HOURS',
    name: 'Every 6 Hours',
    cron: '0 0 */6 * * *',
    description: '4 comprehensive inspections per day. Ideal balance of coverage & compute.',
    badge: 'Recommended',
    recommended: true,
  },
  {
    id: 'DAILY',
    name: 'Daily at Midnight',
    cron: '0 0 0 * * *',
    description: 'Autonomous overnight regression and accessibility audit (00:00 UTC).',
    badge: 'Standard',
  },
  {
    id: 'WEEKLY',
    name: 'Weekly on Monday',
    cron: '0 0 0 * * 1',
    description: 'Weekly health pulse check every Monday morning.',
    badge: 'Weekly',
  },
  {
    id: 'CUSTOM',
    name: 'Custom Cron',
    cron: '',
    description: 'Define your own 5-part or 6-part cron expression with custom timing.',
    badge: 'Advanced',
  },
];

export const ProjectScheduleModal: React.FC<ProjectScheduleModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdated,
  onTriggerNow,
}) => {
  const [enabled, setEnabled] = useState<boolean>(project.scheduleEnabled ?? false);
  const [frequency, setFrequency] = useState<string>(project.scheduleFrequency || 'SIX_HOURS');
  const [customCron, setCustomCron] = useState<string>(
    project.scheduleFrequency === 'CUSTOM' ? project.scheduleCron || '0 0 */6 * * *' : '0 0 */4 * * *'
  );
  const [maxPages, setMaxPages] = useState<number>(15);
  const [allowPrivateIps, setAllowPrivateIps] = useState<boolean>(true);
  const [categories, setCategories] = useState<string[]>([
    'functional',
    'responsive',
    'accessibility',
    'seo',
    'console',
    'network',
  ]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleCategory = (cat: string) => {
    if (categories.includes(cat)) {
      if (categories.length > 1) {
        setCategories(categories.filter((c) => c !== cat));
      }
    } else {
      setCategories([...categories, cat]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const configJson = JSON.stringify({
        categories,
        maxPages,
        allowPrivateIps,
      });

      const updated = await apiProjects.configureSchedule(project.id, {
        enabled,
        frequency,
        cron: frequency === 'CUSTOM' ? customCron : undefined,
        configurationJson: configJson,
      });

      setSuccessMsg('Autonomous audit schedule saved successfully!');
      onUpdated(updated);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to update schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTriggerInstantAudit = async () => {
    if (!onTriggerNow) return;
    setIsTriggering(true);
    try {
      await onTriggerNow(project.id);
      setSuccessMsg('Scheduled audit job launched immediately!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to trigger audit');
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl glass-panel-elevated p-6 sm:p-7 shadow-2xl border border-white/10 text-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30 shadow-inner">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Autonomous Audit Scheduling</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  CRON ENGINE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Continuous quality monitoring for <span className="text-slate-200 font-semibold">{project.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-5 space-y-6">
          {/* Master Enable Toggle */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">Autonomous Scheduled Inspections</span>
                {enabled ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                    ACTIVE
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-medium">
                    PAUSED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspectra will autonomously dispatch Playwright headless audits on the specified recurring cadence.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-cyan-500 peer-checked:to-blue-500"></div>
            </label>
          </div>

          {/* Next Execution Preview (if enabled) */}
          {enabled && project.nextRunAt && (
            <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-cyan-300">
                <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>Next Scheduled Trigger:</span>
                <span className="font-mono font-semibold text-white">
                  {new Date(project.nextRunAt).toLocaleString()}
                </span>
              </div>
              {project.lastScheduledRunAt && (
                <div className="text-[11px] text-slate-400">
                  Last: {new Date(project.lastScheduledRunAt).toLocaleTimeString()}
                </div>
              )}
            </div>
          )}

          {/* Cadence Preset Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Audit Cadence & Frequency
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FREQUENCY_PRESETS.map((preset) => {
                const isSelected = frequency === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => setFrequency(preset.id)}
                    className={`cursor-pointer rounded-xl p-3.5 border transition-all text-left relative ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/60 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900/40 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        {preset.name}
                        {preset.recommended && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold">
                            RECOMMENDED
                          </span>
                        )}
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-cyan-400 bg-cyan-500' : 'border-slate-600'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                      {preset.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Cron Input (if Custom selected) */}
          {frequency === 'CUSTOM' && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-cyan-500/30 space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200">
                  Custom Cron Expression (Spring / Quartz Format)
                </label>
                <span className="text-[10px] text-slate-400 font-mono">sec min hour dom mon dow</span>
              </div>
              <input
                type="text"
                required
                value={customCron}
                onChange={(e) => setCustomCron(e.target.value)}
                placeholder="0 0 */4 * * *"
                className="w-full px-3 py-2 rounded-lg glass-input text-xs font-mono text-cyan-300 placeholder:text-slate-600"
              />
              <p className="text-[11px] text-slate-400">
                Examples: <code className="text-cyan-400 font-mono">0 0 */2 * * *</code> (every 2 hours),{' '}
                <code className="text-cyan-400 font-mono">0 30 2 * * *</code> (every night at 2:30 AM UTC).
              </p>
            </div>
          )}

          {/* Test Suites to run in scheduled audit */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Automated QA Suites Included
              </label>
              <span className="text-[10px] text-slate-500">
                {categories.length} of 6 suites active
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'functional', label: 'Functional & Links', icon: Zap },
                { id: 'responsive', label: 'Multi-Viewport', icon: Layers },
                { id: 'accessibility', label: 'WCAG 2.1 AA a11y', icon: ShieldCheck },
                { id: 'seo', label: 'SEO & Meta Tags', icon: Sparkles },
                { id: 'console', label: 'Console & JS Logs', icon: AlertCircle },
                { id: 'network', label: 'Network & 4xx/5xx', icon: RotateCw },
              ].map(({ id, label, icon: Icon }) => {
                const active = categories.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleCategory(id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all text-left ${
                      active
                        ? 'bg-slate-800/80 border-cyan-500/40 text-cyan-200 shadow-sm'
                        : 'bg-slate-900/30 border-white/5 text-slate-400 hover:border-white/10'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-cyan-400' : 'text-slate-600'}`} />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Limits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Max Crawl Depth (Pages)
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={maxPages}
                onChange={(e) => setMaxPages(parseInt(e.target.value) || 15)}
                className="w-full px-3 py-2 rounded-lg glass-input text-xs text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Private / Localhost Access
              </label>
              <div className="flex items-center gap-2 pt-1.5">
                <input
                  type="checkbox"
                  id="allowPrivateSchedule"
                  checked={allowPrivateIps}
                  onChange={(e) => setAllowPrivateIps(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-cyan-500"
                />
                <label htmlFor="allowPrivateSchedule" className="text-xs text-slate-400 cursor-pointer">
                  Allow test-fixtures & localhost targets
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 border-t border-white/10">
            {onTriggerNow && (
              <button
                type="button"
                onClick={handleTriggerInstantAudit}
                disabled={isTriggering || isSubmitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-amber-950/40 border border-amber-800/40 hover:bg-amber-900/30 transition-all disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isTriggering ? 'Dispatching...' : 'Trigger Scheduled Run Now'}</span>
              </button>
            )}

            <div className="w-full sm:w-auto flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 shadow-md shadow-cyan-500/25 disabled:opacity-50 transition-all active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saving...' : 'Save Schedule'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
