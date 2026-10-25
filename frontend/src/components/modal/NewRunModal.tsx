import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Play,
  Globe,
  Sliders,
  CheckSquare,
  Square,
  Monitor,
  Tablet,
  Smartphone,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Project } from '../../types';
import { apiProjects } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface NewRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string;
  defaultUrl?: string;
}

const CATEGORIES = [
  { id: 'functional', label: 'Functional', desc: 'Links, buttons, interactive element handlers' },
  { id: 'navigation', label: 'Navigation', desc: 'Crawl discovered routes & subpages' },
  { id: 'forms', label: 'Forms & Inputs', desc: 'Input validation, submit handling & edge cases' },
  { id: 'responsive', label: 'Responsive', desc: 'Multi-device viewport layouts & overflow' },
  { id: 'accessibility', label: 'Accessibility', desc: 'WCAG 2.1 AA automated axe audit' },
  { id: 'seo', label: 'SEO & Metadata', desc: 'Heading hierarchy, titles, and meta tags' },
  { id: 'performance', label: 'Performance & Vitals', desc: 'Real TTFB, FCP, LCP, CLS, render-blocking scripts' },
  { id: 'security', label: 'Security & Transport', desc: 'Safe non-destructive HTTPS, OWASP headers, cookie flags' },
  { id: 'console', label: 'Console Logs', desc: 'Uncaught JavaScript exceptions & errors' },
  { id: 'network', label: 'Network', desc: 'Broken assets, 404s, 500s & slow requests' },
];

export const NewRunModal: React.FC<NewRunModalProps> = ({
  isOpen,
  onClose,
  defaultProjectId,
  defaultUrl,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, demoLogin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(defaultProjectId || '');
  const [targetUrl, setTargetUrl] = useState<string>(defaultUrl || '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'functional',
    'navigation',
    'forms',
    'responsive',
    'accessibility',
    'seo',
    'performance',
    'security',
    'console',
    'network',
  ]);
  const [viewports, setViewports] = useState<{ desktop: boolean; tablet: boolean; mobile: boolean }>({
    desktop: true,
    tablet: false,
    mobile: true,
  });
  const [maxPages, setMaxPages] = useState<number>(6);
  const [allowPrivateIps, setAllowPrivateIps] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (isAuthenticated) {
        apiProjects
          .list()
          .then((list) => {
            setProjects(list);
            if (!selectedProjectId && list.length > 0) {
              setSelectedProjectId(list[0].id);
              if (!targetUrl) setTargetUrl(list[0].targetUrl);
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, isAuthenticated]);

  if (!isOpen) return null;

  const toggleCategory = (id: string) => {
    if (selectedCategories.includes(id)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter((c) => c !== id));
      }
    } else {
      setSelectedCategories([...selectedCategories, id]);
    }
  };

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!isAuthenticated) {
        await demoLogin();
      }

      let projId = selectedProjectId;

      // If no project selected or none exists, create a default one
      if (!projId) {
        const urlToUse = targetUrl.trim() || 'http://localhost:3000';
        const newProj = await apiProjects.create({
          name: 'Inspectra Workspace',
          targetUrl: urlToUse,
          description: 'Autonomous inspection target',
        });
        projId = newProj.id;
      }

      const activeViewports = [];
      if (viewports.desktop) {
        activeViewports.push({ name: 'Desktop (1440x900)', width: 1440, height: 900 });
      }
      if (viewports.tablet) {
        activeViewports.push({ name: 'Tablet (768x1024)', width: 768, height: 1024 });
      }
      if (viewports.mobile) {
        activeViewports.push({ name: 'Mobile (390x844)', width: 390, height: 844 });
      }

      const run = await apiProjects.startRun(projId, {
        targetUrl: targetUrl.trim() || undefined,
        categories: selectedCategories,
        viewports: activeViewports,
        maxPages,
        allowPrivateIps,
      });

      onClose();
      navigate(`/runs/${run.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to start inspection run');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl glass-panel-elevated p-6 shadow-2xl border border-white/10 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Play className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Launch Autonomous Inspection</h2>
              <p className="text-xs text-slate-400">
                Configure Playwright crawler, test suites, and AI failure diagnostics.
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
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLaunch} className="mt-5 space-y-5">
          {/* Project & Target URL */}
          <div className="space-y-3">
            {projects.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Select Project</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value);
                    const p = projects.find((proj) => proj.id === e.target.value);
                    if (p) setTargetUrl(p.targetUrl);
                  }}
                  className="w-full px-3 py-2 rounded-lg glass-input text-sm text-slate-100 bg-[#0c1424] focus:outline-none"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#0c1424]">
                      {p.name} ({p.targetUrl})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target Website URL</label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="url"
                  required
                  placeholder="https://example.com or http://localhost:3000"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg glass-input text-sm text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Quick Test:</span>
                <button
                  type="button"
                  onClick={() => setTargetUrl('http://localhost:4000')}
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  Local Buggy Fixture (localhost:4000)
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={() => setTargetUrl('https://example.com')}
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  example.com
                </button>
              </div>
            </div>
          </div>

          {/* Test Categories */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">Test Suites & Categories</label>
              <button
                type="button"
                onClick={() =>
                  setSelectedCategories(
                    selectedCategories.length === CATEGORIES.length ? ['functional'] : CATEGORIES.map((c) => c.id)
                  )
                }
                className="text-[11px] text-cyan-400 hover:underline"
              >
                {selectedCategories.length === CATEGORIES.length ? 'Select Minimal' : 'Select All'}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <div
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer border transition-all ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-slate-100'
                        : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className="mt-0.5">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold">{cat.label}</div>
                      <div className="text-[10px] text-slate-400 leading-tight">{cat.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Viewports & Scope */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Responsive Viewports
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setViewports({ ...viewports, desktop: !viewports.desktop })}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                    viewports.desktop
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                      : 'bg-slate-900/40 border-white/5 text-slate-400'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewports({ ...viewports, tablet: !viewports.tablet })}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                    viewports.tablet
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                      : 'bg-slate-900/40 border-white/5 text-slate-400'
                  }`}
                >
                  <Tablet className="w-3.5 h-3.5" />
                  <span>Tablet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewports({ ...viewports, mobile: !viewports.mobile })}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                    viewports.mobile
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                      : 'bg-slate-900/40 border-white/5 text-slate-400'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile</span>
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-300">Max Discovery Depth</label>
                <span className="text-xs font-mono text-cyan-400">{maxPages} pages</span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                value={maxPages}
                onChange={(e) => setMaxPages(parseInt(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                Autonomous crawler discovers internal links up to this limit.
              </span>
            </div>
          </div>

          {/* Localhost & Private IP guard */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-xs font-semibold text-slate-200">Allow Local / Private Targets</div>
                <div className="text-[10px] text-slate-400">
                  Allows testing local services like localhost and 127.0.0.1.
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={allowPrivateIps}
                onChange={(e) => setAllowPrivateIps(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800/40 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 shadow-lg shadow-cyan-500/25 disabled:opacity-50 transition-all active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isSubmitting ? 'Dispatching Run...' : 'Start Autonomous Run'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
