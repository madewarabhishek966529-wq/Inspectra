import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Layers,
  Play,
  Activity,
  FolderGit2,
  Settings,
  Cpu,
  LogIn,
  LogOut,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiSystem } from '../../services/api';
import { SystemHealth } from '../../types';

interface NavbarProps {
  onOpenNewRun: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenNewRun }) => {
  const { user, isAuthenticated, logout, demoLogin } = useAuth();
  const location = useLocation();
  const [health, setHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    async function checkHealth() {
      try {
        const h = await apiSystem.getHealth();
        setHealth(h);
      } catch {
        setHealth(null);
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    { label: 'Dashboard', path: '/', icon: Activity },
    { label: 'Projects', path: '/projects', icon: FolderGit2 },
    { label: 'Test Runs', path: '/runs', icon: Layers },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#090d16]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#090d16]">
                <Zap className="h-5 w-5 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight text-white">Inspectra</span>
                <span className="rounded-md bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">
                  AI QA
                </span>
              </div>
              <p className="text-[11px] text-slate-400 -mt-0.5">Autonomous Web QA</p>
            </div>
          </Link>

          {/* Nav Items */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Health Pill */}
          {health && (
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900/60 border border-white/10 text-slate-300">
              <span className="flex h-2 w-2 relative">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    health.backend === 'UP' ? 'bg-emerald-400' : 'bg-rose-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    health.backend === 'UP' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
              </span>
              <span className="text-slate-400">Backend:</span>
              <span className="text-emerald-400 font-mono font-semibold">Ready</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Worker:</span>
              <span
                className={`font-mono ${
                  health.worker?.includes('CONNECTED') ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {health.worker?.includes('CONNECTED') ? 'Online' : 'Standby'}
              </span>
            </div>
          )}

          {/* Quick Inspection CTA */}
          <button
            onClick={onOpenNewRun}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Run Inspection</span>
          </button>

          {/* Auth Section */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-slate-200 truncate max-w-[140px]">
                  {user.email}
                </div>
                <div className="text-[10px] text-cyan-400 capitalize">{user.role.replace('ROLE_', '')}</div>
              </div>
              <button
                onClick={logout}
                title="Log Out"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <button
                onClick={demoLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 hover:bg-cyan-900/40 transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Demo Sign In</span>
              </button>
              <Link
                to="/login"
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              >
                <LogIn className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
