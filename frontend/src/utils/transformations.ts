import * as THREE from 'three';

export interface ScreenProjection {
  screenX: number;
  screenY: number;
  depth: number;
  screenRadius: number;
  inFrustum: boolean;
}

/**
 * Projects a 3D world position into 2D canvas pixel coordinates and camera depth.
 */
export function projectWorldToScreen(
  worldPos: [number, number, number],
  scale: [number, number, number],
  camera: THREE.Camera,
  canvasWidth: number,
  canvasHeight: number
): ScreenProjection {
  const v = new THREE.Vector3(worldPos[0], worldPos[1], worldPos[2]);
  
  // Calculate distance from camera in view direction (metric camera space Z)
  const cameraSpacePos = v.clone().applyMatrix4(camera.matrixWorldInverse);
  const depth = -cameraSpacePos.z; // In Three.js camera looks down -Z

  // Project to Normalized Device Coordinates [-1, 1]
  v.project(camera);

  const inFrustum = v.x >= -1.2 && v.x <= 1.2 && v.y >= -1.2 && v.y <= 1.2 && v.z >= -1.0 && v.z <= 1.0;

  const screenX = ((v.x + 1) * canvasWidth) / 2;
  const screenY = ((-v.y + 1) * canvasHeight) / 2;

  // Approximate screen radius based on average scale and depth
  const avgScale = (scale[0] + scale[1] + scale[2]) / 3.0;
  const fov = (camera as THREE.PerspectiveCamera).fov || 50;
  const focalLengthPx = (canvasHeight / 2) / Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const screenRadius = Math.max(8, (avgScale * focalLengthPx) / Math.max(depth, 0.2));

  return {
    screenX,
    screenY,
    depth: Math.max(depth, 0.01),
    screenRadius,
    inFrustum
  };
}

/**
 * Formats a 4x4 matrix for UI display.
 */
export function formatMatrix4x4(matrix: number[][]): string {
  return matrix
    .map(row => row.map(v => v.toFixed(2).padStart(6, ' ')).join('  '))
    .join('\n');
}

/**
 * Computes axis-aligned bounding box min, max, center from position and scale.
 */
export function calculateAABB(pos: [number, number, number], scale: [number, number, number]) {
  const [x, y, z] = pos;
  const [sx, sy, sz] = scale;
  return {
    min: [x - sx / 2, y - sy / 2, z - sz / 2],
    max: [x + sx / 2, y + sy / 2, z + sz / 2],
    center: [x, y, z]
  };
}
