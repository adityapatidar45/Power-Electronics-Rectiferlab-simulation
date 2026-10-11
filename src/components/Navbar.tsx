import React, { useState } from 'react';
import {
  Activity,
  Cpu,
  GraduationCap,
  GitCompare,
  BookOpen,
  Keyboard,
  Maximize2,
  Minimize2,
  Zap,
} from 'lucide-react';

export type ActiveTab = 'STUDIO' | 'SCOPE_ONLY' | 'CIRCUIT_ONLY' | 'EXPERIMENTS' | 'COMPARE' | 'THEORY';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onSelectTab }) => {
  const [showKeyHelp, setShowKeyHelp] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/20">
            <Zap className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight text-slate-100">
                Aditya Patidar <span className="text-cyan-400 font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800">24EE10028</span>
              </h1>
            </div>
            <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
              Power Electronics Interactive Converter Simulator & Analyzer
            </p>
          </div>
        </div>

        {/* View Mode Tabs */}
        <nav className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium">
          <button
            onClick={() => onSelectTab('STUDIO')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'STUDIO' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Studio</span>
          </button>

          <button
            onClick={() => onSelectTab('SCOPE_ONLY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'SCOPE_ONLY' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Scope Focus</span>
          </button>

          <button
            onClick={() => onSelectTab('CIRCUIT_ONLY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'CIRCUIT_ONLY' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Circuit Focus</span>
          </button>

          <button
            onClick={() => onSelectTab('COMPARE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'COMPARE' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Compare</span>
          </button>

          <button
            onClick={() => onSelectTab('EXPERIMENTS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'EXPERIMENTS' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Lab Workbook</span>
          </button>

          <button
            onClick={() => onSelectTab('THEORY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'THEORY' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Theory</span>
          </button>
        </nav>

        {/* Right Tools: Hotkeys & Fullscreen */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowKeyHelp(!showKeyHelp)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
            title="Keyboard Shortcuts"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Shortcuts modal */}
      {showKeyHelp && (
        <div className="absolute right-6 top-16 bg-slate-900 border border-slate-700 rounded-xl p-3.5 shadow-2xl z-50 text-xs w-72">
          <div className="flex justify-between items-center border-b border-slate-700 pb-1.5 mb-2">
            <span className="font-bold text-slate-100 flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-cyan-400" /> Hotkeys & Shortcuts
            </span>
            <button onClick={() => setShowKeyHelp(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-cyan-300">Space</kbd> <span>Run / Pause Live Simulation</span></div>
            <div className="flex justify-between"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-cyan-300">← / →</kbd> <span>Step angle by 1°</span></div>
            <div className="flex justify-between"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-cyan-300">Shift + ← / →</kbd> <span>Step angle by 10°</span></div>
            <div className="flex justify-between"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-cyan-300">R</kbd> <span>Reset Angle to 0°</span></div>
            <div className="flex justify-between"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-cyan-300">1</kbd> <span>Circuit Schematic Focus</span></div>
            <div className="flex justify-between"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-cyan-300">2</kbd> <span>Oscilloscope Focus</span></div>
            <div className="flex justify-between"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-cyan-300">3</kbd> <span>Lab Studio View</span></div>
          </div>
        </div>
      )}
    </header>
  );
};
