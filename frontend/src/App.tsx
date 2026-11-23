import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchMatches, fetchMatch, fetchHeatmap, fetchMacroPaths } from './services/api';
import type { MatchSummary, MatchPayload, HeatmapPoint, MacroPlayerPath } from './types/telemetry';
import { FilterBar } from './components/FilterBar';
import { MapViewport } from './components/MapViewport';
import { TimelineController } from './components/TimelineController';
import { InspectorHUD } from './components/InspectorHUD';
import { SurvivalCurveGraph } from './components/SurvivalCurveGraph';
import { ColdStartBanner } from './components/ColdStartBanner';
import { DataLoaderModal } from './components/DataLoaderModal';

export const App: React.FC = () => {
  // Parsing initial query parameters for session deep-linking
  const initialParams = useMemo(() => new URLSearchParams(window.location.search), []);

  const [isDataLoaderOpen, setIsDataLoaderOpen] = useState<boolean>(false);
  const [dates] = useState<string[]>([
    'February_10',
    'February_11',
    'February_12',
    'February_13',
    'February_14'
  ]);
  const [maps] = useState<string[]>(['AmbroseValley', 'GrandRift', 'Lockdown']);

  const [selectedDate, setSelectedDate] = useState<string>(initialParams.get('date') || '');
  const [selectedMap, setSelectedMap] = useState<string>(initialParams.get('map') || 'AmbroseValley');
  const [selectedMatch, setSelectedMatch] = useState<string>(initialParams.get('match') || '');

  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [matchData, setMatchData] = useState<MatchPayload | null>(null);

  // Playback Timeline
  const [currentTime, setCurrentTime] = useState<number>(Number(initialParams.get('t')) || 0.0);

  // Heatmap Controls
  const [showHeatmap, setShowHeatmap] = useState<boolean>(initialParams.get('heatmap') === '1');
  const [heatmapMode, setHeatmapMode] = useState<string>(initialParams.get('mode') || 'KillZones');
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);

  // Macro Flow Rivers
  const [macroPaths, setMacroPaths] = useState<MacroPlayerPath[]>([]);

  // Elevation Slicing Range [min, max]
  const [elevationRange, setElevationRange] = useState<[number, number]>([0, 200]);
  const [elevationBounds, setElevationBounds] = useState<{ min: number; max: number }>({ min: 0, max: 200 });

  // Player Selection / Isolation
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Real-time Cursor Coordinates
  const [cursorWorld, setCursorWorld] = useState<{ x: number; z: number; px: number; py: number } | null>(null);

  // Toast Notification for Deep-Link Sharing
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Layer Filter Toggles
  const [layerFilters, setLayerFilters] = useState({
    showHumans: true,
    showBots: true,
    showKills: true,
    showStorm: true,
    showLoot: true,
    showSightlines: true,
    showStormRing: true,
    showPOIs: true,
    showExtractions: true,
    showCombatVectors: true,
    showMacroRivers: false
  });

  const toggleLayer = useCallback((layerKey: keyof typeof layerFilters) => {
    setLayerFilters(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  }, []);

  const handleCursorMove = useCallback((coords: { x: number; z: number; px: number; py: number } | null) => {
    setCursorWorld(coords);
  }, []);

  // URL Deep-Linking: Synchronize URL query params on significant state changes (debounced to avoid 60fps history thrashes)
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (selectedDate) params.set('date', selectedDate);
      if (selectedMap) params.set('map', selectedMap);
      if (selectedMatch) params.set('match', selectedMatch);
      if (showHeatmap) params.set('heatmap', '1');
      if (heatmapMode !== 'KillZones') params.set('mode', heatmapMode);
      if (currentTime > 0) params.set('t', Math.round(currentTime).toString());

      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }, 600);

    return () => clearTimeout(timer);
  }, [selectedDate, selectedMap, selectedMatch, showHeatmap, heatmapMode, Math.round(currentTime)]);

  // Copy Shareable Deep Link
  const handleCopyDeepLink = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(window.location.href).catch(() => { });
      }
    } catch {
      // Fallback in headless or restricted browser environments
    }
    setToastMessage('🔗 Session Deep-Link copied to clipboard!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Initial Data Ingestion
  const loadInitialData = useCallback(async () => {
    try {
      const matchSummaries = await fetchMatches(selectedDate, selectedMap);
      setMatches(matchSummaries);

      if (matchSummaries.length > 0) {
        const preferredMatch = matchSummaries.find(m => m.human_count > 0) || matchSummaries[0];
        const urlMatch = new URLSearchParams(window.location.search).get('match') || selectedMatch;
        const targetMatchId = urlMatch && matchSummaries.some(m => m.match_id === urlMatch)
          ? urlMatch
          : preferredMatch.match_id;

        setSelectedMatch(targetMatchId);
        const payload = await fetchMatch(targetMatchId);
        setMatchData(payload);
        if (payload.elevation_bounds) {
          setElevationBounds(payload.elevation_bounds);
          setElevationRange([payload.elevation_bounds.min, payload.elevation_bounds.max]);
        }
      }
    } catch (err) {
      console.error('Failed to load initial match directory:', err);
    }
  }, [selectedDate, selectedMap, selectedMatch]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Handle Match Selection Change
  const handleMatchChange = async (matchId: string) => {
    setSelectedMatch(matchId);
    setSelectedPlayerId(null);
    setCurrentTime(0);
    try {
      const payload = await fetchMatch(matchId);
      setMatchData(payload);
      if (payload.elevation_bounds) {
        setElevationBounds(payload.elevation_bounds);
        setElevationRange([payload.elevation_bounds.min, payload.elevation_bounds.max]);
      }
    } catch (err) {
      console.error(`Failed to load match payload for ${matchId}:`, err);
    }
  };

  // Handle Map Change
  const handleMapChange = async (map: string) => {
    setSelectedMap(map);
    setSelectedMatch('');
    setSelectedPlayerId(null);
    setCurrentTime(0);
  };

  // Handle Date Filter Change
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedMatch('');
    setSelectedPlayerId(null);
    setCurrentTime(0);
  };

  // Fetch Heatmap Points
  useEffect(() => {
    if (showHeatmap) {
      fetchHeatmap(selectedMap, heatmapMode).then(res => {
        setHeatmapPoints(res.points);
      }).catch(err => {
        console.warn('Heatmap fetch failed:', err);
        setHeatmapPoints([]);
      });
    } else {
      setHeatmapPoints([]);
    }
  }, [selectedMap, heatmapMode, showHeatmap]);

  // Fetch Macro Paths when toggled
  useEffect(() => {
    if (layerFilters.showMacroRivers) {
      fetchMacroPaths(selectedMap, 25).then(paths => {
        setMacroPaths(paths);
      });
    } else {
      setMacroPaths([]);
    }
  }, [selectedMap, layerFilters.showMacroRivers]);

  const matchDuration = matchData?.duration || 100;

  // Climax Match Outcome for Timeline & Debrief
  const matchOutcome = useMemo(() => {
    if (!matchData?.players) return null;
    const human = matchData.players.find(p => !p.is_bot);
    if (!human || human.trajectory.length === 0) return null;

    const deathEvent = matchData.events.find(
      e => e.user_id === human.user_id && (e.event === 'Killed' || e.event === 'BotKilled' || e.event === 'KilledByStorm')
    );

    if (deathEvent) {
      const killer = deathEvent.event === 'KilledByStorm'
        ? 'Storm Barrier'
        : deathEvent.killer_id
          ? `${deathEvent.killer_is_bot ? 'Bot' : 'Player'} (${deathEvent.killer_id.slice(0, 6)})`
          : 'Combat';
      return {
        status: 'DEFEAT' as const,
        time: deathEvent.t,
        reason: `Eliminated by ${killer}`
      };
    }

    const lastPt = human.trajectory[human.trajectory.length - 1];
    return {
      status: 'VICTORY' as const,
      time: lastPt.t,
      reason: 'Extracted Alive'
    };
  }, [matchData]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      <ColdStartBanner isFallback={false} onRetry={loadInitialData} />

      {/* Floating Share Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-[9999] bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-2xl font-semibold text-xs animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Main Studio Navigation Header */}
      <header className="flex items-center justify-between px-6 py-2 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center font-black text-black text-xs shadow-lg shadow-cyan-500/20">
            L
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              LILA BLACK Studio
            </h1>
            <p className="text-[9px] text-slate-400 font-mono">
              Spatial Telemetry & Level Design Intelligence Suite
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono text-[10px]">89,104 Events | 796 Matches</span>
          </div>
        </div>
      </header>

      {/* Primary Layout */}
      <main className="flex-1 flex flex-col p-3 gap-2.5 max-w-[1720px] w-full mx-auto">
        {/* Triple-Tier Filter & Feature Bar */}
        <FilterBar
          dates={dates}
          maps={maps}
          matches={matches}
          selectedDate={selectedDate}
          selectedMap={selectedMap}
          selectedMatch={selectedMatch}
          heatmapMode={heatmapMode}
          showHeatmap={showHeatmap}
          elevationRange={elevationRange}
          elevationBounds={elevationBounds}
          layerFilters={layerFilters}
          onDateChange={handleDateChange}
          onMapChange={handleMapChange}
          onMatchChange={handleMatchChange}
          onToggleHeatmap={setShowHeatmap}
          onHeatmapModeChange={setHeatmapMode}
          onElevationChange={setElevationRange}
          onToggleLayer={toggleLayer}
          onCopyDeepLink={handleCopyDeepLink}
          onOpenDataLoader={() => setIsDataLoaderOpen(true)}
        />

        {/* Viewport Center & Inspector Dashboard */}
        <div className="flex flex-col lg:flex-row gap-3.5 items-start">
          {/* Spatial Viewport: Square 1:1 matching the 1024x1024 Minimap with 0 Black Bars */}
          <div className="w-full lg:w-[540px] xl:w-[560px] aspect-square shrink-0">
            <MapViewport
              mapId={selectedMap}
              players={matchData?.players || []}
              events={matchData?.events || []}
              combatEngagements={matchData?.combat_engagements || []}
              stormRing={matchData?.storm_ring}
              pois={matchData?.pois || []}
              extractions={matchData?.extractions || []}
              macroPaths={macroPaths}
              currentTime={currentTime}
              selectedPlayerId={selectedPlayerId}
              elevationRange={elevationRange}
              layerFilters={layerFilters}
              showHeatmap={showHeatmap}
              heatmapMode={heatmapMode}
              heatmapPoints={heatmapPoints}
              onCursorMove={handleCursorMove}
              onToggleLayer={toggleLayer}
            />
          </div>

          {/* Right Inspector & Level Design Analytics Dashboard */}
          <div className="flex-1 w-full min-w-0">
            <InspectorHUD
              mapId={selectedMap}
              duration={matchDuration}
              players={matchData?.players || []}
              events={matchData?.events || []}
              pois={matchData?.pois || []}
              extractions={matchData?.extractions || []}
              currentTime={currentTime}
              selectedPlayerId={selectedPlayerId}
              onSelectPlayer={setSelectedPlayerId}
              cursorWorld={cursorWorld}
            />
          </div>
        </div>

        {/* Bottom Timeline, Playback & Survivorship Curve */}
        <div className="flex flex-col gap-2">
          {/* Survivorship Curve Graph (Analytics & Pacing) */}
          {matchData?.survival_curve && matchData.survival_curve.length > 0 && (
            <SurvivalCurveGraph
              data={matchData.survival_curve}
              currentTime={currentTime}
              duration={matchDuration}
              onSeek={setCurrentTime}
            />
          )}

          {/* Frame-Accurate Timeline Controller */}
          <TimelineController
            duration={matchDuration}
            currentTime={currentTime}
            events={matchData?.events || []}
            outcomeStatus={matchOutcome?.status}
            outcomeTime={matchOutcome?.time}
            outcomeReason={matchOutcome?.reason}
            onTimeChange={setCurrentTime}
          />
        </div>
      </main>

      {/* Parquet Data Loader & Parser Modal */}
      <DataLoaderModal
        isOpen={isDataLoaderOpen}
        onClose={() => setIsDataLoaderOpen(false)}
        onDataReloaded={loadInitialData}
      />
    </div>
  );
};
