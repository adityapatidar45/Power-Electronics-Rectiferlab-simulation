import React from 'react';
import { TopologyId, TimeSample } from '../types';
import { TOPOLOGIES } from '../data/topologies';
import { BookOpen, Lightbulb, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';

interface TheoryDerivationPanelProps {
  topologyId: TopologyId;
  currentSample: TimeSample;
}

export const TheoryDerivationPanel: React.FC<TheoryDerivationPanelProps> = ({
  topologyId,
  currentSample,
}) => {
  const topo = TOPOLOGIES[topologyId];

  // Dynamic explanation of circuit state at current angle
  const getContextualExplanation = () => {
    const angle = currentSample.angleDeg;
    if (topologyId === '1ph-hw-diode') {
      if (angle < 180) {
        return 'The AC source voltage vs > 0 forward-biases Diode D1. Current flows through the load, storing magnetic energy in the inductor L.';
      } else if (currentSample.conductingDevices.includes('FWD')) {
        return 'Freewheeling Diode (FWD) is conducting! The induced inductor voltage (-L di/dt) clamps the output voltage to 0 V, dissipating stored magnetic energy through the resistor.';
      } else if (currentSample.conductingDevices.includes('D1')) {
        return 'Inductor action! Even though the AC source is negative, the collapsing magnetic field in the inductor (vL < 0) holds Diode D1 ON until the extinction angle β.';
      } else {
        return 'Diode D1 is reverse-biased (blocking). Load current is zero, and the diode blocks the negative peak voltage Vm.';
      }
    } else if (topologyId === '1ph-bridge-controlled') {
      if (currentSample.vo < -0.1) {
        return 'Negative Output Voltage in Inductive Load: The thyristor pair remains ON past 180° because load current has not reached zero. The inductor returns stored energy to the AC supply!';
      } else if (currentSample.gatePulses['T1'] === 1 || currentSample.gatePulses['T2'] === 1) {
        return 'Gate Trigger Pulse Active: The thyristor gate driver injects a triggering pulse, initiating conduction at firing angle α.';
      } else {
        return 'Normal Forward Conduction: Thyristor pair conducts the load current, delivering energy from the AC grid to the DC load.';
      }
    } else if (topologyId.startsWith('3ph')) {
      return `3-Phase 6-Pulse Commutation: Currently active devices: ${currentSample.conductingDevices.join(' and ')}. Output voltage equals the instantaneous line-to-line difference.`;
    }
    return currentSample.activePathDescription;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col gap-4 text-xs">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
        <BookOpen className="w-4 h-4 text-cyan-400" />
        <h3 className="font-semibold text-slate-100 text-sm tracking-wide">
          Educational Theory & Step-by-Step Derivations: {topo.name}
        </h3>
      </div>

      {/* Dynamic "Why is this happening?" box */}
      <div className="bg-gradient-to-r from-cyan-950/60 to-slate-950 border border-cyan-500/40 rounded-lg p-3 flex items-start gap-3">
        <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-cyan-300 block text-xs">
            What is happening right now at θ = {Math.round(currentSample.angleDeg)}°?
          </span>
          <p className="text-slate-300 mt-1 leading-relaxed">
            {getContextualExplanation()}
          </p>
        </div>
      </div>

      {/* Derivation Steps */}
      <div className="flex flex-col gap-3">
        <span className="font-bold text-slate-200 text-xs uppercase tracking-wider text-slate-400">
          Mathematical Derivation Steps:
        </span>

        {topo.derivationSteps.map((step, idx) => (
          <div key={idx} className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300 flex items-center justify-center font-mono font-bold text-[10px]">
                {idx + 1}
              </span>
              <span className="font-semibold text-slate-200">{step.title}</span>
            </div>

            <div className="bg-slate-900 p-2.5 rounded font-mono text-cyan-300 overflow-x-auto text-center my-1 border border-slate-800 text-sm">
              {step.latex}
            </div>

            <p className="text-slate-400 text-[11px] leading-relaxed">
              {step.explanation}
            </p>
          </div>
        ))}
      </div>

      {/* Advantages & Applications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
          <span className="font-semibold text-emerald-400 block mb-1.5">Key Advantages</span>
          <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
            {topo.advantages.map((adv, i) => (
              <li key={i}>{adv}</li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
          <span className="font-semibold text-cyan-400 block mb-1.5">Real-World Applications</span>
          <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
            {topo.applications.map((app, i) => (
              <li key={i}>{app}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
