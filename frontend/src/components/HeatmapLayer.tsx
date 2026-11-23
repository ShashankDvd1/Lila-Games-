import React, { useEffect, useRef } from 'react';
import simpleheat from 'simpleheat';
import type { HeatmapPoint } from '../types/telemetry';

interface HeatmapLayerProps {
  points: HeatmapPoint[];
  mode: 'KillZones' | 'DeathZones' | 'Traffic';
  opacity?: number;
  radius?: number;
}

const HEATMAP_GRADIENTS: Record<string, Record<number, string>> = {
  KillZones: { 0.2: '#fef08a', 0.5: '#f97316', 0.8: '#ef4444', 1.0: '#991b1b' },
  DeathZones: { 0.2: '#c084fc', 0.5: '#dc2626', 0.8: '#991b1b', 1.0: '#450a0a' },
  Traffic: { 0.2: '#38bdf8', 0.5: '#34d399', 0.8: '#facc15', 1.0: '#ef4444' }
};

export const HeatmapLayer: React.FC<HeatmapLayerProps> = ({
  points,
  mode,
  opacity = 0.75,
  radius = 20
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, 1024, 1024);

    if (points.length === 0) return;

    // simpleheat can be an ES class or factory function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const HeatConstructor = (simpleheat as any).default || simpleheat;
    let heat: any;
    try {
      heat = new HeatConstructor(canvas);
    } catch {
      heat = HeatConstructor(canvas);
    }
    const data = points.map(p => [p.px, p.py, p.weight]);
    heat.data(data);
    
    const maxVal = Math.max(...points.map(p => p.weight), 1);
    heat.max(maxVal);
    heat.radius(radius, 14);
    heat.gradient(HEATMAP_GRADIENTS[mode] || HEATMAP_GRADIENTS.KillZones);
    heat.draw();
  }, [points, mode, radius]);

  return (
    <canvas
      ref={canvasRef}
      width={1024}
      height={1024}
      style={{ opacity }}
      className="absolute inset-0 pointer-events-none z-[450] w-full h-full"
    />
  );
};
