import json
import math
import os
import time
import uuid
from typing import List, Dict, Optional
from models.schemas import PlacementCreate, PlacementItem

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
PLACEMENTS_FILE = os.path.join(DATA_DIR, "placements.json")

def compute_transformation_matrix(position: List[float], rotation_deg: List[float], scale: List[float]) -> List[List[float]]:
    """
    Computes 4x4 affine transformation matrix (Row-major format)
    T = Translate * RotZ * RotY * RotX * Scale
    """
    tx, ty, tz = position
    rx, ry, rz = [math.radians(a) for a in rotation_deg]
    sx, sy, sz = scale

    # Rotation matrices around X, Y, Z
    cx, sx_sin = math.cos(rx), math.sin(rx)
    cy, sy_sin = math.cos(ry), math.sin(ry)
    cz, sz_sin = math.cos(rz), math.sin(rz)

    # R = Rz * Ry * Rx
    r00 = cy * cz
    r01 = cz * sx_sin * sy_sin - cx * sz_sin
    r02 = cx * cz * sy_sin + sx_sin * sz_sin

    r10 = cy * sz_sin
    r11 = cx * cz + sx_sin * sy_sin * sz_sin
    r12 = -cz * sx_sin + cx * sy_sin * sz_sin

    r20 = -sy_sin
    r21 = cy * sx_sin
    r22 = cy * cx

    # Scale & Translate
    matrix = [
        [r00 * sx, r01 * sy, r02 * sz, tx],
        [r10 * sx, r11 * sy, r12 * sz, ty],
        [r20 * sx, r21 * sy, r22 * sz, tz],
        [0.0, 0.0, 0.0, 1.0]
    ]
    return matrix

def compute_world_bounds(position: List[float], scale: List[float]) -> Dict[str, List[float]]:
    """Computes axis-aligned bounding box for the object."""
    hx, hy, hz = [s / 2.0 for s in scale]
    return {
        "min": [position[0] - hx, position[1] - hy, position[2] - hz],
        "max": [position[0] + hx, position[1] + hy, position[2] + hz],
        "center": position
    }

class PlacementService:
    def __init__(self):
        self._ensure_storage()
        self._placements: Dict[str, PlacementItem] = self._load()

    def _ensure_storage(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        if not os.path.exists(PLACEMENTS_FILE):
            with open(PLACEMENTS_FILE, "w") as f:
                json.dump([], f)

    def _load(self) -> Dict[str, PlacementItem]:
        try:
            with open(PLACEMENTS_FILE, "r") as f:
                data = json.load(f)
                return {item["object_id"]: PlacementItem(**item) for item in data}
        except Exception:
            return {}

    def _save(self):
        try:
            with open(PLACEMENTS_FILE, "w") as f:
                json.dump([item.model_dump() for item in self._placements.values()], f, indent=2)
        except Exception as e:
            print(f"Error saving placements: {e}")

    def list_placements(self) -> List[PlacementItem]:
        return list(self._placements.values())

    def get_placement(self, object_id: str) -> Optional[PlacementItem]:
        return self._placements.get(object_id)

    def create_or_update_placement(self, payload: PlacementCreate) -> PlacementItem:
        object_id = payload.object_id or str(uuid.uuid4())[:8]
        name = payload.name or f"{payload.object_type.capitalize()}_{object_id[:4]}"
        
        matrix = compute_transformation_matrix(payload.position, payload.rotation, payload.scale)
        bounds = compute_world_bounds(payload.position, payload.scale)

        item = PlacementItem(
            object_id=object_id,
            object_type=payload.object_type,
            name=name,
            position=payload.position,
            rotation=payload.rotation,
            scale=payload.scale,
            color=payload.color,
            visible=payload.visible,
            occlusion_enabled=payload.occlusion_enabled,
            timestamp=payload.timestamp or time.time(),
            transformation_matrix=matrix,
            world_bounds=bounds
        )
        self._placements[object_id] = item
        self._save()
        return item

    def delete_placement(self, object_id: str) -> bool:
        if object_id in self._placements:
            del self._placements[object_id]
            self._save()
            return True
        return False

    def clear_all(self):
        self._placements.clear()
        self._save()

placement_service = PlacementService()
