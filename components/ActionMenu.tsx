
import React from 'react';
import { MessageSquare, UserPlus, CheckSquare, X, Plus, Calendar } from 'lucide-react';

interface ActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onLog: () => void;
  onAddPerson: () => void;
  onAddTask: () => void;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({ isOpen, onClose, onLog, onAddPerson, onAddTask }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] animate-fade-in"
        onClick={onClose}
      />
      
      {/* Menu Content */}
      <div className="fixed bottom-24 right-4 md:bottom-10 md:left-64 md:right-auto z-[70] flex flex-col gap-4 items-end md:items-start animate-slide-up origin-bottom pl-6">
        
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 bg-dark-bg/80 px-2 rounded backdrop-blur">
            Quick Actions
        </div>

        {/* Option 3: Add Task */}
        <button 
            onClick={() => { onAddTask(); onClose(); }}
            className="flex items-center gap-4 group w-full"
        >
            <div className="w-12 h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center transition-transform group-hover:scale-105 md:order-1">
                <CheckSquare className="w-6 h-6" />
            </div>
            <div className="md:order-2 flex flex-col items-end md:items-start">
                <span className="text-white font-bold text-sm group-hover:text-emerald-400 transition-colors">Add Task</span>
                <span className="text-slate-400 text-xs">Reminder or To-Do</span>
            </div>
        </button>

        {/* Option 2: Add Person */}
        <button 
            onClick={() => { onAddPerson(); onClose(); }}
            className="flex items-center gap-4 group w-full"
        >
            <div className="w-12 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center transition-transform group-hover:scale-105 md:order-1">
                <UserPlus className="w-6 h-6" />
            </div>
            <div className="md:order-2 flex flex-col items-end md:items-start">
                <span className="text-white font-bold text-sm group-hover:text-blue-400 transition-colors">Add Contact</span>
                <span className="text-slate-400 text-xs">New person</span>
            </div>
        </button>

        {/* Option 1: Log Interaction (Primary) */}
        <button 
            onClick={() => { onLog(); onClose(); }}
            className="flex items-center gap-4 group w-full"
        >
            <div className="w-12 h-12 bg-orbit-600 hover:bg-orbit-500 text-white rounded-2xl shadow-lg shadow-orbit-600/30 flex items-center justify-center transition-transform group-hover:scale-105 md:order-1">
                <MessageSquare className="w-6 h-6" />
            </div>
            <div className="md:order-2 flex flex-col items-end md:items-start">
                <span className="text-white font-bold text-sm group-hover:text-orbit-400 transition-colors">Log Interaction</span>
                <span className="text-slate-400 text-xs">Record a moment</span>
            </div>
        </button>
      </div>
    </>
  );
};