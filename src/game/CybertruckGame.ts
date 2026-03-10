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
import { CAR_TYPES } from './VehicleModel';
import type { CarType } from './VehicleModel';

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
  private carType: CarType = 'cybertruck';
  private pauseMenuIndex = 0;
  private carPickerIndex = 0;
  private static readonly PAUSE_MENU_ITEMS = 3; // Resume, Switch Car, New World
  private static readonly CAR_PICKER_ITEMS = CAR_TYPES.length + 1; // cars + Back button

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
        else if (this.state === GameState.CAR_PICKER) this.backFromCarPicker();
      }
      if (this.state === GameState.PLAYING) {
        if (e.code === 'KeyG') this.vehicle.cycleDebug();
        if (e.code === 'KeyR') this.vehicle.reset();
        if (e.code === 'KeyC') this.chaseCamera.cycleMode();
      }
      // Keyboard left/right on start screen to switch car
      if (this.state === GameState.MENU) {
        if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
          e.preventDefault();
          const currentIdx = CAR_TYPES.indexOf(this.carType);
          const dir = e.code === 'ArrowLeft' ? -1 : 1;
          const newIdx = (currentIdx + dir + CAR_TYPES.length) % CAR_TYPES.length;
          this.setCarType(CAR_TYPES[newIdx]);
          this.callbacks.onStartCarChange?.(newIdx);
        }
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
    this.vehicle = new Vehicle(this.physics.world, this.carType);
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

    // === MENU (start screen) ===
    if (this.state === GameState.MENU) {
      // Left/right to cycle car selection
      if (this.input.actions.menuLeft || this.input.actions.menuRight) {
        const currentIdx = CAR_TYPES.indexOf(this.carType);
        const dir = this.input.actions.menuLeft ? -1 : 1;
        const newIdx = (currentIdx + dir + CAR_TYPES.length) % CAR_TYPES.length;
        this.setCarType(CAR_TYPES[newIdx]);
        this.callbacks.onStartCarChange?.(newIdx);
      }
      // A button or Start → begin game
      if (this.input.actions.menuSelect || this.input.actions.start) {
        this.start();
      }
    }

    // === PLAYING ===
    if (this.state === GameState.PLAYING && this.input.actions.start) {
      this.pause();
    }

    // === PAUSED ===
    if (this.state === GameState.PAUSED) {
      if (this.input.actions.start || this.input.actions.menuBack) {
        this.resume();
      }
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
        else if (this.pauseMenuIndex === 1) this.enterCarPicker();
        else if (this.pauseMenuIndex === 2) this.regenerateWorld();
      }
    }

    // === CAR PICKER ===
    if (this.state === GameState.CAR_PICKER) {
      if (this.input.actions.menuBack || this.input.actions.start) {
        this.backFromCarPicker();
      }
      if (this.input.actions.menuUp) {
        this.carPickerIndex = (this.carPickerIndex - 1 + CybertruckGame.CAR_PICKER_ITEMS) % CybertruckGame.CAR_PICKER_ITEMS;
        this.callbacks.onCarPickerIndexChange?.(this.carPickerIndex);
      }
      if (this.input.actions.menuDown) {
        this.carPickerIndex = (this.carPickerIndex + 1) % CybertruckGame.CAR_PICKER_ITEMS;
        this.callbacks.onCarPickerIndexChange?.(this.carPickerIndex);
      }
      if (this.input.actions.menuSelect) {
        if (this.carPickerIndex < CAR_TYPES.length) {
          this.selectCarFromPicker(CAR_TYPES[this.carPickerIndex]);
        } else {
          // Back button
          this.backFromCarPicker();
        }
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

  /** Set car type before starting (called from menu) */
  setCarType(carType: CarType) {
    this.carType = carType;
    // Rebuild the world with the new car
    this.clearScene();
    this.buildWorld();
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

  enterCarPicker() {
    this.state = GameState.CAR_PICKER;
    this.carPickerIndex = 0;
    this.callbacks.onStateChange(GameState.CAR_PICKER);
    this.callbacks.onCarPickerIndexChange?.(0);
  }

  selectCarFromPicker(carType: CarType) {
    this.collisionSound.dispose();
    this.carType = carType;
    this.clearScene();
    this.buildWorld();
    this.collisionSound = new CollisionSound();
    this.collisionSound.init(this.vehicle.chassisBody);
    this.resume();
  }

  backFromCarPicker() {
    this.state = GameState.PAUSED;
    this.pauseMenuIndex = 0;
    this.callbacks.onStateChange(GameState.PAUSED);
    this.callbacks.onMenuIndexChange?.(0);
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
