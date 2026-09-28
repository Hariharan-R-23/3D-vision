# 10-Minute Demonstration & Defense Presentation Guide

**Project Title:** Gaussian Reality: 3D Gaussian Splatting-Based AR Scene Reconstruction and Virtual Object Placement  
**Presenter Guide & Timeline:** 10-Minute Technical Defense

---

## ⏱️ Minute-by-Minute Demonstration Script

### 0:00–1:00 — Problem Statement & Motivation
* **What to say:** "Standard Augmented Reality solutions suffer from a mutual occlusion problem: virtual objects are rendered as flat overlays on top of the camera feed, ignoring real-world depth. When a virtual object is placed behind a physical table or column, it appears to float in the foreground. Our goal in *Gaussian Reality* is to integrate explicit 3D Gaussian Splatting scene representations with depth-aware rendering to achieve physically coherent object placement."
* **What to show:** Open the application UI. Point out the dashboard layout and system telemetry in the top header.

---

### 1:00–2:00 — Fundamentals of 3D Gaussian Splatting (3DGS)
* **What to say:** "Unlike discrete triangular meshes (which struggle with complex foliage or fuzzy boundaries) or implicit NeRFs (which require heavy neural network ray-marching), 3D Gaussian Splatting uses millions of 3D ellipsoidal Gaussian primitives. Each primitive is defined by its mean position $\mu$, a 3D covariance matrix $\Sigma = R S S^T R^T$, opacity $\alpha$, and spherical harmonics for view-dependent color. This allows real-time rendering at 60+ FPS via rasterization."
* **What to show:** Point to the active scene Gaussian count badge (e.g. `24,500 splats`) and the scene metadata panel on the left sidebar.

---

### 2:00–4:00 — Interactive Scene Rendering & Camera Control
* **What to say:** "Here is our 3DGS reconstructed scene rendered in real-time in the browser using WebGL. We have full 6-DoF camera navigation: orbit rotation, panning, and zoom. We can also toggle between full Gaussian soft-ellipsoid rendering and point-cloud/wireframe debugging modes."
* **What to show:**
  1. Rotate and orbit around the room / gazebo scene.
  2. Click the **Render Mode** button on the top HUD to toggle from `Gaussian` to `PointCloud` to show the underlying primitive structure.
  3. Click **Reset Camera** to return to canonical viewpoint.

---

### 4:00–6:00 — Virtual Object Placement & 4×4 Matrix Transformations
* **What to say:** "Now we place virtual geometric primitives into the reconstructed coordinate space. The system calculates the full 4×4 affine transformation matrix $T = T_{\text{translate}} \cdot R_{\text{euler}} \cdot S_{\text{scale}}$ on the client and persists it to our FastAPI backend."
* **What to show:**
  1. Click **Cube** or **Sphere** in the right sidebar to spawn a new virtual object.
  2. Drag the **Pos X**, **Pos Y**, and **Pos Z** sliders to move the object across the floor and pedestal.
  3. Change the object color.
  4. Point out the live **4×4 Affine Matrix readout** updating in real time.

---

### 6:00–8:00 — Computer Vision Depth Engine & Occlusion Mask
* **What to say:** "This brings us to the core computer vision contribution: depth-aware occlusion. In the bottom drawer, our Python OpenCV pipeline extracts photometric depth maps, generates normalized visualizations with TURBO / VIRIDIS colormaps, and calculates an occlusion mask."
* **What to show:**
  1. Move the amber sphere **behind** the classical column.
  2. Toggle the **Scene Depth Compositing** button from **ACTIVE** to **BYPASSED**. Show how the sphere unnaturally appears in front of the column when bypassed, and is realistically hidden behind the column when active.
  3. In the bottom drawer, switch tabs between **Color**, **Norm**, and **Mask** to show the Cyan/Red occlusion overlay and the 20-bin depth histogram.

---

### 8:00–9:00 — Backend Integration & Volumetric CV Analysis
* **What to say:** "Our FastAPI backend performs automated geometric analysis. When we click 'Run Scene CV Analysis', the backend parses the binary splat structure, evaluates spatial extents, computes center of mass, and determines Gaussian density per cubic meter."
* **What to show:**
  1. Click **Run Scene CV Analysis** in the left sidebar.
  2. Point out the green verified badge, Gaussian density readout (e.g. `2,150 splats/m³`), and center-of-mass coordinates.

---

### 9:00–10:00 — Results, Limitations & Future Work
* **What to say:** "In summary, Gaussian Reality demonstrates real-time 3D Gaussian Splatting rendering, 4×4 matrix coordinate transformations, and depth-aware photometric occlusion in an integrated full-stack architecture. For future work, we plan to integrate WebXR device tracking and spherical harmonics relighting."
* **What to show:** Show the final screenshot capture functionality by clicking **Screenshot**.

---

## 🎓 Faculty Defense: Likely Questions & Model Answers

### Q1: "How does 3D Gaussian Splatting differ from traditional Point Cloud or Mesh rendering?"
> **Answer:** "A point cloud consists of discrete, dimensionless points with no surface area or directional opacity, leading to gaps and holes. Triangular meshes require explicit connectivity topology, which struggles with complex organic geometry or thin structures. 3D Gaussian Splatting uses continuous 3D ellipsoids with learnable 3D covariance matrices ($\Sigma$) and anisotropic opacities, allowing them to overlap seamlessly and reproduce soft view-dependent lighting without expensive ray tracing."

### Q2: "How is the depth comparison calculated for occlusion?"
> **Answer:** "For each projected virtual object, we evaluate its camera-space depth $Z_{\text{virtual}}$. During rasterization and in our CV backend, we compare this against the reconstructed scene's depth buffer $Z_{\text{scene}}$ at pixel $(u, v)$. If $Z_{\text{scene}} < Z_{\text{virtual}}$, the reconstructed surface is closer to the viewpoint, and the virtual object's fragment is discarded or masked out."

### Q3: "What are the limitations of monocular/approximated depth vs full depth sorting?"
> **Answer:** "In our prototype, we utilize a camera-viewpoint depth buffer and projective bounding depth approximations for low-latency compositing. The limitation is that it evaluates the dominant surface depth rather than per-particle alpha-blended transparency. In future research, depth can be sorted directly inside the splat tile rasterizer."

### Q4: "What coordinate system convention is used?"
> **Answer:** "We standardize on the Right-Handed Cartesian coordinate system with Y-Up, consistent with Three.js and standard computer vision conventions. In camera space, $+X$ points right, $+Y$ points up, and $-Z$ points along the optical viewing direction."
