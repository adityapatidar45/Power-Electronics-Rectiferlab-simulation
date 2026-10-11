import { runSimulation } from './src/simulation/solver';

const defaultSource1Ph = {
  voltageType: 'RMS',
  vRms: 230,
  frequency: 50,
  phaseShiftDeg: 0,
  sourceInductanceLs: 0,
  sourceResistanceRs: 0,
};

const idealDevice = {
  isIdeal: true,
  diodeForwardDrop: 0,
  thyristorForwardDrop: 0,
  onResistance: 0,
};

const defaultControl = {
  firingAngleAlphaDeg: 0,
  simulationDurationCycles: 3,
  samplesPerCycle: 1000,
  startupTransient: false,
};

const load = {
  loadType: 'RL',
  resistanceR: 10,
  inductanceL: 0.05,
  capacitanceC: 0,
  backEmfE: 0,
  idc: 0,
  freewheelingDiode: false,
};

const res = runSimulation('1ph-bridge-diode', defaultSource1Ph, load, idealDevice, defaultControl);

let maxDeltaI = 0;
let maxIdx = 0;
for (let i = 1; i < res.samples.length; i++) {
  const dI = Math.abs(res.samples[i].io - res.samples[i - 1].io);
  if (dI > maxDeltaI) {
    maxDeltaI = dI;
    maxIdx = i;
  }
}

console.log('Max dI:', maxDeltaI, 'at sample', maxIdx);
console.log('Sample[idx-1]:', res.samples[maxIdx - 1].time, res.samples[maxIdx - 1].io);
console.log('Sample[idx]:', res.samples[maxIdx].time, res.samples[maxIdx].io);
