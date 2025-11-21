
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
import { InteractionModal } from './components/InteractionModal';
import { addInteraction } from './services/storageService';
import { InteractionType } from './types';

const App: React.FC = () => {
  // Global Modal State for Keyboard Shortcuts
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Helper to trigger group log from bottom nav
  const triggerGroupLog = () => {
    setIsLogModalOpen(true);
  };

  useEffect(() => {
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
    };

    window.addEventListener('keydown', handleKeyDown);
    
    // Listen for custom events
    const handleOpenGroupLog = () => setIsLogModalOpen(true);
    const handleOpenAddPerson = () => setIsAddPersonOpen(true);

    window.addEventListener('open-group-log', handleOpenGroupLog);
    window.addEventListener('open-add-person', handleOpenAddPerson);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-group-log', handleOpenGroupLog);
      window.removeEventListener('open-add-person', handleOpenAddPerson);
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
        <Sidebar />
        
        <div className="md:ml-64 min-h-screen flex flex-col">
            {/* Removed MobileHeader to maximize space and remove branding */}
            
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
            <MobileBottomNav onOpenGroupLog={triggerGroupLog} />
        </div>

        {/* Global Modals */}
        <AddPersonModal 
          isOpen={isAddPersonOpen}
          onClose={() => setIsAddPersonOpen(false)}
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
