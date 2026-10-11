import React, { useRef, useEffect, useState, useMemo } from 'react';
import { TimeSample, SwitchingMarker, TopologyId } from '../../types';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Eye,
  Layers,
  Split,
  Zap,
} from 'lucide-react';

interface WaveformViewerProps {
  samples: TimeSample[];
  markers: SwitchingMarker[];
  cursorTimeSec: number;
  onCursorChange: (timeSec: number) => void;
  topologyId: TopologyId;
}

interface TrackDefinition {
  id: string;
  name: string;
  symbol: string;
  unit: string;
  color: string;
  getValue: (s: TimeSample) => number;
  formatValue: (v: number) => string;
}

export const WaveformViewer: React.FC<WaveformViewerProps> = ({
  samples,
  markers,
  cursorTimeSec,
  onCursorChange,
  topologyId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Layout mode: 'SEPARATED' (dedicated subplot per waveform) vs 'COMBINED' (overlay)
  const [layoutMode, setLayoutMode] = useState<'SEPARATED' | 'COMBINED'>('SEPARATED');

  // Trace toggles
  const [showVs, setShowVs] = useState(true);
  const [showVo, setShowVo] = useState(true);
  const [showGate, setShowGate] = useState(true);
  const [showIo, setShowIo] = useState(true);
  const [showVR, setShowVR] = useState(true);
  const [showVL, setShowVL] = useState(true);
  const [showIs, setShowIs] = useState(true);
  const [showDeviceI, setShowDeviceI] = useState(true);

  // Selected device for device current trace
  const [selectedDevice, setSelectedDevice] = useState<string>('AUTO');

  const [showGrid, setShowGrid] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [timeUnit, setTimeUnit] = useState<'ANGLE' | 'TIME'>('ANGLE');

  // Zoom and Pan
  const [zoomX, setZoomX] = useState(1);
  const [panX, setPanX] = useState(0);

  // Canvas width state (responsive)
  const [canvasWidth, setCanvasWidth] = useState(880);

  // Hover state for HUD
  const [hoverSample, setHoverSample] = useState<TimeSample | null>(null);

  const totalDuration = samples.length > 0 ? samples[samples.length - 1].time : 0.04;
  const isControlled = topologyId.includes('controlled') || topologyId.includes('semi');

  // Detect available devices from samples
  const availableDevices = useMemo(() => {
    if (samples.length === 0 || !samples[0].devices) return [];
    return Object.keys(samples[0].devices);
  }, [samples]);

  // Active device ID
  const activeDeviceId = useMemo(() => {
    if (selectedDevice !== 'AUTO' && availableDevices.includes(selectedDevice)) {
      return selectedDevice;
    }
    if (availableDevices.includes('T1')) return 'T1';
    if (availableDevices.includes('D1')) return 'D1';
    return availableDevices[0] || 'D1';
  }, [selectedDevice, availableDevices]);

  // Active gate key
  const activeGateKey = useMemo(() => {
    if (samples.length === 0 || !samples[0].gatePulses) return 'T1';
    const keys = Object.keys(samples[0].gatePulses);
    if (keys.includes('T1')) return 'T1';
    return keys[0] || 'T1';
  }, [samples]);

  // Resize observer to ensure crystal-clear sharp canvas
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      const w = container.clientWidth - 32; // padding offset
      if (w > 200) setCanvasWidth(w);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Find sample closest to cursor
  const activeSample = useMemo(() => {
    if (hoverSample) return hoverSample;
    if (samples.length === 0) return null;
    let closest = samples[0];
    let minDiff = Math.abs(samples[0].time - cursorTimeSec);
    for (let i = 1; i < samples.length; i++) {
      const diff = Math.abs(samples[i].time - cursorTimeSec);
      if (diff < minDiff) {
        minDiff = diff;
        closest = samples[i];
      }
    }
    return closest;
  }, [samples, cursorTimeSec, hoverSample]);

  // Build active tracks for SEPARATED mode
  const separatedTracks = useMemo<TrackDefinition[]>(() => {
    const list: TrackDefinition[] = [];

    if (showVs) {
      list.push({
        id: 'vs',
        name: 'Source Voltage',
        symbol: 'vs',
        unit: 'V',
        color: '#38bdf8', // Sky Blue
        getValue: s => s.vs,
        formatValue: v => `${v.toFixed(1)} V`,
      });
    }

    if (showVo) {
      list.push({
        id: 'vo',
        name: 'Output Voltage',
        symbol: 'vo',
        unit: 'V',
        color: '#34d399', // Emerald Green
        getValue: s => s.vo,
        formatValue: v => `${v.toFixed(1)} V`,
      });
    }

    if (showGate && isControlled) {
      list.push({
        id: 'gate',
        name: `Gate Trigger Pulse (${activeGateKey})`,
        symbol: 'v_gate',
        unit: '',
        color: '#f43f5e', // Rose Red
        getValue: s => s.gatePulses[activeGateKey] ?? (Object.values(s.gatePulses)[0] || 0),
        formatValue: v => (v > 0.5 ? '1 (TRIGGER)' : '0 (OFF)'),
      });
    }

    if (showIo) {
      list.push({
        id: 'io',
        name: 'Load Current',
        symbol: 'io',
        unit: 'A',
        color: '#f59e0b', // Amber
        getValue: s => s.io,
        formatValue: v => `${v.toFixed(2)} A`,
      });
    }

    if (showVR) {
      list.push({
        id: 'vR',
        name: 'Resistor Voltage',
        symbol: 'vR',
        unit: 'V',
        color: '#fb923c', // Orange
        getValue: s => s.vR,
        formatValue: v => `${v.toFixed(1)} V`,
      });
    }

    if (showVL) {
      list.push({
        id: 'vL',
        name: 'Inductor Voltage',
        symbol: 'vL',
        unit: 'V',
        color: '#c084fc', // Purple
        getValue: s => s.vL,
        formatValue: v => `${v.toFixed(1)} V`,
      });
    }

    if (showIs) {
      list.push({
        id: 'is',
        name: 'Source Current',
        symbol: 'is',
        unit: 'A',
        color: '#ec4899', // Pink
        getValue: s => s.is,
        formatValue: v => `${v.toFixed(2)} A`,
      });
    }

    if (showDeviceI) {
      list.push({
        id: 'devI',
        name: `Device Current (${activeDeviceId})`,
        symbol: `i_${activeDeviceId}`,
        unit: 'A',
        color: '#2dd4bf', // Electric Teal
        getValue: s => (s.devices[activeDeviceId] ? s.devices[activeDeviceId].current : 0),
        formatValue: v => `${v.toFixed(2)} A`,
      });
    }

    return list;
  }, [
    showVs,
    showVo,
    showGate,
    isControlled,
    activeGateKey,
    showIo,
    showVR,
    showVL,
    showIs,
    showDeviceI,
    activeDeviceId,
  ]);

  // Compute canvas height based on layout mode and track count
  const canvasHeight = useMemo(() => {
    if (layoutMode === 'COMBINED') {
      return 520;
    }
    const trackH = 92;
    const gap = 16;
    const paddingTotal = 75;
    return Math.max(500, paddingTotal + separatedTracks.length * (trackH + gap));
  }, [layoutMode, separatedTracks.length]);

  // Handle canvas mouse move for interactive scrubbing
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || samples.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const paddingLeft = 65;
    const paddingRight = 20;
    const plotWidth = canvas.width - paddingLeft - paddingRight;

    // Normalizing coordinates accounting for CSS scaling vs canvas resolution
    const scaleX = canvas.width / rect.width;
    const scaledX = x * scaleX;

    if (scaledX < paddingLeft || scaledX > canvas.width - paddingRight) {
      setHoverSample(null);
      return;
    }

    const normX = (scaledX - paddingLeft) / plotWidth;
    const visibleDuration = totalDuration / zoomX;
    const tStart = panX * (totalDuration - visibleDuration);
    const targetTime = tStart + normX * visibleDuration;

    const idx = Math.min(
      samples.length - 1,
      Math.max(0, Math.round((targetTime / totalDuration) * (samples.length - 1)))
    );
    setHoverSample(samples[idx]);

    if (e.buttons === 1) {
      onCursorChange(targetTime);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoverSample) {
      onCursorChange(hoverSample.time);
    }
  };

  const handleMouseLeave = () => {
    setHoverSample(null);
  };

  // Export plot as PNG
  const exportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${topologyId}-waveforms-separated.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Main Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || samples.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#080c14'; // Dark oscilloscope canvas background
    ctx.fillRect(0, 0, width, height);

    const paddingLeft = 68;
    const paddingRight = 20;
    const paddingTop = 32;
    const paddingBottom = 42;

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    const visibleDuration = totalDuration / zoomX;
    const tStart = panX * (totalDuration - visibleDuration);
    const tEnd = tStart + visibleDuration;

    // Filter samples in view
    const viewSamples = samples.filter(s => s.time >= tStart && s.time <= tEnd);
    if (viewSamples.length < 2) return;

    // Helper to map time to screen X
    const timeToX = (t: number) => {
      return paddingLeft + ((t - tStart) / visibleDuration) * plotWidth;
    };

    // ==========================================
    // RENDER MODE 1: SEPARATED SUBPLOTS
    // ==========================================
    if (layoutMode === 'SEPARATED') {
      const numTracks = separatedTracks.length;
      if (numTracks === 0) return;

      const gap = 16;
      const trackHeight = (plotHeight - gap * (numTracks - 1)) / numTracks;

      separatedTracks.forEach((track, idx) => {
        const tTop = paddingTop + idx * (trackHeight + gap);

        // 1. Draw track panel container
        ctx.fillStyle = '#0b111e';
        ctx.fillRect(paddingLeft, tTop, plotWidth, trackHeight);

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.strokeRect(paddingLeft, tTop, plotWidth, trackHeight);

        // 2. Compute Track Min/Max
        let minVal = 0;
        let maxVal = 1;

        if (track.id === 'gate') {
          minVal = 0;
          maxVal = 1.2;
        } else {
          let tMin = Infinity;
          let tMax = -Infinity;
          viewSamples.forEach(s => {
            const val = track.getValue(s);
            if (val < tMin) tMin = val;
            if (val > tMax) tMax = val;
          });

          // Extra check for 3-phase source voltage
          if (track.id === 'vs' && topologyId.startsWith('3ph')) {
            viewSamples.forEach(s => {
              if (s.vsb !== undefined) {
                tMin = Math.min(tMin, s.vsb, s.vsc || 0);
                tMax = Math.max(tMax, s.vsb, s.vsc || 0);
              }
            });
          }

          if (tMin === Infinity) tMin = 0;
          if (tMax === -Infinity) tMax = 1;

          // Padding margin
          const span = Math.max(0.5, tMax - tMin);
          maxVal = tMax + 0.15 * span;
          minVal = tMin - 0.15 * span;

          // Ensure zero baseline is always in view for voltages/currents
          if (minVal > 0 && minVal < maxVal * 0.3) minVal = 0;
          if (maxVal < 0 && maxVal > minVal * 0.3) maxVal = 0;
        }

        const trackY = (v: number) => {
          return tTop + (1 - (v - minVal) / (maxVal - minVal)) * trackHeight;
        };

        // 3. Grid lines
        if (showGrid) {
          ctx.strokeStyle = '#172236';
          ctx.lineWidth = 0.8;
          ctx.setLineDash([3, 3]);

          // Horizontal grid
          for (let g = 1; g < 4; g++) {
            const gy = tTop + (g / 4) * trackHeight;
            ctx.beginPath();
            ctx.moveTo(paddingLeft, gy);
            ctx.lineTo(paddingLeft + plotWidth, gy);
            ctx.stroke();
          }

          // Vertical grid (synchronized)
          for (let g = 1; g < 8; g++) {
            const gx = paddingLeft + (g / 8) * plotWidth;
            ctx.beginPath();
            ctx.moveTo(gx, tTop);
            ctx.lineTo(gx, tTop + trackHeight);
            ctx.stroke();
          }
          ctx.setLineDash([]);
        }

        // 4. Zero reference baseline
        if (minVal <= 0 && maxVal >= 0) {
          const zeroY = trackY(0);
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(paddingLeft, zeroY);
          ctx.lineTo(paddingLeft + plotWidth, zeroY);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // 5. Draw Waveform Trace
        ctx.strokeStyle = track.color;
        ctx.lineWidth = track.id === 'gate' ? 2 : 2.2;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        viewSamples.forEach((s, sIdx) => {
          const x = timeToX(s.time);
          const y = trackY(track.getValue(s));
          if (sIdx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // If 3-phase Source Voltage, also draw vsb and vsc lightly
        if (track.id === 'vs' && topologyId.startsWith('3ph') && viewSamples[0].vsb !== undefined) {
          ctx.strokeStyle = '#eab308'; // Amber (Phase B)
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          viewSamples.forEach((s, sIdx) => {
            const x = timeToX(s.time);
            const y = trackY(s.vsb || 0);
            if (sIdx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();

          ctx.strokeStyle = '#a855f7'; // Purple (Phase C)
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          viewSamples.forEach((s, sIdx) => {
            const x = timeToX(s.time);
            const y = trackY(s.vsc || 0);
            if (sIdx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        }

        // 6. Y-Axis Markings on Left
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';

        if (track.id === 'gate') {
          ctx.fillText('1 (ON)', paddingLeft - 6, tTop + 14);
          ctx.fillText('0 (OFF)', paddingLeft - 6, tTop + trackHeight - 4);
        } else {
          const topVal = maxVal >= 100 || maxVal <= -100 ? maxVal.toFixed(0) : maxVal.toFixed(1);
          const botVal = minVal >= 100 || minVal <= -100 ? minVal.toFixed(0) : minVal.toFixed(1);
          ctx.fillText(`${topVal}${track.unit}`, paddingLeft - 6, tTop + 12);

          if (minVal < 0 && maxVal > 0) {
            const zeroY = trackY(0);
            ctx.fillStyle = '#cbd5e1';
            ctx.fillText(`0${track.unit}`, paddingLeft - 6, zeroY + 4);
            ctx.fillStyle = '#94a3b8';
          }
          ctx.fillText(`${botVal}${track.unit}`, paddingLeft - 6, tTop + trackHeight - 4);
        }

        // 7. Header Label Bar inside each Subplot (Top-Left and Top-Right)
        // Dot indicator
        ctx.fillStyle = track.color;
        ctx.beginPath();
        ctx.arc(paddingLeft + 12, tTop + 12, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Track Title
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${track.name.toUpperCase()}`, paddingLeft + 22, tTop + 15);

        // Instantaneous readout badge at cursor (Top-Right)
        if (activeSample) {
          const instVal = track.getValue(activeSample);
          ctx.textAlign = 'right';
          ctx.fillStyle = track.color;
          ctx.font = 'bold 11px monospace';
          ctx.fillText(`${track.symbol} = ${track.formatValue(instVal)}`, paddingLeft + plotWidth - 10, tTop + 15);
        }
      });
    }

    // ==========================================
    // RENDER MODE 2: COMBINED OVERLAY
    // ==========================================
    else {
      const numPanels = showGate && isControlled ? 3 : 2;
      const gap = 16;
      const panelHeight = (plotHeight - gap * (numPanels - 1)) / numPanels;

      // Determine Y-Scales for Voltages Panel
      let maxV = 100;
      let minV = -100;
      viewSamples.forEach(s => {
        if (showVs) {
          maxV = Math.max(maxV, s.vs, s.vab || 0);
          minV = Math.min(minV, s.vs, s.vab || 0);
        }
        if (showVo) {
          maxV = Math.max(maxV, s.vo);
          minV = Math.min(minV, s.vo);
        }
        if (showVR) {
          maxV = Math.max(maxV, s.vR);
          minV = Math.min(minV, s.vR);
        }
        if (showVL) {
          maxV = Math.max(maxV, s.vL);
          minV = Math.min(minV, s.vL);
        }
      });
      const vSpan = Math.max(50, maxV - minV);
      maxV += 0.12 * vSpan;
      minV -= 0.12 * vSpan;

      // Determine Y-Scales for Currents Panel
      let maxI = 1;
      let minI = 0;
      viewSamples.forEach(s => {
        if (showIo) {
          maxI = Math.max(maxI, s.io);
          minI = Math.min(minI, s.io);
        }
        if (showIs) {
          maxI = Math.max(maxI, s.is);
          minI = Math.min(minI, s.is);
        }
        if (showDeviceI && s.devices[activeDeviceId]) {
          maxI = Math.max(maxI, s.devices[activeDeviceId].current);
          minI = Math.min(minI, s.devices[activeDeviceId].current);
        }
      });
      const iSpan = Math.max(1, maxI - minI);
      maxI += 0.15 * iSpan;
      minI -= 0.15 * iSpan;

      const vToY = (v: number) => {
        return paddingTop + (1 - (v - minV) / (maxV - minV)) * panelHeight;
      };

      const iToY = (i: number) => {
        const pTop = paddingTop + panelHeight + gap;
        return pTop + (1 - (i - minI) / (maxI - minI)) * panelHeight;
      };

      const gToY = (g: number) => {
        const pTop = paddingTop + 2 * (panelHeight + gap);
        return pTop + (1 - g) * panelHeight * 0.7 + panelHeight * 0.15;
      };

      // Draw Grid & Panel Borders
      for (let p = 0; p < numPanels; p++) {
        const pTop = paddingTop + p * (panelHeight + gap);
        ctx.fillStyle = '#0b111e';
        ctx.fillRect(paddingLeft, pTop, plotWidth, panelHeight);

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.strokeRect(paddingLeft, pTop, plotWidth, panelHeight);

        if (showGrid) {
          for (let g = 1; g < 4; g++) {
            const y = pTop + (g / 4) * panelHeight;
            ctx.beginPath();
            ctx.strokeStyle = '#172236';
            ctx.setLineDash([3, 3]);
            ctx.moveTo(paddingLeft, y);
            ctx.lineTo(paddingLeft + plotWidth, y);
            ctx.stroke();
          }
          for (let g = 1; g < 8; g++) {
            const x = paddingLeft + (g / 8) * plotWidth;
            ctx.beginPath();
            ctx.strokeStyle = '#172236';
            ctx.setLineDash([3, 3]);
            ctx.moveTo(x, pTop);
            ctx.lineTo(x, pTop + panelHeight);
            ctx.stroke();
          }
          ctx.setLineDash([]);
        }
      }

      // Zero Axis lines
      if (minV <= 0 && maxV >= 0) {
        const zeroY = vToY(0);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(paddingLeft, zeroY);
        ctx.lineTo(paddingLeft + plotWidth, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const p2Top = paddingTop + panelHeight + gap;
      if (minI <= 0 && maxI >= 0) {
        const zeroY = iToY(0);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(paddingLeft, zeroY);
        ctx.lineTo(paddingLeft + plotWidth, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Trace 1: vs
      if (showVs) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        viewSamples.forEach((s, idx) => {
          const x = timeToX(s.time);
          const y = vToY(s.vs);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      // Trace 2: vo
      if (showVo) {
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        viewSamples.forEach((s, idx) => {
          const x = timeToX(s.time);
          const y = vToY(s.vo);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      // Trace 3: vR
      if (showVR) {
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        viewSamples.forEach((s, idx) => {
          const x = timeToX(s.time);
          const y = vToY(s.vR);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Trace 4: vL
      if (showVL) {
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        viewSamples.forEach((s, idx) => {
          const x = timeToX(s.time);
          const y = vToY(s.vL);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      // Trace 5: io
      if (showIo) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        viewSamples.forEach((s, idx) => {
          const x = timeToX(s.time);
          const y = iToY(s.io);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      // Trace 6: is
      if (showIs) {
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        viewSamples.forEach((s, idx) => {
          const x = timeToX(s.time);
          const y = iToY(s.is);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      // Trace 7: device current
      if (showDeviceI) {
        ctx.strokeStyle = '#2dd4bf';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        viewSamples.forEach((s, idx) => {
          const x = timeToX(s.time);
          const cur = s.devices[activeDeviceId]?.current || 0;
          const y = iToY(cur);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Panel 3: Gate Pulses
      if (showGate && numPanels === 3) {
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        viewSamples.forEach((s, idx) => {
          const x = timeToX(s.time);
          const pulse = s.gatePulses[activeGateKey] || 0;
          const y = gToY(pulse);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      // Panel Headers
      ctx.textAlign = 'left';
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('CH 1: VOLTAGES (vs, vo, vR, vL)', paddingLeft + 10, paddingTop + 15);

      ctx.fillStyle = '#f59e0b';
      ctx.fillText(`CH 2: CURRENTS (io, is, i_${activeDeviceId})`, paddingLeft + 10, p2Top + 15);

      if (numPanels === 3) {
        const p3Top = paddingTop + 2 * (panelHeight + gap);
        ctx.fillStyle = '#f43f5e';
        ctx.fillText(`CH 3: GATE TRIGGER PULSE (${activeGateKey})`, paddingLeft + 10, p3Top + 15);
      }

      // Y-Axis Labels
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${maxV.toFixed(0)}V`, paddingLeft - 6, paddingTop + 12);
      ctx.fillText(`${minV.toFixed(0)}V`, paddingLeft - 6, paddingTop + panelHeight - 4);

      ctx.fillText(`${maxI.toFixed(1)}A`, paddingLeft - 6, p2Top + 12);
      ctx.fillText(`${minI.toFixed(1)}A`, paddingLeft - 6, p2Top + panelHeight - 4);
    }

    // ==========================================
    // SYNCHRONIZED TIMING & EVENT MARKERS
    // ==========================================
    if (showMarkers) {
      markers.forEach(m => {
        if (m.timeSec >= tStart && m.timeSec <= tEnd) {
          const mx = timeToX(m.timeSec);
          const mColor =
            m.type === 'FIRING'
              ? '#f43f5e'
              : m.type === 'EXTINCTION'
              ? '#eab308'
              : m.type === 'COMMUTATION'
              ? '#38bdf8'
              : '#64748b';

          ctx.strokeStyle = mColor;
          ctx.lineWidth = 1.4;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(mx, paddingTop);
          ctx.lineTo(mx, paddingTop + plotHeight);
          ctx.stroke();
          ctx.setLineDash([]);

          // Marker Label Pin Badge at top
          ctx.fillStyle = mColor;
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(m.label, mx, paddingTop - 8);
        }
      });
    }

    // ==========================================
    // SCRUB CURSOR LINE & POINTER
    // ==========================================
    const curX = timeToX(cursorTimeSec);
    if (curX >= paddingLeft && curX <= paddingLeft + plotWidth) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(curX, paddingTop - 4);
      ctx.lineTo(curX, paddingTop + plotHeight);
      ctx.stroke();

      // Top triangle pointer
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(curX - 6, paddingTop - 12);
      ctx.lineTo(curX + 6, paddingTop - 12);
      ctx.lineTo(curX, paddingTop - 4);
      ctx.closePath();
      ctx.fill();
    }

    // ==========================================
    // BOTTOM X-AXIS TICKS & PHASE MARKINGS
    // ==========================================
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    const numXTicks = 8;
    for (let k = 0; k <= numXTicks; k++) {
      const tVal = tStart + (k / numXTicks) * visibleDuration;
      const x = paddingLeft + (k / numXTicks) * plotWidth;
      const angleVal = (tVal * 50 * 360) % 360;

      const label = timeUnit === 'ANGLE' ? `${Math.round(angleVal)}°` : `${(tVal * 1000).toFixed(1)}ms`;
      ctx.fillText(label, x, paddingTop + plotHeight + 20);
    }

    // X-Axis Title
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText(
      timeUnit === 'ANGLE' ? 'ELECTRICAL PHASE ANGLE θ (DEGREES)' : 'SIMULATION TIME t (MILLISECONDS)',
      paddingLeft + plotWidth / 2,
      paddingTop + plotHeight + 35
    );
  }, [
    samples,
    markers,
    cursorTimeSec,
    layoutMode,
    separatedTracks,
    showVs,
    showVo,
    showGate,
    showIo,
    showVR,
    showVL,
    showIs,
    showDeviceI,
    activeDeviceId,
    activeGateKey,
    showGrid,
    showMarkers,
    timeUnit,
    zoomX,
    panX,
    topologyId,
    canvasWidth,
    canvasHeight,
    activeSample,
  ]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col h-full" ref={containerRef}>
      {/* Top Scope Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 mb-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="font-semibold text-slate-100 text-sm tracking-wide">Multi-Channel Digital Oscilloscope</h3>
          </div>

          {/* Layout Mode Toggle: Separated vs Combined */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setLayoutMode('SEPARATED')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-mono transition-colors ${
                layoutMode === 'SEPARATED' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Separated Subplots Mode: Dedicated channel for each waveform"
            >
              <Split className="w-3.5 h-3.5" />
              <span>Separated Channels</span>
            </button>
            <button
              onClick={() => setLayoutMode('COMBINED')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-mono transition-colors ${
                layoutMode === 'COMBINED' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Combined Overlay Mode: Grouped voltages and currents"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Overlay Mode</span>
            </button>
          </div>

          {/* Time/Angle Units */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setTimeUnit('ANGLE')}
              className={`px-2 py-1 rounded font-mono ${
                timeUnit === 'ANGLE' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Angle (θ)
            </button>
            <button
              onClick={() => setTimeUnit('TIME')}
              className={`px-2 py-1 rounded font-mono ${
                timeUnit === 'TIME' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Time (ms)
            </button>
          </div>
        </div>

        {/* Zoom & Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomX(prev => Math.min(8, prev * 1.5))}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
            title="Zoom In X-Axis"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomX(prev => Math.max(1, prev / 1.5))}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
            title="Zoom Out X-Axis"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setZoomX(1);
              setPanX(0);
            }}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
            title="Reset Zoom (1.0x)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-slate-400 px-1">{zoomX.toFixed(1)}x</span>

          <button
            onClick={exportPng}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
            title="Export Oscilloscope Plot as PNG"
          >
            <Download className="w-3.5 h-3.5" />
            Export PNG
          </button>
        </div>
      </div>

      {/* Waveform Trace Visibility & Device Selection Bar */}
      <div className="flex flex-wrap items-center gap-3 py-2 px-3 bg-slate-950/80 border border-slate-800/90 rounded-lg text-xs mb-2">
        <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1 font-semibold">
          <Eye className="w-3.5 h-3.5 text-cyan-400" /> Channels:
        </span>

        {/* 1. vs */}
        <label className="flex items-center gap-1.5 cursor-pointer text-cyan-400 font-mono font-medium hover:text-cyan-300">
          <input
            type="checkbox"
            checked={showVs}
            onChange={e => setShowVs(e.target.checked)}
            className="rounded border-slate-700 text-cyan-500 focus:ring-0"
          />
          vs (Source)
        </label>

        {/* 2. vo */}
        <label className="flex items-center gap-1.5 cursor-pointer text-emerald-400 font-mono font-medium hover:text-emerald-300">
          <input
            type="checkbox"
            checked={showVo}
            onChange={e => setShowVo(e.target.checked)}
            className="rounded border-slate-700 text-emerald-500 focus:ring-0"
          />
          vo (Output)
        </label>

        {/* 3. Gate */}
        {isControlled && (
          <label className="flex items-center gap-1.5 cursor-pointer text-rose-400 font-mono font-medium hover:text-rose-300">
            <input
              type="checkbox"
              checked={showGate}
              onChange={e => setShowGate(e.target.checked)}
              className="rounded border-slate-700 text-rose-500 focus:ring-0"
            />
            v_gate ({activeGateKey})
          </label>
        )}

        {/* 4. io */}
        <label className="flex items-center gap-1.5 cursor-pointer text-amber-400 font-mono font-medium hover:text-amber-300">
          <input
            type="checkbox"
            checked={showIo}
            onChange={e => setShowIo(e.target.checked)}
            className="rounded border-slate-700 text-amber-500 focus:ring-0"
          />
          io (Load Current)
        </label>

        {/* 5. vR */}
        <label className="flex items-center gap-1.5 cursor-pointer text-orange-400 font-mono font-medium hover:text-orange-300">
          <input
            type="checkbox"
            checked={showVR}
            onChange={e => setShowVR(e.target.checked)}
            className="rounded border-slate-700 text-orange-500 focus:ring-0"
          />
          vR (Resistor)
        </label>

        {/* 6. vL */}
        <label className="flex items-center gap-1.5 cursor-pointer text-purple-400 font-mono font-medium hover:text-purple-300">
          <input
            type="checkbox"
            checked={showVL}
            onChange={e => setShowVL(e.target.checked)}
            className="rounded border-slate-700 text-purple-500 focus:ring-0"
          />
          vL (Inductor)
        </label>

        {/* 7. is */}
        <label className="flex items-center gap-1.5 cursor-pointer text-pink-400 font-mono font-medium hover:text-pink-300">
          <input
            type="checkbox"
            checked={showIs}
            onChange={e => setShowIs(e.target.checked)}
            className="rounded border-slate-700 text-pink-500 focus:ring-0"
          />
          is (Line Current)
        </label>

        {/* 8. Device Current & Picker */}
        <div className="flex items-center gap-1 bg-slate-900 border border-teal-500/30 px-2 py-0.5 rounded">
          <label className="flex items-center gap-1 cursor-pointer text-teal-400 font-mono font-medium hover:text-teal-300">
            <input
              type="checkbox"
              checked={showDeviceI}
              onChange={e => setShowDeviceI(e.target.checked)}
              className="rounded border-slate-700 text-teal-500 focus:ring-0"
            />
            i_dev:
          </label>
          <select
            value={activeDeviceId}
            onChange={e => setSelectedDevice(e.target.value)}
            className="bg-slate-950 text-teal-300 text-[11px] font-mono border-0 rounded px-1 py-0.5 focus:ring-1 focus:ring-teal-400"
          >
            {availableDevices.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Options */}
        <div className="flex items-center gap-2 ml-auto">
          <label className="flex items-center gap-1 cursor-pointer text-slate-400 font-mono text-[11px]">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={e => setShowGrid(e.target.checked)}
              className="rounded"
            />
            Grid
          </label>
          <label className="flex items-center gap-1 cursor-pointer text-slate-400 font-mono text-[11px]">
            <input
              type="checkbox"
              checked={showMarkers}
              onChange={e => setShowMarkers(e.target.checked)}
              className="rounded"
            />
            Markers
          </label>
        </div>
      </div>

      {/* Main Canvas Viewport Container */}
      <div className="flex-1 w-full relative min-h-[460px] max-h-[820px] overflow-y-auto bg-slate-950 rounded-lg border border-slate-800 shadow-inner">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="w-full cursor-crosshair block"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
        />

        {/* Interactive Scrubbing Cursor HUD */}
        {activeSample && (
          <div className="sticky bottom-2 ml-auto mr-2 w-fit bg-slate-950/95 border border-cyan-500/40 rounded-lg p-2.5 text-[11px] font-mono shadow-2xl backdrop-blur-md pointer-events-none flex flex-col gap-1 z-20">
            <div className="text-cyan-300 font-bold border-b border-slate-800 pb-1 flex justify-between gap-6">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> LIVE OSCILLOSCOPE READOUT
              </span>
              <span>
                θ = {Math.round(activeSample.angleDeg)}° | {(activeSample.time * 1000).toFixed(2)} ms
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 mt-0.5">
              <span className="text-cyan-400">vs: {activeSample.vs.toFixed(1)} V</span>
              <span className="text-emerald-400">vo: {activeSample.vo.toFixed(1)} V</span>
              <span className="text-amber-400">io: {activeSample.io.toFixed(2)} A</span>
              <span className="text-pink-400">is: {activeSample.is.toFixed(2)} A</span>
              <span className="text-orange-400">vR: {activeSample.vR.toFixed(1)} V</span>
              <span className="text-purple-400">vL: {activeSample.vL.toFixed(1)} V</span>
              <span className="text-teal-400">
                i_{activeDeviceId}: {(activeSample.devices[activeDeviceId]?.current || 0).toFixed(2)} A
              </span>
              {isControlled && (
                <span className="text-rose-400">
                  gate: {activeSample.gatePulses[activeGateKey] ? 'HIGH' : 'LOW'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
