
import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, Tag, Users, Trash2, Clock, Repeat } from 'lucide-react';
import { Task, Person } from '../types';
import { saveTask, getPeople, generateId } from '../services/storageService';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onAdded }) => {
  const [people, setPeople] = useState<Person[]>([]);
  const [form, setForm] = useState<Partial<Task>>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    type: 'task',
    recurrence: 'none',
    category: 'personal',
    linkedPersonIds: []
  });

  useEffect(() => {
    if (isOpen) {
      setPeople(getPeople());
      // Reset form
      setForm({
        title: '',
        date: new Date().toISOString().split('T')[0],
        type: 'task',
        recurrence: 'none',
        category: 'personal',
        linkedPersonIds: []
      });
    }
  }, [isOpen]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return;

    const newTask: Task = {
      id: generateId(),
      title: form.title,
      date: form.date,
      type: form.type as any,
      recurrence: form.recurrence as any,
      category: form.category as any,
      linkedPersonIds: form.linkedPersonIds || [],
      isCompleted: false
    };

    saveTask(newTask);
    onAdded();
    onClose();
  };

  const togglePerson = (personId: string) => {
      const current = form.linkedPersonIds || [];
      if (current.includes(personId)) {
          setForm({...form, linkedPersonIds: current.filter(id => id !== personId)});
      } else {
          setForm({...form, linkedPersonIds: [...current, personId]});
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-dark-card w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Check className="text-orbit-500" /> New Task
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">What needs to be done?</label>
                <input 
                    placeholder="e.g. Buy gift for Mom, Prepare Q3 Report"
                    className="w-full bg-dark-bg border border-slate-700 rounded-lg px-3 py-3 text-white focus:ring-2 focus:ring-orbit-500/50 outline-none font-medium"
                    value={form.title}
                    onChange={e => setForm({...form, title: e.target.value})}
                    autoFocus
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <Calendar className="w-3 h-3" /> Due Date
                    </label>
                    <input 
                        type="date"
                        className="w-full bg-dark-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                        value={form.date}
                        onChange={e => setForm({...form, date: e.target.value})}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <Tag className="w-3 h-3" /> Category
                    </label>
                    <select
                        className="w-full bg-dark-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none"
                        value={form.category}
                        onChange={e => setForm({...form, category: e.target.value as any})}
                    >
                        <option value="personal">Personal</option>
                        <option value="work">Work</option>
                        <option value="finance">Finance</option>
                        <option value="health">Health</option>
                        <option value="general">General</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <Clock className="w-3 h-3" /> Type
                    </label>
                    <select
                        className="w-full bg-dark-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none"
                        value={form.type}
                        onChange={e => setForm({...form, type: e.target.value as any})}
                    >
                        <option value="task">Task (To-Do)</option>
                        <option value="event">Event (Fixed)</option>
                        <option value="reminder">Reminder</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <Repeat className="w-3 h-3" /> Recurrence
                    </label>
                    <select
                        className="w-full bg-dark-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none"
                        value={form.recurrence}
                        onChange={e => setForm({...form, recurrence: e.target.value as any})}
                    >
                        <option value="none">None</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                </div>
            </div>

            {/* Link People */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Users className="w-3 h-3" /> Related People (Optional)
                </label>
                <select
                    className="w-full bg-dark-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none"
                    onChange={e => {
                        if(e.target.value) togglePerson(e.target.value);
                        e.target.value = ""; // Reset select
                    }}
                >
                    <option value="">Select person to link...</option>
                    {people.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                
                {form.linkedPersonIds && form.linkedPersonIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {form.linkedPersonIds.map(pid => {
                            const p = people.find(x => x.id === pid);
                            return p ? (
                                <span key={pid} className="bg-slate-800 border border-slate-700 text-slate-200 text-xs px-2 py-1 rounded flex items-center gap-1 animate-fade-in">
                                    {p.name} 
                                    <button onClick={() => togglePerson(pid)} className="hover:text-red-400">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ) : null
                        })}
                    </div>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-700 flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-white font-medium text-sm transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={handleSave}
                disabled={!form.title}
                className="px-6 py-2 bg-orbit-600 hover:bg-orbit-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors shadow-lg shadow-orbit-600/20 flex items-center gap-2"
            >
                <Check className="w-4 h-4" />
                Save Task
            </button>
        </div>
      </div>
    </div>
  );
};
