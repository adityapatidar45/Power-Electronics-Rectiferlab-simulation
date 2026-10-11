import {
  TopologyId,
  SourceParameters,
  LoadParameters,
  DeviceModelParameters,
  SimulationControlParameters,
  SimulationResult,
  TimeSample,
  SwitchingMarker,
  NumericalResults,
  DeviceState,
} from '../types';
import {
  computeAverage,
  computeRms,
  computeFormAndRippleFactor,
  computeHarmonics,
  solveExtinctionAngleBeta,
} from './math';

/**
 * Step differential equation: di/dt = (vo - R*i - E) / L
 */
export function stepRLE(
  io: number,
  vo: number,
  R: number,
  L: number,
  E: number,
  dt: number
): number {
  if (L <= 1e-7) {
    return Math.max(0, (vo - E) / Math.max(R, 1e-4));
  }
  const f = (i: number, v: number) => (v - R * i - E) / L;
  const k1 = f(io, vo);
  const k2 = f(io + 0.5 * dt * k1, vo);
  const k3 = f(io + 0.5 * dt * k2, vo);
  const k4 = f(io + dt * k3, vo);
  const nextIo = io + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
  return Math.max(0, nextIo);
}

export function runSimulation(
  topologyId: TopologyId,
  source: SourceParameters,
  load: LoadParameters,
  deviceModel: DeviceModelParameters,
  control: SimulationControlParameters
): SimulationResult {
  const f = Math.max(1, source.frequency);
  const T = 1 / f;
  const omega = 2 * Math.PI * f;

  const isLineToLine = source.voltageConvention !== 'PHASE_TO_NEUTRAL';
  let Vm_ph: number;
  let Vm_LL: number;

  if (topologyId.startsWith('3ph')) {
    if (isLineToLine) {
      const Vrms_LL = source.vRms;
      Vm_LL = source.voltageType === 'PEAK' ? source.vRms : Vrms_LL * Math.SQRT2;
      Vm_ph = Vm_LL / Math.sqrt(3);
    } else {
      const Vrms_ph = source.vRms;
      Vm_ph = source.voltageType === 'PEAK' ? source.vRms : Vrms_ph * Math.SQRT2;
      Vm_LL = Vm_ph * Math.sqrt(3);
    }
  } else {
    Vm_ph = source.voltageType === 'PEAK' ? source.vRms : source.vRms * Math.SQRT2;
    Vm_LL = Vm_ph;
  }

  const alphaDeg = control.firingAngleAlphaDeg;
  const alphaRad = (alphaDeg * Math.PI) / 180;
  const numCycles = Math.max(1, control.simulationDurationCycles);
  const samplesPerCycle = Math.max(500, control.samplesPerCycle);
  const totalSamples = samplesPerCycle * numCycles;
  const dt = T / samplesPerCycle;

  const R = Math.max(0.01, load.resistanceR);
  const L = Math.max(0, load.inductanceL);
  const E = Math.max(0, load.backEmfE);
  const Ls = Math.max(0, source.sourceInductanceLs);
  const Rs = Math.max(0, source.sourceResistanceRs);
  const hasFWD = load.freewheelingDiode;

  const VF_diode = deviceModel.isIdeal ? 0 : deviceModel.diodeForwardDrop;
  const VF_scr = deviceModel.isIdeal ? 0 : deviceModel.thyristorForwardDrop;

  // Pre-calculate extinction angle beta for single-phase controlled rectifiers with RL load
  let calculatedBetaDeg: number | null = null;
  let isContinuousMode = true;

  if (topologyId === '1ph-hw-diode' || topologyId === '1ph-hw-controlled' || topologyId === '1ph-bridge-controlled') {
    if (L > 1e-5 && !hasFWD) {
      const firingRad = topologyId === '1ph-hw-diode' ? 0 : alphaRad;
      const betaSol = solveExtinctionAngleBeta(firingRad, R + Rs, L, omega, Vm_ph, E);
      calculatedBetaDeg = (betaSol.betaRad * 180) / Math.PI;
      isContinuousMode = betaSol.isContinuous;
    } else if (hasFWD) {
      isContinuousMode = true;
      calculatedBetaDeg = null;
    } else if (L <= 1e-5) {
      isContinuousMode = false;
      calculatedBetaDeg = 180;
    }
  }

  // Steady-state periodic solver: run warmup cycles to reach cyclic equilibrium
  const settlingCycles = control.startupTransient ? 0 : 25;
  let settledCurrent = 0;

  if (settlingCycles > 0 && load.loadType !== 'CURRENT_SOURCE') {
    const settleTotalSamples = samplesPerCycle * settlingCycles;
    for (let s = 0; s < settleTotalSamples; s++) {
      const t = s * dt;
      const angleRad = (omega * t) % (2 * Math.PI);
      const angleDeg = (angleRad * 180) / Math.PI;
      const voRaw = calculateInstantaneousVoltage(
        topologyId,
        angleRad,
        angleDeg,
        Vm_ph,
        Vm_LL,
        alphaDeg,
        hasFWD,
        settledCurrent,
        isContinuousMode,
        calculatedBetaDeg
      );
      settledCurrent = stepRLE(settledCurrent, voRaw, R + Rs, L, E, dt);
      if (!isContinuousMode && calculatedBetaDeg !== null && angleDeg >= (calculatedBetaDeg % 180) && angleDeg < alphaDeg) {
        settledCurrent = 0;
      }
    }
  }

  const samples: TimeSample[] = [];
  const markers: SwitchingMarker[] = [];
  const timeVector: number[] = [];
  let currentIo = load.loadType === 'CURRENT_SOURCE' ? load.idc : settledCurrent;
  let prevIo = currentIo;

  const devicePeakMap: Record<string, { current: number; piv: number }> = {};
  const deviceSumMap: Record<string, { sumI: number; sumISq: number; countCond: number }> = {};

  const initDeviceTrack = (id: string) => {
    devicePeakMap[id] = { current: 0, piv: 0 };
    deviceSumMap[id] = { sumI: 0, sumISq: 0, countCond: 0 };
  };

  const deviceIds = getTopologyDeviceList(topologyId, hasFWD);
  deviceIds.forEach(initDeviceTrack);

  let overlapAngleMuDeg = 0;
  if (Ls > 1e-6 && currentIo > 0.01) {
    if (topologyId === '1ph-bridge-diode' || topologyId === '1ph-bridge-controlled') {
      const cosMu = 1 - (2 * omega * Ls * currentIo) / Vm_ph;
      if (cosMu >= -1 && cosMu <= 1) {
        overlapAngleMuDeg = (Math.acos(cosMu) * 180) / Math.PI;
      }
    } else if (topologyId === '3ph-bridge-diode' || topologyId === '3ph-bridge-controlled') {
      const cosMu = 1 - (2 * omega * Ls * currentIo) / (Math.sqrt(3) * Vm_ph);
      if (cosMu >= -1 && cosMu <= 1) {
        overlapAngleMuDeg = (Math.acos(cosMu) * 180) / Math.PI;
      }
    }
  }

  for (let step = 0; step < totalSamples; step++) {
    const t = step * dt;
    timeVector.push(t);
    const totalAngleDeg = (360 * f * t) % 360;
    const cycleAngleRad = (omega * t) % (2 * Math.PI);

    let vs = Vm_ph * Math.sin(cycleAngleRad);
    let vsb = 0;
    let vsc = 0;
    let vab = 0;
    let vbc = 0;
    let vca = 0;

    if (topologyId.startsWith('3ph')) {
      const shiftB = source.phaseSequence === 'ACB' ? (2 * Math.PI) / 3 : -(2 * Math.PI) / 3;
      const shiftC = source.phaseSequence === 'ACB' ? -(2 * Math.PI) / 3 : (2 * Math.PI) / 3;

      vsb = Vm_ph * Math.sin(cycleAngleRad + shiftB);
      vsc = Vm_ph * Math.sin(cycleAngleRad + shiftC);

      vab = vs - vsb;
      vbc = vsb - vsc;
      vca = vsc - vs;
    }

    const instantState = evaluateTopologyInstant(
      topologyId,
      cycleAngleRad,
      totalAngleDeg,
      vs,
      vsb,
      vsc,
      vab,
      vbc,
      vca,
      Vm_ph,
      Vm_LL,
      alphaDeg,
      alphaRad,
      currentIo,
      R,
      L,
      E,
      hasFWD,
      load.loadType,
      load.idc,
      VF_diode,
      VF_scr,
      Ls,
      Rs,
      dt,
      isContinuousMode,
      calculatedBetaDeg
    );

    let vo = instantState.vo;
    let activeDevices = instantState.conductingDevices;
    let gatePulses = instantState.gatePulses;
    let devices = instantState.devices;
    let is = instantState.is;
    let isb = instantState.isb;
    let isc = instantState.isc;

    if (load.loadType === 'CURRENT_SOURCE') {
      currentIo = load.idc;
    } else {
      prevIo = currentIo;
      currentIo = stepRLE(currentIo, vo, R + Rs, L, E, dt);
      if (instantState.forceZeroCurrent) {
        currentIo = 0;
      }
    }

    const vR = currentIo * R;
    const vL = L > 0 && currentIo > 1e-5
      ? (vo - vR - (load.loadType === 'RLE' ? E : 0))
      : 0;

    for (const dId of deviceIds) {
      const dev = devices[dId] || { current: 0, voltage: 0, isConducting: false };
      devicePeakMap[dId].current = Math.max(devicePeakMap[dId].current, dev.current);
      if (dev.voltage < 0) {
        devicePeakMap[dId].piv = Math.max(devicePeakMap[dId].piv, Math.abs(dev.voltage));
      }
      deviceSumMap[dId].sumI += dev.current;
      deviceSumMap[dId].sumISq += dev.current * dev.current;
      if (dev.isConducting) {
        deviceSumMap[dId].countCond++;
      }
    }

    samples.push({
      time: t,
      angleDeg: totalAngleDeg,
      vs,
      vsb,
      vsc,
      vab,
      vbc,
      vca,
      vo,
      vR,
      vL,
      is,
      isb,
      isc,
      io: currentIo,
      gatePulses,
      conductingDevices: activeDevices,
      activePathDescription: instantState.pathDescription,
      devices,
    });
  }

  generateSwitchingMarkers(topologyId, alphaDeg, calculatedBetaDeg, markers, T);

  // Analyze over last full cycle
  const lastCycleSamples = samples.slice(totalSamples - samplesPerCycle);
  const voValues = lastCycleSamples.map(s => s.vo);
  const ioValues = lastCycleSamples.map(s => s.io);
  const isValues = lastCycleSamples.map(s => s.is);
  const vsValues = lastCycleSamples.map(s => s.vs);

  const voAvg = computeAverage(voValues, dt, T);
  const voRms = computeRms(voValues, dt, T);
  const voPeak = Math.max(...voValues);
  const voMin = Math.min(...voValues);
  const voPeakToPeak = voPeak - voMin;
  const { formFactor: voFF, rippleFactor: voRF } = computeFormAndRippleFactor(voRms, voAvg);

  const ioAvg = computeAverage(ioValues, dt, T);
  const ioRms = computeRms(ioValues, dt, T);
  const ioPeak = Math.max(...ioValues);
  const ioMin = Math.min(...ioValues);
  const ioPeakToPeak = ioPeak - ioMin;
  const { rippleFactor: ioRF } = computeFormAndRippleFactor(ioRms, ioAvg);

  const sourceIrms = computeRms(isValues, dt, T);
  const sourceIavg = computeAverage(isValues, dt, T);
  const sourceVrms = computeRms(vsValues, dt, T);
  const sourceVpeak = Math.max(...vsValues.map(Math.abs));

  const instPower = lastCycleSamples.map(s => s.vs * s.is);
  const activePowerP = computeAverage(instPower, dt, T);
  const apparentPowerS = sourceVrms * sourceIrms;
  const reactivePowerQ = Math.sqrt(Math.max(0, apparentPowerS * apparentPowerS - activePowerP * activePowerP));
  const truePowerFactor = apparentPowerS > 1e-4 ? Math.abs(activePowerP / apparentPowerS) : 1;

  const { harmonics: currentHarmonics, thd: thdCurrentPercent } = computeHarmonics(isValues, dt, f, 25);
  const { harmonics: voltageHarmonics, thd: thdVoltagePercent } = computeHarmonics(voValues, dt, f, 25);

  const fundamentalCurrent = currentHarmonics.find(h => h.order === 1);
  const distortionFactor = sourceIrms > 1e-4 && fundamentalCurrent ? fundamentalCurrent.rms / sourceIrms : 1;
  const displacementFactor = distortionFactor > 1e-4 ? truePowerFactor / distortionFactor : 1;

  const resistorPowerLoss = ioRms * ioRms * R;
  const efficiencyPercent = activePowerP > 1e-4 ? Math.min(100, Math.max(0, ((ioAvg * voAvg) / activePowerP) * 100)) : 100;

  let rippleFreqMultiplier = 2;
  if (topologyId === '1ph-hw-diode' || topologyId === '1ph-hw-controlled') {
    rippleFreqMultiplier = 1;
  } else if (topologyId === '3ph-hw-diode' || topologyId === '3ph-hw-controlled') {
    rippleFreqMultiplier = 3;
  } else if (topologyId === '3ph-bridge-diode' || topologyId === '3ph-bridge-controlled' || topologyId === '3ph-semi-controlled') {
    rippleFreqMultiplier = 6;
  }
  const voRippleFrequency = f * rippleFreqMultiplier;

  const devicesResult: Record<string, DeviceState> = {};
  for (const dId of deviceIds) {
    const pk = devicePeakMap[dId];
    const sm = deviceSumMap[dId];
    const N = samples.length;
    devicesResult[dId] = {
      id: dId,
      name: dId,
      isConducting: false,
      current: 0,
      voltage: 0,
      piv: pk.piv,
      avgCurrent: sm.sumI / N,
      rmsCurrent: Math.sqrt(sm.sumISq / N),
      peakCurrent: pk.current,
      conductionAngleDeg: (sm.countCond / N) * 360,
    };
  }

  const theoretical = computeTheoreticalValues(
    topologyId,
    Vm_ph,
    Vm_LL,
    sourceVrms,
    alphaRad,
    alphaDeg,
    R,
    hasFWD,
    calculatedBetaDeg,
    isContinuousMode
  );

  const voAvgPercentError = theoretical.voAvg !== null && Math.abs(theoretical.voAvg) > 0.1
    ? (Math.abs(voAvg - theoretical.voAvg) / Math.abs(theoretical.voAvg)) * 100
    : null;

  const voRmsPercentError = theoretical.voRms !== null && Math.abs(theoretical.voRms) > 0.1
    ? (Math.abs(voRms - theoretical.voRms) / Math.abs(theoretical.voRms)) * 100
    : null;

  const results: NumericalResults = {
    sourceVrms,
    sourceVpeak,
    sourceFrequency: f,
    sourcePeriod: T,
    sourceIrms,
    sourceIavg,
    voAvg,
    voRms,
    voPeak,
    voMin,
    voPeakToPeakRipple: voPeakToPeak,
    voRippleFactor: voRF,
    voFormFactor: voFF,
    voRippleFrequency,
    ioAvg,
    ioRms,
    ioPeak,
    ioMin,
    ioPeakToPeakRipple: ioPeakToPeak,
    ioRippleFactor: ioRF,
    activePowerP,
    apparentPowerS,
    reactivePowerQ,
    truePowerFactor: Math.min(1, truePowerFactor),
    displacementFactor: Math.min(1, Math.max(0, displacementFactor)),
    distortionFactor: Math.min(1, Math.max(0, distortionFactor)),
    thdCurrentPercent,
    thdVoltagePercent,
    resistorPowerLoss,
    efficiencyPercent,
    firingAngleAlphaDeg: alphaDeg,
    extinctionAngleBetaDeg: isContinuousMode ? null : calculatedBetaDeg,
    conductionAngleGammaDeg: isContinuousMode ? 180 : (calculatedBetaDeg !== null ? calculatedBetaDeg - alphaDeg : 180),
    conductionMode: isContinuousMode ? 'CONTINUOUS' : 'DISCONTINUOUS',
    overlapAngleMuDeg,
    theoretical,
    errors: {
      voAvgPercentError,
      voRmsPercentError,
    },
    devices: devicesResult,
    currentHarmonics,
    voltageHarmonics,
  };

  return {
    topologyId,
    samples,
    markers,
    results,
    timeVector,
    basePeriod: T,
    conductionSequence: getConductionSequenceLabels(topologyId),
  };
}

