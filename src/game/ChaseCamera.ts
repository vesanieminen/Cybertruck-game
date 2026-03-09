import * as THREE from 'three';
import {
  CAMERA_LERP_POSITION,
  CAMERA_LERP_LOOKAT,
} from './constants';

export const CameraMode = {
  NORMAL: 0,
  CLOSE: 1,
  COCKPIT: 2,
} as const;

export type CameraMode = (typeof CameraMode)[keyof typeof CameraMode];

interface CameraPreset {
  distance: number;
  height: number;
  lookAhead: number;
  fov: number;
}

const PRESETS: Record<CameraMode, CameraPreset> = {
  [CameraMode.NORMAL]: { distance: 12, height: 5, lookAhead: 8, fov: 65 },
  [CameraMode.CLOSE]: { distance: 6, height: 2.5, lookAhead: 6, fov: 70 },
  [CameraMode.COCKPIT]: { distance: -0.5, height: 1.6, lookAhead: 10, fov: 80 },
};

export class ChaseCamera {
  public camera: THREE.PerspectiveCamera;
  private currentLookAt = new THREE.Vector3();
  private mode: CameraMode = CameraMode.CLOSE;

  constructor(aspect: number) {
    const p = PRESETS[CameraMode.CLOSE];
    this.camera = new THREE.PerspectiveCamera(p.fov, aspect, 0.1, 2000);
    this.camera.position.set(0, p.height + 5, -p.distance);
    this.currentLookAt.set(0, 0, 0);
  }

  cycleMode(): CameraMode {
    this.mode = ((this.mode + 1) % 3) as CameraMode;
    const p = PRESETS[this.mode];
    this.camera.fov = p.fov;
    this.camera.updateProjectionMatrix();
    return this.mode;
  }

  update(
    delta: number,
    targetPosition: THREE.Vector3,
    targetQuaternion: THREE.Quaternion
  ) {
    const p = PRESETS[this.mode];

    // Truck faces +Z. "Behind" = -Z in truck local space.
    const backward = new THREE.Vector3(0, 0, -1);
    backward.applyQuaternion(targetQuaternion);
    backward.y = 0;
    backward.normalize();

    // Forward direction (flattened to XZ)
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(targetQuaternion);
    forward.y = 0;
    forward.normalize();

    // Ideal camera position: behind and above (or inside for cockpit)
    const idealPosition = new THREE.Vector3()
      .copy(targetPosition)
      .addScaledVector(backward, p.distance)
      .add(new THREE.Vector3(0, p.height, 0));

    // Faster lerp for cockpit so it doesn't lag behind
    const lerpSpeed = this.mode === CameraMode.COCKPIT
      ? CAMERA_LERP_POSITION * 4
      : CAMERA_LERP_POSITION;
    const posLerp = 1 - Math.exp(-lerpSpeed * delta);
    this.camera.position.lerp(idealPosition, posLerp);

    // Look-at target: ahead of the truck
    const idealLookAt = new THREE.Vector3()
      .copy(targetPosition)
      .addScaledVector(forward, p.lookAhead);

    const lookLerp = 1 - Math.exp(-CAMERA_LERP_LOOKAT * delta);
    this.currentLookAt.lerp(idealLookAt, lookLerp);
    this.camera.lookAt(this.currentLookAt);
  }

  handleResize(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
