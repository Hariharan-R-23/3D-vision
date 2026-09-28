import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from main import app

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "gaussian_splat_renderer" in data["modules"]

def test_scenes_list():
    res = client.get("/api/scenes")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    assert len(data["scenes"]) >= 1
    scene_id = data["scenes"][0]["id"]

    # Test get scene by id
    res_single = client.get(f"/api/scenes/{scene_id}")
    assert res_single.status_code == 200
    single_data = res_single.json()
    assert single_data["id"] == scene_id
    assert single_data["gaussian_count"] > 0

def test_scene_analysis():
    res_list = client.get("/api/scenes")
    scene_id = res_list.json()["scenes"][0]["id"]

    res = client.post("/api/scene/analyze", json={"scene_id": scene_id, "calculate_density": True})
    assert res.status_code == 200
    data = res.json()
    assert data["gaussian_count"] > 0
    assert "density_gaussian_per_unit_cube" in data
    assert len(data["center_of_mass"]) == 3

def test_depth_process():
    res = client.post("/api/depth/process", json={
        "colormap": "TURBO",
        "near_plane": 0.5,
        "far_plane": 10.0,
        "virtual_object_depths": [
            {"screen_x": 256, "screen_y": 256, "depth": 2.5, "screen_radius": 30}
        ]
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["min_depth"] > 0
    assert data["max_depth"] >= data["min_depth"]
    assert "colormap_base64" in data
    assert "occlusion_mask_base64" in data

def test_placement_lifecycle():
    # 1. Create placement
    payload = {
        "object_type": "cube",
        "name": "TestCube",
        "position": [0.5, 0.2, -1.0],
        "rotation": [0.0, 45.0, 0.0],
        "scale": [0.4, 0.4, 0.4],
        "color": "#10b981",
        "visible": True,
        "occlusion_enabled": True
    }
    res = client.post("/api/placement", json=payload)
    assert res.status_code == 200
    created = res.json()
    obj_id = created["object_id"]
    assert obj_id is not None
    assert len(created["transformation_matrix"]) == 4

    # 2. Get placements list
    res_list = client.get("/api/placements")
    assert res_list.status_code == 200
    placements = res_list.json()
    assert any(p["object_id"] == obj_id for p in placements)

    # 3. Delete placement
    res_del = client.delete(f"/api/placements/{obj_id}")
    assert res_del.status_code == 200

    # 4. Verify deleted
    res_list2 = client.get("/api/placements")
    assert not any(p["object_id"] == obj_id for p in res_list2.json())
