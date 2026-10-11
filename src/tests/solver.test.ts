import { describe, it, expect } from 'vitest';
import { runSimulation } from '../simulation/solver';
import { solveExtinctionAngleBeta, computeHarmonics } from '../simulation/math';
import {
  SourceParameters,
  LoadParameters,
  DeviceModelParameters,
  SimulationControlParameters,
} from '../types';

const defaultSource1Ph: SourceParameters = {
  voltageType: 'RMS',
  vRms: 230,
  frequency: 50,
  phaseShiftDeg: 0,
  sourceInductanceLs: 0,
  sourceResistanceRs: 0,
};

const defaultSource3Ph: SourceParameters = {
  voltageType: 'RMS',
  vRms: 400, // 400V Line-to-Line RMS
  frequency: 50,
  phaseShiftDeg: 0,
  voltageConvention: 'LINE_TO_LINE',
  phaseSequence: 'ABC',
  sourceInductanceLs: 0,
  sourceResistanceRs: 0,
};

const idealDevice: DeviceModelParameters = {
  isIdeal: true,
  diodeForwardDrop: 0,
  thyristorForwardDrop: 0,
  onResistance: 0,
};

const defaultControl: SimulationControlParameters = {
  firingAngleAlphaDeg: 0,
  simulationDurationCycles: 3,
  samplesPerCycle: 1000,
  startupTransient: false,
};

