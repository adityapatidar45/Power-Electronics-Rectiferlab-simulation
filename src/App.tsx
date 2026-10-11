import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  TopologyId,
  SourceParameters,
  LoadParameters,
  DeviceModelParameters,
  SimulationControlParameters,
} from './types';
import { runSimulation } from './simulation/solver';
import { PRESETS } from './data/presets';
import { TOPOLOGIES } from './data/topologies';

import { Navbar, ActiveTab } from './components/Navbar';
import { CircuitViewer } from './components/CircuitViewer/CircuitViewer';
import { WaveformViewer } from './components/WaveformViewer/WaveformViewer';
import { ParameterPanel } from './components/ParameterPanel';
import { ResultPanel } from './components/ResultPanel';
import { PlaybackControls } from './components/PlaybackControls';
import { TheoryDerivationPanel } from './components/TheoryDerivationPanel';
import { ComparisonMode } from './components/ComparisonMode';
import { ExperimentMode } from './components/ExperimentMode';

export const App: React.FC = () => {
  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('STUDIO');

  // Simulation State
  const [topologyId, setTopologyId] = useState<TopologyId>('1ph-bridge-diode');

  const [source, setSource] = useState<SourceParameters>({
    voltageType: 'RMS',
    vRms: 230,
    frequency: 50,
    phaseShiftDeg: 0,
    voltageConvention: 'LINE_TO_LINE',
    phaseSequence: 'ABC',
    sourceInductanceLs: 0,
    sourceResistanceRs: 0,
  });

  const [load, setLoad] = useState<LoadParameters>({
    loadType: 'RL',
    resistanceR: 10,
    inductanceL: 0.05,
    capacitanceC: 0,
    backEmfE: 0,
    idc: 5,
    freewheelingDiode: false,
  });

  const [deviceModel, setDeviceModel] = useState<DeviceModelParameters>({
    isIdeal: true,
    diodeForwardDrop: 0.8,
    thyristorForwardDrop: 1.2,
    onResistance: 0.01,
  });

  const [control, setControl] = useState<SimulationControlParameters>({
    firingAngleAlphaDeg: 30,
    simulationDurationCycles: 2,
    samplesPerCycle: 1000,
    startupTransient: false,
  });

  // Playback Animation State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.5);
  const [cursorTimeSec, setCursorTimeSec] = useState<number>(0);

  // Compute Simulation Result
  const simulationResult = useMemo(() => {
    return runSimulation(topologyId, source, load, deviceModel, control);
  }, [topologyId, source, load, deviceModel, control]);

  const totalDurationSec = simulationResult.basePeriod * control.simulationDurationCycles;

  // Active Instant Sample under cursor
  const currentSample = useMemo(() => {
    const s = simulationResult.samples;
    if (s.length === 0) return null;
    let idx = Math.round((cursorTimeSec / totalDurationSec) * (s.length - 1));
    idx = Math.max(0, Math.min(s.length - 1, idx));
    return s[idx];
  }, [simulationResult, cursorTimeSec, totalDurationSec]);

  // Animation Loop
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = null;
      return;
    }

    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (lastTimeRef.current !== null) {
        const deltaMs = timestamp - lastTimeRef.current;
        const deltaSec = (deltaMs / 1000) * playbackSpeed * 0.15; // Scaled for pleasant visibility
        setCursorTimeSec(prev => {
          let next = prev + deltaSec;
          if (next >= totalDurationSec) next = 0;
          return next;
        });
      }
      lastTimeRef.current = timestamp;
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, playbackSpeed, totalDurationSec]);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(p => !p);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const deltaSec = (step / 360) * simulationResult.basePeriod;
        setCursorTimeSec(t => (t + deltaSec) % totalDurationSec);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const deltaSec = (step / 360) * simulationResult.basePeriod;
        setCursorTimeSec(t => (t - deltaSec + totalDurationSec) % totalDurationSec);
      } else if (e.key === 'r' || e.key === 'R') {
        setCursorTimeSec(0);
      } else if (e.key === '1') {
        setActiveTab('CIRCUIT_ONLY');
      } else if (e.key === '2') {
        setActiveTab('SCOPE_ONLY');
      } else if (e.key === '3') {
        setActiveTab('STUDIO');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [simulationResult, totalDurationSec]);

  // Load Preset
  const handleSelectPreset = (presetId: string) => {
    const p = PRESETS.find(x => x.id === presetId || x.legacyId === presetId);
    if (!p) return;
    setTopologyId(p.topologyId);
    setSource(p.source);
    setLoad(p.load);
    setDeviceModel(p.deviceModel);
    setControl(p.control);
    setCursorTimeSec(0);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar activeTab={activeTab} onSelectTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col gap-4">
        {/* Playback Controls (Always visible in Studio, Scope, Circuit) */}
        {(activeTab === 'STUDIO' || activeTab === 'SCOPE_ONLY' || activeTab === 'CIRCUIT_ONLY') && (
          <PlaybackControls
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            cursorTimeSec={cursorTimeSec}
            totalDurationSec={totalDurationSec}
            onCursorChange={setCursorTimeSec}
            playbackSpeed={playbackSpeed}
            onSpeedChange={setPlaybackSpeed}
            frequency={source.frequency}
          />
        )}

        {/* View Mode: Studio (Both Schematic and Waveforms) */}
        {activeTab === 'STUDIO' && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Column: Parameter Control Panel */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <ParameterPanel
                  topologyId={topologyId}
                  onTopologyChange={id => {
                    setTopologyId(id);
                    setCursorTimeSec(0);
                  }}
                  source={source}
                  onSourceChange={setSource}
                  load={load}
                  onLoadChange={setLoad}
                  deviceModel={deviceModel}
                  onDeviceModelChange={setDeviceModel}
                  control={control}
                  onControlChange={setControl}
                  onSelectPreset={handleSelectPreset}
                />
              </div>

              {/* Right Column: Schematic and Oscilloscope */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                {currentSample && (
                  <CircuitViewer
                    topologyId={topologyId}
                    currentSample={currentSample}
                    deviceStates={simulationResult.results.devices}
                    hasFWD={load.freewheelingDiode}
                    alphaDeg={control.firingAngleAlphaDeg}
                  />
                )}

                <WaveformViewer
                  samples={simulationResult.samples}
                  markers={simulationResult.markers}
                  cursorTimeSec={cursorTimeSec}
                  onCursorChange={setCursorTimeSec}
                  topologyId={topologyId}
                />
              </div>
            </div>

            {/* Numerical Results Card */}
            <ResultPanel
              results={simulationResult.results}
              topologyId={topologyId}
              samples={simulationResult.samples}
            />

            {/* Theory & Derivation */}
            {currentSample && (
              <TheoryDerivationPanel
                topologyId={topologyId}
                currentSample={currentSample}
              />
            )}
          </div>
        )}

        {/* View Mode: Scope Focus */}
        {activeTab === 'SCOPE_ONLY' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-3">
              <ParameterPanel
                topologyId={topologyId}
                onTopologyChange={setTopologyId}
                source={source}
                onSourceChange={setSource}
                load={load}
                onLoadChange={setLoad}
                deviceModel={deviceModel}
                onDeviceModelChange={setDeviceModel}
                control={control}
                onControlChange={setControl}
                onSelectPreset={handleSelectPreset}
              />
            </div>
            <div className="lg:col-span-9 flex flex-col gap-4">
              <WaveformViewer
                samples={simulationResult.samples}
                markers={simulationResult.markers}
                cursorTimeSec={cursorTimeSec}
                onCursorChange={setCursorTimeSec}
                topologyId={topologyId}
              />
              <ResultPanel
                results={simulationResult.results}
                topologyId={topologyId}
                samples={simulationResult.samples}
              />
            </div>
          </div>
        )}

        {/* View Mode: Circuit Focus */}
        {activeTab === 'CIRCUIT_ONLY' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-4">
              <ParameterPanel
                topologyId={topologyId}
                onTopologyChange={setTopologyId}
                source={source}
                onSourceChange={setSource}
                load={load}
                onLoadChange={setLoad}
                deviceModel={deviceModel}
                onDeviceModelChange={setDeviceModel}
                control={control}
                onControlChange={setControl}
                onSelectPreset={handleSelectPreset}
              />
            </div>
            <div className="lg:col-span-8 flex flex-col gap-4">
              {currentSample && (
                <CircuitViewer
                  topologyId={topologyId}
                  currentSample={currentSample}
                  deviceStates={simulationResult.results.devices}
                  hasFWD={load.freewheelingDiode}
                  alphaDeg={control.firingAngleAlphaDeg}
                />
              )}
              {currentSample && (
                <TheoryDerivationPanel
                  topologyId={topologyId}
                  currentSample={currentSample}
                />
              )}
            </div>
          </div>
        )}

        {/* View Mode: Comparative Analysis */}
        {activeTab === 'COMPARE' && (
          <ComparisonMode
            currentTopology={topologyId}
            source={source}
            load={load}
            deviceModel={deviceModel}
            control={control}
          />
        )}

        {/* View Mode: Virtual Laboratory Workbook */}
        {activeTab === 'EXPERIMENTS' && (
          <ExperimentMode
            onLoadExperimentPreset={handleSelectPreset}
            results={simulationResult.results}
            topologyId={topologyId}
          />
        )}

        {/* View Mode: Pure Theory & Equations */}
        {activeTab === 'THEORY' && currentSample && (
          <TheoryDerivationPanel
            topologyId={topologyId}
            currentSample={currentSample}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-4 px-6 text-center text-xs text-slate-500 font-mono">
        Aditya Patidar (24EE10028) — Power Electronics Converter Simulator & Analyzer | IIT Kharagpur
      </footer>
    </div>
  );
};
