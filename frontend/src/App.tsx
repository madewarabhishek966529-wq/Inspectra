import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Dashboard } from './pages/Dashboard';
import { ProjectsPage } from './pages/ProjectsPage';
import { TestRunDetailPage } from './pages/TestRunDetailPage';
import { AllRunsPage } from './pages/AllRunsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { NewRunModal } from './components/modal/NewRunModal';

export const App: React.FC = () => {
  const [isRunModalOpen, setIsRunModalOpen] = useState<boolean>(false);
  const [modalDefaultUrl, setModalDefaultUrl] = useState<string | undefined>();
  const [modalDefaultProject, setModalDefaultProject] = useState<string | undefined>();

  const handleOpenNewRun = (defaultUrl?: string, projectId?: string) => {
    setModalDefaultUrl(defaultUrl);
    setModalDefaultProject(projectId);
    setIsRunModalOpen(true);
  };

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
          {/* Top Navbar */}
          <Navbar onOpenNewRun={() => handleOpenNewRun()} />

          {/* Main App Container */}
          <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
            <Routes>
              <Route path="/" element={<Dashboard onOpenNewRun={handleOpenNewRun} />} />
              <Route path="/projects" element={<ProjectsPage onOpenNewRun={handleOpenNewRun} />} />
              <Route path="/runs" element={<AllRunsPage onOpenNewRun={handleOpenNewRun} />} />
              <Route path="/runs/:id" element={<TestRunDetailPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Global New Run Modal */}
          <NewRunModal
            isOpen={isRunModalOpen}
            onClose={() => setIsRunModalOpen(false)}
            defaultUrl={modalDefaultUrl}
            defaultProjectId={modalDefaultProject}
          />

          {/* Footer */}
          <footer className="border-t border-white/[0.06] bg-[#070a12] py-6 text-xs text-slate-500">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-400">Inspectra</span>
                <span>•</span>
                <span>Autonomous AI Website QA & Diagnostic Intelligence</span>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-mono">
                <span>Spring Boot 3.3.4</span>
                <span>•</span>
                <span>Playwright Chromium</span>
                <span>•</span>
                <span>Ollama AI</span>
              </div>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
