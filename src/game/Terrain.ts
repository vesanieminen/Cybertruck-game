import * as THREE from 'three';
import { seedNoise } from './noise';
import type { WorldConfig } from './WorldConfig';

export class Terrain {
  public mesh: THREE.Mesh;
  public heightData: number[][];
  public config: WorldConfig;

  constructor(scene: THREE.Scene, seed: number, config: WorldConfig) {
    this.config = config;
    this.heightData = this.generateHeightmap(seed);
    this.mesh = this.createMesh();
    scene.add(this.mesh);
  }

  private generateHeightmap(seed: number): number[][] {
    const { terrainSize, terrainSegments, terrainMaxHeight, terrainNoiseScale,
            terrainNoiseOctaves, terrainFlatRadius, edgeWallHeight } = this.config;

    const noise = seedNoise(seed);
    const data: number[][] = [];
    const halfSize = terrainSize / 2;
    const step = terrainSize / (terrainSegments - 1);

    for (let i = 0; i < terrainSegments; i++) {
      data[i] = [];
      for (let j = 0; j < terrainSegments; j++) {
        const worldX = -halfSize + j * step;
        const worldZ = -halfSize + i * step;

        // Fractal noise
        let height = 0;
        let amplitude = 1;
        let frequency = terrainNoiseScale;
        for (let o = 0; o < terrainNoiseOctaves; o++) {
          height += noise(worldX * frequency, worldZ * frequency) * amplitude;
          amplitude *= 0.5;
          frequency *= 2;
        }
        height *= terrainMaxHeight;

        // Flatten spawn area with smooth falloff
        const dist = Math.sqrt(worldX * worldX + worldZ * worldZ);
        if (dist < terrainFlatRadius) {
          const t = dist / terrainFlatRadius;
          const blend = t * t * (3 - 2 * t); // smoothstep
          height *= blend;
        }

        // Raise edges to form natural bowl boundary
        const edgeDist = Math.max(
          Math.abs(worldX) / halfSize,
          Math.abs(worldZ) / halfSize,
        );
        if (edgeDist > 0.85) {
          const edgeT = (edgeDist - 0.85) / 0.15;
          height += edgeT * edgeT * edgeWallHeight;
        }

        data[i][j] = height;
      }
    }
    return data;
  }

  private createMesh(): THREE.Mesh {
    const { terrainSize, terrainSegments, terrainMaxHeight, colors } = this.config;

    const geo = new THREE.PlaneGeometry(
      terrainSize,
      terrainSize,
      terrainSegments - 1,
      terrainSegments - 1,
    );

    // Rotate plane to XZ
    geo.rotateX(-Math.PI / 2);

    // Displace vertices by heightmap
    const positions = geo.attributes.position;
    for (let i = 0; i < terrainSegments; i++) {
      for (let j = 0; j < terrainSegments; j++) {
        const vertexIndex = i * terrainSegments + j;
        positions.setY(vertexIndex, this.heightData[i][j]);
      }
    }

    geo.computeVertexNormals();

    // Vertex colors based on height
    const colorArray = new Float32Array(positions.count * 3);
    const lowColor = new THREE.Color(colors.groundLow);
    const midColor = new THREE.Color(colors.groundMid);
    const highColor = new THREE.Color(colors.groundHigh);

    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const t = Math.max(0, Math.min(1, y / Math.max(terrainMaxHeight, 1)));
      let color: THREE.Color;
      if (t < 0.4) {
        color = lowColor.clone().lerp(midColor, t / 0.4);
      } else {
        color = midColor.clone().lerp(highColor, (t - 0.4) / 0.6);
      }
      colorArray[i * 3] = color.r;
      colorArray[i * 3 + 1] = color.g;
      colorArray[i * 3 + 2] = color.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

    const mat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    return mesh;
  }

  getHeightAt(x: number, z: number): number {
    const { terrainSize, terrainSegments } = this.config;
    const halfSize = terrainSize / 2;
    const step = terrainSize / (terrainSegments - 1);
    const i = (z + halfSize) / step;
    const j = (x + halfSize) / step;

    const i0 = Math.floor(Math.max(0, Math.min(i, terrainSegments - 2)));
    const j0 = Math.floor(Math.max(0, Math.min(j, terrainSegments - 2)));
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
