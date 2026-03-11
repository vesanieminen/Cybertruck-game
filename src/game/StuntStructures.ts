import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { mulberry32 } from './noise';
import type { Terrain } from './Terrain';

const STUNT_COLOR = 0xe88020;
const PILLAR_COLOR = 0xcc6610;

export class StuntStructures {
  private mat: THREE.MeshLambertMaterial;
  private pillarMat: THREE.MeshLambertMaterial;
  private groundMaterial: CANNON.Material;

  constructor(
    scene: THREE.Scene, terrain: Terrain, world: CANNON.World,
    groundMaterial: CANNON.Material, seed: number,
    stuntDensity = 1, terrainSize = 1500,
  ) {
    this.mat = new THREE.MeshLambertMaterial({ color: STUNT_COLOR, flatShading: true, side: THREE.DoubleSide });
    this.pillarMat = new THREE.MeshLambertMaterial({ color: PILLAR_COLOR, flatShading: true });
    this.groundMaterial = groundMaterial;

    const rng = mulberry32(seed + 31337);
    const range = terrainSize * 0.4; // keep within inner 80% of terrain
    const d = stuntDensity; // multiplier for structure counts
    const minDist = 50; // minimum distance from spawn

    const randPos = (): [number, number] => {
      let x: number, z: number;
      do {
        x = (rng() - 0.5) * range * 2;
        z = (rng() - 0.5) * range * 2;
      } while (Math.sqrt(x * x + z * z) < minDist);
      return [x, z];
    };

    const randAngle = () => rng() * Math.PI * 2;

    // --- Small ramps (5–12) × density ---
    const smallRampCount = Math.round((5 + Math.floor(rng() * 8)) * d);
    for (let i = 0; i < smallRampCount; i++) {
      const [x, z] = randPos();
      const w = 5 + rng() * 3;
      const l = 8 + rng() * 6;
      const h = 1.5 + rng() * 2;
      this.addRamp(scene, world, terrain, x, z, randAngle(), w, l, h);
    }

    // --- Medium ramps (2–6) × density ---
    const medRampCount = Math.round((2 + Math.floor(rng() * 5)) * d);
    for (let i = 0; i < medRampCount; i++) {
      const [x, z] = randPos();
      const w = 6 + rng() * 3;
      const l = 12 + rng() * 8;
      const h = 3 + rng() * 3;
      this.addRamp(scene, world, terrain, x, z, randAngle(), w, l, h);
    }

    // --- Big ramps (1–3) × density ---
    const bigRampCount = Math.round((1 + Math.floor(rng() * 3)) * d);
    for (let i = 0; i < bigRampCount; i++) {
      const [x, z] = randPos();
      const w = 8 + rng() * 4;
      const l = 18 + rng() * 15;
      const h = 6 + rng() * 5;
      this.addRamp(scene, world, terrain, x, z, randAngle(), w, l, h);
    }

    // --- Sequential jump sets (0–3) × density ---
    const seqCount = Math.round(Math.floor(rng() * 4) * d);
    for (let s = 0; s < seqCount; s++) {
      const [sx, sz] = randPos();
      const dir = randAngle();
      const jumpCount = 3 + Math.floor(rng() * 5);
      const spacing = 20 + rng() * 10;
      for (let i = 0; i < jumpCount; i++) {
        const jx = sx + Math.sin(dir) * i * spacing;
        const jz = sz + Math.cos(dir) * i * spacing;
        const w = 5 + rng() * 2;
        const l = 6 + rng() * 4;
        const h = 1.5 + i * (0.3 + rng() * 0.4);
        this.addRamp(scene, world, terrain, jx, jz, dir, w, l, h);
      }
    }

    // --- Elevated platforms (1–4) × density ---
    const platCount = Math.round((1 + Math.floor(rng() * 4)) * d);
    for (let i = 0; i < platCount; i++) {
      const [x, z] = randPos();
      const w = 8 + rng() * 6;
      const l = 12 + rng() * 10;
      const h = 4 + rng() * 6;
      this.addPlatform(scene, world, terrain, x, z, randAngle(), w, l, h);
    }

    // --- Half-pipes (0–3) × density ---
    const pipeCount = Math.round(Math.floor(rng() * 4) * d);
    for (let i = 0; i < pipeCount; i++) {
      const [x, z] = randPos();
      const w = 15 + rng() * 10;
      const l = 20 + rng() * 20;
      const h = 4 + rng() * 4;
      this.addHalfPipe(scene, world, terrain, x, z, randAngle(), w, l, h);
    }

    // --- Spiral towers (0–2) × density ---
    const spiralCount = Math.round(Math.floor(rng() * 3) * d);
    for (let i = 0; i < spiralCount; i++) {
      const [x, z] = randPos();
      this.addSpiralTower(scene, world, terrain, x, z, rng);
    }
  }

