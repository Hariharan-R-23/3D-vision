# Gaussian Reality: Project Summary

**Gaussian Reality** is an interactive 3D Computer Vision and Augmented Reality (AR) research prototype built with **3D Gaussian Splatting (3DGS)**, **Three.js**, and **FastAPI**.

### What This Project Does:

1. **Loads & Renders 3D Gaussian Splats:**
   - Reads reconstructed 3D scenes from binary `.splat` files (32 bytes per Gaussian).
   - Renders photorealistic radiance fields in real-time in the browser using WebGL shaders.

2. **Places Virtual 3D Objects Interactively:**
   - Allows users to insert geometric primitives (Cube, Sphere, Cylinder, Cone) into the scene.
   - Computes 4×4 affine transformation matrices ($T_{\text{trans}} \cdot R_{\text{rot}} \cdot S_{\text{scale}}$) for 3D translation, rotation, and scaling.

3. **Solves Mutual Occlusion with Depth-Aware Compositing:**
   - Compares the camera-space depth of virtual objects against reconstructed scene depth ($D_{\text{scene}} < D_{\text{virtual}}$).
   - Realistically hides virtual objects when placed behind reconstructed walls, pedestals, or columns instead of floating on top.

4. **Performs Computer Vision Depth Analysis (Python Backend):**
   - Provides OpenCV-powered depth maps with pseudo-color palettes (TURBO, VIRIDIS, MAGMA).
   - Calculates real-time occlusion masks (Cyan = visible, Red = occluded), scene bounding boxes, and Gaussian density distributions (splats/$\text{m}^3$).

5. **Provides a Full-Stack Research Dashboard:**
   - **Frontend:** React, TypeScript, Three.js, OrbitControls, and glassmorphic telemetry HUD.
   - **Backend:** FastAPI, OpenCV, NumPy, and JSON persistence for placements.
