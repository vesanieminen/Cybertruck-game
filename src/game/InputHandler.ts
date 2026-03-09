export interface InputState {
  left: boolean;
  right: boolean;
  accelerate: boolean;
  brake: boolean;
}

export class InputHandler {
  public state: InputState = {
    left: false,
    right: false,
    accelerate: false,
    brake: false,
  };

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
      this.state[key] = true;
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    const key = this.mapKey(e);
    if (key) {
      e.preventDefault();
      this.state[key] = false;
    }
  }

  dispose() {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
  }
}
