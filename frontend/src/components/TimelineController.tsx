import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, FastForward, SkipBack, SkipForward } from 'lucide-react';
import type { EventMarker } from '../types/telemetry';

interface TimelineProps {
  duration: number;
  currentTime: number;
  events?: EventMarker[];
  outcomeStatus?: 'VICTORY' | 'DEFEAT';
  outcomeTime?: number;
  outcomeReason?: string;
  onTimeChange: (time: number) => void;
}

export const TimelineController: React.FC<TimelineProps> = ({
  duration,
  currentTime,
  events = [],
  outcomeStatus,
  outcomeTime,
  outcomeReason,
  onTimeChange,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  // Keyboard controls: Space to play/pause, Left/Right arrows to step
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        onTimeChange(Math.min(duration, currentTimeRef.current + 5));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        onTimeChange(Math.max(0, currentTimeRef.current - 5));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duration, onTimeChange]);

  // High-performance 60 FPS animation loop
  useEffect(() => {
    let animId: number;
    let lastTimestamp: number = performance.now();

    const loop = (now: number) => {
      const delta = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      if (isPlaying && duration > 0) {
        const next = currentTimeRef.current + delta * speed;
        if (next >= duration) {
          setIsPlaying(false);
          onTimeChange(duration);
        } else {
          onTimeChange(next);
        }
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, speed, duration, onTimeChange]);

  const togglePlay = useCallback(() => {
    if (currentTime >= duration) {
      onTimeChange(0);
    }
    setIsPlaying(prev => !prev);
  }, [currentTime, duration, onTimeChange]);

  const getEventTickColor = (event: string) => {
    if (event === 'KilledByStorm') return '#a855f7'; // Purple
    if (event.includes('Kill') || event.includes('Killed')) return '#ef4444'; // Red
    if (event === 'Loot') return '#10b981'; // Green
    return '#94a3b8';
  };

  return (
    <div className="flex flex-col gap-1.5 bg-slate-800/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-700/80 shadow-lg text-white">
      {/* Upper row: Controls & Time Readout */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          {/* Reset / Rewind */}
          <button
            onClick={() => { setIsPlaying(false); onTimeChange(0); }}
            title="Rewind to start (0:00)"
            className="p-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-600 transition text-slate-200"
          >
            <RotateCcw size={15} />
          </button>

          {/* Step Back 5s */}
          <button
            onClick={() => onTimeChange(Math.max(0, currentTime - 5))}
            title="Step Back 5s (Left Arrow)"
            className="p-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-600 transition text-slate-200"
          >
            <SkipBack size={15} />
          </button>

          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            className={`p-2 rounded-lg font-bold transition flex items-center justify-center ${isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30'
              }`}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} className="translate-x-0.5" />}
          </button>

          {/* Step Forward 5s */}
          <button
            onClick={() => onTimeChange(Math.min(duration, currentTime + 5))}
            title="Step Forward 5s (Right Arrow)"
            className="p-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-600 transition text-slate-200"
          >
            <SkipForward size={15} />
          </button>

          {/* Speed Multiplier */}
          <div className="flex items-center gap-1 ml-1.5 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-700 text-xs">
            <FastForward size={12} className="text-cyan-400" />
            <select
              value={speed}
              onChange={e => setSpeed(Number(e.target.value))}
              className="bg-transparent text-white outline-none cursor-pointer font-mono font-medium text-[11px]"
            >
              <option value={0.5} className="bg-slate-800">0.5x</option>
              <option value={1} className="bg-slate-800">1.0x</option>
              <option value={2} className="bg-slate-800">2.0x</option>
              <option value={5} className="bg-slate-800">5.0x</option>
              <option value={10} className="bg-slate-800">10.0x</option>
            </select>
          </div>
        </div>

          {/* Right side: Outcome Climax Badge + Elapsed/Total Time */}
          <div className="flex items-center gap-2">
            {outcomeStatus && outcomeTime !== undefined && (
              <button
                onClick={() => onTimeChange(outcomeTime)}
                title={`Jump to Climax: ${outcomeReason || outcomeStatus} at ${formatTime(outcomeTime)}`}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition shadow cursor-pointer border ${outcomeStatus === 'VICTORY'
                    ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950/80 hover:bg-rose-900 border-rose-500/50 text-rose-300'
                  }`}
              >
                <span>{outcomeStatus === 'VICTORY' ? '🏆' : '💀'}</span>
                <span>{outcomeStatus === 'VICTORY' ? 'EXTRACTED' : 'KIA'} ({formatTime(outcomeTime)})</span>
              </button>
            )}

            {/* Elapsed / Total Time */}
            <div className="font-mono text-xs tracking-wider font-semibold text-slate-200 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-700">
              <span className="text-cyan-400">{formatTime(currentTime)}</span>
              <span className="text-slate-500 mx-1.5">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Lower row: Interactive Scrubber with Event Tick Markers */}
        <div className="relative w-full pt-1 pb-1">
          {/* Event Notches on Timeline */}
            { duration > 0 && (events.length > 0 || outcomeTime !== undefined) && (
              <div className="absolute top-1.5 left-0 right-0 h-2.5 pointer-events-none">
                {events.map((ev, i) => {
                  const leftPercent = Math.min(100, Math.max(0, (ev.t / duration) * 100));
                  return (
                    <div
                      key={i}
                      style={{
                        left: `${leftPercent}%`,
                        backgroundColor: getEventTickColor(ev.event),
                      }}
                      title={`${ev.event} at ${formatTime(ev.t)}`}
                      className="absolute w-1 h-2 -translate-x-1/2 rounded-full opacity-70"
                    />
                  );
                })}
                {outcomeTime !== undefined && (
                  <div
                    style={{
                      left: `${Math.min(100, Math.max(0, (outcomeTime / duration) * 100))}%`,
                      backgroundColor: outcomeStatus === 'VICTORY' ? '#10b981' : '#ef4444',
                    }}
                    title={`Climax: ${outcomeStatus} at ${formatTime(outcomeTime)}`}
                    className="absolute w-2 h-3.5 -top-0.5 -translate-x-1/2 rounded-sm shadow-md ring-1 ring-white/70"
                  />
                )}
              </div>
            )}

          {/* Scrub Slider */}
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onChange={e => onTimeChange(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-2.5 bg-slate-700/80 rounded-lg appearance-none transition"
          />
        </div>
      </div>
      );
};

      function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
