import { HarmonicComponent } from '../types';

/**
 * Numerical integration using Trapezoidal rule
 */
export function integrateTrapezoidal(values: number[], dt: number): number {
  if (values.length < 2) return 0;
  let sum = 0.5 * (values[0] + values[values.length - 1]);
  for (let i = 1; i < values.length - 1; i++) {
    sum += values[i];
  }
  return sum * dt;
}

/**
 * Calculate Average (DC) value over a given period
 */
export function computeAverage(values: number[], dt: number, period: number): number {
  return integrateTrapezoidal(values, dt) / period;
}

/**
 * Calculate RMS value over a given period
 */
export function computeRms(values: number[], dt: number, period: number): number {
  const squared = values.map(v => v * v);
  const meanSquare = integrateTrapezoidal(squared, dt) / period;
  return Math.sqrt(Math.max(0, meanSquare));
}

/**
 * Brent's root-finding method for solving f(x) = 0 in [a, b]
 */
export function findRootBrent(
  f: (x: number) => number,
  a: number,
  b: number,
  tol = 1e-6,
  maxIter = 100
): number {
  let fa = f(a);
  let fb = f(b);

  if (Math.abs(fa) < tol) return a;
  if (Math.abs(fb) < tol) return b;

  if (fa * fb > 0) {
    // If endpoints don't bracket a root, search sub-intervals
    const steps = 50;
    const dx = (b - a) / steps;
    let found = false;
    for (let i = 0; i < steps; i++) {
      const x1 = a + i * dx;
      const x2 = x1 + dx;
      const f1 = f(x1);
      const f2 = f(x2);
      if (f1 * f2 <= 0) {
        a = x1;
        b = x2;
        fa = f1;
        fb = f2;
        found = true;
        break;
      }
    }
    if (!found) {
      // Return boundary with smaller abs value
      return Math.abs(fa) < Math.abs(fb) ? a : b;
    }
  }

  let c = a;
  let fc = fa;
  let d = b - a;
  let e = d;

  for (let iter = 0; iter < maxIter; iter++) {
    if (fb * fc > 0) {
      c = a;
      fc = fa;
      d = b - a;
      e = d;
    }
    if (Math.abs(fc) < Math.abs(fb)) {
      a = b;
      b = c;
      c = a;
      fa = fb;
      fb = fc;
      fc = fa;
    }

    const m = 0.5 * (c - b);
    if (Math.abs(m) <= tol || Math.abs(fb) < tol) {
      return b;
    }

    if (Math.abs(e) >= tol && Math.abs(fa) > Math.abs(fb)) {
      let s = fb / fa;
      let p: number;
      let q: number;

      if (a === c) {
        p = 2 * m * s;
        q = 1 - s;
      } else {
        q = fa / fc;
        const r = fb / fc;
        p = s * (2 * m * q * (q - r) - (b - a) * (r - 1));
        q = (q - 1) * (r - 1) * (s - 1);
      }

      if (p > 0) q = -q;
      p = Math.abs(p);

      if (2 * p < Math.min(3 * m * q - Math.abs(tol * q), Math.abs(e * q))) {
        e = d;
        d = p / q;
      } else {
        d = m;
        e = m;
      }
    } else {
      d = m;
      e = m;
    }

    a = b;
    fa = fb;

    if (Math.abs(d) > tol) {
      b += d;
    } else {
      b += m > 0 ? tol : -tol;
    }
    fb = f(b);
  }

  return b;
}

/**
 * Analytical Extinction Angle (beta) solver for RL load:
 * i(theta) = (Vm/Z)*[sin(theta - phi) - sin(alpha - phi)*exp(-(theta - alpha)/tan(phi))]
 * We seek theta = beta in (max(alpha, pi), 2pi + alpha) where i(beta) = 0.
 */
