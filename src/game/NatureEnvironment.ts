import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { mulberry32 } from './noise';
import type { Terrain } from './Terrain';
import type { WorldConfig, TreeStyle } from './WorldConfig';

export class NatureEnvironment {
  public sunLight: THREE.DirectionalLight;

  private rng: () => number;

  constructor(scene: THREE.Scene, terrain: Terrain, world: CANNON.World, seed: number, config: WorldConfig) {
    this.rng = mulberry32(seed + 7919);
    this.sunLight = this.createLighting(scene, config);
    this.createSky(scene, config);
    if (config.treeCount > 0 && config.treeStyle !== 'none') {
      this.createTrees(scene, terrain, world, config);
    }
    if (config.rockCount > 0) {
      this.createRocks(scene, terrain, world, config);
    }
  }

  private createSky(scene: THREE.Scene, config: WorldConfig): void {
    const skyGeo = new THREE.SphereGeometry(900, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(config.colors.skyTop) },
        bottomColor: { value: new THREE.Color(config.colors.skyHorizon) },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          float t = max(0.0, h);
          gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
        }
      `,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(skyGeo, skyMat));
  }

  private createLighting(scene: THREE.Scene, config: WorldConfig): THREE.DirectionalLight {
    const sun = new THREE.DirectionalLight(config.colors.sunColor, config.sunIntensity);
    sun.position.set(100, 150, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 500;
    sun.shadow.camera.left = -80;
    sun.shadow.camera.right = 80;
    sun.shadow.camera.top = 80;
    sun.shadow.camera.bottom = -80;
    scene.add(sun);
    scene.add(sun.target);

    scene.add(new THREE.AmbientLight(config.colors.ambientColor, config.ambientIntensity));
    scene.add(new THREE.HemisphereLight(
      config.colors.hemisphereTop,
      config.colors.hemisphereBottom,
      config.hemisphereIntensity,
    ));

    return sun;
  }

  private createTrees(scene: THREE.Scene, terrain: Terrain, world: CANNON.World, config: WorldConfig): void {
    const style = config.treeStyle;
    const count = config.treeCount;
    const terrainSize = config.terrainSize;
    const trunkColor = config.colors.treeTrunk;
    const leafColor = config.colors.treeLeaves;

    const { trunkGeo, leafGeo, trunkMat, leafMat, trunkYOffset, leafYOffset } =
      this.getTreeGeometry(style, trunkColor, leafColor);

    const trunkInstances = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    const leafInstances = leafGeo ? new THREE.InstancedMesh(leafGeo, leafMat!, count) : null;

    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      let x: number, z: number;
      do {
        x = (this.rng() - 0.5) * terrainSize * 0.85;
        z = (this.rng() - 0.5) * terrainSize * 0.85;
      } while (Math.sqrt(x * x + z * z) < 40);

      const y = terrain.getHeightAt(x, z);
      const scale = 0.7 + this.rng() * 0.8;

      // Trunk
      dummy.position.set(x, y + trunkYOffset * scale, z);
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.set(0, this.rng() * Math.PI * 2, 0);
      dummy.updateMatrix();
      trunkInstances.setMatrixAt(i, dummy.matrix);

      // Leaves (on top)
      if (leafInstances) {
        dummy.position.set(x, y + leafYOffset * scale, z);
        dummy.updateMatrix();
        leafInstances.setMatrixAt(i, dummy.matrix);
      }

      // Physics: cylinder collider for the trunk
      const trunkRadius = 0.25 * scale;
      const trunkHeight = 3 * scale;
      const trunkShape = new CANNON.Cylinder(trunkRadius, trunkRadius, trunkHeight, 6);
      const trunkBody = new CANNON.Body({ mass: 0 });
      trunkBody.addShape(trunkShape);
      trunkBody.position.set(x, y + trunkHeight / 2, z);
      world.addBody(trunkBody);
    }

    trunkInstances.castShadow = true;
    scene.add(trunkInstances);

    if (leafInstances) {
      leafInstances.castShadow = true;
      leafInstances.receiveShadow = true;
      scene.add(leafInstances);
    }
  }

  private getTreeGeometry(
    style: TreeStyle,
    trunkColor: number,
    leafColor: number,
  ): {
    trunkGeo: THREE.BufferGeometry;
    leafGeo: THREE.BufferGeometry | null;
    trunkMat: THREE.Material;
    leafMat: THREE.Material | null;
    trunkYOffset: number;
    leafYOffset: number;
  } {
    const trunkMat = new THREE.MeshLambertMaterial({ color: trunkColor, flatShading: true });
    const leafMat = new THREE.MeshLambertMaterial({ color: leafColor, flatShading: true });

    switch (style) {
      case 'conifer':
      default:
        return {
          trunkGeo: new THREE.CylinderGeometry(0.15, 0.25, 2, 6),
          leafGeo: new THREE.ConeGeometry(1.5, 4, 6),
          trunkMat,
          leafMat,
          trunkYOffset: 1,
          leafYOffset: 3.5,
        };

      case 'deciduous':
        return {
          trunkGeo: new THREE.CylinderGeometry(0.15, 0.3, 2.5, 6),
          leafGeo: new THREE.SphereGeometry(1.8, 6, 5),
          trunkMat,
          leafMat,
          trunkYOffset: 1.25,
          leafYOffset: 3.8,
        };

      case 'palm': {
        // Tall thin trunk + flat cone top
        const palmTrunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 5, 6);
        const palmLeafGeo = new THREE.ConeGeometry(2.5, 1.5, 6);
        return {
          trunkGeo: palmTrunkGeo,
          leafGeo: palmLeafGeo,
          trunkMat,
          leafMat,
          trunkYOffset: 2.5,
          leafYOffset: 5.5,
        };
      }

      case 'cactus': {
        // Thick green cylinder (no separate leaves)
        const cactusMat = new THREE.MeshLambertMaterial({ color: leafColor, flatShading: true });
        const cactusGeo = new THREE.CylinderGeometry(0.3, 0.35, 3, 8);
        // Small arm as "leaf" geometry
        const armGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 6);
        armGeo.rotateZ(Math.PI / 3);
        armGeo.translate(0.4, 0, 0);
        return {
          trunkGeo: cactusGeo,
          leafGeo: armGeo,
          trunkMat: cactusMat,
          leafMat: cactusMat,
          trunkYOffset: 1.5,
          leafYOffset: 2.2,
        };
      }

      case 'snow-conifer': {
        // Like conifer but with white-tinted leaves
        const snowLeafMat = new THREE.MeshLambertMaterial({
          color: 0xccddcc, // whitish green
          flatShading: true,
        });
        return {
          trunkGeo: new THREE.CylinderGeometry(0.15, 0.25, 2, 6),
          leafGeo: new THREE.ConeGeometry(1.5, 4, 6),
          trunkMat,
          leafMat: snowLeafMat,
          trunkYOffset: 1,
          leafYOffset: 3.5,
        };
      }
    }
  }

  private createRocks(scene: THREE.Scene, terrain: Terrain, world: CANNON.World, config: WorldConfig): void {
    const count = config.rockCount;
    const terrainSize = config.terrainSize;

    const rockGeo = new THREE.IcosahedronGeometry(1, 0);
    const positions = rockGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      positions.setXYZ(
        i,
        positions.getX(i) * (0.8 + this.rng() * 0.4),
        positions.getY(i) * (0.6 + this.rng() * 0.4),
        positions.getZ(i) * (0.8 + this.rng() * 0.4),
      );
    }
    rockGeo.computeVertexNormals();

    const rockMat = new THREE.MeshLambertMaterial({
      color: config.colors.rockColor,
      flatShading: true,
    });
    const rockInstances = new THREE.InstancedMesh(rockGeo, rockMat, count);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      let x: number, z: number;
      do {
        x = (this.rng() - 0.5) * terrainSize * 0.85;
        z = (this.rng() - 0.5) * terrainSize * 0.85;
      } while (Math.sqrt(x * x + z * z) < 35);

      const y = terrain.getHeightAt(x, z);
      const scale = 0.3 + this.rng() * 1.5;

      dummy.position.set(x, y + scale * 0.3, z);
      dummy.scale.set(scale, scale * 0.7, scale);
      dummy.rotation.set(this.rng(), this.rng(), this.rng());
      dummy.updateMatrix();
      rockInstances.setMatrixAt(i, dummy.matrix);

      const rockRadius = scale * 0.7;
      const rockShape = new CANNON.Sphere(rockRadius);
      const rockBody = new CANNON.Body({ mass: 0 });
      rockBody.addShape(rockShape);
      rockBody.position.set(x, y + scale * 0.3, z);
      world.addBody(rockBody);
    }

    rockInstances.castShadow = true;
    rockInstances.receiveShadow = true;
    scene.add(rockInstances);
  }

  /** Call each frame to move shadow camera with the truck */
  updateSunTarget(truckPosition: THREE.Vector3) {
    this.sunLight.target.position.copy(truckPosition);
    this.sunLight.position.set(
      truckPosition.x + 100,
      150,
      truckPosition.z + 50,
    );
  }
}
