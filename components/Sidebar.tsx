import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, PlusCircle, Search, Menu, CalendarCheck, Settings } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const linkClass = ({ isActive }: { isActive: boolean }) => 
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
      isActive 
        ? 'bg-orbit-600/20 text-orbit-500 font-medium' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`;

  return (
    <aside className="w-64 bg-dark-bg border-r border-slate-800 h-screen fixed left-0 top-0 hidden md:flex flex-col p-4 z-50">
      <div className="flex items-center gap-3 px-4 py-4 mb-8">
        <div className="w-8 h-8 bg-gradient-to-tr from-orbit-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">O</div>
        <span className="text-xl font-bold text-white tracking-tight">Orbit</span>
      </div>

      <nav className="space-y-2 flex-1">
        <NavLink to="/" className={linkClass}>
          <LayoutDashboard className="w-5 h-5" />
          Dashboard
        </NavLink>
        <NavLink to="/people" className={linkClass}>
          <Users className="w-5 h-5" />
          People
        </NavLink>
        <NavLink to="/reminders" className={linkClass}>
          <CalendarCheck className="w-5 h-5" />
          Reminders
        </NavLink>
        
        <div className="px-4 py-2 mt-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            System
        </div>
        <NavLink to="/settings" className={linkClass}>
          <Settings className="w-5 h-5" />
          Settings & Data
        </NavLink>
      </nav>

      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
            <img src="https://ui-avatars.com/api/?name=User&background=334155&color=fff" alt="User" className="w-8 h-8 rounded-full" />
            <div className="text-sm">
                <p className="text-white font-medium">Demo User</p>
                <p className="text-slate-500 text-xs">Pro Plan</p>
            </div>
        </div>
      </div>
    </aside>
  );
};

export const MobileHeader: React.FC = () => (
    <div className="md:hidden h-16 bg-dark-bg border-b border-slate-800 flex items-center justify-center px-4 sticky top-0 z-40">
         <div className="flex items-center gap-2">
             <div className="w-6 h-6 bg-gradient-to-tr from-orbit-500 to-purple-500 rounded-md flex items-center justify-center text-white font-bold text-xs">O</div>
             <span className="text-lg font-bold text-white">Orbit</span>
        </div>
    </div>
);

interface MobileBottomNavProps {
  onOpenGroupLog?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenGroupLog }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-dark-bg/95 backdrop-blur-lg border-t border-slate-800 pb-safe z-50">
      <div className="flex justify-around items-center h-16">
        <NavLink to="/" className={`flex flex-col items-center justify-center w-full h-full ${isActive('/') ? 'text-orbit-500' : 'text-slate-400'}`}>
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[10px] mt-1">Home</span>
        </NavLink>
        
        <NavLink to="/people" className={`flex flex-col items-center justify-center w-full h-full ${isActive('/people') ? 'text-orbit-500' : 'text-slate-400'}`}>
          <Users className="w-6 h-6" />
          <span className="text-[10px] mt-1">People</span>
        </NavLink>

        <button 
          onClick={onOpenGroupLog}
          className="flex flex-col items-center justify-center w-full h-full text-orbit-500 -mt-4"
        >
          <div className="bg-orbit-600 text-white p-3 rounded-full shadow-lg shadow-orbit-500/20">
            <PlusCircle className="w-6 h-6" />
          </div>
        </button>

        <NavLink to="/reminders" className={`flex flex-col items-center justify-center w-full h-full ${isActive('/reminders') ? 'text-orbit-500' : 'text-slate-400'}`}>
           <CalendarCheck className="w-6 h-6" />
           <span className="text-[10px] mt-1">Tasks</span>
        </NavLink>

        <NavLink to="/settings" className={`flex flex-col items-center justify-center w-full h-full ${isActive('/settings') ? 'text-orbit-500' : 'text-slate-600'}`}>
           <Settings className="w-6 h-6" />
           <span className="text-[10px] mt-1">Settings</span>
        </NavLink>
      </div>
    </div>
  );
};