import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { mulberry32 } from './noise';
import type { Terrain } from './Terrain';
import type { WorldConfig } from './WorldConfig';

export class CityStructures {
  constructor(
    scene: THREE.Scene,
    terrain: Terrain,
    world: CANNON.World,
    groundMaterial: CANNON.Material,
    seed: number,
    config: WorldConfig,
  ) {
    const rng = mulberry32(seed + 42424);
    const style = config.buildingStyle ?? 'downtown';
    const count = config.buildingCount ?? 100;
    const terrainSize = config.terrainSize;

    const gridSpacing = style === 'downtown' ? 30 : 50;
    const streetWidth = style === 'downtown' ? 14 : 22;
    const minHeight = style === 'downtown' ? 20 : 5;
    const maxHeight = style === 'downtown' ? 80 : 20;
    const minWidth = style === 'downtown' ? 10 : 8;
    const maxWidth = style === 'downtown' ? 22 : 16;

    const halfRange = terrainSize * 0.4;
    const minDist = 50; // keep away from spawn

    // Pre-create a few material color buckets for visual variety
    const materialBuckets: THREE.MeshLambertMaterial[] = [];
    const bucketCount = 6;
    for (let b = 0; b < bucketCount; b++) {
      const brightness = 0.5 + (b / bucketCount) * 0.35;
      const tint = 0.95 + rng() * 0.05; // slight warm/cool variation
      materialBuckets.push(
        new THREE.MeshLambertMaterial({
          color: new THREE.Color(brightness * tint, brightness, brightness * (2 - tint)),
          flatShading: true,
        }),
      );
    }

    // Window accent material (dark horizontal bands)
    const windowMat = new THREE.MeshLambertMaterial({
      color: 0x334455,
      flatShading: true,
    });

    // Grid-based placement
    const gridCols = Math.floor((halfRange * 2) / gridSpacing);
    const occupied = new Set<string>();

    for (let i = 0; i < count; i++) {
      // Pick a grid cell
      let gx = 0, gz = 0, x = 0, z = 0;
      let attempts = 0;
      do {
        gx = Math.floor(rng() * gridCols);
        gz = Math.floor(rng() * gridCols);
        const key = `${gx},${gz}`;
        if (occupied.has(key)) {
          attempts++;
          continue;
        }
        occupied.add(key);

        x = -halfRange + gx * gridSpacing + (rng() - 0.5) * (gridSpacing - streetWidth);
        z = -halfRange + gz * gridSpacing + (rng() - 0.5) * (gridSpacing - streetWidth);
        break;
      } while (attempts < 200);

      if (attempts >= 200) continue; // couldn't find a free cell

      const dist = Math.sqrt(x * x + z * z);
      if (dist < minDist) continue;

      const y = terrain.getHeightAt(x, z);
      const bWidth = minWidth + rng() * (maxWidth - minWidth);
      const bDepth = minWidth + rng() * (maxWidth - minWidth);
      const bHeight = minHeight + rng() * (maxHeight - minHeight);

      const mat = materialBuckets[Math.floor(rng() * bucketCount)];

      // Main building body
      const geo = new THREE.BoxGeometry(bWidth, bHeight, bDepth);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y + bHeight / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      // Physics body
      const shape = new CANNON.Box(
        new CANNON.Vec3(bWidth / 2, bHeight / 2, bDepth / 2),
      );
      const body = new CANNON.Body({ mass: 0, material: groundMaterial });
      body.addShape(shape);
      body.position.set(x, y + bHeight / 2, z);
      world.addBody(body);

      // Window bands for downtown tall buildings
      if (style === 'downtown' && bHeight > 30) {
        const bandCount = Math.floor(bHeight / 8);
        for (let b = 1; b <= bandCount; b++) {
          const bandY = y + b * (bHeight / (bandCount + 1));
          const bandGeo = new THREE.BoxGeometry(
            bWidth + 0.1,
            0.8,
            bDepth + 0.1,
          );
          const band = new THREE.Mesh(bandGeo, windowMat);
          band.position.set(x, bandY, z);
          scene.add(band);
        }
      }
    }
  }
}
