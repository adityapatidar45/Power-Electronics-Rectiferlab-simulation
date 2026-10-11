import React, { useState } from 'react';
import { TopologyId, TimeSample, DeviceState } from '../../types';
import { Download, Zap, Cpu } from 'lucide-react';

interface CircuitViewerProps {
  topologyId: TopologyId;
  currentSample: TimeSample;
  deviceStates: Record<string, DeviceState>;
  hasFWD: boolean;
  alphaDeg: number;
}

interface ComponentInfoModal {
  id: string;
  name: string;
  type: string;
  state: string;
  voltage: number;
  current: number;
  piv: number;
  avgCurrent: number;
  rmsCurrent: number;
  loss: number;
  description: string;
}

export const CircuitViewer: React.FC<CircuitViewerProps> = ({
  topologyId,
  currentSample,
  deviceStates,
  hasFWD,
  alphaDeg,
}) => {
  const [selectedComponent, setSelectedComponent] = useState<ComponentInfoModal | null>(null);

  const isCond = (id: string) => currentSample.conductingDevices.includes(id);
  const getDevVal = (id: string) => {
    return currentSample.devices[id] || { current: 0, voltage: 0, isConducting: false };
  };

  const handleComponentClick = (id: string, name: string, type: string, description: string) => {
    const dev = getDevVal(id);
    const summary = deviceStates[id] || { piv: 0, avgCurrent: 0, rmsCurrent: 0 };
    const loss = Math.abs(dev.current * dev.voltage);

    setSelectedComponent({
      id,
      name,
      type,
      state: dev.isConducting ? 'Conducting (ON)' : 'Blocking (OFF / Reverse Biased)',
      voltage: dev.voltage,
      current: dev.current,
      piv: summary.piv,
      avgCurrent: summary.avgCurrent,
      rmsCurrent: summary.rmsCurrent,
      loss,
      description,
    });
  };

  const exportSvg = () => {
    const svgEl = document.getElementById('rectifier-schematic-svg');
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgEl);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topologyId}-schematic.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const condColor = '#22c55e'; // Vibrant green
  const blockColor = '#64748b'; // Slate
  const wireActiveColor = '#38bdf8'; // Cyan
  const wireInactiveColor = '#334155'; // Dark slate

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col h-full relative">
      {/* Top Header with Student Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800 mb-2">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-slate-100 text-sm tracking-wide">Dynamic Circuit Schematic</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
            θ = {Math.round(currentSample.angleDeg)}°
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportSvg}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
            title="Export Schematic as Vector SVG"
          >
            <Download className="w-3.5 h-3.5" />
            Export SVG
          </button>
        </div>
      </div>

      {/* Path status banner */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg px-3 py-1.5 mb-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-slate-400 font-mono">Active Path:</span>
          <span className="text-emerald-400 font-mono font-medium truncate">
            {currentSample.activePathDescription || 'Standby'}
          </span>
        </div>
        <div className="text-slate-400 text-[11px] font-mono shrink-0 pl-2">
          vo: <span className="text-cyan-400 font-bold">{currentSample.vo.toFixed(1)} V</span> | io:{' '}
          <span className="text-amber-400 font-bold">{currentSample.io.toFixed(2)} A</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="flex-1 w-full min-h-[350px] flex items-center justify-center bg-slate-950/90 rounded-lg border border-slate-800/60 p-2 overflow-auto">
        <svg
          id="rectifier-schematic-svg"
          viewBox="0 0 780 390"
          className="w-full h-full max-h-[390px]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#38bdf8" />
            </marker>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Student Watermark inside SVG */}
          <text x="25" y="25" fill="#f59e0b" fontSize="12" fontWeight="bold" fontFamily="monospace" opacity="0.85">
            Aditya Patidar (24EE10028) — IIT Kharagpur
          </text>

          {/* Render Schematics depending on topology */}
          {topologyId === '1ph-hw-diode' && (
            <SinglePhaseHalfWaveSchematic
              currentSample={currentSample}
              isCond={isCond}
              condColor={condColor}
              blockColor={blockColor}
              hasFWD={hasFWD}
              onComponentClick={handleComponentClick}
            />
          )}

          {topologyId === '1ph-hw-controlled' && (
            <SinglePhaseHalfWaveControlledSchematic
              currentSample={currentSample}
              isCond={isCond}
              condColor={condColor}
              blockColor={blockColor}
              hasFWD={hasFWD}
              alphaDeg={alphaDeg}
              onComponentClick={handleComponentClick}
            />
          )}

          {topologyId === '1ph-ct-diode' && (
            <SinglePhaseCenterTappedSchematic
              currentSample={currentSample}
              isCond={isCond}
              condColor={condColor}
              blockColor={blockColor}
              onComponentClick={handleComponentClick}
            />
          )}

          {(topologyId === '1ph-bridge-diode' || topologyId === '1ph-bridge-controlled' || topologyId === '1ph-semi-controlled') && (
            <SinglePhaseBridgeSchematic
              topologyId={topologyId}
              currentSample={currentSample}
              isCond={isCond}
              condColor={condColor}
              blockColor={blockColor}
              hasFWD={hasFWD}
              alphaDeg={alphaDeg}
              onComponentClick={handleComponentClick}
            />
          )}

          {topologyId.startsWith('3ph') && (
            <ThreePhaseBridgeSchematic
              topologyId={topologyId}
              currentSample={currentSample}
              isCond={isCond}
              condColor={condColor}
              blockColor={blockColor}
              hasFWD={hasFWD}
              alphaDeg={alphaDeg}
              onComponentClick={handleComponentClick}
            />
          )}
        </svg>
      </div>

      {/* Component Details Modal */}
      {selectedComponent && (
        <div className="absolute inset-x-6 top-16 bg-slate-900/95 border border-cyan-500/50 rounded-xl p-4 shadow-2xl backdrop-blur-md z-30 animate-in fade-in zoom-in-95">
          <div className="flex items-start justify-between pb-2 border-b border-slate-700">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-base">{selectedComponent.name}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                  {selectedComponent.type}
                </span>
              </div>
              <span className={`text-xs font-semibold ${selectedComponent.state.includes('ON') ? 'text-emerald-400' : 'text-slate-400'}`}>
                {selectedComponent.state}
              </span>
            </div>
            <button
              onClick={() => setSelectedComponent(null)}
              className="text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-3 text-xs">
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Instantaneous Voltage:</span>
              <span className="text-cyan-300 font-mono font-bold text-sm">{selectedComponent.voltage.toFixed(2)} V</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Instantaneous Current:</span>
              <span className="text-amber-300 font-mono font-bold text-sm">{selectedComponent.current.toFixed(2)} A</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Peak Inverse Voltage (PIV):</span>
              <span className="text-rose-400 font-mono font-bold text-sm">{selectedComponent.piv.toFixed(1)} V</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Cycle RMS Current:</span>
              <span className="text-emerald-300 font-mono font-bold text-sm">{selectedComponent.rmsCurrent.toFixed(2)} A</span>
            </div>
          </div>

          <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded border border-slate-800">
            {selectedComponent.description}
          </p>
        </div>
      )}
    </div>
  );
};

