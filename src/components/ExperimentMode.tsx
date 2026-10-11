import React, { useState } from 'react';
import { EXPERIMENTS, Experiment } from '../data/experiments';
import { NumericalResults, TopologyId } from '../types';
import {
  GraduationCap,
  FileText,
  Printer,
  Play,
  CheckCircle2,
  HelpCircle,
  ClipboardList,
} from 'lucide-react';

interface ExperimentModeProps {
  onLoadExperimentPreset: (presetId: string) => void;
  results: NumericalResults;
  topologyId: TopologyId;
}

export const ExperimentMode: React.FC<ExperimentModeProps> = ({
  onLoadExperimentPreset,
  results,
  topologyId,
}) => {
  const [selectedExpId, setSelectedExpId] = useState<string>('exp-1');
  const [studentNotes, setStudentNotes] = useState<string>('');

  const currentExp = EXPERIMENTS.find(e => e.id === selectedExpId) || EXPERIMENTS[0];

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col gap-4 text-xs">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold text-slate-100 text-sm tracking-wide">Virtual Power Electronics Laboratory Workbook</h3>
        </div>

        <button
          onClick={handlePrintReport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors shadow-lg"
          title="Print or Save Laboratory Report as PDF"
        >
          <Printer className="w-4 h-4" />
          Export Lab Report (PDF)
        </button>
      </div>

      {/* Experiment Selector Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1.5 rounded-lg border border-slate-800 overflow-x-auto">
        {EXPERIMENTS.map(exp => (
          <button
            key={exp.id}
            onClick={() => setSelectedExpId(exp.id)}
            className={`px-3 py-1.5 rounded text-left font-mono text-[11px] whitespace-nowrap transition-colors ${
              selectedExpId === exp.id
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Exp {exp.number}: {exp.topologyId.includes('3ph') ? '3-Ph' : '1-Ph'}
          </button>
        ))}
      </div>

      {/* Active Experiment Details Card */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Experiment #{currentExp.number}</span>
            <h4 className="text-sm font-bold text-slate-100">{currentExp.title}</h4>
          </div>

          <button
            onClick={() => onLoadExperimentPreset(currentExp.defaultPresetId)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md"
          >
            <Play className="w-3.5 h-3.5" />
            Load Setup into Simulator
          </button>
        </div>

        {/* Objective & Theory */}
        <div className="flex flex-col gap-2">
          <div>
            <strong className="text-cyan-400">Objective: </strong>
            <span className="text-slate-300 leading-relaxed">{currentExp.objective}</span>
          </div>

          <div>
            <strong className="text-cyan-400">Theoretical Overview: </strong>
            <p className="text-slate-300 mt-0.5 leading-relaxed">{currentExp.theorySummary}</p>
          </div>
        </div>

        {/* Key Formulas */}
        <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 flex flex-col gap-1 font-mono text-cyan-300">
          <span className="text-[10px] uppercase text-slate-400 font-sans font-bold">Governing Equations:</span>
          {currentExp.keyEquations.map((eq, i) => (
            <div key={i} className="text-center py-1">
              {eq}
            </div>
          ))}
        </div>

        {/* Procedure & Observations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
          <div>
            <strong className="text-slate-200 block mb-1 flex items-center gap-1">
              <ClipboardList className="w-3.5 h-3.5 text-cyan-400" /> Experimental Procedure
            </strong>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
              {currentExp.procedure.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          <div>
            <strong className="text-slate-200 block mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Expected Engineering Observations
            </strong>
            <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
              {currentExp.expectedObservations.map((obs, i) => (
                <li key={i}>{obs}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Live Lab Measurement Card */}
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-lg p-3 flex flex-col gap-2 mt-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Active Simulated Measurements for Current Circuit
            </span>
            <span className="text-slate-400 font-mono text-[11px]">Vdc = {results.voAvg.toFixed(2)} V</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
            <div className="bg-slate-950 p-2 rounded">
              <span className="text-slate-400 block">Vdc (Avg):</span>
              <span className="text-emerald-400 font-mono font-bold">{results.voAvg.toFixed(2)} V</span>
            </div>
            <div className="bg-slate-950 p-2 rounded">
              <span className="text-slate-400 block">Vrms (Output):</span>
              <span className="text-slate-200 font-mono font-bold">{results.voRms.toFixed(2)} V</span>
            </div>
            <div className="bg-slate-950 p-2 rounded">
              <span className="text-slate-400 block">Idc (Load):</span>
              <span className="text-amber-400 font-mono font-bold">{results.ioAvg.toFixed(2)} A</span>
            </div>
            <div className="bg-slate-950 p-2 rounded">
              <span className="text-slate-400 block">True Power Factor:</span>
              <span className="text-cyan-400 font-mono font-bold">{results.truePowerFactor.toFixed(3)}</span>
            </div>
          </div>
        </div>

        {/* Student Notes */}
        <div className="flex flex-col gap-1.5 mt-2">
          <label className="text-slate-300 font-semibold flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-cyan-400" /> Student Lab Notes & Conclusions:
          </label>
          <textarea
            value={studentNotes}
            onChange={e => setStudentNotes(e.target.value)}
            placeholder="Type observations, extinction angle measurements, harmonic readings, or conclusions here. Included in PDF export!"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 text-xs focus:ring-1 focus:ring-cyan-500 font-sans min-h-[70px]"
          />
        </div>
      </div>
    </div>
  );
};
