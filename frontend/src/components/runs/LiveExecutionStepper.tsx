import React from 'react';
import { CheckCircle2, Clock, Play, Sparkles, Terminal, ShieldCheck } from 'lucide-react';
import { RunStatus } from '../../types';

interface LiveExecutionStepperProps {
  status: RunStatus;
  currentStep?: string;
}

const STEPS = [
  { id: 'QUEUED', label: 'Queued', icon: Clock },
  { id: 'CRAWLING', label: 'Autonomous Crawling', icon: Terminal },
  { id: 'TESTING', label: 'Test Execution', icon: Play },
  { id: 'AI_ANALYSIS', label: 'AI Diagnostic Reasoning', icon: Sparkles },
  { id: 'COMPLETED', label: 'Report & Score Ready', icon: ShieldCheck },
];

export const LiveExecutionStepper: React.FC<LiveExecutionStepperProps> = ({
  status,
  currentStep,
}) => {
  const getStepIndex = () => {
    if (status === 'COMPLETED') return 4;
    if (status === 'FAILED') return 2; // failed somewhere
    if (status === 'QUEUED') return 0;

    const lower = (currentStep || '').toLowerCase();
    if (lower.includes('crawl') || lower.includes('discover')) return 1;
    if (lower.includes('test') || lower.includes('check') || lower.includes('axe') || lower.includes('form')) return 2;
    if (lower.includes('ai') || lower.includes('ollama') || lower.includes('analysis')) return 3;
    if (lower.includes('score') || lower.includes('finalize')) return 4;

    return 2;
  };

  const activeIndex = getStepIndex();

  return (
    <div className="w-full py-4 px-6 rounded-2xl glass-panel">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isDone = idx < activeIndex || status === 'COMPLETED';
          const isCurrent = idx === activeIndex && status === 'RUNNING';
          const isPending = idx > activeIndex && status !== 'COMPLETED';

          return (
            <div key={step.id} className="flex-1 flex items-center w-full md:w-auto">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all ${
                    isDone
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : isCurrent
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/30 animate-pulse'
                      : 'bg-slate-900 border-white/10 text-slate-500'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-300">{step.label}</div>
                  <div className="text-[11px] text-slate-500">
                    {isDone ? 'Completed' : isCurrent ? 'In Progress...' : 'Waiting'}
                  </div>
                </div>
              </div>

              {idx < STEPS.length - 1 && (
                <div className="hidden md:block flex-1 mx-4 h-[2px] bg-slate-800 relative">
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                    style={{ width: isDone ? '100%' : isCurrent ? '50%' : '0%' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
