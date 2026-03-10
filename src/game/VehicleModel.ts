import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { TRUCK_LENGTH } from './constants';

export type CarType = 'cybertruck' | 'model-s';

export interface CarConfig {
  label: string;
  /** Model files to try, in order (relative to BASE_URL + 'models/') */
  modelFiles: { path: string; texturesDir?: string }[];
  /** Target length for scaling */
  targetLength: number;
  /** How much to bring wheels inward from the default position (0 = no change) */
  wheelXInset: number;
}

const CAR_CONFIGS: Record<CarType, CarConfig> = {
  cybertruck: {
    label: 'CYBERTRUCK',
    modelFiles: [
      { path: 'tesla-cybertruck.glb' },
      { path: 'tesla-cybertruck.fbx', texturesDir: 'textures/' },
    ],
    targetLength: TRUCK_LENGTH,
    wheelXInset: 0,
  },
  'model-s': {
    label: 'MODEL S',
    modelFiles: [
      { path: 'model-s.glb' },
      { path: 'model-s.fbx', texturesDir: 'model-s-textures/' },
    ],
    targetLength: TRUCK_LENGTH * 0.95, // Model S is slightly shorter
    wheelXInset: 0.22,
  },
};

export const CAR_TYPES: CarType[] = ['cybertruck', 'model-s'];

export function getCarLabel(car: CarType): string {
  return CAR_CONFIGS[car].label;
}

export function getCarWheelXInset(car: CarType): number {
  return CAR_CONFIGS[car].wheelXInset;
}

/**
 * Loads and integrates a 3D car model.
 * Supports Cybertruck and Model S, with procedural fallback for Cybertruck.
 */
export class VehicleModel {
  public group: THREE.Group;
  private wheels: THREE.Object3D[] = [];
  private carType: CarType;

  constructor(carType: CarType = 'cybertruck') {
    this.group = new THREE.Group();
    this.carType = carType;
    this.loadModel();
  }

  private async loadModel() {
    const config = CAR_CONFIGS[this.carType];
    const base = import.meta.env.BASE_URL;
    let model: THREE.Object3D | null = null;

    for (const file of config.modelFiles) {
      const url = `${base}models/${file.path}`;
      if (file.path.endsWith('.glb') || file.path.endsWith('.gltf')) {
        model = await this.tryLoadGLB(url);
      } else if (file.path.endsWith('.fbx')) {
        const texDir = file.texturesDir
          ? `${base}models/${file.texturesDir}`
          : undefined;
        model = await this.tryLoadFBX(url, texDir);
      }
      if (model) break;
    }

    if (model) {
      this.integrateModel(model, config.targetLength);
    } else {
      console.log(`No external model found for ${this.carType}, using procedural fallback`);
      this.buildFallback();
    }
  }

  private async tryLoadGLB(url: string): Promise<THREE.Object3D | null> {
    try {
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(url);
      return gltf.scene;
    } catch {
      return null;
    }
  }

  private async tryLoadFBX(url: string, texturesDir?: string): Promise<THREE.Object3D | null> {
    try {
      const loader = new FBXLoader();
      if (texturesDir) {
        loader.setResourcePath(texturesDir);
      } else {
        const dir = url.substring(0, url.lastIndexOf('/') + 1);
        loader.setResourcePath(dir + 'textures/');
      }
      const fbx = await loader.loadAsync(url);
      return fbx;
    } catch {
      return null;
    }
  }

