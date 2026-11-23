import React, { useMemo } from 'react';
import type { SurvivalCurvePoint } from '../types/telemetry';

interface SurvivalCurveGraphProps {
  data: SurvivalCurvePoint[];
  currentTime: number;
  duration: number;
  onSeek: (t: number) => void;
}

export const SurvivalCurveGraph: React.FC<SurvivalCurveGraphProps> = ({
  data,
  currentTime,
  duration,
  onSeek
}) => {
  const width = 640;
  const height = 75;
  const padding = 15;

  const { totalPath, humansPath, botsPath } = useMemo(() => {
    if (!data || data.length === 0) return { totalPath: '', humansPath: '', botsPath: '' };
    const maxTotal = Math.max(...data.map(d => d.total_alive), 1);
    const getX = (t: number) => padding + (t / Math.max(duration, 1)) * (width - 2 * padding);
    const getY = (count: number) => height - padding - (count / maxTotal) * (height - 2 * padding);

    const tp = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.t).toFixed(1)} ${getY(d.total_alive).toFixed(1)}`).join(' ');
    const hp = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.t).toFixed(1)} ${getY(d.alive_humans).toFixed(1)}`).join(' ');
    const bp = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.t).toFixed(1)} ${getY(d.alive_bots).toFixed(1)}`).join(' ');

    return { totalPath: tp, humansPath: hp, botsPath: bp };
  }, [data, duration]);

  if (!data || data.length === 0) return null;

  const getX = (t: number) => padding + (t / Math.max(duration, 1)) * (width - 2 * padding);
  const currentX = getX(currentTime);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 shadow-lg">
      <div className="flex items-center justify-between text-[10px] mb-0.5 px-0.5">
        <span className="font-semibold text-slate-300 flex items-center gap-1.5">
          📈 Player Survivorship Cohort Decay
        </span>
        <div className="flex items-center gap-3 text-[9px]">
          <span className="flex items-center gap-1 text-cyan-400">
            <span className="w-2 h-0.5 bg-cyan-400 inline-block"></span> Humans
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <span className="w-2 h-0.5 bg-amber-400 inline-block"></span> Bots
          </span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-0.5 bg-emerald-400 inline-block"></span> Total Alive
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden cursor-crosshair" onClick={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        onSeek(clickRatio * duration);
      }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-10">
          {/* Grid lines */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" strokeWidth="0.8" />
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#334155" strokeWidth="0.8" strokeDasharray="2,2" />

          {/* Curves */}
          <path d={totalPath} fill="none" stroke="#10b981" strokeWidth="2" opacity="0.8" />
          <path d={humansPath} fill="none" stroke="#06b6d4" strokeWidth="1.5" />
          <path d={botsPath} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,3" />

          {/* Current playback scrubber line */}
          <line x1={currentX} y1={padding / 2} x2={currentX} y2={height - padding / 2} stroke="#f43f5e" strokeWidth="1.5" />
          <circle cx={currentX} cy={padding / 2} r="3" fill="#f43f5e" />
        </svg>
      </div>
    </div>
  );
};
