import React, { useState, useMemo } from 'react';
import { Navigation, Users, Crosshair, CloudRain, Package, Shield, Activity, Award, Skull } from 'lucide-react';
import type { PlayerJourney, EventMarker, POIMetric, ExtractionZone } from '../types/telemetry';

interface InspectorHUDProps {
  mapId: string;
  duration: number;
  players: PlayerJourney[];
  events: EventMarker[];
  pois?: POIMetric[];
  extractions?: ExtractionZone[];
  currentTime: number;
  selectedPlayerId: string | null;
  onSelectPlayer: (userId: string | null) => void;
  cursorWorld: { x: number; z: number; px: number; py: number } | null;
}

export const InspectorHUD: React.FC<InspectorHUDProps> = ({
  mapId,
  duration,
  players,
  events,
  pois = [],
  extractions = [],
  currentTime,
  cursorWorld
}) => {
  const [tickerFilter, setTickerFilter] = useState<'all' | 'kills' | 'loot'>('all');

  const humanCount = players.filter(p => !p.is_bot).length;
  const botCount = players.filter(p => p.is_bot).length;

  const killEvents = events.filter(e => e.event === 'Kill' || e.event === 'BotKill');
  const stormEvents = events.filter(e => e.event === 'KilledByStorm');
  const lootEvents = events.filter(e => e.event === 'Loot');

  // Human player status & full match outcome debrief
  const humanPlayer = players.find(p => !p.is_bot);
  const humanDeathEvent = humanPlayer
    ? events.find(e => e.user_id === humanPlayer.user_id && (e.event === 'Killed' || e.event === 'BotKilled' || e.event === 'KilledByStorm'))
    : null;
  const humanDied = !!humanDeathEvent;

  // Nearest Extraction Zone calculation
  const nearestExtraction = useMemo(() => {
    if (!humanPlayer || humanPlayer.trajectory.length === 0 || extractions.length === 0) return null;
    const lastPt = humanPlayer.trajectory[humanPlayer.trajectory.length - 1];
    let bestZone = extractions[0];
    let minDistance = 9999;
    for (const ext of extractions) {
      const dist = Math.hypot(lastPt.px - ext.center_px, lastPt.py - ext.center_py);
      if (dist < minDistance) {
        minDistance = dist;
        bestZone = ext;
      }
    }
    return {
      zone: bestZone,
      distancePx: Math.round(minDistance),
      isInsideZone: minDistance <= bestZone.radius_px * 2.2
    };
  }, [humanPlayer, extractions]);

  // Human combat metrics
  const humanKills = humanPlayer ? events.filter(e => e.user_id === humanPlayer.user_id && (e.event === 'Kill' || e.event === 'BotKill')).length : 0;
  const humanLoot = humanPlayer ? events.filter(e => e.user_id === humanPlayer.user_id && e.event === 'Loot').length : 0;

  // Active chronological event ticker up to currentTime
  const recentEvents = events
    .filter(e => {
      if (e.t > currentTime) return false;
      if (tickerFilter === 'kills') return e.event.includes('Kill') || e.event.includes('Killed') || e.event === 'KilledByStorm';
      if (tickerFilter === 'loot') return e.event === 'Loot';
      return true;
    })
    .sort((a, b) => b.t - a.t)
    .slice(0, 15);

  const formatId = (id?: string, isBot?: boolean) => {
    if (!id) return '';
    const icon = isBot ? '🤖' : '👤';
    const label = id.length > 8 ? id.substring(0, 6) : id;
    return `${icon} ${label}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full h-[540px] xl:h-[560px] overflow-hidden text-slate-100">
      {/* CARD 1: Spatial Telemetry & Coordinate Inspector */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-3.5 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-xs text-white flex items-center gap-2">
              <Navigation size={14} className="text-cyan-400" /> Spatial Telemetry & Coordinates
            </span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-bold">
              {mapId}
            </span>
          </div>

          {cursorWorld ? (
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                <p className="text-slate-500 text-[10px] uppercase font-semibold">World (X, Z)</p>
                <p className="font-mono font-bold text-sm text-cyan-400">
                  {cursorWorld.x.toFixed(1)}, {cursorWorld.z.toFixed(1)}
                </p>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                <p className="text-slate-500 text-[10px] uppercase font-semibold">Minimap Pixel (PX, PY)</p>
                <p className="font-mono font-bold text-sm text-emerald-400">
                  {cursorWorld.px} x {cursorWorld.py}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/60 p-4 rounded-xl border border-dashed border-slate-800 text-center mt-3">
              <p className="text-slate-400 text-xs">Hover cursor over minimap to inspect real-time coordinates</p>
            </div>
          )}
        </div>

        {/* Selected Player Identity Card */}
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 mt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 font-bold text-xs shrink-0">
                  👤
                </div>
                <div className="truncate">
                  <p className="font-bold text-xs text-white truncate">
                    {humanPlayer ? humanPlayer.user_id : 'Observer Mode'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {humanPlayer ? `${humanPlayer.trajectory.length} Keyframes • ${humanKills} Kills • ${humanLoot} Loot` : 'All Players Active'}
                  </p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${humanDied ? 'bg-rose-950 border border-rose-500 text-rose-300' : 'bg-emerald-950 border border-emerald-500 text-emerald-300'}`}>
                {humanDied ? '💀 ELIMINATED' : '🏆 SURVIVED'}
              </span>
            </div>
          </div>

          {/* Tactical Match Outcome & Extraction Debrief */}
          {humanPlayer && (
            <div className={`mt-2 p-2.5 rounded-xl border ${humanDied
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              }`}>
              <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                <span className="font-bold text-xs flex items-center gap-1.5">
                  {humanDied ? (
                    <>
                      <Skull size={13} className="text-rose-400" />
                      <span>MISSION FAILED: DEFEAT</span>
                    </>
                  ) : (
                    <>
                      <Award size={13} className="text-emerald-400" />
                      <span>MISSION ACCOMPLISHED: VICTORY</span>
                    </>
                  )}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${humanDied ? 'bg-rose-900/70 text-rose-300 border border-rose-500/40' : 'bg-emerald-900/70 text-emerald-300 border border-emerald-500/40'
                  }`}>
                  {humanDied ? `KIA at ${Math.floor(humanDeathEvent!.t / 60)}m ${Math.floor(humanDeathEvent!.t % 60)}s` : 'EXTRACTED ALIVE'}
                </span>
              </div>
              <div className="mt-1.5 text-[11px] space-y-1 text-slate-300">
                {humanDied ? (
                  <>
                    <p>• <span className="text-rose-400 font-semibold">Casualty:</span> {
                      humanDeathEvent!.event === 'KilledByStorm'
                        ? 'Eliminated by hazardous Storm Barrier'
                        : humanDeathEvent!.killer_id
                          ? `Eliminated by ${humanDeathEvent!.killer_is_bot ? 'Bot' : 'Player'} (${humanDeathEvent!.killer_id.slice(0, 6)})`
                          : 'Eliminated in combat engagement'
                    }</p>
                    <p>• <span className="text-amber-400 font-semibold">Timeline:</span> Died {Math.floor((duration - humanDeathEvent!.t) / 60)}m {Math.floor((duration - humanDeathEvent!.t) % 60)}s before match conclusion.</p>
                  </>
                ) : (
                  <>
                    <p>• <span className="text-emerald-400 font-semibold">Win Condition:</span> Survived match with 0 deaths.</p>
                    {nearestExtraction && (
                      <p>• <span className="text-cyan-400 font-semibold">Evacuation Pad:</span> {nearestExtraction.zone.name} ({nearestExtraction.distancePx}px {nearestExtraction.isInsideZone ? '• Within Evac Perimeter' : ''})</p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CARD 2: Match Combat & Resource Analytics */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-3.5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-xs text-white flex items-center gap-2">
                <Activity size={14} className="text-amber-400" /> Match Combat Analytics
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                Duration: {Math.floor(duration / 60)}m {Math.floor(duration % 60)}s
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                  <Users size={16} />
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-semibold">Roster Composition</p>
                  <p className="font-bold text-xs text-white">
                    <span className="text-cyan-400">{humanCount} Human</span> / <span className="text-amber-400">{botCount} Bots</span>
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-950 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                  <Crosshair size={16} />
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-semibold">Combat Eliminations</p>
                  <p className="font-bold text-xs text-rose-400">{killEvents.length} Kills</p>
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-950 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
                  <CloudRain size={16} />
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-semibold">Storm Casualties</p>
                  <p className="font-bold text-xs text-purple-400">{stormEvents.length} Deaths</p>
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <Package size={16} />
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-semibold">Loot Caches Opened</p>
                  <p className="font-bold text-xs text-emerald-400">{lootEvents.length} Crates</p>
                </div>
              </div>
            </div>
          </div>

          {/* Level Designer Recommendation Alert */}
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 mt-2 flex items-center gap-2">
            <Shield size={14} className="text-teal-400 shrink-0" />
            <span>
              {killEvents.length > 0 ? `Active combat pacing: 1 kill every ~${Math.round(duration / Math.max(killEvents.length, 1))}s.` : 'Low engagement pacing: Consider adjusting POI choke points.'}
            </span>
          </div>
        </div>

        {/* CARD 3: POI Sector Balancing (Level Design Hotspots) */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-3.5 shadow-xl flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-xs text-white flex items-center gap-2">
                🏰 POI Sector Balancing & Heat
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {pois.length} Sectors Configured
              </span>
            </div>

            <div className="flex flex-col gap-1.5 mt-2.5 overflow-y-auto max-h-[160px] pr-1">
              {pois.length === 0 ? (
                <p className="text-slate-500 italic text-xs py-2">No POI zones defined for this map</p>
              ) : (
                pois.map(poi => (
                  <div key={poi.id} className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs hover:border-slate-700 transition">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: poi.color }} />
                      <span className="font-medium text-slate-200">{poi.name}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-xs">
                      <span title="Total player visits" className="text-slate-400">🚶 {poi.total_visits}</span>
                      <span title="Loot pickups in this POI" className="text-emerald-400">💎 {poi.loot_count}</span>
                      <span title="Combat kills in this POI" className="text-rose-400 font-bold">⚔️ {poi.kill_count}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="text-[10px] text-slate-500 pt-1.5 border-t border-slate-800/80 flex items-center justify-between font-mono">
            <span>Scale: {mapId === 'Lockdown' ? '1000m' : mapId === 'GrandRift' ? '581m' : '900m'}</span>
            <span>Dashed circles show level design capture radiuses</span>
          </div>
        </div>

        {/* CARD 4: Live Chronological Event Ticker & Kill Feed */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-3.5 shadow-xl flex flex-col justify-between overflow-hidden">
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
              <span className="font-bold text-xs text-white flex items-center gap-2">
                ⚡ Live Event Feed
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-500/30">
                  T: {currentTime.toFixed(1)}s
                </span>
              </span>

              {/* Filter Chips */}
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  onClick={() => setTickerFilter('all')}
                  className={`px-2 py-0.5 rounded-lg border transition cursor-pointer ${tickerFilter === 'all' ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setTickerFilter('kills')}
                  className={`px-2 py-0.5 rounded-lg border transition cursor-pointer ${tickerFilter === 'kills' ? 'bg-rose-950 border-rose-500 text-rose-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                >
                  ⚔️ Kills
                </button>
                <button
                  onClick={() => setTickerFilter('loot')}
                  className={`px-2 py-0.5 rounded-lg border transition cursor-pointer ${tickerFilter === 'loot' ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                >
                  📦 Loot
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mt-2.5 overflow-y-auto flex-1 pr-1">
              {recentEvents.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500 italic text-xs py-4">
                  No events recorded up to {currentTime.toFixed(1)}s
                </div>
              ) : (
                recentEvents.map((e, idx) => {
                  const isKill = e.event === 'Kill' || e.event === 'BotKill';
                  const isKilled = e.event === 'Killed' || e.event === 'BotKilled';
                  const isStorm = e.event === 'KilledByStorm';

                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-2 rounded-xl border text-xs transition ${isKill
                          ? 'bg-rose-950/40 border-rose-800/60 shadow-sm'
                          : isKilled
                            ? 'bg-amber-950/30 border-amber-800/40'
                            : isStorm
                              ? 'bg-purple-950/40 border-purple-800/60'
                              : 'bg-slate-950 border-slate-800'
                        }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {isKill ? (
                          <>
                            <span className="w-2 h-2 rounded-full shrink-0 bg-rose-500 animate-ping" />
                            <span className="font-bold text-rose-400 shrink-0">⚔️ ELIM:</span>
                            <span className={`font-mono font-bold shrink-0 ${e.is_bot ? 'text-amber-400' : 'text-cyan-300'}`}>
                              {formatId(e.user_id, e.is_bot)}
                            </span>
                            <span className="text-slate-400 shrink-0">killed</span>
                            <span className={`font-mono font-bold shrink-0 ${e.victim_is_bot !== false ? 'text-amber-400' : 'text-cyan-300'}`}>
                              {e.victim_id ? formatId(e.victim_id, e.victim_is_bot) : (e.event === 'BotKill' ? '🤖 AI Patrol Bot' : 'Enemy')}
                            </span>
                          </>
                        ) : isKilled ? (
                          <>
                            <span className="w-2 h-2 rounded-full shrink-0 bg-amber-500" />
                            <span className="font-bold text-amber-400 shrink-0">💀 DEFEATED:</span>
                            <span className={`font-mono font-bold shrink-0 ${e.is_bot ? 'text-amber-400' : 'text-cyan-300'}`}>
                              {formatId(e.user_id, e.is_bot)}
                            </span>
                          </>
                        ) : isStorm ? (
                          <>
                            <span className="w-2 h-2 rounded-full shrink-0 bg-purple-500" />
                            <span className="font-bold text-purple-400 shrink-0">⚡ STORM:</span>
                            <span className={`font-mono font-bold shrink-0 ${e.is_bot ? 'text-amber-400' : 'text-cyan-300'}`}>
                              {formatId(e.user_id, e.is_bot)}
                            </span>
                            <span className="text-purple-300 shrink-0">eliminated</span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-500" />
                            <span className="font-medium text-emerald-400 shrink-0">LOOT:</span>
                            <span className={`font-mono font-bold shrink-0 ${e.is_bot ? 'text-amber-400' : 'text-cyan-300'}`}>
                              {formatId(e.user_id, e.is_bot)}
                            </span>
                            {e.loot_rarity && (
                              <span className="text-[10px] text-amber-400 font-bold">[{e.loot_rarity}]</span>
                            )}
                          </>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-slate-500 shrink-0 ml-2">{e.t.toFixed(1)}s</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
            <span>Click and drag scrubber below to step through match</span>
          </div>
        </div>
      </div>
      );
};
