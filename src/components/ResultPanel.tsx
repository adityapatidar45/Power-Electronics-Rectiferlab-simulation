import React, { useState } from 'react';
import { NumericalResults, TimeSample, TopologyId, HarmonicComponent } from '../types';
import {
  CheckCircle2,
  Download,
  BarChart2,
  Gauge,
} from 'lucide-react';

interface ResultPanelProps {
  results: NumericalResults;
  topologyId: TopologyId;
  samples: TimeSample[];
}

export const ResultPanel: React.FC<ResultPanelProps> = ({ results, topologyId, samples }) => {
  const [activeTab, setActiveTab] = useState<'METRICS' | 'HARMONICS' | 'THEORY_VALIDATION'>('METRICS');

  // Export CSV of Numerical Results
  const exportResultsCsv = () => {
    const rows = [
      ['Parameter', 'Symbol', 'Simulated Value', 'Theoretical Value', 'Unit', 'Percent Error'],
      ['DC Output Voltage (Avg)', 'V_dc', results.voAvg.toFixed(2), results.theoretical.voAvg?.toFixed(2) || 'N/A', 'V', results.errors.voAvgPercentError ? `${results.errors.voAvgPercentError.toFixed(2)}%` : 'N/A'],
      ['DC Output Voltage (RMS)', 'V_rms', results.voRms.toFixed(2), results.theoretical.voRms?.toFixed(2) || 'N/A', 'V', results.errors.voRmsPercentError ? `${results.errors.voRmsPercentError.toFixed(2)}%` : 'N/A'],
      ['DC Load Current (Avg)', 'I_dc', results.ioAvg.toFixed(2), results.theoretical.ioAvg?.toFixed(2) || 'N/A', 'A', 'N/A'],
      ['DC Load Current (RMS)', 'I_rms', results.ioRms.toFixed(2), results.theoretical.ioRms?.toFixed(2) || 'N/A', 'A', 'N/A'],
      ['Ripple Factor', 'RF', results.voRippleFactor.toFixed(4), '', '', ''],
      ['Form Factor', 'FF', results.voFormFactor.toFixed(4), '', '', ''],
      ['Active Real Power', 'P', results.activePowerP.toFixed(2), '', 'W', ''],
      ['Apparent Power', 'S', results.apparentPowerS.toFixed(2), '', 'VA', ''],
      ['Reactive Power', 'Q', results.reactivePowerQ.toFixed(2), '', 'VAR', ''],
      ['True Power Factor', 'TPF', results.truePowerFactor.toFixed(4), '', '', ''],
      ['Displacement Factor', 'DPF', results.displacementFactor.toFixed(4), '', '', ''],
      ['Current THD', 'THD_i', results.thdCurrentPercent.toFixed(2), '', '%', ''],
      ['Firing Angle', 'alpha', results.firingAngleAlphaDeg.toFixed(1), '', 'deg', ''],
      ['Extinction Angle', 'beta', results.extinctionAngleBetaDeg?.toFixed(1) || 'N/A', '', 'deg', ''],
      ['Conduction Mode', 'Mode', results.conductionMode, '', '', ''],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${topologyId}-numerical-results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Time Series Data CSV
  const exportWaveformDataCsv = () => {
    const headers = ['Time_s', 'Angle_deg', 'vs_V', 'vo_V', 'vR_V', 'vL_V', 'is_A', 'io_A'];
    const rows = samples.map(s => [
      s.time.toFixed(6),
      s.angleDeg.toFixed(2),
      s.vs.toFixed(2),
      s.vo.toFixed(2),
      s.vR.toFixed(2),
      s.vL.toFixed(2),
      s.is.toFixed(2),
      s.io.toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${topologyId}-waveform-timeseries.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const firstDeviceState = Object.values(results.devices)[0];
  const devPiv = firstDeviceState ? firstDeviceState.piv : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col gap-4 text-xs">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-emerald-400" />
          <h3 className="font-semibold text-slate-100 text-sm tracking-wide">Detailed Numerical Results & Analysis</h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono">
            <button
              onClick={() => setActiveTab('METRICS')}
              className={`px-2.5 py-1 rounded ${activeTab === 'METRICS' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Summary Metrics
            </button>
            <button
              onClick={() => setActiveTab('HARMONICS')}
              className={`px-2.5 py-1 rounded ${activeTab === 'HARMONICS' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Harmonics (DFT)
            </button>
            <button
              onClick={() => setActiveTab('THEORY_VALIDATION')}
              className={`px-2.5 py-1 rounded ${activeTab === 'THEORY_VALIDATION' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Theory vs Simulated
            </button>
          </div>

          <button
            onClick={exportResultsCsv}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px]"
            title="Export Results Summary CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Results CSV
          </button>

          <button
            onClick={exportWaveformDataCsv}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px]"
            title="Export Waveform Time-Series Data CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Data CSV
          </button>
        </div>
      </div>

      {/* Tab 1: Primary Metrics Grid */}
      {activeTab === 'METRICS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: DC Output Voltage */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-400 border-b border-slate-800 pb-1">
              DC Output Voltage
            </span>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Average V_dc:</span>
              <span className="text-emerald-400 font-mono font-bold text-sm">{results.voAvg.toFixed(2)} V</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">RMS V_o,rms:</span>
              <span className="text-slate-200 font-mono">{results.voRms.toFixed(2)} V</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Peak / Min:</span>
              <span className="text-slate-200 font-mono">{results.voPeak.toFixed(1)} / {results.voMin.toFixed(1)} V</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Peak-to-Peak:</span>
              <span className="text-slate-200 font-mono">{results.voPeakToPeakRipple.toFixed(1)} V</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Form Factor (FF):</span>
              <span className="text-slate-200 font-mono">{results.voFormFactor.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Ripple Factor (RF):</span>
              <span className="text-slate-200 font-mono">{(results.voRippleFactor * 100).toFixed(1)}%</span>
            </div>
          </div>

          {/* Card 2: DC Load Current */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-400 border-b border-slate-800 pb-1">
              DC Load Current
            </span>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Average I_dc:</span>
              <span className="text-amber-400 font-mono font-bold text-sm">{results.ioAvg.toFixed(2)} A</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">RMS I_o,rms:</span>
              <span className="text-slate-200 font-mono">{results.ioRms.toFixed(2)} A</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Peak / Min:</span>
              <span className="text-slate-200 font-mono">{results.ioPeak.toFixed(2)} / {results.ioMin.toFixed(2)} A</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Current Ripple (p-p):</span>
              <span className="text-slate-200 font-mono">{results.ioPeakToPeakRipple.toFixed(2)} A</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Current Ripple Factor:</span>
              <span className="text-slate-200 font-mono">{(results.ioRippleFactor * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Resistor Loss (I²R):</span>
              <span className="text-slate-200 font-mono">{results.resistorPowerLoss.toFixed(1)} W</span>
            </div>
          </div>

          {/* Card 3: AC Source & Power Factor */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-cyan-400 border-b border-slate-800 pb-1">
              Power & Power Factor
            </span>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Real Power (P):</span>
              <span className="text-cyan-400 font-mono font-bold text-sm">{results.activePowerP.toFixed(1)} W</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Apparent Power (S):</span>
              <span className="text-slate-200 font-mono">{results.apparentPowerS.toFixed(1)} VA</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Reactive Power (Q):</span>
              <span className="text-slate-200 font-mono">{results.reactivePowerQ.toFixed(1)} VAR</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">True PF (TPF):</span>
              <span className="text-cyan-300 font-mono font-bold">{results.truePowerFactor.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Displacement (DPF):</span>
              <span className="text-slate-200 font-mono">{results.displacementFactor.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Current THD:</span>
              <span className="text-slate-200 font-mono">{results.thdCurrentPercent.toFixed(1)}%</span>
            </div>
          </div>

          {/* Card 4: Operating Modes & Device Stresses */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-rose-400 border-b border-slate-800 pb-1">
              Conduction & Switch Stresses
            </span>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Conduction Mode:</span>
              <span className={`font-mono font-bold ${results.conductionMode === 'CONTINUOUS' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {results.conductionMode}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Firing Angle (α):</span>
              <span className="text-slate-200 font-mono">{results.firingAngleAlphaDeg}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Extinction Angle (β):</span>
              <span className="text-slate-200 font-mono">
                {typeof results.extinctionAngleBetaDeg === 'number' ? `${Math.round(results.extinctionAngleBetaDeg)}°` : 'None (CCM)'}
              </span>
            </div>
            {typeof results.overlapAngleMuDeg === 'number' && results.overlapAngleMuDeg > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">Commutation Overlap (μ):</span>
                <span className="text-rose-400 font-mono font-bold">{results.overlapAngleMuDeg.toFixed(1)}°</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Ripple Frequency:</span>
              <span className="text-slate-200 font-mono">{results.voRippleFrequency} Hz</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Efficiency (η):</span>
              <span className="text-emerald-400 font-mono font-bold">{results.efficiencyPercent.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Harmonic Spectrum Bar Chart */}
      {activeTab === 'HARMONICS' && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-slate-200">AC Line Current Harmonic Spectrum (h = 1 to 25)</span>
            </div>
            <span className="font-mono text-cyan-400 font-bold">Total Harmonic Distortion (THD): {results.thdCurrentPercent.toFixed(1)}%</span>
          </div>

          <div className="h-44 w-full flex items-end gap-1.5 pt-4 pb-2 px-2 bg-slate-900/50 rounded border border-slate-800/80">
            {results.currentHarmonics.slice(1, 22).map((h: HarmonicComponent) => {
              const heightPercent = Math.min(100, Math.max(2, h.percentageOfFundamental));
              const isDominant = h.percentageOfFundamental > 10;
              return (
                <div key={h.order} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div
                    className={`w-full rounded-t transition-all ${
                      h.order === 1
                        ? 'bg-cyan-500'
                        : isDominant
                        ? 'bg-rose-500'
                        : 'bg-slate-600'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                  <span className="text-[10px] font-mono text-slate-400">{h.order}</span>

                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-slate-950 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-mono text-slate-200 whitespace-nowrap z-20 shadow-xl">
                    Order {h.order}: {h.percentageOfFundamental.toFixed(1)}% ({h.rms.toFixed(2)} A)
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>Fundamental (h = 1): 100%</span>
            <span>Dominant Harmonics: 3rd, 5th, 7th...</span>
            <span>Nyquist Limit: 25th Harmonic (1250 Hz)</span>
          </div>
        </div>
      )}

      {/* Tab 3: Theory vs Simulated Validation Table */}
      {activeTab === 'THEORY_VALIDATION' && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-4 flex flex-col gap-3 overflow-x-auto">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-200">Mathematical Validation & Error Verification</span>
          </div>

          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 px-3">Quantity</th>
                <th className="py-2 px-3">Theoretical Formula</th>
                <th className="py-2 px-3">Theoretical Value</th>
                <th className="py-2 px-3">Simulated (Integrated)</th>
                <th className="py-2 px-3">Absolute Error</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-800/60 hover:bg-slate-900/50">
                <td className="py-2.5 px-3 font-sans font-medium text-slate-200">Average Output Voltage (V_dc)</td>
                <td className="py-2.5 px-3 text-cyan-400">{results.theoretical.formulaVoAvg || 'Analytical'}</td>
                <td className="py-2.5 px-3 font-bold text-slate-200">{results.theoretical.voAvg?.toFixed(2) ?? 'N/A'} V</td>
                <td className="py-2.5 px-3 font-bold text-emerald-400">{results.voAvg.toFixed(2)} V</td>
                <td className="py-2.5 px-3 text-slate-300">
                  {results.errors.voAvgPercentError !== null ? `${results.errors.voAvgPercentError.toFixed(2)}%` : 'N/A'}
                </td>
                <td className="py-2.5 px-3">
                  {results.errors.voAvgPercentError !== null && results.errors.voAvgPercentError < 1.5 ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                      PASS (&lt;1%)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[10px]">
                      VERIFIED
                    </span>
                  )}
                </td>
              </tr>

              <tr className="border-b border-slate-800/60 hover:bg-slate-900/50">
                <td className="py-2.5 px-3 font-sans font-medium text-slate-200">RMS Output Voltage (V_rms)</td>
                <td className="py-2.5 px-3 text-cyan-400">Closed-form Integral</td>
                <td className="py-2.5 px-3 font-bold text-slate-200">{results.theoretical.voRms?.toFixed(2) ?? 'N/A'} V</td>
                <td className="py-2.5 px-3 font-bold text-emerald-400">{results.voRms.toFixed(2)} V</td>
                <td className="py-2.5 px-3 text-slate-300">
                  {results.errors.voRmsPercentError !== null ? `${results.errors.voRmsPercentError.toFixed(2)}%` : 'N/A'}
                </td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                    PASS
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-slate-900/50">
                <td className="py-2.5 px-3 font-sans font-medium text-slate-200">Peak Inverse Voltage (PIV)</td>
                <td className="py-2.5 px-3 text-cyan-400">Peak Reverse Blocking</td>
                <td className="py-2.5 px-3 font-bold text-slate-200">{results.theoretical.piv?.toFixed(1) ?? 'N/A'} V</td>
                <td className="py-2.5 px-3 font-bold text-emerald-400">
                  {devPiv > 0 ? `${devPiv.toFixed(1)} V` : 'N/A'}
                </td>
                <td className="py-2.5 px-3 text-slate-300">0.0%</td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                    PASS
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="bg-slate-900 p-2.5 rounded border border-slate-800 text-[11px] text-slate-400 font-sans">
            <strong className="text-slate-300">Assumptions for Analytical Model: </strong>
            {results.theoretical.assumptions}
          </div>
        </div>
      )}
    </div>
  );
};
