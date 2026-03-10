import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type { Terrain } from './Terrain';

const STUNT_COLOR = 0xe88020;
const PILLAR_COLOR = 0xcc6610;

export class StuntStructures {
  private mat: THREE.MeshLambertMaterial;
  private pillarMat: THREE.MeshLambertMaterial;
  private groundMaterial: CANNON.Material;

  constructor(scene: THREE.Scene, terrain: Terrain, world: CANNON.World, groundMaterial: CANNON.Material) {
    this.mat = new THREE.MeshLambertMaterial({ color: STUNT_COLOR, flatShading: true, side: THREE.DoubleSide });
    this.pillarMat = new THREE.MeshLambertMaterial({ color: PILLAR_COLOR, flatShading: true });
    this.groundMaterial = groundMaterial;

    // Small jump ramps near spawn
    this.addRamp(scene, world, terrain, 70, 50, 0, 6, 10, 2.5);
    this.addRamp(scene, world, terrain, -60, 70, Math.PI * 0.5, 6, 10, 2.5);
    this.addRamp(scene, world, terrain, 50, -80, Math.PI * 1.0, 6, 10, 2.5);

    // Medium ramps
    this.addRamp(scene, world, terrain, 150, 100, Math.PI * 0.2, 7, 14, 4);
    this.addRamp(scene, world, terrain, -120, -150, Math.PI * 0.7, 7, 14, 4);

    // Big jump ramp
    this.addRamp(scene, world, terrain, 200, -50, Math.PI * 0.1, 8, 20, 6);

    // Mega ramp
    this.addRamp(scene, world, terrain, -250, 0, Math.PI * 0.5, 10, 30, 10);

    // Elevated platforms with ramp access
    this.addPlatform(scene, world, terrain, -180, 200, Math.PI * 0.25, 10, 15, 6);
    this.addPlatform(scene, world, terrain, 250, 150, Math.PI * 0.8, 12, 18, 8);

    // Half-pipe
    this.addHalfPipe(scene, world, terrain, 0, -200, 0, 20, 30, 6);

    // Spiral ramp tower
    this.addSpiralTower(scene, world, terrain, 300, 0);

    // Sequential jumps (motocross-style)
    for (let i = 0; i < 5; i++) {
      this.addRamp(scene, world, terrain, -80 + i * 25, -300, 0, 6, 8, 2 + i * 0.5);
    }
  }

  private addRamp(
    scene: THREE.Scene, world: CANNON.World, terrain: Terrain,
    x: number, z: number, yRot: number,
    width: number, length: number, height: number
  ) {
    const y = terrain.getHeightAt(x, z);

    // Wedge: 6 vertices
    // 0: back-bottom-left, 1: back-bottom-right
    // 2: front-bottom-left, 3: front-bottom-right
    // 4: back-top-left, 5: back-top-right
    const vertices = new Float32Array([
      -width / 2, 0, 0,       width / 2, 0, 0,
      -width / 2, 0, length,   width / 2, 0, length,
      -width / 2, height, 0,   width / 2, height, 0,
    ]);
    const indices = [
      0, 1, 3, 3, 2, 0,   // bottom
      4, 2, 3, 3, 5, 4,   // ramp slope
      1, 0, 4, 4, 5, 1,   // back wall
      0, 2, 4,             // left triangle
      1, 5, 3,             // right triangle
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

    // Physics: ConvexPolyhedron (full collision support, unlike Trimesh)
    const convexVerts = [
      new CANNON.Vec3(-width / 2, 0, 0),
      new CANNON.Vec3(width / 2, 0, 0),
      new CANNON.Vec3(-width / 2, 0, length),
      new CANNON.Vec3(width / 2, 0, length),
      new CANNON.Vec3(-width / 2, height, 0),
      new CANNON.Vec3(width / 2, height, 0),
    ];
    const convexFaces = [
      [0, 1, 3, 2], // bottom (-Y)
      [4, 2, 3, 5], // slope (up-forward)
      [1, 0, 4, 5], // back wall (-Z)
      [0, 2, 4],    // left (-X)
      [1, 5, 3],    // right (+X)
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

    // Half-pipe: U-shaped cross-section extruded along length
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

    // Physics: use Box segments to approximate the U shape (Trimesh has poor collision)
    for (let i = 0; i < segments; i++) {
      const angle0 = (i / segments) * Math.PI;
      const angle1 = ((i + 1) / segments) * Math.PI;
      const midAngle = (angle0 + angle1) / 2;

      const cx = Math.cos(midAngle) * (width / 2);
      const cy = Math.sin(midAngle) * height;

      // Each segment is a thin tilted box
      const segWidth = Math.sqrt(
        Math.pow(Math.cos(angle1) - Math.cos(angle0), 2) +
        Math.pow(Math.sin(angle1) - Math.sin(angle0), 2)
      ) * (width / 2 + height) / 2;
      const thickness = 0.5;

      const boxShape = new CANNON.Box(new CANNON.Vec3(segWidth / 2, thickness / 2, length / 2));
      const segBody = new CANNON.Body({ mass: 0, material: this.groundMaterial });
      segBody.addShape(boxShape);

      // Rotate the segment to match the curve
      const tilt = midAngle - Math.PI / 2; // rotation around Z
      const q = new CANNON.Quaternion();
      q.setFromEuler(0, yRot, 0);
      const q2 = new CANNON.Quaternion();
      q2.setFromEuler(0, 0, tilt);
      q.mult(q2, q);
      segBody.quaternion.copy(q);

      // Position in world space
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
    x: number, z: number
  ) {
    const y = terrain.getHeightAt(x, z);
    const radius = 20;
    const trackWidth = 8;
    const turns = 2;
    const totalHeight = 25;
    const segments = turns * 24;
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

    // Physics: Box segments along the spiral track
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

      // Segment length along the arc
      const dx = Math.cos(angle1) * radius - Math.cos(angle0) * radius;
      const dz = Math.sin(angle1) * radius - Math.sin(angle0) * radius;
      const dh = (t1 - t0) * totalHeight;
      const segLen = Math.sqrt(dx * dx + dz * dz + dh * dh);

      const boxShape = new CANNON.Box(new CANNON.Vec3(trackWidth / 2, 0.3, segLen / 2));
      const segBody = new CANNON.Body({ mass: 0, material: this.groundMaterial });
      segBody.addShape(boxShape);

      // The segment tangent direction
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

    // Central pillar physics
    const pillarShape = new CANNON.Cylinder(1.5, 1.5, totalHeight, 8);
    const pillarBody = new CANNON.Body({ mass: 0, material: this.groundMaterial });
    pillarBody.addShape(pillarShape);
    pillarBody.position.set(x, y + totalHeight / 2, z);
    world.addBody(pillarBody);

    // Entry ramp at the base
    const entryX = x + Math.cos(0) * (radius + 15);
    const entryZ = z + Math.sin(0) * (radius + 15);
    this.addRamp(scene, world, terrain, entryX, entryZ, Math.PI, 8, 15, 1);

    // Launch ramp at the top
    const topAngle = turns * Math.PI * 2;
    const topX = x + Math.cos(topAngle) * radius;
    const topZ = z + Math.sin(topAngle) * radius;
    const launchVerts = new Float32Array([
      -trackWidth / 2, 0, 0,      trackWidth / 2, 0, 0,
      -trackWidth / 2, 0, 8,      trackWidth / 2, 0, 8,
      -trackWidth / 2, 4, 0,      trackWidth / 2, 4, 0,
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

    // Launch ramp physics (ConvexPolyhedron)
    const tw = trackWidth;
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
