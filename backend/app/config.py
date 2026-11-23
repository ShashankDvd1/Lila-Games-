import os
from typing import Dict, Any, List

# Map spatial configurations based on LILA BLACK specifications
MAP_CONFIGS: Dict[str, Dict[str, Any]] = {
    "AmbroseValley": {
        "scale": 900.0,
        "origin_x": -370.0,
        "origin_z": -473.0,
        "display_name": "Ambrose Valley",
        "elevation_bounds": {"min": 100.0, "max": 165.0},
        "storm_center_world": {"x": 19.7, "z": -30.5},
        "pois": [
            {"id": "av_central", "name": "Central Outpost", "x": 0.0, "z": 0.0, "radius": 75.0, "color": "#06b6d4"},
            {"id": "av_south_camp", "name": "South Camp", "x": 0.0, "z": -300.0, "radius": 70.0, "color": "#10b981"},
            {"id": "av_west_ridge", "name": "West Ridge", "x": -100.0, "z": -50.0, "radius": 60.0, "color": "#f59e0b"},
            {"id": "av_quarry", "name": "Southern Quarry", "x": -50.0, "z": -350.0, "radius": 65.0, "color": "#a855f7"}
        ],
        "extractions": [
            {"id": "av_ext_n", "name": "Northern Heli-Pad", "x": 150.0, "z": 280.0, "radius": 35.0},
            {"id": "av_ext_sw", "name": "SW Bunker Gate", "x": -250.0, "z": -380.0, "radius": 35.0}
        ]
    },
    "GrandRift": {
        "scale": 581.0,
        "origin_x": -290.0,
        "origin_z": -290.0,
        "display_name": "Grand Rift",
        "elevation_bounds": {"min": 8.0, "max": 47.0},
        "storm_center_world": {"x": 3.7, "z": 3.7},
        "pois": [
            {"id": "gr_bridge", "name": "Canyon Bridge", "x": 0.0, "z": -50.0, "radius": 50.0, "color": "#06b6d4"},
            {"id": "gr_rift_core", "name": "Rift Core Facility", "x": 0.0, "z": 0.0, "radius": 60.0, "color": "#10b981"},
            {"id": "gr_depot", "name": "West Fuel Depot", "x": -150.0, "z": 0.0, "radius": 55.0, "color": "#f59e0b"},
            {"id": "gr_pass", "name": "South Pass Choke", "x": -50.0, "z": -50.0, "radius": 45.0, "color": "#a855f7"}
        ],
        "extractions": [
            {"id": "gr_ext_ne", "name": "High Ridge Beacon", "x": 180.0, "z": 120.0, "radius": 30.0},
            {"id": "gr_ext_w", "name": "Lower Ravine Pipe", "x": -200.0, "z": -80.0, "radius": 30.0}
        ]
    },
    "Lockdown": {
        "scale": 1000.0,
        "origin_x": -500.0,
        "origin_z": -500.0,
        "display_name": "Lockdown",
        "elevation_bounds": {"min": 32.0, "max": 71.0},
        "storm_center_world": {"x": 48.9, "z": 44.2},
        "pois": [
            {"id": "ld_refinery", "name": "North Refinery", "x": -300.0, "z": 100.0, "radius": 75.0, "color": "#06b6d4"},
            {"id": "ld_silos", "name": "West Storage Silos", "x": -300.0, "z": -100.0, "radius": 70.0, "color": "#10b981"},
            {"id": "ld_admin", "name": "Admin Complex", "x": 50.0, "z": 250.0, "radius": 80.0, "color": "#f59e0b"},
            {"id": "ld_substation", "name": "Power Substation", "x": -200.0, "z": -100.0, "radius": 65.0, "color": "#a855f7"}
        ],
        "extractions": [
            {"id": "ld_ext_e", "name": "East Rail Terminal", "x": 280.0, "z": 150.0, "radius": 35.0},
            {"id": "ld_ext_sw", "name": "SW Perimeter Drain", "x": -350.0, "z": -220.0, "radius": 35.0}
        ]
    }
}

CANVAS_SIZE = 1024

# Base paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.getenv("TELEMETRY_DATA_DIR", os.path.join(BASE_DIR, "data"))
