"""
Converts Supercompressed Organized Gaussians (.sog) into standard 3DGS binary (.splat)
Extracting accurate 16-bit means, scale codebooks, and SH0 colors.
"""
import sys
import os
import zipfile
import io
import json
import struct
import numpy as np
from PIL import Image

def convert_sog_to_splat(sog_path: str, splat_out_path: str, max_splats: int = 250000):
    print(f"[1/4] Opening SOG archive: {sog_path} ...")
    with zipfile.ZipFile(sog_path, 'r') as z:
        meta = json.loads(z.read('meta.json'))
        total_count = meta.get('count', 0)
        print(f"      Total Gaussians in SOG: {total_count:,}")

        mins = np.array(meta['means']['mins'], dtype=np.float32)
        maxs = np.array(meta['means']['maxs'], dtype=np.float32)
        
        sh0_codebook = np.array(meta['sh0']['codebook'], dtype=np.float32) if 'sh0' in meta and 'codebook' in meta['sh0'] else None
        scales_codebook = np.array(meta['scales']['codebook'], dtype=np.float32) if 'scales' in meta and 'codebook' in meta['scales'] else None

        print(f"[2/4] Decoding WebP layers (means, scales, quats, sh0)...")
        u_img = np.array(Image.open(io.BytesIO(z.read('means_u.webp')))).reshape(-1, 4)[:total_count]
        l_img = np.array(Image.open(io.BytesIO(z.read('means_l.webp')))).reshape(-1, 4)[:total_count]
        sh0_img = np.array(Image.open(io.BytesIO(z.read('sh0.webp')))).reshape(-1, 4)[:total_count]
        scales_img = np.array(Image.open(io.BytesIO(z.read('scales.webp')))).reshape(-1, 4)[:total_count]
        quats_img = np.array(Image.open(io.BytesIO(z.read('quats.webp')))).reshape(-1, 4)[:total_count]

    print(f"[3/4] Reconstructing 3D physical parameters...")
    # 1. Decode 16-bit means
    u16_x = (u_img[:, 0].astype(np.uint32) << 8) | l_img[:, 0].astype(np.uint32)
    u16_y = (u_img[:, 1].astype(np.uint32) << 8) | l_img[:, 1].astype(np.uint32)
    u16_z = (u_img[:, 2].astype(np.uint32) << 8) | l_img[:, 2].astype(np.uint32)

    px = mins[0] + (u16_x / 65535.0) * (maxs[0] - mins[0])
    py = mins[1] + (u16_y / 65535.0) * (maxs[1] - mins[1])
    pz = mins[2] + (u16_z / 65535.0) * (maxs[2] - mins[2])

    # 2. Decode Colors (SH0 -> RGB)
    # SH0 dc constant C0 = 0.28209479177387814
    C0 = 0.28209479177387814
    if sh0_codebook is not None:
        sh_r = sh0_codebook[sh0_img[:, 0]]
        sh_g = sh0_codebook[sh0_img[:, 1]]
        sh_b = sh0_codebook[sh0_img[:, 2]]
        r = np.clip((sh_r * C0 + 0.5) * 255.0, 0, 255).astype(np.uint8)
        g = np.clip((sh_g * C0 + 0.5) * 255.0, 0, 255).astype(np.uint8)
        b = np.clip((sh_b * C0 + 0.5) * 255.0, 0, 255).astype(np.uint8)
    else:
        r = sh0_img[:, 0]
        g = sh0_img[:, 1]
        b = sh0_img[:, 2]

    # Opacity (alpha)
    if sh0_codebook is not None and sh0_img.shape[1] >= 4:
        # Sigmoid of logit opacity
        logit_opacity = sh0_codebook[sh0_img[:, 3]]
        opacity = (1.0 / (1.0 + np.exp(-logit_opacity))) * 255.0
        alpha = np.clip(opacity, 0, 255).astype(np.uint8)
    else:
        alpha = sh0_img[:, 3]

    # 3. Decode Scales
    if scales_codebook is not None:
        sx = np.exp(scales_codebook[scales_img[:, 0]])
        sy = np.exp(scales_codebook[scales_img[:, 1]])
        sz = np.exp(scales_codebook[scales_img[:, 2]])
    else:
        sx = np.full(total_count, 0.015, dtype=np.float32)
        sy = np.full(total_count, 0.015, dtype=np.float32)
        sz = np.full(total_count, 0.015, dtype=np.float32)

    # 4. Filter visible splats and sample evenly
    valid_mask = alpha > 15
    valid_indices = np.where(valid_mask)[0]
    print(f"      Valid visible splats: {len(valid_indices):,}")

    if len(valid_indices) > max_splats:
        step = max(1, len(valid_indices) // max_splats)
        sampled_indices = valid_indices[::step][:max_splats]
    else:
        sampled_indices = valid_indices

    print(f"[4/4] Writing {len(sampled_indices):,} crisp Gaussian splats to {splat_out_path} ...")
    with open(splat_out_path, "wb") as f:
        for idx in sampled_indices:
            # Coordinates (Y-Up alignment)
            x_val = float(px[idx])
            y_val = float(py[idx])
            z_val = float(pz[idx])

            # Scale
            s_x = float(sx[idx])
            s_y = float(sy[idx])
            s_z = float(sz[idx])

            # Colors
            r_val = int(r[idx])
            g_val = int(g[idx])
            b_val = int(b[idx])
            a_val = int(alpha[idx])

            # Quats
            qx = int(quats_img[idx, 0])
            qy = int(quats_img[idx, 1])
            qz = int(quats_img[idx, 2])
            qw = int(quats_img[idx, 3])

            buf = struct.pack("<ffffffBBBBBBBB", x_val, y_val, z_val, s_x, s_y, s_z, r_val, g_val, b_val, a_val, qx, qy, qz, qw)
            f.write(buf)

    print(f" SUCCESS! Converted SOG to '{os.path.basename(splat_out_path)}' ({len(sampled_indices):,} Gaussians).")

if __name__ == "__main__":
    scenes_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", "data", "scenes")
    sog_in = os.path.join(scenes_dir, "Livingroomsog.sog")
    splat_out = os.path.join(scenes_dir, "scanned_living_room.splat")

    if os.path.exists(sog_in):
        convert_sog_to_splat(sog_in, splat_out, max_splats=250000)
    else:
        print(f"File not found: {sog_in}")