  private integrateModel(model: THREE.Object3D, targetLength: number) {
    // Remove LOD1 duplicate, crack mesh, and hide tires (replaced by physics-synced wheels)
    const toRemove: THREE.Object3D[] = [];
    model.traverse((child) => {
      const nameLower = child.name.toLowerCase();
      if (nameLower.includes('lod1') || nameLower === 'crack') {
        toRemove.push(child);
      }
      if (nameLower === 'tires' || nameLower.includes('wheel') || nameLower.includes('tire')) {
        child.visible = false;
      }
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of mats) {
          mat.transparent = false;
          mat.opacity = 1.0;
          mat.depthWrite = true;
          mat.side = THREE.DoubleSide;
          mat.needsUpdate = true;
        }
      }
    });
    for (const obj of toRemove) {
      obj.parent?.remove(obj);
    }

    // Scale so longest horizontal axis = targetLength
    const bbox = new THREE.Box3().setFromObject(model);
    const size = bbox.getSize(new THREE.Vector3());
    const longest = Math.max(size.x, size.z);
    const s = targetLength / longest;
    model.scale.multiplyScalar(s);

    // Wrap in pivot, orient so car faces +Z (cannon-es forward convention)
    const pivot = new THREE.Group();
    pivot.add(model);

    bbox.setFromObject(model);
    const scaledSize = bbox.getSize(new THREE.Vector3());
    if (scaledSize.x > scaledSize.z) {
      pivot.rotation.y = Math.PI / 2;
    }

    // Center XZ at origin, place bottom at y=0
    const finalBbox = new THREE.Box3().setFromObject(pivot);
    const finalCenter = finalBbox.getCenter(new THREE.Vector3());
    pivot.position.x = -finalCenter.x;
    pivot.position.y = -finalBbox.min.y;
    pivot.position.z = -finalCenter.z;

    this.group.add(pivot);
  }

  private buildFallback() {
    // Procedural Cybertruck fallback (works for any car type as a generic shape)
    const steelMat = new THREE.MeshStandardMaterial({
      color: this.carType === 'model-s' ? 0x880000 : 0xc0ccd4,
      metalness: 0.7,
      roughness: 0.25,
    });

    const profile = new THREE.Shape();
    if (this.carType === 'model-s') {
      // Rounder sedan profile
      profile.moveTo(-2.7, 0.4);
      profile.lineTo(2.7, 0.4);
      profile.lineTo(2.7, 0.65);
      profile.lineTo(2.2, 0.9);
      profile.lineTo(1.2, 1.5);
      profile.lineTo(0.3, 1.7);
      profile.lineTo(-0.5, 1.7);
      profile.lineTo(-1.2, 1.5);
      profile.lineTo(-2.0, 1.2);
      profile.lineTo(-2.7, 0.85);
      profile.lineTo(-2.7, 0.4);
    } else {
      // Angular Cybertruck profile
      profile.moveTo(-2.9, 0.5);
      profile.lineTo(2.9, 0.5);
      profile.lineTo(2.9, 0.75);
      profile.lineTo(2.0, 0.85);
      profile.lineTo(1.5, 0.95);
      profile.lineTo(0.3, 1.95);
      profile.lineTo(-0.4, 1.95);
      profile.lineTo(-1.0, 1.85);
      profile.lineTo(-1.3, 1.65);
      profile.lineTo(-2.5, 1.3);
      profile.lineTo(-2.9, 1.25);
      profile.lineTo(-2.9, 0.5);
    }

    const bodyGeo = new THREE.ExtrudeGeometry(profile, {
      depth: 2.1,
      bevelEnabled: false,
    });
    bodyGeo.translate(0, 0, -1.05);
    const body = new THREE.Mesh(bodyGeo, steelMat);
    body.castShadow = true;
    this.group.add(body);

    // Front light bar
    const fLightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 2,
    });
    const fLight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 2.1), fLightMat);
    fLight.position.set(2.7, 0.7, 0);
    this.group.add(fLight);

    // Rear light bar
    const rLightMat = new THREE.MeshStandardMaterial({
      color: 0xff2222,
      emissive: 0xff2222,
      emissiveIntensity: 1.5,
    });
    const rLight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 2.1), rLightMat);
    rLight.position.set(-2.7, 0.9, 0);
    this.group.add(rLight);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.28, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.3, roughness: 0.9 });
    const positions = [
      { x: 1.8, z: 1.12 },
      { x: 1.8, z: -1.12 },
      { x: -1.8, z: 1.12 },
      { x: -1.8, z: -1.12 },
    ];
    for (const pos of positions) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.x = Math.PI / 2;
      w.position.set(pos.x, 0.42, pos.z);
      w.castShadow = true;
      this.group.add(w);
      this.wheels.push(w);
    }
  }

  updateWheels(delta: number, speed: number) {
    const angularVelocity = speed / 0.42;
    for (const wheel of this.wheels) {
      wheel.rotation.x += angularVelocity * delta;
    }
  }
}
