// === TERRAIN ===
export const TERRAIN_SIZE = 1500;
export const TERRAIN_SEGMENTS = 384;
export const TERRAIN_MAX_HEIGHT = 15;
export const TERRAIN_NOISE_SCALE = 0.006;
export const TERRAIN_NOISE_OCTAVES = 4;
export const TERRAIN_FLAT_RADIUS = 30;

// === PHYSICS ===
export const GRAVITY = -9.82;
export const PHYSICS_TIMESTEP = 1 / 60;

// === VEHICLE ===
export const VEHICLE_MASS = 2500;
export const VEHICLE_CHASSIS_WIDTH = 2.1;
export const VEHICLE_CHASSIS_HEIGHT = 0.5;
export const VEHICLE_CHASSIS_LENGTH = 5.8;

export const WHEEL_RADIUS = 0.42;
export const SUSPENSION_STIFFNESS = 55;
export const SUSPENSION_DAMPING = 4.4;
export const SUSPENSION_COMPRESSION = 2.3;
export const SUSPENSION_REST_LENGTH = 0.35;
export const MAX_SUSPENSION_FORCE = 100000;

export const ENGINE_FORCE = 10000;
export const BRAKE_FORCE = 4000;
export const REVERSE_FORCE = 4000;
export const MAX_REVERSE_SPEED_KMH = 30;
export const MAX_STEER_ANGLE = Math.PI / 6;
export const STEER_SPEED = 3.0;

// === CAMERA ===
export const CAMERA_DISTANCE = 12;
export const CAMERA_HEIGHT = 5;
export const CAMERA_LOOK_AHEAD = 8;
export const CAMERA_LERP_POSITION = 5;
export const CAMERA_LERP_LOOKAT = 8;

// === ENVIRONMENT ===
export const TREE_COUNT = 800;
export const ROCK_COUNT = 400;

// === COLORS ===
export const COLORS = {
  skyTop: 0x4488cc,
  skyHorizon: 0xaaccee,
  sunColor: 0xffffdd,
  grassGreen: 0x4a7a3a,
  grassDark: 0x3a6a2a,
  dirtBrown: 0x8b7355,
  rockGray: 0x888888,
  treeTrunk: 0x664422,
  treeLeaves: 0x337733,
  fogColor: 0xccddee,
};

// === TRUCK DIMENSIONS (for fallback model) ===
export const TRUCK_LENGTH = 5.8;
export const TRUCK_WIDTH = 2.1;
export const TRUCK_HEIGHT = 1.9;

// === GAME STATE ===
export const GameState = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  CAR_PICKER: 'CAR_PICKER',
} as const;

export type GameState = (typeof GameState)[keyof typeof GameState];

export interface GameCallbacks {
  onSpeedUpdate: (speedKmh: number) => void;
  onStateChange: (state: GameState) => void;
  onMenuIndexChange?: (index: number) => void;
  onCarPickerIndexChange?: (index: number) => void;
  onStartCarChange?: (carIndex: number) => void;
}
