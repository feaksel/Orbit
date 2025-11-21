import React, { useState, useEffect } from 'react';
import { X, Check, Search, Users, Calendar, MessageSquare } from 'lucide-react';
import { Person, Circle, InteractionType } from '../types';
import { getPeople, getCircles } from '../services/storageService';

interface InteractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { personIds: string[], type: InteractionType, date: string, notes: string }) => void;
  initialPersonId?: string; // If provided, single person mode. If null, group mode.
}

export const InteractionModal: React.FC<InteractionModalProps> = ({ isOpen, onClose, onSubmit, initialPersonId }) => {
  const [people, setPeople] = useState<Person[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  
  // Form State
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [type, setType] = useState<InteractionType>(InteractionType.MEETING);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPeople(getPeople());
      setCircles(getCircles());
      
      if (initialPersonId) {
        setSelectedPersonIds([initialPersonId]);
        setNotes('Just caught up.');
        setType(InteractionType.MESSAGE);
      } else {
        setSelectedPersonIds([]);
        setNotes('');
        setType(InteractionType.MEETING);
      }
    }
  }, [isOpen, initialPersonId]);

  const togglePerson = (id: string) => {
    setSelectedPersonIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const selectCircle = (circleId: string) => {
    const circleMemberIds = people.filter(p => p.circles.includes(circleId)).map(p => p.id);
    // Add all members who aren't already selected
    const newSelection = [...new Set([...selectedPersonIds, ...circleMemberIds])];
    setSelectedPersonIds(newSelection);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      personIds: selectedPersonIds,
      type,
      date: new Date(date).toISOString(),
      notes
    });
    onClose();
  };

  if (!isOpen) return null;

  const filteredPeople = people.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-dark-card w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {initialPersonId ? (
                <>
                    <Check className="text-green-500" /> Quick Tick-off
                </>
            ) : (
                <>
                    <Users className="text-orbit-500" /> Log Event (Multiple People)
                </>
            )}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
            
            {/* Selector (Only show in group mode or if user wants to change selection) */}
            {!initialPersonId && (
                <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-300">Who was there?</label>
                    
                    {/* Circle Quick Select */}
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {circles.map(c => (
                            <button 
                                key={c.id} 
                                type="button"
                                onClick={() => selectCircle(c.id)}
                                className="text-xs px-3 py-1.5 rounded-full whitespace-nowrap bg-slate-800 hover:opacity-80 text-white transition-opacity border border-slate-700"
                                style={{ borderLeftColor: c.color, borderLeftWidth: 3 }}
                            >
                                + {c.name}
                            </button>
                        ))}
                    </div>

                    {/* Search & List */}
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                        <input 
                            type="text"
                            placeholder="Search to add people..."
                            className="w-full bg-dark-bg border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-orbit-500 outline-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    
                    <div className="max-h-40 overflow-y-auto bg-dark-bg/50 rounded-lg border border-slate-700/50 divide-y divide-slate-700/50">
                        {filteredPeople.map(p => (
                            <div 
                                key={p.id} 
                                onClick={() => togglePerson(p.id)}
                                className={`flex items-center justify-between p-3 cursor-pointer hover:bg-slate-800/50 transition-colors ${selectedPersonIds.includes(p.id) ? 'bg-orbit-900/20' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    <img src={p.avatar || `https://ui-avatars.com/api/?name=${p.name}&background=334155&color=fff`} className="w-6 h-6 rounded-full" alt="" />
                                    <span className={`text-sm ${selectedPersonIds.includes(p.id) ? 'text-orbit-400 font-medium' : 'text-slate-300'}`}>
                                        {p.name}
                                    </span>
                                </div>
                                {selectedPersonIds.includes(p.id) && <Check className="w-4 h-4 text-orbit-500" />}
                            </div>
                        ))}
                        {filteredPeople.length === 0 && <p className="p-3 text-xs text-slate-500 text-center">No matching contacts</p>}
                    </div>
                    <p className="text-xs text-right text-slate-500">
                        {selectedPersonIds.length > 0 ? 
                            `Interaction will be logged for ${selectedPersonIds.length} people.` : 
                            'Please select at least one person.'}
                    </p>
                </div>
            )}

            {/* Interaction Details */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Type</label>
                    <select 
                        value={type} 
                        onChange={(e) => setType(e.target.value as InteractionType)}
                        className="w-full bg-dark-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-orbit-500 outline-none"
                    >
                        {Object.values(InteractionType).map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Date</label>
                    <input 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-dark-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-orbit-500 outline-none"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Notes</label>
                <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="What did you do? What did you talk about?"
                    className="w-full h-24 bg-dark-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-orbit-500 outline-none resize-none"
                />
            </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-700 flex justify-end gap-3">
            <button 
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-white font-medium text-sm transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={handleSubmit}
                disabled={selectedPersonIds.length === 0}
                className="px-6 py-2 bg-orbit-600 hover:bg-orbit-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors shadow-lg shadow-orbit-600/20 flex items-center gap-2"
            >
                <Check className="w-4 h-4" />
                Log for {selectedPersonIds.length} {selectedPersonIds.length === 1 ? 'Person' : 'People'}
            </button>
        </div>
      </div>
    </div>
  );
};