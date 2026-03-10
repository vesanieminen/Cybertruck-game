import * as CANNON from 'cannon-es';
import { GRAVITY, PHYSICS_TIMESTEP, TERRAIN_SIZE, TERRAIN_SEGMENTS } from './constants';

export class PhysicsWorld {
  public world: CANNON.World;
  public groundBody: CANNON.Body | null = null;
  public groundMaterial: CANNON.Material;

  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, GRAVITY, 0);
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    (this.world.solver as CANNON.GSSolver).iterations = 20;

    this.groundMaterial = new CANNON.Material('ground');

    const wheelMaterial = new CANNON.Material('wheel');
    const wheelGroundContact = new CANNON.ContactMaterial(
      wheelMaterial,
      this.groundMaterial,
      {
        friction: 0.8,
        restitution: 0.05,
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 3,
      }
    );
    this.world.addContactMaterial(wheelGroundContact);
    this.world.defaultContactMaterial.friction = 0.5;
  }

  createGroundFromHeightmap(heightData: number[][]) {
    // cannon-es Heightfield: data[i][j] where i=row (X axis), j=col (Z axis in world)
    // We need to transpose our heightData because it's indexed [row(Z)][col(X)]
    const rows = heightData.length;
    const cols = heightData[0].length;

    // cannon-es Heightfield after -PI/2 X rotation:
    // data[i] spans world X, data[i][j] spans world -Z (j=0 maps to +Z side)
    // Three.js heightData[row][col]: row spans Z (-half to +half), col spans X (-half to +half)
    // So cannonData[i][j] should = heightData[rows-1-j][i] to flip Z
    const cannonData: number[][] = [];
    for (let i = 0; i < cols; i++) {
      cannonData[i] = [];
      for (let j = 0; j < rows; j++) {
        cannonData[i][j] = heightData[rows - 1 - j][i];
      }
    }

    const elementSize = TERRAIN_SIZE / (TERRAIN_SEGMENTS - 1);
    const shape = new CANNON.Heightfield(cannonData, { elementSize });

    this.groundBody = new CANNON.Body({ mass: 0, material: this.groundMaterial });
    this.groundBody.addShape(shape);

    // Heightfield in cannon-es: data[i] along local X, data[i][j] along local Y
    // Height is along local Z. We need to rotate so local Z becomes world Y.
    this.groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

    // Position so the terrain is centered at the world origin
    this.groundBody.position.set(
      -TERRAIN_SIZE / 2,
      0,
      TERRAIN_SIZE / 2
    );

    this.world.addBody(this.groundBody);
  }

  step(delta: number) {
    this.world.step(PHYSICS_TIMESTEP, delta, 10);
  }
}