function calculateInstantaneousVoltage(
  topologyId: TopologyId,
  angleRad: number,
  angleDeg: number,
  Vm_ph: number,
  Vm_LL: number,
  alphaDeg: number,
  hasFWD: boolean,
  currentIo: number,
  isContinuousMode: boolean,
  calculatedBetaDeg: number | null
): number {
  const sin = Math.sin(angleRad);
  switch (topologyId) {
    case '1ph-hw-diode':
      if (angleDeg < 180) return Vm_ph * sin;
      if (hasFWD) return 0;
      if (currentIo > 0.001) return Vm_ph * sin;
      return 0;

    case '1ph-hw-controlled': {
      if (angleDeg >= alphaDeg && angleDeg < 180) return Vm_ph * sin;
      if (angleDeg >= 180) {
        if (hasFWD) return 0;
        if (currentIo > 0.001) return Vm_ph * sin;
      }
      return 0;
    }

    case '1ph-bridge-diode':
    case '1ph-ct-diode':
      return Math.abs(Vm_ph * sin);

    case '1ph-bridge-controlled': {
      const relDeg = angleDeg % 180;
      if (relDeg >= alphaDeg) {
        const sign = angleDeg < 180 ? 1 : -1;
        return sign * Vm_ph * sin;
      } else {
        if (hasFWD) return 0;
        if (isContinuousMode || currentIo > 0.001) {
          const sign = angleDeg < 180 ? -1 : 1;
          return sign * Vm_ph * sin;
        }
        return 0;
      }
    }

    case '1ph-semi-controlled': {
      const relDeg = angleDeg % 180;
      if (relDeg >= alphaDeg && relDeg < 180) {
        return Math.abs(Vm_ph * sin);
      }
      return 0;
    }

    case '3ph-bridge-diode': {
      const van = Vm_ph * Math.sin(angleRad);
      const vbn = Vm_ph * Math.sin(angleRad - (2 * Math.PI) / 3);
      const vcn = Vm_ph * Math.sin(angleRad + (2 * Math.PI) / 3);
      return Math.max(van, vbn, vcn) - Math.min(van, vbn, vcn);
    }

    case '3ph-bridge-controlled': {
      const thetaRef = (angleDeg - 30 - alphaDeg + 3600) % 360;
      const sector = Math.floor(thetaRef / 60);
      const van = Vm_ph * Math.sin(angleRad);
      const vbn = Vm_ph * Math.sin(angleRad - (2 * Math.PI) / 3);
      const vcn = Vm_ph * Math.sin(angleRad + (2 * Math.PI) / 3);
      const vab = van - vbn;
      const vbc = vbn - vcn;
      const vca = vcn - van;
      switch (sector) {
        case 0: return vab;
        case 1: return -vca;
        case 2: return vbc;
        case 3: return -vab;
        case 4: return vca;
        case 5: return -vbc;
        default: return vab;
      }
    }

    default:
      return Math.abs(Vm_ph * sin);
  }
}

