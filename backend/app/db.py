import duckdb
import os
import math
from typing import List, Dict, Any, Optional
from app.config import DATA_DIR, MAP_CONFIGS
from app.coordinates import world_to_pixel

def calculate_heading(dx: float, dz: float) -> float:
    """Calculates compass heading angle in degrees (0 = North, 90 = East)."""
    if abs(dx) < 1e-4 and abs(dz) < 1e-4:
        return 0.0
    # In world coords, z is North (up), x is East (right)
    angle_rad = math.atan2(dx, dz)
    angle_deg = math.degrees(angle_rad)
    return round((angle_deg + 360.0) % 360.0, 1)

def assign_loot_rarity(x: float, y: float, z: float) -> str:
    """Assigns deterministic loot rarity tiers based on spatial coordinates."""
    h = int(abs(x * 31 + y * 17 + z * 53)) % 100
    if h < 55:
        return "Common"      # Grey
    elif h < 85:
        return "Rare"        # Blue
    elif h < 96:
        return "Epic"        # Purple
    else:
        return "Legendary"   # Gold

class TelemetryDB:
    def __init__(self, data_dir: str = DATA_DIR):
        self.con = duckdb.connect(database=":memory:")
        parquet_glob = os.path.join(data_dir, "*", "*.nakama-0").replace("\\", "/")
        
        print(f"Loading DuckDB telemetry table from {parquet_glob}...")
        self.con.execute(f"""
            CREATE TABLE telemetry AS 
            SELECT 
                user_id,
                match_id,
                map_id,
                x, y, z,
                ts,
                epoch_ms(ts) as raw_epoch,
                decode(event) as event_str,
                regexp_extract(filename, 'February_[0-9]+') as date_folder,
                CASE WHEN regexp_matches(user_id, '^[0-9]+$') THEN true ELSE false END as is_bot
            FROM read_parquet('{parquet_glob}', filename=true)
        """)
        
        # Create indexes for instantaneous lookups
        self.con.execute("CREATE INDEX idx_match_id ON telemetry(match_id)")
        self.con.execute("CREATE INDEX idx_map_id ON telemetry(map_id)")
        self.con.execute("CREATE INDEX idx_date ON telemetry(date_folder)")
        
        # Pre-materialize in-memory matches directory table for sub-millisecond retrieval
        self.con.execute("""
            CREATE TABLE matches_summary AS
            SELECT 
                match_id,
                map_id,
                date_folder as date,
                COUNT(DISTINCT user_id) as total_players,
                COUNT(DISTINCT CASE WHEN is_bot THEN user_id END) as bot_count,
                COUNT(DISTINCT CASE WHEN NOT is_bot THEN user_id END) as human_count,
                COUNT(*) as total_events,
                ROUND(MAX(raw_epoch) - MIN(raw_epoch), 1) as duration_seconds
            FROM telemetry
            GROUP BY match_id, map_id, date_folder
            ORDER BY total_events DESC
        """)
        print("DuckDB in-memory telemetry table, indexes, and summary cache initialized.")

    def get_stats(self) -> Dict[str, int]:
        res = self.con.execute("""
            SELECT 
                COUNT(*) as total_events,
                COUNT(DISTINCT match_id) as total_matches,
                COUNT(DISTINCT user_id) as total_players
            FROM telemetry
        """).fetchone()
        return {
            "total_events": res[0],
            "total_matches": res[1],
            "total_players": res[2]
        }

    def list_matches(self, date_filter: Optional[str] = None, map_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        where_clauses = []
        if date_filter:
            where_clauses.append(f"date = '{date_filter}'")
        if map_filter:
            where_clauses.append(f"map_id = '{map_filter}'")
            
        where_str = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

        query = f"""
            SELECT * FROM matches_summary
            {where_str}
            LIMIT 200
        """
        df = self.con.execute(query).df()
        return df.to_dict(orient="records")

    def get_match_payload(self, match_id: str) -> Optional[Dict[str, Any]]:
        query = f"""
            SELECT 
                user_id,
                is_bot,
                map_id,
                date_folder,
                x, y, z,
                raw_epoch,
                event_str as event
            FROM telemetry
            WHERE match_id = '{match_id}'
            ORDER BY raw_epoch ASC
        """
        df = self.con.execute(query).df()
        if df.empty:
            return None

        map_id = df["map_id"].iloc[0]
        date_folder = df["date_folder"].iloc[0]
        min_epoch = df["raw_epoch"].min()
        max_epoch = df["raw_epoch"].max()
        duration = round(float(max_epoch - min_epoch), 1)
        map_cfg = MAP_CONFIGS.get(map_id, MAP_CONFIGS["AmbroseValley"])

        players: Dict[str, Any] = {}
        events: List[Dict[str, Any]] = []
        raw_events_list: List[Dict[str, Any]] = []

        for _, row in df.iterrows():
            uid = str(row["user_id"])
            is_bot = bool(row["is_bot"])
            ev_str = str(row["event"])
            
            px, py = world_to_pixel(row["x"], row["z"], map_id)
            rel_time = round(float(row["raw_epoch"] - min_epoch), 1)

            if uid not in players:
                players[uid] = {
                    "user_id": uid,
                    "is_bot": is_bot,
                    "trajectory": []
                }

            # Heading calculation from previous trajectory point
            heading = 0.0
            if players[uid]["trajectory"]:
                prev = players[uid]["trajectory"][-1]
                dx = px - prev["px"]
                dy = py - prev["py"]
                # In pixel space, py increases downward
                heading = calculate_heading(dx, -dy)

            # Append position keyframe
            players[uid]["trajectory"].append({
                "t": rel_time,
                "px": px,
                "py": py,
                "elevation": round(float(row["y"]), 1),
                "heading_deg": heading
            })

            # Append non-position discrete events (kills, deaths, storm, loot)
            if ev_str not in ("Position", "BotPosition"):
                rarity = assign_loot_rarity(row["x"], row["y"], row["z"]) if ev_str == "Loot" else None
                event_dict = {
                    "t": rel_time,
                    "user_id": uid,
                    "is_bot": is_bot,
                    "event": ev_str,
                    "px": px,
                    "py": py,
                    "elevation": round(float(row["y"]), 1),
                    "loot_rarity": rarity
                }
                events.append(event_dict)
                raw_events_list.append({
                    "t": rel_time,
                    "user_id": uid,
                    "is_bot": is_bot,
                    "event": ev_str,
                    "px": px,
                    "py": py,
                    "x": float(row["x"]),
                    "z": float(row["z"])
                })

        player_list = list(players.values())
        human_count = sum(1 for p in player_list if not p["is_bot"])
        bot_count = sum(1 for p in player_list if p["is_bot"])

        # 1. Compute Combat Engagement Vectors (pairing kills with deaths within 2s)
        engagements: List[Dict[str, Any]] = []
        kills = [e for e in raw_events_list if e["event"] in ("Kill", "BotKill")]
        deaths = [e for e in raw_events_list if e["event"] in ("Killed", "BotKilled")]
        
        for k in kills:
            # Find nearest death within 2.5 seconds
            candidates = [d for d in deaths if abs(d["t"] - k["t"]) <= 2.5 and d["user_id"] != k["user_id"]]
            if candidates:
                best_victim = min(candidates, key=lambda d: math.hypot(k["x"] - d["x"], k["z"] - d["z"]))
                dist_m = round(math.hypot(k["x"] - best_victim["x"], k["z"] - best_victim["z"]), 1)
                engagements.append({
                    "t": k["t"],
                    "killer_id": k["user_id"],
                    "killer_is_bot": k["is_bot"],
                    "killer_px": k["px"],
                    "killer_py": k["py"],
                    "victim_id": best_victim["user_id"],
                    "victim_is_bot": best_victim["is_bot"],
                    "victim_px": best_victim["px"],
                    "victim_py": best_victim["py"],
                    "distance_meters": dist_m
                })

        # 2. Compute Survival Decay Curve (player cohort remaining over match time steps)
        survival_curve: List[Dict[str, Any]] = []
        time_step = max(10.0, duration / 30.0) if duration > 0 else 10.0
        cur_t = 0.0
        
        # Build death timestamp dictionary per player
        player_death_times: Dict[str, float] = {}
        for d in deaths:
            player_death_times[d["user_id"]] = d["t"]
        for s in [e for e in raw_events_list if e["event"] == "KilledByStorm"]:
            player_death_times[s["user_id"]] = s["t"]

        while cur_t <= duration + 1.0:
            alive_h = 0
            alive_b = 0
            for p in player_list:
                uid = p["user_id"]
                death_t = player_death_times.get(uid, 999999.0)
                # Player was alive if match time is before their death event
                if cur_t <= death_t:
                    if p["is_bot"]:
                        alive_b += 1
                    else:
                        alive_h += 1
            survival_curve.append({
                "t": round(cur_t, 1),
                "alive_humans": alive_h,
                "alive_bots": alive_b,
                "total_alive": alive_h + alive_b
            })
            cur_t += time_step

        # 3. Dynamic Storm Ring Geometry
        storm_w = map_cfg.get("storm_center_world", {"x": 0.0, "z": 0.0})
        sc_px, sc_py = world_to_pixel(storm_w["x"], storm_w["z"], map_id)
        storm_ring = {
            "center_px": sc_px,
            "center_py": sc_py,
            "initial_radius_px": 550.0,
            "final_radius_px": 80.0,
            "collapse_duration_seconds": max(duration, 300.0)
        }

        # 4. Compute POI Metrics for this match
        scale = map_cfg["scale"]
        pois_data: List[Dict[str, Any]] = []
        for poi in map_cfg.get("pois", []):
            poi_px, poi_py = world_to_pixel(poi["x"], poi["z"], map_id)
            radius_px = (poi["radius"] / scale) * 1024.0
            
            # Aggregate metrics inside this POI circle
            visits = 0
            loot_cnt = 0
            kill_cnt = 0
            
            for p in player_list:
                for pt in p["trajectory"]:
                    if math.hypot(pt["px"] - poi_px, pt["py"] - poi_py) <= radius_px:
                        visits += 1
                        break
            for ev in events:
                if math.hypot(ev["px"] - poi_px, ev["py"] - poi_py) <= radius_px:
                    if ev["event"] == "Loot":
                        loot_cnt += 1
                    elif "Kill" in ev["event"]:
                        kill_cnt += 1
                        
            pois_data.append({
                "id": poi["id"],
                "name": poi["name"],
                "center_px": round(poi_px, 1),
                "center_py": round(poi_py, 1),
                "radius_px": round(radius_px, 1),
                "color": poi["color"],
                "total_visits": visits,
                "loot_count": loot_cnt,
                "kill_count": kill_cnt
            })

        # 5. Extraction Zones
        extractions_data: List[Dict[str, Any]] = []
        for ext in map_cfg.get("extractions", []):
            ext_px, ext_py = world_to_pixel(ext["x"], ext["z"], map_id)
            rad_px = (ext["radius"] / scale) * 1024.0
            extractions_data.append({
                "id": ext["id"],
                "name": ext["name"],
                "center_px": round(ext_px, 1),
                "center_py": round(ext_py, 1),
                "radius_px": round(rad_px, 1)
            })

        return {
            "match_id": match_id,
            "map_id": map_id,
            "date": date_folder,
            "duration": duration,
            "total_players": len(player_list),
            "human_count": human_count,
            "bot_count": bot_count,
            "players": player_list,
            "events": events,
            "combat_engagements": engagements,
            "survival_curve": survival_curve,
            "storm_ring": storm_ring,
            "pois": pois_data,
            "extractions": extractions_data,
            "elevation_bounds": map_cfg.get("elevation_bounds", {"min": 0.0, "max": 200.0})
        }

    def get_heatmap_points(self, map_id: str, mode: str) -> List[Dict[str, Any]]:
        if mode == "KillZones":
            event_filter = "event_str IN ('Kill', 'BotKill')"
        elif mode == "DeathZones":
            event_filter = "event_str IN ('Killed', 'BotKilled', 'KilledByStorm')"
        else: # 'Traffic'
            event_filter = "event_str IN ('Position', 'BotPosition')"

        query = f"""
            SELECT x, z, COUNT(*) as weight
            FROM telemetry
            WHERE map_id = '{map_id}' AND {event_filter}
            GROUP BY round(x, 0), round(z, 0), x, z
            LIMIT 5000
        """
        df = self.con.execute(query).df()
        
        points = []
        for _, row in df.iterrows():
            px, py = world_to_pixel(row["x"], row["z"], map_id)
            points.append({
                "px": px,
                "py": py,
                "weight": int(row["weight"])
            })
        return points

    def get_macro_paths(self, map_id: str, limit_matches: int = 25) -> List[Dict[str, Any]]:
        """Multi-match macro aggregate flow river paths for Analytics."""
        query = f"""
            WITH sample_matches AS (
                SELECT DISTINCT match_id 
                FROM telemetry 
                WHERE map_id = '{map_id}' 
                LIMIT {limit_matches}
            )
            SELECT user_id, is_bot, x, z, raw_epoch
            FROM telemetry
            WHERE match_id IN (SELECT match_id FROM sample_matches)
              AND event_str IN ('Position', 'BotPosition')
            ORDER BY user_id, raw_epoch ASC
            LIMIT 4000
        """
        df = self.con.execute(query).df()
        grouped: Dict[str, Any] = {}
        for _, row in df.iterrows():
            uid = str(row["user_id"])
            if uid not in grouped:
                grouped[uid] = {
                    "user_id": uid,
                    "is_bot": bool(row["is_bot"]),
                    "points": []
                }
            px, py = world_to_pixel(row["x"], row["z"], map_id)
            grouped[uid]["points"].append([round(px, 1), round(py, 1)])
        return list(grouped.values())
