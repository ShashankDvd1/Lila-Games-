from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class TrajectoryPoint(BaseModel):
    t: float = Field(..., description="Elapsed match time in seconds")
    px: float = Field(..., description="Minimap pixel X coordinate [0, 1024]")
    py: float = Field(..., description="Minimap pixel Y coordinate [0, 1024]")
    elevation: float = Field(..., description="World elevation/height (y) in meters")
    heading_deg: Optional[float] = Field(None, description="Player facing direction heading in degrees [0, 360)")

class PlayerJourney(BaseModel):
    user_id: str
    is_bot: bool
    trajectory: List[TrajectoryPoint]

class EventMarker(BaseModel):
    t: float
    user_id: str
    is_bot: bool
    event: str
    px: float
    py: float
    elevation: float
    loot_rarity: Optional[str] = Field(None, description="Common, Rare, Epic, Legendary")
    killer_id: Optional[str] = None
    killer_is_bot: Optional[bool] = None
    victim_id: Optional[str] = None
    victim_is_bot: Optional[bool] = None
    distance_meters: Optional[float] = None

class CombatEngagement(BaseModel):
    t: float
    killer_id: str
    killer_is_bot: bool
    killer_px: float
    killer_py: float
    victim_id: str
    victim_is_bot: bool
    victim_px: float
    victim_py: float
    distance_meters: float

class POIMetric(BaseModel):
    id: str
    name: str
    center_px: float
    center_py: float
    radius_px: float
    color: str
    total_visits: int
    loot_count: int
    kill_count: int

class ExtractionZone(BaseModel):
    id: str
    name: str
    center_px: float
    center_py: float
    radius_px: float

class SurvivalCurvePoint(BaseModel):
    t: float
    alive_humans: int
    alive_bots: int
    total_alive: int

class StormRingConfig(BaseModel):
    center_px: float
    center_py: float
    initial_radius_px: float
    final_radius_px: float
    collapse_duration_seconds: float

class MatchSummary(BaseModel):
    match_id: str
    map_id: str
    date: str
    total_players: int
    bot_count: int
    human_count: int
    total_events: int
    duration_seconds: float

class MatchPayload(BaseModel):
    match_id: str
    map_id: str
    date: str
    duration: float
    total_players: int
    human_count: int
    bot_count: int
    players: List[PlayerJourney]
    events: List[EventMarker]
    combat_engagements: List[CombatEngagement] = Field(default_factory=list)
    survival_curve: List[SurvivalCurvePoint] = Field(default_factory=list)
    storm_ring: Optional[StormRingConfig] = None
    pois: List[POIMetric] = Field(default_factory=list)
    extractions: List[ExtractionZone] = Field(default_factory=list)
    elevation_bounds: Optional[Dict[str, float]] = None

class HeatmapPoint(BaseModel):
    px: float
    py: float
    weight: int

class HeatmapResponse(BaseModel):
    map_id: str
    mode: str
    points: List[HeatmapPoint]

class HealthResponse(BaseModel):
    status: str
    engine: str
    total_events: int
    total_matches: int
    total_players: int
