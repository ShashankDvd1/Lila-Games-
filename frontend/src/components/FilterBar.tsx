import React from 'react';
import { Calendar, Map, Hash, Flame, Compass, ShieldAlert, Layers } from 'lucide-react';
import type { MatchSummary } from '../types/telemetry';

interface FilterBarProps {
  dates: string[];
  maps: string[];
  matches: MatchSummary[];
  selectedDate: string;
  selectedMap: string;
  selectedMatch: string;
  heatmapMode: string;
  showHeatmap: boolean;
  elevationRange: [number, number];
  elevationBounds: { min: number; max: number };
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
  onDateChange: (date: string) => void;
  onMapChange: (map: string) => void;
  onMatchChange: (matchId: string) => void;
  onToggleHeatmap: (show: boolean) => void;
  onHeatmapModeChange: (mode: string) => void;
  onElevationChange: (range: [number, number]) => void;
  onToggleLayer: (layerKey: keyof FilterBarProps['layerFilters']) => void;
  onCopyDeepLink: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  dates,
  maps,
  matches,
  selectedDate,
  selectedMap,
  selectedMatch,
  heatmapMode,
  showHeatmap,
  elevationRange,
  elevationBounds,
  layerFilters,
  onDateChange,
  onMapChange,
  onMatchChange,
  onToggleHeatmap,
  onHeatmapModeChange,
  onElevationChange,
  onToggleLayer,
  onCopyDeepLink
}) => {
  return (
    <div className="flex flex-col gap-2.5 bg-slate-900/95 p-3 rounded-2xl border border-slate-800 shadow-xl text-white text-xs">
      {/* Top Row: Date, Map, Match selectors and Primary actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <Calendar size={14} className="text-cyan-400" />
            <select
              value={selectedDate}
              onChange={e => onDateChange(e.target.value)}
              className="bg-transparent text-white outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-900">All Dates (Feb 10-14)</option>
              {dates.map(d => (
                <option key={d} value={d} className="bg-slate-900">
                  {d.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Map Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <Map size={14} className="text-emerald-400" />
            <select
              value={selectedMap}
              onChange={e => onMapChange(e.target.value)}
              className="bg-transparent text-white outline-none cursor-pointer font-medium"
            >
              {maps.map(m => (
                <option key={m} value={m} className="bg-slate-900">{m}</option>
              ))}
            </select>
          </div>

          {/* Match Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 max-w-sm">
            <Hash size={14} className="text-amber-400" />
            <select
              value={selectedMatch}
              onChange={e => onMatchChange(e.target.value)}
              className="bg-transparent text-white outline-none cursor-pointer truncate w-56 font-mono text-[11px]"
            >
              {matches.map(m => (
                <option key={m.match_id} value={m.match_id} className="bg-slate-900">
                  {m.match_id.substring(0, 8)}... ({m.human_count}H / {m.bot_count}B - {m.total_events} ev)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Heatmap & Deep Link Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleHeatmap(!showHeatmap)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-medium transition cursor-pointer ${
              showHeatmap
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 border-orange-500 shadow-md shadow-orange-900/40 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Flame size={14} className={showHeatmap ? 'animate-pulse' : 'text-orange-400'} />
            <span>Heatmap Overlay</span>
          </button>

          {showHeatmap && (
            <select
              value={heatmapMode}
              onChange={e => onHeatmapModeChange(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white px-2.5 py-1.5 rounded-xl outline-none cursor-pointer font-medium text-xs"
            >
              <option value="KillZones" className="bg-slate-900">🔥 Kill Zones</option>
              <option value="DeathZones" className="bg-slate-900">☠️ Death Zones (Inc. Storm)</option>
              <option value="Traffic" className="bg-slate-900">🧭 High-Traffic Routes</option>
            </select>
          )}

          <button
            onClick={onCopyDeepLink}
            title="Copy URL with current match, time, and active filters"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer"
          >
            🔗 <span className="hidden sm:inline">Share Session</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: Level Design & Analytics Feature Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
        {/* Layer Toggles */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-400 font-semibold mr-1 flex items-center gap-1">
            <Layers size={12} /> Layers:
          </span>

          <button
            onClick={() => onToggleLayer('showHumans')}
            className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
              layerFilters.showHumans ? 'bg-cyan-950/80 border-cyan-500/80 text-cyan-300' : 'bg-slate-950/60 border-slate-800 text-slate-500'
            }`}
          >
            👤 Humans
          </button>

          <button
            onClick={() => onToggleLayer('showBots')}
            className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
              layerFilters.showBots ? 'bg-amber-950/80 border-amber-500/80 text-amber-300' : 'bg-slate-950/60 border-slate-800 text-slate-500'
            }`}
          >
            🤖 Bots
          </button>

          <button
            onClick={() => onToggleLayer('showCombatVectors')}
            className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
              layerFilters.showCombatVectors ? 'bg-rose-950/80 border-rose-500/80 text-rose-300' : 'bg-slate-950/60 border-slate-800 text-slate-500'
            }`}
          >
            🎯 Kill Vectors
          </button>

          <button
            onClick={() => onToggleLayer('showSightlines')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition cursor-pointer ${
              layerFilters.showSightlines ? 'bg-indigo-950/80 border-indigo-500/80 text-indigo-300' : 'bg-slate-950/60 border-slate-800 text-slate-500'
            }`}
          >
            <Compass size={11} /> Sightlines
          </button>

          <button
            onClick={() => onToggleLayer('showStormRing')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition cursor-pointer ${
              layerFilters.showStormRing ? 'bg-purple-950/80 border-purple-500/80 text-purple-300' : 'bg-slate-950/60 border-slate-800 text-slate-500'
            }`}
          >
            <ShieldAlert size={11} /> Storm Ring
          </button>

          <button
            onClick={() => onToggleLayer('showPOIs')}
            className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
              layerFilters.showPOIs ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300' : 'bg-slate-950/60 border-slate-800 text-slate-500'
            }`}
          >
            🏰 POI Zones
          </button>

          <button
            onClick={() => onToggleLayer('showExtractions')}
            className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
              layerFilters.showExtractions ? 'bg-teal-950/80 border-teal-500/80 text-teal-300' : 'bg-slate-950/60 border-slate-800 text-slate-500'
            }`}
          >
            🚁 Extractions
          </button>

          <button
            onClick={() => onToggleLayer('showMacroRivers')}
            className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
              layerFilters.showMacroRivers ? 'bg-sky-950/80 border-sky-500/80 text-sky-300' : 'bg-slate-950/60 border-slate-800 text-slate-500'
            }`}
          >
            🌊 Macro Rivers
          </button>
        </div>

        {/* 3D Vertical Elevation Range Slicer */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
          <span className="text-slate-400 font-medium">⛰️ Elevation Slice:</span>
          <span className="font-mono text-cyan-400 font-semibold">{elevationRange[0]}m</span>
          <input
            type="range"
            min={elevationBounds.min}
            max={elevationBounds.max}
            step="1"
            value={elevationRange[0]}
            onChange={e => onElevationChange([Number(e.target.value), elevationRange[1]])}
            className="w-16 accent-cyan-400 cursor-pointer"
          />
          <span className="text-slate-500">to</span>
          <input
            type="range"
            min={elevationBounds.min}
            max={elevationBounds.max}
            step="1"
            value={elevationRange[1]}
            onChange={e => onElevationChange([elevationRange[0], Number(e.target.value)])}
            className="w-16 accent-cyan-400 cursor-pointer"
          />
          <span className="font-mono text-cyan-400 font-semibold">{elevationRange[1]}m</span>
        </div>
      </div>
    </div>
  );
};
