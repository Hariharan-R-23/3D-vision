# PROJECT: 3D Gaussian Splatting-Based AR Scene Viewer with Virtual Object Placement and Occlusion

## 1. YOUR ROLE

Act as a senior computer vision engineer, 3D graphics developer, and full-stack software engineer.

Your task is to build a **fully functional, technically meaningful, end-to-end 3D Gaussian Splatting (3DGS) project** that can be demonstrated in a college project presentation tomorrow.

This is NOT a UI-only project.

The application must contain actual computational logic, real 3D rendering, meaningful data processing, and a working backend.

You must create the complete project, install the dependencies, implement the code, run it, test it, and fix errors.

Do not stop after generating a project structure or providing code snippets.

---

## 2. PROJECT TITLE

**Gaussian Reality: 3D Gaussian Splatting-Based AR Scene Reconstruction and Virtual Object Placement**

### Project objective

Develop an interactive application that loads a reconstructed 3D scene represented using 3D Gaussian Splatting, allows a user to place virtual objects within the scene, and demonstrates how depth-aware rendering can improve the integration of virtual objects into a reconstructed environment.

The project should demonstrate concepts from:

* 3D Gaussian Splatting
* 3D computer vision
* Scene reconstruction and representation
* Camera geometry and coordinate transformations
* Depth estimation and occlusion
* 3D rendering and compositing
* Backend integration

The primary goal is to demonstrate a working technical prototype, not to build a production-ready AR system.

---

## 3. STRICT PROJECT CONSTRAINTS

We have approximately one day to prepare a working implementation and a 10-minute presentation.

Follow these constraints strictly:

1. The project must be fully software-based.
2. No physical construction, hardware assembly, or special sensors are required.
3. Do not require a VR headset or AR glasses.
4. Do not require capturing a new real-world scene.
5. Use a preloaded sample scene or generate a small synthetic scene if necessary.
6. The application must run locally on a Windows computer.
7. Prefer Python for the computer vision and backend components.
8. Use a browser-based interface for interactive visualization.
9. Avoid unnecessary cloud services, paid APIs, and external accounts.
10. Do not make the entire project a frontend-only application.
11. Do not simulate 3DGS using ordinary point clouds and claim it is genuine Gaussian Splatting.
12. Do not claim that depth estimation is ground-truth depth.
13. Do not claim that simulated AR is physical-world AR.
14. Do not leave critical features as TODOs or placeholders.
15. If a dependency is incompatible or unavailable, implement a documented, functional fallback and explain exactly what it does and does not demonstrate.

**Prioritize a reliable, demonstrable MVP over an incomplete research-grade implementation.**

---

## 4. REQUIRED ARCHITECTURE

Use the following architecture unless a dependency or compatibility issue makes a different approach necessary.

### Frontend

* React
* Vite
* TypeScript
* Three.js
* A compatible Gaussian Splatting rendering library

### Backend

* Python
* FastAPI
* OpenCV
* NumPy
* Pillow

### 3DGS

Use a genuine Gaussian Splatting renderer.

Preferred options:

* `@mkkellogg/gaussian-splats-3d`
* Another compatible Gaussian Splatting viewer with a documented API
* A compatible Python Gaussian Splatting implementation if it simplifies scene processing

Use a precomputed Gaussian Splat scene in `.ply`, `.splat`, or another supported format.

Do not train a large Gaussian Splatting model from scratch unless the environment already supports it and the process is fast enough for the deadline.

### Storage

Use local files.

Do not require AWS S3 or any paid service.

---

## 5. CORE FUNCTIONALITY

Implement the following features in order of priority.

### MODULE 1: Gaussian Splat Scene Viewer

Build a functional 3DGS viewer.

Requirements:

1. Load a genuine Gaussian Splat scene.
2. Render the scene in a browser.
3. Allow the user to rotate, pan, and zoom.
4. Display the scene in a dedicated viewport.
5. Provide controls to reset the camera.
6. Allow the user to switch between available scenes if multiple scenes exist.
7. Display scene-loading progress and errors.
8. Display scene metadata when available.

If no suitable sample scene is available, create a small synthetic Gaussian Splat scene or use a documented sample asset that can be downloaded automatically.

The application must start without requiring the user to manually search for a dataset.

---

### MODULE 2: Virtual Object Placement

Implement interactive placement of virtual objects within the reconstructed scene.

Requirements:

1. Provide a small collection of primitive virtual objects:

   * Cube
   * Sphere
   * Cylinder
   * Cone

