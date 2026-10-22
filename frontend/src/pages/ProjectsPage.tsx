import React, { useEffect, useState } from 'react';
import {
  FolderGit2,
  Plus,
  Globe,
  Play,
  Edit2,
  Trash2,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Project, TestRun } from '../types';
import { apiProjects, apiRuns } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { NewProjectModal } from '../components/modal/NewProjectModal';

interface ProjectsPageProps {
  onOpenNewRun: (defaultUrl?: string, projectId?: string) => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ onOpenNewRun }) => {
  const { isAuthenticated, demoLogin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (isAuthenticated) {
        const [projList, runList] = await Promise.all([
          apiProjects.list().catch(() => []),
          apiRuns.list().catch(() => []),
        ]);
        setProjects(projList);
        setRuns(runList);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete project "${name}"?`)) {
      try {
        await apiProjects.delete(id);
        setProjects(projects.filter((p) => p.id !== id));
      } catch (err: any) {
        alert(err.message || 'Failed to delete project');
      }
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Registered Projects</h1>
          <p className="text-xs text-slate-400 mt-1">
            Target applications and environments monitored by Inspectra autonomous QA.
          </p>
        </div>

        <button
          onClick={() => {
            if (!isAuthenticated) {
              demoLogin().then(() => {
                setEditingProject(null);
                setIsModalOpen(true);
              });
            } else {
              setEditingProject(null);
              setIsModalOpen(true);
            }
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 shadow-md shadow-cyan-500/20 transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {!isAuthenticated && (
        <div className="p-4 rounded-xl glass-panel border border-cyan-500/30 flex items-center justify-between">
          <div className="text-xs text-slate-300">
            Sign in with demo credentials to manage custom projects and view history.
          </div>
          <button
            onClick={demoLogin}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 text-slate-950"
          >
            Demo Sign In
          </button>
        </div>
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="p-12 text-center rounded-2xl glass-panel border border-white/10 text-slate-400">
          <FolderGit2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <div className="text-sm font-semibold text-slate-300">No projects registered yet</div>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Create a project for your website or web application to track quality scores and audit
            results over time.
          </p>
          <button
            onClick={() => {
              if (!isAuthenticated) demoLogin().then(() => setIsModalOpen(true));
              else setIsModalOpen(true);
            }}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30"
          >
            Create First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => {
            const projectRuns = runs.filter((r) => r.projectId === project.id);
            const latestRun = projectRuns[0];

            return (
              <div
                key={project.id}
                className="rounded-2xl glass-panel border border-white/10 hover:border-cyan-500/30 p-5 flex flex-col justify-between transition-all group hover:shadow-xl hover:shadow-cyan-500/5"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <FolderGit2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {project.name}
                        </h2>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ID: {project.id}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingProject(project);
                          setIsModalOpen(true);
                        }}
                        title="Edit Project"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(project.id, project.name)}
                        title="Delete Project"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {project.description && (
                    <p className="text-xs text-slate-400 line-clamp-2">{project.description}</p>
                  )}

                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-white/5 font-mono text-xs text-slate-300">
                    <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <a
                      href={project.targetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline hover:text-cyan-400 truncate flex-1"
                    >
                      {project.targetUrl}
                    </a>
                    <ExternalLink className="w-3 h-3 text-slate-500 shrink-0" />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      <span>{projectRuns.length} runs</span>
                    </div>

                    {latestRun?.overallScore !== null && latestRun?.overallScore !== undefined ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-500">Score:</span>
                        <span
                          className={`font-mono font-bold ${
                            latestRun.overallScore >= 80
                              ? 'text-emerald-400'
                              : latestRun.overallScore >= 60
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {latestRun.overallScore}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500">No score yet</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">
                    Added {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => onOpenNewRun(project.targetUrl, project.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 hover:bg-cyan-900/40 transition-all"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Run Inspection</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <NewProjectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProject(null);
        }}
        projectToEdit={editingProject}
        onCreated={() => loadData()}
      />
    </div>
  );
};
