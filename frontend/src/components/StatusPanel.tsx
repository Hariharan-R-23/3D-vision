import React from 'react';
import { Activity, CheckCircle2, XCircle, Globe, Layers, Box } from 'lucide-react';

interface StatusPanelProps {
  backendConnected: boolean;
  backendVersion: string;
  activeSceneName: string;
  gaussianCount: number;
  objectCount: number;
  cameraPosition: [number, number, number];
}

export const StatusPanel: React.FC<StatusPanelProps> = ({
  backendConnected,
  backendVersion,
  activeSceneName,
  gaussianCount,
  objectCount,
  cameraPosition
}) => {
  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div>
          <div className="brand-title">
            <Globe size={18} color="#38bdf8" /> GAUSSIAN REALITY
          </div>
          <div className="brand-subtitle">
            3D Gaussian Splatting | AR Scene Reconstruction | Depth Occlusion
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Active Scene Indicator */}
        <div className="glass-panel" style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Layers size={13} color="var(--accent-cyan)" />
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            Scene: <strong style={{ color: 'white' }}>{activeSceneName || 'Loading...'}</strong>
          </span>
          <span className="badge badge-cyan" style={{ padding: '1px 5px', fontSize: '0.62rem' }}>
            {gaussianCount.toLocaleString()} splats
          </span>
        </div>

        {/* Virtual Objects Count */}
        <div className="glass-panel" style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Box size={13} color="var(--accent-amber)" />
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            Objects: <strong style={{ color: 'var(--accent-amber)' }}>{objectCount}</strong>
          </span>
        </div>

        {/* Camera Coordinates */}
        <div className="glass-panel" style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Cam</span>
          <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
            [{cameraPosition.map(p => p.toFixed(1)).join(', ')}]
          </span>
        </div>

        {/* Backend Connectivity Status Badge */}
        <div
          className="glass-panel"
          style={{
            padding: '4px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            borderColor: backendConnected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'
          }}
        >
          {backendConnected ? (
            <>
              <CheckCircle2 size={14} color="#10b981" />
              <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 600 }}>
                API Connected (v{backendVersion})
              </span>
            </>
          ) : (
            <>
              <XCircle size={14} color="#f43f5e" />
              <span style={{ fontSize: '0.74rem', color: '#f43f5e', fontWeight: 600 }}>
                Backend Offline
              </span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
