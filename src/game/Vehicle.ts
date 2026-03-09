import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { CybertruckModel } from './CybertruckModel';
import type { InputState } from './InputHandler';
import {
  VEHICLE_MASS,
  VEHICLE_CHASSIS_WIDTH,
  VEHICLE_CHASSIS_HEIGHT,
  VEHICLE_CHASSIS_LENGTH,
  WHEEL_RADIUS,
  SUSPENSION_STIFFNESS,
  SUSPENSION_DAMPING,
  SUSPENSION_COMPRESSION,
  SUSPENSION_REST_LENGTH,
  MAX_SUSPENSION_FORCE,
  ENGINE_FORCE,
  BRAKE_FORCE,
  MAX_STEER_ANGLE,
  STEER_SPEED,
  REVERSE_FORCE,
} from './constants';

export class Vehicle {
  public chassisBody: CANNON.Body;
  public raycastVehicle: CANNON.RaycastVehicle;
  public model: CybertruckModel;

  // Wheel visuals (separate from model, synced to physics)
  public wheelGroup: THREE.Group;
  private wheelMeshes: THREE.Mesh[] = [];

  // Debug visualization
  public debugGroup: THREE.Group;
  private debugChassis: THREE.LineSegments;
  private debugWheels: THREE.Mesh[] = [];
  private debugEnabled = false;

  private currentSteer = 0;

  constructor(world: CANNON.World) {
    // Chassis physics body — centered at body origin
    const chassisShape = new CANNON.Box(
      new CANNON.Vec3(
        VEHICLE_CHASSIS_WIDTH / 2,
        VEHICLE_CHASSIS_HEIGHT / 2,
        VEHICLE_CHASSIS_LENGTH / 2
      )
    );

    this.chassisBody = new CANNON.Body({ mass: VEHICLE_MASS });
    this.chassisBody.addShape(chassisShape);
    this.chassisBody.position.set(0, 4, 0); // Spawn above terrain
    this.chassisBody.angularDamping = 0.4;
    this.chassisBody.linearDamping = 0.05;

    // RaycastVehicle: +Z is forward
    this.raycastVehicle = new CANNON.RaycastVehicle({
      chassisBody: this.chassisBody,
      indexRightAxis: 0,
      indexUpAxis: 1,
      indexForwardAxis: 2,
    });

    // Wheel connection points — at bottom of chassis, offset outward
    const wheelX = VEHICLE_CHASSIS_WIDTH / 2 + 0.1;
    const wheelY = -VEHICLE_CHASSIS_HEIGHT / 2; // Bottom of chassis
    const frontZ = VEHICLE_CHASSIS_LENGTH / 2 - 0.8;
    const rearZ = -(VEHICLE_CHASSIS_LENGTH / 2 - 0.8);

    const wheelPositions = [
      new CANNON.Vec3(-wheelX, wheelY, frontZ),  // front-left
      new CANNON.Vec3(wheelX, wheelY, frontZ),   // front-right
      new CANNON.Vec3(-wheelX, wheelY, rearZ),   // rear-left
      new CANNON.Vec3(wheelX, wheelY, rearZ),    // rear-right
    ];

    for (let i = 0; i < wheelPositions.length; i++) {
      this.raycastVehicle.addWheel({
        radius: WHEEL_RADIUS,
        directionLocal: new CANNON.Vec3(0, -1, 0),
        axleLocal: new CANNON.Vec3(-1, 0, 0),
        suspensionStiffness: SUSPENSION_STIFFNESS,
        suspensionRestLength: SUSPENSION_REST_LENGTH,
        dampingRelaxation: SUSPENSION_DAMPING,
        dampingCompression: SUSPENSION_COMPRESSION,
        maxSuspensionForce: MAX_SUSPENSION_FORCE,
        frictionSlip: 5.0,
        chassisConnectionPointLocal: wheelPositions[i],
        isFrontWheel: i < 2,
      });
    }

    this.raycastVehicle.addToWorld(world);

    // Visual model
    this.model = new CybertruckModel();

    // Wheel visuals — individual meshes synced to physics wheel transforms
    this.wheelGroup = new THREE.Group();
    const wheelVisualGeo = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.3, 16);
    wheelVisualGeo.rotateZ(Math.PI / 2); // align cylinder axis with X (axle)
    const wheelVisualMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    for (let i = 0; i < 4; i++) {
      const wMesh = new THREE.Mesh(wheelVisualGeo, wheelVisualMat);
      wMesh.castShadow = true;
      this.wheelGroup.add(wMesh);
      this.wheelMeshes.push(wMesh);
    }

    // Debug wireframes
    this.debugGroup = new THREE.Group();
    this.debugGroup.visible = false;

    // Chassis wireframe box
    const chassisGeo = new THREE.BoxGeometry(
      VEHICLE_CHASSIS_WIDTH,
      VEHICLE_CHASSIS_HEIGHT,
      VEHICLE_CHASSIS_LENGTH
    );
    const chassisEdges = new THREE.EdgesGeometry(chassisGeo);
    this.debugChassis = new THREE.LineSegments(
      chassisEdges,
      new THREE.LineBasicMaterial({ color: 0x00ff00 })
    );
    this.debugGroup.add(this.debugChassis);

    // Wheel debug spheres
    const wheelGeo = new THREE.SphereGeometry(WHEEL_RADIUS, 8, 6);
    const wheelEdges = new THREE.EdgesGeometry(wheelGeo);
    for (let i = 0; i < 4; i++) {
      const wheelWire = new THREE.LineSegments(
        wheelEdges,
        new THREE.LineBasicMaterial({ color: 0xffff00 })
      );
      this.debugGroup.add(wheelWire);
      this.debugWheels.push(wheelWire as any);
    }

