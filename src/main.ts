import './style.css';
import { CybertruckGame } from './game/CybertruckGame';
import { GameState } from './game/constants';

const container = document.getElementById('game-container')!;
const hud = document.getElementById('hud')!;
const startScreen = document.getElementById('start-screen')!;
const startBtn = document.getElementById('start-btn')!;
const speedValue = document.getElementById('speed-value')!;
const pauseScreen = document.getElementById('pause-screen')!;
const resumeBtn = document.getElementById('resume-btn')!;
const newWorldBtn = document.getElementById('new-world-btn')!;

const game = new CybertruckGame(container, {
  onSpeedUpdate(kmh) {
    speedValue.textContent = String(kmh);
  },
  onStateChange(state) {
    if (state === GameState.PLAYING) {
      startScreen.classList.add('hidden');
      pauseScreen.classList.add('hidden');
      hud.classList.remove('hidden');
    } else if (state === GameState.PAUSED) {
      pauseScreen.classList.remove('hidden');
      hud.classList.add('hidden');
    }
  },
});

startBtn.addEventListener('click', () => game.start());
resumeBtn.addEventListener('click', () => game.resume());
newWorldBtn.addEventListener('click', () => game.regenerateWorld());

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter') {
    if (!startScreen.classList.contains('hidden')) {
      e.preventDefault();
      game.start();
    }
  }
});
