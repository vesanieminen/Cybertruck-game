import * as THREE from 'three';
import { PhysicsWorld } from './PhysicsWorld';
import { Terrain } from './Terrain';
import { Vehicle } from './Vehicle';
import { NatureEnvironment } from './NatureEnvironment';
import { ChaseCamera } from './ChaseCamera';
import { InputHandler } from './InputHandler';
import { StuntStructures } from './StuntStructures';
import { GameState, COLORS } from './constants';
import type { GameCallbacks } from './constants';

export class CybertruckGame {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private clock: THREE.Clock;
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver;
  private container: HTMLElement;

  private physics: PhysicsWorld;
  private terrain: Terrain;
  private vehicle: Vehicle;
  private environment: NatureEnvironment;
  private chaseCamera: ChaseCamera;
  private input: InputHandler;

  private state: GameState = GameState.MENU;
  private callbacks: GameCallbacks;

  constructor(container: HTMLElement, callbacks: GameCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.clock = new THREE.Clock(false);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.fogColor);
    this.scene.fog = new THREE.Fog(COLORS.fogColor, 400, 1000);

    // Terrain
    this.terrain = new Terrain(this.scene);

    // Physics
    this.physics = new PhysicsWorld();
    this.physics.createGroundFromHeightmap(this.terrain.heightData);

    // Vehicle
    this.vehicle = new Vehicle(this.physics.world);
    this.scene.add(this.vehicle.model.group);
    this.scene.add(this.vehicle.wheelGroup);
    this.scene.add(this.vehicle.debugGroup);

    // Environment (sky, trees, rocks, lighting)
    this.environment = new NatureEnvironment(this.scene, this.terrain, this.physics.world);

    // Stunt structures (ramps, platforms, half-pipe, spiral tower)
    new StuntStructures(this.scene, this.terrain, this.physics.world, this.physics.groundMaterial);

    // Camera
    this.chaseCamera = new ChaseCamera(
      container.clientWidth / container.clientHeight
    );

    // Input
    this.input = new InputHandler();

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyG') {
        this.vehicle.cycleDebug();
      }
      if (e.code === 'KeyR') {
        this.vehicle.reset();
      }
      if (e.code === 'KeyC') {
        this.chaseCamera.cycleMode();
      }
    });

    // Resize
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    // Start render loop
    this.renderLoop();
  }

  private renderLoop() {
    this.animationFrameId = requestAnimationFrame(() => this.renderLoop());

    if (this.state === GameState.PLAYING) {
      const delta = Math.min(this.clock.getDelta(), 0.05);

      // Physics
      this.physics.step(delta);

      // Vehicle
      this.vehicle.update(delta, this.input.state);

      // Camera
      this.chaseCamera.update(
        delta,
        this.vehicle.getPosition(),
        this.vehicle.getQuaternion()
      );

      // Sun follows truck for good shadows
      this.environment.updateSunTarget(this.vehicle.getPosition());

      // HUD
      this.callbacks.onSpeedUpdate(Math.floor(this.vehicle.getSpeedKmh()));
    }

    this.renderer.render(this.scene, this.chaseCamera.camera);
  }

  start() {
    this.state = GameState.PLAYING;
    this.clock.start();
    this.callbacks.onStateChange(GameState.PLAYING);
  }

  private handleResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.chaseCamera.handleResize(w / h);
    this.renderer.setSize(w, h);
  }

  dispose() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.resizeObserver.disconnect();
    this.input.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