    // Forward direction arrow
    const arrowGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 3),
    ]);
    const arrow = new THREE.Line(
      arrowGeo,
      new THREE.LineBasicMaterial({ color: 0xff0000 })
    );
    arrow.name = 'forwardArrow';
    this.debugGroup.add(arrow);
  }

  update(delta: number, input: InputState) {
    // Smooth steering
    let targetSteer = 0;
    if (input.left) targetSteer = MAX_STEER_ANGLE;
    if (input.right) targetSteer = -MAX_STEER_ANGLE;

    const steerLerp = 1 - Math.exp(-STEER_SPEED * delta);
    this.currentSteer += (targetSteer - this.currentSteer) * steerLerp;

    // Apply steering to front wheels
    this.raycastVehicle.setSteeringValue(this.currentSteer, 0);
    this.raycastVehicle.setSteeringValue(this.currentSteer, 1);

    // Drive logic: W brakes if reversing, then accelerates forward.
    //              S brakes if going forward, then accelerates backward.
    let engineForce = 0;
    let brakeForce = 0;
    const fwd = this.getForwardSpeed(); // m/s, positive = forward

    if (input.accelerate && !input.brake) {
      if (fwd < -0.5) {
        brakeForce = BRAKE_FORCE;
      } else {
        engineForce = -ENGINE_FORCE;
      }
    } else if (input.brake && !input.accelerate) {
      if (fwd > 0.5) {
        brakeForce = BRAKE_FORCE;
      } else {
        engineForce = REVERSE_FORCE;
      }
    } else if (!input.accelerate && !input.brake) {
      brakeForce = 200;
    }

    this.raycastVehicle.applyEngineForce(engineForce, 2);
    this.raycastVehicle.applyEngineForce(engineForce, 3);
    for (let i = 0; i < 4; i++) {
      this.raycastVehicle.setBrake(brakeForce, i);
    }

    // Sync visual to physics
    this.syncVisual();
  }

  // Visual model offset: chassis center is wheelRadius + suspensionRest + chassisHalfHeight above ground
  private static readonly VISUAL_OFFSET_Y =
    VEHICLE_CHASSIS_HEIGHT / 2 + SUSPENSION_REST_LENGTH + WHEEL_RADIUS;

  private syncVisual() {
    const pos = this.chassisBody.position;
    const quat = this.chassisBody.quaternion;

    // Offset model down so the visual wheels sit on the ground
    const offsetY = Vehicle.VISUAL_OFFSET_Y;
    const downLocal = new THREE.Vector3(0, -offsetY, 0);
    downLocal.applyQuaternion(
      new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w)
    );

    this.model.group.position.set(
      pos.x + downLocal.x,
      pos.y + downLocal.y,
      pos.z + downLocal.z
    );
    this.model.group.quaternion.set(quat.x, quat.y, quat.z, quat.w);

    // Update wheel visuals from physics (includes steering + spin)
    for (let i = 0; i < 4; i++) {
      this.raycastVehicle.updateWheelTransform(i);
      const t = this.raycastVehicle.wheelInfos[i].worldTransform;
      this.wheelMeshes[i].position.set(t.position.x, t.position.y, t.position.z);
      this.wheelMeshes[i].quaternion.set(
        t.quaternion.x, t.quaternion.y, t.quaternion.z, t.quaternion.w
      );
    }

    // Update debug wireframes (these show TRUE physics positions)
    if (this.debugGroup.visible) {
      this.debugChassis.position.set(pos.x, pos.y, pos.z);
      this.debugChassis.quaternion.set(quat.x, quat.y, quat.z, quat.w);

      for (let i = 0; i < 4; i++) {
        const wi = this.raycastVehicle.wheelInfos[i];
        if (wi.worldTransform) {
          const wp = wi.worldTransform.position;
          this.debugWheels[i].position.set(wp.x, wp.y, wp.z);
        }
      }
    }
  }

  reset() {
    const pos = this.chassisBody.position;
    // Keep XZ, raise Y to 4 above current position
    this.chassisBody.position.set(pos.x, pos.y + 4, pos.z);
    this.chassisBody.quaternion.set(0, 0, 0, 1);
    this.chassisBody.velocity.set(0, 0, 0);
    this.chassisBody.angularVelocity.set(0, 0, 0);
    this.currentSteer = 0;
  }

  toggleDebug(): boolean {
    this.debugEnabled = !this.debugEnabled;
    this.debugGroup.visible = this.debugEnabled;
    return this.debugEnabled;
  }

  /** Signed forward speed in m/s (positive = forward, negative = backward) */
  getForwardSpeed(): number {
    const vel = this.chassisBody.velocity;
    // Truck forward is +Z in local space — get world forward
    const forward = new CANNON.Vec3(0, 0, 1);
    this.chassisBody.quaternion.vmult(forward, forward);
    return vel.x * forward.x + vel.y * forward.y + vel.z * forward.z;
  }

  getSpeedKmh(): number {
    return Math.abs(this.getForwardSpeed()) * 3.6;
  }

  getPosition(): THREE.Vector3 {
    const p = this.chassisBody.position;
    return new THREE.Vector3(p.x, p.y, p.z);
  }

  getQuaternion(): THREE.Quaternion {
    const q = this.chassisBody.quaternion;
    return new THREE.Quaternion(q.x, q.y, q.z, q.w);
  }
}
