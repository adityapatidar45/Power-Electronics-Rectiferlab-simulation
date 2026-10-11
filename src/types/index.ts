export type TopologyId =
  | '1ph-hw-diode'
  | '1ph-hw-controlled'
  | '1ph-ct-diode'
  | '1ph-bridge-diode'
  | '1ph-bridge-controlled'
  | '1ph-semi-controlled'
  | '3ph-hw-diode'
  | '3ph-hw-controlled'
  | '3ph-bridge-diode'
  | '3ph-bridge-controlled'
  | '3ph-semi-controlled';

export type LoadType = 'R' | 'RL' | 'RLE' | 'RC' | 'CURRENT_SOURCE';

export interface SourceParameters {
  voltageType: 'RMS' | 'PEAK';
  vRms: number; // Single phase RMS or 3-phase line-to-line RMS
  frequency: number; // Hz
  phaseShiftDeg: number; // deg
  voltageConvention?: 'LINE_TO_LINE' | 'PHASE_TO_NEUTRAL'; // for 3-phase
  phaseSequence?: 'ABC' | 'ACB';
  sourceInductanceLs: number; // Henries (0 for ideal source)
  sourceResistanceRs: number; // Ohms
}

export interface LoadParameters {
  loadType: LoadType;
  resistanceR: number; // Ohms
  inductanceL: number; // Henries
  capacitanceC: number; // Farads
  backEmfE: number; // Volts DC
  idc: number; // Amps (for constant current source load)
  freewheelingDiode: boolean;
}

export interface DeviceModelParameters {
  isIdeal: boolean;
  diodeForwardDrop: number; // Volts, e.g. 0.8V
  thyristorForwardDrop: number; // Volts, e.g. 1.2V
  onResistance: number; // Ohms, e.g. 0.01 ohm
}

export interface SimulationControlParameters {
  firingAngleAlphaDeg: number; // deg, 0-180
  simulationDurationCycles: number; // typically 2 or 3 cycles
  samplesPerCycle: number; // e.g. 1000 samples per cycle for high resolution
  startupTransient: boolean; // false for periodic steady-state
}

export interface DeviceState {
  id: string; // e.g. 'D1', 'T1', 'FWD'
  name: string;
  isConducting: boolean;
  current: number; // Instantaneous Amps
  voltage: number; // Instantaneous Volts
  piv: number; // Peak Inverse Voltage observed over cycle
  avgCurrent: number; // Cycle average current
  rmsCurrent: number; // Cycle RMS current
  peakCurrent: number; // Peak current
  conductionAngleDeg: number; // total conduction angle in degrees
}

export interface SwitchingMarker {
  angleDeg: number;
  timeSec: number;
  label: string;
  type: 'FIRING' | 'EXTINCTION' | 'COMMUTATION' | 'ZERO_CROSSING' | 'FREEWHEELING';
  description: string;
}

export interface TimeSample {
  time: number; // seconds
  angleDeg: number; // degrees (0 to N*360)
  
  // Voltages
  vs: number; // Source voltage (or phase A for 3-phase)
  vsb?: number; // Phase B voltage
  vsc?: number; // Phase C voltage
  vab?: number; // Line AB
  vbc?: number; // Line BC
  vca?: number; // Line CA
  vo: number; // DC output voltage across entire load
  vR: number; // Voltage across resistor
  vL: number; // Voltage across inductor
  vC?: number; // Voltage across capacitor
  
  // Currents
  is: number; // Source AC current (phase A)
  isb?: number; // Phase B current
  isc?: number; // Phase C current
  io: number; // DC load current
  
  // Gate Pulses (0 or 1)
  gatePulses: Record<string, number>;
  
  // Active Conducting Devices
  conductingDevices: string[];
  activePathDescription: string;
  
  // Device Instantaneous Values: id -> { i, v }
  devices: Record<string, { current: number; voltage: number; isConducting: boolean }>;
}

export interface HarmonicComponent {
  order: number; // 0=DC, 1=fundamental, 2, 3...
  frequency: number; // Hz
  magnitude: number; // Peak or RMS
  phaseDeg: number;
  rms: number;
  percentageOfFundamental: number;
}

export interface NumericalResults {
  // Source
  sourceVrms: number;
  sourceVpeak: number;
  sourceFrequency: number;
  sourcePeriod: number;
  sourceIrms: number;
  sourceIavg: number;
  
  // DC Output Voltage
  voAvg: number; // V_dc
  voRms: number;
  voPeak: number;
  voMin: number;
  voPeakToPeakRipple: number;
  voRippleFactor: number;
  voFormFactor: number;
  voRippleFrequency: number;
  
  // DC Load Current
  ioAvg: number; // I_dc
  ioRms: number;
  ioPeak: number;
  ioMin: number;
  ioPeakToPeakRipple: number;
  ioRippleFactor: number;
  
  // Power & PF
  activePowerP: number; // Watts
  apparentPowerS: number; // VA
  reactivePowerQ: number; // VAR
  truePowerFactor: number; // P/S
  displacementFactor: number; // cos(phi_1)
  distortionFactor: number; // I_1,rms / I_total,rms
  thdCurrentPercent: number; // Current THD %
  thdVoltagePercent: number; // Voltage THD %
  resistorPowerLoss: number; // Watts
  efficiencyPercent: number; // Efficiency %
  
  // Controlled Converter Specifics
  firingAngleAlphaDeg: number;
  extinctionAngleBetaDeg?: number | null; // null if CCM
  conductionAngleGammaDeg?: number;
  conductionMode: 'CONTINUOUS' | 'DISCONTINUOUS';
  overlapAngleMuDeg?: number; // Commutation overlap from source inductance
  
  // Theoretical Values for validation
  theoretical: {
    voAvg: number | null;
    voRms: number | null;
    ioAvg: number | null;
    ioRms: number | null;
    piv: number | null;
    formulaVoAvg: string;
    assumptions: string;
  };
  
  // Errors between Simulated and Theoretical
  errors: {
    voAvgPercentError: number | null;
    voRmsPercentError: number | null;
  };
  
  // Devices Stresses
  devices: Record<string, DeviceState>;
  
  // Harmonics (Voltage & Current)
  currentHarmonics: HarmonicComponent[];
  voltageHarmonics: HarmonicComponent[];
}

export interface SimulationResult {
  topologyId: TopologyId;
  samples: TimeSample[];
  markers: SwitchingMarker[];
  results: NumericalResults;
  timeVector: number[];
  basePeriod: number;
  conductionSequence: string[];
}