function evaluateTopologyInstant(
  topologyId: TopologyId,
  cycleAngleRad: number,
  totalAngleDeg: number,
  vs: number,
  vsb: number,
  vsc: number,
  vab: number,
  vbc: number,
  vca: number,
  Vm_ph: number,
  Vm_LL: number,
  alphaDeg: number,
  alphaRad: number,
  currentIo: number,
  R: number,
  L: number,
  E: number,
  hasFWD: boolean,
  loadType: string,
  idc: number,
  VF_diode: number,
  VF_scr: number,
  Ls: number,
  Rs: number,
  dt: number,
  isContinuousMode: boolean,
  calculatedBetaDeg: number | null
) {
  let vo = 0;
  let is = 0;
  let isb = 0;
  let isc = 0;
  const conductingDevices: string[] = [];
  const gatePulses: Record<string, number> = {};
  const devices: Record<string, { current: number; voltage: number; isConducting: boolean }> = {};
  let pathDescription = '';
  let forceZeroCurrent = false;

  const angleDeg = totalAngleDeg;

  switch (topologyId) {
    case '1ph-hw-diode': {
      const isPositiveHalf = angleDeg < 180;
      let d1Conducting = false;
      let fwdConducting = false;

      if (isPositiveHalf && vs > E) {
        d1Conducting = true;
        vo = vs - VF_diode;
        is = currentIo;
        conductingDevices.push('D1');
        pathDescription = 'AC Source (+) → D1 → Load (R/RL) → AC Source (-)';
      } else if (hasFWD && currentIo > 0.001) {
        fwdConducting = true;
        vo = -VF_diode;
        is = 0;
        conductingDevices.push('FWD');
        pathDescription = 'Freewheeling Diode (FWD) clamps output, load current freewheels';
      } else if (!hasFWD && currentIo > 0.001 && L > 1e-4) {
        d1Conducting = true;
        vo = vs - VF_diode;
        is = currentIo;
        conductingDevices.push('D1');
        pathDescription = 'Inductor stored energy holds D1 conducting during negative AC voltage';
      } else {
        vo = E;
        is = 0;
        forceZeroCurrent = true;
        pathDescription = 'Circuit OFF (No conduction)';
      }

      devices['D1'] = {
        isConducting: d1Conducting,
        current: d1Conducting ? currentIo : 0,
        voltage: d1Conducting ? VF_diode : vs - vo,
      };
      if (hasFWD) {
        devices['FWD'] = {
          isConducting: fwdConducting,
          current: fwdConducting ? currentIo : 0,
          voltage: fwdConducting ? -VF_diode : -vo,
        };
      }
      break;
    }

    case '1ph-hw-controlled': {
      gatePulses['T1'] = (angleDeg >= alphaDeg && angleDeg <= alphaDeg + 15) ? 1 : 0;
      let t1Conducting = false;
      let fwdConducting = false;

      const isAfterFiring = angleDeg >= alphaDeg && angleDeg < 180;
      if (isAfterFiring && vs > E) {
        t1Conducting = true;
        vo = vs - VF_scr;
        is = currentIo;
        conductingDevices.push('T1');
        pathDescription = 'Thyristor T1 Triggered: Source (+) → T1 → Load → Source (-)';
      } else if (angleDeg >= 180 && hasFWD && currentIo > 0.001) {
        fwdConducting = true;
        vo = -VF_diode;
        is = 0;
        conductingDevices.push('FWD');
        pathDescription = 'FWD conducting: T1 commutated off, load current freewheels';
      } else if (angleDeg >= 180 && !hasFWD && currentIo > 0.001 && L > 1e-4) {
        t1Conducting = true;
        vo = vs - VF_scr;
        is = currentIo;
        conductingDevices.push('T1');
        pathDescription = 'Inductive current holds T1 conducting (Negative DC voltage)';
      } else {
        vo = E;
        is = 0;
        forceZeroCurrent = true;
        pathDescription = 'Blocking: T1 OFF, current zero';
      }

      devices['T1'] = {
        isConducting: t1Conducting,
        current: t1Conducting ? currentIo : 0,
        voltage: t1Conducting ? VF_scr : vs - vo,
      };
      if (hasFWD) {
        devices['FWD'] = {
          isConducting: fwdConducting,
          current: fwdConducting ? currentIo : 0,
          voltage: fwdConducting ? -VF_diode : -vo,
        };
      }
      break;
    }

    case '1ph-ct-diode': {
      const isD1Pos = angleDeg < 180;
      let d1Conducting = false;
      let d2Conducting = false;

      if (isD1Pos && vs > E) {
        d1Conducting = true;
        vo = vs - VF_diode;
        is = currentIo;
        conductingDevices.push('D1');
        pathDescription = 'Center Tap Upper Half: Source (+) → D1 → Load → Center Tap (N)';
      } else if (!isD1Pos && -vs > E) {
        d2Conducting = true;
        vo = -vs - VF_diode;
        is = -currentIo;
        conductingDevices.push('D2');
        pathDescription = 'Center Tap Lower Half: Source (-) → D2 → Load → Center Tap (N)';
      } else {
        vo = E;
        is = 0;
        if (currentIo <= 0.001) forceZeroCurrent = true;
        pathDescription = 'No conduction (Below back-EMF)';
      }

      devices['D1'] = {
        isConducting: d1Conducting,
        current: d1Conducting ? currentIo : 0,
        voltage: d1Conducting ? VF_diode : vs - vo,
      };
      devices['D2'] = {
        isConducting: d2Conducting,
        current: d2Conducting ? currentIo : 0,
        voltage: d2Conducting ? VF_diode : -vs - vo,
      };
      break;
    }

    case '1ph-bridge-diode': {
      const isPos = angleDeg < 180;
      let d1d4 = false;
      let d2d3 = false;

      if (isPos) {
        d1d4 = true;
        vo = Math.abs(vs) - 2 * VF_diode;
        is = currentIo;
        conductingDevices.push('D1', 'D4');
        pathDescription = 'Positive Half Cycle: Source (+) → D1 → Load → D4 → Source (-)';
      } else {
        d2d3 = true;
        vo = Math.abs(vs) - 2 * VF_diode;
        is = -currentIo;
        conductingDevices.push('D2', 'D3');
        pathDescription = 'Negative Half Cycle: Source (-) → D3 → Load → D2 → Source (+)';
      }

      if (E > 0 && vo < E && currentIo <= 0.001) {
        vo = E;
        d1d4 = false;
        d2d3 = false;
        forceZeroCurrent = true;
        conductingDevices.length = 0;
        pathDescription = 'Diode Bridge Blocking (vo below Back-EMF E)';
      }

      devices['D1'] = { isConducting: d1d4, current: d1d4 ? currentIo : 0, voltage: d1d4 ? VF_diode : -vo / 2 };
      devices['D4'] = { isConducting: d1d4, current: d1d4 ? currentIo : 0, voltage: d1d4 ? VF_diode : -vo / 2 };
      devices['D2'] = { isConducting: d2d3, current: d2d3 ? currentIo : 0, voltage: d2d3 ? VF_diode : -vo / 2 };
      devices['D3'] = { isConducting: d2d3, current: d2d3 ? currentIo : 0, voltage: d2d3 ? VF_diode : -vo / 2 };
      break;
    }

    case '1ph-bridge-controlled': {
      gatePulses['T1'] = (angleDeg >= alphaDeg && angleDeg <= alphaDeg + 15) ? 1 : 0;
      gatePulses['T4'] = gatePulses['T1'];
      gatePulses['T2'] = (angleDeg >= 180 + alphaDeg && angleDeg <= 180 + alphaDeg + 15) ? 1 : 0;
      gatePulses['T3'] = gatePulses['T2'];

      let t1t4 = false;
      let t2t3 = false;
      let fwd = false;

      const inPair1Interval = angleDeg >= alphaDeg && angleDeg < 180 + alphaDeg;

      if (inPair1Interval) {
        if (angleDeg < 180) {
          t1t4 = true;
          vo = vs - 2 * VF_scr;
          is = currentIo;
          conductingDevices.push('T1', 'T4');
          pathDescription = 'T1, T4 Conducting: Source (+) → T1 → Load → T4 → Source (-)';
        } else {
          // Angle in [180, 180 + alpha]: vs is negative!
          if (hasFWD) {
            fwd = true;
            vo = -VF_diode;
            is = 0;
            conductingDevices.push('FWD');
            pathDescription = 'Freewheeling interval [180°, 180°+α]: FWD clamps output to 0V';
          } else if (isContinuousMode || currentIo > 0.001) {
            t1t4 = true;
            vo = vs - 2 * VF_scr;
            is = currentIo;
            conductingDevices.push('T1', 'T4');
            pathDescription = 'T1, T4 persist past 180°: Output voltage NEGATIVE (Inductor returns energy to AC source)';
          } else {
            vo = E;
            is = 0;
            forceZeroCurrent = true;
            pathDescription = 'Discontinuous Mode: Current zero until T2, T3 firing at 180°+α';
          }
        }
      } else {
        // Pair 2 interval: [180+alpha, 360] and [0, alpha]
        if (angleDeg >= 180 + alphaDeg) {
          t2t3 = true;
          vo = -vs - 2 * VF_scr;
          is = -currentIo;
          conductingDevices.push('T2', 'T3');
          pathDescription = 'T2, T3 Conducting: Source (-) → T3 → Load → T2 → Source (+)';
        } else {
          // [0, alpha]
          if (hasFWD) {
            fwd = true;
            vo = -VF_diode;
            is = 0;
            conductingDevices.push('FWD');
            pathDescription = 'Freewheeling interval [0°, α]: FWD conducts, vo = 0V';
          } else if (isContinuousMode || currentIo > 0.001) {
            t2t3 = true;
            vo = -vs - 2 * VF_scr;
            is = -currentIo;
            conductingDevices.push('T2', 'T3');
            pathDescription = 'T2, T3 persist past 360°: Inductive current holds pair conducting';
          } else {
            vo = E;
            is = 0;
            forceZeroCurrent = true;
            pathDescription = 'Discontinuous Mode: Current zero until T1, T4 firing at α';
          }
        }
      }

      devices['T1'] = { isConducting: t1t4, current: t1t4 ? currentIo : 0, voltage: t1t4 ? VF_scr : -vo / 2 };
      devices['T4'] = { isConducting: t1t4, current: t1t4 ? currentIo : 0, voltage: t1t4 ? VF_scr : -vo / 2 };
      devices['T2'] = { isConducting: t2t3, current: t2t3 ? currentIo : 0, voltage: t2t3 ? VF_scr : -vo / 2 };
      devices['T3'] = { isConducting: t2t3, current: t2t3 ? currentIo : 0, voltage: t2t3 ? VF_scr : -vo / 2 };
      if (hasFWD) {
        devices['FWD'] = { isConducting: fwd, current: fwd ? currentIo : 0, voltage: fwd ? -VF_diode : -vo };
      }
      break;
    }

    case '1ph-semi-controlled': {
      gatePulses['T1'] = (angleDeg >= alphaDeg && angleDeg <= alphaDeg + 15) ? 1 : 0;
      gatePulses['T2'] = (angleDeg >= 180 + alphaDeg && angleDeg <= 180 + alphaDeg + 15) ? 1 : 0;

      let t1d4 = false;
      let t2d3 = false;
      let fwPair = false;

      if (angleDeg >= alphaDeg && angleDeg < 180) {
        t1d4 = true;
        vo = vs - VF_scr - VF_diode;
        is = currentIo;
        conductingDevices.push('T1', 'D4');
        pathDescription = 'T1 & D4 Conducting: Source (+) → T1 → Load → D4 → Source (-)';
      } else if (angleDeg >= 180 && angleDeg < 180 + alphaDeg) {
        fwPair = true;
        vo = -(VF_scr + VF_diode);
        is = 0;
        conductingDevices.push('T1', 'D2');
        pathDescription = 'Inherent Freewheeling: T1 and D2 conduct in same leg, clamping output to ~0V';
      } else if (angleDeg >= 180 + alphaDeg && angleDeg < 360) {
        t2d3 = true;
        vo = -vs - VF_scr - VF_diode;
        is = -currentIo;
        conductingDevices.push('T2', 'D3');
        pathDescription = 'T2 & D3 Conducting: Source (-) → T2 → Load → D3 → Source (+)';
      } else {
        fwPair = true;
        vo = -(VF_scr + VF_diode);
        is = 0;
        conductingDevices.push('T2', 'D4');
        pathDescription = 'Inherent Freewheeling: T2 and D4 conduct, clamping output to ~0V';
      }

      devices['T1'] = { isConducting: t1d4 || (fwPair && angleDeg >= 180), current: (t1d4 || (fwPair && angleDeg >= 180)) ? currentIo : 0, voltage: VF_scr };
      devices['D4'] = { isConducting: t1d4 || (fwPair && angleDeg < alphaDeg), current: (t1d4 || (fwPair && angleDeg < alphaDeg)) ? currentIo : 0, voltage: VF_diode };
      devices['T2'] = { isConducting: t2d3 || (fwPair && angleDeg < alphaDeg), current: (t2d3 || (fwPair && angleDeg < alphaDeg)) ? currentIo : 0, voltage: VF_scr };
      devices['D3'] = { isConducting: t2d3, current: t2d3 ? currentIo : 0, voltage: VF_diode };
      devices['D2'] = { isConducting: fwPair && angleDeg >= 180, current: (fwPair && angleDeg >= 180) ? currentIo : 0, voltage: VF_diode };
      break;
    }

    case '3ph-bridge-diode': {
      const van = vs;
      const vbn = vsb;
      const vcn = vsc;

      let topPhase = 'A';
      let maxV = van;
      if (vbn > maxV) { maxV = vbn; topPhase = 'B'; }
      if (vcn > maxV) { maxV = vcn; topPhase = 'C'; }

      let botPhase = 'A';
      let minV = van;
      if (vbn < minV) { minV = vbn; botPhase = 'B'; }
      if (vcn < minV) { minV = vcn; botPhase = 'C'; }

      const topDiode = topPhase === 'A' ? 'D1' : (topPhase === 'B' ? 'D3' : 'D5');
      const botDiode = botPhase === 'A' ? 'D4' : (botPhase === 'B' ? 'D6' : 'D2');

      vo = Math.max(0, maxV - minV - 2 * VF_diode);
      conductingDevices.push(topDiode, botDiode);
      pathDescription = `6-Pulse Conduction: Phase ${topPhase} (${topDiode}) → Load → Phase ${botPhase} (${botDiode})`;

      is = (topPhase === 'A' ? currentIo : 0) - (botPhase === 'A' ? currentIo : 0);
      isb = (topPhase === 'B' ? currentIo : 0) - (botPhase === 'B' ? currentIo : 0);
      isc = (topPhase === 'C' ? currentIo : 0) - (botPhase === 'C' ? currentIo : 0);

      ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'].forEach(d => {
        const isCond = d === topDiode || d === botDiode;
        devices[d] = {
          isConducting: isCond,
          current: isCond ? currentIo : 0,
          voltage: isCond ? VF_diode : -vo / 2,
        };
      });
      break;
    }

    case '3ph-bridge-controlled': {
      const thetaRef = (totalAngleDeg - 30 - alphaDeg + 3600) % 360;
      const sector = Math.floor(thetaRef / 60);

      let topT = 'T1';
      let botT = 'T6';
      let lineV = vab;
      let pTop = 'A';
      let pBot = 'B';

      switch (sector) {
        case 0: topT = 'T1'; botT = 'T6'; lineV = vab; pTop = 'A'; pBot = 'B'; break;
        case 1: topT = 'T1'; botT = 'T2'; lineV = -vca; pTop = 'A'; pBot = 'C'; break;
        case 2: topT = 'T3'; botT = 'T2'; lineV = vbc; pTop = 'B'; pBot = 'C'; break;
        case 3: topT = 'T3'; botT = 'T4'; lineV = -vab; pTop = 'B'; pBot = 'A'; break;
        case 4: topT = 'T5'; botT = 'T4'; lineV = vca; pTop = 'C'; pBot = 'A'; break;
        case 5: topT = 'T5'; botT = 'T6'; lineV = -vbc; pTop = 'C'; pBot = 'B'; break;
      }

      gatePulses[topT] = 1;
      gatePulses[botT] = 1;

      if (lineV < 0 && !hasFWD && (isContinuousMode || currentIo > 0.001)) {
        vo = lineV - 2 * VF_scr;
        conductingDevices.push(topT, botT);
        pathDescription = `SCR Pair (${topT}, ${botT}) Conducting: Output voltage goes negative into inversion interval`;
      } else if (lineV < 0 && hasFWD) {
        vo = 0;
        conductingDevices.push('FWD');
        pathDescription = `Freewheeling Diode clamps output to 0V during negative segment`;
      } else if (lineV >= 0) {
        vo = lineV - 2 * VF_scr;
        conductingDevices.push(topT, botT);
        pathDescription = `SCR Pair (${topT}, ${botT}) Active: Phase ${pTop} → Load → Phase ${pBot}`;
      } else {
        vo = E;
        forceZeroCurrent = true;
        pathDescription = 'Discontinuous Mode: No conduction until next firing instant';
      }

      is = (pTop === 'A' ? currentIo : 0) - (pBot === 'A' ? currentIo : 0);
      isb = (pTop === 'B' ? currentIo : 0) - (pBot === 'B' ? currentIo : 0);
      isc = (pTop === 'C' ? currentIo : 0) - (pBot === 'C' ? currentIo : 0);

      ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'].forEach(t => {
        const isCond = t === topT || t === botT;
        devices[t] = {
          isConducting: isCond,
          current: isCond ? currentIo : 0,
          voltage: isCond ? VF_scr : -vo / 2,
        };
      });
      if (hasFWD) {
        devices['FWD'] = {
          isConducting: conductingDevices.includes('FWD'),
          current: conductingDevices.includes('FWD') ? currentIo : 0,
          voltage: conductingDevices.includes('FWD') ? -VF_diode : -vo,
        };
      }
      break;
    }

    case '3ph-semi-controlled': {
      const van = vs;
      const vbn = vsb;
      const vcn = vsc;

      let botD = 'D4';
      let pBot = 'A';
      if (vbn < van && vbn < vcn) { botD = 'D6'; pBot = 'B'; }
      else if (vcn < van && vcn < vbn) { botD = 'D2'; pBot = 'C'; }

      const thetaRef = (totalAngleDeg + 30 - alphaDeg + 3600) % 360;
      const sector = Math.floor(thetaRef / 120);
      const topT = sector === 0 ? 'T1' : (sector === 1 ? 'T3' : 'T5');
      const pTop = sector === 0 ? 'A' : (sector === 1 ? 'B' : 'C');

      const vPhTop = pTop === 'A' ? van : (pTop === 'B' ? vbn : vcn);
      const vPhBot = pBot === 'A' ? van : (pBot === 'B' ? vbn : vcn);
      const rawVo = vPhTop - vPhBot;

      if (rawVo > 0) {
        vo = rawVo - VF_scr - VF_diode;
        conductingDevices.push(topT, botD);
        pathDescription = `Semi-Converter: SCR ${topT} & Diode ${botD} conducting`;
      } else {
        vo = -(VF_scr + VF_diode);
        conductingDevices.push(topT, botD);
        pathDescription = `Inherent Freewheeling: Output clamped to ~0V`;
      }

      is = (pTop === 'A' ? currentIo : 0) - (pBot === 'A' ? currentIo : 0);
      isb = (pTop === 'B' ? currentIo : 0) - (pBot === 'B' ? currentIo : 0);
      isc = (pTop === 'C' ? currentIo : 0) - (pBot === 'C' ? currentIo : 0);

      ['T1', 'T3', 'T5', 'D2', 'D4', 'D6'].forEach(id => {
        const isCond = conductingDevices.includes(id);
        devices[id] = {
          isConducting: isCond,
          current: isCond ? currentIo : 0,
          voltage: isCond ? (id.startsWith('T') ? VF_scr : VF_diode) : -vo / 2,
        };
      });
      break;
    }

    case '3ph-hw-diode': {
      const van = vs;
      const vbn = vsb;
      const vcn = vsc;

      let topD = 'D1';
      let maxV = van;
      if (vbn > maxV) { maxV = vbn; topD = 'D2'; }
      if (vcn > maxV) { maxV = vcn; topD = 'D3'; }

      vo = Math.max(0, maxV - VF_diode);
      conductingDevices.push(topD);
      pathDescription = `3-Pulse Half-Wave: Diode ${topD} conducting from Star Neutral`;

      is = topD === 'D1' ? currentIo : 0;
      isb = topD === 'D2' ? currentIo : 0;
      isc = topD === 'D3' ? currentIo : 0;

      ['D1', 'D2', 'D3'].forEach(d => {
        const isCond = d === topD;
        devices[d] = {
          isConducting: isCond,
          current: isCond ? currentIo : 0,
          voltage: isCond ? VF_diode : -vo,
        };
      });
      break;
    }

    case '3ph-hw-controlled': {
      const thetaRef = (totalAngleDeg + 30 - alphaDeg + 3600) % 360;
      const sector = Math.floor(thetaRef / 120);
      const topT = sector === 0 ? 'T1' : (sector === 1 ? 'T2' : 'T3');
      const vPh = sector === 0 ? vs : (sector === 1 ? vsb : vsc);

      gatePulses[topT] = 1;
      if (vPh > 0 || currentIo > 0.001) {
        vo = vPh - VF_scr;
        conductingDevices.push(topT);
        pathDescription = `3-Pulse Controlled: SCR ${topT} Triggered at α = ${alphaDeg}°`;
      } else {
        vo = E;
        forceZeroCurrent = true;
        pathDescription = 'Zero Conduction (Extinguished)';
      }

      is = topT === 'T1' ? currentIo : 0;
      isb = topT === 'T2' ? currentIo : 0;
      isc = topT === 'T3' ? currentIo : 0;

      ['T1', 'T2', 'T3'].forEach(t => {
        const isCond = t === topT;
        devices[t] = {
          isConducting: isCond,
          current: isCond ? currentIo : 0,
          voltage: isCond ? VF_scr : -vo,
        };
      });
      break;
    }

    default:
      vo = Math.abs(vs);
      break;
  }

  return {
    vo,
    is,
    isb,
    isc,
    conductingDevices,
    gatePulses,
    devices,
    pathDescription,
    forceZeroCurrent,
  };
}

