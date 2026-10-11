import React, { useState } from 'react';
import {
  TopologyId,
  SourceParameters,
  LoadParameters,
  DeviceModelParameters,
  SimulationControlParameters,
} from '../types';
import { runSimulation } from '../simulation/solver';
import { GitCompare } from 'lucide-react';

interface ComparisonModeProps {
  currentTopology: TopologyId;
  source: SourceParameters;
  load: LoadParameters;
  deviceModel: DeviceModelParameters;
  control: SimulationControlParameters;
}

interface SimConfig {
  topo: TopologyId;
  load: LoadParameters;
  control: SimulationControlParameters;
  label: string;
}

export const ComparisonMode: React.FC<ComparisonModeProps> = ({
  currentTopology,
  source,
  load,
  deviceModel,
  control,
}) => {
  const [compPair, setCompPair] = useState<'R_VS_RL' | 'DIODE_VS_CONTROLLED' | 'WITH_VS_WITHOUT_FWD' | '1PH_VS_3PH'>('R_VS_RL');

  let simAConfig: SimConfig = {
    topo: currentTopology,
    load: { ...load, loadType: 'R', inductanceL: 0, freewheelingDiode: false },
    control: { ...control, firingAngleAlphaDeg: 0 },
    label: 'Resistive Load (Pure R)',
  };

  let simBConfig: SimConfig = {
    topo: currentTopology,
    load: { ...load, loadType: 'RL', inductanceL: 0.05, freewheelingDiode: false },
    control: { ...control, firingAngleAlphaDeg: 0 },
    label: 'Inductive Load (Series RL, L = 50 mH)',
  };

  if (compPair === 'DIODE_VS_CONTROLLED') {
    simAConfig = {
      topo: '1ph-bridge-diode',
      load: { ...load },
      control: { ...control, firingAngleAlphaDeg: 0 },
      label: '1-Ph Diode Bridge (Uncontrolled)',
    };
    simBConfig = {
      topo: '1ph-bridge-controlled',
      load: { ...load },
      control: { ...control, firingAngleAlphaDeg: 45 },
      label: '1-Ph Controlled Bridge (α = 45°)',
    };
  } else if (compPair === 'WITH_VS_WITHOUT_FWD') {
    simAConfig = {
      topo: '1ph-bridge-controlled',
      load: { ...load, loadType: 'RL', inductanceL: 0.05, freewheelingDiode: false },
      control: { ...control, firingAngleAlphaDeg: 60 },
      label: 'Controlled Bridge Without FWD (Negative vo tail)',
    };
    simBConfig = {
      topo: '1ph-bridge-controlled',
      load: { ...load, loadType: 'RL', inductanceL: 0.05, freewheelingDiode: true },
      control: { ...control, firingAngleAlphaDeg: 60 },
      label: 'Controlled Bridge With FWD (vo clamped to 0V)',
    };
  } else if (compPair === '1PH_VS_3PH') {
    simAConfig = {
      topo: '1ph-bridge-diode',
      load: { ...load },
      control: { ...control },
      label: '1-Phase Full-Bridge Diode (2-Pulse, 48.3% Ripple)',
    };
    simBConfig = {
      topo: '3ph-bridge-diode',
      load: { ...load },
      control: { ...control },
      label: '3-Phase 6-Pulse Diode Bridge (6-Pulse, 4.2% Ripple)',
    };
  }

  const resA = runSimulation(simAConfig.topo, source, simAConfig.load, deviceModel, simAConfig.control);
  const resB = runSimulation(simBConfig.topo, source, simBConfig.load, deviceModel, simBConfig.control);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col gap-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-slate-100 text-sm tracking-wide">Comparative Engineering Analysis</h3>
        </div>

        <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 font-mono text-[11px]">
          <button
            onClick={() => setCompPair('R_VS_RL')}
            className={`px-2.5 py-1 rounded ${compPair === 'R_VS_RL' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            R vs RL Load
          </button>
          <button
            onClick={() => setCompPair('DIODE_VS_CONTROLLED')}
            className={`px-2.5 py-1 rounded ${compPair === 'DIODE_VS_CONTROLLED' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            Diode vs Controlled
          </button>
          <button
            onClick={() => setCompPair('WITH_VS_WITHOUT_FWD')}
            className={`px-2.5 py-1 rounded ${compPair === 'WITH_VS_WITHOUT_FWD' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            With vs Without FWD
          </button>
          <button
            onClick={() => setCompPair('1PH_VS_3PH')}
            className={`px-2.5 py-1 rounded ${compPair === '1PH_VS_3PH' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            1-Phase vs 3-Phase
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Case A */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col gap-2">
          <div className="border-b border-slate-800 pb-1.5 flex items-center justify-between">
            <span className="font-bold text-cyan-400 text-xs">{simAConfig.label}</span>
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono text-[10px]">
              Case A
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-slate-900/60 p-2 rounded">
              <span className="text-slate-400 block">Average Output Vdc:</span>
              <span className="text-emerald-400 font-mono font-bold text-sm">{resA.results.voAvg.toFixed(2)} V</span>
            </div>
            <div className="bg-slate-900/60 p-2 rounded">
              <span className="text-slate-400 block">RMS Output Vrms:</span>
              <span className="text-slate-200 font-mono font-bold text-sm">{resA.results.voRms.toFixed(2)} V</span>
            </div>
            <div className="bg-slate-900/60 p-2 rounded">
              <span className="text-slate-400 block">Voltage Ripple Factor:</span>
              <span className="text-amber-400 font-mono font-bold">{(resA.results.voRippleFactor * 100).toFixed(1)}%</span>
            </div>
            <div className="bg-slate-900/60 p-2 rounded">
              <span className="text-slate-400 block">True Power Factor:</span>
              <span className="text-cyan-300 font-mono font-bold">{resA.results.truePowerFactor.toFixed(3)}</span>
            </div>
          </div>
        </div>

        {/* Case B */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col gap-2">
          <div className="border-b border-slate-800 pb-1.5 flex items-center justify-between">
            <span className="font-bold text-amber-400 text-xs">{simBConfig.label}</span>
            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono text-[10px]">
              Case B
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-slate-900/60 p-2 rounded">
              <span className="text-slate-400 block">Average Output Vdc:</span>
              <span className="text-emerald-400 font-mono font-bold text-sm">{resB.results.voAvg.toFixed(2)} V</span>
            </div>
            <div className="bg-slate-900/60 p-2 rounded">
              <span className="text-slate-400 block">RMS Output Vrms:</span>
              <span className="text-slate-200 font-mono font-bold text-sm">{resB.results.voRms.toFixed(2)} V</span>
            </div>
            <div className="bg-slate-900/60 p-2 rounded">
              <span className="text-slate-400 block">Voltage Ripple Factor:</span>
              <span className="text-amber-400 font-mono font-bold">{(resB.results.voRippleFactor * 100).toFixed(1)}%</span>
            </div>
            <div className="bg-slate-900/60 p-2 rounded">
              <span className="text-slate-400 block">True Power Factor:</span>
              <span className="text-cyan-300 font-mono font-bold">{resB.results.truePowerFactor.toFixed(3)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-slate-300 leading-relaxed">
        <strong className="text-cyan-400">Engineering Takeaway: </strong>
        {compPair === 'R_VS_RL' && (
          'An inductive load L smooths the output current by storing energy during voltage peaks and releasing it during valleys. However, without a freewheeling diode, the negative voltage tail reduces the average DC output.'
        )}
        {compPair === 'DIODE_VS_CONTROLLED' && (
          'Phase angle control delays conduction by α, allowing continuous voltage regulation down to zero, but introduces line harmonics and depresses the displacement power factor (DPF ≈ cos α).'
        )}
        {compPair === 'WITH_VS_WITHOUT_FWD' && (
          'The freewheeling diode eliminates the negative voltage excursion during [π, π+α], raising average DC voltage to (Vm/π)(1 + cos α) and preventing reactive power circulation back to the AC grid.'
        )}
        {compPair === '1PH_VS_3PH' && (
          'The three-phase 6-pulse bridge reduces ripple factor from 48.3% down to 4.2% while tripling the ripple frequency to 300 Hz, dramatically shrinking DC filter capacitor size.'
        )}
      </div>
    </div>
  );
};
