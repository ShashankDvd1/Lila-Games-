import React, { useMemo } from 'react';
import { MapContainer, ImageOverlay, Polyline, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { PlayerJourney, EventMarker, CombatEngagement, POIMetric, ExtractionZone, StormRingConfig, MacroPlayerPath } from '../types/telemetry';

// Custom SVG Icons with Rarity Borders & Directional Headings
const createEventIcon = (color: string, border: string = '#ffffff', pulse: boolean = false) => L.divIcon({
  className: 'custom-event-marker',
  html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid ${border}; box-shadow: 0 0 ${pulse ? '10px' : '6px'} ${color};"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const RARITY_COLORS: Record<string, string> = {
  Common: '#94a3b8',
  Rare: '#38bdf8',
  Epic: '#c084fc',
  Legendary: '#fbbf24'
};

const createPlayerHeadIcon = (color: string, headingDeg?: number, showSightline: boolean = false) => {
  const rot = headingDeg || 0;
  const sightlineSvg = showSightline ? `
    <svg style="position: absolute; top: -20px; left: -20px; width: 56px; height: 56px; pointer-events: none; transform: rotate(${rot}deg);" viewBox="0 0 56 56">
      <polygon points="28,28 14,0 42,0" fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="0.8" stroke-dasharray="2,2" />
    </svg>
  ` : '';

  return L.divIcon({
    className: 'player-head-marker',
    html: `
      <div style="position: relative; width: 16px; height: 16px;">
        ${sightlineSvg}
        <div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px ${color};"></div>
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
};

const createExtractionIcon = (name: string) => L.divIcon({
  className: 'extraction-marker',
  html: `
    <div style="background: rgba(16, 185, 129, 0.2); border: 2px solid #10b981; border-radius: 8px; padding: 2px 6px; color: #10b981; font-size: 10px; font-weight: bold; white-space: nowrap; box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);">
      🚁 ${name}
    </div>
  `,
  iconSize: [80, 20],
  iconAnchor: [40, 10]
});

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
}

const bounds: L.LatLngBoundsExpression = [[0, 0], [1024, 1024]];

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
  layerFilters
}) => {
  const mapImage = mapId === 'Lockdown' ? '/minimaps/Lockdown_Minimap.jpg' : `/minimaps/${mapId}_Minimap.png`;

  // Render player paths dynamically up to currentTime, filtered by elevation range and player isolation
  const visiblePlayerPaths = useMemo(() => {
    return players
      .filter(p => {
        if (selectedPlayerId) return p.user_id === selectedPlayerId;
        return p.is_bot ? layerFilters.showBots : layerFilters.showHumans;
      })
      .map(p => {
        const filteredPoints = p.trajectory
          .filter(pt => pt.t <= currentTime && pt.elevation >= elevationRange[0] && pt.elevation <= elevationRange[1]);
        
        const points = filteredPoints.map(pt => [1024 - pt.py, pt.px] as [number, number]);
        const lastPt = filteredPoints.length > 0 ? filteredPoints[filteredPoints.length - 1] : null;

        return {
          userId: p.user_id,
          isBot: p.is_bot,
          points,
          lastPt: lastPt ? {
            pos: [1024 - lastPt.py, lastPt.px] as [number, number],
            heading: lastPt.heading_deg,
            elevation: lastPt.elevation
          } : null
        };
      });
  }, [players, currentTime, selectedPlayerId, elevationRange, layerFilters]);

  // Active events within a 4-second time window around currentTime
  const activeEvents = useMemo(() => {
    return events.filter(e => {
      if (e.event === 'KilledByStorm' && !layerFilters.showStorm) return false;
      if (e.event === 'Loot' && !layerFilters.showLoot) return false;
      if ((e.event.includes('Kill') || e.event.includes('Killed')) && !layerFilters.showKills) return false;
      if (e.elevation < elevationRange[0] || e.elevation > elevationRange[1]) return false;
      return Math.abs(e.t - currentTime) <= 4.0;
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

  return (
    <div className="relative w-full h-[720px] rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-950">
      <MapContainer
        crs={L.CRS.Simple}
        bounds={bounds}
        maxBounds={bounds}
        minZoom={-1}
        maxZoom={2}
        className="w-full h-full"
      >
        <ImageOverlay url={mapImage} bounds={bounds} />

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
                opacity: 0.12,
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
              <div className="text-xs p-1 text-slate-800">
                <p className="font-bold text-sm text-slate-900">{poi.name}</p>
                <p className="mt-1">🚶 Player Visits: <span className="font-semibold text-cyan-600">{poi.total_visits}</span></p>
                <p>💎 Loot Pickups: <span className="font-semibold text-emerald-600">{poi.loot_count}</span></p>
                <p>☠️ Combat Kills: <span className="font-semibold text-rose-600">{poi.kill_count}</span></p>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* 3. Extraction Zones */}
        {layerFilters.showExtractions && extractions.map(ext => (
          <React.Fragment key={ext.id}>
            <Circle
              center={[1024 - ext.center_py, ext.center_px]}
              radius={ext.radius_px}
              pathOptions={{
                color: '#10b981',
                weight: 2,
                fillColor: '#10b981',
                fillOpacity: 0.15
              }}
            />
            <Marker
              position={[1024 - ext.center_py, ext.center_px]}
              icon={createExtractionIcon(ext.name)}
            />
          </React.Fragment>
        ))}

        {/* 4. Dynamic Shrinking Storm Ring */}
        {layerFilters.showStormRing && stormRing && (
          <Circle
            center={[1024 - stormRing.center_py, stormRing.center_px]}
            radius={currentStormRadius}
            pathOptions={{
              color: '#a855f7',
              weight: 3,
              fillColor: '#581c87',
              fillOpacity: 0.15,
              dashArray: '6, 6'
            }}
          >
            <Popup>
              <div className="text-xs p-1">
                <p className="font-bold text-purple-900">⚡ Hazardous Storm Barrier</p>
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
              weight: path.isBot ? 2 : 3,
              dashArray: path.isBot ? '4, 6' : undefined,
              opacity: path.isBot ? 0.5 : 0.95
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
                opacity: 0.9
              }}
            />
            <Marker
              position={[
                1024 - (eng.killer_py + eng.victim_py) / 2,
                (eng.killer_px + eng.victim_px) / 2
              ]}
              icon={L.divIcon({
                className: 'combat-dist-label',
                html: `<div style="background: rgba(239, 68, 68, 0.85); color: white; font-size: 9px; font-weight: bold; padding: 1px 4px; border-radius: 4px; white-space: nowrap;">🎯 ${eng.distance_meters}m</div>`,
                iconSize: [40, 14],
                iconAnchor: [20, 7]
              })}
            />
          </React.Fragment>
        ))}

        {/* 7. Player Head Markers with Sightlines */}
        {visiblePlayerPaths.map(p => {
          if (!p.lastPt) return null;
          const color = p.isBot ? '#f59e0b' : '#06b6d4';
          return (
            <Marker
              key={`head-${p.userId}`}
              position={p.lastPt.pos}
              icon={createPlayerHeadIcon(color, p.lastPt.heading, layerFilters.showSightlines)}
            >
              <Popup>
                <div className="text-xs p-1">
                  <p className="font-bold text-slate-900">{p.isBot ? '🤖 Bot' : '👤 Human Player'}</p>
                  <p className="font-mono text-slate-600 truncate">{p.userId}</p>
                  <p>Elev: {p.lastPt.elevation}m | Heading: {p.lastPt.heading}°</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 8. Event Markers (Kills, Deaths, Storm, Loot with Rarity) */}
        {activeEvents.map((ev, idx) => {
          let color = '#ef4444';
          let border = '#ffffff';

          if (ev.event === 'Loot') {
            color = '#10b981';
            border = ev.loot_rarity ? RARITY_COLORS[ev.loot_rarity] : '#ffffff';
          } else if (ev.event === 'KilledByStorm') {
            color = '#a855f7';
          } else if (ev.event.includes('Bot')) {
            color = '#f97316';
          }

          return (
            <Marker
              key={`ev-${idx}`}
              position={[1024 - ev.py, ev.px]}
              icon={createEventIcon(color, border)}
            >
              <Popup>
                <div className="text-xs p-1 text-slate-800">
                  <p className="font-bold text-slate-900">{ev.event}</p>
                  {ev.loot_rarity && (
                    <p className="font-semibold text-amber-600">Rarity: {ev.loot_rarity}</p>
                  )}
                  <p>Time: {ev.t}s | Elev: {ev.elevation}m</p>
                  <p className="font-mono text-slate-600 truncate">{ev.user_id}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