function getTopologyDeviceList(topologyId: TopologyId, hasFWD: boolean): string[] {
  const list: string[] = [];
  if (topologyId === '1ph-hw-diode') list.push('D1');
  else if (topologyId === '1ph-hw-controlled') list.push('T1');
  else if (topologyId === '1ph-ct-diode') list.push('D1', 'D2');
  else if (topologyId === '1ph-bridge-diode') list.push('D1', 'D2', 'D3', 'D4');
  else if (topologyId === '1ph-bridge-controlled') list.push('T1', 'T2', 'T3', 'T4');
  else if (topologyId === '1ph-semi-controlled') list.push('T1', 'T2', 'D3', 'D4');
  else if (topologyId === '3ph-bridge-diode') list.push('D1', 'D2', 'D3', 'D4', 'D5', 'D6');
  else if (topologyId === '3ph-bridge-controlled') list.push('T1', 'T2', 'T3', 'T4', 'T5', 'T6');
  else if (topologyId === '3ph-semi-controlled') list.push('T1', 'T3', 'T5', 'D2', 'D4', 'D6');
  else if (topologyId === '3ph-hw-diode') list.push('D1', 'D2', 'D3');
  else if (topologyId === '3ph-hw-controlled') list.push('T1', 'T2', 'T3');

  if (hasFWD && !list.includes('FWD')) list.push('FWD');
  return list;
}