  private addRamp(
    scene: THREE.Scene, world: CANNON.World, terrain: Terrain,
    x: number, z: number, yRot: number,
    width: number, length: number, height: number
  ) {
    const y = terrain.getHeightAt(x, z);

    const vertices = new Float32Array([
      -width / 2, 0, 0,       width / 2, 0, 0,
      -width / 2, 0, length,   width / 2, 0, length,
      -width / 2, height, 0,   width / 2, height, 0,
    ]);
    const indices = [
      0, 1, 3, 3, 2, 0,
      4, 2, 3, 3, 5, 4,
      1, 0, 4, 4, 5, 1,
      0, 2, 4,
      1, 5, 3,
    ];

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, this.mat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = yRot;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const convexVerts = [
      new CANNON.Vec3(-width / 2, 0, 0),
      new CANNON.Vec3(width / 2, 0, 0),
      new CANNON.Vec3(-width / 2, 0, length),
      new CANNON.Vec3(width / 2, 0, length),
      new CANNON.Vec3(-width / 2, height, 0),
      new CANNON.Vec3(width / 2, height, 0),
    ];
    const convexFaces = [
      [0, 1, 3, 2],
      [4, 2, 3, 5],
      [1, 0, 4, 5],
      [0, 2, 4],
      [1, 5, 3],
    ];
    const shape = new CANNON.ConvexPolyhedron({ vertices: convexVerts, faces: convexFaces });
    const body = new CANNON.Body({ mass: 0, material: this.groundMaterial });
    body.addShape(shape);
    body.position.set(x, y, z);
    body.quaternion.setFromEuler(0, yRot, 0);
    world.addBody(body);
  }

  private addPlatform(
    scene: THREE.Scene, world: CANNON.World, terrain: Terrain,
    x: number, z: number, yRot: number,
    width: number, length: number, height: number
  ) {
    const y = terrain.getHeightAt(x, z);

    // Platform surface
    const platGeo = new THREE.BoxGeometry(width, 0.5, length);
    const platMesh = new THREE.Mesh(platGeo, this.mat);
    platMesh.position.set(x, y + height, z);
    platMesh.rotation.y = yRot;
    platMesh.castShadow = true;
    platMesh.receiveShadow = true;
    scene.add(platMesh);

    const platShape = new CANNON.Box(new CANNON.Vec3(width / 2, 0.25, length / 2));
    const platBody = new CANNON.Body({ mass: 0, material: this.groundMaterial });
    platBody.addShape(platShape);
    platBody.position.set(x, y + height, z);
    platBody.quaternion.setFromEuler(0, yRot, 0);
    world.addBody(platBody);

    // Support pillars
    const pillarGeo = new THREE.BoxGeometry(0.6, height, 0.6);
    const cos = Math.cos(yRot);
    const sin = Math.sin(yRot);
    const corners = [
      [(-width / 2 + 0.5), (-length / 2 + 0.5)],
      [(width / 2 - 0.5), (-length / 2 + 0.5)],
      [(-width / 2 + 0.5), (length / 2 - 0.5)],
      [(width / 2 - 0.5), (length / 2 - 0.5)],
    ];
    for (const [lx, lz] of corners) {
      const wx = x + lx * cos - lz * sin;
      const wz = z + lx * sin + lz * cos;
      const pillar = new THREE.Mesh(pillarGeo, this.pillarMat);
      pillar.position.set(wx, y + height / 2, wz);
      pillar.castShadow = true;
      scene.add(pillar);
    }

    // Access ramp
    const rampLength = height * 3;
    const rampX = x - Math.sin(yRot) * (length / 2 + rampLength / 2);
    const rampZ = z - Math.cos(yRot) * (length / 2 + rampLength / 2);
    this.addRamp(scene, world, terrain, rampX, rampZ, yRot + Math.PI, width, rampLength, height);
  }

