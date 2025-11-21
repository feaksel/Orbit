
import React, { useState, useEffect } from 'react';
import { getTasks, saveTask, toggleTaskCompletion, deleteTask, getPeople, generateId, DATA_UPDATE_EVENT } from '../services/storageService';
import { Task, Person } from '../types';
import { CheckCircle2, Circle as CircleIcon, Plus, Trash2, Calendar, Repeat, Tag, Users, List, ClipboardList, Archive, Undo2, ChevronLeft, ChevronRight, ArrowRightCircle, Inbox } from 'lucide-react';

export const Reminders: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [view, setView] = useState<'list' | 'calendar' | 'archived' | 'recurring'>('list');
  
  // Quick Add State
  const [quickAddText, setQuickAddText] = useState('');
  
  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());

  // New Task Form
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
      title: '',
      date: new Date().toISOString().split('T')[0],
      type: 'task',
      recurrence: 'none',
      category: 'personal',
      linkedPersonIds: []
  });

  const refresh = () => {
      const currentTasks = getTasks();
      setTasks([...currentTasks]); // Force new array reference to trigger re-renders
      setPeople(getPeople());
  };

  useEffect(() => {
      refresh();
      const handleDataUpdate = () => refresh();
      window.addEventListener(DATA_UPDATE_EVENT, handleDataUpdate);
      return () => window.removeEventListener(DATA_UPDATE_EVENT, handleDataUpdate);
  }, []);

  const handleSaveTask = () => {
      if (newTask.title) {
          const task: Task = {
              id: generateId(),
              title: newTask.title,
              date: newTask.date, // Can be undefined now
              type: newTask.type as any,
              recurrence: newTask.recurrence as any,
              category: newTask.category as any,
              linkedPersonIds: newTask.linkedPersonIds,
              isCompleted: false
          };
          saveTask(task);
          setIsAdding(false);
          setNewTask({
            title: '',
            date: new Date().toISOString().split('T')[0],
            type: 'task',
            recurrence: 'none',
            category: 'personal',
            linkedPersonIds: []
          });
          refresh();
      }
  };

  const handleQuickAdd = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && quickAddText.trim()) {
          const task: Task = {
              id: generateId(),
              title: quickAddText.trim(),
              // No date -> General To-Do
              type: 'task',
              recurrence: 'none',
              category: 'general',
              isCompleted: false
          };
          saveTask(task);
          setQuickAddText('');
          refresh();
      }
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
      if (e) {
          e.stopPropagation();
      }
      // Direct delete without confirmation for smoother UX and reliability
      deleteTask(id);
      refresh();
  };

  const toggleComplete = (id: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      toggleTaskCompletion(id);
      refresh();
  };

  // --- Calendar Logic ---
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const renderCalendar = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = getDaysInMonth(year, month);
      const firstDay = getFirstDayOfMonth(year, month);
      
      const days = [];
      
      // Padding for empty days at start
      for (let i = 0; i < firstDay; i++) {
          days.push(<div key={`empty-${i}`} className="min-h-[100px] bg-slate-800/30 border border-slate-700/50 p-2"></div>);
      }

      // Actual days
      for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const daysTasks = tasks.filter(t => !t.isCompleted && t.date === dateStr);
          const isToday = new Date().toISOString().split('T')[0] === dateStr;

          days.push(
              <div key={day} className={`min-h-[100px] bg-dark-card border border-slate-700/50 p-2 hover:bg-slate-800/50 transition-colors ${isToday ? 'ring-1 ring-inset ring-orbit-500' : ''}`}>
                  <div className="text-right text-sm mb-1">
                      <span className={`${isToday ? 'bg-orbit-600 text-white px-1.5 py-0.5 rounded-full text-xs' : 'text-slate-400'}`}>{day}</span>
                  </div>
                  <div className="space-y-1">
                      {daysTasks.map(t => (
                          <div 
                            key={t.id} 
                            className={`text-[10px] px-1.5 py-1 rounded truncate cursor-pointer flex items-center gap-1 group relative overflow-hidden ${
                                t.category === 'work' ? 'bg-blue-500/20 text-blue-300' :
                                t.category === 'finance' ? 'bg-green-500/20 text-green-300' :
                                t.category === 'health' ? 'bg-red-500/20 text-red-300' :
                                'bg-purple-500/20 text-purple-300'
                            }`}
                            onClick={(e) => toggleComplete(t.id, e)}
                            title={t.title}
                          >
                              {t.type === 'task' ? <CircleIcon className="w-2 h-2 shrink-0" /> : <Calendar className="w-2 h-2 shrink-0" />}
                              <span className="truncate">{t.title}</span>
                          </div>
                      ))}
                  </div>
              </div>
          );
      }

      return days;
  };

  const changeMonth = (offset: number) => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + offset);
      setCurrentDate(newDate);
  };

  // Filtering
  const today = new Date().toISOString().split('T')[0];
  
  // Active Tasks
  const activeTasks = tasks.filter(t => !t.isCompleted);
  
  // Grouped Archives
  const archivedTasks = tasks.filter(t => t.isCompleted).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  
  const getArchivedGroups = () => {
      // We can't easily know exact completion time without a timestamp field, 
      // but we can group loosely if we had it. Since we don't, we'll just list them.
      // Alternatively, we can group by "Scheduled Date" as a proxy for history context.
      const todayCompleted = archivedTasks.filter(t => t.date === today);
      const olderCompleted = archivedTasks.filter(t => t.date !== today);
      return { todayCompleted, olderCompleted };
  };
  const { todayCompleted, olderCompleted } = getArchivedGroups();

  // Recurring Tasks (Active only)
  const recurringTasks = activeTasks.filter(t => t.recurrence && t.recurrence !== 'none').sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  // General To-Dos (No Date)
  const generalTodos = activeTasks.filter(t => !t.date);

  // Scheduled Tasks
  const scheduledTasks = activeTasks.filter(t => !!t.date).sort((a, b) => (a.date!).localeCompare(b.date!));

  const groupedScheduled = {
      overdue: scheduledTasks.filter(t => t.date! < today),
      today: scheduledTasks.filter(t => t.date! === today),
      upcoming: scheduledTasks.filter(t => t.date! > today)
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 pb-24 md:pb-6 animate-fade-in">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold text-white">Reminders & Planning</h1>
                <p className="text-slate-400">Track recurring obligations and brain dump ideas.</p>
            </div>
            <button 
                onClick={() => setIsAdding(true)}
                className="bg-orbit-600 hover:bg-orbit-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-orbit-600/20 transition-all"
            >
                <Plus className="w-4 h-4" /> Add Task
            </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 border-b border-slate-700 pb-1 overflow-x-auto no-scrollbar">
            <button 
                onClick={() => setView('list')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${view === 'list' ? 'border-orbit-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
                <List className="w-4 h-4 inline mr-2" />
                To-Do List
            </button>
            <button 
                onClick={() => setView('recurring')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${view === 'recurring' ? 'border-orbit-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
                <Repeat className="w-4 h-4 inline mr-2" />
                Recurring
            </button>
            <button 
                onClick={() => setView('calendar')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${view === 'calendar' ? 'border-orbit-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
                <Calendar className="w-4 h-4 inline mr-2" />
                Calendar View
            </button>
            <button 
                onClick={() => setView('archived')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${view === 'archived' ? 'border-orbit-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
                <Archive className="w-4 h-4 inline mr-2" />
                Archived
            </button>
        </div>

        {/* Add Form */}
        {isAdding && (
            <div className="bg-dark-card p-6 rounded-2xl border border-slate-700 animate-fade-in space-y-4 mb-8">
                <h3 className="text-lg font-bold text-white">New Task / Event</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                        placeholder="Title (e.g. Buy Milk, Weekly Call)"
                        className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                        value={newTask.title}
                        onChange={e => setNewTask({...newTask, title: e.target.value})}
                        autoFocus
                    />
                    <div className="relative">
                        <input 
                            type="date"
                            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white placeholder-slate-400"
                            value={newTask.date || ''}
                            onChange={e => setNewTask({...newTask, date: e.target.value})}
                        />
                        <button 
                            onClick={() => setNewTask({...newTask, date: undefined})}
                            className="absolute right-8 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                        >
                            Clear
                        </button>
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                            <Calendar className="w-4 h-4" />
                        </span>
                    </div>
                    
                    <select
                        className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                        value={newTask.type}
                        onChange={e => setNewTask({...newTask, type: e.target.value as any})}
                    >
                        <option value="task">Task</option>
                        <option value="event">Event</option>
                        <option value="reminder">Reminder</option>
                    </select>
                     <select
                        className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                        value={newTask.recurrence}
                        onChange={e => setNewTask({...newTask, recurrence: e.target.value as any})}
                    >
                        <option value="none">No Recurrence</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                    <select
                        className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                        value={newTask.category}
                        onChange={e => setNewTask({...newTask, category: e.target.value as any})}
                    >
                        <option value="personal">Personal</option>
                        <option value="work">Work</option>
                        <option value="finance">Finance</option>
                        <option value="health">Health</option>
                    </select>
                    
                    {/* Link People */}
                     <select
                        className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                        onChange={e => {
                            if(e.target.value) {
                                const current = newTask.linkedPersonIds || [];
                                if(!current.includes(e.target.value)) setNewTask({...newTask, linkedPersonIds: [...current, e.target.value]});
                            }
                        }}
                    >
                        <option value="">Link Person (Optional)</option>
                        {people.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                {/* Selected People Chips */}
                {newTask.linkedPersonIds && newTask.linkedPersonIds.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                        {newTask.linkedPersonIds.map(pid => {
                            const p = people.find(x => x.id === pid);
                            return p ? (
                                <span key={pid} className="bg-orbit-900 text-orbit-200 text-xs px-2 py-1 rounded flex items-center gap-1">
                                    {p.name} 
                                    <button onClick={() => setNewTask({...newTask, linkedPersonIds: newTask.linkedPersonIds?.filter(id => id !== pid)})}>
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </span>
                            ) : null
                        })}
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white px-4 py-2">Cancel</button>
                    <button onClick={handleSaveTask} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg">Save</button>
                </div>
            </div>
        )}

        {/* List View */}
        {view === 'list' && (
            <div className="space-y-8 animate-fade-in">
                {/* Brain Dump Input */}
                <div className="relative group">
                    <input 
                        value={quickAddText}
                        onChange={(e) => setQuickAddText(e.target.value)}
                        onKeyDown={handleQuickAdd}
                        placeholder="Brain dump: What's on your mind? (Press Enter)"
                        className="w-full bg-dark-card border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-orbit-500 outline-none shadow-lg transition-all"
                    />
                    <Plus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orbit-500 transition-colors w-5 h-5" />
                </div>

                {/* General Inbox Section */}
                <div className="bg-dark-card/30 rounded-2xl border border-slate-800 p-5">
                     <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-slate-300 flex items-center gap-2">
                        <Inbox className="w-4 h-4" /> Inbox (Unscheduled)
                    </h3>
                    <div className="grid gap-3">
                        {generalTodos.map(task => (
                             <div key={task.id} className="bg-dark-card p-4 rounded-xl border border-slate-700/50 flex items-center justify-between group hover:border-orbit-500/50 transition-all">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => toggleComplete(task.id)} className="text-slate-500 hover:text-green-500 transition-colors">
                                        <CircleIcon className="w-6 h-6" />
                                    </button>
                                    <div>
                                        <h4 className="text-white font-medium flex items-center gap-2">
                                            {task.title}
                                        </h4>
                                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                            <span className="flex items-center gap-1 capitalize"><Tag className="w-3 h-3" /> {task.category}</span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => handleDelete(task.id, e)} 
                                    className="text-slate-600 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-2"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {generalTodos.length === 0 && (
                            <p className="text-sm text-slate-600 italic pl-2">Your brain is clear! Add ideas above.</p>
                        )}
                    </div>
                </div>

                {/* Scheduled Sections */}
                {['overdue', 'today', 'upcoming'].map(group => {
                    const groupTasks = groupedScheduled[group as keyof typeof groupedScheduled];
                    if (groupTasks.length === 0) return null;
                    
                    return (
                        <div key={group}>
                            <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${
                                group === 'overdue' ? 'text-red-400' : 
                                group === 'today' ? 'text-green-400' : 'text-slate-400'
                            }`}>
                                <Calendar className="w-4 h-4" /> {group}
                            </h3>
                            <div className="grid gap-3">
                                {groupTasks.map(task => (
                                    <div key={task.id} className="bg-dark-card p-4 rounded-xl border border-slate-700/50 flex items-center justify-between group hover:border-orbit-500/50 transition-all">
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => toggleComplete(task.id)} className="text-slate-500 hover:text-green-500 transition-colors">
                                                <CircleIcon className="w-6 h-6" />
                                            </button>
                                            <div>
                                                <h4 className="text-white font-medium flex items-center gap-2">
                                                    {task.title}
                                                    {task.recurrence && task.recurrence !== 'none' && <Repeat className="w-3 h-3 text-purple-400" />}
                                                </h4>
                                                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {task.date}</span>
                                                    <span className="flex items-center gap-1 capitalize"><Tag className="w-3 h-3" /> {task.category}</span>
                                                    {task.linkedPersonIds && task.linkedPersonIds.length > 0 && (
                                                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {task.linkedPersonIds.length} people</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => handleDelete(task.id, e)} 
                                            className="text-slate-600 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-2"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        )}

        {/* Recurring View - DEDICATED TAB */}
        {view === 'recurring' && (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl flex items-start gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400 mt-1">
                        <Repeat className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold">Recurring Obligations</h3>
                        <p className="text-sm text-slate-400">Everything that happens on a schedule. Completing these will automatically schedule the next one.</p>
                    </div>
                </div>

                <div className="grid gap-3">
                    {recurringTasks.length === 0 ? (
                        <div className="text-center py-12 border border-slate-800 border-dashed rounded-xl">
                            <p className="text-slate-500">No recurring tasks found.</p>
                        </div>
                    ) : (
                        recurringTasks.map(task => (
                             <div key={task.id} className="bg-dark-card p-4 rounded-xl border border-slate-700/50 flex items-center justify-between group hover:border-orbit-500/50 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-center justify-center w-12 h-12 bg-slate-800 rounded-lg border border-slate-700 text-slate-400">
                                        <span className="text-xs uppercase font-bold">{new Date(task.date!).toLocaleString('default', {month: 'short'})}</span>
                                        <span className="text-lg font-bold text-white">{new Date(task.date!).getDate()}</span>
                                    </div>
                                    <div>
                                        <h4 className="text-white font-medium flex items-center gap-2">
                                            {task.title}
                                        </h4>
                                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                            <span className="flex items-center gap-1 bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded capitalize">
                                                <Repeat className="w-3 h-3" /> {task.recurrence}
                                            </span>
                                            <span className="flex items-center gap-1 capitalize"><Tag className="w-3 h-3" /> {task.category}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => toggleComplete(task.id)} 
                                        className="bg-green-600/20 text-green-500 hover:bg-green-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                    >
                                        Complete
                                    </button>
                                    <button 
                                        onClick={(e) => handleDelete(task.id, e)} 
                                        className="text-slate-600 hover:text-red-500 p-2 rounded-lg hover:bg-slate-800 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}
        
        {/* Archived View (Stacked) */}
        {view === 'archived' && (
             <div className="space-y-8 animate-fade-in">
                
                {/* Today's Completed Stack */}
                {todayCompleted.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-green-400 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> Completed Today
                        </h3>
                        <div className="grid gap-3 opacity-75">
                            {todayCompleted.map(task => (
                                <div key={task.id} className="bg-dark-card/50 p-4 rounded-xl border border-slate-800 flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                                        <div>
                                            <h4 className="text-slate-300 font-medium line-through decoration-slate-600">
                                                {task.title}
                                            </h4>
                                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {task.date || 'No date'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => toggleComplete(task.id)} className="text-slate-600 hover:text-orbit-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity" title="Restore">
                                            <Undo2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Older History Stack */}
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-slate-400 flex items-center gap-2">
                        <Archive className="w-4 h-4" /> History
                    </h3>
                    <div className="grid gap-3">
                        {olderCompleted.map(task => (
                            <div key={task.id} className="bg-dark-card/30 p-4 rounded-xl border border-slate-800/50 flex items-center justify-between group hover:bg-dark-card/50 transition-colors">
                                <div className="flex items-center gap-4 opacity-50 hover:opacity-100 transition-opacity">
                                    <CheckCircle2 className="w-6 h-6 text-slate-600" />
                                    <div>
                                        <h4 className="text-slate-400 font-medium line-through decoration-slate-600">
                                            {task.title}
                                        </h4>
                                        <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {task.date || 'No date'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => toggleComplete(task.id)} className="text-slate-600 hover:text-orbit-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity" title="Restore">
                                        <Undo2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={(e) => handleDelete(task.id, e)} className="text-slate-600 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete Forever">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {olderCompleted.length === 0 && todayCompleted.length === 0 && (
                            <p className="text-center text-slate-600 py-8 border border-dashed border-slate-800 rounded-xl">No archived tasks found.</p>
                        )}
                    </div>
                </div>
             </div>
        )}
        
        {/* Calendar Grid View */}
        {view === 'calendar' && (
             <div className="bg-dark-card rounded-2xl border border-slate-700 overflow-hidden animate-fade-in">
                 
                 {/* Calendar Header */}
                 <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
                     <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-700 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
                     <h2 className="text-lg font-bold text-white">
                         {currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                     </h2>
                     <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-700 rounded-lg"><ChevronRight className="w-5 h-5" /></button>
                 </div>

                 {/* Days Header */}
                 <div className="grid grid-cols-7 text-center text-slate-500 text-xs uppercase py-2 bg-slate-800/30 border-b border-slate-700">
                     {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
                 </div>
                 
                 {/* Grid */}
                 <div className="grid grid-cols-7">
                    {renderCalendar()}
                 </div>
             </div>
        )}
    </div>
  );
};
