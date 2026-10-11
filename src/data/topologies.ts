import { TopologyId } from '../types';

export interface TopologyDefinition {
  id: TopologyId;
  name: string;
  shortName: string;
  category: '1-Phase' | '3-Phase';
  pulses: number;
  devices: { id: string; name: string; type: 'DIODE' | 'THYRISTOR' }[];
  description: string;
  formulaVoAvg: string;
  formulaVoRms: string;
  formulaPiv: string;
  rippleFrequencyMultiplier: number;
  advantages: string[];
  disadvantages: string[];
  applications: string[];
  derivationSteps: { title: string; latex: string; explanation: string }[];
}

export const TOPOLOGIES: Record<TopologyId, TopologyDefinition> = {
  '1ph-hw-diode': {
    id: '1ph-hw-diode',
    name: '1-Phase Half-Wave Diode Rectifier',
    shortName: '1-Ph HW Diode',
    category: '1-Phase',
    pulses: 1,
    devices: [
      { id: 'D1', name: 'Diode D1', type: 'DIODE' },
      { id: 'FWD', name: 'Freewheeling Diode', type: 'DIODE' },
    ],
    description: 'The simplest rectifier configuration utilizing a single diode. Conduction occurs only during the positive half-cycle of the AC source.',
    formulaVoAvg: 'V_{dc} = \\frac{V_m}{\\pi} \\approx 0.318 V_m \\approx 0.450 V_{rms}',
    formulaVoRms: 'V_{rms} = \\frac{V_m}{2} = 0.5 V_m',
    formulaPiv: 'PIV = V_m',
    rippleFrequencyMultiplier: 1,
    advantages: [
      'Extremely simple circuit with minimum component count',
      'Low initial hardware cost',
    ],
    disadvantages: [
      'High ripple factor (RF = 1.21)',
      'Low rectification efficiency (max 40.6%)',
      'Causes DC saturation in supply transformer due to unidirectional source current',
    ],
    applications: [
      'Low power battery chargers',
      'Small signal rectifiers and AM demodulators',
      'Soldering iron half-power switches',
    ],
    derivationSteps: [
      {
        title: 'Average DC Output Voltage',
        latex: 'V_{dc} = \\frac{1}{2\\pi} \\int_0^{\\pi} V_m \\sin(\\omega t) d(\\omega t) = \\frac{V_m}{2\\pi} [-\\cos(\\omega t)]_0^\\pi = \\frac{V_m}{\\pi}',
        explanation: 'Integrate the sinusoidal source voltage over one complete period 2π, noting diode blocks from π to 2π.',
      },
      {
        title: 'RMS Output Voltage',
        latex: 'V_{rms} = \\sqrt{\\frac{1}{2\\pi} \\int_0^{\\pi} V_m^2 \\sin^2(\\omega t) d(\\omega t)} = \\frac{V_m}{2}',
        explanation: 'Evaluate the root mean square over the 2π interval using sin²(θ) = (1 - cos(2θ))/2.',
      },
      {
        title: 'Form Factor and Ripple Factor',
        latex: 'FF = \\frac{V_{rms}}{V_{dc}} = \\frac{V_m / 2}{V_m / \\pi} = \\frac{\\pi}{2} \\approx 1.57, \\quad RF = \\sqrt{FF^2 - 1} = \\sqrt{1.57^2 - 1} \\approx 1.21',
        explanation: 'Ripple factor of 121% demonstrates significant AC harmonic content in the rectified DC output.',
      },
    ],
  },

  '1ph-hw-controlled': {
    id: '1ph-hw-controlled',
    name: '1-Phase Half-Wave Controlled Rectifier (SCR)',
    shortName: '1-Ph HW SCR',
    category: '1-Phase',
    pulses: 1,
    devices: [
      { id: 'T1', name: 'Thyristor T1', type: 'THYRISTOR' },
      { id: 'FWD', name: 'Freewheeling Diode', type: 'DIODE' },
    ],
    description: 'Phase-controlled half-wave rectifier using an SCR (Thyristor). By delaying the gate trigger pulse by firing angle α, the output voltage is smoothly regulated.',
    formulaVoAvg: 'V_{dc} = \\frac{V_m}{2\\pi}(1 + \\cos\\alpha)',
    formulaVoRms: 'V_{rms} = \\frac{V_m}{2}\\sqrt{\\frac{1}{\\pi}\\left[(\\pi - \\alpha) + \\frac{1}{2}\\sin(2\\alpha)\\right]}',
    formulaPiv: 'PIV = V_m',
    rippleFrequencyMultiplier: 1,
    advantages: [
      'Continuously adjustable DC output voltage from maximum down to zero',
      'Electronic on/off control via gate triggering pulses',
    ],
    disadvantages: [
      'High harmonic distortion and poor power factor at large firing angles α',
      'Discontinuous conduction at higher firing angles',
      'DC core magnetizing current in supply transformer',
    ],
    applications: [
      'DC motor speed controllers',
      'Heater temperature regulators',
      'Controlled power supplies',
    ],
    derivationSteps: [
      {
        title: 'Average DC Output Voltage (R Load)',
        latex: 'V_{dc} = \\frac{1}{2\\pi} \\int_\\alpha^\\pi V_m \\sin(\\omega t) d(\\omega t) = \\frac{V_m}{2\\pi} [-\\cos(\\omega t)]_\\alpha^\\pi = \\frac{V_m}{2\\pi}(1 + \\cos\\alpha)',
        explanation: 'Conduction begins at firing angle α and naturally extinguishes at π as the source voltage crosses zero.',
      },
      {
        title: 'RL Load with Extinction Angle β',
        latex: 'V_{dc} = \\frac{1}{2\\pi} \\int_\\alpha^\\beta V_m \\sin(\\omega t) d(\\omega t) = \\frac{V_m}{2\\pi}(\\cos\\alpha - \\cos\\beta)',
        explanation: 'Stored inductor energy forces current to flow past π until extinction angle β where i(β) = 0.',
      },
    ],
  },

  '1ph-ct-diode': {
    id: '1ph-ct-diode',
    name: '1-Phase Full-Wave Center-Tapped Rectifier',
    shortName: '1-Ph Center-Tap',
    category: '1-Phase',
    pulses: 2,
    devices: [
      { id: 'D1', name: 'Diode D1 (Upper)', type: 'DIODE' },
      { id: 'D2', name: 'Diode D2 (Lower)', type: 'DIODE' },
    ],
    description: 'Full-wave rectifier using a center-tapped transformer and two diodes. D1 conducts during positive half-cycle, and D2 conducts during negative half-cycle.',
    formulaVoAvg: 'V_{dc} = \\frac{2V_m}{\\pi} \\approx 0.636 V_m \\approx 0.900 V_{rms}',
    formulaVoRms: 'V_{rms} = \\frac{V_m}{\\sqrt{2}} \\approx 0.707 V_m = V_{rms}',
    formulaPiv: 'PIV = 2V_m',
    rippleFrequencyMultiplier: 2,
    advantages: [
      'Only 2 diodes required for full-wave rectification',
      'Common ground terminal at center tap',
      'Higher efficiency than half-wave (81.2%)',
    ],
    disadvantages: [
      'Requires heavy center-tapped step-down transformer',
      'Diode PIV is doubled to 2 * Vm, requiring higher voltage rated diodes',
      'Transformer secondary copper utilization is lower than bridge',
    ],
    applications: [
      'Dual-polarity analog power supplies',
      'Center-tapped low-voltage DC bench supplies',
    ],
    derivationSteps: [
      {
        title: 'Average DC Output Voltage',
        latex: 'V_{dc} = \\frac{1}{\\pi} \\int_0^\\pi V_m \\sin(\\omega t) d(\\omega t) = \\frac{2V_m}{\\pi}',
        explanation: 'Full-wave symmetry results in a fundamental repetition period of π radians.',
      },
      {
        title: 'Peak Inverse Voltage (PIV)',
        latex: 'PIV = 2V_m',
        explanation: 'When D1 conducts, cathode of D2 is at +Vm while its anode is at -Vm from center tap, imposing 2Vm reverse voltage.',
      },
    ],
  },

  '1ph-bridge-diode': {
    id: '1ph-bridge-diode',
    name: '1-Phase Full-Wave Diode Bridge Rectifier',
    shortName: '1-Ph Diode Bridge',
    category: '1-Phase',
    pulses: 2,
    devices: [
      { id: 'D1', name: 'Diode D1 (Top Left)', type: 'DIODE' },
      { id: 'D2', name: 'Diode D2 (Bottom Left)', type: 'DIODE' },
      { id: 'D3', name: 'Diode D3 (Top Right)', type: 'DIODE' },
      { id: 'D4', name: 'Diode D4 (Bottom Right)', type: 'DIODE' },
    ],
    description: 'The standard four-diode Graetz bridge rectifier. Conduction alternates between pairs (D1, D4) and (D2, D3), eliminating the need for a center-tapped transformer.',
    formulaVoAvg: 'V_{dc} = \\frac{2V_m}{\\pi} = \\frac{2\\sqrt{2}}{\\pi}V_{rms} \\approx 0.9003 V_{rms}',
    formulaVoRms: 'V_{rms} = \\frac{V_m}{\\sqrt{2}} = V_{s,rms}',
    formulaPiv: 'PIV = V_m',
    rippleFrequencyMultiplier: 2,
    advantages: [
      'No center-tapped transformer needed',
      'Diode PIV rating is only Vm (half of center-tapped)',
      'High transformer utilization factor (TUF = 0.812)',
      'Fundamental ripple frequency is 2 * f (100 Hz at 50 Hz)',
    ],
    disadvantages: [
      'Two diode forward voltage drops in series (2 * VF)',
      'Four diodes required instead of two',
    ],
    applications: [
      'AC-DC mains adapters and phone chargers',
      'Uninterruptible Power Supplies (UPS)',
      'Variable frequency motor drive DC links',
    ],
    derivationSteps: [
      {
        title: 'Average DC Output Voltage',
        latex: 'V_{dc} = \\frac{1}{\\pi} \\int_0^\\pi V_m \\sin(\\omega t) d(\\omega t) = \\frac{V_m}{\\pi} [-\\cos(\\omega t)]_0^\\pi = \\frac{2V_m}{\\pi} = \\frac{2\\sqrt{2}}{\\pi}V_{s,rms} \\approx 0.9003 V_{s,rms}',
        explanation: 'Both positive and negative half-cycles appear at the output with identical positive polarity.',
      },
      {
        title: 'RMS Output Voltage',
        latex: 'V_{o,rms} = \\sqrt{\\frac{1}{\\pi} \\int_0^\\pi V_m^2 \\sin^2(\\omega t) d(\\omega t)} = \\frac{V_m}{\\sqrt{2}} = V_{s,rms}',
        explanation: 'The RMS value of full-wave rectified AC is identical to the RMS value of the original AC input.',
      },
      {
        title: 'Form Factor and Ripple Factor',
        latex: 'FF = \\frac{V_{rms}}{V_{dc}} = \\frac{V_m / \\sqrt{2}}{2V_m / \\pi} = \\frac{\\pi}{2\\sqrt{2}} \\approx 1.11, \\quad RF = \\sqrt{1.11^2 - 1} \\approx 0.4834',
        explanation: 'Ripple factor is reduced to 48.3%, dramatically lower than the 121% of half-wave.',
      },
    ],
  },

  '1ph-bridge-controlled': {
    id: '1ph-bridge-controlled',
    name: '1-Phase Fully Controlled Thyristor Bridge',
    shortName: '1-Ph Controlled Bridge',
    category: '1-Phase',
    pulses: 2,
    devices: [
      { id: 'T1', name: 'Thyristor T1', type: 'THYRISTOR' },
      { id: 'T2', name: 'Thyristor T2', type: 'THYRISTOR' },
      { id: 'T3', name: 'Thyristor T3', type: 'THYRISTOR' },
      { id: 'T4', name: 'Thyristor T4', type: 'THYRISTOR' },
      { id: 'FWD', name: 'Freewheeling Diode (Optional)', type: 'DIODE' },
    ],
    description: 'Four-thyristor full bridge allowing two-quadrant operation. Triggering pairs (T1, T4) and (T2, T3) with firing angle α controls the average DC output voltage and permits regenerative power flow back to AC.',
    formulaVoAvg: 'V_{dc} = \\frac{2V_m}{\\pi} \\cos\\alpha \\quad (\\text{CCM})',
    formulaVoRms: 'V_{rms} = \\frac{V_m}{\\sqrt{2}} \\quad (\\text{CCM})',
    formulaPiv: 'PIV = V_m',
    rippleFrequencyMultiplier: 2,
    advantages: [
      'Wide two-quadrant control: Rectification (0° < α < 90°) and Inversion (90° < α < 180°)',
      'Continuous smooth control of DC output voltage and load current',
      'Capable of regenerative braking in DC drives',
    ],
    disadvantages: [
      'Decreasing power factor as firing angle α increases (PF ≈ cos(α))',
      'Generates input current harmonics (3rd, 5th, 7th...)',
      'Requires gate triggering synchronizing circuitry',
    ],
    applications: [
      'Four-quadrant DC motor drive systems',
      'High-voltage DC (HVDC) transmission converters',
      'Battery energy storage bidirectional interfaces',
    ],
    derivationSteps: [
      {
        title: 'Continuous Conduction Mode (CCM)',
        latex: 'V_{dc} = \\frac{1}{\\pi} \\int_\\alpha^{\\pi+\\alpha} V_m \\sin(\\omega t) d(\\omega t) = \\frac{V_m}{\\pi} [-\\cos(\\omega t)]_\\alpha^{\\pi+\\alpha} = \\frac{2V_m}{\\pi} \\cos\\alpha',
        explanation: 'Due to load inductance, conduction extends past π until π+α. The negative voltage portion reduces the DC average proportionally to cos(α).',
      },
      {
        title: 'Discontinuous Conduction Mode (DCM)',
        latex: 'V_{dc} = \\frac{1}{\\pi} \\int_\\alpha^\\beta V_m \\sin(\\omega t) d(\\omega t) = \\frac{V_m}{\\pi} (\\cos\\alpha - \\cos\\beta)',
        explanation: 'When load current extinguishes at β < π+α, output drops to zero during [β, π+α], altering the DC average.',
      },
      {
        title: 'With Freewheeling Diode',
        latex: 'V_{dc} = \\frac{1}{\\pi} \\int_\\alpha^\\pi V_m \\sin(\\omega t) d(\\omega t) = \\frac{V_m}{\\pi} (1 + \\cos\\alpha)',
        explanation: 'The freewheeling diode conducts from π to π+α, clamping output to 0V and preventing negative voltage.',
      },
    ],
  },

  '1ph-semi-controlled': {
    id: '1ph-semi-controlled',
    name: '1-Phase Semi-Converter (Half-Controlled Bridge)',
    shortName: '1-Ph Semi-Converter',
    category: '1-Phase',
    pulses: 2,
    devices: [
      { id: 'T1', name: 'Thyristor T1', type: 'THYRISTOR' },
      { id: 'T2', name: 'Thyristor T2', type: 'THYRISTOR' },
      { id: 'D3', name: 'Diode D3', type: 'DIODE' },
      { id: 'D4', name: 'Diode D4', type: 'DIODE' },
    ],
    description: 'Combines two thyristors and two diodes. Features inherent freewheeling action at π through one SCR and one diode of the same arm, preventing negative output voltage without an external diode.',
    formulaVoAvg: 'V_{dc} = \\frac{V_m}{\\pi}(1 + \\cos\\alpha)',
    formulaVoRms: 'V_{rms} = V_m \\sqrt{\\frac{1}{2\\pi}\\left[(\\pi - \\alpha) + \\frac{1}{2}\\sin(2\\alpha)\\right]}',
    formulaPiv: 'PIV = V_m',
    rippleFrequencyMultiplier: 2,
    advantages: [
      'Inherent freewheeling action eliminates negative voltage excursions',
      'Significantly higher power factor than full converter for the same average DC voltage',
      'Reduced control circuit cost (only two thyristor gate drivers needed)',
    ],
    disadvantages: [
      'Single-quadrant operation only (Vdc cannot be negative; no inversion possible)',
      'Cannot return regenerated energy to the AC supply',
    ],
    applications: [
      'Single-direction variable speed DC motor drives',
      'Electroplating and electrolysis power supplies',
    ],
    derivationSteps: [
      {
        title: 'Average DC Output Voltage',
        latex: 'V_{dc} = \\frac{1}{\\pi} \\int_\\alpha^\\pi V_m \\sin(\\omega t) d(\\omega t) = \\frac{V_m}{\\pi} (1 + \\cos\\alpha)',
        explanation: 'Thyristor T1 and Diode D4 conduct from α to π. At π, D2 naturally turns on and pair (T1, D2) freewheels with vo = 0 until T2 is triggered at π+α.',
      },
    ],
  },

  '3ph-hw-diode': {
    id: '3ph-hw-diode',
    name: '3-Phase Half-Wave Diode Rectifier (3-Pulse)',
    shortName: '3-Ph HW Diode',
    category: '3-Phase',
    pulses: 3,
    devices: [
      { id: 'D1', name: 'Diode D1 (Phase A)', type: 'DIODE' },
      { id: 'D2', name: 'Diode D2 (Phase B)', type: 'DIODE' },
      { id: 'D3', name: 'Diode D3 (Phase C)', type: 'DIODE' },
    ],
    description: 'Three-pulse rectifier with each diode connected to one AC phase line and a common neutral return. Each diode conducts for 120° whenever its phase voltage is highest.',
    formulaVoAvg: 'V_{dc} = \\frac{3\\sqrt{3}}{2\\pi} V_{m,ph} \\approx 0.827 V_{m,ph} = 1.17 V_{ph,rms}',
    formulaVoRms: 'V_{rms} = V_{m,ph} \\sqrt{\\frac{1}{2} + \\frac{3\\sqrt{3}}{8\\pi}} \\approx 0.8407 V_{m,ph}',
    formulaPiv: 'PIV = \\sqrt{3}V_{m,ph} = V_{m,LL}',
    rippleFrequencyMultiplier: 3,
    advantages: [
      'Lower ripple than single-phase (RF = 17%)',
      'Higher ripple frequency (3 * f = 150 Hz)',
    ],
    disadvantages: [
      'Requires star-connected supply with accessible neutral return',
      'Causes DC component in supply lines and potential transformer core saturation',
    ],
    applications: [
      'Aircraft 400Hz auxiliary power systems',
      'Medium-power DC distribution',
    ],
    derivationSteps: [
      {
        title: 'Average DC Output Voltage',
        latex: 'V_{dc} = \\frac{3}{2\\pi} \\int_{-\\pi/3}^{\\pi/3} V_{m,ph} \\cos(\\theta) d\\theta = \\frac{3 V_{m,ph}}{2\\pi} [\\sin(\\pi/3) - \\sin(-\\pi/3)] = \\frac{3\\sqrt{3}}{2\\pi} V_{m,ph}',
        explanation: 'Using symmetrical limits centered at the peak of phase voltage over a 120° (2π/3) conduction angle.',
      },
    ],
  },

  '3ph-hw-controlled': {
    id: '3ph-hw-controlled',
    name: '3-Phase Half-Wave Controlled Converter (3-Pulse)',
    shortName: '3-Ph HW SCR',
    category: '3-Phase',
    pulses: 3,
    devices: [
      { id: 'T1', name: 'Thyristor T1', type: 'THYRISTOR' },
      { id: 'T2', name: 'Thyristor T2', type: 'THYRISTOR' },
      { id: 'T3', name: 'Thyristor T3', type: 'THYRISTOR' },
    ],
    description: 'Phase-controlled 3-pulse converter with firing angle α measured from the phase voltage natural commutation intersections (30° after phase zero crossing).',
    formulaVoAvg: 'V_{dc} = \\frac{3\\sqrt{3}}{2\\pi} V_{m,ph} \\cos\\alpha \\quad (\\alpha \\le 30^\\circ \\text{ or CCM})',
    formulaVoRms: 'V_{rms} = V_{m,ph}\\sqrt{\\frac{3}{2\\pi}\\left[\\frac{\\pi}{3} + \\frac{\\sqrt{3}}{4}\\cos(2\\alpha)\\right]}',
    formulaPiv: 'PIV = \\sqrt{3}V_{m,ph}',
    rippleFrequencyMultiplier: 3,
    advantages: [
      'Electronic voltage control for 3-phase systems',
      'Simple control topology for 3-phase feeds',
    ],
    disadvantages: [
      'Neutral conductor carries substantial DC and 3rd harmonic currents',
      'Transformer saturation concerns',
    ],
    applications: [
      'Electrochemical processes',
      'Excitation systems for synchronous machines',
    ],
    derivationSteps: [
      {
        title: 'Average DC Output Voltage',
        latex: 'V_{dc} = \\frac{3}{2\\pi} \\int_{-\\pi/3+\\alpha}^{\\pi/3+\\alpha} V_{m,ph} \\cos(\\theta) d\\theta = \\frac{3\\sqrt{3}}{2\\pi} V_{m,ph} \\cos\\alpha',
        explanation: 'Shift integration boundaries by firing delay α.',
      },
    ],
  },

  '3ph-bridge-diode': {
    id: '3ph-bridge-diode',
    name: '3-Phase 6-Pulse Diode Bridge Rectifier',
    shortName: '3-Ph Diode Bridge',
    category: '3-Phase',
    pulses: 6,
    devices: [
      { id: 'D1', name: 'Diode D1 (Phase A Upper)', type: 'DIODE' },
      { id: 'D2', name: 'Diode D2 (Phase C Lower)', type: 'DIODE' },
      { id: 'D3', name: 'Diode D3 (Phase B Upper)', type: 'DIODE' },
      { id: 'D4', name: 'Diode D4 (Phase A Lower)', type: 'DIODE' },
      { id: 'D5', name: 'Diode D5 (Phase C Upper)', type: 'DIODE' },
      { id: 'D6', name: 'Diode D6 (Phase B Lower)', type: 'DIODE' },
    ],
    description: 'The standard industrial 6-pulse Graetz bridge rectifier. Six diodes conduct in pairs of two for 60° intervals each, delivering a smooth DC voltage with low ripple (4.2%).',
    formulaVoAvg: 'V_{dc} = \\frac{3}{\\pi} V_{m,LL} = \\frac{3\\sqrt{2}}{\\pi} V_{LL,rms} \\approx 1.3505 V_{LL,rms}',
    formulaVoRms: 'V_{rms} = V_{m,LL} \\sqrt{\\frac{1}{2} + \\frac{3\\sqrt{3}}{4\\pi}} \\approx 0.9558 V_{m,LL} \\approx 1.3516 V_{LL,rms}',
    formulaPiv: 'PIV = V_{m,LL} = \\sqrt{2} V_{LL,rms}',
    rippleFrequencyMultiplier: 6,
    advantages: [
      'Exceptionally low ripple factor (RF = 4.2%) without massive filter capacitors',
      'High ripple frequency (6 * 50 = 300 Hz)',
      'No neutral connection required',
      'High power capability and symmetrical three-phase loading',
    ],
    disadvantages: [
      'Draws non-sinusoidal line currents with 5th, 7th, 11th, 13th harmonics',
      'Uncontrolled output voltage',
    ],
    applications: [
      'Industrial Variable Frequency Drives (VFDs)',
      'High-power DC battery chargers and EV fast charging stations',
      'Electrochemical smelting and plating plants',
      'Uninterruptible Power Systems (UPS)',
    ],
    derivationSteps: [
      {
        title: 'Average DC Output Voltage',
        latex: 'V_{dc} = \\frac{6}{2\\pi} \\int_{-\\pi/6}^{\\pi/6} V_{m,LL} \\cos(\\theta) d\\theta = \\frac{3}{\\pi} V_{m,LL} [\\sin(\\pi/6) - \\sin(-\\pi/6)] = \\frac{3}{\\pi} V_{m,LL}',
        explanation: 'Each line-to-line pulse spans 60° (π/3 rad). Substitute Vm,LL = √2 * VLL,rms to obtain Vdc = (3√2 / π) * VLL,rms ≈ 1.3505 * VLL,rms.',
      },
      {
        title: 'RMS Output Voltage',
        latex: 'V_{rms} = \\sqrt{\\frac{3}{\\pi} \\int_{-\\pi/6}^{\\pi/6} V_{m,LL}^2 \\cos^2(\\theta) d\\theta} = V_{m,LL} \\sqrt{\\frac{1}{2} + \\frac{3\\sqrt{3}}{4\\pi}} \\approx 1.3516 V_{LL,rms}',
        explanation: 'Very close to average DC value (1.3505 vs 1.3516), proving the exceptional smoothness of 6-pulse rectification.',
      },
      {
        title: 'Voltage Ripple Factor',
        latex: 'RF = \\sqrt{\\left(\\frac{V_{rms}}{V_{dc}}\\right)^2 - 1} = \\sqrt{\\left(\\frac{1.3516}{1.3505}\\right)^2 - 1} \\approx 0.042 \\quad (4.2\\%)',
        explanation: 'Only 4.2% ripple factor compared to 48.3% in single-phase full-wave!',
      },
    ],
  },

  '3ph-bridge-controlled': {
    id: '3ph-bridge-controlled',
    name: '3-Phase Fully Controlled Converter (6-Pulse)',
    shortName: '3-Ph Controlled Bridge',
    category: '3-Phase',
    pulses: 6,
    devices: [
      { id: 'T1', name: 'Thyristor T1 (Phase A Upper)', type: 'THYRISTOR' },
      { id: 'T2', name: 'Thyristor T2 (Phase C Lower)', type: 'THYRISTOR' },
      { id: 'T3', name: 'Thyristor T3 (Phase B Upper)', type: 'THYRISTOR' },
      { id: 'T4', name: 'Thyristor T4 (Phase A Lower)', type: 'THYRISTOR' },
      { id: 'T5', name: 'Thyristor T5 (Phase C Upper)', type: 'THYRISTOR' },
      { id: 'T6', name: 'Thyristor T6 (Phase B Lower)', type: 'THYRISTOR' },
      { id: 'FWD', name: 'Freewheeling Diode (Optional)', type: 'DIODE' },
    ],
    description: 'The standard high-power converter in electrical drives and HVDC. Firing angle α is referenced from the natural commutation intersections (30° after phase voltage zero-crossing). Supports full two-quadrant operation.',
    formulaVoAvg: 'V_{dc} = \\frac{3 V_{m,LL}}{\\pi} \\cos\\alpha = \\frac{3\\sqrt{2}}{\\pi} V_{LL,rms} \\cos\\alpha \\approx 1.35 V_{LL,rms} \\cos\\alpha',
    formulaVoRms: 'V_{rms} = V_{m,LL} \\sqrt{\\frac{1}{2} + \\frac{3\\sqrt{3}}{4\\pi} \\cos(2\\alpha)}',
    formulaPiv: 'PIV = V_{m,LL}',
    rippleFrequencyMultiplier: 6,
    advantages: [
      'Fully bidirectional power conversion (Rectifier mode for α < 90°, Inverter mode for α > 90°)',
      'High power handling capability up to Gigawatt scale (HVDC)',
      'Fast dynamic response for DC motor speed and torque control',
    ],
    disadvantages: [
      'Line power factor deteriorates with firing delay (PF ≈ cos(α))',
      'Draws characteristic 5th, 7th, 11th, 13th harmonics from the AC grid',
      'Requires synchronized gate firing circuitry for 6 thyristors',
    ],
    applications: [
      'High-power rolling mill and traction DC motor drives',
      'High-Voltage Direct Current (HVDC) transmission converters',
      'Induction heating power supplies',
      'Static VAR Compensators (SVC)',
    ],
    derivationSteps: [
      {
        title: 'Continuous Conduction Mode (CCM)',
        latex: 'V_{dc} = \\frac{3}{\\pi} \\int_{-\\pi/6+\\alpha}^{\\pi/6+\\alpha} V_{m,LL} \\cos(\\theta) d\\theta = \\frac{3 V_{m,LL}}{\\pi} \\cos\\alpha = \\frac{3\\sqrt{2}}{\\pi} V_{LL,rms} \\cos\\alpha',
        explanation: 'At α = 0°, Vdc = 1.35 * VLL,rms. At α = 60°, Vdc = 0.675 * VLL,rms. At α = 90°, Vdc = 0. At α > 90°, Vdc is negative (inversion mode).',
      },
      {
        title: 'Effect of Source Inductance Ls',
        latex: '\\Delta V_{dc} = \\frac{3\\omega L_s I_{dc}}{\\pi}, \\quad \\cos(\\alpha + \\mu) = \\cos\\alpha - \\frac{2\\omega L_s I_{dc}}{\\sqrt{3} V_{m,ph}}',
        explanation: 'Commutation overlap angle μ causes a voltage drop due to finite rate of current transfer between phases.',
      },
    ],
  },

  '3ph-semi-controlled': {
    id: '3ph-semi-controlled',
    name: '3-Phase Semi-Converter (Half-Controlled 3T + 3D)',
    shortName: '3-Ph Semi-Converter',
    category: '3-Phase',
    pulses: 6,
    devices: [
      { id: 'T1', name: 'Thyristor T1 (Phase A Upper)', type: 'THYRISTOR' },
      { id: 'T3', name: 'Thyristor T3 (Phase B Upper)', type: 'THYRISTOR' },
      { id: 'T5', name: 'Thyristor T5 (Phase C Upper)', type: 'THYRISTOR' },
      { id: 'D2', name: 'Diode D2 (Phase C Lower)', type: 'DIODE' },
      { id: 'D4', name: 'Diode D4 (Phase A Lower)', type: 'DIODE' },
      { id: 'D6', name: 'Diode D6 (Phase B Lower)', type: 'DIODE' },
    ],
    description: 'Half-controlled bridge featuring 3 thyristors in the upper group and 3 diodes in the lower group. Provides smooth single-quadrant voltage control with higher power factor than the fully controlled bridge.',
    formulaVoAvg: 'V_{dc} = \\frac{3 V_{m,LL}}{2\\pi}(1 + \\cos\\alpha)',
    formulaVoRms: 'V_{rms} = V_{m,LL} \\sqrt{\\frac{3}{4\\pi}\\left[\\frac{\\pi}{3} + \\frac{\\pi}{3}\\cos\\alpha + \\frac{\\sqrt{3}}{2}\\sin\\alpha\\right]}',
    formulaPiv: 'PIV = V_{m,LL}',
    rippleFrequencyMultiplier: 6,
    advantages: [
      'Inherent freewheeling action clamps negative output voltage without separate diode',
      'Higher displacement power factor than fully controlled bridge at same average DC output',
      'Lower gate drive cost (only 3 thyristors to trigger)',
    ],
    disadvantages: [
      'Operates in first quadrant only (cannot invert power back to AC)',
      'Generates triplen harmonics in output voltage at α > 60°',
    ],
    applications: [
      'Single-direction industrial DC motor drives',
      'High-power DC magnet power supplies',
    ],
    derivationSteps: [
      {
        title: 'Average DC Output Voltage',
        latex: 'V_{dc} = \\frac{3 V_{m,LL}}{2\\pi}(1 + \\cos\\alpha)',
        explanation: 'For α ≤ 60°, continuous conduction occurs. For α > 60°, freewheeling occurs through one SCR and diode of the same phase leg, clamping output to 0V.',
      },
    ],
  },
};
