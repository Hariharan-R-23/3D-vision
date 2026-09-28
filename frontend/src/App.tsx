import React, { useState, useEffect, useCallback } from 'react';
import { api, SceneInfo, PlacementItem } from './services/api';
import { SceneViewer } from './components/SceneViewer';
import { SceneControls } from './components/SceneControls';
import { ObjectControls } from './components/ObjectControls';
import { DepthPanel } from './components/DepthPanel';
import { StatusPanel } from './components/StatusPanel';
import { AlertTriangle, X } from 'lucide-react';

export const App: React.FC = () => {
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [backendVersion, setBackendVersion] = useState<string>('1.0.0');
  const [scenes, setScenes] = useState<SceneInfo[]>([]);
  const [currentScene, setCurrentScene] = useState<SceneInfo | null>(null);
  const [placements, setPlacements] = useState<PlacementItem[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [cameraPos, setCameraPos] = useState<[number, number, number]>([0, 1.2, 3.8]);
  const [globalOcclusion, setGlobalOcclusion] = useState<boolean>(true);
  const [virtualProjections, setVirtualProjections] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initial Data Fetch & Health Check
  const loadInitialData = async () => {
    try {
      const health = await api.checkHealth();
      setBackendConnected(true);
      setBackendVersion(health.version);

      const sceneList = await api.getScenes();
      setScenes(sceneList);
      if (sceneList.length > 0 && !currentScene) {
        setCurrentScene(sceneList[0]);
      }

      const storedPlacements = await api.getPlacements();
      // If empty, seed with 2 sample objects illustrating occlusion in the scene
      if (storedPlacements.length === 0) {
        const seededCube = await api.savePlacement({
          object_type: 'cube',
          name: 'Foreground_Cube',
          position: [0.0, 0.1, 0.0],
          rotation: [0, 25, 0],
          scale: [0.4, 0.4, 0.4],
          color: '#38bdf8',
          visible: true,
          occlusion_enabled: true
        });

        const seededSphere = await api.savePlacement({
          object_type: 'sphere',
          name: 'Background_Sphere',
          position: [-1.6, 0.2, -0.5], // Behind classical column at X: -1.6, Z: 0.5
          rotation: [0, 0, 0],
          scale: [0.45, 0.45, 0.45],
          color: '#f59e0b',
          visible: true,
          occlusion_enabled: true
        });

        setPlacements([seededCube, seededSphere]);
        setSelectedObjectId(seededCube.object_id);
      } else {
        setPlacements(storedPlacements);
        setSelectedObjectId(storedPlacements[0].object_id);
      }
    } catch (err: any) {
      console.error('Initialization error:', err);
      setBackendConnected(false);
      setErrorMessage(`Backend connection error: ${err.message || 'Make sure FastAPI backend is running on port 8000.'}`);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Add a new primitive object
  const handleAddObject = async (type: 'cube' | 'sphere' | 'cylinder' | 'cone') => {
    try {
      const colors = ['#38bdf8', '#10b981', '#f59e0b', '#f43f5e', '#a855f7'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      const newObj = await api.savePlacement({
        object_type: type,
        name: `${type.charAt(0).toUpperCase() + type.slice(1)}_${Math.floor(Math.random() * 900 + 100)}`,
        position: [
          parseFloat((Math.random() * 1.6 - 0.8).toFixed(2)),
          0.0,
          parseFloat((Math.random() * 1.6 - 0.8).toFixed(2))
        ],
        rotation: [0, Math.round(Math.random() * 90), 0],
        scale: [0.45, 0.45, 0.45],
        color: randomColor,
        visible: true,
        occlusion_enabled: true
      });

      setPlacements(prev => [...prev, newObj]);
      setSelectedObjectId(newObj.object_id);
    } catch (err: any) {
      setErrorMessage(`Failed to add object: ${err.message}`);
    }
  };

  // Update object transform/state
  const handleUpdateObject = async (updated: PlacementItem) => {
    // Update state immediately for zero-lag UI responsiveness
    setPlacements(prev => prev.map(p => (p.object_id === updated.object_id ? updated : p)));
    try {
      await api.savePlacement({
        object_id: updated.object_id,
        object_type: updated.object_type,
        name: updated.name,
        position: updated.position,
        rotation: updated.rotation,
        scale: updated.scale,
        color: updated.color,
        visible: updated.visible,
        occlusion_enabled: updated.occlusion_enabled
      });
    } catch (err: any) {
      console.error('Failed to sync placement with backend:', err);
    }
  };

  // Delete an object
  const handleDeleteObject = async (id: string) => {
    try {
      await api.deletePlacement(id);
      setPlacements(prev => prev.filter(p => p.object_id !== id));
      if (selectedObjectId === id) {
        setSelectedObjectId(null);
      }
    } catch (err: any) {
      setErrorMessage(`Failed to delete object: ${err.message}`);
    }
  };

  // Clear all virtual objects
  const handleResetPlacements = async () => {
    for (const p of placements) {
      try {
        await api.deletePlacement(p.object_id);
      } catch (e) {}
    }
    setPlacements([]);
    setSelectedObjectId(null);
  };

  return (
    <div className="app-container">
      {/* Header Telemetry */}
      <StatusPanel
        backendConnected={backendConnected}
        backendVersion={backendVersion}
        activeSceneName={currentScene?.name || ''}
        gaussianCount={currentScene?.gaussian_count || 0}
        objectCount={placements.length}
        cameraPosition={cameraPos}
      />

      {/* Error Banner */}
      {errorMessage && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.9)',
          color: 'white',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.82rem',
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="workspace-grid">
        {/* Left Sidebar: Scene & Camera Controls */}
        <SceneControls
          scenes={scenes}
          currentScene={currentScene}
          onSelectScene={setCurrentScene}
          onRefreshScenes={loadInitialData}
        />

        {/* Center: 3D Gaussian Splatting & Three.js Canvas */}
        <div className="viewport-center">
          <SceneViewer
            scene={currentScene}
            placements={placements}
            selectedObjectId={selectedObjectId}
            onSelectObject={setSelectedObjectId}
            onCameraUpdate={(pos) => setCameraPos(pos)}
            globalOcclusionEnabled={globalOcclusion}
            onDepthDataCaptured={(_, proj) => setVirtualProjections(proj)}
          />
        </div>

        {/* Right Sidebar: Virtual Object Controls & Placement */}
        <ObjectControls
          placements={placements}
          selectedObjectId={selectedObjectId}
          onSelectObject={setSelectedObjectId}
          onAddObject={handleAddObject}
          onUpdateObject={handleUpdateObject}
          onDeleteObject={handleDeleteObject}
          onResetPlacements={handleResetPlacements}
        />
      </div>

      {/* Bottom CV & Depth Analysis Panel */}
      <DepthPanel
        globalOcclusionEnabled={globalOcclusion}
        onToggleGlobalOcclusion={() => setGlobalOcclusion(!globalOcclusion)}
        virtualObjectProjections={virtualProjections}
      />
    </div>
  );
};
