import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { COLORS, TERRAIN_SIZE, TREE_COUNT, ROCK_COUNT } from './constants';
import type { Terrain } from './Terrain';

export class NatureEnvironment {
  public sunLight: THREE.DirectionalLight;

  constructor(scene: THREE.Scene, terrain: Terrain, world: CANNON.World) {
    this.sunLight = this.createLighting(scene);
    this.createSky(scene);
    this.createTrees(scene, terrain, world);
    this.createRocks(scene, terrain, world);
  }

  private createSky(scene: THREE.Scene): void {
    const skyGeo = new THREE.SphereGeometry(900, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(COLORS.skyTop) },
        bottomColor: { value: new THREE.Color(COLORS.skyHorizon) },
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

  private createLighting(scene: THREE.Scene): THREE.DirectionalLight {
    // Sun
    const sun = new THREE.DirectionalLight(COLORS.sunColor, 2.5);
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

    // Ambient
    scene.add(new THREE.AmbientLight(0x668899, 1.0));

    // Hemisphere (blue sky / green-brown ground)
    scene.add(new THREE.HemisphereLight(0x88bbdd, 0x445533, 1.5));

    return sun;
  }

  private createTrees(scene: THREE.Scene, terrain: Terrain, world: CANNON.World): void {
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, 2, 6);
    const trunkMat = new THREE.MeshLambertMaterial({
      color: COLORS.treeTrunk,
      flatShading: true,
    });

    const leafGeo = new THREE.ConeGeometry(1.5, 4, 6);
    const leafMat = new THREE.MeshLambertMaterial({
      color: COLORS.treeLeaves,
      flatShading: true,
    });

    const trunkInstances = new THREE.InstancedMesh(trunkGeo, trunkMat, TREE_COUNT);
    const leafInstances = new THREE.InstancedMesh(leafGeo, leafMat, TREE_COUNT);

    const dummy = new THREE.Object3D();

    for (let i = 0; i < TREE_COUNT; i++) {
      let x: number, z: number;
      do {
        x = (Math.random() - 0.5) * TERRAIN_SIZE * 0.85;
        z = (Math.random() - 0.5) * TERRAIN_SIZE * 0.85;
      } while (Math.sqrt(x * x + z * z) < 40);

      const y = terrain.getHeightAt(x, z);
      const scale = 0.7 + Math.random() * 0.8;

      // Trunk
      dummy.position.set(x, y + 1 * scale, z);
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      dummy.updateMatrix();
      trunkInstances.setMatrixAt(i, dummy.matrix);

      // Leaves (on top)
      dummy.position.set(x, y + 3.5 * scale, z);
      dummy.updateMatrix();
      leafInstances.setMatrixAt(i, dummy.matrix);

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
    leafInstances.castShadow = true;
    leafInstances.receiveShadow = true;

    scene.add(trunkInstances);
    scene.add(leafInstances);
  }

  private createRocks(scene: THREE.Scene, terrain: Terrain, world: CANNON.World): void {
    const rockGeo = new THREE.IcosahedronGeometry(1, 0);
    // Distort vertices for natural look
    const positions = rockGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      positions.setXYZ(
        i,
        positions.getX(i) * (0.8 + Math.random() * 0.4),
        positions.getY(i) * (0.6 + Math.random() * 0.4),
        positions.getZ(i) * (0.8 + Math.random() * 0.4)
      );
    }
    rockGeo.computeVertexNormals();

    const rockMat = new THREE.MeshLambertMaterial({
      color: COLORS.rockGray,
      flatShading: true,
    });
    const rockInstances = new THREE.InstancedMesh(rockGeo, rockMat, ROCK_COUNT);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < ROCK_COUNT; i++) {
      let x: number, z: number;
      do {
        x = (Math.random() - 0.5) * TERRAIN_SIZE * 0.85;
        z = (Math.random() - 0.5) * TERRAIN_SIZE * 0.85;
      } while (Math.sqrt(x * x + z * z) < 35);

      const y = terrain.getHeightAt(x, z);
      const scale = 0.3 + Math.random() * 1.5;

      dummy.position.set(x, y + scale * 0.3, z);
      dummy.scale.set(scale, scale * 0.7, scale);
      dummy.rotation.set(Math.random(), Math.random(), Math.random());
      dummy.updateMatrix();
      rockInstances.setMatrixAt(i, dummy.matrix);

      // Physics: sphere collider for each rock
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
      truckPosition.z + 50
    );
  }
}