  private addHalfPipe(
    scene: THREE.Scene, world: CANNON.World, terrain: Terrain,
    x: number, z: number, yRot: number,
    width: number, length: number, height: number
  ) {
    const y = terrain.getHeightAt(x, z);
    const segments = 12;
    const vertices: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI;
      const cx = Math.cos(angle) * (width / 2);
      const cy = Math.sin(angle) * height;

      vertices.push(cx, cy, -length / 2);
      vertices.push(cx, cy, length / 2);
    }

    for (let i = 0; i < segments; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      indices.push(a, c, b, b, c, d);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, this.mat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = yRot;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    for (let i = 0; i < segments; i++) {
      const angle0 = (i / segments) * Math.PI;
      const angle1 = ((i + 1) / segments) * Math.PI;
      const midAngle = (angle0 + angle1) / 2;

      const cx = Math.cos(midAngle) * (width / 2);
      const cy = Math.sin(midAngle) * height;

      const segWidth = Math.sqrt(
        Math.pow(Math.cos(angle1) - Math.cos(angle0), 2) +
        Math.pow(Math.sin(angle1) - Math.sin(angle0), 2)
      ) * (width / 2 + height) / 2;
      const thickness = 0.5;

      const boxShape = new CANNON.Box(new CANNON.Vec3(segWidth / 2, thickness / 2, length / 2));
      const segBody = new CANNON.Body({ mass: 0, material: this.groundMaterial });
      segBody.addShape(boxShape);

      const tilt = midAngle - Math.PI / 2;
      const q = new CANNON.Quaternion();
      q.setFromEuler(0, yRot, 0);
      const q2 = new CANNON.Quaternion();
      q2.setFromEuler(0, 0, tilt);
      q.mult(q2, q);
      segBody.quaternion.copy(q);

      const localX = cx;
      const localY = cy;
      const cosR = Math.cos(yRot);
      const sinR = Math.sin(yRot);
      segBody.position.set(
        x + localX * cosR,
        y + localY,
        z + localX * sinR
      );
      world.addBody(segBody);
    }
  }

  private addSpiralTower(
    scene: THREE.Scene, world: CANNON.World, terrain: Terrain,
    x: number, z: number, rng: () => number
  ) {
    const y = terrain.getHeightAt(x, z);
    const radius = 15 + rng() * 10;
    const trackWidth = 6 + rng() * 4;
    const turns = 1.5 + rng() * 1.5;
    const totalHeight = 15 + rng() * 15;
    const segments = Math.floor(turns * 24);
    const vertices: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = t * turns * Math.PI * 2;
      const h = t * totalHeight;

      const cx = Math.cos(angle) * radius;
      const cz = Math.sin(angle) * radius;

      const nx = Math.cos(angle);
      const nz = Math.sin(angle);

      vertices.push(
        cx - nx * trackWidth / 2, h, cz - nz * trackWidth / 2,
        cx + nx * trackWidth / 2, h, cz + nz * trackWidth / 2,
      );
    }

