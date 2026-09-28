import React, { useState } from 'react';
import { SceneInfo, SceneAnalyzeResponse, api } from '../services/api';
import { Box, Sparkles, Compass, Activity, Database, Info, RefreshCw } from 'lucide-react';

interface SceneControlsProps {
  scenes: SceneInfo[];
  currentScene: SceneInfo | null;
  onSelectScene: (scene: SceneInfo) => void;
  onRefreshScenes: () => void;
}

export const SceneControls: React.FC<SceneControlsProps> = ({
  scenes,
  currentScene,
  onSelectScene,
  onRefreshScenes
}) => {
  const [analysis, setAnalysis] = useState<SceneAnalyzeResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [showDocModal, setShowDocModal] = useState<boolean>(false);

  const handleAnalyze = async () => {
    if (!currentScene) return;
    setIsAnalyzing(true);
    try {
      const res = await api.analyzeScene(currentScene.id);
      setAnalysis(res);
    } catch (err) {
      console.error('Failed to analyze scene:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <aside className="sidebar-left">
      {/* Scene Selection Header */}
      <div className="glass-panel" style={{ padding: '14px' }}>
        <div className="section-header">
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Database size={14} /> Scene Repository
          </span>
          <button
            onClick={onRefreshScenes}
            className="btn-secondary"
            style={{ padding: '2px 6px', fontSize: '0.7rem' }}
            title="Refresh scene list"
          >
            <RefreshCw size={12} />
          </button>
        </div>

        <select
          value={currentScene?.id || ''}
          onChange={e => {
            const found = scenes.find(s => s.id === e.target.value);
            if (found) {
              onSelectScene(found);
              setAnalysis(null);
            }
          }}
          style={{
            width: '100%',
            background: '#0b0f19',
            color: '#f8fafc',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 10px',
            fontSize: '0.82rem',
            fontFamily: 'var(--font-sans)',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          {scenes.map(s => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.format.toUpperCase()})
            </option>
          ))}
        </select>
      </div>

      {/* Active Scene Metadata Card */}
      {currentScene && (
        <div className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="section-header">
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Box size={14} /> Scene Geometry
            </span>
            <span className="badge badge-cyan">{currentScene.format.toUpperCase()}</span>
          </div>

          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            {currentScene.description}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="metric-card">
              <span className="metric-card-title">Gaussian Splats</span>
              <span className="metric-card-val" style={{ color: 'var(--accent-cyan)' }}>
                {currentScene.gaussian_count.toLocaleString()}
              </span>
            </div>
            <div className="metric-card">
              <span className="metric-card-title">File Size</span>
              <span className="metric-card-val">
                {(currentScene.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
          </div>

          <div className="metric-card">
            <span className="metric-card-title">Bounding Box (X, Y, Z)</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-main)' }}>
              [{currentScene.bounds.min.map(v => v.toFixed(1)).join(', ')}] → [{currentScene.bounds.max.map(v => v.toFixed(1)).join(', ')}]
            </span>
          </div>

          <div className="metric-card">
            <span className="metric-card-title">Spatial Extents (W × H × D)</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-main)' }}>
              {currentScene.bounds.extents.map(v => v.toFixed(2) + 'm').join(' × ')}
            </span>
          </div>

          <button
            className="btn-primary"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            style={{ width: '100%', marginTop: '4px' }}
          >
            <Activity size={14} />
            {isAnalyzing ? 'Analyzing 3D Structure...' : 'Run Scene CV Analysis'}
          </button>
        </div>
      )}

      {/* CV Analysis Output */}
      {analysis && (
        <div className="glass-panel glass-panel-glow" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="section-header">
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-emerald)' }}>
              <Sparkles size={14} /> Analysis Results
            </span>
            <span className="badge badge-emerald">Verified</span>
          </div>

          <div className="metric-card">
            <span className="metric-card-title">Gaussian Splat Density</span>
            <span className="metric-card-val" style={{ color: 'var(--accent-emerald)' }}>
              {analysis.density_gaussian_per_unit_cube.toLocaleString()} splats / m³
            </span>
          </div>

          <div className="metric-card">
            <span className="metric-card-title">Center of Mass</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
              [{analysis.center_of_mass.map(v => v.toFixed(2)).join(', ')}]
            </span>
          </div>

          <div className="metric-card">
            <span className="metric-card-title">Estimated Camera Depth Range</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
              {analysis.estimated_depth_range[0]}m to {analysis.estimated_depth_range[1]}m
            </span>
          </div>
        </div>
      )}

      {/* Coordinate Transformations Info */}
      <div className="glass-panel" style={{ padding: '14px', marginTop: 'auto' }}>
        <div className="section-header">
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Compass size={14} /> Coordinate Systems
          </span>
          <button
            onClick={() => setShowDocModal(!showDocModal)}
            className="btn-secondary"
            style={{ padding: '2px 6px', fontSize: '0.7rem' }}
          >
            <Info size={12} /> Specs
          </button>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: '1.4' }}>
          • <strong>World:</strong> Right-Handed (X: Right, Y: Up, Z: Out)<br />
          • <strong>Camera:</strong> Metric optical view matrix (Z: Inverted)<br />
          • <strong>Virtual Objects:</strong> 4×4 affine affine composite
        </div>
      </div>
    </aside>
  );
};