function getConductionSequenceLabels(topologyId: TopologyId): string[] {
  switch (topologyId) {
    case '1ph-hw-diode': return ['D1 (0° to π)', 'OFF / FWD (π to 2π)'];
    case '1ph-hw-controlled': return ['T1 (α to β)', 'OFF / FWD (β to 2π+α)'];
    case '1ph-bridge-diode': return ['D1, D4 (0° to 180°)', 'D2, D3 (180° to 360°)'];
    case '1ph-bridge-controlled': return ['T1, T4 (α to 180°+α)', 'T2, T3 (180°+α to 360°+α)'];
    case '1ph-semi-controlled': return ['T1, D4 (α to 180°)', 'Freewheel T1, D2 (180° to 180°+α)', 'T2, D3 (180°+α to 360°)', 'Freewheel T2, D4 (0° to α)'];
    case '3ph-bridge-diode': return ['D1, D6 (30°-90°)', 'D1, D2 (90°-150°)', 'D3, D2 (150°-210°)', 'D3, D4 (210°-270°)', 'D5, D4 (270°-330°)', 'D5, D6 (330°-390°)'];
    case '3ph-bridge-controlled': return ['T1, T6', 'T1, T2', 'T3, T2', 'T3, T4', 'T5, T4', 'T5, T6'];
    default: return ['Normal Conduction'];
  }
}

