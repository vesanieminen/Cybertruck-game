import * as THREE from 'three';
import { PhysicsWorld } from './PhysicsWorld';
import { Terrain } from './Terrain';
import { Vehicle } from './Vehicle';
import { NatureEnvironment } from './NatureEnvironment';
import { ChaseCamera } from './ChaseCamera';
import { InputHandler } from './InputHandler';
import { StuntStructures } from './StuntStructures';
import { EVSound } from './EVSound';
import { CollisionSound } from './CollisionSound';
import { GameState, COLORS } from './constants';
import type { GameCallbacks } from './constants';

export class CybertruckGame {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private clock: THREE.Clock;
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver;
  private container: HTMLElement;

  private physics!: PhysicsWorld;
  private terrain!: Terrain;
  private vehicle!: Vehicle;
  private environment!: NatureEnvironment;
  private chaseCamera: ChaseCamera;
  private input: InputHandler;
  private evSound: EVSound;
  private collisionSound: CollisionSound;

  private state: GameState = GameState.MENU;
  private callbacks: GameCallbacks;
  private seed: number;
  private pauseMenuIndex = 0;
  private static readonly PAUSE_MENU_ITEMS = 2; // Resume, New World

  constructor(container: HTMLElement, callbacks: GameCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.clock = new THREE.Clock(false);
    this.seed = Math.floor(Math.random() * 2147483647);

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

    // Camera
    this.chaseCamera = new ChaseCamera(
      container.clientWidth / container.clientHeight
    );

    // Input
    this.input = new InputHandler();

    // Sound
    this.evSound = new EVSound();
    this.collisionSound = new CollisionSound();

    // Build the world
    this.buildWorld();

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        if (this.state === GameState.PLAYING) this.pause();
        else if (this.state === GameState.PAUSED) this.resume();
      }
      if (this.state === GameState.PLAYING) {
        if (e.code === 'KeyG') this.vehicle.cycleDebug();
        if (e.code === 'KeyR') this.vehicle.reset();
        if (e.code === 'KeyC') this.chaseCamera.cycleMode();
      }
    });

    // Resize
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    // Start render loop
    this.renderLoop();
  }

  private buildWorld() {
    this.scene.background = new THREE.Color(COLORS.fogColor);
    this.scene.fog = new THREE.Fog(COLORS.fogColor, 400, 1000);

    // Terrain
    this.terrain = new Terrain(this.scene, this.seed);

    // Physics
    this.physics = new PhysicsWorld();
    this.physics.createGroundFromHeightmap(this.terrain.heightData);

    // Vehicle
    this.vehicle = new Vehicle(this.physics.world);
    this.vehicle.setTerrain(this.terrain);
    this.scene.add(this.vehicle.model.group);
    this.scene.add(this.vehicle.wheelGroup);
    this.scene.add(this.vehicle.debugGroup);

    // Environment (sky, trees, rocks, lighting)
    this.environment = new NatureEnvironment(this.scene, this.terrain, this.physics.world, this.seed);

    // Stunt structures
    new StuntStructures(this.scene, this.terrain, this.physics.world, this.physics.groundMaterial, this.seed);
  }

  private clearScene() {
    while (this.scene.children.length > 0) {
      const child = this.scene.children[0];
      this.scene.remove(child);
      // Dispose geometry and materials
      child.traverse((obj: THREE.Object3D) => {
        if ((obj as THREE.Mesh).geometry) {
          (obj as THREE.Mesh).geometry.dispose();
        }
        if ((obj as THREE.Mesh).material) {
          const mat = (obj as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else mat.dispose();
        }
      });
    }
  }

  private renderLoop() {
    this.animationFrameId = requestAnimationFrame(() => this.renderLoop());

    // Always poll input (needed for gamepad menu/pause support)
    this.input.poll();

    // Gamepad Start/A button starts the game from menu
    if (this.state === GameState.MENU) {
      if (this.input.actions.start || this.input.actions.reset) {
        this.start();
      }
    }

    // Gamepad Start button toggles pause
    if (this.state === GameState.PLAYING && this.input.actions.start) {
      this.pause();
    } else if (this.state === GameState.PAUSED && this.input.actions.start) {
      this.resume();
    }

    // Gamepad pause menu navigation
    if (this.state === GameState.PAUSED) {
      if (this.input.actions.menuUp) {
        this.pauseMenuIndex = (this.pauseMenuIndex - 1 + CybertruckGame.PAUSE_MENU_ITEMS) % CybertruckGame.PAUSE_MENU_ITEMS;
        this.callbacks.onMenuIndexChange?.(this.pauseMenuIndex);
      }
      if (this.input.actions.menuDown) {
        this.pauseMenuIndex = (this.pauseMenuIndex + 1) % CybertruckGame.PAUSE_MENU_ITEMS;
        this.callbacks.onMenuIndexChange?.(this.pauseMenuIndex);
      }
      if (this.input.actions.menuSelect) {
        if (this.pauseMenuIndex === 0) this.resume();
        else if (this.pauseMenuIndex === 1) this.regenerateWorld();
      }
    }

    if (this.state === GameState.PLAYING) {
      const delta = Math.min(this.clock.getDelta(), 0.05);

      // Gamepad action buttons
      if (this.input.actions.reset) this.vehicle.reset();
      if (this.input.actions.debug) this.vehicle.cycleDebug();
      if (this.input.actions.camera) this.chaseCamera.cycleMode();

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

      // Sound
      this.evSound.update(
        this.vehicle.getSpeedKmh(),
        this.input.state.accelerate
      );
      this.collisionSound.update();

      // HUD
      this.callbacks.onSpeedUpdate(Math.floor(this.vehicle.getSpeedKmh()));
    }

    this.renderer.render(this.scene, this.chaseCamera.camera);
  }

  start() {
    this.evSound.init();
    this.collisionSound.init(this.vehicle.chassisBody);
    this.state = GameState.PLAYING;
    this.clock.start();
    this.callbacks.onStateChange(GameState.PLAYING);
  }

  pause() {
    this.state = GameState.PAUSED;
    this.clock.stop();
    this.evSound.mute();
    this.pauseMenuIndex = 0;
    this.callbacks.onStateChange(GameState.PAUSED);
    this.callbacks.onMenuIndexChange?.(0);
  }

  resume() {
    this.state = GameState.PLAYING;
    this.clock.start();
    // Flush accumulated delta
    this.clock.getDelta();
    this.callbacks.onStateChange(GameState.PLAYING);
  }

  regenerateWorld() {
    this.collisionSound.dispose();
    this.clearScene();
    this.seed = Math.floor(Math.random() * 2147483647);
    this.buildWorld();
    this.collisionSound = new CollisionSound();
    this.collisionSound.init(this.vehicle.chassisBody);
    this.resume();
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
    this.evSound.dispose();
    this.collisionSound.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
