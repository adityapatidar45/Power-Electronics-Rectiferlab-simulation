# RECTIFIER LAB PRO — Interactive Power Electronics Simulator

A professional, research-grade power electronics simulation application built with React 18, TypeScript, and Vite. Designed for students, educators, and power electronics engineers to study, simulate, visualize, and analyze single-phase and three-phase AC-DC converters with rigorous mathematical fidelity.

Inspired by the AC-DC Converters curriculum and laboratory demonstrations by **Prof. Arpan Hota (IIT Kharagpur)** and the reference website `https://hotaarpan-iitkgp.github.io/Rectfier-lab/`.

---

## ⚡ Key Highlights & Capabilities

- **Mathematically Rigorous Simulation Engine**: Uses analytical equations and Runge-Kutta 4th-order (RK4) numerical ODE solvers with adaptive root-finding (Brent's method) for exact switching and extinction angles ($\beta$).
- **Physically Correct Inductive Dynamics**:
  - Distinguishes output voltage ($v_o$), resistor voltage ($v_R = R i_o$), and inductor voltage ($v_L = L \frac{di_o}{dt}$).
  - Full-bridge controlled converters correctly display signed negative output voltage during $[\pi, \pi+\alpha]$ while load current remains positive in Continuous Conduction Mode (CCM).
  - Accurate Discontinuous Conduction Mode (DCM) detecting exact zero-current extinction at $\beta$.
  - Freewheeling Diode (FWD) clamps output voltage to $0\,\text{V}$ and eliminates reactive power flow back to AC.
- **Multi-Channel Digital Oscilloscope**:
  - Live synchronized vertical scrub cursor updating at 60 FPS.
  - Channels for AC source voltages, DC output voltage, load current, resistor/inductor voltages, and thyristor gate pulses.
  - Automatic event marker pins ($\alpha$, $\beta$, commutation overlap $\mu$, AC zero crossings).
  - Instantaneous hover measurement HUD.
  - Trace toggles, X-axis zoom/pan, angle/time axes, and PNG export.
- **Interactive SVG Circuit Schematics**:
  - Dynamic glowing current path highlighting active conduction routes.
  - Active switches (diodes/SCRs) illuminated in vivid green; non-conducting devices dimmed.
  - Clickable component inspector modal displaying operating state, instantaneous voltage, branch current, PIV stress, and power loss.
  - High-resolution SVG vector export for reports and slides.
- **Harmonic & Power Quality Analysis**:
  - Discrete Fourier Transform (DFT) calculating fundamental ($h=1$) and harmonics up to 25th order.
  - Total Harmonic Distortion (THD), True Power Factor (TPF), Displacement Power Factor (DPF), Active Power ($P$), Reactive Power ($Q$), and Apparent Power ($S$).
- **Virtual Laboratory Workbook & Guided Experiments**:
  - 6 structured experiments covering single-phase and three-phase topologies, extinction angle determination, FWD action, and commutation overlap.
  - One-click setup loading into the live simulator.
  - Live automated error comparison and verification table.
  - Printable / PDF export ready laboratory workbook reports.
- **Comparative Engineering Mode**:
  - Side-by-side comparative analysis (R vs RL, Diode vs Controlled, with/without FWD, 1-Phase vs 3-Phase).

---

## 📐 Supported Rectifier Topologies

| Topology | Pulses | Governing $V_{dc}$ (Ideal CCM) | PIV Rating | Conduction Behavior |
|---|---|---|---|---|
| **1-Ph Half-Wave Diode** | 1 | $V_m / \pi \approx 0.450 V_{rms}$ | $V_m$ | Conduction from $0$ to $\pi$ (or $\beta$ with RL) |
| **1-Ph Half-Wave Controlled (SCR)** | 1 | $\frac{V_m}{2\pi}(1 + \cos\alpha)$ | $V_m$ | Conduction from $\alpha$ to $\pi$ (or $\beta$ with RL) |
| **1-Ph Center-Tapped Full-Wave** | 2 | $2V_m / \pi \approx 0.900 V_{rms}$ | $2V_m$ | 2 diodes alternating every $180^\circ$ |
| **1-Ph Full-Wave Diode Bridge** | 2 | $2V_m / \pi \approx 0.900 V_{rms}$ | $V_m$ | Pairs (D1, D4) and (D2, D3) alternating |
| **1-Ph Fully Controlled Bridge** | 2 | $\frac{2V_m}{\pi}\cos\alpha$ (CCM) | $V_m$ | Two-quadrant; negative $v_o$ in inductive load |
| **1-Ph Semi-Controlled Bridge** | 2 | $\frac{V_m}{\pi}(1 + \cos\alpha)$ | $V_m$ | Inherent freewheeling at $\pi$; no negative $v_o$ |
| **3-Ph Half-Wave Diode (3-Pulse)** | 3 | $\frac{3\sqrt{3}}{2\pi} V_{m,ph} \approx 1.17 V_{ph,rms}$ | $\sqrt{3}V_{m,ph}$ | Conduction over $120^\circ$ intervals |
| **3-Ph Half-Wave Controlled (3-Pulse)** | 3 | $\frac{3\sqrt{3}}{2\pi} V_{m,ph}\cos\alpha$ | $\sqrt{3}V_{m,ph}$ | 3-pulse controlled conversion |
| **3-Ph 6-Pulse Diode Bridge** | 6 | $\frac{3}{\pi} V_{m,LL} \approx 1.3505 V_{LL,rms}$ | $V_{m,LL}$ | 6 conduction pairs; 4.2% ripple factor |
| **3-Ph Fully Controlled 6-Pulse** | 6 | $\frac{3\sqrt{2}}{\pi} V_{LL,rms}\cos\alpha$ | $V_{m,LL}$ | Full two-quadrant operation for motor drives & HVDC |
| **3-Ph Semi-Converter (3 SCR + 3 Diode)** | 6 | $\frac{3 V_{m,LL}}{2\pi}(1 + \cos\alpha)$ | $V_{m,LL}$ | Inherent freewheeling; higher power factor |

---

## 🛠️ Installation & Execution

### 1. Requirements
- Node.js (v18+)
- npm or pnpm

### 2. Setup
```bash
cd C:\Users\Aditya\.gemini\antigravity\scratch\rectifier-lab
npm install
```

### 3. Run Automated Physics Validation Tests
```bash
npm test
```
Validates all analytical equations, extinction angles, continuous/discontinuous modes, line vs phase conversions, and DFT harmonics.

### 4. Start Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your web browser.

### 5. Build for Production
```bash
npm run build
```

---

## ⌨️ Keyboard Shortcuts

- `Space`: Run / Pause live simulation animation
- `←` / `→`: Step simulation cursor backward/forward by 1°
- `Shift + ←` / `Shift + →`: Step simulation cursor backward/forward by 10°
- `R`: Reset cursor to 0°
- `1`: Circuit Schematic Focus view
- `2`: Oscilloscope Focus view
- `3`: Comprehensive Lab Studio view
