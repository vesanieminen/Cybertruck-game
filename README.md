# Cybertruck Open-World Driving Game

A free-roaming 3D driving game featuring a Tesla Cybertruck on procedurally generated low-poly terrain. Built with Three.js and cannon-es physics.

## Controls

| Key | Action |
|-----|--------|
| W / Arrow Up | Accelerate |
| S / Arrow Down | Brake / Reverse |
| A / Arrow Left | Steer left |
| D / Arrow Right | Steer right |
| C | Cycle camera (close, cockpit, far) |
| R | Reset / flip car upright |
| G | Toggle debug wireframes |

## Features

- Procedurally generated terrain with Perlin noise (low-poly flat-shaded style)
- Realistic vehicle physics with suspension, steering, and rear-wheel drive
- Trees and rocks with physics colliders
- Stunt structures: jump ramps, elevated platforms, half-pipe, spiral ramp tower
- Three camera modes: close chase, cockpit, and far chase
- Dynamic shadows that follow the vehicle
- Speedometer HUD

## Tech Stack

- [Three.js](https://threejs.org/) - 3D rendering
- [cannon-es](https://github.com/pmndrs/cannon-es) - Physics engine (RaycastVehicle, Heightfield, Trimesh)
- [Vite](https://vitejs.dev/) - Build tool
- TypeScript

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Build

```bash
npm run build
```

Output goes to `dist/`.

## Project Structure

```
src/game/
  CybertruckGame.ts    - Main game orchestrator
  Vehicle.ts           - RaycastVehicle physics + visual sync
  ChaseCamera.ts       - Third-person camera with 3 modes
  Terrain.ts           - Procedural heightmap terrain
  PhysicsWorld.ts      - cannon-es world + heightfield ground
  NatureEnvironment.ts - Sky, lighting, trees, rocks
  StuntStructures.ts   - Ramps, platforms, half-pipe, spiral tower
  CybertruckModel.ts   - FBX model loader with fallback
  InputHandler.ts      - Keyboard input (WASD / arrows)
  constants.ts         - All tunable game parameters
  noise.ts             - Perlin noise for terrain generation
```
