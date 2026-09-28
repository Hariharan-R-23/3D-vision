import os
import struct
import numpy as np
from typing import List, Dict, Any, Optional
from models.schemas import SceneInfo, SceneBoundingBox, CameraDefault, SceneAnalyzeResponse

SCENES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "scenes")
DEPTH_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "depth")

class SceneService:
    def __init__(self):
        os.makedirs(SCENES_DIR, exist_ok=True)
        os.makedirs(DEPTH_DIR, exist_ok=True)
        self.ensure_default_scenes()

    def generate_synthetic_splat_file(self, file_path: str, scene_type: str = "room") -> int:
        """
        Generates a valid binary .splat file (32 bytes per Gaussian splat)
        Consisting of geometric surfaces: floor, walls, pedestal/table, columns, decorative spheres, archways.
        """
        gaussians = []

        if scene_type == "room":
            # 1. Floor grid (-3.0 to 3.0 on X, -3.0 to 3.0 on Z at Y = -1.0)
            xs = np.linspace(-3.0, 3.0, 100)
            zs = np.linspace(-3.0, 3.0, 100)
            for x in xs:
                for z in zs:
                    # Checkerboard parquet pattern
                    is_dark = (int(abs(x * 2)) + int(abs(z * 2))) % 2 == 0
                    color = (60, 45, 35, 240) if is_dark else (160, 130, 95, 240)
                    gaussians.append({
                        "pos": (float(x + np.random.normal(0, 0.01)), -1.0 + float(np.random.normal(0, 0.005)), float(z + np.random.normal(0, 0.01))),
                        "scale": (0.04, 0.01, 0.04),
                        "color": color,
                        "rot": (0, 0, 0, 128)
                    })

            # 2. Back wall (Z = -3.0, X from -3 to 3, Y from -1 to 2.5)
            xs = np.linspace(-3.0, 3.0, 80)
            ys = np.linspace(-1.0, 2.5, 60)
            for x in xs:
                for y in ys:
                    # Soft gradient architectural plaster
                    intensity = int(180 + 30 * np.sin(x * 1.5))
                    gaussians.append({
                        "pos": (float(x), float(y), -3.0 + float(np.random.normal(0, 0.005))),
                        "scale": (0.045, 0.045, 0.01),
                        "color": (intensity, intensity - 10, intensity - 25, 250),
                        "rot": (0, 0, 0, 128)
                    })

            # 3. Left Wall (X = -3.0, Z from -3 to 3, Y from -1 to 2.5)
            zs = np.linspace(-3.0, 3.0, 80)
            for z in zs:
                for y in ys:
                    intensity = int(170 + 25 * np.cos(z * 1.2))
                    gaussians.append({
                        "pos": (-3.0 + float(np.random.normal(0, 0.005)), float(y), float(z)),
                        "scale": (0.01, 0.045, 0.045),
                        "color": (intensity - 15, intensity - 5, intensity, 250),
                        "rot": (0, 0, 0, 128)
                    })

            # 4. Central Reconstructed Pedestal / Table (X: -0.8 to 0.8, Z: -0.8 to 0.8, Y: -1.0 to -0.2)
            txs = np.linspace(-0.8, 0.8, 45)
            tzs = np.linspace(-0.8, 0.8, 45)
            # Table top
            for tx in txs:
                for tz in tzs:
                    gaussians.append({
                        "pos": (float(tx), -0.2, float(tz)),
                        "scale": (0.025, 0.01, 0.025),
                        "color": (220, 210, 190, 255),
                        "rot": (0, 0, 0, 128)
                    })
            # Table legs / pedestal side panels
            for py in np.linspace(-1.0, -0.2, 25):
                for tx in txs:
                    gaussians.append({"pos": (float(tx), float(py), -0.8), "scale": (0.025, 0.02, 0.01), "color": (120, 100, 80, 250), "rot": (0,0,0,128)})
                    gaussians.append({"pos": (float(tx), float(py), 0.8), "scale": (0.025, 0.02, 0.01), "color": (120, 100, 80, 250), "rot": (0,0,0,128)})

            # 5. Foreground Classical Column (X = -1.6, Z = 0.5, Y from -1.0 to 1.8)
            col_radius = 0.3
            for cy in np.linspace(-1.0, 1.8, 80):
                for theta in np.linspace(0, 2 * np.pi, 36, endpoint=False):
                    cx = -1.6 + col_radius * np.cos(theta)
                    cz = 0.5 + col_radius * np.sin(theta)
                    gaussians.append({
                        "pos": (float(cx), float(cy), float(cz)),
                        "scale": (0.025, 0.025, 0.025),
                        "color": (215, 210, 205, 255),
                        "rot": (0, 0, 0, 128)
                    })

            # 6. Sculptural Ring / Feature Object on Pedestal (Center 0, 0.3, 0)
            for theta in np.linspace(0, 2 * np.pi, 72):
                sx = 0.35 * np.cos(theta)
                sy = 0.25 + 0.35 * np.sin(theta)
                sz = 0.1 * np.sin(2 * theta)
                gaussians.append({
                    "pos": (float(sx), float(sy), float(sz)),
                    "scale": (0.03, 0.03, 0.03),
                    "color": (235, 160, 40, 255), # Golden amber
                    "rot": (0, 0, 0, 128)
                })

        elif scene_type == "garden":
            # Terrain ground
            xs = np.linspace(-4.0, 4.0, 100)
            zs = np.linspace(-4.0, 4.0, 100)
            for x in xs:
                for z in zs:
                    y = -1.0 + 0.15 * np.sin(x * 0.8) * np.cos(z * 0.8)
                    green = int(120 + 40 * np.sin(x + z))
                    gaussians.append({
                        "pos": (float(x), float(y), float(z)),
                        "scale": (0.05, 0.02, 0.05),
                        "color": (45, green, 35, 240),
                        "rot": (0, 0, 0, 128)
                    })
            # Gazebo Pillars
            for cx, cz in [(-1.5, -1.5), (1.5, -1.5), (-1.5, 1.5), (1.5, 1.5)]:
                for py in np.linspace(-1.0, 2.0, 60):
                    for th in np.linspace(0, 2 * np.pi, 16, endpoint=False):
                        gx = cx + 0.18 * np.cos(th)
                        gz = cz + 0.18 * np.sin(th)
                        gaussians.append({
                            "pos": (float(gx), float(py), float(gz)),
                            "scale": (0.03, 0.03, 0.03),
                            "color": (230, 230, 235, 255),
                            "rot": (0, 0, 0, 128)
                        })

        # Write binary .splat format:
        # Per Gaussian:
        # float32 x, y, z (12 bytes)
        # float32 sx, sy, sz (12 bytes)
        # uint8 r, g, b, a (4 bytes)
        # uint8 qx, qy, qz, qw (4 bytes) -> total 32 bytes
        with open(file_path, "wb") as f:
            for g in gaussians:
                px, py, pz = g["pos"]
                sx, sy, sz = g["scale"]
                r, g_c, b, a = g["color"]
                qx, qy, qz, qw = g["rot"]
                # 3 floats pos, 3 floats scale, 4 uint8 color, 4 uint8 rot
                buf = struct.pack("<ffffffBBBBBBBB", px, py, pz, sx, sy, sz, r, g_c, b, a, qx, qy, qz, qw)
                f.write(buf)

        return len(gaussians)

    def ensure_default_scenes(self):
        """Generates initial sample splat scenes if not present."""
        room_splat = os.path.join(SCENES_DIR, "reconstructed_indoor_lab.splat")
        if not os.path.exists(room_splat):
            count = self.generate_synthetic_splat_file(room_splat, "room")
            print(f"[SceneService] Generated {room_splat} with {count} Gaussians.")

        garden_splat = os.path.join(SCENES_DIR, "reconstructed_garden_gazebo.splat")
        if not os.path.exists(garden_splat):
            count = self.generate_synthetic_splat_file(garden_splat, "garden")
            print(f"[SceneService] Generated {garden_splat} with {count} Gaussians.")

    def parse_splat_metadata(self, file_path: str) -> Dict[str, Any]:
        """Parses binary .splat file to extract true bounding box, center, and Gaussian count."""
        size = os.path.getsize(file_path)
        gaussian_count = size // 32
        
        # Read positions sample or all to compute real bounding box
        positions = []
        with open(file_path, "rb") as f:
            # Sample up to 10000 points evenly across file
            step = max(1, gaussian_count // 10000)
            for i in range(0, gaussian_count, step):
                f.seek(i * 32)
                buf = f.read(12)
                if len(buf) == 12:
                    x, y, z = struct.unpack("<fff", buf)
                    positions.append((x, y, z))

        if positions:
            arr = np.array(positions)
            min_pt = np.min(arr, axis=0).tolist()
            max_pt = np.max(arr, axis=0).tolist()
            center_pt = np.mean(arr, axis=0).tolist()
            extents = (np.array(max_pt) - np.array(min_pt)).tolist()
        else:
            min_pt, max_pt, center_pt, extents = [-2, -1, -2], [2, 2, 2], [0, 0.5, 0], [4, 3, 4]

        return {
            "file_size_bytes": size,
            "gaussian_count": gaussian_count,
            "bounds": SceneBoundingBox(
                min=min_pt,
                max=max_pt,
                center=center_pt,
                extents=extents
            ),
            "center_of_mass": center_pt
        }

    def list_scenes(self) -> List[SceneInfo]:
        scenes = []
        for fn in os.listdir(SCENES_DIR):
            if fn.endswith(".splat") or fn.endswith(".ply"):
                file_path = os.path.join(SCENES_DIR, fn)
                scene_id = os.path.splitext(fn)[0]
                fmt = "splat" if fn.endswith(".splat") else "ply"
                
                meta = self.parse_splat_metadata(file_path)
                
                name = fn.replace("_", " ").replace(".splat", "").replace(".ply", "").title()
                desc = (
                    "High-density 3D Gaussian Splatting scene featuring reconstructed room geometry, "
                    "pedestal surfaces, and classical column structures suitable for depth occlusion tests."
                    if "indoor" in fn else
                    "Reconstructed outdoor architectural gazebo scene with synthetic terrain elevation and pillar structures."
                )

                scenes.append(SceneInfo(
                    id=scene_id,
                    name=name,
                    filename=fn,
                    format=fmt,
                    file_size_bytes=meta["file_size_bytes"],
                    gaussian_count=meta["gaussian_count"],
                    bounds=meta["bounds"],
                    camera=CameraDefault(
                        position=[0.0, 1.2, 3.8],
                        target=[0.0, 0.2, 0.0],
                        up=[0.0, 1.0, 0.0],
                        fov=50.0
                    ),
                    depth_available=True,
                    description=desc,
                    is_synthetic=True
                ))
        return scenes

    def get_scene(self, scene_id: str) -> Optional[SceneInfo]:
        for s in self.list_scenes():
            if s.id == scene_id:
                return s
        return None

    def analyze_scene(self, scene_id: str) -> Optional[SceneAnalyzeResponse]:
        scene = self.get_scene(scene_id)
        if not scene:
            return None

        vol = max(scene.bounds.extents[0] * scene.bounds.extents[1] * scene.bounds.extents[2], 0.01)
        density = round(scene.gaussian_count / vol, 2)

        return SceneAnalyzeResponse(
            scene_id=scene.id,
            scene_name=scene.name,
            format=scene.format,
            file_size_bytes=scene.file_size_bytes,
            gaussian_count=scene.gaussian_count,
            bounding_box=scene.bounds,
            center_of_mass=scene.bounds.center,
            spatial_extents=scene.bounds.extents,
            estimated_depth_range=[round(scene.camera.position[2] - scene.bounds.max[2], 2),
                                  round(scene.camera.position[2] - scene.bounds.min[2], 2)],
            density_gaussian_per_unit_cube=density,
            metadata={
                "has_ground_plane": True,
                "has_foreground_occluder": True,
                "coordinate_convention": "Right-Handed Y-Up (Three.js standard)",
                "recommended_placement_origin": [0.0, -0.2, 0.0]
            }
        )

scene_service = SceneService()
