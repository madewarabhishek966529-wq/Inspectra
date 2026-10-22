import React, { useEffect, useState } from 'react';
import {
  Settings,
  Cpu,
  Server,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Terminal,
} from 'lucide-react';
import { SystemHealth, AiSettings } from '../types';
import { apiSystem } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const [h, ai] = await Promise.all([
        apiSystem.getHealth().catch(() => null),
        apiSystem.getAiSettings().catch(() => null),
      ]);
      setHealth(h);
      setAiSettings(ai);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System & Diagnostics</h1>
          <p className="text-xs text-slate-400 mt-1">
            Platform health status, AI model bindings, and security sandbox configurations.
          </p>
        </div>
        <button
          onClick={checkStatus}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:text-white transition-colors"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Components Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Backend Card */}
        <div className="p-6 rounded-2xl glass-panel border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Backend Orchestrator</h2>
                <div className="text-[10px] text-slate-400">Spring Boot 3.3.4 (Java 17)</div>
              </div>
            </div>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3" />
              Online
            </span>
          </div>

          <div className="text-xs text-slate-300 space-y-1.5 pt-2 border-t border-white/5 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Service:</span>
              <span>Inspectra API</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Port:</span>
              <span>8080 (HTTP & SSE)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Database:</span>
              <span>H2 file db / Postgres</span>
            </div>
          </div>
        </div>

        {/* Worker Card */}
        <div className="p-6 rounded-2xl glass-panel border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Browser Worker</h2>
                <div className="text-[10px] text-slate-400">Chromium Playwright Engine</div>
              </div>
            </div>
            <span
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                health?.worker?.includes('CONNECTED')
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}
            >
              {health?.worker?.includes('CONNECTED') ? (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  Connected
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3" />
                  Standby
                </>
              )}
            </span>
          </div>

          <div className="text-xs text-slate-300 space-y-1.5 pt-2 border-t border-white/5 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Runtime:</span>
              <span>Node.js / tsx</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Port:</span>
              <span>5001</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Features:</span>
              <span>axe-core, pixelmatch</span>
            </div>
          </div>
        </div>

        {/* AI Diagnostics Card */}
        <div className="p-6 rounded-2xl glass-panel border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Failure Diagnostics</h2>
                <div className="text-[10px] text-slate-400">Ollama + Deterministic</div>
              </div>
            </div>
            <span
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                aiSettings?.available
                  ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                  : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
              }`}
            >
              {aiSettings?.available ? 'LLM Active' : 'Fallback Engine'}
            </span>
          </div>

          <div className="text-xs text-slate-300 space-y-1.5 pt-2 border-t border-white/5 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Model:</span>
              <span>{aiSettings?.configuredModel || 'llama3.2'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Fallback:</span>
              <span className="text-emerald-400">Deterministic Active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span>{aiSettings?.available ? 'Ollama Connected' : 'Auto Rule-Engine'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Target URL Security Sandbox */}
      <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold text-white">Target URL Security & SSRF Protection</h2>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          Inspectra includes a built-in Target URL Security Validator in both the Java backend and
          the Node worker to prevent Server-Side Request Forgery (SSRF). By default, metadata service
          IPs (such as 169.254.169.254) and invalid protocols (file://, gopher://) are strictly
          blocked.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-xs">
            <div className="font-semibold text-slate-200">Protocol Enforcement</div>
            <div className="text-[11px] text-slate-400 mt-1">
              Only standard <span className="font-mono text-cyan-300">http://</span> and{' '}
              <span className="font-mono text-cyan-300">https://</span> are accepted.
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-xs">
            <div className="font-semibold text-slate-200">Cloud Metadata Blocking</div>
            <div className="text-[11px] text-slate-400 mt-1">
              AWS/GCP/Azure link-local endpoints (169.254.x.x) are permanently rejected.
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-xs">
            <div className="font-semibold text-slate-200">Private IP Guard Toggle</div>
            <div className="text-[11px] text-slate-400 mt-1">
              Allow testing against localhost & RFC 1918 subnets during local development.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
