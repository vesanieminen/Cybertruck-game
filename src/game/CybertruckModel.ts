import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { TRUCK_LENGTH } from './constants';

/**
 * Tries to load a 3D model from /models/ in this order:
 *   1. tesla-cybertruck.glb  (GLTF binary)
 *   2. tesla-cybertruck.fbx  (FBX)
 *   3. Procedural fallback
 */
export class CybertruckModel {
  public group: THREE.Group;
  private wheels: THREE.Object3D[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.loadModel();
  }

  private async loadModel() {
    let model: THREE.Object3D | null = null;

    model = await this.tryLoadGLB('/models/tesla-cybertruck.glb');
    if (!model) model = await this.tryLoadFBX('/models/tesla-cybertruck.fbx');

    if (model) {
      this.integrateModel(model);
    } else {
      console.log('No external model found, using procedural Cybertruck');
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

  private async tryLoadFBX(url: string): Promise<THREE.Object3D | null> {
    try {
      const loader = new FBXLoader();
      const dir = url.substring(0, url.lastIndexOf('/') + 1);
      loader.setResourcePath(dir + 'textures/');
      const fbx = await loader.loadAsync(url);
      return fbx;
    } catch {
      return null;
    }
  }

  private integrateModel(model: THREE.Object3D) {
    // Remove LOD1 duplicate, crack mesh, and hide tires (replaced by physics-synced wheels)
    const toRemove: THREE.Object3D[] = [];
    model.traverse((child) => {
      const nameLower = child.name.toLowerCase();
      if (nameLower.includes('lod1') || nameLower === 'crack') {
        toRemove.push(child);
      }
      if (nameLower === 'tires') {
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

    // Scale so longest horizontal axis = TRUCK_LENGTH
    const bbox = new THREE.Box3().setFromObject(model);
    const size = bbox.getSize(new THREE.Vector3());
    const longest = Math.max(size.x, size.z);
    const s = TRUCK_LENGTH / longest;
    model.scale.multiplyScalar(s);

    // Wrap in pivot, orient so truck faces +Z (cannon-es forward convention)
    const pivot = new THREE.Group();
    pivot.add(model);

    bbox.setFromObject(model);
    const scaledSize = bbox.getSize(new THREE.Vector3());
    if (scaledSize.x > scaledSize.z) {
      // X is longest — rotate so X becomes Z
      pivot.rotation.y = Math.PI / 2;
    }
    // No additional PI flip — model naturally faces +Z after FBX loading

    // Center XZ at origin, place bottom at y=0
    const finalBbox = new THREE.Box3().setFromObject(pivot);
    const finalCenter = finalBbox.getCenter(new THREE.Vector3());
    pivot.position.x = -finalCenter.x;
    pivot.position.y = -finalBbox.min.y;
    pivot.position.z = -finalCenter.z;

    this.group.add(pivot);
  }

  private buildFallback() {
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xc0ccd4,
      metalness: 0.7,
      roughness: 0.25,
    });

    const profile = new THREE.Shape();
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
    fLight.position.set(2.88, 0.78, 0);
    this.group.add(fLight);

    // Rear light bar
    const rLightMat = new THREE.MeshStandardMaterial({
      color: 0xff2222,
      emissive: 0xff2222,
      emissiveIntensity: 1.5,
    });
    const rLight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 2.1), rLightMat);
    rLight.position.set(-2.88, 1.27, 0);
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
