import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar, MobileHeader, MobileBottomNav } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { People } from './pages/People';
import { PersonDetail } from './pages/PersonDetail';
import { Reminders } from './pages/Reminders';

const App: React.FC = () => {
  // Helper to trigger group log from bottom nav
  const triggerGroupLog = () => {
    window.dispatchEvent(new Event('open-group-log'));
  };

  return (
    <HashRouter>
      <div className="min-h-screen bg-dark-bg text-slate-200 font-sans selection:bg-orbit-500/30">
        <Sidebar />
        
        <div className="md:ml-64 min-h-screen flex flex-col">
            <MobileHeader />
            
            <main className="flex-1 relative md:pb-0">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/people" element={<People />} />
                    <Route path="/person/:id" element={<PersonDetail />} />
                    <Route path="/reminders" element={<Reminders />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>

            {/* Bottom Nav for Mobile */}
            <MobileBottomNav onOpenGroupLog={triggerGroupLog} />
        </div>
      </div>
    </HashRouter>
  );
};

export default App;