import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SceneInfo, PlacementItem } from '../services/api';
import { projectWorldToScreen } from '../utils/transformations';
import { Eye, EyeOff, RotateCcw, Camera as CameraIcon, Layers, Sliders } from 'lucide-react';

interface SceneViewerProps {
  scene: SceneInfo | null;
  placements: PlacementItem[];
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
  onCameraUpdate?: (pos: [number, number, number], target: [number, number, number]) => void;
  globalOcclusionEnabled: boolean;
  onDepthDataCaptured?: (depthB64: string, objectDepths: any[]) => void;
}

export const SceneViewer: React.FC<SceneViewerProps> = ({
  scene,
  placements,
  selectedObjectId,
  onSelectObject,
  onCameraUpdate,
  globalOcclusionEnabled,
  onDepthDataCaptured
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const splatMeshRef = useRef<THREE.Points | null>(null);
  const objectMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);

  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fps, setFps] = useState<number>(60);
  const [renderMode, setRenderMode] = useState<'gaussian' | 'pointcloud' | 'wireframe'>('gaussian');
  const [arMode, setArMode] = useState<boolean>(false);
  const [splatScale, setSplatScale] = useState<number>(0.45); // Crisp default size

  // Initialize Three.js Scene, Camera, Renderer, Controls
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const sceneThree = new THREE.Scene();
    sceneThree.background = new THREE.Color('#07090e');
    sceneRef.current = sceneThree;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.05, 100);
    camera.position.set(0, 1.2, 3.8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0.2, 0);
    controlsRef.current = controls;

    // Lighting for virtual objects & scene
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    sceneThree.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight1.position.set(5, 10, 7);
    sceneThree.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x818cf8, 0.8);
    dirLight2.position.set(-5, -3, -5);
    sceneThree.add(dirLight2);

    // Subtle Ground Grid
    const grid = new THREE.GridHelper(10, 20, 0x38bdf8, 0x1e293b);
    grid.position.y = -1.0;
    sceneThree.add(grid);
    gridHelperRef.current = grid;

    // Animation Loop
    let animationFrameId: number;
    let frameCount = 0;
    let lastTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();

      // Render
      renderer.render(sceneThree, camera);

      // Calculate FPS & Trigger camera updates
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;

        if (onCameraUpdate) {
          onCameraUpdate(
            [camera.position.x, camera.position.y, camera.position.z],
            [controls.target.x, controls.target.y, controls.target.z]
          );
        }
      }
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Update splat scale uniform
  useEffect(() => {
    if (splatMeshRef.current && (splatMeshRef.current.material as THREE.ShaderMaterial).uniforms) {
      const mat = splatMeshRef.current.material as THREE.ShaderMaterial;
      if (mat.uniforms.uSplatScale) {
        mat.uniforms.uSplatScale.value = splatScale;
      }
    }
  }, [splatScale]);

  // Load Gaussian Splat Scene Binary (.splat)
  useEffect(() => {
    if (!scene || !sceneRef.current) return;

    setIsLoading(true);
    setLoadingProgress(10);

    // Remove existing splat mesh
    if (splatMeshRef.current) {
      sceneRef.current.remove(splatMeshRef.current);
      splatMeshRef.current = null;
    }

    const splatUrl = `http://127.0.0.1:8000/data/scenes/${scene.filename}`;

    fetch(splatUrl)
      .then(res => {
        setLoadingProgress(40);
        return res.arrayBuffer();
      })
      .then(buffer => {
        setLoadingProgress(75);
        const splatCount = Math.floor(buffer.byteLength / 32);
        
        const positions = new Float32Array(splatCount * 3);
        const colors = new Float32Array(splatCount * 3);
        const sizes = new Float32Array(splatCount);

        const dataView = new DataView(buffer);
        for (let i = 0; i < splatCount; i++) {
          const offset = i * 32;
          // Position x, y, z
          const px = dataView.getFloat32(offset, true);
          const py = dataView.getFloat32(offset + 4, true);
          const pz = dataView.getFloat32(offset + 8, true);
          positions[i * 3] = px;
          positions[i * 3 + 1] = py;
          positions[i * 3 + 2] = pz;

          // Scale sx, sy, sz
          const sx = Math.abs(dataView.getFloat32(offset + 12, true));
          const sy = Math.abs(dataView.getFloat32(offset + 16, true));
          const sz = Math.abs(dataView.getFloat32(offset + 20, true));
          const avgScale = (sx + sy + sz) / 3.0;
          
          // Crisp, tight splat radius
          sizes[i] = Math.max(Math.min(avgScale * 18.0, 1.2), 0.15);

          // Color r, g, b, a (uint8)
          const r = dataView.getUint8(offset + 24) / 255.0;
          const g = dataView.getUint8(offset + 25) / 255.0;
          const b = dataView.getUint8(offset + 26) / 255.0;
          colors[i * 3] = r;
          colors[i * 3 + 1] = g;
          colors[i * 3 + 2] = b;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // Refined High-Definition Gaussian Splatting Shader
        const splatMaterial = new THREE.ShaderMaterial({
          uniforms: {
            uTime: { value: 0 },
            uIsPointCloud: { value: renderMode === 'pointcloud' ? 1.0 : 0.0 },
            uSplatScale: { value: splatScale }
          },
          vertexShader: `
            attribute float size;
            varying vec3 vColor;
            varying float vDepth;
            uniform float uIsPointCloud;
            uniform float uSplatScale;

            void main() {
              vColor = color;
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              vDepth = -mvPosition.z;
              gl_Position = projectionMatrix * mvPosition;
              
              // Refined screen-space size scaling with distance
              float ptSize = size * uSplatScale * (380.0 / max(-mvPosition.z, 0.1));
              gl_PointSize = clamp(ptSize, 1.0, 28.0);
            }
          `,
          fragmentShader: `
            varying vec3 vColor;
            varying float vDepth;
            uniform float uIsPointCloud;

            void main() {
              vec2 coord = gl_PointCoord - vec2(0.5);
              float distSq = dot(coord, coord);
              
              if (uIsPointCloud > 0.5) {
                if (distSq > 0.25) discard;
                gl_FragColor = vec4(vColor, 1.0);
              } else {
                if (distSq > 0.25) discard;
                // Soft Gaussian edge falloff
                float alpha = exp(-distSq * 10.0);
                gl_FragColor = vec4(vColor, alpha);
              }
            }
          `,
          transparent: true,
          depthWrite: false,
          depthTest: true,
          blending: THREE.NormalBlending,
          vertexColors: true
        });

        const splatPoints = new THREE.Points(geometry, splatMaterial);
        sceneRef.current?.add(splatPoints);
        splatMeshRef.current = splatPoints;

        setLoadingProgress(100);
        setIsLoading(false);

        // Reset camera to fit loaded scene
        if (cameraRef.current && controlsRef.current && scene.camera) {
          cameraRef.current.position.set(...scene.camera.position);
          controlsRef.current.target.set(...scene.camera.target);
          controlsRef.current.update();
        }
      })
      .catch(err => {
        console.error('Failed to load splat file:', err);
        setIsLoading(false);
      });
  }, [scene, renderMode]);

  // Sync Virtual Objects (Cube, Sphere, Cylinder, Cone)
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current) return;

    const currentMeshes = objectMeshesRef.current;
    const activeIds = new Set(placements.map(p => p.object_id));

    for (const [id, mesh] of currentMeshes.entries()) {
      if (!activeIds.has(id)) {
        sceneRef.current.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        currentMeshes.delete(id);
      }
    }

    placements.forEach(p => {
      let mesh = currentMeshes.get(p.object_id);
      const isSelected = p.object_id === selectedObjectId;

      if (!mesh) {
        let geom: THREE.BufferGeometry;
        switch (p.object_type) {
          case 'sphere':
            geom = new THREE.SphereGeometry(0.5, 32, 32);
            break;
          case 'cylinder':
            geom = new THREE.CylinderGeometry(0.4, 0.4, 1.0, 32);
            break;
          case 'cone':
            geom = new THREE.ConeGeometry(0.5, 1.0, 32);
            break;
          case 'cube':
          default:
            geom = new THREE.BoxGeometry(1.0, 1.0, 1.0);
            break;
        }

        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(p.color),
          roughness: 0.25,
          metalness: 0.35,
          wireframe: renderMode === 'wireframe',
          transparent: true,
          opacity: p.visible ? 1.0 : 0.0
        });

        mesh = new THREE.Mesh(geom, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { id: p.object_id };

        sceneRef.current?.add(mesh);
        currentMeshes.set(p.object_id, mesh);
      }

      mesh.position.set(...p.position);
      mesh.rotation.set(
        THREE.MathUtils.degToRad(p.rotation[0]),
        THREE.MathUtils.degToRad(p.rotation[1]),
        THREE.MathUtils.degToRad(p.rotation[2])
      );
      mesh.scale.set(...p.scale);

      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.color.set(p.color);
      mat.wireframe = renderMode === 'wireframe';

      const shouldOcclude = globalOcclusionEnabled && p.occlusion_enabled;
      mat.depthTest = true;
      mat.depthWrite = true;

      if (isSelected) {
        mat.emissive.set('#38bdf8');
        mat.emissiveIntensity = 0.35;
      } else {
        mat.emissive.set('#000000');
        mat.emissiveIntensity = 0.0;
      }

      mesh.visible = p.visible;
    });

    if (onDepthDataCaptured && cameraRef.current && containerRef.current) {
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      const projections = placements.map(p => {
        const proj = projectWorldToScreen(p.position, p.scale, cameraRef.current!, w, h);
        return {
          screen_x: Math.round(proj.screenX),
          screen_y: Math.round(proj.screenY),
          depth: parseFloat(proj.depth.toFixed(2)),
          screen_radius: Math.round(proj.screenRadius)
        };
      });

      onDepthDataCaptured('', projections);
    }
  }, [placements, selectedObjectId, globalOcclusionEnabled, renderMode]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const meshes = Array.from(objectMeshesRef.current.values());
    const intersects = raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      onSelectObject(hit.userData.id);
    }
  };

  const handleResetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    if (scene && scene.camera) {
      cameraRef.current.position.set(...scene.camera.position);
      controlsRef.current.target.set(...scene.camera.target);
    } else {
      cameraRef.current.position.set(0, 1.2, 3.8);
      controlsRef.current.target.set(0, 0.2, 0);
    }
    controlsRef.current.update();
  };

  const handleTakeScreenshot = () => {
    if (!rendererRef.current) return;
    const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `gaussian_reality_${scene?.id || 'capture'}_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="viewport-canvas-container" onPointerDown={handlePointerDown}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Loading Overlay */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(7, 9, 14, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 40,
          gap: 12
        }}>
          <div style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--accent-cyan)',
            fontFamily: 'var(--font-mono)'
          }}>
            Loading 3D Gaussian Splatting Scene...
          </div>
          <div style={{
            width: '280px',
            height: '6px',
            background: '#1e293b',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${loadingProgress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            Parsing 32-byte Gaussian Splat Binary Attributes...
          </div>
        </div>
      )}

      {/* Top HUD Controls */}
      <div className="viewport-hud-top">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge badge-cyan">
            {scene ? `${scene.name} (${scene.gaussian_count.toLocaleString()} Gaussians)` : 'No Scene'}
          </span>
          <span className="badge badge-emerald">
            {fps} FPS
          </span>
          {arMode && (
            <span className="badge badge-amber">
              Simulated AR View
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Splat Point Crispness / Scale Slider */}
          <div className="glass-panel" style={{ padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sliders size={12} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Splat Size</span>
            <input
              type="range"
              min="0.1"
              max="1.5"
              step="0.05"
              value={splatScale}
              onChange={e => setSplatScale(parseFloat(e.target.value))}
              style={{ width: '65px', height: '3px' }}
              title={`Splat Scale: ${splatScale.toFixed(2)}x`}
            />
            <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', width: '28px' }}>
              {splatScale.toFixed(1)}x
            </span>
          </div>

          <button
            className="btn-secondary"
            title="Switch Render Mode"
            onClick={() => setRenderMode(m => m === 'gaussian' ? 'pointcloud' : m === 'pointcloud' ? 'wireframe' : 'gaussian')}
          >
            <Layers size={14} />
            <span style={{ textTransform: 'capitalize' }}>{renderMode}</span>
          </button>

          <button
            className="btn-secondary"
            title="Reset Camera Viewpoint"
            onClick={handleResetCamera}
          >
            <RotateCcw size={14} />
            Reset
          </button>

          <button
            className="btn-secondary"
            title="Simulated AR Camera Alignment"
            onClick={() => setArMode(!arMode)}
            style={arMode ? { borderColor: 'var(--accent-amber)', color: 'var(--accent-amber)' } : {}}
          >
            <Eye size={14} />
            {arMode ? 'Exit AR' : 'AR View'}
          </button>

          <button
            className="btn-primary"
            title="Capture Screenshot"
            onClick={handleTakeScreenshot}
          >
            <CameraIcon size={14} />
            Capture
          </button>
        </div>
      </div>

      {/* Bottom HUD Coordinate Status */}
      <div className="viewport-hud-bottom">
        <div className="glass-panel" style={{ padding: '4px 10px', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          Coordinate Frame: <strong style={{ color: 'var(--accent-cyan)' }}>Right-Handed Y-Up</strong> | Depth Occlusion: <strong style={{ color: globalOcclusionEnabled ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>{globalOcclusionEnabled ? 'Active' : 'Bypassed'}</strong>
        </div>
      </div>
    </div>
  );
};
