
import React from 'react';
import { Person, Circle } from '../types';
import { HealthBadge, calculateHealthScore } from './HealthBadge';
import { Calendar, MapPin, Briefcase, CheckCircle2, MessageSquare, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { timeAgo } from '../utils/dateUtils';

interface PersonCardProps {
  person: Person;
  circles: Circle[];
  onQuickLog?: (personId: string, e: React.MouseEvent) => void;
}

export const PersonCard: React.FC<PersonCardProps> = ({ person, circles, onQuickLog }) => {
  const navigate = useNavigate();
  const healthScore = calculateHealthScore(person.lastContactDate, person.desiredFrequencyDays);
  
  const personCircles = circles.filter(c => person.circles.includes(c.id));
  const lastInteraction = person.interactions.length > 0 ? person.interactions[0] : null;

  return (
    <div 
      onClick={() => navigate(`/person/${person.id}`)}
      className="group relative bg-dark-card hover:bg-slate-800 border border-slate-700/50 rounded-xl p-5 transition-all duration-200 cursor-pointer hover:shadow-xl hover:border-orbit-500/30 flex flex-col h-full"
    >
      {/* Favorite Indicator */}
      {person.isFavorite && (
        <div className="absolute top-2 right-2 z-10" title="Favorite">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="relative">
             <img 
                src={person.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&background=0ea5e9&color=fff&rounded=true&bold=true`} 
                alt={person.name}
                className="w-14 h-14 rounded-full object-cover bg-slate-700"
             />
             <HealthBadge score={healthScore} className="absolute -bottom-1 -right-1" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100 group-hover:text-orbit-400 transition-colors line-clamp-1 pr-6">{person.name}</h3>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {personCircles.map(c => (
                <span key={c.id} className="text-[10px] px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: c.color }}>
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm text-slate-400 flex-1">
        {person.role && (
            <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="truncate">{person.role}{person.company ? ` at ${person.company}` : ''}</span>
            </div>
        )}
        {person.location && (
            <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="truncate">{person.location}</span>
            </div>
        )}
        
        {/* Last Interaction Note Snippet */}
        {lastInteraction && lastInteraction.notes && (
          <div className="mt-3 bg-slate-900/50 p-2 rounded-lg border border-slate-800">
             <div className="flex items-start gap-2">
                <MessageSquare className="w-3 h-3 text-slate-500 mt-1 shrink-0" />
                <p className="text-xs text-slate-300 line-clamp-2 italic">"{lastInteraction.notes}"</p>
             </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50 mt-auto">
          <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
          <span className={`text-xs ${healthScore < 50 ? 'text-red-400' : ''}`}>
            {person.lastContactDate 
              ? `Last: ${timeAgo(person.lastContactDate)}` 
              : 'No interactions yet'}
          </span>
        </div>
      </div>

      {/* Quick Log Button */}
      {onQuickLog && (
        <button
          onClick={(e) => onQuickLog(person.id, e)}
          className="absolute top-14 right-4 p-2 rounded-full bg-slate-800/50 hover:bg-green-500/20 text-slate-400 hover:text-green-500 transition-colors border border-transparent hover:border-green-500/50 z-10"
          title="Quick Log Interaction"
        >
          <CheckCircle2 className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
