import React from 'react';
import { Calendar, Map, Hash, Flame, Database, Share2 } from 'lucide-react';
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
  onOpenDataLoader: () => void;
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
  onDateChange,
  onMapChange,
  onMatchChange,
  onToggleHeatmap,
  onHeatmapModeChange,
  onCopyDeepLink,
  onOpenDataLoader
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/95 px-4 py-2.5 rounded-2xl border border-slate-800 shadow-xl text-white text-xs">
      {/* Left: Map Tabs & Selection */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Map Quick Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-500 px-2 flex items-center gap-1">
            <Map size={12} className="text-cyan-400" /> Map:
          </span>
          {maps.map(m => {
            const isSelected = selectedMap === m;
            const displayName = m === 'AmbroseValley' ? 'Ambrose Valley' : m === 'GrandRift' ? 'Grand Rift' : 'Lockdown';
            return (
              <button
                key={m}
                onClick={() => onMapChange(m)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md shadow-cyan-900/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                {displayName}
              </button>
            );
          })}
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <Calendar size={14} className="text-cyan-400" />
          <select
            value={selectedDate}
            onChange={e => onDateChange(e.target.value)}
            className="bg-transparent text-white outline-none cursor-pointer font-medium"
          >
            <option value="" className="bg-slate-900">All Dates (Feb 10 - 14)</option>
            {dates.map(d => (
              <option key={d} value={d} className="bg-slate-900">
                {d.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Match Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <Hash size={14} className="text-amber-400" />
          <select
            value={selectedMatch}
            onChange={e => onMatchChange(e.target.value)}
            className="bg-transparent text-white outline-none cursor-pointer truncate w-56 font-mono text-[11px]"
          >
            {matches.map(m => (
              <option key={m.match_id} value={m.match_id} className="bg-slate-900">
                {m.human_count > 0 ? '👤 Human' : '🤖 Bot-Only'} | {m.match_id.substring(0, 8)} ({m.human_count}H / {m.bot_count}B)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: Actions, Parquet Loader & Heatmaps */}
      <div className="flex items-center gap-2">
        {/* Parquet Data Loader Button (Requirement 1) */}
        <button
          onClick={onOpenDataLoader}
          title="Open Parquet Telemetry Loader & DuckDB Analytical Status"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/50 bg-cyan-950/80 hover:bg-cyan-900/90 text-cyan-300 font-semibold transition cursor-pointer shadow-lg shadow-cyan-950/40"
        >
          <Database size={14} className="text-cyan-400" />
          <span>📂 Load Parquet Data</span>
        </button>

        {/* Heatmap Toggle */}
        <button
          onClick={() => onToggleHeatmap(!showHeatmap)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-medium transition cursor-pointer ${
            showHeatmap
              ? 'bg-gradient-to-r from-orange-600 to-amber-600 border-orange-500 shadow-md shadow-orange-900/40 text-white'
              : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Flame size={14} className={showHeatmap ? 'animate-pulse' : 'text-orange-400'} />
          <span>Heatmap</span>
        </button>

        {showHeatmap && (
          <select
            value={heatmapMode}
            onChange={e => onHeatmapModeChange(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-white px-2.5 py-1.5 rounded-xl outline-none cursor-pointer font-medium text-xs"
          >
            <option value="KillZones" className="bg-slate-900">🔥 Kill Zones</option>
            <option value="DeathZones" className="bg-slate-900">☠️ Death Zones</option>
            <option value="Traffic" className="bg-slate-900">🧭 High-Traffic Routes</option>
          </select>
        )}

        {/* Share Deep Link */}
        <button
          onClick={onCopyDeepLink}
          title="Copy URL with current match, time, and active filters"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer"
        >
          <Share2 size={13} />
          <span>Share</span>
        </button>
      </div>
    </div>
  );
};
