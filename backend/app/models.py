from pydantic import BaseModel, Field
from typing import List, Optional

class TrajectoryPoint(BaseModel):
    t: float = Field(..., description="Elapsed match time in seconds")
    px: float = Field(..., description="Minimap pixel X coordinate [0, 1024]")
    py: float = Field(..., description="Minimap pixel Y coordinate [0, 1024]")
    elevation: float = Field(..., description="World elevation/height (y) in meters")

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
