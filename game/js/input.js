// input.js — keyboard and mouse state for the keeper.
// Held keys and the mouse are polled every frame; one-shot presses (pause,
// mute, restart) are queued as edges and consumed exactly once by main.js.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.edges = new Set();
    this.mouse = { x: 0, y: 0, down: false, clicked: false };

    window.addEventListener('keydown', (event) => {
      if (!event.repeat) this.edges.add(event.code);
      this.keys.add(event.code);
      if (event.code.startsWith('Arrow')) event.preventDefault();
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.down = false;
    });

    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
      this.mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    });
    canvas.addEventListener('mousedown', (event) => {
      if (event.button === 0) {
        this.mouse.down = true;
        this.mouse.clicked = true;
      }
    });
    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.mouse.down = false;
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  isDown(code) {
    return this.keys.has(code);
  }

  // True once per physical press; reading it consumes the edge.
  pressed(code) {
    if (!this.edges.has(code)) return false;
    this.edges.delete(code);
    return true;
  }

  // The start-of-frame click flag, consumed by main.js after the update.
  takeClick() {
    const was = this.mouse.clicked;
    this.mouse.clicked = false;
    return was;
  }

  // Movement vector from WASD or the arrow keys, normalised to length 1.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) y -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = Math.SQRT1_2;
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }
}
