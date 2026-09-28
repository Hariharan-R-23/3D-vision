import base64
import io
import cv2
import numpy as np
from PIL import Image
from typing import Dict, Any, Tuple, Optional, List
from models.schemas import DepthProcessRequest, DepthProcessResponse

COLORMAPS = {
    "TURBO": cv2.COLORMAP_TURBO,
    "VIRIDIS": cv2.COLORMAP_VIRIDIS,
    "MAGMA": cv2.COLORMAP_MAGMA,
    "INFERNO": cv2.COLORMAP_INFERNO,
    "JET": cv2.COLORMAP_JET,
    "BONE": cv2.COLORMAP_BONE,
    "PLASMA": cv2.COLORMAP_PLASMA
}

class DepthService:
    @staticmethod
    def decode_base64_image(data_str: str) -> np.ndarray:
        """Decodes base64 image (PNG/JPEG) into grayscale or BGR numpy array."""
        if "," in data_str:
            data_str = data_str.split(",")[1]
        img_bytes = base64.b64decode(data_str)
        img = Image.open(io.BytesIO(img_bytes))
        arr = np.array(img)
        if len(arr.shape) == 3 and arr.shape[2] == 4:
            # RGBA to RGB or depth
            arr = cv2.cvtColor(arr, cv2.COLOR_RGBA2RGB)
        return arr

    @staticmethod
    def encode_numpy_to_base64_png(arr: np.ndarray) -> str:
        """Encodes uint8 numpy array (grayscale or RGB/BGR) to base64 PNG data URL."""
        if len(arr.shape) == 3 and arr.shape[2] == 3:
            # If RGB, convert to BGR for cv2 encoding
            arr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
        _, buffer = cv2.imencode(".png", arr)
        b64 = base64.b64encode(buffer).decode("utf-8")
        return f"data:image/png;base64,{b64}"

    @staticmethod
    def generate_synthetic_depth_map(width: int = 512, height: int = 512, pattern: str = "room") -> np.ndarray:
        """
        Generates a physically sensible synthetic depth map representing a 3D scene room with a table and pillar.
        Returns float32 depth in metric units (meters, e.g., 0.8m to 6.0m).
        """
        y, x = np.mgrid[0:height, 0:width]
        u = (x - width / 2.0) / (width / 2.0)
        v = (y - height / 2.0) / (height / 2.0)

        # Base back wall at z = 4.5m
        depth = np.full((height, width), 4.5, dtype=np.float32)

        # Floor gradient (bottom half of screen)
        floor_mask = v > 0.1
        depth[floor_mask] = 1.0 / (0.18 + 0.35 * v[floor_mask])

        # Left & Right walls
        left_wall_mask = (u < -0.6) & (v <= 0.1)
        depth[left_wall_mask] = 1.5 / (np.abs(u[left_wall_mask]) + 0.1)

        right_wall_mask = (u > 0.6) & (v <= 0.1)
        depth[right_wall_mask] = 1.5 / (u[right_wall_mask] + 0.1)

        # Central reconstructed foreground table / pedestal at ~1.8m depth
        table_mask = (u >= -0.35) & (u <= 0.35) & (v >= 0.05) & (v <= 0.55)
        depth[table_mask] = 1.85 + 0.3 * (v[table_mask] - 0.05)

        # Foreground column on left at ~1.2m depth
        col_mask = (u >= -0.55) & (u <= -0.4) & (v >= -0.4) & (v <= 0.6)
        depth[col_mask] = 1.25 + 0.1 * np.sin(3.14 * (u[col_mask] + 0.475) / 0.15)

        # Add subtle natural geometric noise
        noise = np.random.normal(0, 0.008, depth.shape).astype(np.float32)
        depth = np.clip(depth + noise, 0.5, 15.0)
        return depth

    def process_depth(self, req: DepthProcessRequest) -> DepthProcessResponse:
        """
        Core CV pipeline:
        1. Extract or synthesize depth array
        2. Normalize depth
        3. Apply colormap
        4. Calculate occlusion mask if virtual object depths provided
        5. Extract statistical distribution & histogram
        """
        if req.depth_map_base64:
            raw_arr = self.decode_base64_image(req.depth_map_base64)
            if len(raw_arr.shape) == 3:
                raw_arr = cv2.cvtColor(raw_arr, cv2.COLOR_RGB2GRAY)
            # Normalize to metric range [near_plane, far_plane]
            depth_f32 = req.near_plane + (raw_arr.astype(np.float32) / 255.0) * (req.far_plane - req.near_plane)
        elif req.image_base64:
            # Depth estimation heuristic from RGB luminance + vertical spatial gradient (monocular cue)
            rgb = self.decode_base64_image(req.image_base64)
            gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype(np.float32)
            h, w = gray.shape
            v_grad = np.linspace(1.0, 0.2, h)[:, None]
            # Darker + lower usually closer in typical indoor setups
            estimated = (1.0 - (gray / 255.0) * 0.4) * v_grad * (req.far_plane - req.near_plane) + req.near_plane
            depth_f32 = estimated.astype(np.float32)
        else:
            depth_f32 = self.generate_synthetic_depth_map()

        h, w = depth_f32.shape
        min_val = float(np.min(depth_f32))
        max_val = float(np.max(depth_f32))
        mean_val = float(np.mean(depth_f32))
        std_val = float(np.std(depth_f32))

        # Normalized 0-255 inverted depth (closer = brighter for standard visualization)
        depth_range = max(max_val - min_val, 1e-5)
        norm_depth = np.clip((depth_f32 - min_val) / depth_range, 0.0, 1.0)
        norm_uint8 = ((1.0 - norm_depth) * 255.0).astype(np.uint8)

        # Colormap
        cv_colormap = COLORMAPS.get(req.colormap.upper(), cv2.COLORMAP_TURBO)
        colored_depth = cv2.applyColorMap(norm_uint8, cv_colormap)
        colored_depth_rgb = cv2.cvtColor(colored_depth, cv2.COLOR_BGR2RGB)

        # Occlusion mask computation
        occlusion_mask_b64 = None
        if req.virtual_object_depths:
            # Create a 2D mask representing where virtual objects are occluded by scene
            # Object is occluded if scene_depth < object_depth (i.e. scene is closer)
            occ_mask = np.zeros((h, w), dtype=np.uint8)
            for obj in req.virtual_object_depths:
                # obj contains screen bounding box or center and object depth
                cx = int(obj.get("screen_x", w // 2))
                cy = int(obj.get("screen_y", h // 2))
                obj_depth = float(obj.get("depth", 2.0))
                radius = int(obj.get("screen_radius", 40))

                y_indices, x_indices = np.ogrid[:h, :w]
                dist_from_center = np.sqrt((x_indices - cx)**2 + (y_indices - cy)**2)
                obj_footprint = dist_from_center <= radius

                # Where scene is closer than object:
                occluded_region = obj_footprint & (depth_f32 < obj_depth)
                # 255 for occluded, 128 for visible object
                occ_mask[obj_footprint] = 100
                occ_mask[occluded_region] = 255

            # Visual overlay mask (Cyan for visible, Red for occluded)
            occ_vis = np.zeros((h, w, 3), dtype=np.uint8)
            occ_vis[occ_mask == 100] = [0, 220, 255]  # Visible virtual object (Cyan)
            occ_vis[occ_mask == 255] = [255, 60, 60]  # Occluded behind scene (Red)
            occlusion_mask_b64 = self.encode_numpy_to_base64_png(occ_vis)

        # Depth histogram (20 bins)
        hist, _ = np.histogram(depth_f32, bins=20, range=(min_val, max_val))
        depth_histogram = [int(cnt) for cnt in hist]

        return DepthProcessResponse(
            min_depth=round(min_val, 3),
            max_depth=round(max_val, 3),
            mean_depth=round(mean_val, 3),
            std_depth=round(std_val, 3),
            width=w,
            height=h,
            normalized_depth_base64=self.encode_numpy_to_base64_png(norm_uint8),
            colormap_base64=self.encode_numpy_to_base64_png(colored_depth_rgb),
            occlusion_mask_base64=occlusion_mask_b64,
            depth_histogram=depth_histogram,
            status="success"
        )

depth_service = DepthService()
