export interface TrajectoryPoint {
  t: number;
  px: number;
  py: number;
  elevation: number;
  heading_deg?: number;
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
  loot_rarity?: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  killer_id?: string;
  killer_is_bot?: boolean;
  victim_id?: string;
  victim_is_bot?: boolean;
  distance_meters?: number;
}

export interface CombatEngagement {
  t: number;
  killer_id: string;
  killer_is_bot: boolean;
  killer_px: number;
  killer_py: number;
  victim_id: string;
  victim_is_bot: boolean;
  victim_px: number;
  victim_py: number;
  distance_meters: number;
}

export interface POIMetric {
  id: string;
  name: string;
  center_px: number;
  center_py: number;
  radius_px: number;
  color: string;
  total_visits: number;
  loot_count: number;
  kill_count: number;
}

export interface ExtractionZone {
  id: string;
  name: string;
  center_px: number;
  center_py: number;
  radius_px: number;
}

export interface SurvivalCurvePoint {
  t: number;
  alive_humans: number;
  alive_bots: number;
  total_alive: number;
}

export interface StormRingConfig {
  center_px: number;
  center_py: number;
  initial_radius_px: number;
  final_radius_px: number;
  collapse_duration_seconds: number;
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
  combat_engagements?: CombatEngagement[];
  survival_curve?: SurvivalCurvePoint[];
  storm_ring?: StormRingConfig;
  pois?: POIMetric[];
  extractions?: ExtractionZone[];
  elevation_bounds?: { min: number; max: number };
}

export interface HeatmapPoint {
  px: number;
  py: number;
  weight: number;
}

export interface HeatmapResponse {
  map_id: string;
  mode: string;
  points: HeatmapPoint[];
}

export interface HealthResponse {
  status: string;
  engine: string;
  total_events: number;
  total_matches: number;
  total_players: number;
}

export interface MacroPlayerPath {
  user_id: string;
  is_bot: boolean;
  points: [number, number][];
}
