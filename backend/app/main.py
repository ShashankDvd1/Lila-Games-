from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any
from app.db import TelemetryDB
from app.models import MatchSummary, MatchPayload, HeatmapResponse, HealthResponse

app = FastAPI(
    title="LILA BLACK Telemetry API",
    description="High-performance backend analytical query engine for Player Journey Visualization",
    version="1.1.0"
)

# Enable CORS for Vercel edge deployment and local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize embedded DuckDB database service
db = TelemetryDB()

@app.get("/api/health", response_model=HealthResponse)
def health_check():
    stats = db.get_stats()
    return {
        "status": "online",
        "engine": "duckdb",
        "total_events": stats["total_events"],
        "total_matches": stats["total_matches"],
        "total_players": stats["total_players"]
    }

@app.get("/api/matches", response_model=List[MatchSummary])
def get_matches(
    date: Optional[str] = Query(None, description="Date filter, e.g. February_10 to February_14"),
    map_id: Optional[str] = Query(None, description="Map filter: AmbroseValley, GrandRift, Lockdown")
):
    return db.list_matches(date_filter=date, map_filter=map_id)

@app.get("/api/matches/{match_id}", response_model=MatchPayload)
def get_match(match_id: str):
    data = db.get_match_payload(match_id)
    if not data:
        raise HTTPException(status_code=404, detail=f"Match '{match_id}' not found")
    return data

@app.get("/api/heatmaps/{map_id}", response_model=HeatmapResponse)
def get_heatmap(
    map_id: str,
    mode: str = Query("KillZones", regex="^(KillZones|DeathZones|Traffic)$", description="Heatmap mode")
):
    points = db.get_heatmap_points(map_id, mode)
    return {
        "map_id": map_id,
        "mode": mode,
        "points": points
    }

@app.get("/api/macro-paths/{map_id}")
def get_macro_paths(
    map_id: str,
    limit: int = Query(25, ge=1, le=100, description="Number of matches to sample for macro rivers")
):
    """Returns multi-match macro trajectories for cohort flow visualization."""
    return db.get_macro_paths(map_id=map_id, limit_matches=limit)
