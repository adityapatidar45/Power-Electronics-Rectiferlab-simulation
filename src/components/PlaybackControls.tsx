import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gauge,
} from 'lucide-react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  cursorTimeSec: number;
  totalDurationSec: number;
  onCursorChange: (t: number) => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  frequency: number;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  onTogglePlay,
  cursorTimeSec,
  totalDurationSec,
  onCursorChange,
  playbackSpeed,
  onSpeedChange,
  frequency,
}) => {
  const currentAngleDeg = (cursorTimeSec * frequency * 360) % 360;

  const stepTime = (deltaDeg: number) => {
    const period = 1 / frequency;
    const deltaSec = (deltaDeg / 360) * period;
    let nextT = cursorTimeSec + deltaSec;
    if (nextT < 0) nextT = 0;
    if (nextT > totalDurationSec) nextT = totalDurationSec;
    onCursorChange(nextT);
  };

  const handleReset = () => {
    onCursorChange(0);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-xl flex flex-wrap items-center justify-between gap-4 text-xs">
      {/* Play / Pause & Steppers */}
      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePlay}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
            isPlaying
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
          }`}
          title="Play / Pause Animation (Spacebar)"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{isPlaying ? 'Pause' : 'Run Live'}</span>
        </button>

        <button
          onClick={handleReset}
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
          title="Reset to 0° (Key: R)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-slate-800 mx-1" />

        <button
          onClick={() => stepTime(-10)}
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
          title="Step Backward 10°"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => stepTime(-1)}
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
          title="Step Backward 1° (Left Arrow)"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => stepTime(1)}
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
          title="Step Forward 1° (Right Arrow)"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => stepTime(10)}
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
          title="Step Forward 10°"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Time & Angle Scrubber Slider */}
      <div className="flex-1 min-w-[200px] flex items-center gap-3">
        <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
        <input
          type="range"
          min="0"
          max={totalDurationSec}
          step={totalDurationSec / 1000}
          value={cursorTimeSec}
          onChange={e => onCursorChange(Number(e.target.value))}
          className="w-full accent-cyan-400 cursor-pointer"
        />
        <div className="flex items-center gap-2 font-mono shrink-0">
          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-400 font-bold">
            θ = {Math.round(currentAngleDeg)}°
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
            {(cursorTimeSec * 1000).toFixed(1)} ms
          </span>
        </div>
      </div>

      {/* Speed Controls */}
      <div className="flex items-center gap-2">
        <Gauge className="w-4 h-4 text-slate-400" />
        <span className="text-slate-400 text-[11px]">Speed:</span>
        {[0.2, 0.5, 1.0, 2.0].map(s => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`px-2 py-0.5 rounded font-mono text-[11px] ${
              playbackSpeed === s
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
};
