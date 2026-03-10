/**
 * Collision sound effects using Web Audio API.
 * Detects sudden velocity changes on the chassis body each frame
 * and plays synthesized impact sounds scaled by the deceleration magnitude.
 * This is more reliable than cannon-es contact events.
 */
import * as CANNON from 'cannon-es';

export class CollisionSound {
  private ctx: AudioContext | null = null;
  private chassisBody: CANNON.Body | null = null;
  private lastSoundTime = 0;
  private prevVelocity = new CANNON.Vec3();
  private initialized = false;

  // Minimum sudden speed change (m/s) to trigger sound
  private static readonly MIN_DELTA_V = 3;
  // Maps delta-v to 0–1 intensity
  private static readonly MAX_DELTA_V = 25;
  // Minimum seconds between collision sounds
  private static readonly COOLDOWN = 0.12;

  init(chassisBody: CANNON.Body) {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.chassisBody = chassisBody;
    this.prevVelocity.copy(chassisBody.velocity);
    this.initialized = true;
  }

  /** Call each frame after physics step */
  update() {
    if (!this.ctx || !this.chassisBody || !this.initialized) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Compute velocity change this frame
    const vel = this.chassisBody.velocity;
    const dx = vel.x - this.prevVelocity.x;
    const dy = vel.y - this.prevVelocity.y;
    const dz = vel.z - this.prevVelocity.z;
    const deltaV = Math.sqrt(dx * dx + dy * dy + dz * dz);

    this.prevVelocity.copy(vel);

    if (deltaV < CollisionSound.MIN_DELTA_V) return;

    const now = this.ctx.currentTime;
    if (now - this.lastSoundTime < CollisionSound.COOLDOWN) return;

    const intensity = Math.min(
      (deltaV - CollisionSound.MIN_DELTA_V) /
        (CollisionSound.MAX_DELTA_V - CollisionSound.MIN_DELTA_V),
      1
    );

    this.playImpact(intensity);
    this.lastSoundTime = now;
  }

  private playImpact(intensity: number) {
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = 0.12 + intensity * 0.2;

    // Master gain for this hit
    const hitGain = this.ctx.createGain();
    hitGain.gain.setValueAtTime(intensity * 0.4, now);
    hitGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    hitGain.connect(this.ctx.destination);

    // Low thud: short sine burst with pitch drop
    const thud = this.ctx.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(80 + intensity * 40, now);
    thud.frequency.exponentialRampToValueAtTime(30, now + 0.1);
    const thudGain = this.ctx.createGain();
    thudGain.gain.setValueAtTime(0.8, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    thud.connect(thudGain);
    thudGain.connect(hitGain);
    thud.start(now);
    thud.stop(now + duration + 0.05);

    // Metallic crunch: filtered noise burst
    const bufferLen = Math.floor(this.ctx.sampleRate * 0.15);
    const noiseBuffer = this.ctx.createBuffer(1, bufferLen, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferLen * 0.15));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 800 + intensity * 1200;
    bandpass.Q.value = 1.5;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(intensity * 0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08 + intensity * 0.1);

    noise.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(hitGain);
    noise.start(now);
    noise.stop(now + duration + 0.05);
  }

  dispose() {
    this.chassisBody = null;
    this.initialized = false;
    this.ctx?.close();
    this.ctx = null;
  }
}
