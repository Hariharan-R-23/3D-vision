import React from 'react';
import { PlacementItem } from '../services/api';
import { formatMatrix4x4 } from '../utils/transformations';
import { Plus, Trash2, RotateCcw, Box, Disc, Cylinder, Cone, Eye, EyeOff } from 'lucide-react';

interface ObjectControlsProps {
  placements: PlacementItem[];
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
  onAddObject: (type: 'cube' | 'sphere' | 'cylinder' | 'cone') => void;
  onUpdateObject: (updated: PlacementItem) => void;
  onDeleteObject: (id: string) => void;
  onResetPlacements: () => void;
}

const COLOR_PRESETS = [
  '#38bdf8', // Sky Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#a855f7', // Purple
  '#ffffff'  // Pure White
];

export const ObjectControls: React.FC<ObjectControlsProps> = ({
  placements,
  selectedObjectId,
  onSelectObject,
  onAddObject,
  onUpdateObject,
  onDeleteObject,
  onResetPlacements
}) => {
  const selectedObject = placements.find(p => p.object_id === selectedObjectId) || null;

  const handleUpdate = (partial: Partial<PlacementItem>) => {
    if (!selectedObject) return;
    onUpdateObject({
      ...selectedObject,
      ...partial
    });
  };

  return (
    <aside className="sidebar-right">
      {/* Add Object Card */}
      <div className="glass-panel" style={{ padding: '14px' }}>
        <div className="section-header">
          <span>Place Virtual Primitive</span>
          <span className="badge badge-cyan">{placements.length} Active</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: '8px' }}>
          <button className="btn-secondary" onClick={() => onAddObject('cube')} title="Add 3D Cube">
            <Box size={14} /> Cube
          </button>
          <button className="btn-secondary" onClick={() => onAddObject('sphere')} title="Add 3D Sphere">
            <Disc size={14} /> Sphere
          </button>
          <button className="btn-secondary" onClick={() => onAddObject('cylinder')} title="Add 3D Cylinder">
            <Cylinder size={14} /> Cyl
          </button>
          <button className="btn-secondary" onClick={() => onAddObject('cone')} title="Add 3D Cone">
            <Cone size={14} /> Cone
          </button>
        </div>
      </div>

      {/* Placements List / Selector */}
      <div className="glass-panel" style={{ padding: '14px', maxHeight: '180px', overflowY: 'auto' }}>
        <div className="section-header">
          <span>Scene Virtual Objects</span>
          <button
            className="btn-danger"
            onClick={onResetPlacements}
            style={{ padding: '2px 6px', fontSize: '0.68rem' }}
            title="Clear all placed virtual objects"
          >
            Clear All
          </button>
        </div>

        {placements.length === 0 ? (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center', padding: '12px 0' }}>
            No objects placed yet. Select a primitive above to insert into the 3D scene.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {placements.map(p => {
              const isSelected = p.object_id === selectedObjectId;
              return (
                <div
                  key={p.object_id}
                  onClick={() => onSelectObject(p.object_id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.5)',
                    border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-glass)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: p.color }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 500 }}>
                      {p.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateObject({ ...p, visible: !p.visible });
                      }}
                      className="btn-secondary"
                      style={{ padding: '2px 4px', border: 'none' }}
                      title={p.visible ? "Hide" : "Show"}
                    >
                      {p.visible ? <Eye size={12} /> : <EyeOff size={12} color="gray" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteObject(p.object_id);
                      }}
                      className="btn-danger"
                      style={{ padding: '2px 4px', border: 'none' }}
                      title="Delete Object"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Object Transformation Controls */}
      {selectedObject && (
        <div className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="section-header">
            <span style={{ color: 'var(--accent-cyan)' }}>Transform: {selectedObject.name}</span>
            <span className="badge badge-cyan">{selectedObject.object_type.toUpperCase()}</span>
          </div>

          {/* Color Palette Picker */}
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Object Color</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {COLOR_PRESETS.map(c => (
                <div
                  key={c}
                  onClick={() => handleUpdate({ color: c })}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    backgroundColor: c,
                    cursor: 'pointer',
                    border: selectedObject.color === c ? '2px solid white' : '1px solid rgba(0,0,0,0.5)',
                    boxShadow: selectedObject.color === c ? '0 0 8px rgba(255,255,255,0.5)' : 'none'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Position Sliders (X, Y, Z) */}
          <div className="section-header" style={{ marginTop: '4px' }}>3D Position (Meters)</div>
          {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
            <div key={axis} className="slider-group">
              <div className="slider-label-row">
                <span>Pos {axis}</span>
                <span className="slider-value">{selectedObject.position[idx].toFixed(2)}m</span>
              </div>
              <input
                type="range"
                min="-3.0"
                max="3.0"
                step="0.05"
                value={selectedObject.position[idx]}
                onChange={e => {
                  const newPos = [...selectedObject.position] as [number, number, number];
                  newPos[idx] = parseFloat(e.target.value);
                  handleUpdate({ position: newPos });
                }}
              />
            </div>
          ))}

          {/* Rotation Sliders (Pitch, Yaw, Roll) */}
          <div className="section-header" style={{ marginTop: '4px' }}>3D Rotation (Degrees)</div>
          {(['Pitch (X)', 'Yaw (Y)', 'Roll (Z)'] as const).map((axisName, idx) => (
            <div key={axisName} className="slider-group">
              <div className="slider-label-row">
                <span>{axisName}</span>
                <span className="slider-value">{Math.round(selectedObject.rotation[idx])}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="5"
                value={selectedObject.rotation[idx]}
                onChange={e => {
                  const newRot = [...selectedObject.rotation] as [number, number, number];
                  newRot[idx] = parseFloat(e.target.value);
                  handleUpdate({ rotation: newRot });
                }}
              />
            </div>
          ))}

          {/* Scale Sliders */}
          <div className="section-header" style={{ marginTop: '4px' }}>3D Scale Factor</div>
          <div className="slider-group">
            <div className="slider-label-row">
              <span>Uniform Scale</span>
              <span className="slider-value">{selectedObject.scale[0].toFixed(2)}×</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.05"
              value={selectedObject.scale[0]}
              onChange={e => {
                const s = parseFloat(e.target.value);
                handleUpdate({ scale: [s, s, s] });
              }}
            />
          </div>

          {/* Depth-Aware Occlusion Toggle for Object */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: 500 }}>
              Depth Occlusion
            </span>
            <button
              onClick={() => handleUpdate({ occlusion_enabled: !selectedObject.occlusion_enabled })}
              className={selectedObject.occlusion_enabled ? "badge badge-emerald" : "badge badge-amber"}
              style={{ cursor: 'pointer', border: 'none' }}
            >
              {selectedObject.occlusion_enabled ? 'Occlusion ON' : 'Occlusion OFF'}
            </button>
          </div>

          {/* 4x4 Affine Transformation Matrix Readout */}
          {selectedObject.transformation_matrix && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase' }}>
                4×4 Affine Transformation Matrix (T = T_trans × R_euler × S_scale)
              </div>
              <pre style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.62rem',
                color: 'var(--accent-cyan)',
                background: '#07090e',
                padding: '6px',
                borderRadius: '4px',
                border: '1px solid var(--border-glass)',
                overflowX: 'auto'
              }}>
                {formatMatrix4x4(selectedObject.transformation_matrix)}
              </pre>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
