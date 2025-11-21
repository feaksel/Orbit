import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { getPeople, getCircles, addInteraction, getTasks, toggleTaskCompletion } from '../services/storageService';
import { Person, Circle, InteractionType, Task } from '../types';
import { PersonCard } from '../components/PersonCard';
import { MagicInput } from '../components/MagicInput';
import { calculateHealthScore } from '../components/HealthBadge';
import { InteractionModal } from '../components/InteractionModal';
import { AddPersonModal } from '../components/AddPersonModal';
import { Users, AlertTriangle, TrendingUp, Sparkles, Calendar, Gift, Plus, CheckCircle2, Circle as CircleIcon, Repeat, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [modalPersonId, setModalPersonId] = useState<string | undefined>(undefined);

  const refreshData = () => {
    const loadedPeople = getPeople();
    setPeople(loadedPeople);
    setCircles(getCircles());
    setTasks(getTasks());
  };

  useEffect(() => {
    refreshData();
    const handleOpenGroupLog = () => {
        setModalPersonId(undefined);
        setIsModalOpen(true);
    };
    const handleOpenAddPerson = () => {
        setIsAddPersonOpen(true);
    };
    window.addEventListener('open-group-log', handleOpenGroupLog);
    window.addEventListener('open-add-person', handleOpenAddPerson);
    
    return () => {
        window.removeEventListener('open-group-log', handleOpenGroupLog);
        window.removeEventListener('open-add-person', handleOpenAddPerson);
    };
  }, []);

  const handleQuickLog = (personId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalPersonId(personId);
    setIsModalOpen(true);
  };

  const handleGroupLogClick = () => {
    setModalPersonId(undefined);
    setIsModalOpen(true);
  };

  const handleModalSubmit = (data: { personIds: string[], type: InteractionType, date: string, notes: string }) => {
    // Add interaction to ALL selected people
    data.personIds.forEach(id => {
        addInteraction(id, {
            date: data.date,
            type: data.type,
            notes: data.notes,
            sentiment: 'neutral'
        });
    });
    refreshData();
  };

  const handleTaskToggle = (taskId: string, e: React.MouseEvent) => {
      e.preventDefault(); 
      toggleTaskCompletion(taskId);
      refreshData();
  };

  // Analytics
  const totalContacts = people.length;
  const overdueContacts = people.filter(p => calculateHealthScore(p.lastContactDate, p.desiredFrequencyDays) < 50);
  const healthyContacts = people.filter(p => calculateHealthScore(p.lastContactDate, p.desiredFrequencyDays) >= 80);
  
  const circleData = circles.map(c => ({
    name: c.name,
    value: people.filter(p => p.circles.includes(c.id)).length,
    color: c.color
  })).filter(d => d.value > 0);

  // Birthday Logic (Next 7 Days for everyone, 14 days for Favorites for visibility)
  const getUpcomingBirthdays = () => {
    const today = new Date();
    return people.filter(p => {
        if (!p.birthday) return false;
        const bday = new Date(p.birthday);
        const nextBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
        if (nextBday < today) nextBday.setFullYear(today.getFullYear() + 1);
        
        const diffTime = Math.abs(nextBday.getTime() - today.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Logic: Remind 7 days before for Favorites, 1 day before for regular
        const threshold = p.isFavorite ? 7 : 1; 
        return diffDays <= threshold;
    }).map(p => {
        const bday = new Date(p.birthday!);
        const nextBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
        if (nextBday < today) nextBday.setFullYear(today.getFullYear() + 1);
        const diffTime = Math.abs(nextBday.getTime() - today.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { ...p, daysUntil: diffDays };
    }).sort((a, b) => a.daysUntil - b.daysUntil);
  };

  const upcomingBirthdays = getUpcomingBirthdays();
  
  // Filter tasks: Not completed, and sort by date.
  // We prioritize showing tasks that have a date set.
  const upcomingTasks = tasks
    .filter(t => !t.isCompleted)
    .sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
    })
    .slice(0, 5); // Show top 5

  // Prepare Bar Chart Data
  const getMonthlyInteractionCount = () => {
    const counts: Record<string, number> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = months[d.getMonth()];
        counts[key] = 0;
    }

    people.forEach(p => {
        p.interactions.forEach(int => {
            const d = new Date(int.date);
            const key = months[d.getMonth()];
            if (counts[key] !== undefined) {
                counts[key]++;
            }
        });
    });

    return Object.entries(counts).map(([name, interactions]) => ({ name, interactions }));
  };
  
  const barData = getMonthlyInteractionCount();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in pb-24 md:pb-6">
      {/* Header & Magic Input */}
      <header className="text-center mb-8 relative">
        <div className="flex justify-center items-center mb-2 relative">
            <h1 className="text-4xl font-bold text-white">Welcome back</h1>
            <button 
                onClick={() => setIsAddPersonOpen(true)}
                className="absolute right-0 md:hidden p-2 bg-orbit-600 rounded-full text-white shadow-lg"
            >
                <Plus className="w-5 h-5" />
            </button>
        </div>
        <p className="text-slate-400 mb-8">Stay connected with the people who matter most.</p>
        <MagicInput onUpdate={refreshData} />
        
        {/* Desktop Actions */}
        <div className="hidden md:flex absolute top-0 right-0 gap-3">
            <button 
                onClick={() => setIsAddPersonOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orbit-600 hover:bg-orbit-500 text-white rounded-xl transition-all hover:shadow-lg shadow-orbit-600/20"
            >
                <Plus className="w-4 h-4" />
                <span>Add Connection</span>
            </button>
            <button 
                onClick={handleGroupLogClick}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 transition-all hover:shadow-lg"
            >
                <Users className="w-4 h-4 text-orbit-500" />
                <span>Log Group Event</span>
            </button>
        </div>
      </header>

      {/* Mobile "Add Group Event" Banner */}
      <div className="md:hidden mb-6">
        <button 
            onClick={handleGroupLogClick}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-orbit-600 to-purple-600 text-white rounded-xl shadow-lg font-medium"
        >
            <Sparkles className="w-5 h-5" />
            Log Group Activity
        </button>
      </div>

      {/* Priority List (MOVED TO TOP) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Priority Actions
            </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {overdueContacts.length === 0 ? (
                <div className="col-span-full p-6 text-center bg-dark-card rounded-2xl border border-slate-700 border-dashed text-slate-400">
                    <p>You're all caught up! Great job.</p>
                </div>
            ) : (
                overdueContacts.slice(0, 4).map(p => (
                <PersonCard 
                    key={p.id} 
                    person={p} 
                    circles={circles} 
                    onQuickLog={handleQuickLog} 
                />
                ))
            )}
        </div>
      </div>

      {/* Birthday Banner */}
      {upcomingBirthdays.length > 0 && (
          <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-2xl p-4 flex flex-wrap gap-4 items-center animate-fade-in">
              <div className="p-2 bg-pink-500/20 rounded-lg text-pink-400">
                  <Gift className="w-5 h-5" />
              </div>
              <div className="flex-1">
                  <h3 className="text-white font-medium">Upcoming Birthdays</h3>
                  <p className="text-sm text-slate-400">Don't forget to wish them well!</p>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1">
                  {upcomingBirthdays.map(p => (
                      <div key={p.id} className="flex items-center gap-2 bg-dark-card border border-slate-700/50 rounded-lg px-3 py-2 min-w-[140px]">
                          <img src={p.avatar || `https://ui-avatars.com/api/?name=${p.name}`} className="w-8 h-8 rounded-full" alt="" />
                          <div className="flex flex-col">
                              <span className="text-sm text-white font-medium truncate max-w-[80px]">{p.name}</span>
                              <span className="text-[10px] text-pink-400">
                                  {p.daysUntil === 0 ? 'Today!' : `In ${p.daysUntil} day${p.daysUntil > 1 ? 's' : ''}`}
                              </span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Tasks & Reminders Widget - UPGRADED */}
      {upcomingTasks.length > 0 && (
          <div className="grid grid-cols-1 gap-4 animate-fade-in">
            <div className="bg-dark-card p-5 rounded-2xl border border-slate-700/50 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                         <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                            <CheckCircle2 className="w-5 h-5" />
                         </div>
                         <div>
                            <h3 className="text-white font-medium">Upcoming & Recurring</h3>
                            <p className="text-sm text-slate-400">Next obligations on your calendar</p>
                         </div>
                    </div>
                    <Link to="/reminders" className="text-xs flex items-center gap-1 text-orbit-400 hover:text-white transition-colors">
                        View All <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {upcomingTasks.map(t => (
                        <div key={t.id} className="flex items-center justify-between bg-slate-800/30 px-3 py-3 rounded-xl border border-slate-700/50 text-sm text-slate-200 group hover:border-orbit-500/50 hover:bg-slate-800/80 transition-all">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <button 
                                    onClick={(e) => handleTaskToggle(t.id, e)}
                                    className="text-slate-500 hover:text-green-500 transition-colors shrink-0"
                                    title="Mark Complete"
                                >
                                    <CircleIcon className="w-5 h-5" />
                                </button>
                                <div className="flex flex-col overflow-hidden">
                                    <Link to="/reminders" className="truncate hover:text-orbit-400 transition-colors font-medium">
                                        {t.title}
                                    </Link>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                        {t.recurrence && t.recurrence !== 'none' && (
                                            <span className="flex items-center gap-0.5 text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded">
                                                <Repeat className="w-3 h-3" />
                                                {t.recurrence}
                                            </span>
                                        )}
                                        {t.date && (
                                            <span className={`${t.date === new Date().toISOString().split('T')[0] ? 'text-green-400' : ''}`}>
                                                {new Date(t.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
      )}

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dark-card p-6 rounded-2xl border border-slate-700/50 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm font-medium">Total Connections</p>
            <p className="text-3xl font-bold text-white mt-1">{totalContacts}</p>
          </div>
          <div className="bg-slate-800 p-3 rounded-xl">
            <Users className="w-6 h-6 text-orbit-500" />
          </div>
        </div>

        <div className="bg-dark-card p-6 rounded-2xl border border-slate-700/50 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm font-medium">Needs Attention</p>
            <p className="text-3xl font-bold text-red-400 mt-1">{overdueContacts.length}</p>
          </div>
          <div className="bg-red-500/10 p-3 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
        </div>

        <div className="bg-dark-card p-6 rounded-2xl border border-slate-700/50 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm font-medium">Healthy Relationships</p>
            <p className="text-3xl font-bold text-green-400 mt-1">{healthyContacts.length}</p>
          </div>
          <div className="bg-green-500/10 p-3 rounded-xl">
            <TrendingUp className="w-6 h-6 text-green-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Distribution Chart */}
        <div className="bg-dark-card p-6 rounded-2xl border border-slate-700/50 flex flex-col col-span-1">
            <h2 className="text-lg font-semibold text-white mb-4">Circle Distribution</h2>
            <div className="h-48 w-full flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={circleData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {circleData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-4">
                {circleData.map(c => (
                    <div key={c.name} className="flex items-center gap-2 text-xs text-slate-300">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }}></div>
                        {c.name}
                    </div>
                ))}
            </div>
        </div>
        
        {/* Activity Bar Chart (Expanded to fill since Priority Actions moved) */}
        <div className="bg-dark-card p-6 rounded-2xl border border-slate-700/50 lg:col-span-2">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orbit-500" />
                Activity History
            </h2>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                            cursor={{fill: '#334155', opacity: 0.2}}
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                        />
                        <Bar dataKey="interactions" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      <InteractionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialPersonId={modalPersonId}
      />

      <AddPersonModal 
        isOpen={isAddPersonOpen}
        onClose={() => setIsAddPersonOpen(false)}
        onAdded={refreshData}
      />
    </div>
  );
};