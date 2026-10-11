import { TopologyId } from '../types';

export interface Experiment {
  id: string;
  number: number;
  title: string;
  objective: string;
  topologyId: TopologyId;
  defaultPresetId: string;
  theorySummary: string;
  procedure: string[];
  expectedObservations: string[];
  keyEquations: string[];
  discussionQuestions: string[];
}

export const EXPERIMENTS: Experiment[] = [
  {
    id: 'exp-1',
    number: 1,
    title: 'Characteristics of Single-Phase Half-Wave Diode Rectifier with R and RL Loads',
    objective: 'To study the output voltage and current waveforms of a 1-phase half-wave diode rectifier feeding pure resistive (R) and inductive (RL) loads, and verify the extinction angle β.',
    topologyId: '1ph-hw-diode',
    defaultPresetId: 'preset-1ph-hw-r',
    theorySummary: 'For a pure R load, current follows the voltage waveform and ceases at π. With an inductive load (RL), stored magnetic energy in the inductor keeps the diode conducting past π up to the extinction angle β, causing the DC output voltage to momentarily dip negative.',
    procedure: [
      'Select 1-Phase Half-Wave Diode Rectifier with R = 10 Ω, L = 0, and AC peak voltage Vm = 325 V.',
      'Record average DC output voltage (Vdc), RMS voltage (Vrms), and load current.',
      'Now increase inductance L from 0 to 10 mH, and then to 100 mH.',
      'Observe the waveform: notice the conduction period extending past 180° into the negative voltage region.',
      'Identify the extinction angle β where the diode finally turns off and current reaches zero.',
      'Compare simulated Vdc with theoretical formula Vdc = (Vm / 2π) * (1 - cos β).',
    ],
    expectedObservations: [
      'For R load: Vdc ≈ 103.5 V (0.318 * Vm), current is in phase with voltage.',
      'For RL load without FWD: Vdc decreases as L increases because the negative voltage tail subtracts from the net average voltage.',
      'Extinction angle β lies between 180° and 360°, increasing with time constant L/R.',
    ],
    keyEquations: [
      'V_{dc,R} = \\frac{V_m}{\\pi} \\approx 0.318 V_m',
      'V_{dc,RL} = \\frac{V_m}{2\\pi}(1 - \\cos\\beta)',
      'i(\\beta) = 0 \\implies \\sin(\\beta - \\phi) - \\sin(-\\phi)e^{-\\frac{R}{\\omega L}\\beta} = 0',
    ],
    discussionQuestions: [
      'Why does the diode remain forward-biased even when the AC source voltage becomes negative?',
      'How does the load time constant τ = L/R affect the extinction angle β and the average output voltage?',
    ],
  },

  {
    id: 'exp-2',
    number: 2,
    title: 'Freewheeling Diode Operation and Inductive Clamping in Rectifiers',
    objective: 'To demonstrate the action of a freewheeling diode (FWD) in eliminating negative output voltage, improving power factor, and providing continuous current decay.',
    topologyId: '1ph-hw-diode',
    defaultPresetId: 'preset-1ph-hw-fwd',
    theorySummary: 'When the AC source voltage drops below zero at π, the polarity of induced inductor voltage (vL = -L di/dt) forward-biases the freewheeling diode connected across the load. The load current transfers to the FWD path, clamping the output voltage to zero and preventing negative voltage excursions.',
    procedure: [
      'Set up a 1-Phase Half-Wave Rectifier with R = 10 Ω, L = 100 mH.',
      'Run the simulation with Freewheeling Diode OFF and note the average output voltage.',
      'Toggle the Freewheeling Diode ON.',
      'Observe the output voltage waveform: verify that it is clamped to 0 V during the interval [180°, 360°].',
      'Observe the source current: verify that source current drops to zero at 180° while load current freewheels through the diode.',
      'Increase L to 10 H to observe near ripple-free continuous DC load current.',
    ],
    expectedObservations: [
      'The negative output voltage spike disappears, restoring Vdc back up to Vm / π.',
      'Source power factor improves because the supply does not receive reactive energy back from the inductor.',
      'Load current ripple is reduced significantly.',
    ],
    keyEquations: [
      'V_{dc} = \\frac{V_m}{\\pi} \\quad (\\text{with FWD})',
      'i_{load}(t) = I_0 e^{-(t - t_0) / \\tau} \\quad (\\text{during freewheeling interval})',
    ],
    discussionQuestions: [
      'Why does the main diode D1 turn off when the FWD turns on at π?',
      'What are the advantages of a freewheeling diode in terms of converter efficiency and transformer heating?',
    ],
  },

  {
    id: 'exp-3',
    number: 3,
    title: 'Single-Phase Full-Bridge Diode Rectifier with Continuous and Discontinuous Conduction',
    objective: 'To investigate the 2-pulse full-wave diode bridge, evaluate form factor, ripple factor, and compare resistive vs inductive filtering.',
    topologyId: '1ph-bridge-diode',
    defaultPresetId: 'preset-1ph-fb-rl',
    theorySummary: 'The Graetz diode bridge rectifies both half-cycles of the AC source. Output ripple frequency is doubled to 2f (100 Hz), lowering filtering requirements. Inductive filtering smooths the load current, transforming it from pulsating rectified sine arches into continuous DC.',
    procedure: [
      'Select 1-Phase Full-Bridge Diode Rectifier with Vrms = 230 V (Vm = 325.3 V).',
      'Set R = 10 Ω, L = 0 (Pure R load). Verify Vdc = 2Vm/π ≈ 207 V.',
      'Check the Form Factor (FF = 1.11) and Ripple Factor (RF = 48.3%).',
      'Increase L to 1 mH, 10 mH, and 100 mH.',
      'Examine the transition of load current from pulsating to continuous and smooth.',
      'Verify diode currents: each diode conducts for 180° and carries an average current of Idc / 2.',
    ],
    expectedObservations: [
      'Average DC voltage remains 2Vm/π = 0.9003 * Vrms regardless of L (assuming ideal diodes).',
      'Load current ripple factor drops drastically from 48.3% to below 5% as L reaches 100 mH.',
      'AC source current becomes an alternating square-like wave with sharp transitions.',
    ],
    keyEquations: [
      'V_{dc} = \\frac{2V_m}{\\pi} = \\frac{2\\sqrt{2}}{\\pi} V_{rms} \\approx 0.9003 V_{rms}',
      'FF = \\frac{V_{rms}}{V_{dc}} = \\frac{\\pi}{2\\sqrt{2}} \\approx 1.11',
      'RF = \\sqrt{FF^2 - 1} = 0.4834',
    ],
    discussionQuestions: [
      'How does the diode bridge compare to the center-tapped transformer configuration in terms of diode PIV?',
      'What harmonics exist in the AC source current for a full bridge with highly inductive load?',
    ],
  },

  {
    id: 'exp-4',
    number: 4,
    title: 'Single-Phase Fully Controlled Converter: Continuous vs Discontinuous Modes and Inversion',
    objective: 'To analyze phase angle control (0° ≤ α ≤ 180°), identify CCM vs DCM operating boundaries, and demonstrate line-commutated inverter operation.',
    topologyId: '1ph-bridge-controlled',
    defaultPresetId: 'preset-1ph-controlled-ccm',
    theorySummary: 'By varying the firing angle α of the thyristors, the output DC voltage can be controlled continuously according to Vdc = (2Vm/π) cos α in CCM. For α > 90°, Vdc becomes negative, allowing power to flow from a DC source (motor back-EMF) back to the AC grid (inverter mode).',
    procedure: [
      'Select 1-Phase Controlled Bridge with R = 10 Ω, L = 100 mH, Vrms = 230 V.',
      'Sweep firing angle α from 0° to 30°, 60°, and 90° in steps.',
      'Observe the output voltage waveform and the negative voltage segments.',
      'Verify that at α = 60°, Vdc is exactly half of its value at α = 0° (cos 60° = 0.5).',
      'Reduce L to 10 mH to induce Discontinuous Conduction Mode (DCM), and observe current extinction at β.',
      'Activate a DC back-EMF of -100 V and set α = 120° to observe inverter power regeneration.',
    ],
    expectedObservations: [
      'In CCM, output voltage is governed by Vdc = (2Vm/π) cos α.',
      'At α = 90°, average DC voltage reaches 0 V.',
      'In DCM, extinction angle β occurs before π + α, elevating the average voltage above the cos α curve.',
    ],
    keyEquations: [
      'V_{dc,CCM} = \\frac{2V_m}{\\pi} \\cos\\alpha',
      'V_{dc,DCM} = \\frac{V_m}{\\pi}(\\cos\\alpha - \\cos\\beta)',
      'P = V_{dc} I_{dc} < 0 \\quad (\\text{Inverter Mode for } \\alpha > 90^\\circ)',
    ],
    discussionQuestions: [
      'Under what circuit conditions does a phase-controlled converter enter discontinuous conduction?',
      'What prevents thyristors from turning off when the AC source polarity reverses at 180° in CCM?',
    ],
  },

  {
    id: 'exp-5',
    number: 5,
    title: 'Three-Phase 6-Pulse Diode Bridge Rectifier: Line vs Phase Relations and Harmonic Spectrum',
    objective: 'To study 3-phase uncontrolled rectification, verify the line-to-line 6-pulse relationship Vdc = 1.35 * VLL,rms, and analyze low ripple characteristics.',
    topologyId: '3ph-bridge-diode',
    defaultPresetId: 'preset-3ph-dbr',
    theorySummary: 'The three-phase bridge connects the load between the most positive phase and the most negative phase at each instant. It produces 6 output voltage pulses per AC line period, with a ripple frequency of 6f (300 Hz) and an inherently low ripple factor of 4.2%.',
    procedure: [
      'Select 3-Phase 6-Pulse Diode Bridge with VLL,rms = 400 V, 50 Hz, R = 10 Ω, L = 50 mH.',
      'Observe the three phase voltages (van, vbn, vcn) and line voltages (vab, vbc, vca).',
      'Verify that the DC output voltage waveform envelopes the uppermost and lowermost peaks of the line voltages.',
      'Measure Vdc: verify Vdc ≈ 1.3505 * 400 V = 540.2 V.',
      'Check the harmonic spectrum: note the absence of 3rd harmonics in line currents and observe dominant 5th and 7th harmonics.',
    ],
    expectedObservations: [
      'Output voltage displays 6 distinct pulses per 20 ms cycle (ripple period = 3.33 ms).',
      'Peak inverse voltage across each diode equals the peak line-to-line voltage (√2 * 400 ≈ 565.7 V).',
      'Current drawn from each AC phase is a quasi-square wave with 120° positive conduction, 60° zero, 120° negative conduction.',
    ],
    keyEquations: [
      'V_{dc} = \\frac{3}{\\pi} V_{m,LL} = \\frac{3\\sqrt{2}}{\\pi} V_{LL,rms} \\approx 1.3505 V_{LL,rms}',
      'V_{LL,rms} = \\sqrt{3} V_{ph,rms}',
      'RF = 4.2\\%, \\quad f_{ripple} = 6f = 300\\text{ Hz}',
    ],
    discussionQuestions: [
      'Why is the ripple factor in a 3-phase bridge (4.2%) so much smaller than in a 1-phase bridge (48.3%)?',
      'Why are triplen harmonics (3rd, 9th, 15th...) absent from the AC line currents in a balanced three-wire system?',
    ],
  },

  {
    id: 'exp-6',
    number: 6,
    title: 'Three-Phase 6-Pulse Fully Controlled Thyristor Converter and Commutation Overlap',
    objective: 'To investigate phase control in 3-phase converters, observe conduction pairs, and examine the effect of AC source inductance on commutation overlap.',
    topologyId: '3ph-bridge-controlled',
    defaultPresetId: 'preset-3ph-controlled',
    theorySummary: 'Six thyristors triggered in sequence at 60° intervals control high-power DC systems. Adding AC source inductance Ls prevents instantaneous transfer of current between incoming and outgoing phases, creating a commutation overlap angle μ where both phases conduct simultaneously, depressing the DC output voltage.',
    procedure: [
      'Select 3-Phase Fully Controlled Converter with VLL,rms = 400 V, R = 15 Ω, L = 50 mH.',
      'Set α = 0° and observe similarity to diode bridge (Vdc ≈ 540 V).',
      'Increase firing angle α to 30°, 45°, and 60°. Verify Vdc = 540 * cos α.',
      'Now introduce Source Inductance Ls = 2.5 mH in the parameter panel.',
      'Observe the waveform: notice the commutation overlap notches and slope on phase current transitions.',
      'Measure the voltage reduction ΔVdc and verify against formula ΔVdc = (3ω Ls Idc) / π.',
    ],
    expectedObservations: [
      'Average DC output voltage drops proportionally to cos α.',
      'Source inductance slows down current commutation and causes commutation notches in the line voltage.',
      'Average output voltage drops by ΔVdc = 3ωLs Idc / π during overlap.',
    ],
    keyEquations: [
      'V_{dc} = \\frac{3\\sqrt{2}}{\\pi} V_{LL,rms} \\cos\\alpha',
      '\\Delta V_{dc} = \\frac{3\\omega L_s I_{dc}}{\\pi}',
      '\\cos(\\alpha + \\mu) = \\cos\\alpha - \\frac{2\\omega L_s I_{dc}}{\\sqrt{3} V_{m,ph}}',
    ],
    discussionQuestions: [
      'What danger arises if commutation overlap angle μ is too large during inverter operation (α > 90°)?',
      'How does source inductance affect the distortion and harmonic content of the grid voltage at the point of common coupling (PCC)?',
    ],
  },
];
