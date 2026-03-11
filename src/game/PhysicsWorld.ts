import * as CANNON from 'cannon-es';
import { GRAVITY, PHYSICS_TIMESTEP } from './constants';

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
      },
    );
    this.world.addContactMaterial(wheelGroundContact);
    this.world.defaultContactMaterial.friction = 0.5;
  }

  createGroundFromHeightmap(heightData: number[][], terrainSize: number, terrainSegments: number) {
    // cannon-es Heightfield: data[i][j] where i=row (X axis), j=col (Z axis in world)
    // We need to transpose our heightData because it's indexed [row(Z)][col(X)]
    const rows = heightData.length;
    const cols = heightData[0].length;

    const cannonData: number[][] = [];
    for (let i = 0; i < cols; i++) {
      cannonData[i] = [];
      for (let j = 0; j < rows; j++) {
        cannonData[i][j] = heightData[rows - 1 - j][i];
      }
    }

    const elementSize = terrainSize / (terrainSegments - 1);
    const shape = new CANNON.Heightfield(cannonData, { elementSize });

    this.groundBody = new CANNON.Body({ mass: 0, material: this.groundMaterial });
    this.groundBody.addShape(shape);

    this.groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

    this.groundBody.position.set(
      -terrainSize / 2,
      0,
      terrainSize / 2,
    );

    this.world.addBody(this.groundBody);
  }

  step(delta: number) {
    this.world.step(PHYSICS_TIMESTEP, delta, 10);
  }
}