2. Allow the user to select an object.

3. Allow the user to place the object at a selected 3D coordinate.

4. Allow the user to move the object along the X, Y, and Z axes.

5. Allow the user to rotate the object.

6. Allow the user to scale the object.

7. Provide a reset button.

8. Display the object's world coordinates.

Use a consistent coordinate system for the scene and virtual objects.

Implement the coordinate transformation logic explicitly.

The placement system must work with the loaded scene and not simply display an unrelated object in a separate viewport.

---

### MODULE 3: Depth-Aware Occlusion

This is a central technical component of the project.

Implement a simplified but meaningful depth-aware rendering system.

The objective is to demonstrate how a virtual object can appear behind a reconstructed surface rather than always being rendered in front of the entire scene.

Requirements:

1. Obtain depth information from a supported source.
2. Prefer scene depth information if available.
3. If scene depth is unavailable, use a precomputed depth map or a clearly documented depth-estimation method.
4. Generate or load a depth map associated with the scene's camera viewpoint.
5. Implement depth comparison between the virtual object and the reconstructed scene.
6. Use the depth comparison to determine whether the virtual object should be visible at a given pixel.
7. Provide an interface to enable and disable occlusion.
8. Display the depth map for demonstration.
9. Include a visualization of the occlusion mask.
10. Explain the limitations of the chosen depth representation.

Do not implement a fake occlusion toggle that only changes the object's opacity.

If full Gaussian-level depth compositing is too complex, implement a simplified depth-buffer or depth-mask compositing system and document its limitations.

The application must clearly distinguish between genuine Gaussian Splat rendering and any simplified depth-compositing approximation.

---

### MODULE 4: Python Computer Vision Backend

Create a working FastAPI backend.

The backend must handle real computation rather than merely returning hardcoded responses.

Implement the following endpoints.

#### GET /api/health

Return:

* Application status
* Backend version
* Available modules

#### GET /api/scenes

Return the available scenes and their metadata.

#### GET /api/scenes/{scene_id}

Return information about a selected scene.

Include:

* Scene ID
* Scene name
* File format
* Dimensions or bounding box, if available
* Camera information, if available
* Available depth information

#### POST /api/depth/process

Accept an image or depth map and process it using Python.

Implement:

* Input validation
* Image loading
* Depth-map normalization
* Depth-map visualization
* Basic depth statistics
* Output serialization

Return:

* Processed depth map
* Minimum depth
* Maximum depth
* Mean depth
* Image dimensions

#### POST /api/placement

Accept a virtual object's placement information.

The JSON payload should contain:

* Object ID
* Object type
* Position
* Rotation
* Scale
* Timestamp

Validate the payload and store the placement in memory or a local JSON file.

Return the saved placement and its transformed coordinates.

#### GET /api/placements

Return the saved virtual objects.

#### DELETE /api/placements/{object_id}

Delete a selected virtual object.

#### POST /api/scene/analyze

Implement a meaningful scene-analysis operation.

Depending on the available data, this can include:

* Scene dimensions
* Depth statistics
* Point or Gaussian count, if available
* Bounding-box calculations
* Camera metadata

Do not fabricate unavailable scene statistics.

---

## 6. CAMERA AND COORDINATE TRANSFORMATIONS

Implement a clear coordinate transformation system.

The application must support:

* Scene coordinates
* Camera coordinates
* Virtual object coordinates
* World coordinates

Where camera parameters are available, use them to establish the relationship between the scene and camera.

Implement transformation matrices using appropriate Three.js or NumPy operations.

Provide a utility to convert between coordinate systems.

Document:

1. Coordinate-system conventions.
2. Camera position and orientation.
3. Object placement coordinates.
4. Scene scale.
5. Any assumptions used when the original scene lacks absolute scale.

Do not claim metric accuracy when the scene's absolute scale is unknown.

---

## 7. USER INTERFACE

Create a clean, modern technical dashboard.

The UI should contain the following sections.

### Header

Display:

**Gaussian Reality**

Subtitle:

3D Gaussian Splatting | Scene Reconstruction | Virtual Object Placement

Include a backend connection indicator.

### Main Scene Viewport

Display:

* The Gaussian Splat scene
* Virtual objects
* Camera controls
* Scene-loading status

### Left Sidebar: Scene Controls

Include:

* Scene selector
* Scene metadata
* Camera reset
* Scene analysis button
* Depth-map visualization toggle

### Right Sidebar: Object Controls

Include:

