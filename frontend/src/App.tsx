import React, { useEffect, useState, useCallback } from 'react';
import type {
  MatchSummary,
  MatchPayload,
  LayerFilters,
  HeatmapPoint,
} from './types/telemetry';
import {
  fetchMatches,
  fetchMatchDetail,
  fetchHeatmap,
  checkBackendHealth,
} from './services/api';
import { MapViewport } from './components/MapViewport';
import { TimelineController } from './components/TimelineController';
import { FilterBar } from './components/FilterBar';
import { InspectorHUD } from './components/InspectorHUD';
import { ColdStartBanner } from './components/ColdStartBanner';
import { Compass, Activity, Sparkles } from 'lucide-react';

const DATES = [
  'February_10',
  'February_11',
  'February_12',
  'February_13',
  'February_14',
];

const MAPS = ['AmbroseValley', 'GrandRift', 'Lockdown'];

export const App: React.FC = () => {
  // Navigation / Selection State
  const [selectedDate, setSelectedDate] = useState<string>('February_10');
  const [selectedMap, setSelectedMap] = useState<string>('AmbroseValley');
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  
  // Current Match & Playback State
  const [currentMatch, setCurrentMatch] = useState<MatchPayload | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | undefined>(undefined);
  
  // Layer & Visual Settings
  const [layerFilters, setLayerFilters] = useState<LayerFilters>({
    showHumans: true,
    showBots: true,
    showKills: true,
    showStorm: true,
    showLoot: true,
  });

  // Heatmap Overlay State
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [heatmapMode, setHeatmapMode] = useState<'KillZones' | 'DeathZones' | 'Traffic'>('KillZones');
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);

  // Connectivity / Fallback State
  const [isFallback, setIsFallback] = useState<boolean>(false);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(false);

  // Initial Load: Check backend and load matches
  const loadInitialData = useCallback(async () => {
    const health = await checkBackendHealth();
    setIsBackendOnline(health.online);

    const matchSummaries = await fetchMatches(selectedDate, selectedMap);
    setMatches(matchSummaries);

    if (matchSummaries.length > 0) {
      const firstMatchId = matchSummaries[0].match_id;
      setSelectedMatchId(firstMatchId);
      const matchRes = await fetchMatchDetail(firstMatchId);
      setCurrentMatch(matchRes.data);
      setIsFallback(matchRes.isFallback);
      setCurrentTime(0);
    }
  }, [selectedDate, selectedMap]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Handle Match Selection Change
  const handleMatchChange = async (matchId: string) => {
    setSelectedMatchId(matchId);
    const matchRes = await fetchMatchDetail(matchId);
    setCurrentMatch(matchRes.data);
    setIsFallback(matchRes.isFallback);
    setCurrentTime(0);
    setSelectedPlayerId(undefined);
  };

  // Handle Date Filter Change
  const handleDateChange = async (date: string) => {
    setSelectedDate(date);
    const updated = await fetchMatches(date, selectedMap);
    setMatches(updated);
    if (updated.length > 0) {
      handleMatchChange(updated[0].match_id);
    }
  };

  // Handle Map Filter Change
  const handleMapChange = async (map: string) => {
    setSelectedMap(map);
    const updated = await fetchMatches(selectedDate, map);
    setMatches(updated);
    if (updated.length > 0) {
      handleMatchChange(updated[0].match_id);
    }
    // Refresh heatmap if active
    if (showHeatmap) {
      const heatRes = await fetchHeatmap(map, heatmapMode);
      setHeatmapPoints(heatRes.points);
    }
  };

  // Handle Heatmap Toggle / Mode Change
  useEffect(() => {
    if (showHeatmap) {
      fetchHeatmap(selectedMap, heatmapMode).then(res => {
        setHeatmapPoints(res.points);
      });
    } else {
      setHeatmapPoints([]);
    }
  }, [showHeatmap, heatmapMode, selectedMap]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-3.5 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30">
            <Compass size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold tracking-wider text-base text-white">LILA BLACK</h1>
              <span className="text-[10px] bg-cyan-950 text-cyan-400 font-mono font-bold px-2 py-0.5 rounded-full border border-cyan-800">
                LEVEL DESIGN TELEMETRY
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Player Journey, Combat Hotspots & Storm Flow Visualizer</p>
          </div>
        </div>

        {/* Connectivity Status & Metrics HUD */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <div className={`w-2 h-2 rounded-full ${isBackendOnline && !isFallback ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
            <span className="font-mono text-slate-300">
              {isBackendOnline && !isFallback ? 'Live Backend (Render)' : 'Demo Fallback Mode'}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/60 font-mono">
            <Activity size={13} className="text-cyan-400" />
            <span>Map: <strong className="text-white">{selectedMap}</strong></span>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 p-5 max-w-[1720px] w-full mx-auto flex flex-col gap-4">
        {/* Cold-Start Indicator (Only appears if backend is waking up) */}
        <ColdStartBanner isFallback={isFallback} onRetry={loadInitialData} />

        {/* Multi-Dimensional Filter Bar */}
        <FilterBar
          dates={DATES}
          maps={MAPS}
          matches={matches}
          selectedDate={selectedDate}
          selectedMap={selectedMap}
          selectedMatch={selectedMatchId}
          layerFilters={layerFilters}
          heatmapMode={heatmapMode}
          showHeatmap={showHeatmap}
          onDateChange={handleDateChange}
          onMapChange={handleMapChange}
          onMatchChange={handleMatchChange}
          onLayerFilterChange={setLayerFilters}
          onToggleHeatmap={setShowHeatmap}
          onHeatmapModeChange={setHeatmapMode}
        />

        {/* Workspace Layout: Minimap Viewport (Left 75%) + Inspector HUD (Right 25%) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 items-start">
          {/* Left Column: Minimap Canvas & Playback Bar */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            <MapViewport
              mapId={selectedMap}
              players={currentMatch?.players || []}
              events={currentMatch?.events || []}
              currentTime={currentTime}
              layerFilters={layerFilters}
              selectedPlayerId={selectedPlayerId}
              showHeatmap={showHeatmap}
              heatmapMode={heatmapMode}
              heatmapPoints={heatmapPoints}
              onSelectPlayer={setSelectedPlayerId}
            />

            {/* Scrubbable Timeline Controller */}
            <TimelineController
              duration={currentMatch?.duration || 0}
              currentTime={currentTime}
              events={currentMatch?.events || []}
              onTimeChange={setCurrentTime}
            />
          </div>

          {/* Right Column: Level Designer Inspector HUD */}
          <div className="lg:col-span-1">
            <InspectorHUD
              match={currentMatch}
              currentTime={currentTime}
              selectedPlayerId={selectedPlayerId}
              onSelectPlayer={setSelectedPlayerId}
              onJumpToTime={setCurrentTime}
            />
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-3 text-center text-slate-500 text-xs flex items-center justify-between font-mono">
        <span>LILA Games Written Test Deliverable — Level Design Visualization Tool</span>
        <span className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-cyan-400" />
          <span>Vercel Edge UI + Render DuckDB Analytics</span>
        </span>
      </footer>
    </div>
  );
};

export default App;
