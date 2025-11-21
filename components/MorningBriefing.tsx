
import React, { useEffect, useState } from 'react';
import { Person, Task } from '../types';
import { calculateHealthScore } from './HealthBadge';
import { Sun, Calendar, AlertTriangle, Gift, X, CheckCircle2, ArrowRight } from 'lucide-react';

interface MorningBriefingProps {
  people: Person[];
  tasks: Task[];
  onDismiss: () => void;
}

export const MorningBriefing: React.FC<MorningBriefingProps> = ({ people, tasks, onDismiss }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const lastSeen = localStorage.getItem('orbit_last_briefing');
    const today = new Date().toISOString().split('T')[0];

    if (lastSeen !== today) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('orbit_last_briefing', today);
    setIsOpen(false);
    onDismiss();
  };

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  
  // Data Aggregation
  const overdueCount = people.filter(p => {
      const score = calculateHealthScore(p.lastContactDate, p.desiredFrequencyDays);
      const isSnoozed = p.snoozeUntil && new Date(p.snoozeUntil) > new Date();
      return score < 50 && !isSnoozed;
  }).length;

  const todayTasks = tasks.filter(t => !t.isCompleted && t.date === todayStr);
  
  const upcomingBirthdays = people.filter(p => {
      if (!p.birthday) return false;
      const today = new Date();
      const bday = new Date(p.birthday);
      const nextBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
      if (nextBday < today) nextBday.setFullYear(today.getFullYear() + 1);
      
      const diffTime = Math.abs(nextBday.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7; // Next 7 days
  }).sort((a, b) => a.birthday!.localeCompare(b.birthday!));

  // If nothing is happening, don't show the modal
  if (overdueCount === 0 && todayTasks.length === 0 && upcomingBirthdays.length === 0) {
      return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-dark-card w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 p-6 border-b border-slate-700/50 text-center">
            <div className="w-12 h-12 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-orange-500/30">
                <Sun className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Good Morning</h2>
            <p className="text-slate-400 text-sm">Here is your daily snapshot.</p>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
            
            {/* Priority Relationships */}
            {overdueCount > 0 && (
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-red-500/10 rounded-lg text-red-400 shrink-0 mt-1">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-white font-medium">Relationships</h3>
                        <p className="text-sm text-slate-400">
                            <span className="text-red-400 font-bold">{overdueCount}</span> people need attention today.
                        </p>
                    </div>
                </div>
            )}

            {/* Tasks */}
            {todayTasks.length > 0 ? (
                 <div className="flex items-start gap-4">
                    <div className="p-2 bg-green-500/10 rounded-lg text-green-400 shrink-0 mt-1">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-white font-medium">Today's Agenda</h3>
                        <div className="mt-2 space-y-2">
                            {todayTasks.slice(0, 3).map(t => (
                                <div key={t.id} className="text-sm text-slate-300 border-l-2 border-slate-600 pl-2 py-0.5 truncate">
                                    {t.title}
                                </div>
                            ))}
                            {todayTasks.length > 3 && (
                                <p className="text-xs text-slate-500 italic">+ {todayTasks.length - 3} more</p>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex items-start gap-4">
                     <div className="p-2 bg-slate-800 rounded-lg text-slate-500 shrink-0 mt-1">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-slate-300 font-medium">Schedule Clear</h3>
                        <p className="text-sm text-slate-500">No tasks scheduled for today.</p>
                    </div>
                </div>
            )}

            {/* Birthdays */}
            {upcomingBirthdays.length > 0 && (
                 <div className="flex items-start gap-4">
                    <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400 shrink-0 mt-1">
                        <Gift className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-white font-medium">Celebrations</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {upcomingBirthdays.map(p => (
                                <div key={p.id} className="flex items-center gap-2 bg-slate-800 rounded-full px-3 py-1 text-xs text-white border border-slate-700">
                                    <img src={p.avatar || `https://ui-avatars.com/api/?name=${p.name}`} className="w-4 h-4 rounded-full" alt="" />
                                    {p.name}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

        </div>

        <button 
            onClick={handleClose}
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-medium border-t border-slate-700 transition-colors flex items-center justify-center gap-2"
        >
            Let's Go <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
