import React, { useMemo, useState } from 'react';
import { MapContainer, ImageOverlay, Polyline, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import simpleheat from 'simpleheat';
import { ZoomIn, ZoomOut, Maximize2, User, Layers } from 'lucide-react';
import type {
  PlayerJourney,
  EventMarker,
  CombatEngagement,
  POIMetric,
  ExtractionZone,
  StormRingConfig,
  MacroPlayerPath,
  HeatmapPoint
} from '../types/telemetry';

// Coordinate transform parameters matching backend engine
const MAP_CONFIGS: Record<string, { scale: number; origin_x: number; origin_z: number }> = {
  AmbroseValley: { scale: 900.0, origin_x: -370.0, origin_z: -473.0 },
  GrandRift: { scale: 581.0, origin_x: -290.0, origin_z: -290.0 },
  Lockdown: { scale: 1000.0, origin_x: -500.0, origin_z: -500.0 }
};

export const pixelToWorld = (px: number, py: number, mapId: string, imageSize: number = 1024) => {
  const cfg = MAP_CONFIGS[mapId] || MAP_CONFIGS.AmbroseValley;
  const u = px / imageSize;
  const v = 1.0 - (py / imageSize);
  const x = (u * cfg.scale) + cfg.origin_x;
  const z = (v * cfg.scale) + cfg.origin_z;
  return { x: Number(x.toFixed(1)), z: Number(z.toFixed(1)) };
};

const HEATMAP_GRADIENTS: Record<string, Record<number, string>> = {
  KillZones: { 0.2: '#fef08a', 0.5: '#f97316', 0.8: '#ef4444', 1.0: '#991b1b' },
  DeathZones: { 0.2: '#c084fc', 0.5: '#dc2626', 0.8: '#991b1b', 1.0: '#450a0a' },
  Traffic: { 0.2: '#38bdf8', 0.5: '#34d399', 0.8: '#facc15', 1.0: '#ef4444' }
};

const RARITY_COLORS: Record<string, string> = {
  Common: '#94a3b8',
  Rare: '#38bdf8',
  Epic: '#c084fc',
  Legendary: '#fbbf24'
};

// Distinct AAA Tactical Event Icons for each gameplay event type
const createLootIcon = (rarity: string = 'Common') => {
  const color = RARITY_COLORS[rarity] || '#94a3b8';
  return L.divIcon({
    className: 'custom-loot-marker',
    html: `
      <div style="
        background: rgba(15, 23, 42, 0.95);
        border: 2px solid ${color};
        width: 22px;
        height: 22px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 10px ${color}80, 0 2px 6px rgba(0,0,0,0.8);
        font-size: 11px;
      ">📦</div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
};

const createKillIcon = () => L.divIcon({
  className: 'custom-kill-marker',
  html: `
    <div style="
      background: radial-gradient(circle, #ef4444 0%, #991b1b 100%);
      border: 2px solid #ffffff;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 14px #ef4444, 0 0 24px rgba(239, 68, 68, 0.9);
      font-size: 11px;
    ">⚔️</div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const createDeathIcon = () => L.divIcon({
  className: 'custom-death-marker',
  html: `
    <div style="
      background: rgba(30, 41, 59, 0.95);
      border: 2px solid #dc2626;
      width: 22px;
      height: 22px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 10px rgba(220, 38, 38, 0.8);
      font-size: 11px;
    ">💀</div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

const createStormDeathIcon = () => L.divIcon({
  className: 'custom-storm-marker',
  html: `
    <div style="
      background: radial-gradient(circle, #a855f7 0%, #6b21a8 100%);
      border: 2px solid #f3e8ff;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 14px #a855f7, 0 0 24px rgba(168, 85, 247, 0.9);
      font-size: 12px;
    ">⚡</div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const createPlayerHeadIcon = (
  color: string,
  isBot: boolean,
  headingDeg?: number,
  showSightline: boolean = false
) => {
  const rot = headingDeg || 0;
  const sightlineSvg = showSightline ? `
    <svg style="position: absolute; top: ${isBot ? '-20px' : '-26px'}; left: ${isBot ? '-20px' : '-26px'}; width: ${isBot ? '56px' : '68px'}; height: ${isBot ? '56px' : '68px'}; pointer-events: none; transform: rotate(${rot}deg);" viewBox="0 0 56 56">
      <polygon points="28,28 14,0 42,0" fill="${color}" fill-opacity="${isBot ? '0.2' : '0.45'}" stroke="${color}" stroke-width="${isBot ? '0.8' : '1.8'}" stroke-dasharray="${isBot ? '2,2' : undefined}" />
    </svg>
  ` : '';

  if (!isBot) {
    // Highly Prominent Human Player Marker with animated radar ping and floating badge
    return L.divIcon({
      className: 'human-player-marker',
      html: `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          ${sightlineSvg}
          <div class="human-radar-ping"></div>
          <div style="
            background: linear-gradient(135deg, #38bdf8, #06b6d4);
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 3px solid #ffffff;
            box-shadow: 0 0 14px #06b6d4, 0 0 24px rgba(6, 182, 212, 0.9);
            position: absolute;
            top: 9px;
            left: 9px;
            z-index: 2;
          "></div>
          <div style="
            position: absolute;
            top: -16px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(8, 51, 68, 0.95);
            border: 1px solid #22d3ee;
            color: #67e8f9;
            font-size: 9px;
            font-weight: 800;
            padding: 1px 5px;
            border-radius: 6px;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.8);
            pointer-events: none;
            letter-spacing: 0.5px;
            z-index: 3;
          ">👤 HUMAN</div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
  }

  // AI Bot Marker
  return L.divIcon({
    className: 'bot-head-marker',
    html: `
      <div style="position: relative; width: 16px; height: 16px;">
        ${sightlineSvg}
        <div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.7); box-shadow: 0 0 6px ${color};"></div>
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
};

  const createExtractionIcon = (name: string, isNearPlayer: boolean = false) => L.divIcon({
    className: 'extraction-marker',
    html: `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; pointer-events: auto;">
      <div class="extraction-beacon-radar" style="width: 52px; height: 52px;"></div>
      <div style="
        background: ${isNearPlayer ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95))' : 'rgba(15, 23, 42, 0.92)'};
        border: 2px solid ${isNearPlayer ? '#34d399' : '#10b981'};
        border-radius: 8px;
        padding: 3px 8px;
        color: ${isNearPlayer ? '#ffffff' : '#34d399'};
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.5px;
        white-space: nowrap;
        box-shadow: 0 0 16px ${isNearPlayer ? 'rgba(52, 211, 153, 0.85)' : 'rgba(16, 185, 129, 0.45)'};
        backdrop-filter: blur(6px);
        display: flex;
        align-items: center;
        gap: 4px;
      ">
        <span style="font-size: 13px;">🚁</span>
        <span>${name}</span>
        ${isNearPlayer ? '<span style="background: #047857; color: #a7f3d0; padding: 1px 4px; border-radius: 4px; font-size: 8px; margin-left: 2px;">EVAC ACTIVE</span>' : ''}
      </div>
    </div>
  `,
  iconSize: [110, 32],
    iconAnchor: [55, 16]
  });

  // Win Outcome Marker (Celebratory Extraction Point)
  const createVictoryOutcomeIcon = (timeStr: string, reason: string) => L.divIcon({
    className: 'victory-outcome-marker',
    html: `
    <div class="victory-outcome-pulse" style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; z-index: 3000;">
      <div style="
        background: radial-gradient(circle, #fbbf24 0%, #d97706 70%, #92400e 100%);
        border: 2.5px solid #fef08a;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        box-shadow: 0 0 20px #fbbf24, 0 0 35px rgba(245, 158, 11, 0.85);
        z-index: 10;
      ">
        🏆
      </div>
      <div style="
        margin-top: 5px;
        background: rgba(15, 23, 42, 0.96);
        border: 1.5px solid #10b981;
        border-radius: 7px;
        padding: 3px 8px;
        color: #34d399;
        font-size: 9px;
        font-weight: 800;
        white-space: nowrap;
        box-shadow: 0 0 14px rgba(16, 185, 129, 0.7);
        text-align: center;
        pointer-events: auto;
      ">
        <div style="letter-spacing: 0.5px;">🏆 EXTRACTION SUCCESS • WON</div>
        <div style="color: #cbd5e1; font-size: 8px; font-weight: normal; margin-top: 1px;">${reason} (${timeStr})</div>
      </div>
    </div>
  `,
    iconSize: [140, 65],
    iconAnchor: [70, 20]
  });

  // Defeat Outcome Marker (Eliminated in Action)
  const createDefeatOutcomeIcon = (timeStr: string, killerInfo: string) => L.divIcon({
    className: 'defeat-outcome-marker',
    html: `
    <div class="defeat-outcome-pulse" style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; z-index: 3000;">
      <div style="
        background: radial-gradient(circle, #ef4444 0%, #991b1b 70%, #450a0a 100%);
        border: 2.5px solid #fca5a5;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        box-shadow: 0 0 20px #ef4444, 0 0 35px rgba(239, 68, 68, 0.85);
        z-index: 10;
      ">
        💀
      </div>
      <div style="
        margin-top: 5px;
        background: rgba(15, 23, 42, 0.96);
        border: 1.5px solid #ef4444;
        border-radius: 7px;
        padding: 3px 8px;
        color: #f87171;
        font-size: 9px;
        font-weight: 800;
        white-space: nowrap;
        box-shadow: 0 0 14px rgba(239, 68, 68, 0.7);
        text-align: center;
        pointer-events: auto;
      ">
        <div style="letter-spacing: 0.5px;">💀 MISSION FAILED • K.I.A.</div>
        <div style="color: #cbd5e1; font-size: 8px; font-weight: normal; margin-top: 1px;">${killerInfo} (${timeStr})</div>
      </div>
    </div>
  `,
    iconSize: [140, 65],
    iconAnchor: [70, 20]
  });

  // Dramatic Elimination Shockwave Icon for active kill/death moments
  const createEliminationShockwaveIcon = (eventName: string, victimId?: string, isBot?: boolean) => {
    const isStorm = eventName === 'KilledByStorm';
    const label = isStorm
      ? '⚡ STORM DEATH'
      : (eventName.includes('Bot') ? '⚔️ BOT ELIMINATED' : '⚔️ COMBAT KILL');
    const victimDisplay = victimId
      ? `${isBot ? '🤖' : '👤'} ${victimId.length > 8 ? victimId.substring(0, 6) : victimId}`
      : '';

    return L.divIcon({
      className: 'custom-elimination-burst',
      html: `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <div class="elimination-shockwave"></div>
        <div class="elimination-blast-ring"></div>
        <div class="elimination-skull-core" style="
          background: radial-gradient(circle, #ef4444 0%, #7f1d1d 100%);
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          box-shadow: 0 0 16px #ef4444, 0 0 28px rgba(239, 68, 68, 0.95);
          z-index: 4;
        ">☠️</div>
        <div style="
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(127, 29, 29, 0.95);
          border: 1px solid #f87171;
          color: #fef2f2;
          font-size: 8px;
          font-weight: 900;
          padding: 1px 6px;
          border-radius: 6px;
          white-space: nowrap;
          box-shadow: 0 2px 10px rgba(0,0,0,0.9);
          letter-spacing: 0.5px;
          z-index: 5;
        ">${label}${victimDisplay ? ` • ${victimDisplay}` : ''}</div>
      </div>
    `,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });
  };

  // Distinct Eliminated Marker for defeated players
  const createEliminatedPlayerIcon = (isBot: boolean) => {
    if (!isBot) {
      return L.divIcon({
        className: 'human-eliminated-marker',
        html: `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          <div class="eliminated-tombstone" style="
            background: rgba(15, 23, 42, 0.95);
            width: 22px;
            height: 22px;
            border-radius: 6px;
            border: 2px solid #ef4444;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 12px rgba(239, 68, 68, 0.7);
            z-index: 2;
            font-size: 11px;
          ">💀</div>
          <div style="
            position: absolute;
            top: -16px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(69, 10, 10, 0.95);
            border: 1px solid #ef4444;
            color: #fca5a5;
            font-size: 8px;
            font-weight: 800;
            padding: 1px 4px;
            border-radius: 4px;
            white-space: nowrap;
            letter-spacing: 0.5px;
            z-index: 3;
          ">💀 KIA</div>
        </div>
      `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });
    }

    return L.divIcon({
      className: 'bot-eliminated-marker',
      html: `
      <div style="position: relative; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center;">
        <div style="
          background: rgba(24, 24, 27, 0.9);
          width: 14px;
          height: 14px;
          border-radius: 4px;
          border: 1.5px solid #71717a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          color: #a1a1aa;
          box-shadow: 0 0 4px rgba(0,0,0,0.8);
        ">☠️</div>
      </div>
    `,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
  };

  interface MapViewportProps {
  mapId: string;
  players: PlayerJourney[];
  events: EventMarker[];
  combatEngagements?: CombatEngagement[];
  stormRing?: StormRingConfig;
  pois?: POIMetric[];
  extractions?: ExtractionZone[];
  macroPaths?: MacroPlayerPath[];
  currentTime: number;
  selectedPlayerId: string | null;
  elevationRange: [number, number];
  layerFilters: {
    showHumans: boolean;
    showBots: boolean;
    showKills: boolean;
    showStorm: boolean;
    showLoot: boolean;
    showSightlines: boolean;
    showStormRing: boolean;
    showPOIs: boolean;
    showExtractions: boolean;
    showCombatVectors: boolean;
    showMacroRivers: boolean;
  };
  showHeatmap?: boolean;
  heatmapMode?: string;
  heatmapPoints?: HeatmapPoint[];
  onCursorMove?: (coords: { x: number; z: number; px: number; py: number } | null) => void;
  onToggleLayer?: (layerKey: keyof MapViewportProps['layerFilters']) => void;
}

const bounds: L.LatLngBoundsExpression = [[0, 0], [1024, 1024]];

// Subcomponent for Google Maps-like Interactions & Live Cursor Tracking
const MapControllerAndEvents: React.FC<{
  mapId: string;
  humanPosition: [number, number] | null;
  onCursorMove?: (coords: { x: number; z: number; px: number; py: number } | null) => void;
}> = ({ mapId, humanPosition, onCursorMove }) => {
  const map = useMap();

  useMapEvents({
    mousemove(e) {
      if (!onCursorMove) return;
      const px = e.latlng.lng;
      const py = 1024 - e.latlng.lat;
      if (px >= 0 && px <= 1024 && py >= 0 && py <= 1024) {
        const world = pixelToWorld(px, py, mapId);
        onCursorMove({ x: world.x, z: world.z, px: Math.round(px), py: Math.round(py) });
      }
    },
    mouseout() {
      if (onCursorMove) onCursorMove(null);
    }
  });

  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-auto">
      {/* Zoom In Button */}
      <button
        onClick={() => map.zoomIn()}
        title="Zoom In"
        className="w-9 h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 shadow-xl flex items-center justify-center transition cursor-pointer backdrop-blur-md active:scale-95"
      >
        <ZoomIn size={16} />
      </button>

      {/* Zoom Out Button */}
      <button
        onClick={() => map.zoomOut()}
        title="Zoom Out"
        className="w-9 h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 shadow-xl flex items-center justify-center transition cursor-pointer backdrop-blur-md active:scale-95"
      >
        <ZoomOut size={16} />
      </button>

      {/* Fit Map / Recenter Button (Google Maps Recenter) */}
      <button
        onClick={() => map.fitBounds(bounds, { animate: true, duration: 0.5 })}
        title="Reset & Fit Map to Viewport"
        className="w-9 h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-cyan-400 border border-slate-700/80 shadow-xl flex items-center justify-center transition cursor-pointer backdrop-blur-md active:scale-95"
      >
        <Maximize2 size={16} />
      </button>

      {/* Focus Human Player Button */}
      {humanPosition && (
        <button
          onClick={() => {
            map.flyTo(humanPosition, 1, { duration: 0.8 });
          }}
          title="Center Directly on Human Player"
          className="h-9 px-2.5 rounded-xl bg-cyan-950/90 hover:bg-cyan-900/90 text-cyan-300 border border-cyan-500/80 shadow-xl shadow-cyan-950/50 flex items-center gap-1.5 text-xs font-bold transition cursor-pointer backdrop-blur-md active:scale-95"
        >
          <User size={14} className="animate-pulse text-cyan-400" />
          <span>Focus Human</span>
        </button>
      )}

      {/* Touchpad / Scroll hint */}
      <div className="bg-slate-950/90 border border-slate-800/80 rounded-lg px-2 py-1 text-[9px] text-slate-400 font-medium backdrop-blur-md text-center max-w-[90px] shadow-lg pointer-events-none mt-0.5">
        Use + / − to zoom
      </div>
    </div>
  );
};

export const MapViewport: React.FC<MapViewportProps> = ({
  mapId,
  players,
  events,
  combatEngagements = [],
  stormRing,
  pois = [],
  extractions = [],
  macroPaths = [],
  currentTime,
  selectedPlayerId,
  elevationRange,
  layerFilters,
  showHeatmap = false,
  heatmapMode = 'KillZones',
  heatmapPoints = [],
  onCursorMove,
  onToggleLayer
}) => {
  const mapImage = `/minimaps/${mapId}_Minimap.webp`;
  const [showLegend, setShowLegend] = useState(true);

  // Synchronized Heatmap Data URL rendered via ImageOverlay
  const heatmapDataUrl = useMemo(() => {
    if (!showHeatmap || heatmapPoints.length === 0) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const HeatConstructor = (simpleheat as any).default || simpleheat;
    let heat: any;
    try {
      heat = new HeatConstructor(canvas);
    } catch {
      heat = HeatConstructor(canvas);
    }

    const data = heatmapPoints.map(p => [p.px, p.py, p.weight]);
    heat.data(data);
    const maxVal = Math.max(...heatmapPoints.map(p => p.weight), 1);
    heat.max(maxVal);
    heat.radius(22, 14);
    heat.gradient(HEATMAP_GRADIENTS[heatmapMode] || HEATMAP_GRADIENTS.KillZones);
    heat.draw();
    return canvas.toDataURL();
  }, [showHeatmap, heatmapPoints, heatmapMode]);

  // Track death timestamps for players to render eliminated states
  const playerDeathTimes = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ev of events) {
      if (ev.event === 'Killed' || ev.event === 'BotKilled' || ev.event === 'KilledByStorm') {
        map[ev.user_id] = ev.t;
      }
    }
    return map;
  }, [events]);

  // Render player paths dynamically up to currentTime, filtered by elevation range and player isolation
  const visiblePlayerPaths = useMemo(() => {
    return players
      .filter(p => {
        if (selectedPlayerId) return p.user_id === selectedPlayerId;
        return p.is_bot ? layerFilters.showBots : layerFilters.showHumans;
      })
      .map(p => {
        const traj = p.trajectory;
        let count = 0;
        while (count < traj.length && traj[count].t <= currentTime) {
          count++;
        }

        const filteredPoints = traj.slice(0, count)
          .filter(pt => pt.elevation >= elevationRange[0] && pt.elevation <= elevationRange[1]);

        const points = filteredPoints.map(pt => [1024 - pt.py, pt.px] as [number, number]);
        const lastPt = filteredPoints.length > 0 ? filteredPoints[filteredPoints.length - 1] : null;

        const deathTime = playerDeathTimes[p.user_id];
        const isEliminated = deathTime !== undefined && currentTime >= deathTime;

        return {
          userId: p.user_id,
          isBot: p.is_bot,
          isEliminated,
          points,
          lastPt: lastPt ? {
            pos: [1024 - lastPt.py, lastPt.px] as [number, number],
            heading: lastPt.heading_deg,
            elevation: lastPt.elevation
          } : null
        };
      });
  }, [players, currentTime, selectedPlayerId, elevationRange, layerFilters, playerDeathTimes]);

  // Find current position of the human player to support "Focus Human" action
  const currentHumanPos = useMemo(() => {
    const human = visiblePlayerPaths.find(p => !p.isBot);
    return human?.lastPt ? human.lastPt.pos : null;
  }, [visiblePlayerPaths]);

  // Active events within a 4-second time window around currentTime
  const activeEvents = useMemo(() => {
    return events.filter(e => {
      if (Math.abs(e.t - currentTime) > 4.0) return false;
      if (e.event === 'KilledByStorm' && !layerFilters.showStorm) return false;
      if (e.event === 'Loot' && !layerFilters.showLoot) return false;
      if ((e.event.includes('Kill') || e.event.includes('Killed')) && !layerFilters.showKills) return false;
      if (e.elevation < elevationRange[0] || e.elevation > elevationRange[1]) return false;
      return true;
    });
  }, [events, currentTime, elevationRange, layerFilters]);

  // Active combat engagement vectors within a 3-second window
  const activeEngagements = useMemo(() => {
    if (!layerFilters.showCombatVectors) return [];
    return combatEngagements.filter(ce => Math.abs(ce.t - currentTime) <= 3.0);
  }, [combatEngagements, currentTime, layerFilters.showCombatVectors]);

  // Dynamic storm ring radius calculation over match progression
  const currentStormRadius = useMemo(() => {
    if (!stormRing) return 0;
    const progress = Math.min(1.0, Math.max(0.0, currentTime / stormRing.collapse_duration_seconds));
    return stormRing.initial_radius_px - progress * (stormRing.initial_radius_px - stormRing.final_radius_px);
  }, [stormRing, currentTime]);

  // Human Player Match Outcome (Win/Extraction vs Defeat/Elimination)
  const humanOutcome = useMemo(() => {
    const human = players.find(p => !p.is_bot);
    if (!human || human.trajectory.length === 0) return null;

    const deathEvent = events.find(
      e => e.user_id === human.user_id && (e.event === 'Killed' || e.event === 'BotKilled' || e.event === 'KilledByStorm')
    );

    if (deathEvent) {
      const killerInfo = deathEvent.event === 'KilledByStorm'
        ? 'Hazardous Storm'
        : deathEvent.killer_id
          ? `${deathEvent.killer_is_bot ? '🤖 Bot' : '👤 Player'} ${deathEvent.killer_id.slice(0, 6)}`
          : 'Combat Engagement';
      const m = Math.floor(deathEvent.t / 60);
      const s = Math.floor(deathEvent.t % 60);
      const timeStr = `${m}:${s.toString().padStart(2, '0')}`;
      return {
        status: 'DEFEAT' as const,
        time: deathEvent.t,
        timeStr,
        pos: [1024 - deathEvent.py, deathEvent.px] as [number, number],
        killerInfo,
        reason: `Eliminated by ${killerInfo}`,
        elevation: deathEvent.elevation
      };
    }

    // Survived / Extracted
    const lastPt = human.trajectory[human.trajectory.length - 1];
    let nearestExtName = 'Safe Sector';
    let nearestDist = 9999;
    for (const ext of extractions) {
      const dist = Math.hypot(lastPt.px - ext.center_px, lastPt.py - ext.center_py);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestExtName = ext.name;
      }
    }
    const isAtPad = nearestDist <= 140;
    const reason = isAtPad ? `Extracted via ${nearestExtName}` : 'Survived Match Duration';
    const m = Math.floor(lastPt.t / 60);
    const s = Math.floor(lastPt.t % 60);
    const timeStr = `${m}:${s.toString().padStart(2, '0')}`;

    return {
      status: 'VICTORY' as const,
      time: lastPt.t,
      timeStr,
      pos: [1024 - lastPt.py, lastPt.px] as [number, number],
      reason,
      nearestExtName,
      nearestDist: Math.round(nearestDist),
      elevation: lastPt.elevation
    };
  }, [players, events, extractions]);

  return (
    <div className="relative w-full h-[540px] xl:h-[560px] aspect-square rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 flex flex-col">
      <MapContainer
        crs={L.CRS.Simple}
        bounds={bounds}
        maxBounds={[[-200, -200], [1224, 1224]]}
        minZoom={-0.5}
        maxZoom={3}
        zoomSnap={0.25}
        zoomDelta={0.5}
        zoomControl={false}
        scrollWheelZoom={false}
        doubleClickZoom={true}
        maxBoundsViscosity={0.7}
        className="w-full h-full"
      >
        {/* Base Raster Minimap Image Layer */}
        <ImageOverlay url={mapImage} bounds={bounds} />

        {/* Synchronized GPU Heatmap Layer (Zoom-Locked) */}
        {heatmapDataUrl && (
          <ImageOverlay
            url={heatmapDataUrl}
            bounds={bounds}
            opacity={0.8}
            zIndex={300}
          />
        )}

        {/* Google Maps Controls & Mousemove Tracker */}
        <MapControllerAndEvents
          mapId={mapId}
          humanPosition={currentHumanPos}
          onCursorMove={onCursorMove}
        />

        {/* 1. Macro River Flows (Multi-Match Aggregate Paths) */}
        {layerFilters.showMacroRivers && macroPaths.map((mp, idx) => {
          const polyPositions: [number, number][] = mp.points.map(([px, py]) => [1024 - py, px]);
          return (
            <Polyline
              key={`macro-${idx}`}
              positions={polyPositions}
              pathOptions={{
                color: mp.is_bot ? '#f59e0b' : '#06b6d4',
                weight: 1.5,
                opacity: 0.15,
                dashArray: mp.is_bot ? '2, 4' : undefined
              }}
            />
          );
        })}

        {/* 2. POI Bounding Circles & Labels */}
        {layerFilters.showPOIs && pois.map(poi => (
          <Circle
            key={poi.id}
            center={[1024 - poi.center_py, poi.center_px]}
            radius={poi.radius_px}
            pathOptions={{
              color: poi.color,
              weight: 1.5,
              fillColor: poi.color,
              fillOpacity: 0.08,
              dashArray: '4, 4'
            }}
          >
            <Popup>
              <div className="text-xs p-1 text-slate-100">
                <p className="font-bold text-sm text-white">{poi.name}</p>
                <p className="mt-1">🚶 Player Visits: <span className="font-semibold text-cyan-400">{poi.total_visits}</span></p>
                <p>💎 Loot Pickups: <span className="font-semibold text-emerald-400">{poi.loot_count}</span></p>
                <p>☠️ Combat Kills: <span className="font-semibold text-rose-400">{poi.kill_count}</span></p>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* 3. Extraction Zones */}
        {layerFilters.showExtractions && extractions.map(ext => {
          const isNear = currentHumanPos
            ? Math.hypot(currentHumanPos[1] - ext.center_px, (1024 - currentHumanPos[0]) - ext.center_py) <= ext.radius_px * 2.2
            : false;

          return (
            <React.Fragment key={ext.id}>
              <Circle
                center={[1024 - ext.center_py, ext.center_px]}
                radius={ext.radius_px}
                pathOptions={{
                  color: isNear ? '#34d399' : '#10b981',
                  weight: isNear ? 3 : 2,
                  fillColor: isNear ? '#34d399' : '#10b981',
                  fillOpacity: isNear ? 0.35 : 0.18,
                  dashArray: isNear ? undefined : '5, 5'
                }}
              >
                <Popup>
                  <div className="text-xs p-1.5 text-slate-100">
                    <p className="font-bold text-sm text-emerald-400 flex items-center gap-1.5">
                      🚁 Evacuation Zone: {ext.name}
                    </p>
                    <p className="text-slate-300 mt-1">Minimap Target: ({Math.round(ext.center_px)}, {Math.round(ext.center_py)})</p>
                    <p className="text-slate-300">Extraction Radius: {Math.round(ext.radius_px)} px</p>
                    {isNear && (
                      <p className="font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/50 mt-1.5 inline-block">
                        ✅ PLAYER WITHIN EXTRACTION PERIMETER
                      </p>
                    )}
                  </div>
                </Popup>
              </Circle>
              <Marker
                position={[1024 - ext.center_py, ext.center_px]}
                icon={createExtractionIcon(ext.name, isNear)}
              />
            </React.Fragment>
          );
        })}

        {/* 4. Dynamic Shrinking Storm Ring */}
        {layerFilters.showStormRing && stormRing && (
          <Circle
            center={[1024 - stormRing.center_py, stormRing.center_px]}
            radius={currentStormRadius}
            pathOptions={{
              color: '#c084fc',
              weight: 3,
              fillColor: '#7e22ce',
              fillOpacity: 0.18,
              dashArray: '6, 6'
            }}
          >
            <Popup>
              <div className="text-xs p-1 text-slate-100">
                <p className="font-bold text-purple-400">⚡ Hazardous Storm Barrier</p>
                <p>Current Radius: {Math.round(currentStormRadius)} px</p>
                <p>Elapsed Time: {Math.round(currentTime)}s</p>
              </div>
            </Popup>
          </Circle>
        )}

        {/* 5. Trajectory Polylines (Solid Cyan: Human, Dashed Amber: Bot) */}
        {visiblePlayerPaths.map(path => (
          <Polyline
            key={path.userId}
            positions={path.points}
            pathOptions={{
              color: path.isBot ? '#f59e0b' : '#06b6d4',
              weight: path.isBot ? 2 : 3.5,
              dashArray: path.isBot ? '4, 6' : undefined,
              opacity: path.isBot ? 0.45 : 1.0
            }}
          />
        ))}

        {/* 6. Combat Engagement Vectors (Killer to Victim Red Laser) */}
        {activeEngagements.map((eng, idx) => (
          <React.Fragment key={`eng-${idx}`}>
            <Polyline
              positions={[
                [1024 - eng.killer_py, eng.killer_px],
                [1024 - eng.victim_py, eng.victim_px]
              ]}
              pathOptions={{
                color: '#ef4444',
                weight: 2.5,
                dashArray: '5, 5',
                opacity: 0.95
              }}
            />
            <Marker
              position={[
                1024 - (eng.killer_py + eng.victim_py) / 2,
                (eng.killer_px + eng.victim_px) / 2
              ]}
              icon={L.divIcon({
                className: 'combat-dist-label',
                html: `<div style="background: rgba(239, 68, 68, 0.9); color: white; font-size: 9px; font-weight: bold; padding: 1px 4px; border-radius: 4px; white-space: nowrap; box-shadow: 0 0 8px rgba(239,68,68,0.6);">🎯 ${eng.distance_meters}m</div>`,
                iconSize: [40, 14],
                iconAnchor: [20, 7]
              })}
            />
          </React.Fragment>
        ))}

        {/* 7. Player Head Markers with Sightlines & Radar Halo (Eliminated players show tombstones) */}
        {visiblePlayerPaths.map(p => {
          if (!p.lastPt) return null;
          const color = p.isBot ? '#f59e0b' : '#06b6d4';
          const icon = p.isEliminated
            ? createEliminatedPlayerIcon(p.isBot)
            : createPlayerHeadIcon(color, p.isBot, p.lastPt.heading, layerFilters.showSightlines);

          return (
            <Marker
              key={`head-${p.userId}`}
              position={p.lastPt.pos}
              zIndexOffset={p.isEliminated ? 50 : (p.isBot ? 100 : 2000)}
              icon={icon}
            >
              <Popup>
                <div className="text-xs p-1 text-slate-100">
                  <div className="flex items-center gap-1.5 font-bold text-sm">
                    {p.isEliminated ? (
                      <span className="text-rose-400">☠️ {p.isBot ? 'Bot Eliminated' : 'Human KIA'}</span>
                    ) : p.isBot ? (
                      <span className="text-amber-400">🤖 AI Bot</span>
                    ) : (
                      <span className="text-cyan-400">👤 Human Player</span>
                    )}
                  </div>
                  <p className="font-mono text-slate-300 text-[10px] truncate mt-1">{p.userId}</p>
                  <p className="mt-1">Elevation: <span className="font-semibold text-emerald-400">{p.lastPt.elevation}m</span></p>
                  {!p.isEliminated && (
                    <p>Compass Heading: <span className="font-semibold text-sky-400">{p.lastPt.heading}°</span></p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 8. Event Markers (Distinct AAA Visuals for Kills, Deaths, Storm, Loot) */}
        {activeEvents.map((ev, idx) => {
          const isKill = ev.event === 'Kill' || ev.event === 'BotKill';
          const isKilled = ev.event === 'Killed' || ev.event === 'BotKilled';
          const isStorm = ev.event === 'KilledByStorm';

          const isElimMoment = (isKill || isKilled || isStorm) && Math.abs(ev.t - currentTime) <= 2.5;

          const icon = isElimMoment
            ? createEliminationShockwaveIcon(ev.event, ev.victim_id, ev.victim_is_bot)
            : isKill
              ? createKillIcon()
              : isKilled
                ? createDeathIcon()
                : isStorm
                  ? createStormDeathIcon()
                  : createLootIcon(ev.loot_rarity);

          return (
            <Marker
              key={`ev-${idx}`}
              position={[1024 - ev.py, ev.px]}
              zIndexOffset={isElimMoment ? 2500 : 700}
              icon={icon}
            >
              <Popup>
                <div className="text-xs p-1.5 text-slate-100">
                  <p className="font-bold text-sm text-white flex items-center gap-1.5">
                    {isKill ? '⚔️ Combat Kill' : isKilled ? '💀 Defeated' : isStorm ? '⚡ Storm Elimination' : '📦 Supply Cache'}
                  </p>
                  {ev.victim_id && (
                    <p className="text-rose-400 font-semibold mt-1">
                      Target: {ev.victim_is_bot ? '🤖 ' : '👤 '}{ev.victim_id.length > 8 ? ev.victim_id.substring(0, 6) : ev.victim_id}
                    </p>
                  )}
                  {ev.killer_id && (
                    <p className="text-amber-400 font-semibold mt-0.5">
                      Attacker: {ev.killer_is_bot ? '🤖 ' : '👤 '}{ev.killer_id.length > 8 ? ev.killer_id.substring(0, 6) : ev.killer_id}
                    </p>
                  )}
                  {ev.distance_meters && (
                    <p className="text-slate-300">Distance: {ev.distance_meters}m</p>
                  )}
                  {ev.loot_rarity && (
                    <p className="font-semibold text-amber-400 mt-1">Rarity: [{ev.loot_rarity}]</p>
                  )}
                  <p className="mt-1 text-slate-400 font-mono text-[10px]">Time: {ev.t}s | Elev: {ev.elevation}m</p>
                  <p className="font-mono text-slate-500 text-[9px] truncate">{ev.user_id}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 9. Final Match Win/Loss Outcome Marker */}
        {humanOutcome && (
          // Display victory marker when near extraction or past extraction time; display defeat marker when eliminated
          (humanOutcome.status === 'DEFEAT' && currentTime >= humanOutcome.time) ||
          (humanOutcome.status === 'VICTORY' && currentTime >= Math.max(0, humanOutcome.time - 25))
        ) && (
            <Marker
              position={humanOutcome.pos}
              zIndexOffset={3800}
              icon={
                humanOutcome.status === 'VICTORY'
                  ? createVictoryOutcomeIcon(humanOutcome.timeStr, humanOutcome.reason)
                  : createDefeatOutcomeIcon(humanOutcome.timeStr, humanOutcome.killerInfo)
              }
            >
              <Popup>
                <div className="text-xs p-2 text-slate-100 min-w-[210px]">
                  <div className="flex items-center gap-1.5 font-bold text-sm border-b border-slate-700 pb-1.5">
                    {humanOutcome.status === 'VICTORY' ? (
                      <span className="text-emerald-400">🏆 MISSION SUCCESS (MATCH WON)</span>
                    ) : (
                      <span className="text-rose-400">💀 MISSION FAILED (K.I.A.)</span>
                    )}
                  </div>
                  <div className="mt-2 space-y-1 text-[11px]">
                    <p>
                      <span className="text-slate-400">Event Time: </span>
                      <span className="font-mono text-cyan-400 font-bold">{humanOutcome.timeStr}</span> ({Math.round(humanOutcome.time)}s)
                    </p>
                    <p>
                      <span className="text-slate-400">Outcome Details: </span>
                      <span className="font-semibold text-slate-200">{humanOutcome.reason}</span>
                    </p>
                    {humanOutcome.status === 'VICTORY' && humanOutcome.nearestExtName && (
                      <p>
                        <span className="text-slate-400">Nearest Evac: </span>
                        <span className="text-emerald-300 font-semibold">{humanOutcome.nearestExtName} ({humanOutcome.nearestDist}px)</span>
                      </p>
                    )}
                    <p>
                      <span className="text-slate-400">Elevation: </span>
                      <span className="font-mono text-amber-300">{humanOutcome.elevation}m</span>
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          )}
      </MapContainer>

      {/* Floating Tactical Map Legend & Layer Controls */}
      <div className="absolute bottom-3 left-3 z-[1000] pointer-events-auto">
        <div className="bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-2xl text-[11px] text-slate-300 max-w-xs">
          <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-slate-800">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Layers size={13} className="text-cyan-400" /> Interactive Layers
            </span>
            <button
              onClick={() => setShowLegend(!showLegend)}
              className="text-[10px] text-slate-400 hover:text-white cursor-pointer px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800"
            >
              {showLegend ? 'Hide' : 'Show'}
            </button>
          </div>

          {showLegend && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={layerFilters.showHumans}
                  onChange={() => onToggleLayer && onToggleLayer('showHumans')}
                  className="rounded accent-cyan-400 w-3 h-3"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]"></span>
                <span className="font-semibold text-cyan-300">Human</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={layerFilters.showBots}
                  onChange={() => onToggleLayer && onToggleLayer('showBots')}
                  className="rounded accent-amber-400 w-3 h-3"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span className="text-amber-300">AI Bot</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={layerFilters.showKills}
                  onChange={() => onToggleLayer && onToggleLayer('showKills')}
                  className="rounded accent-rose-500 w-3 h-3"
                />
                <span className="text-rose-400">⚔️</span>
                <span>Kills</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={layerFilters.showLoot}
                  onChange={() => onToggleLayer && onToggleLayer('showLoot')}
                  className="rounded accent-emerald-400 w-3 h-3"
                />
                <span>📦</span>
                <span>Loot</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={layerFilters.showStorm}
                  onChange={() => onToggleLayer && onToggleLayer('showStorm')}
                  className="rounded accent-purple-400 w-3 h-3"
                />
                <span className="text-purple-400">⚡</span>
                <span>Storm</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={layerFilters.showSightlines}
                  onChange={() => onToggleLayer && onToggleLayer('showSightlines')}
                  className="rounded accent-indigo-400 w-3 h-3"
                />
                <span className="text-indigo-400">🧭</span>
                <span>Sightlines</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={layerFilters.showExtractions}
                  onChange={() => onToggleLayer && onToggleLayer('showExtractions')}
                  className="rounded accent-emerald-400 w-3 h-3"
                />
                <span className="text-emerald-400">🚁</span>
                <span>Evac Pads</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={layerFilters.showCombatVectors}
                  onChange={() => onToggleLayer && onToggleLayer('showCombatVectors')}
                  className="rounded accent-rose-400 w-3 h-3"
                />
                <span className="text-rose-400">🎯</span>
                <span>Lasers</span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
