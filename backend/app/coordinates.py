from typing import Tuple
from app.config import MAP_CONFIGS, CANVAS_SIZE

def world_to_pixel(x: float, z: float, map_id: str, image_size: int = CANVAS_SIZE) -> Tuple[float, float]:
    """
    Transforms in-game world coordinates (x, z) to 2D top-down minimap pixel coordinates (px, py).
    Elevation (y) is ignored for 2D horizontal projection.
    Minimap origin is top-left, so vertical Y-axis is inverted: py = (1.0 - v) * image_size.
    """
    cfg = MAP_CONFIGS.get(map_id)
    if not cfg:
        return 0.0, 0.0
    
    u = (x - cfg["origin_x"]) / cfg["scale"]
    v = (z - cfg["origin_z"]) / cfg["scale"]
    
    px = u * image_size
    py = (1.0 - v) * image_size
    
    # Clamp within canvas bounds [0, image_size]
    px = max(0.0, min(float(image_size), px))
    py = max(0.0, min(float(image_size), py))
    return round(px, 2), round(py, 2)

def pixel_to_world(px: float, py: float, map_id: str, image_size: int = CANVAS_SIZE) -> Tuple[float, float]:
    """
    Inverse transform from pixel coordinates (px, py) back to world coordinates (x, z).
    Useful for cursor coordinate hover readout.
    """
    cfg = MAP_CONFIGS.get(map_id)
    if not cfg:
        return 0.0, 0.0
    
    u = px / image_size
    v = 1.0 - (py / image_size)
    
    x = (u * cfg["scale"]) + cfg["origin_x"]
    z = (v * cfg["scale"]) + cfg["origin_z"]
    return round(x, 2), round(z, 2)