// SVG Sub-schematic for 1-Phase Half-Wave
const SinglePhaseHalfWaveSchematic: React.FC<{
  currentSample: TimeSample;
  isCond: (id: string) => boolean;
  condColor: string;
  blockColor: string;
  hasFWD: boolean;
  onComponentClick: (id: string, name: string, type: string, desc: string) => void;
}> = ({ currentSample, isCond, condColor, blockColor, hasFWD, onComponentClick }) => {
  const d1On = isCond('D1');
  const fwdOn = isCond('FWD');

  return (
    <g>
      {/* AC Source */}
      <circle cx="100" cy="190" r="28" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
      <path d="M 88 190 Q 94 176 100 190 Q 106 204 112 190" fill="none" stroke="#38bdf8" strokeWidth="2.2" />
      <text x="100" y="235" fill="#94a3b8" fontSize="12" textAnchor="middle" fontFamily="monospace">
        vs(t) = {currentSample.vs.toFixed(1)} V
      </text>

      {/* Top Wire */}
      <line x1="100" y1="162" x2="220" y2="162" stroke={d1On ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
      <line x1="265" y1="162" x2="480" y2="162" stroke={d1On || fwdOn ? '#38bdf8' : '#334155'} strokeWidth="2.5" />

      {/* Diode D1 */}
      <g
        className="cursor-pointer hover:opacity-80"
        onClick={() => onComponentClick('D1', 'Main Diode D1', 'Diode', 'Conducts during positive half cycle when vs > vo.')}
      >
        <path d="M 220 147 L 255 162 L 220 177 Z" fill={d1On ? condColor : '#1e293b'} stroke={d1On ? condColor : blockColor} strokeWidth="2" />
        <line x1="255" y1="147" x2="255" y2="177" stroke={d1On ? condColor : blockColor} strokeWidth="3" />
        <text x="238" y="138" fill={d1On ? '#4ade80' : '#94a3b8'} fontSize="13" fontWeight="bold" textAnchor="middle">
          D1 {d1On ? '(ON)' : '(OFF)'}
        </text>
      </g>

      {/* Optional Freewheeling Diode */}
      {hasFWD && (
        <g
          className="cursor-pointer hover:opacity-80"
          onClick={() => onComponentClick('FWD', 'Freewheeling Diode', 'Diode', 'Clamps inductive flyback voltage and freewheels current during negative half cycle.')}
        >
          <line x1="360" y1="162" x2="360" y2="190" stroke={fwdOn ? '#38bdf8' : '#334155'} strokeWidth="2" />
          <path d="M 345 215 L 360 185 L 375 215 Z" fill={fwdOn ? condColor : '#1e293b'} stroke={fwdOn ? condColor : blockColor} strokeWidth="2" />
          <line x1="345" y1="185" x2="375" y2="185" stroke={fwdOn ? condColor : blockColor} strokeWidth="3" />
          <line x1="360" y1="215" x2="360" y2="280" stroke={fwdOn ? '#38bdf8' : '#334155'} strokeWidth="2" />
          <text x="360" y="240" fill={fwdOn ? '#4ade80' : '#94a3b8'} fontSize="12" textAnchor="middle">
            FWD
          </text>
        </g>
      )}

      {/* Load: Resistor & Inductor */}
      <g>
        <path d="M 480 162 L 480 180 L 472 186 L 488 196 L 472 206 L 488 216 L 472 226 L 480 232" fill="none" stroke="#fbbf24" strokeWidth="2.5" />
        <text x="510" y="205" fill="#fbbf24" fontSize="13" fontFamily="monospace">R (vR = {currentSample.vR.toFixed(1)}V)</text>

        <path d="M 480 232 C 495 232 495 247 480 247 C 495 247 495 262 480 262 C 495 262 495 277 480 277 L 480 280" fill="none" stroke="#a855f7" strokeWidth="2.5" />
        <text x="510" y="260" fill="#a855f7" fontSize="13" fontFamily="monospace">L (vL = {currentSample.vL.toFixed(1)}V)</text>
      </g>

      {/* Bottom Return Wire */}
      <line x1="480" y1="280" x2="100" y2="280" stroke={d1On ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
      <line x1="100" y1="280" x2="100" y2="218" stroke={d1On ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
    </g>
  );
};

// SVG Sub-schematic for 1-Phase Controlled Half-Wave
const SinglePhaseHalfWaveControlledSchematic: React.FC<{
  currentSample: TimeSample;
  isCond: (id: string) => boolean;
  condColor: string;
  blockColor: string;
  hasFWD: boolean;
  alphaDeg: number;
  onComponentClick: (id: string, name: string, type: string, desc: string) => void;
}> = ({ currentSample, isCond, condColor, blockColor, hasFWD, alphaDeg, onComponentClick }) => {
  const t1On = isCond('T1');
  const fwdOn = isCond('FWD');
  const gateActive = currentSample.gatePulses['T1'] === 1;

  return (
    <g>
      <circle cx="100" cy="190" r="28" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
      <path d="M 88 190 Q 94 176 100 190 Q 106 204 112 190" fill="none" stroke="#38bdf8" strokeWidth="2.2" />
      <text x="100" y="235" fill="#94a3b8" fontSize="12" textAnchor="middle" fontFamily="monospace">
        vs(t) = {currentSample.vs.toFixed(1)} V
      </text>

      <line x1="100" y1="162" x2="220" y2="162" stroke={t1On ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
      <line x1="265" y1="162" x2="480" y2="162" stroke={t1On || fwdOn ? '#38bdf8' : '#334155'} strokeWidth="2.5" />

      {/* Thyristor T1 */}
      <g
        className="cursor-pointer hover:opacity-80"
        onClick={() => onComponentClick('T1', 'Thyristor T1', 'Thyristor', `Triggered at α = ${alphaDeg}°. Blocks until gate pulse is applied.`)}
      >
        <path d="M 220 147 L 255 162 L 220 177 Z" fill={t1On ? condColor : '#1e293b'} stroke={t1On ? condColor : blockColor} strokeWidth="2" />
        <line x1="255" y1="147" x2="255" y2="177" stroke={t1On ? condColor : blockColor} strokeWidth="3" />
        <line x1="245" y1="150" x2="235" y2="135" stroke={gateActive ? '#f43f5e' : '#94a3b8'} strokeWidth="2.5" />
        <circle cx="235" cy="135" r="3" fill={gateActive ? '#f43f5e' : '#94a3b8'} />
        <text x="238" y="125" fill={t1On ? '#4ade80' : '#94a3b8'} fontSize="13" fontWeight="bold" textAnchor="middle">
          T1 {gateActive ? '⚡ PULSE' : t1On ? '(ON)' : '(OFF)'}
        </text>
      </g>

      {hasFWD && (
        <g
          className="cursor-pointer hover:opacity-80"
          onClick={() => onComponentClick('FWD', 'Freewheeling Diode', 'Diode', 'Clamps negative voltage.')}
        >
          <line x1="360" y1="162" x2="360" y2="190" stroke={fwdOn ? '#38bdf8' : '#334155'} strokeWidth="2" />
          <path d="M 345 215 L 360 185 L 375 215 Z" fill={fwdOn ? condColor : '#1e293b'} stroke={fwdOn ? condColor : blockColor} strokeWidth="2" />
          <line x1="345" y1="185" x2="375" y2="185" stroke={fwdOn ? condColor : blockColor} strokeWidth="3" />
          <line x1="360" y1="215" x2="360" y2="280" stroke={fwdOn ? '#38bdf8' : '#334155'} strokeWidth="2" />
          <text x="360" y="240" fill={fwdOn ? '#4ade80' : '#94a3b8'} fontSize="12" textAnchor="middle">FWD</text>
        </g>
      )}

      {/* Load */}
      <g>
        <path d="M 480 162 L 480 180 L 472 186 L 488 196 L 472 206 L 488 216 L 472 226 L 480 232" fill="none" stroke="#fbbf24" strokeWidth="2.5" />
        <text x="510" y="205" fill="#fbbf24" fontSize="13" fontFamily="monospace">R ({currentSample.vR.toFixed(1)}V)</text>
        <path d="M 480 232 C 495 232 495 247 480 247 C 495 247 495 262 480 262 C 495 262 495 277 480 277 L 480 280" fill="none" stroke="#a855f7" strokeWidth="2.5" />
        <text x="510" y="260" fill="#a855f7" fontSize="13" fontFamily="monospace">L ({currentSample.vL.toFixed(1)}V)</text>
      </g>

      <line x1="480" y1="280" x2="100" y2="280" stroke={t1On ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
      <line x1="100" y1="280" x2="100" y2="218" stroke={t1On ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
    </g>
  );
};

// SVG Sub-schematic for 1-Phase Center Tapped
const SinglePhaseCenterTappedSchematic: React.FC<{
  currentSample: TimeSample;
  isCond: (id: string) => boolean;
  condColor: string;
  blockColor: string;
  onComponentClick: (id: string, name: string, type: string, desc: string) => void;
}> = ({ currentSample, isCond, condColor, blockColor, onComponentClick }) => {
  const d1On = isCond('D1');
  const d2On = isCond('D2');

  return (
    <g>
      {/* Center Tapped Transformer Secondary */}
      <line x1="120" y1="100" x2="120" y2="260" stroke="#38bdf8" strokeWidth="3" />
      <circle cx="120" cy="180" r="4" fill="#38bdf8" />
      <text x="75" y="185" fill="#94a3b8" fontSize="12" fontFamily="monospace">Center Tap (N)</text>

      {/* D1 Branch */}
      <line x1="120" y1="100" x2="240" y2="100" stroke={d1On ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
      <g className="cursor-pointer" onClick={() => onComponentClick('D1', 'Diode D1 (Upper)', 'Diode', 'Conducts during positive half cycle.')}>
        <path d="M 240 85 L 275 100 L 240 115 Z" fill={d1On ? condColor : '#1e293b'} stroke={d1On ? condColor : blockColor} strokeWidth="2" />
        <line x1="275" y1="85" x2="275" y2="115" stroke={d1On ? condColor : blockColor} strokeWidth="3" />
        <text x="258" y="75" fill={d1On ? '#4ade80' : '#94a3b8'} fontSize="12" fontWeight="bold">D1</text>
      </g>
      <line x1="275" y1="100" x2="400" y2="100" stroke={d1On ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
      <line x1="400" y1="100" x2="400" y2="180" stroke={d1On ? '#38bdf8' : '#334155'} strokeWidth="2.5" />

      {/* D2 Branch */}
      <line x1="120" y1="260" x2="240" y2="260" stroke={d2On ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
      <g className="cursor-pointer" onClick={() => onComponentClick('D2', 'Diode D2 (Lower)', 'Diode', 'Conducts during negative half cycle.')}>
        <path d="M 240 245 L 275 260 L 240 275 Z" fill={d2On ? condColor : '#1e293b'} stroke={d2On ? condColor : blockColor} strokeWidth="2" />
        <line x1="275" y1="245" x2="275" y2="275" stroke={d2On ? condColor : blockColor} strokeWidth="3" />
        <text x="258" y="295" fill={d2On ? '#4ade80' : '#94a3b8'} fontSize="12" fontWeight="bold">D2</text>
      </g>
      <line x1="275" y1="260" x2="400" y2="260" stroke={d2On ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
      <line x1="400" y1="260" x2="400" y2="180" stroke={d2On ? '#38bdf8' : '#334155'} strokeWidth="2.5" />

      {/* Load */}
      <line x1="400" y1="180" x2="480" y2="180" stroke={d1On || d2On ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
      <path d="M 480 180 L 510 180 L 515 172 L 525 188 L 535 172 L 545 188 L 555 172 L 560 180 L 590 180" fill="none" stroke="#fbbf24" strokeWidth="2.5" />
      <text x="535" y="160" fill="#fbbf24" fontSize="13" textAnchor="middle" fontFamily="monospace">Load (vo = {currentSample.vo.toFixed(1)}V)</text>

      {/* Return to Center Tap */}
      <line x1="590" y1="180" x2="590" y2="320" stroke={d1On || d2On ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
      <line x1="590" y1="320" x2="120" y2="320" stroke={d1On || d2On ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
      <line x1="120" y1="320" x2="120" y2="180" stroke={d1On || d2On ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
    </g>
  );
};

// SVG Sub-schematic for 1-Phase Full-Bridge (CORRECTED TEXTBOOK CONNECTIONS)
const SinglePhaseBridgeSchematic: React.FC<{
  topologyId: TopologyId;
  currentSample: TimeSample;
  isCond: (id: string) => boolean;
  condColor: string;
  blockColor: string;
  hasFWD: boolean;
  alphaDeg: number;
  onComponentClick: (id: string, name: string, type: string, desc: string) => void;
}> = ({ topologyId, currentSample, isCond, condColor, blockColor, hasFWD, alphaDeg, onComponentClick }) => {
  const isControlled = topologyId === '1ph-bridge-controlled';
  const isSemi = topologyId === '1ph-semi-controlled';

  // Device IDs according to standard textbook & Prof. Arpan Hota Slide 13:
  // Left Leg: D1/T1 on top, D2/T2 on bottom. Midpoint connected to AC source (+)
  // Right Leg: D3/T3 on top, D4/T4 on bottom. Midpoint connected to AC source (-)
  const sw1 = isControlled || isSemi ? 'T1' : 'D1';
  const sw2 = isControlled ? 'T2' : 'D2';
  const sw3 = isControlled ? 'T3' : isSemi ? 'T2' : 'D3';
  const sw4 = isControlled ? 'T4' : 'D4';

  const on1 = isCond(sw1);
  const on2 = isCond(sw2);
  const on3 = isCond(sw3);
  const on4 = isCond(sw4);
  const onFWD = isCond('FWD');

  const gate1 = currentSample.gatePulses['T1'] === 1;
  const gate2 = currentSample.gatePulses['T2'] === 1;

  return (
    <g>
      {/* 1. AC Voltage Source on the Left */}
      <g transform="translate(80, 190)">
        <circle cx="0" cy="0" r="28" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
        <path d="M -14 0 Q -7 -16 0 0 Q 7 16 14 0" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
        <text x="0" y="44" fill="#94a3b8" fontSize="12" textAnchor="middle" fontFamily="monospace">
          vs(t) = {currentSample.vs.toFixed(1)} V
        </text>
        {/* Source Terminal Polarities */}
        <text x="18" y="-12" fill={currentSample.vs >= 0 ? '#4ade80' : '#f43f5e'} fontSize="11" fontWeight="bold">(+)</text>
        <text x="18" y="20" fill={currentSample.vs < 0 ? '#4ade80' : '#f43f5e'} fontSize="11" fontWeight="bold">(-)</text>
      </g>

      {/* 2. Top DC Positive Rail (Cathodes connected to + Load) */}
      <line x1="250" y1="70" x2="550" y2="70" stroke={on1 || on3 ? '#38bdf8' : '#334155'} strokeWidth="3" />
      <circle cx="250" cy="70" r="3.5" fill="#38bdf8" />
      <circle cx="370" cy="70" r="3.5" fill="#38bdf8" />
      <text x="550" y="55" fill="#38bdf8" fontSize="13" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
        + DC Output (vo = {currentSample.vo.toFixed(1)} V)
      </text>

      {/* 3. Bottom DC Negative Rail (Anodes connected to - Load) */}
      <line x1="250" y1="310" x2="550" y2="310" stroke={on2 || on4 ? '#38bdf8' : '#334155'} strokeWidth="3" />
      <circle cx="250" cy="310" r="3.5" fill="#38bdf8" />
      <circle cx="370" cy="310" r="3.5" fill="#38bdf8" />
      <text x="550" y="335" fill="#94a3b8" fontSize="13" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
        - DC Output (io = {currentSample.io.toFixed(2)} A)
      </text>

      {/* 4. AC SOURCE TO BRIDGE CONNECTIONS */}
      {/* Source (+) Wire: leaves at (80, 162), goes directly to Leg 1 Mid-Node at (250, 190) */}
      <line x1="80" y1="162" x2="160" y2="162" stroke="#38bdf8" strokeWidth="2.5" />
      <line x1="160" y1="162" x2="160" y2="190" stroke="#38bdf8" strokeWidth="2.5" />
      <line x1="160" y1="190" x2="250" y2="190" stroke="#38bdf8" strokeWidth="2.5" />
      <circle cx="250" cy="190" r="4.5" fill="#38bdf8" />
      <text x="215" y="184" fill="#38bdf8" fontSize="10" fontFamily="monospace">AC Node 1</text>

      {/* Source (-) Wire: leaves at (80, 218), goes to Leg 2 Mid-Node at (370, 190) */}
      <line x1="80" y1="218" x2="140" y2="218" stroke="#38bdf8" strokeWidth="2.5" />
      <line x1="140" y1="218" x2="140" y2="230" stroke="#38bdf8" strokeWidth="2.5" />
      <line x1="140" y1="230" x2="238" y2="230" stroke="#38bdf8" strokeWidth="2.5" />
      {/* Jumper over vertical wire of Leg 1 (crossing x=250 at y=230) */}
      <path d="M 238 230 A 12 12 0 0 1 262 230" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
      <line x1="262" y1="230" x2="370" y2="230" stroke="#38bdf8" strokeWidth="2.5" />
      <line x1="370" y1="230" x2="370" y2="190" stroke="#38bdf8" strokeWidth="2.5" />
      <circle cx="370" cy="190" r="4.5" fill="#38bdf8" />
      <text x="390" y="184" fill="#38bdf8" fontSize="10" fontFamily="monospace">AC Node 2</text>

      {/* 5. LEG 1 (x = 250): Upper Switch (sw1) and Lower Switch (sw2) */}
      {/* Vertical wire Leg 1 */}
      <line x1="250" y1="70" x2="250" y2="105" stroke={on1 ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
      <line x1="250" y1="135" x2="250" y2="190" stroke={on1 ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
      <line x1="250" y1="190" x2="250" y2="245" stroke={on2 ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
      <line x1="250" y1="275" x2="250" y2="310" stroke={on2 ? '#38bdf8' : '#334155'} strokeWidth="2.5" />

      {/* SW1 (Top Left): Anode at (250, 135), Cathode at (250, 105) pointing UP */}
      <g className="cursor-pointer" onClick={() => onComponentClick(sw1, `${sw1} (Phase 1 Top)`, sw1.startsWith('T') ? 'Thyristor' : 'Diode', 'Upper Left Switch')}>
        <path d="M 235 135 L 250 105 L 265 135 Z" fill={on1 ? condColor : '#1e293b'} stroke={on1 ? condColor : blockColor} strokeWidth="2" />
        <line x1="235" y1="105" x2="265" y2="105" stroke={on1 ? condColor : blockColor} strokeWidth="3" />
        {sw1.startsWith('T') && (
          <line x1="242" y1="120" x2="230" y2="110" stroke={gate1 ? '#f43f5e' : '#94a3b8'} strokeWidth="2.5" />
        )}
        <text x="215" y="118" fill={on1 ? '#4ade80' : '#94a3b8'} fontSize="12" fontWeight="bold">{sw1}</text>
      </g>

      {/* SW2 (Bottom Left): Anode at (250, 310), Cathode at (250, 245) pointing UP */}
      <g className="cursor-pointer" onClick={() => onComponentClick(sw2, `${sw2} (Phase 1 Bot)`, sw2.startsWith('T') ? 'Thyristor' : 'Diode', 'Lower Left Switch')}>
        <path d="M 235 275 L 250 245 L 265 275 Z" fill={on2 ? condColor : '#1e293b'} stroke={on2 ? condColor : blockColor} strokeWidth="2" />
        <line x1="235" y1="245" x2="265" y2="245" stroke={on2 ? condColor : blockColor} strokeWidth="3" />
        {sw2.startsWith('T') && (
          <line x1="242" y1="260" x2="230" y2="250" stroke={gate2 ? '#f43f5e' : '#94a3b8'} strokeWidth="2.5" />
        )}
        <text x="215" y="265" fill={on2 ? '#4ade80' : '#94a3b8'} fontSize="12" fontWeight="bold">{sw2}</text>
      </g>

      {/* 6. LEG 2 (x = 370): Upper Switch (sw3) and Lower Switch (sw4) */}
      <line x1="370" y1="70" x2="370" y2="105" stroke={on3 ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
      <line x1="370" y1="135" x2="370" y2="190" stroke={on3 ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
      <line x1="370" y1="190" x2="370" y2="245" stroke={on4 ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
      <line x1="370" y1="275" x2="370" y2="310" stroke={on4 ? '#38bdf8' : '#334155'} strokeWidth="2.5" />

      {/* SW3 (Top Right): Anode at (370, 135), Cathode at (370, 105) pointing UP */}
      <g className="cursor-pointer" onClick={() => onComponentClick(sw3, `${sw3} (Phase 2 Top)`, sw3.startsWith('T') ? 'Thyristor' : 'Diode', 'Upper Right Switch')}>
        <path d="M 355 135 L 370 105 L 385 135 Z" fill={on3 ? condColor : '#1e293b'} stroke={on3 ? condColor : blockColor} strokeWidth="2" />
        <line x1="355" y1="105" x2="385" y2="105" stroke={on3 ? condColor : blockColor} strokeWidth="3" />
        {sw3.startsWith('T') && (
          <line x1="362" y1="120" x2="350" y2="110" stroke={gate2 ? '#f43f5e' : '#94a3b8'} strokeWidth="2.5" />
        )}
        <text x="400" y="118" fill={on3 ? '#4ade80' : '#94a3b8'} fontSize="12" fontWeight="bold">{sw3}</text>
      </g>

      {/* SW4 (Bottom Right): Anode at (370, 310), Cathode at (370, 245) pointing UP */}
      <g className="cursor-pointer" onClick={() => onComponentClick(sw4, `${sw4} (Phase 2 Bot)`, sw4.startsWith('T') ? 'Thyristor' : 'Diode', 'Lower Right Switch')}>
        <path d="M 355 275 L 370 245 L 385 275 Z" fill={on4 ? condColor : '#1e293b'} stroke={on4 ? condColor : blockColor} strokeWidth="2" />
        <line x1="355" y1="245" x2="385" y2="245" stroke={on4 ? condColor : blockColor} strokeWidth="3" />
        {sw4.startsWith('T') && (
          <line x1="362" y1="260" x2="350" y2="250" stroke={gate1 ? '#f43f5e' : '#94a3b8'} strokeWidth="2.5" />
        )}
        <text x="400" y="265" fill={on4 ? '#4ade80' : '#94a3b8'} fontSize="12" fontWeight="bold">{sw4}</text>
      </g>

      {/* 7. Optional Freewheeling Diode at x = 460 */}
      {hasFWD && (
        <g className="cursor-pointer" onClick={() => onComponentClick('FWD', 'Freewheeling Diode', 'Diode', 'Clamps negative voltage.')}>
          <line x1="460" y1="70" x2="460" y2="160" stroke={onFWD ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
          <path d="M 445 190 L 460 160 L 475 190 Z" fill={onFWD ? condColor : '#1e293b'} stroke={onFWD ? condColor : blockColor} strokeWidth="2" />
          <line x1="445" y1="160" x2="475" y2="160" stroke={onFWD ? condColor : blockColor} strokeWidth="3" />
          <line x1="460" y1="190" x2="460" y2="310" stroke={onFWD ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
          <circle cx="460" cy="70" r="3" fill="#38bdf8" />
          <circle cx="460" cy="310" r="3" fill="#38bdf8" />
          <text x="485" y="178" fill={onFWD ? '#4ade80' : '#94a3b8'} fontSize="11" fontWeight="bold">FWD</text>
        </g>
      )}

      {/* 8. DC Load on Right (x = 550) */}
      <g>
        <line x1="550" y1="70" x2="550" y2="115" stroke="#38bdf8" strokeWidth="2.5" />
        {/* Resistor */}
        <path d="M 550 115 L 550 130 L 542 137 L 558 147 L 542 157 L 558 167 L 542 177 L 550 185" fill="none" stroke="#fbbf24" strokeWidth="2.5" />
        <text x="575" y="155" fill="#fbbf24" fontSize="12" fontFamily="monospace">R ({currentSample.vR.toFixed(1)}V)</text>

        {/* Inductor */}
        <path d="M 550 185 C 565 185 565 200 550 200 C 565 200 565 215 550 215 C 565 215 565 230 550 230 L 550 245" fill="none" stroke="#a855f7" strokeWidth="2.5" />
        <text x="575" y="215" fill="#a855f7" fontSize="12" fontFamily="monospace">L ({currentSample.vL.toFixed(1)}V)</text>

        <line x1="550" y1="245" x2="550" y2="310" stroke="#38bdf8" strokeWidth="2.5" />
        {/* Load polarity markings */}
        <text x="532" y="105" fill="#4ade80" fontSize="14" fontWeight="bold">(+)</text>
        <text x="532" y="295" fill="#94a3b8" fontSize="14" fontWeight="bold">(-)</text>
      </g>
    </g>
  );
};

// SVG Sub-schematic for 3-Phase Bridge (CORRECTED TEXTBOOK CONNECTIONS)
const ThreePhaseBridgeSchematic: React.FC<{
  topologyId: TopologyId;
  currentSample: TimeSample;
  isCond: (id: string) => boolean;
  condColor: string;
  blockColor: string;
  hasFWD: boolean;
  alphaDeg: number;
  onComponentClick: (id: string, name: string, type: string, desc: string) => void;
}> = ({ topologyId, currentSample, isCond, condColor, blockColor, onComponentClick }) => {
  const isThyristor = topologyId === '3ph-bridge-controlled';
  const prefixTop = isThyristor ? 'T' : 'D';
  const prefixBot = isThyristor ? 'T' : 'D';

  const t1 = `${prefixTop}1`;
  const t3 = `${prefixTop}3`;
  const t5 = `${prefixTop}5`;
  const t4 = `${prefixBot}4`;
  const t6 = `${prefixBot}6`;
  const t2 = `${prefixBot}2`;

  const onT1 = isCond(t1);
  const onT3 = isCond(t3);
  const onT5 = isCond(t5);
  const onT4 = isCond(t4);
  const onT6 = isCond(t6);
  const onT2 = isCond(t2);

  return (
    <g>
      {/* 1. AC 3-Phase Source Terminals on the Left */}
      {/* Phase A Source at y = 130 */}
      <g transform="translate(60, 130)">
        <circle cx="0" cy="0" r="16" fill="#0f172a" stroke="#ef4444" strokeWidth="2.5" />
        <path d="M -8 0 Q -4 -10 0 0 Q 4 10 8 0" fill="none" stroke="#ef4444" strokeWidth="2" />
        <text x="-24" y="4" fill="#ef4444" fontSize="12" fontWeight="bold" fontFamily="monospace">A</text>
        <text x="24" y="4" fill="#94a3b8" fontSize="10" fontFamily="monospace">{currentSample.vs.toFixed(0)}V</text>
      </g>

      {/* Phase B Source at y = 190 */}
      <g transform="translate(60, 190)">
        <circle cx="0" cy="0" r="16" fill="#0f172a" stroke="#eab308" strokeWidth="2.5" />
        <path d="M -8 0 Q -4 -10 0 0 Q 4 10 8 0" fill="none" stroke="#eab308" strokeWidth="2" />
        <text x="-24" y="4" fill="#eab308" fontSize="12" fontWeight="bold" fontFamily="monospace">B</text>
        <text x="24" y="4" fill="#94a3b8" fontSize="10" fontFamily="monospace">{currentSample.vsb?.toFixed(0) || 0}V</text>
      </g>

      {/* Phase C Source at y = 250 */}
      <g transform="translate(60, 250)">
        <circle cx="0" cy="0" r="16" fill="#0f172a" stroke="#3b82f6" strokeWidth="2.5" />
        <path d="M -8 0 Q -4 -10 0 0 Q 4 10 8 0" fill="none" stroke="#3b82f6" strokeWidth="2" />
        <text x="-24" y="4" fill="#3b82f6" fontSize="12" fontWeight="bold" fontFamily="monospace">C</text>
        <text x="24" y="4" fill="#94a3b8" fontSize="10" fontFamily="monospace">{currentSample.vsc?.toFixed(0) || 0}V</text>
      </g>

      {/* 2. Top Positive DC Bus at y = 60 */}
      <line x1="240" y1="60" x2="570" y2="60" stroke="#38bdf8" strokeWidth="3" />
      <circle cx="240" cy="60" r="3.5" fill="#38bdf8" />
      <circle cx="340" cy="60" r="3.5" fill="#38bdf8" />
      <circle cx="440" cy="60" r="3.5" fill="#38bdf8" />
      <text x="570" y="45" fill="#38bdf8" fontSize="13" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
        + 6-Pulse Output (vo = {currentSample.vo.toFixed(1)} V)
      </text>

      {/* 3. Bottom Negative DC Bus at y = 320 */}
      <line x1="240" y1="320" x2="570" y2="320" stroke="#38bdf8" strokeWidth="3" />
      <circle cx="240" cy="320" r="3.5" fill="#38bdf8" />
      <circle cx="340" cy="320" r="3.5" fill="#38bdf8" />
      <circle cx="440" cy="320" r="3.5" fill="#38bdf8" />
      <text x="570" y="345" fill="#94a3b8" fontSize="13" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
        - Return Bus (io = {currentSample.io.toFixed(2)} A)
      </text>

      {/* 4. AC Phase Line Bus Connections */}
      {/* Line A: connects straight from (76, 130) to Leg A Mid-Node (240, 130) */}
      <line x1="76" y1="130" x2="240" y2="130" stroke="#ef4444" strokeWidth="2.5" />
      <circle cx="240" cy="130" r="4.5" fill="#ef4444" />

      {/* Line B: connects from (76, 190) to Leg B Mid-Node (340, 190) */}
      <line x1="76" y1="190" x2="228" y2="190" stroke="#eab308" strokeWidth="2.5" />
      {/* Jumper over vertical wire of Leg A at (240, 190) */}
      <path d="M 228 190 A 12 12 0 0 1 252 190" fill="none" stroke="#eab308" strokeWidth="2.5" />
      <line x1="252" y1="190" x2="340" y2="190" stroke="#eab308" strokeWidth="2.5" />
      <circle cx="340" cy="190" r="4.5" fill="#eab308" />

      {/* Line C: connects from (76, 250) to Leg C Mid-Node (440, 250) */}
      <line x1="76" y1="250" x2="228" y2="250" stroke="#3b82f6" strokeWidth="2.5" />
      {/* Jumper over Leg A at (240, 250) */}
      <path d="M 228 250 A 12 12 0 0 1 252 250" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
      <line x1="252" y1="250" x2="328" y2="250" stroke="#3b82f6" strokeWidth="2.5" />
      {/* Jumper over Leg B at (340, 250) */}
      <path d="M 328 250 A 12 12 0 0 1 352 250" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
      <line x1="352" y1="250" x2="440" y2="250" stroke="#3b82f6" strokeWidth="2.5" />
      <circle cx="440" cy="250" r="4.5" fill="#3b82f6" />

      {/* 5. LEG A (x = 240): T1 / D1 (Upper) & T4 / D4 (Lower) */}
      <line x1="240" y1="60" x2="240" y2="90" stroke={onT1 ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
      <line x1="240" y1="120" x2="240" y2="130" stroke={onT1 ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
      <line x1="240" y1="130" x2="240" y2="210" stroke={onT4 ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
      <line x1="240" y1="240" x2="240" y2="320" stroke={onT4 ? '#38bdf8' : '#334155'} strokeWidth="2.5" />

      {/* T1 / D1 (Phase A Upper) */}
      <g className="cursor-pointer" onClick={() => onComponentClick(t1, `${t1} (Phase A Upper)`, 'Switch', 'Upper switch of Phase A')}>
        <path d="M 225 120 L 240 90 L 255 120 Z" fill={onT1 ? condColor : '#1e293b'} stroke={onT1 ? condColor : blockColor} strokeWidth="2" />
        <line x1="225" y1="90" x2="255" y2="90" stroke={onT1 ? condColor : blockColor} strokeWidth="3" />
        <text x="212" y="105" fill={onT1 ? '#4ade80' : '#94a3b8'} fontSize="11" fontWeight="bold">{t1}</text>
      </g>
      {/* T4 / D4 (Phase A Lower) */}
      <g className="cursor-pointer" onClick={() => onComponentClick(t4, `${t4} (Phase A Lower)`, 'Switch', 'Lower switch of Phase A')}>
        <path d="M 225 240 L 240 210 L 255 240 Z" fill={onT4 ? condColor : '#1e293b'} stroke={onT4 ? condColor : blockColor} strokeWidth="2" />
        <line x1="225" y1="210" x2="255" y2="210" stroke={onT4 ? condColor : blockColor} strokeWidth="3" />
        <text x="212" y="230" fill={onT4 ? '#4ade80' : '#94a3b8'} fontSize="11" fontWeight="bold">{t4}</text>
      </g>

      {/* 6. LEG B (x = 340): T3 / D3 (Upper) & T6 / D6 (Lower) */}
      <line x1="340" y1="60" x2="340" y2="90" stroke={onT3 ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
      <line x1="340" y1="120" x2="340" y2="190" stroke={onT3 ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
      <line x1="340" y1="190" x2="340" y2="210" stroke={onT6 ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
      <line x1="340" y1="240" x2="340" y2="320" stroke={onT6 ? '#38bdf8' : '#334155'} strokeWidth="2.5" />

      {/* T3 / D3 (Phase B Upper) */}
      <g className="cursor-pointer" onClick={() => onComponentClick(t3, `${t3} (Phase B Upper)`, 'Switch', 'Upper switch of Phase B')}>
        <path d="M 325 120 L 340 90 L 355 120 Z" fill={onT3 ? condColor : '#1e293b'} stroke={onT3 ? condColor : blockColor} strokeWidth="2" />
        <line x1="325" y1="90" x2="355" y2="90" stroke={onT3 ? condColor : blockColor} strokeWidth="3" />
        <text x="312" y="105" fill={onT3 ? '#4ade80' : '#94a3b8'} fontSize="11" fontWeight="bold">{t3}</text>
      </g>
      {/* T6 / D6 (Phase B Lower) */}
      <g className="cursor-pointer" onClick={() => onComponentClick(t6, `${t6} (Phase B Lower)`, 'Switch', 'Lower switch of Phase B')}>
        <path d="M 325 240 L 340 210 L 355 240 Z" fill={onT6 ? condColor : '#1e293b'} stroke={onT6 ? condColor : blockColor} strokeWidth="2" />
        <line x1="325" y1="210" x2="355" y2="210" stroke={onT6 ? condColor : blockColor} strokeWidth="3" />
        <text x="312" y="230" fill={onT6 ? '#4ade80' : '#94a3b8'} fontSize="11" fontWeight="bold">{t6}</text>
      </g>

      {/* 7. LEG C (x = 440): T5 / D5 (Upper) & T2 / D2 (Lower) */}
      <line x1="440" y1="60" x2="440" y2="90" stroke={onT5 ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
      <line x1="440" y1="120" x2="440" y2="250" stroke={onT5 ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
      <line x1="440" y1="250" x2="440" y2="260" stroke={onT2 ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
      <line x1="440" y1="290" x2="440" y2="320" stroke={onT2 ? '#38bdf8' : '#334155'} strokeWidth="2.5" />

      {/* T5 / D5 (Phase C Upper) */}
      <g className="cursor-pointer" onClick={() => onComponentClick(t5, `${t5} (Phase C Upper)`, 'Switch', 'Upper switch of Phase C')}>
        <path d="M 425 120 L 440 90 L 455 120 Z" fill={onT5 ? condColor : '#1e293b'} stroke={onT5 ? condColor : blockColor} strokeWidth="2" />
        <line x1="425" y1="90" x2="455" y2="90" stroke={onT5 ? condColor : blockColor} strokeWidth="3" />
        <text x="412" y="105" fill={onT5 ? '#4ade80' : '#94a3b8'} fontSize="11" fontWeight="bold">{t5}</text>
      </g>
      {/* T2 / D2 (Phase C Lower) */}
      <g className="cursor-pointer" onClick={() => onComponentClick(t2, `${t2} (Phase C Lower)`, 'Switch', 'Lower switch of Phase C')}>
        <path d="M 425 290 L 440 260 L 455 290 Z" fill={onT2 ? condColor : '#1e293b'} stroke={onT2 ? condColor : blockColor} strokeWidth="2" />
        <line x1="425" y1="260" x2="455" y2="260" stroke={onT2 ? condColor : blockColor} strokeWidth="3" />
        <text x="412" y="280" fill={onT2 ? '#4ade80' : '#94a3b8'} fontSize="11" fontWeight="bold">{t2}</text>
      </g>

      {/* 8. DC Load on Right (x = 570) */}
      <g>
        <line x1="570" y1="60" x2="570" y2="115" stroke="#38bdf8" strokeWidth="2.5" />
        {/* Resistor */}
        <path d="M 570 115 L 570 130 L 562 137 L 578 147 L 562 157 L 578 167 L 562 177 L 570 185" fill="none" stroke="#fbbf24" strokeWidth="2.5" />
        <text x="595" y="155" fill="#fbbf24" fontSize="12" fontFamily="monospace">R ({currentSample.vR.toFixed(1)}V)</text>

        {/* Inductor */}
        <path d="M 570 185 C 585 185 585 200 570 200 C 585 200 585 215 570 215 C 585 215 585 230 570 230 L 570 245" fill="none" stroke="#a855f7" strokeWidth="2.5" />
        <text x="595" y="215" fill="#a855f7" fontSize="12" fontFamily="monospace">L ({currentSample.vL.toFixed(1)}V)</text>

        <line x1="570" y1="245" x2="570" y2="320" stroke="#38bdf8" strokeWidth="2.5" />
        <text x="552" y="105" fill="#4ade80" fontSize="14" fontWeight="bold">(+)</text>
        <text x="552" y="305" fill="#94a3b8" fontSize="14" fontWeight="bold">(-)</text>
      </g>
    </g>
  );
};