* Object selection
* Position controls
* Rotation controls
* Scale controls
* Add object
* Remove object
* Reset placement

### Bottom Panel: Computer Vision

Include:

* Depth map
* Occlusion mask
* Depth statistics
* Occlusion toggle

### Status Panel

Display:

* Backend connection status
* Scene-loading status
* Current scene
* Number of virtual objects
* Current rendering mode
* Any active errors

Avoid excessive animations and unnecessary decorative elements.

The application should look like a technical research prototype.

---

## 8. PROJECT STRUCTURE

Use a clean structure similar to the following:

```text
gaussian-reality/
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── services/
│   │   ├── scene_service.py
│   │   ├── depth_service.py
│   │   └── placement_service.py
│   ├── models/
│   │   └── schemas.py
│   ├── data/
│   │   ├── scenes/
│   │   ├── depth/
│   │   └── placements.json
│   └── tests/
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── components/
│       │   ├── SceneViewer.tsx
│       │   ├── SceneControls.tsx
│       │   ├── ObjectControls.tsx
│       │   ├── DepthPanel.tsx
│       │   └── StatusPanel.tsx
│       ├── services/
│       │   └── api.ts
│       ├── utils/
│       │   └── transformations.ts
│       └── styles/
│           └── global.css
│
├── scripts/
│   └── setup_demo.py
│
├── README.md
├── start.bat
└── .gitignore
```

You may modify this structure if necessary, but keep the frontend, backend, scene data, and computer vision logic clearly separated.

---

## 9. DEMO DATA AND AUTOMATIC SETUP

The project must work even if the user has no existing 3DGS dataset.

Create an automated setup process.

Requirements:

1. Check whether a valid sample Gaussian Splat scene exists.
2. If it does not exist, obtain a compatible public sample asset or generate a small synthetic scene.
3. Validate the scene file before loading it.
4. Provide a fallback scene if the primary asset fails.
5. Generate a corresponding demonstration depth map if necessary.
6. Store generated assets locally.
7. Avoid repeatedly downloading the same asset.

If downloading a sample scene, use a reliable, publicly accessible source.

Document the source and format.

If the sample asset cannot be obtained, the application must still launch in a clearly labeled fallback mode.

Do not claim that a synthetic scene was reconstructed from real-world images.

---

## 10. OPTIONAL FEATURES

Only implement these after the core system works.

### Optional A: Screenshot Capture

Allow the user to capture the current scene and save a screenshot.

### Optional B: Scene Comparison

Allow comparison between:

* Original scene
* Scene with virtual objects
* Scene with occlusion enabled

### Optional C: Basic Image-Based Camera Input

Allow the user to upload an image and process it through the Python backend.

This can be used to demonstrate image preprocessing or depth estimation.

Do not claim that a single uploaded image provides accurate 6-DoF camera localization.

### Optional D: AR-Style Mode

Provide a simulated AR mode in which a virtual object is placed relative to a selected camera viewpoint.

This is optional and must be labeled as simulated AR.

Do not claim that it uses physical-world tracking unless WebXR tracking is genuinely implemented and tested.

---

## 11. IMPLEMENTATION ORDER

Follow this exact order.

### Phase 1: Environment Setup

* Inspect the available development environment.
* Check Python and Node.js versions.
* Create the project directories.
* Install compatible dependencies.
* Resolve dependency conflicts before proceeding.

### Phase 2: Scene Rendering

* Obtain or generate a valid Gaussian Splat scene.
* Implement the 3DGS renderer.
* Confirm that the scene loads and renders correctly.
* Test camera controls.

Do not proceed until the scene is visible.

### Phase 3: Backend

* Implement the FastAPI application.
* Implement the scene, depth, and placement services.
* Add input validation.
* Test the API endpoints.

### Phase 4: Object Placement

* Implement object creation.
* Implement coordinate transformations.
* Connect placement controls to the backend.
* Verify that objects appear at the correct coordinates.

### Phase 5: Depth and Occlusion

* Implement depth-map processing.
* Implement the occlusion mask.
* Connect the depth visualization to the frontend.
* Test occlusion with a known scene configuration.

### Phase 6: UI Integration

* Connect all frontend components to the backend.
* Implement loading states and error messages.
* Verify that all buttons and controls work.

### Phase 7: Testing

* Start the backend.
* Start the frontend.
* Verify all core workflows.
* Fix runtime errors.
* Verify that the project works after restarting.

### Phase 8: Finalization

