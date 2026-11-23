import React, { useMemo, useState } from 'react';
import { MapContainer, ImageOverlay, Polyline, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { PlayerJourney, EventMarker, LayerFilters, HeatmapPoint } from '../types/telemetry';
import { MAP_CONFIGS } from '../types/telemetry';
import { HeatmapLayer } from './HeatmapLayer';

// Custom DOM Badges for Event Markers
const createSvgIcon = (svgContent: string, bgColor: string, borderColor: string) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background-color: ${bgColor};
        border: 2px solid ${borderColor};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 10px ${bgColor}aa;
        color: white;
      ">
        ${svgContent}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

// SVG icons for Kill, Death, Storm, Loot
const EVENT_ICONS: Record<string, L.DivIcon> = {
  Kill: createSvgIcon(
    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 10h.01M15 10h.01M10 18v2M14 18v2M8 14c0 1.5 1.8 3 4 3s4-1.5 4-3M12 2a8 8 0 0 0-8 8c0 3 1.5 5 3 6.5V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3.5c1.5-1.5 3-3.5 3-6.5a8 8 0 0 0-8-8z"/></svg>`,
    '#ef4444',
    '#ffffff'
  ),
  BotKill: createSvgIcon(
    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><line x1="12" y1="3" x2="12" y2="7"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="3" y1="12" x2="7" y2="12"/><line x1="17" y1="12" x2="21" y2="12"/></svg>`,
    '#f97316',
    '#ffffff'
  ),
  Killed: createSvgIcon(
    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    '#b91c1c',
    '#fca5a5'
  ),
  BotKilled: createSvgIcon(
    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    '#991b1b',
    '#fca5a5'
  ),
  KilledByStorm: createSvgIcon(
    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><path d="m11 13-2 3h4l-2 3"/></svg>`,
    '#a855f7',
    '#e9d5ff'
  ),
  Loot: createSvgIcon(
    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 3h12l4 6-10 13L2 9Z"/></svg>`,
    '#10b981',
    '#a7f3d0'
  ),
};

const createPlayerHeadIcon = (isBot: boolean, isSelected: boolean) => {
  const color = isSelected ? '#ffffff' : isBot ? '#f59e0b' : '#06b6d4';
  const size = isSelected ? 16 : 10;
  return L.divIcon({
    className: 'player-head-marker',
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 2px solid #0f172a;
        box-shadow: 0 0 8px ${color};
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

interface MapViewportProps {
  mapId: string;
  players: PlayerJourney[];
  events: EventMarker[];
  currentTime: number;
  layerFilters: LayerFilters;
  selectedPlayerId?: string;
  showHeatmap: boolean;
  heatmapMode: 'KillZones' | 'DeathZones' | 'Traffic';
  heatmapPoints: HeatmapPoint[];
  onSelectPlayer?: (playerId: string) => void;
}

const bounds: L.LatLngBoundsExpression = [[0, 0], [1024, 1024]];

// Cursor coordinate tracker subcomponent
const CursorTracker: React.FC<{
  mapId: string;
  onCoordsChange: (coords: { px: number; py: number; worldX: number; worldZ: number }) => void;
}> = ({ mapId, onCoordsChange }) => {
  useMapEvents({
    mousemove(e) {
      const px = Math.round(e.latlng.lng);
      const py = Math.round(1024 - e.latlng.lat);
      const cfg = MAP_CONFIGS[mapId] || MAP_CONFIGS.AmbroseValley;

      const worldX = Math.round((px / 1024.0) * cfg.scale + cfg.origin_x);
      const worldZ = Math.round(((1024.0 - py) / 1024.0) * cfg.scale + cfg.origin_z);

      onCoordsChange({ px, py, worldX, worldZ });
    },
  });
  return null;
};

export const MapViewport: React.FC<MapViewportProps> = ({
  mapId,
  players,
  events,
  currentTime,
  layerFilters,
  selectedPlayerId,
  showHeatmap,
  heatmapMode,
  heatmapPoints,
  onSelectPlayer,
}) => {
  const [cursorCoords, setCursorCoords] = useState<{ px: number; py: number; worldX: number; worldZ: number }>({
    px: 0,
    py: 0,
    worldX: 0,
    worldZ: 0,
  });

  const mapImage = `/minimaps/${mapId}_Minimap.png`;

  // Compute visible trajectories up to currentTime
  const visiblePlayerPaths = useMemo(() => {
    return players
      .filter(p => {
        if (selectedPlayerId && p.user_id !== selectedPlayerId) return false;
        return p.is_bot ? layerFilters.showBots : layerFilters.showHumans;
      })
      .map(p => {
        const points = p.trajectory
          .filter(pt => pt.t <= currentTime)
          .map(pt => [1024 - pt.py, pt.px] as [number, number]);

        // Current head position
        const currentPt = p.trajectory
          .slice()
          .reverse()
          .find(pt => pt.t <= currentTime);

        return {
          userId: p.user_id,
          isBot: p.is_bot,
          points,
          currentHead: currentPt ? ([1024 - currentPt.py, currentPt.px] as [number, number]) : null,
          elevation: currentPt ? currentPt.elevation : 0,
        };
      });
  }, [players, currentTime, layerFilters, selectedPlayerId]);

  // Compute active event markers in a 4s visibility window around currentTime
  const activeEvents = useMemo(() => {
    return events.filter(e => {
      if (e.event === 'KilledByStorm' && !layerFilters.showStorm) return false;
      if (e.event === 'Loot' && !layerFilters.showLoot) return false;
      if ((e.event.includes('Kill') || e.event.includes('Killed')) && !layerFilters.showKills) return false;
      return Math.abs(e.t - currentTime) <= 4.0;
    });
  }, [events, currentTime, layerFilters]);

  return (
    <div className="relative w-full h-[680px] rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-950">
      <MapContainer
        crs={L.CRS.Simple}
        bounds={bounds}
        maxBounds={bounds}
        minZoom={-1}
        maxZoom={2.5}
        center={[512, 512]}
        zoom={0}
        className="w-full h-full"
      >
        <ImageOverlay url={mapImage} bounds={bounds} />

        <CursorTracker mapId={mapId} onCoordsChange={setCursorCoords} />

        {/* Heatmap Layer Overlay */}
        {showHeatmap && heatmapPoints.length > 0 && (
          <HeatmapLayer points={heatmapPoints} mode={heatmapMode} opacity={0.7} />
        )}

        {/* Player Journey Paths */}
        {visiblePlayerPaths.map(path => {
          const isSelected = path.userId === selectedPlayerId;
          return (
            <React.Fragment key={path.userId}>
              {/* Path polyline */}
              <Polyline
                positions={path.points}
                eventHandlers={{
                  click: () => onSelectPlayer?.(path.userId),
                }}
                pathOptions={{
                  color: isSelected ? '#ffffff' : path.isBot ? '#f59e0b' : '#06b6d4',
                  weight: isSelected ? 4 : path.isBot ? 2 : 3,
                  dashArray: path.isBot ? '4, 6' : undefined,
                  opacity: isSelected ? 1 : path.isBot ? 0.45 : 0.9,
                }}
              />

              {/* Player head indicator */}
              {path.currentHead && (
                <Marker
                  position={path.currentHead}
                  icon={createPlayerHeadIcon(path.isBot, isSelected)}
                  eventHandlers={{
                    click: () => onSelectPlayer?.(path.userId),
                  }}
                >
                  <Popup>
                    <div className="text-xs p-1">
                      <p className="font-bold text-slate-900">{path.isBot ? 'Bot' : 'Human Player'}</p>
                      <p className="font-mono text-slate-700 truncate max-w-[180px]">{path.userId}</p>
                      <p className="text-slate-600">Elevation: {path.elevation}m</p>
                    </div>
                  </Popup>
                </Marker>
              )}
            </React.Fragment>
          );
        })}

        {/* Discrete Combat, Storm & Loot Markers */}
        {activeEvents.map((ev, idx) => (
          <Marker
            key={`${ev.user_id}-${idx}`}
            position={[1024 - ev.py, ev.px]}
            icon={EVENT_ICONS[ev.event] || EVENT_ICONS['Kill']}
          >
            <Popup>
              <div className="text-xs p-1 text-slate-900">
                <span className="font-bold uppercase tracking-wider text-[11px] block text-cyan-700">{ev.event}</span>
                <p className="font-mono text-[10px] text-slate-600 truncate max-w-[180px]">{ev.user_id}</p>
                <div className="mt-1 flex items-center justify-between text-slate-500 font-mono text-[10px]">
                  <span>Time: {Math.round(ev.t)}s</span>
                  <span>Elev: {ev.elevation}m</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Real-time Cursor Coordinates Readout for Level Designers */}
      <div className="absolute bottom-3 left-3 z-[500] pointer-events-none bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 text-[11px] font-mono text-slate-300 shadow-lg flex items-center gap-3">
        <div>
          <span className="text-cyan-400 font-semibold">Minimap: </span>
          <span>X: {cursorCoords.px} | Y: {cursorCoords.py}</span>
        </div>
        <div className="h-3 w-px bg-slate-700" />
        <div>
          <span className="text-emerald-400 font-semibold">World (3D): </span>
          <span>X: {cursorCoords.worldX}m | Z: {cursorCoords.worldZ}m</span>
        </div>
      </div>
    </div>
  );
};
