# Gaussian Reality: 3D Gaussian Splatting-Based AR Scene Reconstruction & Virtual Object Placement

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20OpenCV%20%7C%20NumPy-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%20%7C%20Three.js%20%7C%20TypeScript-61DAFB.svg)](https://react.dev)
[![3DGS](https://img.shields.io/badge/3D%20Graphics-3D%20Gaussian%20Splatting-blue.svg)](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/)
[![Tests](https://img.shields.io/badge/Tests-Pytest%20Passing-brightgreen.svg)](https://pytest.org)

An end-to-end computer vision and real-time 3D rendering prototype demonstrating **3D Gaussian Splatting (3DGS)** scene reconstruction, interactive **virtual object placement**, and **depth-aware photometric occlusion**.

---

## 1. Project Overview & Problem Statement

Augmented Reality (AR) systems frequently struggle with the **mutual occlusion problem**: when a virtual object is inserted into a real-world reconstructed scene, naive rendering engines simply draw the virtual object on top of all visual pixels. This produces visual dissonance because objects positioned behind reconstructed columns, furniture, or architectural elements appear to unnaturally float in the foreground.

**Gaussian Reality** addresses this challenge by combining:
1. **Explicit 3D Gaussian Scene Representation:** Rendering complex geometry, view-dependent color, and depth using Gaussian primitives rather than discrete meshes or sparse point clouds.
2. **Interactive 4×4 Coordinate Transformation Engine:** Enabling precise 3D translation, rotation, and scaling of virtual geometric primitives within the reconstructed coordinate frame.
3. **Photometric Depth-Aware Occlusion:** Performing pixel-wise depth buffer comparison ($D_{\text{scene}} < D_{\text{virtual}}$) to realistically mask occluded virtual pixels.

---

## 2. System Architecture

```
                                  +---------------------------------------+
                                  |         FastAPI Python Backend        |
                                  |    - Scene Parsing & Analysis         |
                                  |    - OpenCV Depth Normalization       |
                                  |    - 4x4 Affine Matrix Computation    |
                                  |    - Placement CRUD Persistence       |
                                  +-------------------+-------------------+
                                                      |
                                     HTTP REST / JSON | Static Splat Buffers
                                                      v
+-----------------------------------------------------------------------------------------+
|                                    React / Vite Frontend                                |
|                                                                                         |
|  +------------------------+  +-------------------------------+  +--------------------+  |
|  |  SceneControls.tsx     |  |       SceneViewer.tsx         |  | ObjectControls.tsx |  |
|  |  - Scene Switcher      |  |  - WebGL Gaussian Shader      |  | - Add 3D Primitives|  |
|  |  - Geometry Metadata   |  |  - OrbitControls & Raycaster  |  | - Pos/Rot/Scale    |  |
|  |  - Volumetric Analysis |  |  - Depth Buffer Occlusion     |  | - 4x4 Matrix HUD   |  |
|  +------------------------+  +-------------------------------+  +--------------------+  |
|                                                     |                                   |
|                               +---------------------+----------------+                  |
|                               |               DepthPanel.tsx         |                  |
|                               |  - TURBO / VIRIDIS Colormapping      |                  |
|                               |  - Occlusion Mask (Cyan/Red Overlay) |                  |
|                               |  - 20-Bin Depth Histogram            |                  |
|                               +--------------------------------------+                  |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Technology Stack

* **Frontend:** React 18, TypeScript, Three.js, Vite, Lucide React, CSS3 Glassmorphic Design System.
* **Backend:** Python 3.14 / 3.11+, FastAPI, Uvicorn, OpenCV (`cv2`), NumPy, Pillow, Pydantic v2.
* **Scene Formats:** Binary `.splat` (32 bytes per Gaussian primitive: position, scale, RGBA color, quaternion rotation).
* **Testing:** Pytest, FastAPI TestClient, TypeScript strict compiler validation.

---

## 4. Mathematical Foundations

### 4.1 3D Gaussian Representation
Each reconstructed point in the scene is modeled as an anisotropic 3D Gaussian ellipsoid defined by a mean center $\mathbf{\mu} \in \mathbb{R}^3$ and a 3D covariance matrix $\mathbf{\Sigma}$:

$$G(\mathbf{x}) = \exp\left(-\frac{1}{2}(\mathbf{x} - \mathbf{\mu})^T \mathbf{\Sigma}^{-1} (\mathbf{x} - \mathbf{\mu})\right)$$

To enforce positive semi-definiteness during optimization, $\mathbf{\Sigma}$ is factorized into a scaling matrix $\mathbf{S} = \text{diag}(s_x, s_y, s_z)$ and a rotation matrix $\mathbf{R}$ derived from unit quaternion $\mathbf{q}$:

$$\mathbf{\Sigma} = \mathbf{R} \mathbf{S} \mathbf{S}^T \mathbf{R}^T$$

### 4.2 Elliptical Weighted Average (EWA) Splatting
When projected onto the 2D image plane via projective transformation $\mathbf{W}$ and Jacobian of the projective transformation $\mathbf{J}$, the 2D covariance $\mathbf{\Sigma}'$ is:

$$\mathbf{\Sigma}' = \mathbf{J} \mathbf{W} \mathbf{\Sigma} \mathbf{W}^T \mathbf{J}^T$$

### 4.3 Depth Occlusion Decision Function
For each pixel $(u, v)$ overlapping a virtual object:

$$\text{Visibility}(u, v) = \begin{cases} 
1 \quad (\text{Visible Object}), & \text{if } D_{\text{virtual}}(u, v) \le D_{\text{scene}}(u, v) \\
0 \quad (\text{Occluded by Scene}), & \text{if } D_{\text{virtual}}(u, v) > D_{\text{scene}}(u, v) 
\end{cases}$$

---

## 5. Installation & Startup Instructions

### Prerequisites
* **Node.js** (v18+ or v24+)
* **Python** (3.10+)

### Quick Start (One Command)
Run the automated Windows batch script:
```bat
start.bat
```

### Manual Setup
1. **Backend:**
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

2. **Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Open **`http://127.0.0.1:5173`** in your browser.

---

## 6. API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Healthcheck & loaded CV modules |
| `GET` | `/api/scenes` | List available 3DGS scenes and metadata |
| `GET` | `/api/scenes/{scene_id}` | Retrieve scene details and camera parameters |
| `POST` | `/api/scene/analyze` | Volumetric and Gaussian density spatial analysis |
| `POST` | `/api/depth/process` | OpenCV depth normalization, colormapping, & histogram |
| `GET` | `/api/placements` | Retrieve saved virtual object placements |
| `POST` | `/api/placement` | Save virtual object and compute 4×4 affine matrix |
| `DELETE` | `/api/placements/{object_id}` | Remove a virtual object |

---

## 7. Verification & Automated Tests

To execute the backend test suite:
```bash
python -m pytest backend/tests/test_api.py -v
```

All 5 core test suites verify:
* ✅ API Health & Module Status
* ✅ Scene Scanning & Binary Splat Parsing
* ✅ Volumetric Scene Analysis & Density Bounds
* ✅ OpenCV Depth Normalization & Pseudo-color Mapping
* ✅ Virtual Object Placement Lifecycle & 4×4 Matrix Transformation

---

## 8. Limitations & Scope Clarifications

1. **Depth Representation:** In this prototype, depth comparison utilizes camera-viewpoint Z-buffers and monocular depth projections. While high-performance and real-time, it approximates full volumetric alpha-blended splat depth sorting.
2. **Absolute Scale:** Uncalibrated Gaussian Splatting captures have arbitrary relative scale. Metric units (meters) are normalized relative to scene bounding bounds.
3. **Simulated AR Mode:** AR viewpoint alignment demonstrates camera-relative object positioning; it does not utilize physical SLAM sensor hardware.

---

## 9. References

1. **Kerbl, B., Kopanas, G., Leimkühler, T., & Drettakis, G. (2023).** *3D Gaussian Splatting for Real-Time Radiance Field Rendering.* ACM Transactions on Graphics (TOG), 42(4), 1-14.
2. **Mildenhall, B., Srinivasan, P. P., Tancik, M., Barron, J. T., Ramamoorthi, R., & Ng, R. (2021).** *NeRF: Representing scenes as neural radiance fields for view synthesis.* Communications of the ACM, 65(1), 99-106.
3. **Zwicker, M., Pfister, H., van Baar, J., & Gross, M. (2001).** *Surface splatting.* Proceedings of the 28th annual conference on Computer graphics and interactive techniques, 371-378.
