/**
 * Synthesized EV motor hum using Web Audio API.
 * Smooth sine-wave layers with a low-pass filter produce a gentle,
 * realistic electric motor sound that rises in pitch with speed.
 */
export class EVSound {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private oscillators: { osc: OscillatorNode; gain: GainNode }[] = [];
  private started = false;

  // Gentle frequency range — stays in the pleasant low-mid register
  private static readonly BASE_FREQ = 55; // Hz at 0 km/h (low A)
  private static readonly MAX_FREQ = 220; // Hz at top speed (A3 — still warm)
  private static readonly MAX_SPEED = 180; // km/h for full pitch

  // Sine-wave layers: close harmonics for a smooth, warm tone
  private static readonly LAYERS = [
    { mult: 1.0, vol: 0.30, type: 'sine' as OscillatorType },
    { mult: 1.5, vol: 0.10, type: 'sine' as OscillatorType }, // perfect fifth — musical
    { mult: 2.0, vol: 0.15, type: 'sine' as OscillatorType }, // octave
    { mult: 3.0, vol: 0.04, type: 'triangle' as OscillatorType }, // gentle upper shimmer
  ];

  /** Call once on first user interaction (e.g. clicking DRIVE) */
  init() {
    if (this.ctx) return;

    this.ctx = new AudioContext();

    // Low-pass filter to keep everything warm
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 400;
    this.filter.Q.value = 0.7;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0;

    this.filter.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    for (const layer of EVSound.LAYERS) {
      const osc = this.ctx.createOscillator();
      osc.type = layer.type;
      osc.frequency.value = EVSound.BASE_FREQ * layer.mult;

      const gain = this.ctx.createGain();
      gain.gain.value = layer.vol;

      osc.connect(gain);
      gain.connect(this.filter);
      osc.start();

      this.oscillators.push({ osc, gain });
    }

    this.started = true;
  }

  /** Call every frame with current speed in km/h and throttle state */
  update(speedKmh: number, isAccelerating: boolean) {
    if (!this.ctx || !this.masterGain || !this.filter || !this.started) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const t = Math.min(speedKmh / EVSound.MAX_SPEED, 1);
    const baseFreq =
      EVSound.BASE_FREQ + (EVSound.MAX_FREQ - EVSound.BASE_FREQ) * t;

    const now = this.ctx.currentTime;

    // Update oscillator frequencies with smooth ramp
    for (let i = 0; i < this.oscillators.length; i++) {
      const { osc } = this.oscillators[i];
      const targetFreq = baseFreq * EVSound.LAYERS[i].mult;
      osc.frequency.setTargetAtTime(targetFreq, now, 0.08);
    }

    // Open the filter as speed increases (brighter at high speed)
    const filterFreq = 300 + t * 500;
    this.filter.frequency.setTargetAtTime(filterFreq, now, 0.1);

    // Volume: gentle curve, slightly louder under throttle
    const speedVol = t * 0.25;
    const accelBoost = isAccelerating ? 0.12 : 0;
    const targetVol = Math.min(speedVol + accelBoost, 0.30);
    this.masterGain.gain.setTargetAtTime(targetVol, now, 0.15);
  }

  /** Mute immediately (e.g. when pausing) */
  mute() {
    if (!this.masterGain || !this.ctx) return;
    this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
  }

  /** Resume from mute */
  unmute() {
    // Volume will be set by next update() call
  }

  dispose() {
    for (const { osc } of this.oscillators) {
      osc.stop();
    }
    this.oscillators = [];
    this.ctx?.close();
    this.ctx = null;
    this.masterGain = null;
    this.filter = null;
    this.started = false;
  }
}
