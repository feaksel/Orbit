
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPeople, getCircles, DATA_UPDATE_EVENT } from '../services/storageService';
import { Person, Circle } from '../types';
import { calculateHealthScore } from '../components/HealthBadge';
import { ZoomIn, ZoomOut, HelpCircle, Filter } from 'lucide-react';

interface OrbitNode extends Person {
  x: number;
  y: number;
  orbitRadius: number;
  angle: number;
  color: string;
  size: number;
  healthScore: number;
}

export const OrbitView: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [nodes, setNodes] = useState<OrbitNode[]>([]);
  const [hoveredNode, setHoveredNode] = useState<OrbitNode | null>(null);
  const [scale, setScale] = useState(1);
  const [filterCircle, setFilterCircle] = useState<string | 'all'>('all');

  const refreshData = () => {
    setPeople(getPeople());
    setCircles(getCircles());
  };

  useEffect(() => {
    refreshData();
    window.addEventListener(DATA_UPDATE_EVENT, refreshData);
    return () => window.removeEventListener(DATA_UPDATE_EVENT, refreshData);
  }, []);

  useEffect(() => {
    if (people.length === 0) return;

    // Calculation Logic
    const newNodes: OrbitNode[] = people.map((p, index) => {
        const score = calculateHealthScore(p.lastContactDate, p.desiredFrequencyDays);
        
        // Map score (0-100) to Radius. 
        // 100 (Healthy) = Close to center (Inner Orbit)
        // 0 (Overdue) = Far from center (Outer Orbit)
        // We define 4 zones.
        // Zone 1 (Inner): Score 80-100 -> Radius 80-150
        // Zone 2 (Mid): Score 50-79 -> Radius 150-250
        // Zone 3 (Outer): Score 20-49 -> Radius 250-350
        // Zone 4 (Lost): Score 0-19 -> Radius 350-450
        
        let baseRadius = 0;
        let radiusVariance = Math.random() * 60; // Randomize slightly within zone

        if (score >= 80) baseRadius = 80;
        else if (score >= 50) baseRadius = 180;
        else if (score >= 20) baseRadius = 280;
        else baseRadius = 380;

        const finalRadius = baseRadius + radiusVariance;

        // Angle: Distribute evenly-ish but with randomness
        // Use index to ensure deterministic but spread out
        const angle = (index / people.length) * 2 * Math.PI + (Math.random() * 0.5);

        const pCircle = circles.find(c => p.circles.includes(c.id));
        const color = pCircle ? pCircle.color : '#94a3b8'; // Slate 400 default

        return {
            ...p,
            healthScore: score,
            orbitRadius: finalRadius,
            angle: angle,
            x: Math.cos(angle) * finalRadius,
            y: Math.sin(angle) * finalRadius,
            color: color,
            size: p.isFavorite ? 40 : 24 // Favorites are larger
        };
    });

    setNodes(newNodes);
  }, [people, circles]);

  // Filter nodes
  const visibleNodes = nodes.filter(n => filterCircle === 'all' || n.circles.includes(filterCircle));

  return (
    <div className="h-[calc(100vh-4rem)] md:h-screen w-full bg-dark-bg overflow-hidden relative flex flex-col animate-fade-in">
        
        {/* Header / Controls */}
        <div className="absolute top-4 left-4 right-4 md:left-8 md:right-8 z-20 flex flex-col md:flex-row justify-between items-start md:items-center pointer-events-none">
            <div className="pointer-events-auto mb-4 md:mb-0">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    Network Orbit
                </h1>
                <p className="text-xs text-slate-400 max-w-xs">
                    Contacts orbit around you based on relationship health. 
                    Closer = Healthier. Further = Needs Attention.
                </p>
            </div>

            <div className="flex items-center gap-3 pointer-events-auto">
                {/* Filter Dropdown */}
                <div className="relative group">
                    <div className="flex items-center gap-2 bg-dark-card border border-slate-700 rounded-lg px-3 py-2 text-xs text-white cursor-pointer hover:border-orbit-500">
                        <Filter className="w-3 h-3" />
                        {filterCircle === 'all' ? 'All Circles' : circles.find(c => c.id === filterCircle)?.name}
                    </div>
                    <div className="absolute right-0 mt-2 w-40 bg-dark-card border border-slate-700 rounded-lg shadow-xl hidden group-hover:block p-1">
                        <button onClick={() => setFilterCircle('all')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded">All Circles</button>
                        {circles.map(c => (
                            <button 
                                key={c.id}
                                onClick={() => setFilterCircle(c.id)} 
                                className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded flex items-center gap-2"
                            >
                                <div className="w-2 h-2 rounded-full" style={{backgroundColor: c.color}}></div>
                                {c.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex bg-dark-card border border-slate-700 rounded-lg overflow-hidden">
                    <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-2 hover:bg-slate-800 text-slate-400"><ZoomOut className="w-4 h-4" /></button>
                    <span className="p-2 text-xs text-slate-500 w-12 text-center font-mono">{Math.round(scale * 100)}%</span>
                    <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-2 hover:bg-slate-800 text-slate-400"><ZoomIn className="w-4 h-4" /></button>
                </div>
            </div>
        </div>

        {/* The Universe */}
        <div 
            ref={containerRef}
            className="flex-1 w-full h-full relative cursor-move flex items-center justify-center"
            // Simple pan handler could be added here, for now we rely on center-based layout
        >
            <div 
                className="relative transition-transform duration-500 ease-out will-change-transform"
                style={{ transform: `scale(${scale})` }}
            >
                {/* Sun (You) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gradient-to-br from-orbit-400 to-purple-600 rounded-full shadow-[0_0_40px_rgba(14,165,233,0.4)] z-10 flex items-center justify-center text-white font-bold text-xs border-4 border-dark-bg/50">
                    YOU
                </div>

                {/* Orbit Rings (Visual Guides) */}
                {[150, 250, 350, 450].map((radius, i) => (
                    <div 
                        key={i}
                        className="absolute top-1/2 left-1/2 rounded-full border border-slate-800/50 pointer-events-none"
                        style={{ 
                            width: radius * 2, 
                            height: radius * 2, 
                            transform: 'translate(-50%, -50%)' 
                        }}
                    >
                        {/* Zone Label */}
                        <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-slate-700 uppercase tracking-widest bg-dark-bg px-2">
                            {i === 0 ? 'Inner Circle' : i === 1 ? 'Healthy' : i === 2 ? 'Drifting' : 'Lost'}
                        </span>
                    </div>
                ))}

                {/* Planets (Contacts) */}
                {visibleNodes.map(node => (
                    <div
                        key={node.id}
                        className="absolute top-1/2 left-1/2 group cursor-pointer transition-all duration-500"
                        style={{
                            transform: `translate(calc(-50% + ${node.x}px), calc(-50% + ${node.y}px))`,
                            zIndex: hoveredNode?.id === node.id ? 50 : 20
                        }}
                        onMouseEnter={() => setHoveredNode(node)}
                        onMouseLeave={() => setHoveredNode(null)}
                        onClick={() => navigate(`/person/${node.id}`)}
                    >
                        {/* Avatar Planet */}
                        <div 
                            className="rounded-full border-2 shadow-lg transition-transform group-hover:scale-125 relative"
                            style={{ 
                                width: node.size, 
                                height: node.size, 
                                borderColor: node.color,
                                backgroundColor: '#1e293b'
                            }}
                        >
                             <img 
                                src={node.avatar || `https://ui-avatars.com/api/?name=${node.name}&background=random`} 
                                className="w-full h-full rounded-full opacity-80 group-hover:opacity-100" 
                                alt=""
                             />
                             {/* Health Dot */}
                             <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-dark-bg ${node.healthScore < 50 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                        </div>

                        {/* Label (Always visible if favorite or hovered, otherwise hidden to reduce clutter) */}
                        <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 text-center pointer-events-none transition-opacity ${
                            hoveredNode?.id === node.id || (node.isFavorite && scale > 0.8) ? 'opacity-100' : 'opacity-0'
                        }`}>
                            <span className="text-[10px] text-white bg-slate-900/80 px-2 py-1 rounded whitespace-nowrap backdrop-blur-sm border border-slate-700">
                                {node.name}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Hover Info Panel */}
        {hoveredNode && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:right-8 md:translate-x-0 bg-dark-card/90 backdrop-blur border border-slate-700 p-4 rounded-xl shadow-2xl w-64 z-50 animate-slide-up">
                <div className="flex items-center gap-3 mb-3">
                     <img src={hoveredNode.avatar || `https://ui-avatars.com/api/?name=${hoveredNode.name}`} className="w-10 h-10 rounded-full" alt="" />
                     <div>
                         <h3 className="font-bold text-white">{hoveredNode.name}</h3>
                         <p className="text-xs text-slate-400">{hoveredNode.role}</p>
                     </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div className="bg-slate-800 p-2 rounded">
                        <span className="block text-slate-500">Health</span>
                        <span className={`font-bold ${hoveredNode.healthScore < 50 ? 'text-red-400' : 'text-green-400'}`}>
                            {Math.round(hoveredNode.healthScore)}%
                        </span>
                    </div>
                     <div className="bg-slate-800 p-2 rounded">
                        <span className="block text-slate-500">Orbit</span>
                        <span className="font-bold text-slate-300">
                            {hoveredNode.orbitRadius < 150 ? 'Inner' : hoveredNode.orbitRadius < 250 ? 'Mid' : 'Outer'}
                        </span>
                    </div>
                </div>
                <div className="text-xs text-slate-400 italic">
                    Click to view profile
                </div>
            </div>
        )}
    </div>
  );
};
