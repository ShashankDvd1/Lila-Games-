import os
from typing import Dict, Any

# Map spatial configurations based on LILA BLACK specifications
MAP_CONFIGS: Dict[str, Dict[str, Any]] = {
    "AmbroseValley": {
        "scale": 900.0,
        "origin_x": -370.0,
        "origin_z": -473.0,
        "display_name": "Ambrose Valley"
    },
    "GrandRift": {
        "scale": 581.0,
        "origin_x": -290.0,
        "origin_z": -290.0,
        "display_name": "Grand Rift"
    },
    "Lockdown": {
        "scale": 1000.0,
        "origin_x": -500.0,
        "origin_z": -500.0,
        "display_name": "Lockdown"
    }
}

CANVAS_SIZE = 1024

# Base paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.getenv("TELEMETRY_DATA_DIR", os.path.join(BASE_DIR, "data"))
