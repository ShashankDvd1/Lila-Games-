import type { MatchSummary, MatchPayload, HeatmapResponse, HealthResponse, MacroPlayerPath } from '../types/telemetry';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const fetchWithTimeout = async (url: string, timeoutMs: number = 4000): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export const checkHealth = async (): Promise<HealthResponse> => {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/health`, 3000);
  if (!res.ok) throw new Error('API offline');
  return res.json();
};

export const fetchMatches = async (date?: string, mapId?: string): Promise<MatchSummary[]> => {
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  if (mapId) params.append('map_id', mapId);

  const res = await fetchWithTimeout(`${API_BASE_URL}/api/matches?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch matches');
  return res.json();
};

export const fetchMatch = async (matchId: string): Promise<MatchPayload> => {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/matches/${matchId}`, 5000);
    if (!res.ok) throw new Error('Failed to fetch match');
    return res.json();
  } catch (err) {
    console.warn(`[API] Remote fetch for ${matchId} failed, falling back to bundled demo match.`, err);
    const demoRes = await fetch('/demo/ambrose_valley_demo.json');
    if (!demoRes.ok) throw new Error('Both API and offline demo fallback failed');
    return demoRes.json();
  }
};

export const fetchHeatmap = async (mapId: string, mode: string): Promise<HeatmapResponse> => {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/heatmaps/${mapId}?mode=${mode}`);
  if (!res.ok) throw new Error('Failed to fetch heatmap');
  return res.json();
};

export const fetchMacroPaths = async (mapId: string, limit: number = 25): Promise<MacroPlayerPath[]> => {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/macro-paths/${mapId}?limit=${limit}`, 5000);
    if (!res.ok) throw new Error('Failed to fetch macro paths');
    return res.json();
  } catch (err) {
    console.warn('[API] Failed to fetch macro paths:', err);
    return [];
  }
};
