
import React, { useState } from 'react';
import { Sparkles, ArrowRight, Loader2, X, Check, Calendar, Users, MessageSquare, Edit2, HelpCircle } from 'lucide-react';
import { parseConversationalInput } from '../services/geminiService';
import { getPeople, savePerson, addInteraction } from '../services/storageService';
import { InteractionType, Person } from '../types';

interface MagicInputProps {
  onUpdate: () => void;
}

interface PendingAction {
  names: string[];
  type: string;
  date: string;
  summary: string;
  sentiment: string;
  isNew: boolean;
}

export const MagicInput: React.FC<MagicInputProps> = ({ onUpdate }) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  
  // Confirmation State
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsProcessing(true);
    setFeedback(null);
    setShowHelp(false);

    try {
      const people = getPeople();
      const result = await parseConversationalInput(input, people);
      
      setPendingAction({
        names: result.identifiedNames,
        type: result.interactionType,
        date: result.date,
        summary: result.summary,
        sentiment: result.sentiment,
        isNew: result.isNewContact
      });

    } catch (error) {
      console.error(error);
      setFeedback("Sorry, I couldn't process that. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (!pendingAction) return;
    
    const people = getPeople();
    let successMessage = '';

    for (const name of pendingAction.names) {
        // Simple fuzzy finder
        let person = people.find(p => p.name.toLowerCase().includes(name.toLowerCase()));
        
        if (!person && pendingAction.isNew) {
          // Create new person
          const newPerson: Person = {
            id: Date.now().toString() + Math.random().toString().slice(2, 5),
            name: name,
            circles: [],
            desiredFrequencyDays: 14, // Default
            interactions: [],
            notes: 'Added via Orbit AI'
          };
          savePerson(newPerson);
          person = newPerson;
          successMessage += `Created contact ${name}. `;
        }

        if (person) {
          addInteraction(person.id, {
            date: pendingAction.date,
            type: pendingAction.type as InteractionType,
            notes: pendingAction.summary,
            sentiment: pendingAction.sentiment as any
          });
          successMessage += `Logged ${pendingAction.type} with ${person.name}. `;
        } else {
          successMessage += `Could not find contact "${name}". `;
        }
    }

    if (pendingAction.names.length === 0) {
        successMessage = "I understood that, but didn't find any specific names to update.";
    }

    setFeedback(successMessage);
    setInput('');
    setPendingAction(null);
    onUpdate();
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleCancel = () => {
    setPendingAction(null);
    setFeedback("Cancelled.");
    setTimeout(() => setFeedback(null), 2000);
  };

  return (
    <div className="w-full relative z-20">
      <form onSubmit={handleParse} className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isProcessing ? (
             <Loader2 className="h-4 w-4 text-orbit-500 animate-spin" />
          ) : (
             <Sparkles className="h-4 w-4 text-orbit-500 group-focus-within:text-orbit-400 transition-colors" />
          )}
        </div>
        <input
          type="text"
          className="block w-full pl-9 pr-10 py-2.5 bg-dark-card border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:ring-1 focus:ring-orbit-500 focus:border-orbit-500/50 outline-none shadow-sm transition-all"
          placeholder="Tell Orbit: 'Lunch with Sarah yesterday'..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isProcessing || !!pendingAction}
          onFocus={() => setShowHelp(true)}
        />
        <button 
            type="submit"
            disabled={!input || isProcessing || !!pendingAction}
            className="absolute inset-y-1 right-1 px-2 flex items-center bg-slate-800 hover:bg-orbit-600 text-slate-400 hover:text-white rounded-lg disabled:opacity-0 disabled:cursor-not-allowed transition-all"
        >
            <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      {/* Tips Dropdown */}
      {showHelp && !input && !pendingAction && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-dark-card border border-slate-700 rounded-xl p-4 shadow-xl z-50 animate-fade-in">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2 flex items-center gap-2">
                  <HelpCircle className="w-3 h-3" /> Try asking...
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                      "Had lunch with Michael yesterday",
                      "Just met Alice at the Tech Conference",
                      "Called Mom for 30 mins to catch up",
                      "Email from David about the project"
                  ].map((tip, i) => (
                      <button 
                        key={i}
                        onClick={() => { setInput(tip); setShowHelp(false); }}
                        className="text-left text-xs text-slate-300 hover:text-white hover:bg-slate-800 p-2 rounded transition-colors"
                      >
                          "{tip}"
                      </button>
                  ))}
              </div>
          </div>
      )}

      {/* Confirmation Card */}
      {pendingAction && (
        <div className="mt-2 bg-dark-card border border-orbit-500/50 rounded-xl p-3 shadow-2xl animate-fade-in relative">
          <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-orbit-400" />
            Review Log
          </h3>
          
          <div className="grid grid-cols-1 gap-2 mb-2">
            <div className="bg-slate-800/50 p-2 rounded-lg flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm text-white">
                    <Users className="w-3 h-3 text-orbit-400" />
                    {pendingAction.names.length > 0 ? pendingAction.names.join(", ") : <span className="text-red-400 italic">No names found</span>}
                </div>
                <div className="flex items-center gap-2 text-sm text-white">
                    <Calendar className="w-3 h-3 text-orbit-400" />
                    <input 
                        type="date" 
                        value={pendingAction.date}
                        onChange={(e) => setPendingAction({...pendingAction, date: e.target.value})}
                        className="bg-transparent outline-none text-right w-24 text-xs"
                    />
                </div>
            </div>
            <div className="bg-slate-800/50 p-2 rounded-lg">
                <div className="flex items-start gap-2 text-sm text-white">
                    <MessageSquare className="w-3 h-3 text-orbit-400 mt-1" />
                    <textarea
                        value={pendingAction.summary}
                        onChange={(e) => setPendingAction({...pendingAction, summary: e.target.value})}
                        className="bg-transparent w-full outline-none resize-none h-auto text-xs"
                        rows={2}
                    />
                </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button 
                onClick={handleCancel}
                className="px-3 py-1 text-slate-400 hover:text-white text-xs font-medium transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={handleConfirm}
                className="px-3 py-1 bg-orbit-600 hover:bg-orbit-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 shadow-lg shadow-orbit-600/20 transition-colors"
            >
                <Check className="w-3 h-3" />
                Confirm
            </button>
          </div>
        </div>
      )}
      
      {feedback && (
        <div className={`absolute top-full mt-1 w-full text-xs text-center animate-fade-in bg-dark-card border border-slate-700 rounded p-1 shadow-lg z-50 ${feedback.includes('Sorry') ? 'text-red-400' : 'text-green-400'}`}>
          {feedback}
        </div>
      )}
    </div>
  );
};
