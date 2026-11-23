import duckdb
import os
from typing import List, Dict, Any, Optional
from app.config import DATA_DIR
from app.coordinates import world_to_pixel

class TelemetryDB:
    def __init__(self, data_dir: str = DATA_DIR):
        self.con = duckdb.connect(database=":memory:")
        parquet_glob = os.path.join(data_dir, "*", "*.nakama-0").replace("\\", "/")
        
        # Ingest files into memory. 
        # Crucial nuance: ts metadata is timestamp[ms], but raw integers are unix epoch seconds (Feb 10-14, 2026).
        # We extract epoch_ms(ts) to get the true epoch seconds (raw_epoch).
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
        print("DuckDB telemetry table and indexes initialized.")

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
            where_clauses.append(f"date_folder = '{date_filter}'")
        if map_filter:
            where_clauses.append(f"map_id = '{map_filter}'")
            
        where_str = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

        query = f"""
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
            {where_str}
            GROUP BY match_id, map_id, date_folder
            ORDER BY total_events DESC
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

        players: Dict[str, Any] = {}
        events: List[Dict[str, Any]] = []

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

            # Append position keyframe
            players[uid]["trajectory"].append({
                "t": rel_time,
                "px": px,
                "py": py,
                "elevation": round(float(row["y"]), 1)
            })

            # Append non-position discrete events (kills, deaths, storm, loot)
            if ev_str not in ("Position", "BotPosition"):
                events.append({
                    "t": rel_time,
                    "user_id": uid,
                    "is_bot": is_bot,
                    "event": ev_str,
                    "px": px,
                    "py": py,
                    "elevation": round(float(row["y"]), 1)
                })

        player_list = list(players.values())
        human_count = sum(1 for p in player_list if not p["is_bot"])
        bot_count = sum(1 for p in player_list if p["is_bot"])

        return {
            "match_id": match_id,
            "map_id": map_id,
            "date": date_folder,
            "duration": round(float(max_epoch - min_epoch), 1),
            "total_players": len(player_list),
            "human_count": human_count,
            "bot_count": bot_count,
            "players": player_list,
            "events": events
        }

    def get_heatmap_points(self, map_id: str, mode: str) -> List[Dict[str, Any]]:
        """
        Calculates spatial coordinates for the 3 required heatmap modes:
        1. 'KillZones': Kill, BotKill
        2. 'DeathZones': Killed, BotKilled, KilledByStorm
        3. 'Traffic': Position, BotPosition
        """
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
