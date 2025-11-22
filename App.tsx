
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar, MobileBottomNav } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { People } from './pages/People';
import { PersonDetail } from './pages/PersonDetail';
import { Reminders } from './pages/Reminders';
import { Settings } from './pages/Settings';
import { startAutoSync } from './services/storageService';
import { AddPersonModal } from './components/AddPersonModal';
import { AddTaskModal } from './components/AddTaskModal';
import { InteractionModal } from './components/InteractionModal';
import { ActionMenu } from './components/ActionMenu';
import { addInteraction } from './services/storageService';
import { InteractionType } from './types';
import { applyTheme, getStoredTheme } from './services/themeService';

const App: React.FC = () => {
  // Global Modal State for Keyboard Shortcuts & Omni-Button
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  useEffect(() => {
    // Initialize Theme
    applyTheme(getStoredTheme());

    // Start auto-sync polling loop
    startAutoSync();

    // Global Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setIsAddPersonOpen(true);
      }
      if (e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setIsLogModalOpen(true);
      }
      if (e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setIsAddTaskOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    // Listen for custom events
    const handleOpenGroupLog = () => setIsLogModalOpen(true);
    const handleOpenAddPerson = () => setIsAddPersonOpen(true);
    const handleOpenAddTask = () => setIsAddTaskOpen(true);
    const handleToggleActionMenu = () => setIsActionMenuOpen(prev => !prev);

    window.addEventListener('open-group-log', handleOpenGroupLog);
    window.addEventListener('open-add-person', handleOpenAddPerson);
    window.addEventListener('open-add-task', handleOpenAddTask);
    window.addEventListener('toggle-action-menu', handleToggleActionMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-group-log', handleOpenGroupLog);
      window.removeEventListener('open-add-person', handleOpenAddPerson);
      window.removeEventListener('open-add-task', handleOpenAddTask);
      window.removeEventListener('toggle-action-menu', handleToggleActionMenu);
    };
  }, []);

  const handleLogSubmit = (data: { personIds: string[], type: InteractionType, date: string, notes: string }) => {
    data.personIds.forEach(id => {
        addInteraction(id, {
            date: data.date,
            type: data.type,
            notes: data.notes,
            sentiment: 'neutral'
        });
    });
    // Dispatch event to refresh views
    window.dispatchEvent(new Event('orbit-data-update'));
  };

  return (
    <HashRouter>
      <div className="min-h-screen bg-dark-bg text-slate-200 font-sans selection:bg-orbit-500/30">
        <Sidebar 
          onToggleActionMenu={() => setIsActionMenuOpen(prev => !prev)}
          isActionMenuOpen={isActionMenuOpen}
        />
        
        <div className="md:ml-64 min-h-screen flex flex-col">
            <main className="flex-1 relative md:pb-0 pt-4 md:pt-0">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/people" element={<People />} />
                    <Route path="/person/:id" element={<PersonDetail />} />
                    <Route path="/reminders" element={<Reminders />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>

            {/* Bottom Nav for Mobile */}
            <MobileBottomNav 
                onToggleActionMenu={() => setIsActionMenuOpen(prev => !prev)} 
                isActionMenuOpen={isActionMenuOpen}
            />
        </div>

        {/* The Omni-Action Menu */}
        <ActionMenu 
            isOpen={isActionMenuOpen}
            onClose={() => setIsActionMenuOpen(false)}
            onLog={() => setIsLogModalOpen(true)}
            onAddPerson={() => setIsAddPersonOpen(true)}
            onAddTask={() => setIsAddTaskOpen(true)}
        />

        {/* Global Modals */}
        <AddPersonModal 
          isOpen={isAddPersonOpen}
          onClose={() => setIsAddPersonOpen(false)}
          onAdded={() => window.dispatchEvent(new Event('orbit-data-update'))}
        />
        <AddTaskModal
          isOpen={isAddTaskOpen}
          onClose={() => setIsAddTaskOpen(false)}
          onAdded={() => window.dispatchEvent(new Event('orbit-data-update'))}
        />
        <InteractionModal 
          isOpen={isLogModalOpen}
          onClose={() => setIsLogModalOpen(false)}
          onSubmit={handleLogSubmit}
        />
      </div>
    </HashRouter>
  );
};

export default App;
