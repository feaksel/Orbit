import React, { useState, useEffect } from 'react';
import { getPeople, getCircles, addInteraction } from '../services/storageService';
import { Person, Circle, InteractionType } from '../types';
import { PersonCard } from '../components/PersonCard';
import { calculateHealthScore } from '../components/HealthBadge';
import { Search, Plus, Star, ArrowUpDown, ArrowDownAZ, Activity } from 'lucide-react';
import { InteractionModal } from '../components/InteractionModal';
import { AddPersonModal } from '../components/AddPersonModal';

export const People: React.FC = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtering & Sorting
  const [selectedCircle, setSelectedCircle] = useState<string>('all'); // 'all', 'favorites', or circleId
  const [sortMode, setSortMode] = useState<'health' | 'alpha'>('health');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [modalPersonId, setModalPersonId] = useState<string | undefined>(undefined);

  const refreshData = () => {
    setPeople(getPeople());
    setCircles(getCircles());
  };

  useEffect(() => {
    refreshData();
    const handleOpenAddPerson = () => {
        setIsAddPersonOpen(true);
    };
    window.addEventListener('open-add-person', handleOpenAddPerson);
    return () => window.removeEventListener('open-add-person', handleOpenAddPerson);
  }, []);

  const handleQuickLog = (personId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalPersonId(personId);
    setIsModalOpen(true);
  };

  const handleModalSubmit = (data: { personIds: string[], type: InteractionType, date: string, notes: string }) => {
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

  // Filter Logic
  const filteredPeople = people.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesCircle = true;
    if (selectedCircle === 'favorites') {
        matchesCircle = !!p.isFavorite;
    } else if (selectedCircle !== 'all') {
        matchesCircle = p.circles.includes(selectedCircle);
    }
    
    return matchesSearch && matchesCircle;
  });

  // Sort Logic
  const sortedPeople = [...filteredPeople].sort((a, b) => {
      if (sortMode === 'health') {
          // Sort by health score ascending (lowest score first -> needs most attention)
          const scoreA = calculateHealthScore(a.lastContactDate, a.desiredFrequencyDays);
          const scoreB = calculateHealthScore(b.lastContactDate, b.desiredFrequencyDays);
          return scoreA - scoreB;
      } else {
          // Alphabetical
          return a.name.localeCompare(b.name);
      }
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-24 md:pb-6">
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-white">People</h1>
                <p className="text-slate-400 mt-1">{people.length} connections total</p>
            </div>
            
            <div className="relative w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search contacts..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-dark-card border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-orbit-500 outline-none w-full md:w-72 shadow-sm"
                />
            </div>
        </div>

        {/* Filters & Sort Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Chips */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mask-linear-fade flex-1">
                <button 
                    onClick={() => setSelectedCircle('all')}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                        selectedCircle === 'all' 
                        ? 'bg-white text-slate-900 shadow-md' 
                        : 'bg-dark-card text-slate-400 border border-slate-700 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                >
                    All Circles
                </button>
                <button 
                    onClick={() => setSelectedCircle('favorites')}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                        selectedCircle === 'favorites'
                        ? 'bg-yellow-500 text-slate-900 shadow-md' 
                        : 'bg-dark-card text-yellow-500 border border-slate-700 hover:bg-slate-800'
                    }`}
                >
                    <Star className={`w-3 h-3 ${selectedCircle !== 'favorites' ? 'fill-transparent' : 'fill-slate-900'}`} />
                    Favorites
                </button>
                {circles.map(c => (
                    <button 
                        key={c.id}
                        onClick={() => setSelectedCircle(c.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                            selectedCircle === c.id
                            ? 'text-white shadow-md' 
                            : 'bg-dark-card text-slate-400 border border-slate-700 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                        style={selectedCircle === c.id ? { backgroundColor: c.color } : {}}
                    >
                        {selectedCircle !== c.id && <div className="w-2 h-2 rounded-full" style={{backgroundColor: c.color}}></div>}
                        {c.name}
                    </button>
                ))}
            </div>

            {/* Sort Toggle */}
            <div className="flex bg-dark-card border border-slate-700 rounded-lg p-1 shrink-0">
                <button 
                    onClick={() => setSortMode('health')}
                    className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors ${
                        sortMode === 'health' 
                        ? 'bg-orbit-600 text-white' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                >
                    <Activity className="w-3 h-3" /> Needs Attention
                </button>
                <button 
                    onClick={() => setSortMode('alpha')}
                    className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors ${
                        sortMode === 'alpha' 
                        ? 'bg-orbit-600 text-white' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                >
                    <ArrowDownAZ className="w-3 h-3" /> A-Z
                </button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedPeople.map(p => (
            <PersonCard 
                key={p.id} 
                person={p} 
                circles={circles} 
                onQuickLog={handleQuickLog} 
            />
        ))}
        
        {/* Add New Placeholder Card */}
        <div 
            onClick={() => setIsAddPersonOpen(true)}
            className="group border border-slate-800 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center hover:border-orbit-500/50 hover:bg-orbit-500/5 transition-all cursor-pointer min-h-[200px]"
        >
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6 text-slate-400 group-hover:text-orbit-500" />
            </div>
            <h3 className="text-slate-300 font-medium">Add Connection</h3>
            <p className="text-xs text-slate-500 mt-1">Manually add a new contact</p>
        </div>

        {sortedPeople.length === 0 && (
            <div className="col-span-full py-12 text-center">
                <p className="text-slate-500">No contacts found matching your criteria.</p>
            </div>
        )}
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