    for (let i = 0; i < segments; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      indices.push(a, c, b, b, c, d);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, this.mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    for (let i = 0; i < segments; i++) {
      const t0 = i / segments;
      const t1 = (i + 1) / segments;
      const tMid = (t0 + t1) / 2;
      const angle0 = t0 * turns * Math.PI * 2;
      const angle1 = t1 * turns * Math.PI * 2;
      const angleMid = tMid * turns * Math.PI * 2;
      const hMid = tMid * totalHeight;

      const cx = Math.cos(angleMid) * radius;
      const cz = Math.sin(angleMid) * radius;

      const dx = Math.cos(angle1) * radius - Math.cos(angle0) * radius;
      const dz = Math.sin(angle1) * radius - Math.sin(angle0) * radius;
      const dh = (t1 - t0) * totalHeight;
      const segLen = Math.sqrt(dx * dx + dz * dz + dh * dh);

      const boxShape = new CANNON.Box(new CANNON.Vec3(trackWidth / 2, 0.3, segLen / 2));
      const segBody = new CANNON.Body({ mass: 0, material: this.groundMaterial });
      segBody.addShape(boxShape);

      const tangentX = -Math.sin(angleMid);
      const tangentZ = Math.cos(angleMid);
      const yawAngle = Math.atan2(tangentX, tangentZ);
      const pitchAngle = Math.atan2(dh, Math.sqrt(dx * dx + dz * dz));

      const q = new CANNON.Quaternion();
      q.setFromEuler(pitchAngle, yawAngle, 0);
      segBody.quaternion.copy(q);
      segBody.position.set(x + cx, y + hMid, z + cz);
      world.addBody(segBody);
    }

    // Central pillar
    const pillarGeo = new THREE.CylinderGeometry(1.5, 1.5, totalHeight, 8);
    const pillar = new THREE.Mesh(pillarGeo, this.pillarMat);
    pillar.position.set(x, y + totalHeight / 2, z);
    pillar.castShadow = true;
    scene.add(pillar);

    const pillarShape = new CANNON.Cylinder(1.5, 1.5, totalHeight, 8);
    const pillarBody = new CANNON.Body({ mass: 0, material: this.groundMaterial });
    pillarBody.addShape(pillarShape);
    pillarBody.position.set(x, y + totalHeight / 2, z);
    world.addBody(pillarBody);

    // Entry ramp at the base
    const entryX = x + Math.cos(0) * (radius + 15);
    const entryZ = z + Math.sin(0) * (radius + 15);
    this.addRamp(scene, world, terrain, entryX, entryZ, Math.PI, trackWidth, 15, 1);

    // Launch ramp at the top
    const topAngle = turns * Math.PI * 2;
    const topX = x + Math.cos(topAngle) * radius;
    const topZ = z + Math.sin(topAngle) * radius;
    const tw = trackWidth;
    const launchVerts = new Float32Array([
      -tw / 2, 0, 0,      tw / 2, 0, 0,
      -tw / 2, 0, 8,      tw / 2, 0, 8,
      -tw / 2, 4, 0,      tw / 2, 4, 0,
    ]);
    const launchIdx = [
      0, 1, 3, 3, 2, 0,
      4, 2, 3, 3, 5, 4,
      1, 0, 4, 4, 5, 1,
      0, 2, 4,
      1, 5, 3,
    ];
    const launchGeo = new THREE.BufferGeometry();
    launchGeo.setAttribute('position', new THREE.BufferAttribute(launchVerts, 3));
    launchGeo.setIndex(launchIdx);
    launchGeo.computeVertexNormals();

    const launchDir = topAngle + Math.PI;
    const launchMesh = new THREE.Mesh(launchGeo, this.mat);
    launchMesh.position.set(topX, y + totalHeight, topZ);
    launchMesh.rotation.y = launchDir;
    launchMesh.castShadow = true;
    scene.add(launchMesh);

    const launchConvexVerts = [
      new CANNON.Vec3(-tw / 2, 0, 0),
      new CANNON.Vec3(tw / 2, 0, 0),
      new CANNON.Vec3(-tw / 2, 0, 8),
      new CANNON.Vec3(tw / 2, 0, 8),
      new CANNON.Vec3(-tw / 2, 4, 0),
      new CANNON.Vec3(tw / 2, 4, 0),
    ];
    const launchConvexFaces = [
      [0, 1, 3, 2],
      [4, 2, 3, 5],
      [1, 0, 4, 5],
      [0, 2, 4],
      [1, 5, 3],
    ];
    const launchShape = new CANNON.ConvexPolyhedron({ vertices: launchConvexVerts, faces: launchConvexFaces });
    const launchBody = new CANNON.Body({ mass: 0, material: this.groundMaterial });
    launchBody.addShape(launchShape);
    launchBody.position.set(topX, y + totalHeight, topZ);
    launchBody.quaternion.setFromEuler(0, launchDir, 0);
    world.addBody(launchBody);
  }
}
