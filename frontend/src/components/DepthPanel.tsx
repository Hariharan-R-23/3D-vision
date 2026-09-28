import React, { useState, useEffect } from 'react';
import { DepthProcessResponse, api } from '../services/api';
import { BarChart3, Image as ImageIcon, Sliders, ShieldCheck, ShieldAlert, Cpu } from 'lucide-react';

interface DepthPanelProps {
  globalOcclusionEnabled: boolean;
  onToggleGlobalOcclusion: () => void;
  virtualObjectProjections: any[];
}

export const DepthPanel: React.FC<DepthPanelProps> = ({
  globalOcclusionEnabled,
  onToggleGlobalOcclusion,
  virtualObjectProjections
}) => {
  const [colormap, setColormap] = useState<string>('TURBO');
  const [depthData, setDepthData] = useState<DepthProcessResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'colormap' | 'normalized' | 'occlusion_mask'>('colormap');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fetchDepthProcessing = async () => {
    setIsProcessing(true);
    try {
      const res = await api.processDepth({
        colormap,
        near_plane: 0.2,
        far_plane: 10.0,
        virtual_object_depths: virtualObjectProjections
      });
      setDepthData(res);
    } catch (err) {
      console.error('Failed to process depth map:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    fetchDepthProcessing();
  }, [colormap, virtualObjectProjections.length]);

  return (
    <div className="cv-bottom-drawer">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="section-header" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Cpu size={14} /> Computer Vision & Depth-Aware Occlusion Engine
          </span>
          <span className="badge badge-cyan">FastAPI + OpenCV Pipeline</span>
        </div>

        {/* Global Occlusion Master Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Scene Depth Compositing:
          </span>
          <button
            className={globalOcclusionEnabled ? 'btn-primary' : 'btn-secondary'}
            onClick={onToggleGlobalOcclusion}
            style={{ padding: '4px 10px', fontSize: '0.76rem' }}
          >
            {globalOcclusionEnabled ? (
              <>
                <ShieldCheck size={14} color="#10b981" /> Occlusion ACTIVE (Depth-Aware)
              </>
            ) : (
              <>
                <ShieldAlert size={14} color="#f43f5e" /> Occlusion BYPASSED (Naive Overlay)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Depth Visualizer | Occlusion Mask | Statistics | Histogram */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 160px 1fr 180px', gap: 14, flex: 1, overflow: 'hidden' }}>
        {/* Visual Map Viewer */}
        <div className="glass-panel" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              {activeTab === 'colormap' ? `Pseudo-Color (${colormap})` : activeTab === 'normalized' ? 'Inverse Depth (1/d)' : 'Occlusion Mask (RGB)'}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => setActiveTab('colormap')}
                className="btn-secondary"
                style={{ padding: '1px 5px', fontSize: '0.65rem', background: activeTab === 'colormap' ? 'rgba(56, 189, 248, 0.2)' : undefined }}
              >
                Color
              </button>
              <button
                onClick={() => setActiveTab('normalized')}
                className="btn-secondary"
                style={{ padding: '1px 5px', fontSize: '0.65rem', background: activeTab === 'normalized' ? 'rgba(56, 189, 248, 0.2)' : undefined }}
              >
                Norm
              </button>
              <button
                onClick={() => setActiveTab('occlusion_mask')}
                className="btn-secondary"
                style={{ padding: '1px 5px', fontSize: '0.65rem', background: activeTab === 'occlusion_mask' ? 'rgba(56, 189, 248, 0.2)' : undefined }}
              >
                Mask
              </button>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07090e', borderRadius: 4, overflow: 'hidden' }}>
            {depthData ? (
              <img
                src={
                  activeTab === 'colormap'
                    ? depthData.colormap_base64
                    : activeTab === 'normalized'
                    ? depthData.normalized_depth_base64
                    : (depthData.occlusion_mask_base64 || depthData.colormap_base64)
                }
                alt="Depth Visualization"
                style={{ height: '100%', width: '100%', objectFit: 'contain' }}
              />
            ) : (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Computing Depth Map...</span>
            )}
          </div>
        </div>

        {/* Colormap Selector Controls */}
        <div className="glass-panel" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Colormap Palettes
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {['TURBO', 'VIRIDIS', 'MAGMA', 'INFERNO', 'JET', 'PLASMA'].map(cm => (
              <button
                key={cm}
                onClick={() => setColormap(cm)}
                className="btn-secondary"
                style={{
                  padding: '4px 6px',
                  fontSize: '0.68rem',
                  borderColor: colormap === cm ? 'var(--accent-cyan)' : 'var(--border-glass)',
                  color: colormap === cm ? 'var(--accent-cyan)' : undefined
                }}
              >
                {cm}
              </button>
            ))}
          </div>
          <button
            onClick={fetchDepthProcessing}
            className="btn-primary"
            style={{ marginTop: 'auto', padding: '4px 8px', fontSize: '0.72rem' }}
          >
            Recompute
          </button>
        </div>

        {/* Statistical Metrics */}
        <div className="glass-panel" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Photometric Depth Distribution & Metrics
          </span>
          {depthData ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, flex: 1 }}>
              <div className="metric-card">
                <span className="metric-card-title">Min Distance (Z_near)</span>
                <span className="metric-card-val" style={{ color: 'var(--accent-cyan)' }}>{depthData.min_depth} m</span>
              </div>
              <div className="metric-card">
                <span className="metric-card-title">Max Distance (Z_far)</span>
                <span className="metric-card-val">{depthData.max_depth} m</span>
              </div>
              <div className="metric-card">
                <span className="metric-card-title">Mean Scene Depth</span>
                <span className="metric-card-val" style={{ color: 'var(--accent-emerald)' }}>{depthData.mean_depth} m</span>
              </div>
              <div className="metric-card">
                <span className="metric-card-title">Standard Dev (σ)</span>
                <span className="metric-card-val">{depthData.std_depth} m</span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Loading statistics...</div>
          )}

          {/* Occlusion explanation callout */}
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
            💡 <strong>Occlusion Logic:</strong> Pixels where <code style={{ color: 'var(--accent-cyan)' }}>D_scene(u,v) &lt; D_virtual(u,v)</code> are marked as occluded, suppressing virtual pixels behind reconstructed Gaussian structures.
          </div>
        </div>

        {/* Depth Histogram Chart */}
        <div className="glass-panel" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Depth Histogram (20 Bins)
          </span>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 2, background: '#07090e', padding: '4px', borderRadius: 4 }}>
            {depthData && depthData.depth_histogram.map((val, idx) => {
              const maxVal = Math.max(...depthData.depth_histogram, 1);
              const heightPct = Math.round((val / maxVal) * 100);
              return (
                <div
                  key={idx}
                  title={`Bin ${idx + 1}: ${val} pixels`}
                  style={{
                    flex: 1,
                    height: `${Math.max(heightPct, 4)}%`,
                    background: 'linear-gradient(180deg, var(--accent-cyan), var(--accent-indigo))',
                    borderRadius: '1px 1px 0 0'
                  }}
                />
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            <span>Near ({depthData?.min_depth || 0}m)</span>
            <span>Far ({depthData?.max_depth || 10}m)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
