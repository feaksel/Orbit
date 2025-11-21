
import React, { useState, useEffect } from 'react';
import { X, Check, User, Briefcase, Calendar, Star, AlignLeft, Phone, Smartphone, Circle as CircleIcon, Plus, Clock, Tag } from 'lucide-react';
import { Person, Circle } from '../types';
import { savePerson, getCircles, createNewCircle, generateId } from '../services/storageService';

interface AddPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export const AddPersonModal: React.FC<AddPersonModalProps> = ({ isOpen, onClose, onAdded }) => {
  const [form, setForm] = useState<Partial<Person>>({
    name: '',
    role: '',
    company: '',
    birthday: '',
    phone: '',
    isFavorite: false,
    notes: '',
    circles: [],
    tags: [], 
    desiredFrequencyDays: 14
  });
  
  const [allCircles, setAllCircles] = useState<Circle[]>([]);
  const [circleInput, setCircleInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [importStatus, setImportStatus] = useState('');

  useEffect(() => {
    if (isOpen) {
        setAllCircles(getCircles());
    }
  }, [isOpen]);

  const handleAddCircle = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (circleInput.trim()) {
      const name = circleInput.trim();
      let circleId = '';
      
      // Check if exists
      const existing = allCircles.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (existing) {
          circleId = existing.id;
      } else {
          // Create new
          const newCircle = createNewCircle(name);
          setAllCircles(prev => [...prev, newCircle]);
          circleId = newCircle.id;
      }

      const currentCircles = form.circles || [];
      if (!currentCircles.includes(circleId)) {
          setForm({ ...form, circles: [...currentCircles, circleId] });
      }
      setCircleInput('');
    }
  };

  const toggleCircle = (circleId: string) => {
    const currentCircles = form.circles || [];
    if (currentCircles.includes(circleId)) {
        setForm({ ...form, circles: currentCircles.filter(c => c !== circleId) });
    } else {
        setForm({ ...form, circles: [...currentCircles, circleId] });
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && tagInput.trim()) {
          e.preventDefault();
          const currentTags = form.tags || [];
          if (!currentTags.includes(tagInput.trim())) {
              setForm({ ...form, tags: [...currentTags, tagInput.trim()] });
          }
          setTagInput('');
      }
  };

  const removeTag = (tag: string) => {
      setForm({ ...form, tags: (form.tags || []).filter(t => t !== tag) });
  };

