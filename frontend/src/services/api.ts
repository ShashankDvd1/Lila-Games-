import type { MatchSummary, MatchPayload, HeatmapResponse } from '../types/telemetry';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function checkBackendHealth(): Promise<{ online: boolean; status?: any }> {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error();
    const data = await res.json();
    return { online: true, status: data };
  } catch {
    return { online: false };
  }
}

export async function fetchMatches(date?: string, mapId?: string): Promise<MatchSummary[]> {
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  if (mapId) params.append('map_id', mapId);

  try {
    const res = await fetch(`${API_BASE}/api/matches?${params.toString()}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error('Failed to fetch matches');
    return await res.json();
  } catch {
    console.warn('Backend sleeping or offline. Using static match list fallback.');
    return [
      {
        match_id: 'd3a3297e-2cdf-4a49-8450-09119b91a779.nakama-0',
        map_id: 'AmbroseValley',
        date: 'February_10',
        total_players: 14,
        bot_count: 13,
        human_count: 1,
        total_events: 1097,
        duration_seconds: 795.0,
      },
    ];
  }
}

export async function fetchMatchDetail(matchId: string): Promise<{ data: MatchPayload; isFallback: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/api/matches/${matchId}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error('API non-200');
    const data = await res.json();
    return { data, isFallback: false };
  } catch {
    console.warn('Render API unavailable. Loading pre-bundled Ambrose Valley demo match...');
    const fallbackRes = await fetch('/demo/ambrose_valley_demo.json');
    const data = await fallbackRes.json();
    return { data, isFallback: true };
  }
}

export async function fetchHeatmap(mapId: string, mode: string): Promise<HeatmapResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/heatmaps/${mapId}?mode=${mode}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error('Failed to fetch heatmap');
    return await res.json();
  } catch {
    return { map_id: mapId, mode: mode as any, points: [] };
  }
}