* Write a complete README.
* Create a one-command startup script.
* Provide a 10-minute presentation guide.
* Provide a troubleshooting guide.

---

## 12. TESTING REQUIREMENTS

Do not declare the project complete until you have tested the following.

### Backend

* Health endpoint responds correctly.
* Scene list loads.
* Scene metadata is returned.
* Depth processing works.
* Object placement is saved.
* Object retrieval works.
* Object deletion works.
* Invalid payloads are rejected.

### Frontend

* Application launches.
* Scene is visible.
* Camera controls work.
* Objects can be added.
* Objects can be moved.
* Objects can be rotated and scaled.
* Backend status is displayed.
* Depth visualization works.
* Occlusion toggle changes the actual rendering behavior.
* Errors are displayed clearly.

### Integration

* Frontend communicates with the Python backend.
* Scene metadata is loaded from the backend.
* Placement updates are persisted.
* The application works after restarting.

If a feature cannot be verified, explicitly mark it as unverified.

---

## 13. README REQUIREMENTS

Write a complete README containing:

1. Project overview.
2. Problem statement.
3. Objectives.
4. System architecture.
5. Technology stack.
6. Installation instructions.
7. Startup instructions.
8. Sample scene details.
9. Explanation of the 3DGS representation.
10. Explanation of the depth-processing pipeline.
11. Explanation of the occlusion algorithm.
12. Coordinate transformation methodology.
13. API documentation.
14. Testing instructions.
15. Limitations.
16. Future improvements.
17. References to the relevant research papers.

Clearly distinguish between:

* Implemented features
* Simplified approximations
* Optional features
* Unverified functionality

---

## 14. PRESENTATION REQUIREMENTS

Create a concise 10-minute demonstration guide.

The guide must include:

### 0:00–1:00 — Problem Statement

Explain the challenge of placing virtual objects inside a reconstructed 3D environment.

### 1:00–2:00 — Introduction to 3DGS

Explain how a scene can be represented using 3D Gaussian primitives.

### 2:00–4:00 — Scene Rendering

Demonstrate the loaded scene and camera controls.

### 4:00–6:00 — Virtual Object Placement

Demonstrate adding, moving, rotating, and scaling an object.

### 6:00–8:00 — Computer Vision and Occlusion

Demonstrate the depth map, occlusion mask, and depth-aware rendering.

### 8:00–9:00 — Backend and Technical Architecture

Explain the Python backend, data flow, and coordinate transformations.

### 9:00–10:00 — Results and Limitations

Summarize the implementation, its limitations, and possible future improvements.

Include a list of likely faculty questions and technically accurate answers.

---

## 15. IMPORTANT ENGINEERING RULES

* Write complete, runnable code.
* Do not provide pseudocode for core features.
* Do not leave placeholder buttons.
* Do not silently replace Gaussian Splatting with ordinary point-cloud rendering.
* Do not invent test results.
* Do not claim to have tested features that were not executed.
* Avoid unnecessary dependencies.
* Avoid overly complicated machine-learning models.
* Do not require a GPU unless absolutely necessary.
* Prefer CPU-compatible backend operations where practical.
* Use GPU acceleration for rendering when available.
* Keep the code readable and well-commented.
* Handle errors gracefully.
* Use real data wherever possible.
* Make the application suitable for a live demonstration.

If a requested feature is too difficult to implement reliably within the available time, simplify it while preserving the underlying technical concept.

Clearly explain the simplification in the README and presentation guide.

---

## 16. FINAL DELIVERABLES

At the end, provide:

1. Complete frontend source code.
2. Complete backend source code.
3. All configuration files.
4. Dependency files.
5. Sample scene assets or an automated scene setup script.
6. Depth-processing implementation.
7. Object placement and transformation logic.
8. Working API endpoints.
9. A complete README.
10. A one-command startup script.
11. A 10-minute presentation script.
12. A list of tested features.
13. A list of known limitations.
14. A troubleshooting guide.

---

## 17. FINAL EXECUTION INSTRUCTIONS

**Start building the project immediately.**

Do not respond with an architecture proposal or a tutorial.

First inspect the available environment, then create the project files and implement the application.

After implementation:

1. Install dependencies.
2. Run the backend.
3. Run the frontend.
4. Test the core functionality.
5. Fix any errors you encounter.
6. Verify that the application launches successfully.
7. Provide the exact commands needed to launch the project.
8. Explain which features are genuinely implemented and which are simplified.

The final result must be a working technical prototype that can be demonstrated tomorrow in approximately 10 minutes.