  const handleImportContacts = async () => {
      // @ts-ignore
      if ('contacts' in navigator && 'ContactsManager' in window) {
          try {
              const props = ['name', 'tel', 'email'];
              const opts = { multiple: true };
              // @ts-ignore
              const contacts = await navigator.contacts.select(props, opts);
              
              let importedCount = 0;
              for (const contact of contacts) {
                  const newPerson: Person = {
                      id: generateId(),
                      name: contact.name?.[0] || 'Unknown',
                      phone: contact.tel?.[0] || '',
                      email: contact.email?.[0] || '',
                      circles: [],
                      tags: [],
                      desiredFrequencyDays: 14,
                      interactions: []
                  };
                  savePerson(newPerson);
                  importedCount++;
              }
              setImportStatus(`Imported ${importedCount} contacts!`);
              onAdded();
              onClose();
          } catch (ex) {
              console.error(ex);
              setImportStatus("Import failed or cancelled.");
          }
      } else {
          setImportStatus("Not supported on this device/browser.");
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;

    const newPerson: Person = {
      id: generateId(),
      name: form.name,
      role: form.role,
      company: form.company,
      birthday: form.birthday,
      phone: form.phone,
      isFavorite: form.isFavorite,
      notes: form.notes,
      circles: form.circles || [],
      tags: form.tags || [],
      desiredFrequencyDays: form.desiredFrequencyDays || 14,
      interactions: [],
      socialLinks: [],
      attachments: []
    };

    savePerson(newPerson);
    
    // Reset form
    setForm({
      name: '',
      role: '',
      company: '',
      birthday: '',
      phone: '',
      isFavorite: false,
      notes: '',
      circles: [],
      tags: [],
      desiredFrequencyDays: 14
    });
    setCircleInput('');
    setTagInput('');
    
    onAdded();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-dark-card w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="p-5 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <User className="text-orbit-500" /> Add Connection
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
            
            {/* Import Button */}
            <button 
                onClick={handleImportContacts}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center justify-center gap-2 transition-colors border border-slate-700 mb-2"
            >
                <Smartphone className="w-4 h-4" />
                Import from Device
            </button>
            {importStatus && <p className="text-xs text-center text-orbit-400">{importStatus}</p>}

            <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-800"></span></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-dark-card px-2 text-slate-500">Or Manually</span></div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Name *</label>
                <input 
                    type="text"
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="e.g. Jane Doe"
                    className="w-full bg-dark-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-orbit-500 outline-none"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <Briefcase className="w-3 h-3" /> Role
                    </label>
                    <input 
                        type="text"
                        value={form.role}
                        onChange={e => setForm({...form, role: e.target.value})}
                        placeholder="Product Mgr"
                        className="w-full bg-dark-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-orbit-500 outline-none"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Company</label>
                    <input 
                        type="text"
                        value={form.company}
                        onChange={e => setForm({...form, company: e.target.value})}
                        placeholder="Acme Inc"
                        className="w-full bg-dark-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-orbit-500 outline-none"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Phone className="w-3 h-3" /> Phone
                </label>
                <input 
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm({...form, phone: e.target.value})}
                    className="w-full bg-dark-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-orbit-500 outline-none"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <Calendar className="w-3 h-3" /> Birthday
                    </label>
                    <input 
                        type="date"
                        value={form.birthday}
                        onChange={e => setForm({...form, birthday: e.target.value})}
                        className="w-full bg-dark-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-orbit-500 outline-none"
                    />
                </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <Clock className="w-3 h-3" /> Frequency
                    </label>
                    <select 
                        value={form.desiredFrequencyDays}
                        onChange={e => setForm({...form, desiredFrequencyDays: Number(e.target.value)})}
                        className="w-full bg-dark-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-orbit-500 outline-none"
                    >
                        <option value={7}>Weekly</option>
                        <option value={14}>Every 2 Weeks</option>
                        <option value={30}>Monthly</option>
                        <option value={60}>Every 2 Months</option>
                        <option value={90}>Quarterly</option>
                        <option value={180}>Every 6 Months</option>
                        <option value={365}>Yearly</option>
                    </select>
                </div>
            </div>
            
            {/* Circles Section */}
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <CircleIcon className="w-3 h-3" /> Circles
                    </label>
                    <button 
                        type="button"
                        onClick={() => setForm({...form, isFavorite: !form.isFavorite})}
                        className={`text-xs px-2 py-1 rounded-full border flex items-center gap-1 transition-colors ${
                            form.isFavorite 
                            ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' 
                            : 'border-slate-600 text-slate-400 hover:border-slate-400'
                        }`}
                    >
                        <Star className={`w-3 h-3 ${form.isFavorite ? 'fill-current' : ''}`} />
                        {form.isFavorite ? 'Favorite' : 'Mark as Favorite'}
                    </button>
                </div>

                <div className="flex flex-wrap gap-2">
                    {allCircles.map(circle => {
                        const isSelected = form.circles?.includes(circle.id);
                        return (
                            <button
                                key={circle.id}
                                type="button"
                                onClick={() => toggleCircle(circle.id)}
                                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                                    isSelected 
                                    ? 'text-white border-transparent ring-1 ring-white/20' 
                                    : 'text-slate-400 border-slate-700 hover:border-slate-500 bg-slate-800/50'
                                }`}
                                style={{ backgroundColor: isSelected ? circle.color : undefined }}
                            >
                                {circle.name}
                            </button>
                        );
                    })}
                    
                    {/* Inline New Circle Creator */}
                    <div className="relative flex items-center">
                        <input 
                            type="text"
                            value={circleInput}
                            onChange={e => setCircleInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddCircle(e)}
                            placeholder="+ New"
                            className="bg-transparent border border-slate-700 border-dashed rounded-full px-3 py-1.5 text-xs text-white focus:border-orbit-500 outline-none w-20 focus:w-28 transition-all placeholder-slate-500"
                        />
                        {circleInput && (
                            <button 
                                onClick={handleAddCircle} 
                                className="absolute right-1 p-0.5 bg-orbit-600 rounded-full text-white"
                            >
                                <Plus className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tags Section */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Tag className="w-3 h-3" /> Tags
                </label>
                <div className="flex flex-wrap items-center gap-2 bg-dark-bg border border-slate-700 rounded-lg p-2">
                    {form.tags?.map((tag, idx) => (
                        <span key={idx} className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded flex items-center gap-1">
                            {tag}
                            <button type="button" onClick={() => removeTag(tag)} className="hover:text-white"><X className="w-3 h-3" /></button>
                        </span>
                    ))}
                    <input 
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                        placeholder={form.tags?.length ? "+ Add tag" : "Add tags (e.g. Gym, College)..."}
                        className="bg-transparent outline-none text-xs text-white placeholder-slate-500 flex-1 min-w-[100px]"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <AlignLeft className="w-3 h-3" /> Initial Note
                </label>
                <textarea 
                    value={form.notes}
                    onChange={e => setForm({...form, notes: e.target.value})}
                    placeholder="Met at the conference, loves hiking..."
                    rows={3}
                    className="w-full bg-dark-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-orbit-500 outline-none resize-none"
                />
            </div>

        </div>

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
                disabled={!form.name}
                className="px-6 py-2 bg-orbit-600 hover:bg-orbit-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors shadow-lg shadow-orbit-600/20 flex items-center gap-2"
            >
                <Check className="w-4 h-4" />
                Save Connection
            </button>
        </div>
      </div>
    </div>
  );
};
