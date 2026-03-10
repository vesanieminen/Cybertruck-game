export interface InputState {
  left: boolean;
  right: boolean;
  accelerate: boolean;
  brake: boolean;
}

/** One-shot action buttons (fired once per press) */
export interface ActionEvents {
  reset: boolean;
  debug: boolean;
  camera: boolean;
  start: boolean;
}

const GAMEPAD_DEADZONE = 0.15;

export class InputHandler {
  public state: InputState = {
    left: false,
    right: false,
    accelerate: false,
    brake: false,
  };

  /** One-shot actions — true for one frame only, then auto-cleared */
  public actions: ActionEvents = {
    reset: false,
    debug: false,
    camera: false,
    start: false,
  };

  // Keyboard state tracked separately so gamepad can be OR'd in
  private keyState: InputState = {
    left: false,
    right: false,
    accelerate: false,
    brake: false,
  };

  // Track previous gamepad button state for edge detection
  private prevGamepadButtons: boolean[] = [];

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;

  constructor() {
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
  }

  private mapKey(e: KeyboardEvent): keyof InputState | null {
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        return 'left';
      case 'ArrowRight':
      case 'KeyD':
        return 'right';
      case 'ArrowUp':
      case 'KeyW':
        return 'accelerate';
      case 'ArrowDown':
      case 'KeyS':
        return 'brake';
      default:
        return null;
    }
  }

  private onKeyDown(e: KeyboardEvent) {
    const key = this.mapKey(e);
    if (key) {
      e.preventDefault();
      this.keyState[key] = true;
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    const key = this.mapKey(e);
    if (key) {
      e.preventDefault();
      this.keyState[key] = false;
    }
  }

  /** Returns true if button was just pressed this frame (rising edge) */
  private buttonJustPressed(gp: Gamepad, index: number): boolean {
    const curr = gp.buttons[index]?.pressed ?? false;
    const prev = this.prevGamepadButtons[index] ?? false;
    return curr && !prev;
  }

  /** Call once per frame — merges keyboard + gamepad into this.state */
  poll() {
    // Clear one-shot actions from previous frame
    this.actions.reset = false;
    this.actions.debug = false;
    this.actions.camera = false;
    this.actions.start = false;

    // Start from keyboard
    let left = this.keyState.left;
    let right = this.keyState.right;
    let accelerate = this.keyState.accelerate;
    let brake = this.keyState.brake;

    // OR in gamepad
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (!gp || !gp.connected) continue;

      // Left stick X-axis (axis 0) → steer
      const stickX = gp.axes[0] ?? 0;
      if (stickX < -GAMEPAD_DEADZONE) left = true;
      if (stickX > GAMEPAD_DEADZONE) right = true;

      // D-pad left/right (buttons 14/15)
      if (gp.buttons[14]?.pressed) left = true;
      if (gp.buttons[15]?.pressed) right = true;

      // Right trigger (button 7 / R2) → accelerate
      if (gp.buttons[7]?.pressed || (gp.buttons[7]?.value ?? 0) > 0.1) accelerate = true;
      // A button (button 0) → accelerate
      if (gp.buttons[0]?.pressed) accelerate = true;

      // Left trigger (button 6 / L2) → brake
      if (gp.buttons[6]?.pressed || (gp.buttons[6]?.value ?? 0) > 0.1) brake = true;
      // B button (button 1) → brake
      if (gp.buttons[1]?.pressed) brake = true;

      // Action buttons (one-shot, edge-detected)
      // Y button (button 3) → reset
      if (this.buttonJustPressed(gp, 3)) this.actions.reset = true;
      // X button (button 2) → debug mode
      if (this.buttonJustPressed(gp, 2)) this.actions.debug = true;
      // Right bumper (button 5 / R1) → camera cycle
      if (this.buttonJustPressed(gp, 5)) this.actions.camera = true;
      // Start button (button 9) → start game / camera cycle
      if (this.buttonJustPressed(gp, 9)) this.actions.start = true;
      // Select/Back button (button 8) → reset
      if (this.buttonJustPressed(gp, 8)) this.actions.reset = true;

      // Save current button state for next frame edge detection
      this.prevGamepadButtons = [];
      for (let b = 0; b < gp.buttons.length; b++) {
        this.prevGamepadButtons[b] = gp.buttons[b]?.pressed ?? false;
      }

      break; // Use first connected gamepad only
    }

    this.state.left = left;
    this.state.right = right;
    this.state.accelerate = accelerate;
    this.state.brake = brake;
  }

  dispose() {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
  }
}
