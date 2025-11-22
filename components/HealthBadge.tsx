
import React from 'react';
import { HealthStatus } from '../types';

interface HealthBadgeProps {
  score: number; // 0-100
  className?: string;
}

export const HealthBadge: React.FC<HealthBadgeProps> = ({ score, className = '' }) => {
  let color = 'bg-emerald-500';
  let status = HealthStatus.HEALTHY;
  let effects = '';

  if (score < 50) {
    // Overdue - High Urgency (Red)
    color = 'bg-red-500';
    effects = 'shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse-slow';
    status = HealthStatus.OVERDUE;
  } else if (score < 80) {
    // Needs Attention - Warning (Amber/Yellow)
    color = 'bg-amber-500';
    effects = 'shadow-[0_0_6px_rgba(245,158,11,0.6)]';
    status = HealthStatus.NEEDS_ATTENTION;
  }

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} title={`Health Score: ${Math.round(score)}`}>
      {/* Ring Background */}
      <div className="absolute inset-0 rounded-full border-2 border-slate-800 bg-slate-900"></div>
      
      {/* Health Indicator */}
      <div 
        className={`relative h-3 w-3 rounded-full ${color} ${effects} transition-all duration-500 border border-slate-900/20`}
      ></div>
    </div>
  );
};

export const calculateHealthScore = (lastContactDate?: string, desiredFreqDays: number = 14): number => {
  if (!lastContactDate) return 50; // Neutral start
  
  const last = new Date(lastContactDate).getTime();
  const now = new Date().getTime();
  const daysDiff = (now - last) / (1000 * 3600 * 24);
  
  // Formula: 100 at 0 days. 0 at 2x desired frequency.
  const score = Math.max(0, 100 - (daysDiff / desiredFreqDays * 50));
  return score;
};
