from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import time

class HealthResponse(BaseModel):
    status: str = "healthy"
    version: str = "1.0.0"
    modules: List[str] = [
        "gaussian_splat_renderer",
        "virtual_object_placement",
        "depth_aware_occlusion",
        "scene_analysis",
        "coordinate_transformer"
    ]
    timestamp: float = Field(default_factory=time.time)

class CameraDefault(BaseModel):
    position: List[float] = [0.0, 1.5, 3.5]
    target: List[float] = [0.0, 0.0, 0.0]
    up: List[float] = [0.0, 1.0, 0.0]
    fov: float = 50.0

class SceneBoundingBox(BaseModel):
    min: List[float] = [-2.0, -1.0, -2.0]
    max: List[float] = [2.0, 2.0, 2.0]
    center: List[float] = [0.0, 0.5, 0.0]
    extents: List[float] = [4.0, 3.0, 4.0]

class SceneInfo(BaseModel):
    id: str
    name: str
    filename: str
    format: str  # "splat" | "ply"
    file_size_bytes: int
    gaussian_count: int
    bounds: SceneBoundingBox
    camera: CameraDefault
    depth_available: bool = True
    description: str
    is_synthetic: bool = False

class ScenesListResponse(BaseModel):
    scenes: List[SceneInfo]
    total: int

class PlacementCreate(BaseModel):
    object_id: Optional[str] = None
    object_type: str = "cube"  # cube | sphere | cylinder | cone
    name: Optional[str] = None
    position: List[float] = [0.0, 0.0, 0.0]  # [X, Y, Z]
    rotation: List[float] = [0.0, 0.0, 0.0]  # [Euler X, Y, Z in degrees]
    scale: List[float] = [0.5, 0.5, 0.5]     # [Scale X, Y, Z]
    color: str = "#3b82f6"
    visible: bool = True
    occlusion_enabled: bool = True
    timestamp: Optional[float] = None

class PlacementItem(BaseModel):
    object_id: str
    object_type: str
    name: str
    position: List[float]
    rotation: List[float]
    scale: List[float]
    color: str
    visible: bool
    occlusion_enabled: bool
    timestamp: float
    transformation_matrix: List[List[float]]
    world_bounds: Dict[str, List[float]]

class DepthProcessRequest(BaseModel):
    depth_map_base64: Optional[str] = None
    image_base64: Optional[str] = None
    near_plane: float = 0.1
    far_plane: float = 20.0
    colormap: str = "TURBO"  # TURBO | VIRIDIS | MAGMA | INFERNO | JET
    virtual_object_depths: Optional[List[Dict[str, Any]]] = None

class DepthProcessResponse(BaseModel):
    min_depth: float
    max_depth: float
    mean_depth: float
    std_depth: float
    width: int
    height: int
    normalized_depth_base64: str
    colormap_base64: str
    occlusion_mask_base64: Optional[str] = None
    depth_histogram: List[int]
    status: str = "success"

class SceneAnalyzeRequest(BaseModel):
    scene_id: str
    calculate_density: bool = True

class SceneAnalyzeResponse(BaseModel):
    scene_id: str
    scene_name: str
    format: str
    file_size_bytes: int
    gaussian_count: int
    bounding_box: SceneBoundingBox
    center_of_mass: List[float]
    spatial_extents: List[float]
    estimated_depth_range: List[float]
    density_gaussian_per_unit_cube: float
    analysis_timestamp: float = Field(default_factory=time.time)
    metadata: Dict[str, Any] = {}
