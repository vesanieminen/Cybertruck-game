import './style.css';
import { CybertruckGame } from './game/CybertruckGame';
import { GameState } from './game/constants';
import { CAR_TYPES } from './game/VehicleModel';
import type { CarType } from './game/VehicleModel';
import { WORLD_IDS } from './game/WorldConfig';
import type { WorldId } from './game/WorldConfig';

const container = document.getElementById('game-container')!;
const hud = document.getElementById('hud')!;
const startScreen = document.getElementById('start-screen')!;
const startBtn = document.getElementById('start-btn')!;
const speedValue = document.getElementById('speed-value')!;
const pauseScreen = document.getElementById('pause-screen')!;
const resumeBtn = document.getElementById('resume-btn')!;
const switchCarBtn = document.getElementById('switch-car-btn')!;
const switchWorldBtn = document.getElementById('switch-world-btn')!;
const newWorldBtn = document.getElementById('new-world-btn')!;
const carPickerScreen = document.getElementById('car-picker-screen')!;
const carPickOptions = document.querySelectorAll<HTMLButtonElement>('.car-pick-option');
const carPickerBackBtn = document.getElementById('car-picker-back-btn')!;
const worldPickerScreen = document.getElementById('world-picker-screen')!;
const worldPickOptions = document.querySelectorAll<HTMLButtonElement>('.world-pick-option');
const worldPickerBackBtn = document.getElementById('world-picker-back-btn')!;
const carOptions = document.querySelectorAll<HTMLButtonElement>('.car-option');
const worldOptions = document.querySelectorAll<HTMLButtonElement>('.world-option');
const titleEl = document.querySelector<HTMLElement>('.title[data-text]')!;
const subtitleEl = document.querySelector<HTMLElement>('.subtitle')!;

// All pause menu buttons in order (must match CybertruckGame.PAUSE_MENU_ITEMS)
const pauseButtons = [resumeBtn, switchCarBtn, switchWorldBtn, newWorldBtn];

// All car picker buttons in order (cars + back, must match CAR_PICKER_ITEMS)
const carPickerButtons: HTMLButtonElement[] = [
  ...Array.from(carPickOptions),
  carPickerBackBtn as HTMLButtonElement,
];

// All world picker buttons in order (worlds + back, must match WORLD_PICKER_ITEMS)
const worldPickerButtons: HTMLButtonElement[] = [
  ...Array.from(worldPickOptions),
  worldPickerBackBtn as HTMLButtonElement,
];

const game = new CybertruckGame(container, {
  onSpeedUpdate(kmh) {
    speedValue.textContent = String(kmh);
  },
  onStateChange(state) {
    // Hide all overlays first
    startScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    carPickerScreen.classList.add('hidden');
    worldPickerScreen.classList.add('hidden');
    hud.classList.add('hidden');

    if (state === GameState.PLAYING) {
      hud.classList.remove('hidden');
    } else if (state === GameState.PAUSED) {
      pauseScreen.classList.remove('hidden');
    } else if (state === GameState.CAR_PICKER) {
      carPickerScreen.classList.remove('hidden');
    } else if (state === GameState.WORLD_PICKER) {
      worldPickerScreen.classList.remove('hidden');
    } else if (state === GameState.MENU) {
      startScreen.classList.remove('hidden');
    }
  },
  onMenuIndexChange(index) {
    pauseButtons.forEach((btn, i) => {
      btn.classList.toggle('focused', i === index);
    });
  },
  onCarPickerIndexChange(index) {
    carPickerButtons.forEach((btn, i) => {
      btn.classList.toggle('focused', i === index);
    });
  },
  onWorldPickerIndexChange(index) {
    worldPickerButtons.forEach((btn, i) => {
      btn.classList.toggle('focused', i === index);
    });
  },
  onStartCarChange(carIndex) {
    // Update start screen car selector to reflect gamepad selection
    const carType = CAR_TYPES[carIndex];
    carOptions.forEach((b) => {
      b.classList.toggle('selected', b.dataset.car === carType);
    });
    // Update title text
    const btn = Array.from(carOptions).find((b) => b.dataset.car === carType);
    const label = btn?.textContent || 'CYBERTRUCK';
    titleEl.textContent = label;
    titleEl.dataset.text = label;
  },
  onStartWorldChange(worldIndex) {
    // Update start screen world selector to reflect gamepad/keyboard selection
    const worldId = WORLD_IDS[worldIndex];
    worldOptions.forEach((b) => {
      b.classList.toggle('selected', b.dataset.world === worldId);
    });
    // Update subtitle text
    const btn = Array.from(worldOptions).find((b) => b.dataset.world === worldId);
    const label = btn?.textContent || 'COUNTRYSIDE';
    subtitleEl.textContent = label;
  },
});

// Start screen car selector (mouse clicks)
carOptions.forEach((btn) => {
  btn.addEventListener('click', () => {
    const carType = btn.dataset.car as CarType;

    // Update selected styling
    carOptions.forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');

    // Update title text
    const label = btn.textContent || 'CYBERTRUCK';
    titleEl.textContent = label;
    titleEl.dataset.text = label;

    // Tell game to switch car
    game.setCarType(carType);
  });
});

// Start screen world selector (mouse clicks)
worldOptions.forEach((btn) => {
  btn.addEventListener('click', () => {
    const worldId = btn.dataset.world as WorldId;

    // Update selected styling
    worldOptions.forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');

    // Update subtitle text
    subtitleEl.textContent = btn.textContent || 'COUNTRYSIDE';

    // Tell game to switch world
    game.setWorldId(worldId);
  });
});

// Car picker screen (mouse clicks on car options)
carPickOptions.forEach((btn) => {
  btn.addEventListener('click', () => {
    const carType = btn.dataset.car as CarType;
    game.selectCarFromPicker(carType);
  });
});

// World picker screen (mouse clicks on world options)
worldPickOptions.forEach((btn) => {
  btn.addEventListener('click', () => {
    const worldId = btn.dataset.world as WorldId;
    game.selectWorldFromPicker(worldId);
  });
});

// Button click handlers
startBtn.addEventListener('click', () => game.start());
resumeBtn.addEventListener('click', () => game.resume());
switchCarBtn.addEventListener('click', () => game.enterCarPicker());
switchWorldBtn.addEventListener('click', () => game.enterWorldPicker());
newWorldBtn.addEventListener('click', () => game.regenerateWorld());
carPickerBackBtn.addEventListener('click', () => game.backFromCarPicker());
worldPickerBackBtn.addEventListener('click', () => game.backFromWorldPicker());

// Keyboard: Space/Enter starts from start screen
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter') {
    if (!startScreen.classList.contains('hidden')) {
      e.preventDefault();
      game.start();
    }
  }
});
