
import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { getPeople, getCircles, addInteraction, getTasks, toggleTaskCompletion, DATA_UPDATE_EVENT, SYNC_STATUS_EVENT, getSyncStatus, SyncStatus } from '../services/storageService';
import { Person, Circle, InteractionType, Task } from '../types';
import { PersonCard } from '../components/PersonCard';
import { MagicInput } from '../components/MagicInput';
import { calculateHealthScore } from '../components/HealthBadge';
import { InteractionModal } from '../components/InteractionModal';
import { AddPersonModal } from '../components/AddPersonModal';
import { Users, AlertTriangle, TrendingUp, Sparkles, Calendar, Gift, Plus, CheckCircle2, Circle as CircleIcon, Repeat, ArrowRight, Cloud, CloudOff, RefreshCw, MessageSquare, Clock, BarChart3, Layout } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { timeAgo, formatDateReadable } from '../utils/dateUtils';
import { generateGoogleCalendarUrl } from '../utils/calendarUtils';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [people, setPeople] = useState<Person[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncStatus());
  
  // View State
  const [insightTab, setInsightTab] = useState<'activity' | 'distribution'>('activity');
  
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
    
    // Listen for sync updates from server or other tabs
    const handleDataUpdate = () => refreshData();
    const handleSyncStatus = (e: Event) => setSyncStatus((e as CustomEvent).detail);

    window.addEventListener(DATA_UPDATE_EVENT, handleDataUpdate);
    window.addEventListener(SYNC_STATUS_EVENT, handleSyncStatus);

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
        window.removeEventListener(DATA_UPDATE_EVENT, handleDataUpdate);
        window.removeEventListener(SYNC_STATUS_EVENT, handleSyncStatus);
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
  
  const openGoogleCalendar = (e: React.MouseEvent, task: Task) => {
    e.preventDefault();
    e.stopPropagation();
    const related = people.filter(p => task.linkedPersonIds?.includes(p.id));
    const url = generateGoogleCalendarUrl(task, related);
    window.open(url, '_blank');
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

  // Birthday Logic
  const getUpcomingBirthdays = () => {
    const today = new Date();
    return people.filter(p => {
        if (!p.birthday) return false;
        const bday = new Date(p.birthday);
        const nextBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
        if (nextBday < today) nextBday.setFullYear(today.getFullYear() + 1);
        
        const diffTime = Math.abs(nextBday.getTime() - today.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
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
  
  const upcomingTasks = tasks
    .filter(t => !t.isCompleted)
    .sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
    })
    .slice(0, 5); 

  // GLOBAL FEED GENERATOR
  const getGlobalFeed = () => {
      let allInteractions: any[] = [];
      people.forEach(p => {
          p.interactions.forEach(i => {
              allInteractions.push({
                  ...i,
                  personName: p.name,
                  personAvatar: p.avatar,
                  personId: p.id,
                  circleColor: circles.find(c => p.circles.includes(c.id))?.color || '#64748b'
              });
          });
      });
      // Sort by date desc
      return allInteractions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
  };
  const globalFeed = getGlobalFeed();

  // Status Indicator Component
  const StatusIndicator = () => {
    if (syncStatus === 'syncing') return <div className="flex items-center gap-1 text-[10px] text-orbit-400 bg-orbit-400/10 px-1.5 py-0.5 rounded-full"><RefreshCw className="w-2.5 h-2.5 animate-spin" /> Syncing</div>;
    if (syncStatus === 'saved') return <div className="flex items-center gap-1 text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded-full"><Cloud className="w-2.5 h-2.5" /> Synced</div>;
    if (syncStatus === 'error') return <div className="flex items-center gap-1 text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-full"><AlertTriangle className="w-2.5 h-2.5" /> Error</div>;
    if (syncStatus === 'offline') return <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-400/10 px-1.5 py-0.5 rounded-full"><CloudOff className="w-2.5 h-2.5" /> Offline</div>;
    return <div className="flex items-center gap-1 text-[10px] text-slate-500 px-1.5 py-0.5"><Cloud className="w-2.5 h-2.5" /> Connected</div>;
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4 animate-fade-in pb-24 md:pb-6">
      {/* Header & Magic Input - Compact Version */}
      <header className="mb-4 relative">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="flex-1">
                <MagicInput onUpdate={refreshData} />
            </div>
            
            {/* Quick Action Buttons */}
            <div className="flex items-center justify-between md:justify-end gap-3">
                <StatusIndicator />
                
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsAddPersonOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                    </button>
                    <button 
                        onClick={handleGroupLogClick}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                    >
                        <Users className="w-3.5 h-3.5" />
                        <span>Log</span>
                    </button>
                </div>
            </div>
        </div>
      </header>

      {/* ACTION CENTER: Needs Attention & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Column 1 (Top on mobile): Priority Reconnects (RELATIONSHIPS FIRST) */}
        <div className="bg-dark-card rounded-xl border border-slate-700/50 p-4 flex flex-col">
             <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    Needs Attention
                </h2>
                <Link to="/people" className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors">View All <ArrowRight className="w-3 h-3"/></Link>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 content-start">
                {overdueContacts.length === 0 ? (
                    <div className="col-span-full h-full flex flex-col items-center justify-center py-6 text-slate-500 border border-dashed border-slate-800 rounded-lg">
                        <TrendingUp className="w-6 h-6 mb-1 opacity-50" />
                        <p className="text-xs">Relationships are healthy.</p>
                    </div>
                ) : (
                    overdueContacts.slice(0, 4).map(p => (
                         <div 
                            key={p.id}
                            onClick={() => navigate(`/person/${p.id}`)}
                            className="bg-slate-800/30 p-2 rounded-lg border border-slate-700/50 hover:border-red-500/30 hover:bg-slate-800/80 transition-all cursor-pointer flex items-center gap-2"
                         >
                            <div className="relative shrink-0">
                                <img src={p.avatar || `https://ui-avatars.com/api/?name=${p.name}`} className="w-8 h-8 rounded-full bg-slate-700" alt="" />
                                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-800"></div>
                            </div>
                            <div className="overflow-hidden min-w-0 flex-1">
                                <h4 className="text-white font-medium truncate text-xs">{p.name}</h4>
                                <p className="text-[10px] text-red-400 truncate">
                                    {p.lastContactDate ? timeAgo(p.lastContactDate) : 'Never contacted'}
                                </p>
                            </div>
                            <button 
                                onClick={(e) => handleQuickLog(p.id, e)}
                                className="shrink-0 p-1.5 text-slate-500 hover:text-green-500 hover:bg-green-500/10 rounded-full transition-colors"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                            </button>
                         </div>
                    ))
                )}
             </div>
        </div>

        {/* Column 2: Up Next (Tasks) */}
        <div className="bg-dark-card rounded-xl border border-slate-700/50 p-4 flex flex-col">
             <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orbit-400" />
                    Up Next
                </h2>
                <Link to="/reminders" className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors">View All <ArrowRight className="w-3 h-3"/></Link>
             </div>
             
             <div className="space-y-2 flex-1">
                {upcomingTasks.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-6 text-slate-500 border border-dashed border-slate-800 rounded-lg">
                        <CheckCircle2 className="w-6 h-6 mb-1 opacity-50" />
                        <p className="text-xs">All caught up!</p>
                        <Link to="/reminders" className="text-[10px] text-orbit-500 hover:text-orbit-400 mt-1">Add a task</Link>
                    </div>
                ) : (
                    upcomingTasks.map(t => (
                        <div key={t.id} className="flex items-center justify-between bg-slate-800/30 px-3 py-2 rounded-lg border border-slate-700/50 text-sm text-slate-200 group hover:border-orbit-500/50 hover:bg-slate-800/80 transition-all">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <button 
                                    onClick={(e) => handleTaskToggle(t.id, e)}
                                    className="text-slate-500 hover:text-green-500 transition-colors shrink-0"
                                >
                                    <CircleIcon className="w-4 h-4" />
                                </button>
                                <div className="flex flex-col overflow-hidden">
                                    <Link to="/reminders" className="truncate hover:text-orbit-400 transition-colors font-medium block text-xs">
                                        {t.title}
                                    </Link>
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                        {t.date && new Date(t.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                        {t.recurrence !== 'none' && <Repeat className="w-2.5 h-2.5" />}
                                        {t.linkedPersonIds && t.linkedPersonIds.length > 0 && (
                                            <span className="flex items-center gap-1 ml-1">
                                                <Users className="w-2.5 h-2.5" />
                                            </span>
                                        )}
                                    </span>
                                </div>
                            </div>
                            {t.date && (
                                <button 
                                    onClick={(e) => openGoogleCalendar(e, t)}
                                    className="text-slate-600 hover:text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Add to Google Calendar"
                                >
                                    <Calendar className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ))
                )}
             </div>
        </div>
      </div>

      {/* Quick Stats & Birthdays Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Birthdays (Span 2 on Desktop) */}
          <div className="md:col-span-2">
            {upcomingBirthdays.length > 0 ? (
                <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 h-full">
                    <div className="p-2 bg-pink-500/20 rounded-lg text-pink-400 shrink-0">
                        <Gift className="w-4 h-4" />
                    </div>
                    <div className="text-center sm:text-left">
                        <h3 className="text-white text-sm font-medium">Birthdays</h3>
                    </div>
                    <div className="flex-1 w-full overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
                        <div className="flex gap-2 justify-center sm:justify-start">
                            {upcomingBirthdays.map(p => (
                                <div key={p.id} className="flex items-center gap-2 bg-dark-card border border-slate-700/50 rounded px-2 py-1.5 min-w-[120px] shrink-0">
                                    <img src={p.avatar || `https://ui-avatars.com/api/?name=${p.name}`} className="w-6 h-6 rounded-full" alt="" />
                                    <div className="flex flex-col">
                                        <span className="text-xs text-white font-medium truncate max-w-[80px]">{p.name}</span>
                                        <span className="text-[10px] text-pink-400">
                                            {p.daysUntil === 0 ? 'Today!' : `In ${p.daysUntil} day${p.daysUntil > 1 ? 's' : ''}`}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-dark-card p-4 rounded-xl border border-slate-700/50 h-full flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-lg text-slate-500">
                        <Gift className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-slate-300 text-sm font-medium">No upcoming birthdays</h3>
                    </div>
                </div>
            )}
          </div>

          {/* Simple Stats Card */}
          <div className="bg-dark-card p-4 rounded-xl border border-slate-700/50 flex flex-col justify-center">
             <div className="flex justify-between items-end mb-2">
                <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">Health</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white">{Math.round((healthyContacts.length / (totalContacts || 1)) * 100)}%</span>
                </div>
             </div>
             <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                 <div 
                    className="bg-green-500 h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${(healthyContacts.length / (totalContacts || 1)) * 100}%` }}
                 ></div>
             </div>
          </div>
      </div>

      {/* INSIGHTS DECK (Tabbed View) */}
      <div className="bg-dark-card rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="flex border-b border-slate-700">
                <button 
                    onClick={() => setInsightTab('activity')} 
                    className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-2 transition-colors ${insightTab === 'activity' ? 'bg-slate-800/50 text-white border-b-2 border-orbit-500' : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-200'}`}
                >
                    <Clock className="w-3.5 h-3.5" /> Recent Activity
                </button>
                <button 
                    onClick={() => setInsightTab('distribution')} 
                    className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-2 transition-colors ${insightTab === 'distribution' ? 'bg-slate-800/50 text-white border-b-2 border-orbit-500' : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-200'}`}
                >
                    <BarChart3 className="w-3.5 h-3.5" /> Network Overview
                </button>
            </div>
            
            <div className="p-4 min-h-[250px]">
                {insightTab === 'activity' ? (
                    <div className="animate-fade-in">
                        <div className="space-y-0">
                            {globalFeed.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-slate-500 text-sm">No history yet. Log an interaction to see it here.</p>
                                </div>
                            ) : (
                                globalFeed.map((item, idx) => (
                                    <div key={`${item.id}-${idx}`} className="relative pl-6 pb-6 border-l border-slate-800 last:pb-0 last:border-0">
                                        {/* Dot */}
                                        <div className="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-slate-700 border border-dark-card ring-4 ring-dark-card"></div>
                                        
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 group cursor-pointer hover:bg-slate-800/20 -mt-2 -ml-2 p-2 rounded-lg transition-colors" onClick={() => navigate(`/person/${item.personId}`)}>
                                            <div className="flex items-start gap-3">
                                                <img src={item.personAvatar || `https://ui-avatars.com/api/?name=${item.personName}`} className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800" alt="" />
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-white font-bold text-xs group-hover:text-orbit-400 transition-colors">{item.personName}</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-wider font-semibold">{item.type}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-300 line-clamp-2 mt-1 leading-relaxed">{item.notes}</p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 pl-11 sm:pl-0">
                                                <span className="text-[10px] text-slate-500 block font-medium">{timeAgo(item.date)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="animate-fade-in h-full flex flex-col md:flex-row items-center justify-center gap-8">
                        <div className="h-48 w-full md:w-1/2">
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
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full md:w-1/2 grid grid-cols-2 gap-2">
                            {circleData.map(c => (
                                <div key={c.name} className="bg-slate-800/50 p-2 rounded-lg border border-slate-700 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: c.color }}></div>
                                        <span className="text-xs text-slate-200 font-medium">{c.name}</span>
                                    </div>
                                    <span className="text-xs font-bold text-white">{c.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
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
