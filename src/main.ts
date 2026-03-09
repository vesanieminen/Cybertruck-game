import './style.css';
import { CybertruckGame } from './game/CybertruckGame';
import { GameState } from './game/constants';

const container = document.getElementById('game-container')!;
const hud = document.getElementById('hud')!;
const startScreen = document.getElementById('start-screen')!;
const startBtn = document.getElementById('start-btn')!;
const speedValue = document.getElementById('speed-value')!;

const game = new CybertruckGame(container, {
  onSpeedUpdate(kmh) {
    speedValue.textContent = String(kmh);
  },
  onStateChange(state) {
    if (state === GameState.PLAYING) {
      startScreen.classList.add('hidden');
      hud.classList.remove('hidden');
    }
  },
});

startBtn.addEventListener('click', () => game.start());

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter') {
    if (!startScreen.classList.contains('hidden')) {
      e.preventDefault();
      game.start();
    }
  }
});
