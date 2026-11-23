import React from 'react';
import { Calendar, MapPin, Hash, Flame, Users, Bot, Skull, CloudRain, Gem } from 'lucide-react';
import type { LayerFilters, MatchSummary } from '../types/telemetry';

interface FilterBarProps {
  dates: string[];
  maps: string[];
  matches: MatchSummary[];
  selectedDate: string;
  selectedMap: string;
  selectedMatch: string;
  layerFilters: LayerFilters;
  heatmapMode: 'KillZones' | 'DeathZones' | 'Traffic';
  showHeatmap: boolean;
  onDateChange: (date: string) => void;
  onMapChange: (map: string) => void;
  onMatchChange: (matchId: string) => void;
  onLayerFilterChange: (filters: LayerFilters) => void;
  onToggleHeatmap: (show: boolean) => void;
  onHeatmapModeChange: (mode: 'KillZones' | 'DeathZones' | 'Traffic') => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  dates,
  maps,
  matches,
  selectedDate,
  selectedMap,
  selectedMatch,
  layerFilters,
  heatmapMode,
  showHeatmap,
  onDateChange,
  onMapChange,
  onMatchChange,
  onLayerFilterChange,
  onToggleHeatmap,
  onHeatmapModeChange,
}) => {
  const toggleFilter = (key: keyof LayerFilters) => {
    onLayerFilterChange({
      ...layerFilters,
      [key]: !layerFilters[key],
    });
  };

  return (
    <div className="flex flex-col gap-3 bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/80 shadow-xl text-white">
      {/* Top Row: Triple Filters (Date, Map, Match) & Heatmap */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Filter */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700 text-xs shadow-inner">
            <Calendar size={14} className="text-cyan-400" />
            <select
              value={selectedDate}
              onChange={e => onDateChange(e.target.value)}
              className="bg-transparent text-white outline-none cursor-pointer font-medium"
            >
              <option value="" className="bg-slate-800">All Dates (Feb 10-14)</option>
              {dates.map(d => (
                <option key={d} value={d} className="bg-slate-800">
                  {d.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Map Filter */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700 text-xs shadow-inner">
            <MapPin size={14} className="text-emerald-400" />
            <select
              value={selectedMap}
              onChange={e => onMapChange(e.target.value)}
              className="bg-transparent text-white outline-none cursor-pointer font-medium"
            >
              {maps.map(m => (
                <option key={m} value={m} className="bg-slate-800">
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Match Filter */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700 text-xs shadow-inner">
            <Hash size={14} className="text-amber-400" />
            <select
              value={selectedMatch}
              onChange={e => onMatchChange(e.target.value)}
              className="bg-transparent text-white outline-none cursor-pointer font-mono font-medium max-w-[210px] truncate"
            >
              {matches.map(m => (
                <option key={m.match_id} value={m.match_id} className="bg-slate-800">
                  {m.match_id.substring(0, 8)}... ({m.human_count}H / {m.bot_count}B) - {Math.round(m.duration_seconds / 60)}m
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Heatmap Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleHeatmap(!showHeatmap)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
              showHeatmap
                ? 'bg-gradient-to-r from-orange-600 to-red-600 border-orange-500 text-white shadow-lg shadow-orange-600/30'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Flame size={14} className={showHeatmap ? 'animate-pulse text-amber-200' : 'text-slate-400'} />
            <span>Heatmap Overlay</span>
          </button>

          {showHeatmap && (
            <select
              value={heatmapMode}
              onChange={e => onHeatmapModeChange(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 text-white text-xs px-2.5 py-1.5 rounded-xl outline-none cursor-pointer font-medium"
            >
              <option value="KillZones">Kill Zones (Hotspots)</option>
              <option value="DeathZones">Death Zones (Inc. Storm)</option>
              <option value="Traffic">High-Traffic Routes</option>
            </select>
          )}
        </div>
      </div>

      {/* Bottom Row: Layer Toggle Pills */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80 text-xs">
        <span className="text-slate-400 font-semibold mr-1">Layers:</span>

        {/* Human Paths Toggle */}
        <button
          onClick={() => toggleFilter('showHumans')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition ${
            layerFilters.showHumans
              ? 'bg-cyan-950/80 border-cyan-500/70 text-cyan-300'
              : 'bg-slate-800/50 border-slate-700 text-slate-500 line-through'
          }`}
        >
          <Users size={12} />
          <span>Humans (Solid Cyan)</span>
        </button>

        {/* Bot Paths Toggle */}
        <button
          onClick={() => toggleFilter('showBots')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition ${
            layerFilters.showBots
              ? 'bg-amber-950/80 border-amber-500/70 text-amber-300'
              : 'bg-slate-800/50 border-slate-700 text-slate-500 line-through'
          }`}
        >
          <Bot size={12} />
          <span>Bots (Dashed Amber)</span>
        </button>

        {/* Kills Toggle */}
        <button
          onClick={() => toggleFilter('showKills')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition ${
            layerFilters.showKills
              ? 'bg-red-950/80 border-red-500/70 text-red-300'
              : 'bg-slate-800/50 border-slate-700 text-slate-500 line-through'
          }`}
        >
          <Skull size={12} />
          <span>Kills / Deaths</span>
        </button>

        {/* Storm Fatalities Toggle */}
        <button
          onClick={() => toggleFilter('showStorm')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition ${
            layerFilters.showStorm
              ? 'bg-purple-950/80 border-purple-500/70 text-purple-300'
              : 'bg-slate-800/50 border-slate-700 text-slate-500 line-through'
          }`}
        >
          <CloudRain size={12} />
          <span>Storm Deaths</span>
        </button>

        {/* Loot Pickups Toggle */}
        <button
          onClick={() => toggleFilter('showLoot')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition ${
            layerFilters.showLoot
              ? 'bg-emerald-950/80 border-emerald-500/70 text-emerald-300'
              : 'bg-slate-800/50 border-slate-700 text-slate-500 line-through'
          }`}
        >
          <Gem size={12} />
          <span>Loot Events</span>
        </button>
      </div>
    </div>
  );
};
