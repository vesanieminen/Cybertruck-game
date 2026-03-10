import * as THREE from 'three';
import { seedNoise } from './noise';
import {
  TERRAIN_SIZE,
  TERRAIN_SEGMENTS,
  TERRAIN_MAX_HEIGHT,
  TERRAIN_NOISE_SCALE,
  TERRAIN_NOISE_OCTAVES,
  TERRAIN_FLAT_RADIUS,
  COLORS,
} from './constants';

export class Terrain {
  public mesh: THREE.Mesh;
  public heightData: number[][];

  constructor(scene: THREE.Scene, seed: number) {
    this.heightData = this.generateHeightmap(seed);
    this.mesh = this.createMesh();
    scene.add(this.mesh);
  }

  private generateHeightmap(seed: number): number[][] {
    const noise = seedNoise(seed);
    const data: number[][] = [];
    const halfSize = TERRAIN_SIZE / 2;
    const step = TERRAIN_SIZE / (TERRAIN_SEGMENTS - 1);

    for (let i = 0; i < TERRAIN_SEGMENTS; i++) {
      data[i] = [];
      for (let j = 0; j < TERRAIN_SEGMENTS; j++) {
        const worldX = -halfSize + j * step;
        const worldZ = -halfSize + i * step;

        // Fractal noise
        let height = 0;
        let amplitude = 1;
        let frequency = TERRAIN_NOISE_SCALE;
        for (let o = 0; o < TERRAIN_NOISE_OCTAVES; o++) {
          height += noise(worldX * frequency, worldZ * frequency) * amplitude;
          amplitude *= 0.5;
          frequency *= 2;
        }
        height *= TERRAIN_MAX_HEIGHT;

        // Flatten spawn area with smooth falloff
        const dist = Math.sqrt(worldX * worldX + worldZ * worldZ);
        if (dist < TERRAIN_FLAT_RADIUS) {
          const t = dist / TERRAIN_FLAT_RADIUS;
          const blend = t * t * (3 - 2 * t); // smoothstep
          height *= blend;
        }

        // Raise edges to form natural bowl boundary
        const edgeDist = Math.max(
          Math.abs(worldX) / halfSize,
          Math.abs(worldZ) / halfSize
        );
        if (edgeDist > 0.85) {
          const edgeT = (edgeDist - 0.85) / 0.15;
          height += edgeT * edgeT * 40;
        }

        data[i][j] = height;
      }
    }
    return data;
  }

  private createMesh(): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(
      TERRAIN_SIZE,
      TERRAIN_SIZE,
      TERRAIN_SEGMENTS - 1,
      TERRAIN_SEGMENTS - 1
    );

    // Rotate plane to XZ
    geo.rotateX(-Math.PI / 2);

    // Displace vertices by heightmap
    const positions = geo.attributes.position;
    for (let i = 0; i < TERRAIN_SEGMENTS; i++) {
      for (let j = 0; j < TERRAIN_SEGMENTS; j++) {
        const vertexIndex = i * TERRAIN_SEGMENTS + j;
        positions.setY(vertexIndex, this.heightData[i][j]);
      }
    }

    geo.computeVertexNormals();

    // Vertex colors based on height
    const colors = new Float32Array(positions.count * 3);
    const grassColor = new THREE.Color(COLORS.grassGreen);
    const dirtColor = new THREE.Color(COLORS.dirtBrown);
    const rockColor = new THREE.Color(COLORS.rockGray);

    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const t = Math.max(0, Math.min(1, y / TERRAIN_MAX_HEIGHT));
      let color: THREE.Color;
      if (t < 0.4) {
        color = grassColor.clone().lerp(dirtColor, t / 0.4);
      } else {
        color = dirtColor.clone().lerp(rockColor, (t - 0.4) / 0.6);
      }
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    return mesh;
  }

  getHeightAt(x: number, z: number): number {
    const halfSize = TERRAIN_SIZE / 2;
    const step = TERRAIN_SIZE / (TERRAIN_SEGMENTS - 1);
    const i = (z + halfSize) / step;
    const j = (x + halfSize) / step;

    const i0 = Math.floor(Math.max(0, Math.min(i, TERRAIN_SEGMENTS - 2)));
    const j0 = Math.floor(Math.max(0, Math.min(j, TERRAIN_SEGMENTS - 2)));
    const fi = i - i0;
    const fj = j - j0;

    const h00 = this.heightData[i0][j0];
    const h10 = this.heightData[i0 + 1][j0];
    const h01 = this.heightData[i0][j0 + 1];
    const h11 = this.heightData[i0 + 1][j0 + 1];

    return (
      h00 * (1 - fi) * (1 - fj) +
      h10 * fi * (1 - fj) +
      h01 * (1 - fi) * fj +
      h11 * fi * fj
    );
  }
}
