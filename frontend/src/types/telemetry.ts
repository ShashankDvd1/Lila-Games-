export interface TrajectoryPoint {
  t: number;
  px: number;
  py: number;
  elevation: number;
}

export interface PlayerJourney {
  user_id: string;
  is_bot: boolean;
  trajectory: TrajectoryPoint[];
}

export interface EventMarker {
  t: number;
  user_id: string;
  is_bot: boolean;
  event: 'Kill' | 'BotKill' | 'Killed' | 'BotKilled' | 'KilledByStorm' | 'Loot' | string;
  px: number;
  py: number;
  elevation: number;
}

export interface MatchSummary {
  match_id: string;
  map_id: string;
  date: string;
  total_players: number;
  bot_count: number;
  human_count: number;
  total_events: number;
  duration_seconds: number;
}

export interface MatchPayload {
  match_id: string;
  map_id: string;
  date: string;
  duration: number;
  total_players: number;
  human_count: number;
  bot_count: number;
  players: PlayerJourney[];
  events: EventMarker[];
}

export interface HeatmapPoint {
  px: number;
  py: number;
  weight: number;
}

export interface HeatmapResponse {
  map_id: string;
  mode: 'KillZones' | 'DeathZones' | 'Traffic';
  points: HeatmapPoint[];
}

export interface LayerFilters {
  showHumans: boolean;
  showBots: boolean;
  showKills: boolean;
  showStorm: boolean;
  showLoot: boolean;
}

export interface MapConfig {
  scale: number;
  origin_x: number;
  origin_z: number;
  displayName: string;
}

export const MAP_CONFIGS: Record<string, MapConfig> = {
  AmbroseValley: { scale: 900.0, origin_x: -370.0, origin_z: -473.0, displayName: 'Ambrose Valley' },
  GrandRift: { scale: 581.0, origin_x: -290.0, origin_z: -290.0, displayName: 'Grand Rift' },
  Lockdown: { scale: 1000.0, origin_x: -500.0, origin_z: -500.0, displayName: 'Lockdown' },
};
