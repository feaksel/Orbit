import React from 'react';
import { HealthStatus } from '../types';

interface HealthBadgeProps {
  score: number; // 0-100
  className?: string;
}

export const HealthBadge: React.FC<HealthBadgeProps> = ({ score, className = '' }) => {
  let color = 'bg-green-500';
  let status = HealthStatus.HEALTHY;

  if (score < 50) {
    color = 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]';
    status = HealthStatus.OVERDUE;
  } else if (score < 80) {
    color = 'bg-yellow-500';
    status = HealthStatus.NEEDS_ATTENTION;
  }

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} title={`Health Score: ${Math.round(score)}`}>
      {/* Ring Background */}
      <div className="absolute inset-0 rounded-full border-2 border-slate-700"></div>
      
      {/* Health Indicator */}
      <div 
        className={`h-3 w-3 rounded-full ${color} transition-all duration-500`}
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