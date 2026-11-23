import React from 'react';
import { Users, Crosshair, CloudRain, Package, Navigation, Target } from 'lucide-react';
import type { PlayerJourney, EventMarker, POIMetric } from '../types/telemetry';

interface InspectorHUDProps {
  mapId: string;
  duration: number;
  players: PlayerJourney[];
  events: EventMarker[];
  pois?: POIMetric[];
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
  currentTime,
  selectedPlayerId,
  onSelectPlayer,
  cursorWorld
}) => {
  const humanCount = players.filter(p => !p.is_bot).length;
  const botCount = players.filter(p => p.is_bot).length;

  const killEvents = events.filter(e => e.event === 'Kill' || e.event === 'BotKill');
  const stormEvents = events.filter(e => e.event === 'KilledByStorm');
  const lootEvents = events.filter(e => e.event === 'Loot');

  // Active chronological event ticker up to currentTime
  const recentEvents = events
    .filter(e => e.t <= currentTime)
    .sort((a, b) => b.t - a.t)
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-3 w-84 shrink-0 text-white text-xs">
      {/* 1. Spatial Telemetry & Coordinate Tracker */}
      <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Navigation size={13} className="text-cyan-400" /> Spatial Coordinates
          </span>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
            {mapId}
          </span>
        </div>

        {cursorWorld ? (
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80">
              <p className="text-slate-500 text-[9px] uppercase">World X / Z</p>
              <p className="font-bold text-cyan-400">{cursorWorld.x.toFixed(1)} / {cursorWorld.z.toFixed(1)}</p>
            </div>
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80">
              <p className="text-slate-500 text-[9px] uppercase">Minimap Px</p>
              <p className="font-bold text-emerald-400">{cursorWorld.px.toFixed(0)} x {cursorWorld.py.toFixed(0)}</p>
            </div>
          </div>
        ) : (
          <p className="text-slate-500 italic text-[11px]">Hover over minimap to inspect coordinates</p>
        )}
      </div>

      {/* 2. Match Summary Statistics */}
      <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Users size={13} className="text-amber-400" /> Match Overview
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {Math.floor(duration / 60)}m {Math.floor(duration % 60)}s
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800/80">
            <Users size={14} className="text-cyan-400" />
            <div>
              <p className="text-slate-500 text-[9px]">Players</p>
              <p className="font-bold">{humanCount}H / {botCount}B</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800/80">
            <Crosshair size={14} className="text-rose-400" />
            <div>
              <p className="text-slate-500 text-[9px]">Total Kills</p>
              <p className="font-bold text-rose-400">{killEvents.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800/80">
            <CloudRain size={14} className="text-purple-400" />
            <div>
              <p className="text-slate-500 text-[9px]">Storm Deaths</p>
              <p className="font-bold text-purple-400">{stormEvents.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800/80">
            <Package size={14} className="text-emerald-400" />
            <div>
              <p className="text-slate-500 text-[9px]">Loot Gathered</p>
              <p className="font-bold text-emerald-400">{lootEvents.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. POI Analytics Metrics (Level Designer Zone Balancer) */}
      {pois.length > 0 && (
        <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-xl">
          <p className="font-semibold text-slate-300 mb-2 pb-1.5 border-b border-slate-800 text-[11px] flex items-center gap-1.5">
            🏰 POI Sector Heat
          </p>
          <div className="flex flex-col gap-1.5">
            {pois.map(poi => (
              <div key={poi.id} className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800/80 text-[10px]">
                <span className="font-medium flex items-center gap-1.5" style={{ color: poi.color }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: poi.color }} />
                  {poi.name}
                </span>
                <div className="flex items-center gap-2 font-mono text-slate-400">
                  <span>🚶 {poi.total_visits}</span>
                  <span>💎 {poi.loot_count}</span>
                  <span className="text-rose-400">☠️ {poi.kill_count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Active Chronological Event Ticker */}
      <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-xl flex-1 flex flex-col min-h-0">
        <p className="font-semibold text-slate-300 mb-2 pb-1.5 border-b border-slate-800 flex items-center justify-between">
          <span>⚡ Live Event Ticker</span>
          <span className="text-[10px] text-slate-500 font-mono">T: {currentTime.toFixed(1)}s</span>
        </p>

        <div className="flex flex-col gap-1.5 overflow-y-auto max-h-40 pr-1">
          {recentEvents.length === 0 ? (
            <p className="text-slate-500 italic text-[11px] py-2">No events recorded up to this second</p>
          ) : (
            recentEvents.map((e, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800/80 text-[10px]"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    e.event.includes('Kill') ? 'bg-rose-500' : e.event === 'Loot' ? 'bg-emerald-500' : 'bg-purple-500'
                  }`} />
                  <span className="font-medium text-slate-200">{e.event}</span>
                  {e.loot_rarity && (
                    <span className="text-[9px] text-amber-400 font-semibold font-mono">[{e.loot_rarity}]</span>
                  )}
                  <span className="text-slate-500 font-mono truncate">{e.user_id.substring(0, 6)}</span>
                </div>
                <span className="font-mono text-slate-400 shrink-0">+{e.t.toFixed(0)}s</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 5. Player Roster & Trajectory Isolation */}
      <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800">
          <span className="font-semibold text-slate-300">👥 Player Roster</span>
          {selectedPlayerId && (
            <button
              onClick={() => onSelectPlayer(null)}
              className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
            >
              Show All
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
          {players.map(p => {
            const isSelected = selectedPlayerId === p.user_id;
            return (
              <div
                key={p.user_id}
                onClick={() => onSelectPlayer(isSelected ? null : p.user_id)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border cursor-pointer transition ${
                  isSelected
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold'
                    : 'bg-slate-950 border-slate-800 hover:bg-slate-800/80 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate font-mono text-[10px]">
                  <span>{p.is_bot ? '🤖' : '👤'}</span>
                  <span className="truncate">{p.user_id}</span>
                </div>
                <button
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                  title="Isolate Trajectory"
                >
                  <Target size={12} className={isSelected ? 'text-cyan-400' : ''} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