function generateSwitchingMarkers(
  topologyId: TopologyId,
  alphaDeg: number,
  calculatedBetaDeg: number | null,
  markers: SwitchingMarker[],
  T: number
) {
  markers.push({
    angleDeg: 0,
    timeSec: 0,
    label: '0°',
    type: 'ZERO_CROSSING',
    description: 'Positive AC zero-crossing',
  });
  markers.push({
    angleDeg: 180,
    timeSec: 0.5 * T,
    label: '180° (π)',
    type: 'ZERO_CROSSING',
    description: 'Negative AC zero-crossing',
  });

  if (topologyId.includes('controlled')) {
    markers.push({
      angleDeg: alphaDeg,
      timeSec: (alphaDeg / 360) * T,
      label: `α = ${alphaDeg}°`,
      type: 'FIRING',
      description: 'Thyristor Gate Trigger Instant',
    });
    if (topologyId === '1ph-bridge-controlled') {
      markers.push({
        angleDeg: 180 + alphaDeg,
        timeSec: ((180 + alphaDeg) / 360) * T,
        label: `180°+α`,
        type: 'FIRING',
        description: 'Complementary Thyristor Gate Trigger',
      });
    }
  }

  if (calculatedBetaDeg !== null && calculatedBetaDeg < 360) {
    markers.push({
      angleDeg: calculatedBetaDeg,
      timeSec: (calculatedBetaDeg / 360) * T,
      label: `β = ${Math.round(calculatedBetaDeg)}°`,
      type: 'EXTINCTION',
      description: 'Current Extinction Angle (Zero Current)',
    });
  }
}

