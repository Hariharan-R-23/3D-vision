import os
from fastapi import FastAPI, HTTPException, Path, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from models.schemas import (
    HealthResponse,
    ScenesListResponse,
    SceneInfo,
    PlacementCreate,
    PlacementItem,
    DepthProcessRequest,
    DepthProcessResponse,
    SceneAnalyzeRequest,
    SceneAnalyzeResponse
)
from services.scene_service import scene_service, SCENES_DIR, DEPTH_DIR
from services.depth_service import depth_service
from services.placement_service import placement_service

app = FastAPI(
    title="Gaussian Reality API",
    description="3D Gaussian Splatting AR Scene Reconstruction & Virtual Object Placement Backend",
    version="1.0.0"
)

# Enable CORS for Vite frontend (typically localhost:5173 or localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file mounts for raw splat binary files and depth assets
app.mount("/data/scenes", StaticFiles(directory=SCENES_DIR), name="scenes")
app.mount("/data/depth", StaticFiles(directory=DEPTH_DIR), name="depth")


@app.get("/api/health", response_model=HealthResponse)
def get_health():
    """Health check endpoint returning system status and available CV/3DGS modules."""
    return HealthResponse(status="healthy", version="1.0.0")


@app.get("/api/scenes", response_model=ScenesListResponse)
def get_scenes():
    """Returns list of all available 3D Gaussian Splatting scenes and metadata."""
    scenes = scene_service.list_scenes()
    return ScenesListResponse(scenes=scenes, total=len(scenes))


@app.get("/api/scenes/{scene_id}", response_model=SceneInfo)
def get_scene_by_id(scene_id: str = Path(..., description="The ID of the scene")):
    """Returns detailed metadata and camera parameters for a specific scene."""
    scene = scene_service.get_scene(scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail=f"Scene '{scene_id}' not found.")
    return scene


@app.post("/api/scene/analyze", response_model=SceneAnalyzeResponse)
def analyze_scene(req: SceneAnalyzeRequest):
    """Performs spatial, volumetric, and Gaussian density analysis on the specified scene."""
    analysis = scene_service.analyze_scene(req.scene_id)
    if not analysis:
        raise HTTPException(status_code=404, detail=f"Scene '{req.scene_id}' not found for analysis.")
    return analysis


@app.post("/api/depth/process", response_model=DepthProcessResponse)
def process_depth(req: DepthProcessRequest):
    """
    Processes a depth map or camera capture image.
    Applies normalization, colormapping, statistical computation, and occlusion mask generation.
    """
    try:
        return depth_service.process_depth(req)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Depth processing failed: {str(e)}")


@app.post("/api/placement", response_model=PlacementItem)
def create_or_update_placement(payload: PlacementCreate):
    """
    Accepts virtual object placement coordinates, calculates the 4x4 coordinate transformation matrix,
    validates spatial bounds, and persists the placement.
    """
    try:
        return placement_service.create_or_update_placement(payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to save placement: {str(e)}")


@app.get("/api/placements", response_model=list[PlacementItem])
def get_placements():
    """Returns all currently registered virtual objects with their transformation matrices."""
    return placement_service.list_placements()


@app.delete("/api/placements/{object_id}")
def delete_placement(object_id: str = Path(..., description="ID of the virtual object")):
    """Deletes a virtual object placement."""
    deleted = placement_service.delete_placement(object_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Object '{object_id}' not found.")
    return {"status": "success", "deleted_id": object_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
