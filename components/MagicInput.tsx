import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Loader2, Check, Calendar, Users, MessageSquare, HelpCircle } from 'lucide-react';
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

const PLACEHOLDERS = [
    "Lunch with Sarah yesterday...",
    "Just met Dave at the conference...",
    "Call Mom every Sunday...",
    "Had coffee with Michael today...",
    "Meeting with the design team...",
    "Dinner with Jane next week..."
];

export const MagicInput: React.FC<MagicInputProps> = ({ onUpdate }) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  
  // Typewriter placeholder state
  const [placeholder, setPlaceholder] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Confirmation State
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  // Typewriter Effect
  useEffect(() => {
    if (isPaused) return;

    const currentText = PLACEHOLDERS[placeholderIndex];
    const speed = isDeleting ? 50 : 100;

    const timer = setTimeout(() => {
      if (!isDeleting && charIndex < currentText.length) {
        setPlaceholder(currentText.substring(0, charIndex + 1));
        setCharIndex(prev => prev + 1);
      } else if (!isDeleting && charIndex === currentText.length) {
        setIsPaused(true);
        setTimeout(() => {
            setIsPaused(false);
            setIsDeleting(true);
        }, 2000);
      } else if (isDeleting && charIndex > 0) {
        setPlaceholder(currentText.substring(0, charIndex - 1));
        setCharIndex(prev => prev - 1);
      } else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDERS.length);
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, isPaused, placeholderIndex]);

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
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          {isProcessing ? (
             <Loader2 className="h-5 w-5 text-orbit-500 animate-spin" />
          ) : (
             <Sparkles className="h-5 w-5 text-orbit-500 group-focus-within:text-orbit-400 transition-colors" />
          )}
        </div>
        <input
          type="text"
          className="block w-full pl-12 pr-12 py-4 bg-dark-card/80 backdrop-blur-md border border-slate-700 rounded-2xl text-base text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-orbit-500/50 focus:border-orbit-500/50 outline-none shadow-lg transition-all font-medium"
          placeholder={`Tell Orbit: "${placeholder}"`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isProcessing || !!pendingAction}
          onFocus={() => setShowHelp(true)}
        />
        <button 
            type="submit"
            disabled={!input || isProcessing || !!pendingAction}
            className="absolute inset-y-2 right-2 px-3 flex items-center bg-slate-800 hover:bg-orbit-600 text-slate-400 hover:text-white rounded-xl disabled:opacity-0 disabled:cursor-not-allowed transition-all"
        >
            <ArrowRight className="h-5 w-5" />
        </button>
      </form>

      {/* Tips Dropdown */}
      {showHelp && !input && !pendingAction && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-dark-card border border-slate-700 rounded-xl p-4 shadow-2xl z-50 animate-slide-up">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-3 flex items-center gap-2">
                  <HelpCircle className="w-3.5 h-3.5" /> Try asking...
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
                        className="text-left text-sm text-slate-300 hover:text-white hover:bg-slate-800 p-3 rounded-lg transition-colors border border-transparent hover:border-slate-700"
                      >
                          "{tip}"
                      </button>
                  ))}
              </div>
          </div>
      )}

      {/* Confirmation Card */}
      {pendingAction && (
        <div className="mt-3 bg-dark-card border border-orbit-500/50 rounded-xl p-4 shadow-2xl animate-fade-in relative">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orbit-400" />
            Review Action
          </h3>
          
          <div className="grid grid-cols-1 gap-3 mb-4">
            <div className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center border border-slate-700/50">
                <div className="flex items-center gap-2 text-sm text-white">
                    <Users className="w-4 h-4 text-orbit-400" />
                    {pendingAction.names.length > 0 ? pendingAction.names.join(", ") : <span className="text-red-400 italic">No names found</span>}
                </div>
                <div className="flex items-center gap-2 text-sm text-white">
                    <Calendar className="w-4 h-4 text-orbit-400" />
                    <input 
                        type="date" 
                        value={pendingAction.date}
                        onChange={(e) => setPendingAction({...pendingAction, date: e.target.value})}
                        className="bg-transparent outline-none text-right w-32 text-sm"
                    />
                </div>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <div className="flex items-start gap-2 text-sm text-white">
                    <MessageSquare className="w-4 h-4 text-orbit-400 mt-1" />
                    <textarea
                        value={pendingAction.summary}
                        onChange={(e) => setPendingAction({...pendingAction, summary: e.target.value})}
                        className="bg-transparent w-full outline-none resize-none h-auto text-sm"
                        rows={2}
                    />
                </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button 
                onClick={handleCancel}
                className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={handleConfirm}
                className="px-5 py-2 bg-orbit-600 hover:bg-orbit-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-orbit-600/20 transition-colors"
            >
                <Check className="w-4 h-4" />
                Confirm
            </button>
          </div>
        </div>
      )}
      
      {feedback && (
        <div className={`absolute top-full mt-2 w-full text-sm text-center animate-fade-in bg-dark-card border border-slate-700 rounded-lg p-2 shadow-lg z-50 ${feedback.includes('Sorry') ? 'text-red-400' : 'text-green-400'}`}>
          {feedback}
        </div>
      )}
    </div>
  );
};