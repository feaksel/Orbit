
import React, { useEffect, useState } from 'react';
import { getPeople, getCircles, addInteraction, getTasks, toggleTaskCompletion, snoozePerson, DATA_UPDATE_EVENT, SYNC_STATUS_EVENT, getSyncStatus, SyncStatus } from '../services/storageService';
import { Person, Circle, InteractionType, Task, Interaction } from '../types';
import { MagicInput } from '../components/MagicInput';
import { calculateHealthScore } from '../components/HealthBadge';
import { AlertTriangle, Calendar, Gift, CheckCircle2, Repeat, Cloud, CloudOff, RefreshCw, Clock, History, Sparkles, BarChart3, Activity, PieChart as PieIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { timeAgo } from '../utils/dateUtils';

// Helper Component for Dynamic Greeting
const TypewriterHeader = () => {
  const [text, setText] = useState('');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning.' : hour < 18 ? 'Good afternoon.' : 'Good evening.';
  
  useEffect(() => {
    let i = 0;
    setText(''); 
    const timer = setInterval(() => {
      if (i < greeting.length) {
        setText(prev => greeting.substring(0, prev.length + 1));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 50); // Typing speed
    return () => clearInterval(timer);
  }, [greeting]);

  return (
    <h1 className="text-3xl md:text-4xl font-serif font-light text-white tracking-tight typewriter-cursor inline-block mb-1">
      {text}
    </h1>
  );
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [people, setPeople] = useState<Person[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [syncStatus, setSyncStatusState] = useState<SyncStatus>(getSyncStatus());

  const refreshData = () => {
    setPeople(getPeople());
    setCircles(getCircles());
    setTasks(getTasks());
  };

  useEffect(() => {
    refreshData();
    
    const handleDataUpdate = () => refreshData();
    const handleSyncStatus = (e: Event) => setSyncStatusState((e as CustomEvent).detail);

    window.addEventListener(DATA_UPDATE_EVENT, handleDataUpdate);
    window.addEventListener(SYNC_STATUS_EVENT, handleSyncStatus);
    
    return () => {
        window.removeEventListener(DATA_UPDATE_EVENT, handleDataUpdate);
        window.removeEventListener(SYNC_STATUS_EVENT, handleSyncStatus);
    };
  }, []);

  // Browser Notification Logic
  useEffect(() => {
      if (people.length === 0) return;

      const checkNotifications = async () => {
        if (!('Notification' in window)) return;

        if (Notification.permission !== 'granted') {
            await Notification.requestPermission();
        }

        if (Notification.permission === 'granted') {
            const lastNotified = localStorage.getItem('orbit_last_notification');
            const today = new Date().toISOString().split('T')[0];

            if (lastNotified !== today) {
                const overdueCount = people.filter(p => calculateHealthScore(p.lastContactDate, p.desiredFrequencyDays) < 50).length;
                const todayTaskCount = tasks.filter(t => !t.isCompleted && t.date === today).length;

                if (overdueCount > 0 || todayTaskCount > 0) {
                    new Notification("Orbit Daily Briefing", {
                        body: `You have ${overdueCount} connections needing attention and ${todayTaskCount} tasks for today.`,
                        icon: "https://ui-avatars.com/api/?name=Orbit&background=10b981&color=fff&rounded=true&bold=true"
                    });
                    localStorage.setItem('orbit_last_notification', today);
                }
            }
        }
      };

      checkNotifications();
  }, [people, tasks]);


  const handleQuickLog = (personId: string) => {
    addInteraction(personId, {
      date: new Date().toISOString(),
      type: InteractionType.MESSAGE, // Default for quick log
      notes: 'Quick check-in logged via Dashboard.',
      sentiment: 'neutral'
    });
    refreshData();
  };

  const handleSnooze = (personId: string) => {
      snoozePerson(personId, 7); // Snooze for a week
      refreshData();
  };

  const handleTaskToggle = (taskId: string) => {
      toggleTaskCompletion(taskId);
      refreshData();
  };

  // --- Derived State ---
  
  // 1. Needs Attention (Overdue & Not Snoozed)
  const needsAttention = people.filter(p => {
    const score = calculateHealthScore(p.lastContactDate, p.desiredFrequencyDays);
    const isSnoozed = p.snoozeUntil && new Date(p.snoozeUntil) > new Date();
    return score < 50 && !isSnoozed;
  }).sort((a, b) => {
      const scoreA = calculateHealthScore(a.lastContactDate, a.desiredFrequencyDays);
      const scoreB = calculateHealthScore(b.lastContactDate, b.desiredFrequencyDays);
      return scoreA - scoreB; // Lowest score first
  }).slice(0, 5);

  // 2. Up Next (Scheduled Tasks & Recurring)
  const todayStr = new Date().toISOString().split('T')[0];
  const upNext = tasks
    .filter(t => !t.isCompleted && (t.date === todayStr || (t.date && t.date > todayStr && t.date < new Date(Date.now() + 86400000 * 3).toISOString())))
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .slice(0, 4);

  // 3. Birthdays
  const upcomingBirthdays = people.filter(p => {
    if (!p.birthday) return false;
    const today = new Date();
    const bday = new Date(p.birthday);
    const nextBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
    if (nextBday < today) nextBday.setFullYear(today.getFullYear() + 1);
    
    const diffTime = Math.abs(nextBday.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 14;
  }).sort((a, b) => {
      const today = new Date();
      const dateA = new Date(a.birthday!);
      const dateB = new Date(b.birthday!);
      const nextA = new Date(today.getFullYear(), dateA.getMonth(), dateA.getDate());
      if (nextA < today) nextA.setFullYear(today.getFullYear() + 1);
      const nextB = new Date(today.getFullYear(), dateB.getMonth(), dateB.getDate());
      if (nextB < today) nextB.setFullYear(today.getFullYear() + 1);
      return nextA.getTime() - nextB.getTime();
  });

  // 4. Memory Lane
  const getMemoryLane = () => {
      const today = new Date();
      const m = today.getMonth();
      const d = today.getDate();
      const y = today.getFullYear();

      const results: { person: Person; interaction: Interaction; yearsAgo: number }[] = [];
      
      people.forEach(p => {
          p.interactions.forEach(i => {
              const iDate = new Date(i.date);
              if (iDate.getMonth() === m && iDate.getDate() === d && iDate.getFullYear() !== y) {
                  results.push({ 
                      person: p, 
                      interaction: i, 
                      yearsAgo: y - iDate.getFullYear() 
                  });
              }
          });
      });
      return results.sort((a, b) => b.yearsAgo - a.yearsAgo);
  };
  const memoryLaneEvents = getMemoryLane();

  // 5. Stats Data
  const circleData = circles.map(c => ({
      name: c.name,
      value: people.filter(p => p.circles.includes(c.id)).length,
      color: c.color
  })).filter(d => d.value > 0);

  const totalPeople = people.length || 1;
  const healthyCount = people.filter(p => calculateHealthScore(p.lastContactDate, p.desiredFrequencyDays) >= 80).length;
  const driftingCount = people.filter(p => {
      const s = calculateHealthScore(p.lastContactDate, p.desiredFrequencyDays);
      return s >= 50 && s < 80;
  }).length;
  const overdueCount = people.filter(p => calculateHealthScore(p.lastContactDate, p.desiredFrequencyDays) < 50).length;

  const healthyPct = (healthyCount / totalPeople) * 100;
  const driftingPct = (driftingCount / totalPeople) * 100;
  const overduePct = (overdueCount / totalPeople) * 100;

  // Activity Trend (Last 14 Days)
  const activityData = [];
  for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      let count = 0;
      people.forEach(p => {
          p.interactions.forEach(int => {
              if (int.date.startsWith(dateStr)) count++;
          });
      });
      activityData.push({ 
          date: `${d.getMonth() + 1}/${d.getDate()}`, 
          count 
      });
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8 pb-32 md:pb-12 animate-fade-in">

      {/* Header & Magic Input */}
      <div className="space-y-6">
        <div className="flex justify-between items-start">
            <div className="space-y-1">
                <TypewriterHeader />
            </div>
            
            {/* Sync Indicator */}
            <div className="flex items-center gap-2 mt-2">
                {syncStatus === 'syncing' && <RefreshCw className="w-4 h-4 text-orbit-500 animate-spin" />}
                {syncStatus === 'saved' && <Cloud className="w-4 h-4 text-orbit-500" />}
                {syncStatus === 'offline' && <CloudOff className="w-4 h-4 text-slate-500" />}
                {syncStatus === 'error' && <AlertTriangle className="w-4 h-4 text-red-500" />}
            </div>
        </div>
        
        <MagicInput onUpdate={refreshData} />
      </div>

      {/* MAIN ACTION AREA - PRIORITY WORKFLOWS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Column 1: Needs Attention */}
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                    Needs Attention <span className="text-xs font-sans font-normal bg-red-500 text-white px-2 py-0.5 rounded-full shadow-lg shadow-red-500/20">{needsAttention.length}</span>
                </h2>
                <Link to="/people" className="text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-orbit-400 transition-colors">View All</Link>
            </div>
            
            <div className="grid gap-3">
                {needsAttention.length > 0 ? (
                    needsAttention.map(p => (
                        <div key={p.id} className="group bg-red-500/5 hover:bg-red-500/10 p-4 rounded-2xl border border-red-500/20 hover:border-red-500/40 transition-all flex items-center justify-between relative overflow-hidden shadow-[0_0_15px_rgba(239,68,68,0.05)]">
                            <div 
                                className="flex items-center gap-4 cursor-pointer flex-1"
                                onClick={() => navigate(`/person/${p.id}`)}
                            >
                                <div className="relative">
                                    <img src={p.avatar || `https://ui-avatars.com/api/?name=${p.name}&background=334155&color=fff`} className="w-10 h-10 rounded-full border border-red-500/30" alt="" />
                                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-dark-card animate-pulse"></div>
                                </div>
                                <div>
                                    <h3 className="text-white font-medium text-sm group-hover:text-red-200 transition-colors">{p.name}</h3>
                                    <p className="text-xs text-red-400 font-medium mt-0.5 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        {Math.floor((new Date().getTime() - new Date(p.lastContactDate!).getTime()) / (1000 * 3600 * 24))} days overdue
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => handleSnooze(p.id)}
                                    className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-xs"
                                    title="Snooze 7 Days"
                                >
                                    <Clock className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => handleQuickLog(p.id)}
                                    className="p-2 bg-red-500 hover:bg-red-400 text-white rounded-lg transition-colors shadow-lg shadow-red-500/20"
                                    title="Quick Check-in"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center bg-dark-card/30">
                        <CheckCircle2 className="w-8 h-8 text-orbit-500 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">All caught up! Great job.</p>
                    </div>
                )}
            </div>
        </div>

        {/* Column 2: Up Next (Tasks) */}
        <div className="space-y-4">
             <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-serif font-bold text-white">Up Next</h2>
                <Link to="/reminders" className="text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-orbit-400 transition-colors">View All</Link>
            </div>

            <div className="space-y-3">
                {upNext.length > 0 ? (
                    upNext.map(t => (
                        <div key={t.id} className="bg-dark-card hover:bg-orbit-500/5 p-4 rounded-2xl border border-slate-700/50 hover:border-orbit-500/30 flex items-center justify-between group transition-all shadow-sm">
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => handleTaskToggle(t.id)}
                                    className="w-5 h-5 rounded-full border-2 border-slate-600 hover:border-orbit-500 hover:bg-orbit-500/20 text-transparent hover:text-orbit-500 transition-all flex items-center justify-center group-hover/btn"
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5 opacity-0 hover:opacity-100" />
                                </button>
                                <div>
                                    <h4 className={`text-sm font-medium group-hover:text-orbit-100 transition-colors ${t.isCompleted ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                        {t.title}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-slate-500 group-hover:text-slate-400 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> {t.date === todayStr ? 'Today' : t.date}
                                        </span>
                                        {t.recurrence && t.recurrence !== 'none' && (
                                            <span className="text-[10px] bg-orbit-500/10 text-orbit-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                <Repeat className="w-2 h-2" /> {t.recurrence}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-dark-card/30 p-6 rounded-2xl border border-slate-800 text-center">
                        <p className="text-slate-500 text-sm">No upcoming tasks scheduled.</p>
                        <Link to="/reminders" className="text-orbit-400 text-xs font-medium mt-2 inline-block hover:underline">Plan something</Link>
                    </div>
                )}
            </div>
        </div>

        {/* INSIGHTS CONSOLE - CONSOLIDATED SINGLE CARD */}
        <div className="col-span-1 lg:col-span-2">
             <div className="bg-dark-card rounded-3xl border border-slate-700/50 shadow-xl overflow-hidden">
                 <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
                     <h2 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-orbit-400" /> Network Vitality
                    </h2>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-700/50">
                     
                     {/* 1. Health Bar Section (Left) */}
                     <div className="md:col-span-7 p-6 flex flex-col justify-center">
                        <div className="flex justify-between items-end mb-4">
                            <h3 className="text-sm font-medium text-slate-300">System Status</h3>
                            <span className="text-xs text-slate-500">{people.length} Active Connections</span>
                        </div>
                        
                        {/* Slick Progress Bar */}
                        <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex relative mb-4 shadow-inner">
                             <div style={{width: `${healthyPct}%`}} className="bg-orbit-500 h-full transition-all duration-1000" />
                             <div style={{width: `${driftingPct}%`}} className="bg-yellow-500 h-full transition-all duration-1000" />
                             <div style={{width: `${overduePct}%`}} className="bg-red-500 h-full transition-all duration-1000" />
                        </div>
                        
                        <div className="flex justify-between text-xs text-slate-400 mt-2">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-orbit-500"></span>
                                <span>Healthy ({Math.round(healthyPct)}%)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                <span>Drifting</span>
                            </div>
                             <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                <span>Overdue</span>
                            </div>
                        </div>

                        {/* Activity Mini Chart below bar */}
                        <div className="mt-8 h-24">
                             <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                <Activity className="w-3 h-3" /> 14-Day Activity Pulse
                             </div>
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={activityData}>
                                    <Bar dataKey="count" fill="rgb(var(--orbit-500))" radius={[2, 2, 0, 0]} barSize={15} />
                                    <Tooltip 
                                        cursor={{fill: 'transparent'}} 
                                        contentStyle={{background: '#1e293b', border: 'none', borderRadius: '8px', color: 'white', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} 
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                     </div>

                     {/* 2. Composition (Right) */}
                     <div className="md:col-span-5 p-6 flex flex-col items-center justify-center bg-slate-800/20">
                         <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 w-full text-left">Composition</h3>
                         <div className="relative w-40 h-40">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={circleData} 
                                        innerRadius={45} 
                                        outerRadius={65} 
                                        paddingAngle={4} 
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {circleData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-2xl font-bold text-white">{people.length}</span>
                            </div>
                         </div>
                         <div className="flex flex-wrap justify-center gap-2 mt-4">
                            {circleData.slice(0, 4).map(c => (
                                <div key={c.name} className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded-full">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: c.color}}></div>
                                    {c.name}
                                </div>
                            ))}
                         </div>
                     </div>
                 </div>
             </div>
        </div>
      </div>

        {/* CONTEXT SECTION: Memory Lane & Birthdays */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Memory Lane */}
             <div className="bg-gradient-to-br from-slate-800/80 to-dark-card p-6 rounded-3xl border border-slate-700/50 relative overflow-hidden flex flex-col h-full min-h-[180px]">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <History className="w-24 h-24 text-white" />
                </div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 relative z-10 flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-orbit-400" /> On This Day
                </h3>
                
                <div className="space-y-4 relative z-10 flex-1">
                    {memoryLaneEvents.length > 0 ? (
                        memoryLaneEvents.slice(0, 2).map((evt, idx) => (
                            <div key={idx} className="flex gap-3 items-start group cursor-pointer" onClick={() => navigate(`/person/${evt.person.id}`)}>
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orbit-500 shrink-0 group-hover:scale-150 transition-transform"></div>
                                <div>
                                    <p className="text-sm text-slate-300 leading-snug">
                                        <span className="font-bold text-white">{evt.yearsAgo}y ago:</span> You {evt.interaction.type.toLowerCase()} with <span className="text-orbit-300">{evt.person.name}</span>.
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60 py-2">
                            <History className="w-8 h-8 text-slate-600 mb-2" />
                            <p className="text-xs text-slate-500">No memories for today.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Birthdays */}
            <div className="bg-dark-card p-6 rounded-3xl border border-slate-700/50 h-full min-h-[180px]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        Upcoming Birthdays
                    </h3>
                    <Gift className="w-3 h-3 text-pink-400" />
                </div>
                
                <div className="space-y-2">
                    {upcomingBirthdays.length > 0 ? (
                        upcomingBirthdays.slice(0, 3).map(p => {
                            const bday = new Date(p.birthday!);
                            const bdayMonth = bday.toLocaleString('default', { month: 'short' });
                            const bdayDate = bday.getDate();
                            return (
                                <div key={p.id} onClick={() => navigate(`/person/${p.id}`)} className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded-xl cursor-pointer transition-colors group">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex flex-col items-center justify-center border border-slate-700 group-hover:border-pink-500/50 group-hover:bg-pink-500/10 transition-all">
                                        <span className="text-[9px] text-slate-500 uppercase">{bdayMonth}</span>
                                        <span className="text-sm font-bold text-white">{bdayDate}</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-slate-200 group-hover:text-white">{p.name}</p>
                                        <p className="text-[10px] text-pink-400">Birthday soon</p>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-6">
                            <p className="text-xs text-slate-500">No birthdays in the next 14 days.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