function computeTheoreticalValues(
  topologyId: TopologyId,
  Vm_ph: number,
  Vm_LL: number,
  sourceVrms: number,
  alphaRad: number,
  alphaDeg: number,
  R: number,
  hasFWD: boolean,
  calculatedBetaDeg: number | null,
  isContinuousMode: boolean
) {
  let voAvg: number | null = null;
  let voRms: number | null = null;
  let piv: number | null = null;
  let formulaVoAvg = '';
  let assumptions = 'Ideal lossless switches, pure resistive / continuous ripple-free current';

  switch (topologyId) {
    case '1ph-hw-diode':
      if (hasFWD || !calculatedBetaDeg) {
        voAvg = Vm_ph / Math.PI;
        voRms = Vm_ph / 2;
        formulaVoAvg = 'Vm / π';
        assumptions = 'Half-wave diode, resistive or FWD clamped';
      } else {
        const betaRad = (calculatedBetaDeg * Math.PI) / 180;
        voAvg = (Vm_ph / (2 * Math.PI)) * (1 - Math.cos(betaRad));
        formulaVoAvg = '(Vm / 2π) * (1 - cos(β))';
        assumptions = `RL load with extinction angle β = ${Math.round(calculatedBetaDeg)}°`;
      }
      piv = Vm_ph;
      break;

    case '1ph-bridge-diode':
      voAvg = (2 * Vm_ph) / Math.PI;
      voRms = Vm_ph / Math.SQRT2;
      piv = Vm_ph;
      formulaVoAvg = '2 * Vm / π ≈ 0.9003 * Vrms';
      assumptions = 'Full-wave bridge, continuous current, ideal diodes';
      break;

    case '1ph-ct-diode':
      voAvg = (2 * Vm_ph) / Math.PI;
      voRms = Vm_ph / Math.SQRT2;
      piv = 2 * Vm_ph;
      formulaVoAvg = '2 * Vm / π';
      assumptions = 'Center-tapped full-wave, PIV = 2 * Vm';
      break;

    case '1ph-bridge-controlled':
      if (hasFWD) {
        voAvg = (Vm_ph / Math.PI) * (1 + Math.cos(alphaRad));
        formulaVoAvg = '(Vm / π) * (1 + cos(α))';
        assumptions = 'Controlled bridge with freewheeling diode (clamped at π)';
      } else if (isContinuousMode) {
        voAvg = (2 * Vm_ph * Math.cos(alphaRad)) / Math.PI;
        voRms = Vm_ph / Math.SQRT2;
        formulaVoAvg = '(2 * Vm / π) * cos(α)';
        assumptions = 'Continuous Conduction Mode (CCM), ideal thyristors';
      } else if (calculatedBetaDeg) {
        const betaRad = (calculatedBetaDeg * Math.PI) / 180;
        voAvg = (Vm_ph / Math.PI) * (Math.cos(alphaRad) - Math.cos(betaRad));
        formulaVoAvg = '(Vm / π) * [cos(α) - cos(β)]';
        assumptions = `Discontinuous Conduction Mode (DCM) with β = ${Math.round(calculatedBetaDeg)}°`;
      }
      piv = Vm_ph;
      break;

    case '1ph-semi-controlled':
      voAvg = (Vm_ph / Math.PI) * (1 + Math.cos(alphaRad));
      formulaVoAvg = '(Vm / π) * (1 + cos(α))';
      piv = Vm_ph;
      assumptions = 'Semi-converter (half-controlled bridge), inherent freewheeling';
      break;

    case '3ph-bridge-diode':
      voAvg = (3 * Vm_LL) / Math.PI;
      voRms = Vm_LL * Math.sqrt(0.5 + (3 * Math.sqrt(3)) / (4 * Math.PI));
      piv = Vm_LL;
      formulaVoAvg = '(3 * Vm,LL) / π = (3√2 / π) * VLL,rms ≈ 1.3505 * VLL,rms';
      assumptions = '6-Pulse bridge, continuous current, ideal commutation';
      break;

    case '3ph-bridge-controlled':
      if (alphaDeg <= 60 || isContinuousMode) {
        voAvg = ((3 * Vm_LL) / Math.PI) * Math.cos(alphaRad);
        formulaVoAvg = '((3 * Vm,LL) / π) * cos(α) ≈ 1.35 * VLL,rms * cos(α)';
        assumptions = '3-Phase 6-pulse fully controlled, continuous current';
      } else {
        voAvg = ((3 * Vm_LL) / Math.PI) * (1 + Math.cos(alphaRad + Math.PI / 3));
        formulaVoAvg = '((3 * Vm,LL) / π) * [1 + cos(α + π/3)]';
        assumptions = '3-Phase 6-pulse, discontinuous R load (α > 60°)';
      }
      piv = Vm_LL;
      break;

    case '3ph-semi-controlled':
      voAvg = ((3 * Vm_LL) / (2 * Math.PI)) * (1 + Math.cos(alphaRad));
      formulaVoAvg = '(3 * Vm,LL / 2π) * (1 + cos(α))';
      piv = Vm_LL;
      assumptions = '3-Phase semi-controlled converter (3 SCR + 3 Diode)';
      break;

    case '3ph-hw-diode':
      voAvg = (3 * Math.sqrt(3) * Vm_ph) / (2 * Math.PI);
      formulaVoAvg = '(3√3 * Vm,ph) / (2π) ≈ 0.827 * Vm,ph = 1.17 * Vph,rms';
      piv = Math.sqrt(3) * Vm_ph;
      assumptions = '3-Phase half-wave 3-pulse diode rectifier';
      break;

    case '3ph-hw-controlled':
      voAvg = ((3 * Math.sqrt(3) * Vm_ph) / (2 * Math.PI)) * Math.cos(alphaRad);
      formulaVoAvg = '((3√3 * Vm,ph) / 2π) * cos(α)';
      piv = Math.sqrt(3) * Vm_ph;
      assumptions = '3-Phase half-wave 3-pulse controlled converter';
      break;
  }

  const ioAvg = voAvg !== null ? voAvg / R : null;
  const ioRms = voRms !== null ? voRms / R : null;

  return {
    voAvg,
    voRms,
    ioAvg,
    ioRms,
    piv,
    formulaVoAvg,
    assumptions,
  };
}