describe('Rectifier Physics & Mathematical Engine Validation', () => {
  it('1. Single-Phase Full-Wave Diode Bridge (R Load): Vdc = 2*Vm/pi ~= 0.9003*Vrms', () => {
    const load: LoadParameters = {
      loadType: 'R',
      resistanceR: 10,
      inductanceL: 0,
      capacitanceC: 0,
      backEmfE: 0,
      idc: 0,
      freewheelingDiode: false,
    };

    const res = runSimulation('1ph-bridge-diode', defaultSource1Ph, load, idealDevice, defaultControl);
    const expectedVdc = (2 * Math.SQRT2 * 230) / Math.PI; // ~207.07 V
    const expectedVrms = 230;

    expect(Math.abs(res.results.voAvg - expectedVdc)).toBeLessThan(1.0);
    expect(Math.abs(res.results.voRms - expectedVrms)).toBeLessThan(1.0);
    expect(res.results.errors.voAvgPercentError).toBeLessThan(0.5);
  });

  it('2. Three-Phase 6-Pulse Diode Bridge (R Load): Vdc = 3*sqrt(2)*VLL,rms/pi ~= 1.3505*VLL,rms', () => {
    const load: LoadParameters = {
      loadType: 'R',
      resistanceR: 20,
      inductanceL: 0,
      capacitanceC: 0,
      backEmfE: 0,
      idc: 0,
      freewheelingDiode: false,
    };

    const res = runSimulation('3ph-bridge-diode', defaultSource3Ph, load, idealDevice, defaultControl);
    const expectedVdc = (3 * Math.SQRT2 * 400) / Math.PI; // ~540.2 V

    expect(Math.abs(res.results.voAvg - expectedVdc)).toBeLessThan(1.5);
    expect(res.results.errors.voAvgPercentError).toBeLessThan(0.8);
  });

  it('3. Single-Phase Controlled Bridge (CCM, alpha = 30 deg): Vdc = (2*Vm/pi)*cos(alpha)', () => {
    const load: LoadParameters = {
      loadType: 'RL',
      resistanceR: 10,
      inductanceL: 0.1,
      capacitanceC: 0,
      backEmfE: 0,
      idc: 0,
      freewheelingDiode: false,
    };

    const control: SimulationControlParameters = {
      ...defaultControl,
      firingAngleAlphaDeg: 30,
    };

    const res = runSimulation('1ph-bridge-controlled', defaultSource1Ph, load, idealDevice, control);
    const expectedVdc = ((2 * Math.SQRT2 * 230) / Math.PI) * Math.cos((30 * Math.PI) / 180); // ~179.33 V

    expect(res.results.conductionMode).toBe('CONTINUOUS');
    expect(Math.abs(res.results.voAvg - expectedVdc)).toBeLessThan(1.0);
  });

  it('4. Single-Phase Controlled Bridge (CCM, alpha = 60 deg): Vdc = (2*Vm/pi)*cos(60 deg) = 0.5 * Vdc0', () => {
    const load: LoadParameters = {
      loadType: 'RL',
      resistanceR: 10,
      inductanceL: 0.1,
      capacitanceC: 0,
      backEmfE: 0,
      idc: 0,
      freewheelingDiode: false,
    };

    const control: SimulationControlParameters = {
      ...defaultControl,
      firingAngleAlphaDeg: 60,
    };

    const res = runSimulation('1ph-bridge-controlled', defaultSource1Ph, load, idealDevice, control);
    const expectedVdc = ((2 * Math.SQRT2 * 230) / Math.PI) * 0.5; // ~103.54 V

    expect(res.results.conductionMode).toBe('CONTINUOUS');
    expect(Math.abs(res.results.voAvg - expectedVdc)).toBeLessThan(1.0);
  });

  it('5. Controlled Bridge with Freewheeling Diode (alpha = 60 deg): Vdc = (Vm/pi)*(1 + cos(alpha))', () => {
    const load: LoadParameters = {
      loadType: 'RL',
      resistanceR: 10,
      inductanceL: 0.1,
      capacitanceC: 0,
      backEmfE: 0,
      idc: 0,
      freewheelingDiode: true,
    };

    const control: SimulationControlParameters = {
      ...defaultControl,
      firingAngleAlphaDeg: 60,
    };

    const res = runSimulation('1ph-bridge-controlled', defaultSource1Ph, load, idealDevice, control);
    const Vm = Math.SQRT2 * 230;
    const expectedVdc = (Vm / Math.PI) * (1 + Math.cos((60 * Math.PI) / 180)); // ~155.3 V

    expect(Math.abs(res.results.voAvg - expectedVdc)).toBeLessThan(1.0);
    expect(res.results.voMin).toBeGreaterThanOrEqual(-0.01);
  });

  it('6. Three-Phase Controlled Bridge (alpha = 45 deg, CCM): Vdc = (3*sqrt(2)*VLL,rms/pi)*cos(45 deg)', () => {
    const load: LoadParameters = {
      loadType: 'RL',
      resistanceR: 20,
      inductanceL: 0.05,
      capacitanceC: 0,
      backEmfE: 0,
      idc: 0,
      freewheelingDiode: false,
    };

    const control: SimulationControlParameters = {
      ...defaultControl,
      firingAngleAlphaDeg: 45,
    };

    const res = runSimulation('3ph-bridge-controlled', defaultSource3Ph, load, idealDevice, control);
    const Vdc0 = (3 * Math.SQRT2 * 400) / Math.PI;
    const expectedVdc = Vdc0 * Math.cos((45 * Math.PI) / 180); // ~381.98 V

    expect(Math.abs(res.results.voAvg - expectedVdc)).toBeLessThan(2.0);
  });

  it('7. Single-Phase Half-Wave Diode Rectifier (R Load): Vdc = Vm/pi, Vrms = Vm/2', () => {
    const load: LoadParameters = {
      loadType: 'R',
      resistanceR: 10,
      inductanceL: 0,
      capacitanceC: 0,
      backEmfE: 0,
      idc: 0,
      freewheelingDiode: false,
    };

    const res = runSimulation('1ph-hw-diode', defaultSource1Ph, load, idealDevice, defaultControl);
    const Vm = Math.SQRT2 * 230;
    const expectedVdc = Vm / Math.PI; // ~103.53 V
    const expectedVrms = Vm / 2; // ~162.63 V

    expect(Math.abs(res.results.voAvg - expectedVdc)).toBeLessThan(1.0);
    expect(Math.abs(res.results.voRms - expectedVrms)).toBeLessThan(1.0);
  });

  it('8. Analytical Extinction Angle Beta Solver for RL Load', () => {
    const R = 10;
    const L = 0.0318;
    const omega = 2 * Math.PI * 50;
    const Vm = 325;
    const alphaRad = (30 * Math.PI) / 180;

    const { betaRad, isContinuous } = solveExtinctionAngleBeta(alphaRad, R, L, omega, Vm, 0);
    const betaDeg = (betaRad * 180) / Math.PI;

    expect(betaDeg).toBeGreaterThan(180);
    expect(betaDeg).toBeLessThan(270);
  });

  it('9. Current Continuity: Load Current does not have instantaneous steps in Inductive Load', () => {
    const load: LoadParameters = {
      loadType: 'RL',
      resistanceR: 10,
      inductanceL: 0.05,
      capacitanceC: 0,
      backEmfE: 0,
      idc: 0,
      freewheelingDiode: false,
    };

    const res = runSimulation('1ph-bridge-diode', defaultSource1Ph, load, idealDevice, defaultControl);
    const N = res.samples.length;
    const cycleSamples = res.samples.slice(N - 1000);
    let maxDeltaI = 0;
    for (let i = 1; i < cycleSamples.length; i++) {
      const dI = Math.abs(cycleSamples[i].io - cycleSamples[i - 1].io);
      if (dI > maxDeltaI) maxDeltaI = dI;
    }
    expect(maxDeltaI).toBeLessThan(0.3);
  });

  it('10. Single-Phase Semi-Converter (alpha = 45 deg): Vdc = (Vm/pi)*(1 + cos(alpha))', () => {
    const load: LoadParameters = {
      loadType: 'RL',
      resistanceR: 10,
      inductanceL: 0.05,
      capacitanceC: 0,
      backEmfE: 0,
      idc: 0,
      freewheelingDiode: false,
    };

    const control: SimulationControlParameters = {
      ...defaultControl,
      firingAngleAlphaDeg: 45,
    };

    const res = runSimulation('1ph-semi-controlled', defaultSource1Ph, load, idealDevice, control);
    const Vm = Math.SQRT2 * 230;
    const expectedVdc = (Vm / Math.PI) * (1 + Math.cos((45 * Math.PI) / 180)); // ~176.7 V

    expect(Math.abs(res.results.voAvg - expectedVdc)).toBeLessThan(1.5);
    expect(res.results.voMin).toBeGreaterThanOrEqual(-0.01);
  });

  it('11. Single-Phase Center-Tapped Rectifier: PIV = 2*Vm and Vdc = 2*Vm/pi', () => {
    const load: LoadParameters = {
      loadType: 'R',
      resistanceR: 10,
      inductanceL: 0,
      capacitanceC: 0,
      backEmfE: 0,
      idc: 0,
      freewheelingDiode: false,
    };

    const res = runSimulation('1ph-ct-diode', defaultSource1Ph, load, idealDevice, defaultControl);
    const Vm = Math.SQRT2 * 230;
    const expectedVdc = (2 * Vm) / Math.PI;

    expect(Math.abs(res.results.voAvg - expectedVdc)).toBeLessThan(1.0);
    expect(res.results.theoretical.piv).toBeCloseTo(2 * Vm, 0);
  });

  it('12. Three-Phase Half-Wave (3-Pulse) Rectifier: Vdc = (3*sqrt(3)*Vm,ph)/(2*pi)', () => {
    const load: LoadParameters = {
      loadType: 'R',
      resistanceR: 10,
      inductanceL: 0,
      capacitanceC: 0,
      backEmfE: 0,
      idc: 0,
      freewheelingDiode: false,
    };

    const res = runSimulation('3ph-hw-diode', defaultSource3Ph, load, idealDevice, defaultControl);
    const Vm_LL = Math.SQRT2 * 400;
    const Vm_ph = Vm_LL / Math.sqrt(3);
    const expectedVdc = (3 * Math.sqrt(3) * Vm_ph) / (2 * Math.PI); // ~270.1 V

    expect(Math.abs(res.results.voAvg - expectedVdc)).toBeLessThan(2.0);
  });

  it('13. DFT Harmonic Analysis verifies dominant fundamental on pure sine wave', () => {
    const N = 1000;
    const f = 50;
    const dt = (1 / f) / N;
    const signal: number[] = [];
    for (let i = 0; i < N; i++) {
      signal.push(10 * Math.sin(2 * Math.PI * f * i * dt));
    }

    const { harmonics, thd } = computeHarmonics(signal, dt, f, 15);
    const fund = harmonics.find(h => h.order === 1);

    expect(fund).toBeDefined();
    expect(fund?.magnitude).toBeCloseTo(10, 0);
    expect(thd).toBeLessThan(0.1); // THD of pure sine is 0%
  });
});
