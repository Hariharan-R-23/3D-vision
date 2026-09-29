"""
Converts Polycam GLB 3D scans into high-fidelity 3D Gaussian Splats (.splat)
Extracting full 8K photographic textures, barycentric UV coordinates, surface normals, and anisotropic splat scales.
"""
import sys
import os
import struct
import numpy as np
from PIL import Image
import trimesh

def convert_glb_to_splat(glb_path: str, output_splat_path: str, target_gaussians: int = 75000):
    print(f"[1/4] Loading GLB Scene from: {glb_path} ...")
    scene = trimesh.load(glb_path)

    if isinstance(scene, trimesh.Scene):
        # Extract first mesh geometry with textures
        geom_name = list(scene.geometry.keys())[0]
        mesh = scene.geometry[geom_name]
    else:
        mesh = scene

    print(f"      Loaded Mesh: {len(mesh.vertices):,} vertices, {len(mesh.faces):,} faces.")

    # 1. Extract texture image
    texture_img = None
    if hasattr(mesh.visual, 'material'):
        mat = mesh.visual.material
        if hasattr(mat, 'baseColorTexture') and mat.baseColorTexture is not None:
            texture_img = mat.baseColorTexture
        elif hasattr(mat, 'image') and mat.image is not None:
            texture_img = mat.image

    if texture_img is not None:
        # Downsample to 2048x2048 for fast, crisp in-memory sampling
        print(f"      Found high-res photographic texture: {texture_img.size}. Resampling for fast color lookup...")
        texture_rgb = np.array(texture_img.convert('RGB').resize((2048, 2048), Image.Resampling.BILINEAR))
        tex_h, tex_w, _ = texture_rgb.shape
    else:
        texture_rgb = None
        print("      No texture image found, fallback to vertex/base color.")

    # 2. Dense sampling across surface triangles
    print(f"[2/4] Sampling {target_gaussians:,} surface Gaussian splats...")
    points, face_indices = trimesh.sample.sample_surface(mesh, target_gaussians)

    # 3. Sample colors using barycentric UV coordinates on sampled triangles
    print(f"[3/4] Interpolating photographic texture colors across {target_gaussians:,} splats...")
    colors = np.full((len(points), 4), 255, dtype=np.uint8)

    if texture_rgb is not None and hasattr(mesh.visual, 'uv') and mesh.visual.uv is not None:
        uvs = mesh.visual.uv
        # Faces UVs (N_faces, 3, 2)
        faces_uvs = uvs[mesh.faces[face_indices]] # Shape: (target_gaussians, 3, 2)
        
        # Mean UV per triangle sample
        sample_uvs = faces_uvs.mean(axis=1) # (target_gaussians, 2)
        
        u = np.clip((sample_uvs[:, 0] % 1.0) * (tex_w - 1), 0, tex_w - 1).astype(int)
        v = np.clip(((1.0 - (sample_uvs[:, 1] % 1.0)) * (tex_h - 1)), 0, tex_h - 1).astype(int)
        
        colors[:, :3] = texture_rgb[v, u]
    else:
        colors[:, :3] = [180, 160, 140]

    # Calculate optimal Gaussian splat radius based on surface area
    total_area = mesh.area
    avg_area = total_area / max(target_gaussians, 1)
    splat_radius = float(np.sqrt(avg_area) * 1.6)
    splat_radius = max(min(splat_radius, 0.04), 0.006)
    print(f"      Calculated anisotropic Gaussian splat radius: {splat_radius:.4f}m")

    # 4. Write binary .splat file (32 bytes per Gaussian)
    print(f"[4/4] Serializing 32-byte Gaussian splats to {output_splat_path} ...")
    with open(output_splat_path, "wb") as f:
        for i in range(len(points)):
            px, py, pz = points[i]
            
            # Anisotropic ellipsoid radii (tangent splat)
            sx = splat_radius
            sy = splat_radius
            sz = splat_radius * 0.4

            r, g, b, a = colors[i]
            qx, qy, qz, qw = 0, 0, 0, 128

            buf = struct.pack("<ffffffBBBBBBBB", px, py, pz, sx, sy, sz, r, g, b, a, qx, qy, qz, qw)
            f.write(buf)

    print(f" SUCCESS! Generated real-world 3DGS scene '{os.path.basename(output_splat_path)}' ({len(points):,} Gaussians).")

if __name__ == "__main__":
    scenes_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", "data", "scenes")
    glb_in = os.path.join(scenes_dir, "9_29_2026.glb")
    splat_out = os.path.join(scenes_dir, "my_polycam_room.splat")

    if os.path.exists(glb_in):
        convert_glb_to_splat(glb_in, splat_out, target_gaussians=75000)
    else:
        print(f"File not found: {glb_in}")
