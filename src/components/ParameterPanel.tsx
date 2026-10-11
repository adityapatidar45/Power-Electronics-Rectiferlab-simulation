import React from 'react';
import {
  TopologyId,
  SourceParameters,
  LoadParameters,
  DeviceModelParameters,
  SimulationControlParameters,
  LoadType,
} from '../types';
import { TOPOLOGIES } from '../data/topologies';
import { PRESETS } from '../data/presets';
import { Sliders, Zap, Shield, Activity, RefreshCw, Bookmark } from 'lucide-react';

interface ParameterPanelProps {
  topologyId: TopologyId;
  onTopologyChange: (id: TopologyId) => void;
  source: SourceParameters;
  onSourceChange: (s: SourceParameters) => void;
  load: LoadParameters;
  onLoadChange: (l: LoadParameters) => void;
  deviceModel: DeviceModelParameters;
  onDeviceModelChange: (d: DeviceModelParameters) => void;
  control: SimulationControlParameters;
  onControlChange: (c: SimulationControlParameters) => void;
  onSelectPreset: (presetId: string) => void;
}

export const ParameterPanel: React.FC<ParameterPanelProps> = ({
  topologyId,
  onTopologyChange,
  source,
  onSourceChange,
  load,
  onLoadChange,
  deviceModel,
  onDeviceModelChange,
  control,
  onControlChange,
  onSelectPreset,
}) => {
  const isControlled = topologyId.includes('controlled') || topologyId === '1ph-semi-controlled';
  const is3Ph = topologyId.startsWith('3ph');

  const handleAlphaStep = (delta: number) => {
    const next = Math.min(180, Math.max(0, control.firingAngleAlphaDeg + delta));
    onControlChange({ ...control, firingAngleAlphaDeg: next });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col gap-4 text-xs">
      {/* Top Header: Presets and Quick Actions */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-slate-100 text-sm tracking-wide">Circuit & Control Parameters</h3>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-1.5">
          <Bookmark className="w-3.5 h-3.5 text-amber-400" />
          <select
            onChange={e => {
              if (e.target.value) {
                onSelectPreset(e.target.value);
                e.target.value = '';
              }
            }}
            defaultValue=""
            className="bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-slate-200 text-xs focus:ring-1 focus:ring-cyan-500 font-sans"
          >
            <option value="" disabled>Load Preset...</option>
            {Array.from(new Set(PRESETS.map(p => p.category))).map(category => (
              <optgroup key={category} label={category}>
                {PRESETS.filter(p => p.category === category).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {/* 1. Topology Selection */}
      <div className="flex flex-col gap-1.5">
        <label className="text-slate-400 font-medium">Rectifier Topology:</label>
        <select
          value={topologyId}
          onChange={e => onTopologyChange(e.target.value as TopologyId)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-semibold text-xs focus:ring-2 focus:ring-cyan-500"
        >
          <optgroup label="Single-Phase Converters">
            <option value="1ph-hw-diode">1-Phase Half-Wave Diode Rectifier</option>
            <option value="1ph-hw-controlled">1-Phase Half-Wave Controlled Rectifier (SCR)</option>
            <option value="1ph-ct-diode">1-Phase Full-Wave Center-Tapped Rectifier</option>
            <option value="1ph-bridge-diode">1-Phase Full-Wave Diode Bridge (Graetz)</option>
            <option value="1ph-bridge-controlled">1-Phase Fully Controlled Thyristor Bridge</option>
            <option value="1ph-semi-controlled">1-Phase Semi-Converter (Half-Controlled)</option>
          </optgroup>
          <optgroup label="Three-Phase Converters">
            <option value="3ph-hw-diode">3-Phase Half-Wave Diode Rectifier (3-Pulse)</option>
            <option value="3ph-hw-controlled">3-Phase Half-Wave Controlled Converter (3-Pulse)</option>
            <option value="3ph-bridge-diode">3-Phase 6-Pulse Diode Bridge Rectifier</option>
            <option value="3ph-bridge-controlled">3-Phase Fully Controlled 6-Pulse Converter</option>
            <option value="3ph-semi-controlled">3-Phase Semi-Converter (3 SCR + 3 Diode)</option>
          </optgroup>
        </select>
      </div>

      {/* 2. Controlled Firing Angle (α) slider if controlled */}
      {isControlled && (
        <div className="bg-slate-950/80 border border-cyan-500/30 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" /> Firing Delay Angle (α):
            </span>
            <div className="flex items-center gap-1 font-mono">
              <button
                onClick={() => handleAlphaStep(-5)}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                title="Decrease α by 5°"
              >
                -5°
              </button>
              <span className="text-sm font-bold text-cyan-400 px-2 bg-slate-900 rounded border border-slate-700">
                {control.firingAngleAlphaDeg}°
              </span>
              <button
                onClick={() => handleAlphaStep(5)}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                title="Increase α by 5°"
              >
                +5°
              </button>
            </div>
          </div>

          <input
            type="range"
            min="0"
            max="180"
            step="1"
            value={control.firingAngleAlphaDeg}
            onChange={e => onControlChange({ ...control, firingAngleAlphaDeg: Number(e.target.value) })}
            className="w-full accent-cyan-400 cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>0° (Diode Equivalent)</span>
            <span>60°</span>
            <span>90° (Vdc = 0)</span>
            <span>120° (Inverter Mode)</span>
            <span>180°</span>
          </div>
        </div>
      )}

      {/* 3. AC Source Parameters */}
      <div className="border border-slate-800 rounded-lg p-2.5 bg-slate-950/50 flex flex-col gap-2.5">
        <span className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">AC Source Settings</span>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-slate-400 block mb-1">
              Voltage ({source.voltageType}):
            </label>
            <div className="flex gap-1">
              <input
                type="number"
                min="10"
                max="1000"
                step="5"
                value={source.vRms}
                onChange={e => onSourceChange({ ...source, vRms: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
              />
              <button
                onClick={() => onSourceChange({ ...source, voltageType: source.voltageType === 'RMS' ? 'PEAK' : 'RMS' })}
                className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-cyan-400 hover:bg-slate-700"
              >
                {source.voltageType}
              </button>
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Frequency (Hz):</label>
            <input
              type="number"
              min="10"
              max="400"
              step="5"
              value={source.frequency}
              onChange={e => onSourceChange({ ...source, frequency: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
            />
          </div>
        </div>

        {/* 3-Phase Specifics */}
        {is3Ph && (
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
            <div>
              <label className="text-slate-400 block mb-1">Voltage Convention:</label>
              <select
                value={source.voltageConvention}
                onChange={e => onSourceChange({ ...source, voltageConvention: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              >
                <option value="LINE_TO_LINE">Line-to-Line (V_LL)</option>
                <option value="PHASE_TO_NEUTRAL">Phase-to-Neutral (V_ph)</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Phase Sequence:</label>
              <select
                value={source.phaseSequence}
                onChange={e => onSourceChange({ ...source, phaseSequence: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              >
                <option value="ABC">Positive (ABC)</option>
                <option value="ACB">Negative (ACB)</option>
              </select>
            </div>
          </div>
        )}

        {/* Source Inductance Ls */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
          <div>
            <label className="text-slate-400 block mb-1">Source Inductance Ls (mH):</label>
            <input
              type="number"
              min="0"
              max="50"
              step="0.5"
              value={Number((source.sourceInductanceLs * 1000).toFixed(2))}
              onChange={e => onSourceChange({ ...source, sourceInductanceLs: Number(e.target.value) / 1000 })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Source Resistance Rs (Ω):</label>
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={source.sourceResistanceRs}
              onChange={e => onSourceChange({ ...source, sourceResistanceRs: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
            />
          </div>
        </div>
      </div>

      {/* 4. DC Load Parameters */}
      <div className="border border-slate-800 rounded-lg p-2.5 bg-slate-950/50 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">DC Load Configuration</span>
          {/* Load Type Tabs */}
          <div className="flex gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
            {(['R', 'RL', 'RLE', 'CURRENT_SOURCE'] as LoadType[]).map(t => (
              <button
                key={t}
                onClick={() => onLoadChange({ ...load, loadType: t })}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${load.loadType === t ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                {t === 'CURRENT_SOURCE' ? 'Idc' : t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {load.loadType !== 'CURRENT_SOURCE' ? (
            <>
              <div>
                <label className="text-slate-400 block mb-1">Resistance R (Ω):</label>
                <input
                  type="number"
                  min="0.5"
                  max="500"
                  step="1"
                  value={load.resistanceR}
                  onChange={e => onLoadChange({ ...load, resistanceR: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                />
              </div>

              {(load.loadType === 'RL' || load.loadType === 'RLE') && (
                <div>
                  <label className="text-slate-400 block mb-1">Inductance L (mH):</label>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    step="5"
                    value={Number((load.inductanceL * 1000).toFixed(1))}
                    onChange={e => onLoadChange({ ...load, inductanceL: Number(e.target.value) / 1000 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                  />
                </div>
              )}

              {load.loadType === 'RLE' && (
                <div className="col-span-2">
                  <label className="text-slate-400 block mb-1">DC Back-EMF Source E (V):</label>
                  <input
                    type="number"
                    min="-300"
                    max="350"
                    step="5"
                    value={load.backEmfE}
                    onChange={e => onLoadChange({ ...load, backEmfE: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="col-span-2">
              <label className="text-slate-400 block mb-1">Constant DC Current Idc (A):</label>
              <input
                type="number"
                min="0.5"
                max="100"
                step="0.5"
                value={load.idc}
                onChange={e => onLoadChange({ ...load, idc: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
              />
            </div>
          )}
        </div>

        {/* Freewheeling Diode Toggle */}
        <label className="flex items-center gap-2 pt-1.5 border-t border-slate-800 cursor-pointer text-amber-400 font-medium">
          <input
            type="checkbox"
            checked={load.freewheelingDiode}
            onChange={e => onLoadChange({ ...load, freewheelingDiode: e.target.checked })}
            className="rounded text-amber-500 focus:ring-amber-400"
          />
          Connect Freewheeling Diode (FWD)
        </label>
      </div>

      {/* 5. Device Model & Simulation Options */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
        <label className="flex items-center gap-2 cursor-pointer text-slate-300">
          <input
            type="checkbox"
            checked={deviceModel.isIdeal}
            onChange={e => onDeviceModelChange({ ...deviceModel, isIdeal: e.target.checked })}
            className="rounded"
          />
          Ideal Switches (VF = 0V)
        </label>

        <label className="flex items-center gap-2 cursor-pointer text-slate-300">
          <input
            type="checkbox"
            checked={control.startupTransient}
            onChange={e => onControlChange({ ...control, startupTransient: e.target.checked })}
            className="rounded"
          />
          Show Startup Transient
        </label>
      </div>
    </div>
  );
};