export function solveExtinctionAngleBeta(
  alphaRad: number,
  R: number,
  L: number,
  omega: number,
  Vm: number,
  E: number = 0
): { betaRad: number; isContinuous: boolean } {
  if (L <= 1e-7) {
    // Pure resistive load: extinction occurs when voltage drops to back EMF E or zero
    if (E > 0) {
      const sinTheta = E / Vm;
      if (sinTheta >= 1) return { betaRad: alphaRad, isContinuous: false };
      const thetaCutoff = Math.PI - Math.asin(sinTheta);
      return { betaRad: Math.max(alphaRad, thetaCutoff), isContinuous: false };
    }
    return { betaRad: Math.PI, isContinuous: false };
  }

  const XL = omega * L;
  const Z = Math.sqrt(R * R + XL * XL);
  const phi = Math.atan2(XL, R);

  // Current equation during conduction starting at alpha
  const currentAt = (theta: number) => {
    const steadyState = (Vm / Z) * Math.sin(theta - phi);
    const transient = ((Vm / Z) * Math.sin(alphaRad - phi) + (E > 0 ? E / R : 0)) * Math.exp(-(theta - alphaRad) / (XL / R));
    const backEmfComponent = E > 0 ? E / R : 0;
    return steadyState - transient - backEmfComponent;
  };

  // Check if current is continuous up to next half-cycle or cycle boundary
  const nextFiring = Math.PI + alphaRad;
  const iAtNextFiring = currentAt(nextFiring);

  if (iAtNextFiring > 1e-4) {
    // Continuous conduction mode!
    return { betaRad: nextFiring, isContinuous: true };
  }

  // Bracket root between max(alphaRad, Math.PI) and nextFiring
  const startAngle = Math.max(alphaRad + 0.001, Math.PI);
  const endAngle = nextFiring;

  const beta = findRootBrent(currentAt, startAngle, endAngle, 1e-5);
  return { betaRad: beta, isContinuous: false };
}

/**
 * Compute Discrete Fourier Transform (DFT) Harmonics
 * Returns harmonic list up to maxHarmonic
 */
export function computeHarmonics(
  signal: number[],
  dt: number,
  fundamentalFreq: number,
  maxHarmonic = 25
): { harmonics: HarmonicComponent[]; thd: number } {
  const N = signal.length;
  if (N < 4) return { harmonics: [], thd: 0 };

  const harmonics: HarmonicComponent[] = [];
  const period = 1 / fundamentalFreq;
  const omega0 = 2 * Math.PI * fundamentalFreq;

  // DC component (order 0)
  const dcVal = computeAverage(signal, dt, period);
  harmonics.push({
    order: 0,
    frequency: 0,
    magnitude: Math.abs(dcVal),
    phaseDeg: 0,
    rms: Math.abs(dcVal),
    percentageOfFundamental: 0,
  });

  let fundamentalRms = 0;
  let sumHarmonicsSquared = 0;

  for (let n = 1; n <= maxHarmonic; n++) {
    let sumCos = 0;
    let sumSin = 0;

    for (let k = 0; k < N; k++) {
      const t = k * dt;
      const angle = n * omega0 * t;
      sumCos += signal[k] * Math.cos(angle);
      sumSin += signal[k] * Math.sin(angle);
    }

    const an = (2 / N) * sumCos;
    const bn = (2 / N) * sumSin;
    const magPeak = Math.sqrt(an * an + bn * bn);
    const magRms = magPeak / Math.SQRT2;
    const phase = Math.atan2(bn, an) * (180 / Math.PI);

    if (n === 1) {
      fundamentalRms = magRms;
    } else {
      sumHarmonicsSquared += magRms * magRms;
    }

    harmonics.push({
      order: n,
      frequency: n * fundamentalFreq,
      magnitude: magPeak,
      phaseDeg: phase,
      rms: magRms,
      percentageOfFundamental: fundamentalRms > 1e-6 ? (magRms / fundamentalRms) * 100 : 0,
    });
  }

  // Update percentages with true fundamental
  if (fundamentalRms > 1e-6) {
    for (let i = 1; i < harmonics.length; i++) {
      harmonics[i].percentageOfFundamental = (harmonics[i].rms / fundamentalRms) * 100;
    }
  }

  const thd = fundamentalRms > 1e-6 ? (Math.sqrt(sumHarmonicsSquared) / fundamentalRms) * 100 : 0;
  return { harmonics, thd };
}

/**
 * Calculate Form Factor and Ripple Factor
 */
export function computeFormAndRippleFactor(rms: number, avg: number): { formFactor: number; rippleFactor: number } {
  if (Math.abs(avg) < 1e-6) {
    return { formFactor: 0, rippleFactor: 0 };
  }
  const formFactor = Math.abs(rms / avg);
  const diff = formFactor * formFactor - 1;
  const rippleFactor = Math.sqrt(Math.max(0, diff));
  return { formFactor, rippleFactor };
}
