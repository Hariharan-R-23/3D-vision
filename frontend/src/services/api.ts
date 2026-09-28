export interface CameraInfo {
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
  fov: number;
}

export interface SceneBoundingBox {
  min: [number, number, number];
  max: [number, number, number];
  center: [number, number, number];
  extents: [number, number, number];
}

export interface SceneInfo {
  id: string;
  name: string;
  filename: string;
  format: string;
  file_size_bytes: number;
  gaussian_count: number;
  bounds: SceneBoundingBox;
  camera: CameraInfo;
  depth_available: boolean;
  description: string;
  is_synthetic: boolean;
}

export interface PlacementItem {
  object_id: string;
  object_type: 'cube' | 'sphere' | 'cylinder' | 'cone';
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  visible: boolean;
  occlusion_enabled: boolean;
  timestamp: number;
  transformation_matrix: number[][];
  world_bounds: {
    min: [number, number, number];
    max: [number, number, number];
    center: [number, number, number];
  };
}

export interface DepthProcessResponse {
  min_depth: number;
  max_depth: number;
  mean_depth: number;
  std_depth: number;
  width: number;
  height: number;
  normalized_depth_base64: string;
  colormap_base64: string;
  occlusion_mask_base64?: string;
  depth_histogram: number[];
  status: string;
}

export interface SceneAnalyzeResponse {
  scene_id: string;
  scene_name: string;
  format: string;
  file_size_bytes: number;
  gaussian_count: number;
  bounding_box: SceneBoundingBox;
  center_of_mass: [number, number, number];
  spatial_extents: [number, number, number];
  estimated_depth_range: [number, number];
  density_gaussian_per_unit_cube: number;
  analysis_timestamp: number;
  metadata: Record<string, any>;
}

const API_BASE = 'http://127.0.0.1:8000/api';

export const api = {
  async checkHealth(): Promise<{ status: string; version: string; modules: string[] }> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  },

  async getScenes(): Promise<SceneInfo[]> {
    const res = await fetch(`${API_BASE}/scenes`);
    if (!res.ok) throw new Error(`Failed to fetch scenes: ${res.statusText}`);
    const data = await res.json();
    return data.scenes;
  },

  async getScene(sceneId: string): Promise<SceneInfo> {
    const res = await fetch(`${API_BASE}/scenes/${sceneId}`);
    if (!res.ok) throw new Error(`Failed to fetch scene ${sceneId}: ${res.statusText}`);
    return res.json();
  },

  async analyzeScene(sceneId: string): Promise<SceneAnalyzeResponse> {
    const res = await fetch(`${API_BASE}/scene/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scene_id: sceneId, calculate_density: true })
    });
    if (!res.ok) throw new Error(`Scene analysis failed: ${res.statusText}`);
    return res.json();
  },

  async processDepth(options: {
    depth_map_base64?: string;
    image_base64?: string;
    near_plane?: number;
    far_plane?: number;
    colormap?: string;
    virtual_object_depths?: Array<{ screen_x: number; screen_y: number; depth: number; screen_radius: number }>;
  }): Promise<DepthProcessResponse> {
    const res = await fetch(`${API_BASE}/depth/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        colormap: 'TURBO',
        near_plane: 0.1,
        far_plane: 15.0,
        ...options
      })
    });
    if (!res.ok) throw new Error(`Depth processing failed: ${res.statusText}`);
    return res.json();
  },

  async getPlacements(): Promise<PlacementItem[]> {
    const res = await fetch(`${API_BASE}/placements`);
    if (!res.ok) throw new Error(`Failed to fetch placements: ${res.statusText}`);
    return res.json();
  },

  async savePlacement(placement: {
    object_id?: string;
    object_type: string;
    name?: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    color: string;
    visible: boolean;
    occlusion_enabled: boolean;
  }): Promise<PlacementItem> {
    const res = await fetch(`${API_BASE}/placement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(placement)
    });
    if (!res.ok) throw new Error(`Failed to save placement: ${res.statusText}`);
    return res.json();
  },

  async deletePlacement(objectId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/placements/${objectId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`Failed to delete placement: ${res.statusText}`);
  }
};
