// particles.js — transient visual feedback: sparks, smoke, banish bursts and
// the floating score numbers that tell the player an action landed. Purely
// cosmetic; nothing here touches game state.

import { COLORS } from './world.js';

class Particle {
  constructor(x, y, vx, vy, life, size, color, drag, gravity) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.color = color;
    this.drag = drag;
    this.gravity = gravity;
  }
}

export class Particles {
  constructor() {
    this.list = [];
  }

  clear() {
    this.list.length = 0;
  }

  burst(x, y, count, color, speed, life, size) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      this.list.push(
        new Particle(
          x,
          y,
          Math.cos(angle) * v,
          Math.sin(angle) * v,
          life * (0.6 + Math.random() * 0.7),
          size * (0.6 + Math.random() * 0.8),
          color,
          3.2,
          0,
        ),
      );
    }
  }

  // The little celebration when a Hollow is banished back into the dark.
  banishBurst(x, y, color) {
    this.burst(x, y, 14, color, 190, 0.45, 3);
    this.burst(x, y, 6, COLORS.flameMid, 90, 0.6, 2);
  }

  muzzle(x, y, angle) {
    for (let i = 0; i < 3; i++) {
      const spread = angle + (Math.random() - 0.5) * 0.5;
      const v = 260 + Math.random() * 120;
      this.list.push(
        new Particle(x, y, Math.cos(spread) * v, Math.sin(spread) * v, 0.09, 2, COLORS.bullet, 6, 0),
      );
    }
  }

  emberTrail(x, y) {
    this.list.push(
      new Particle(x + (Math.random() - 0.5) * 6, y, (Math.random() - 0.5) * 14, -34 - Math.random() * 22, 0.7, 2, COLORS.ember, 0.4, -30),
    );
  }

  flameLick(x, y) {
    this.list.push(
      new Particle(x + (Math.random() - 0.5) * 10, y - 8, (Math.random() - 0.5) * 10, -52 - Math.random() * 30, 0.55, 3, Math.random() < 0.5 ? COLORS.flameMid : COLORS.flameOuter, 0.3, -40),
    );
  }

  update(dt) {
    const list = this.list;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life -= dt;
      if (p.life <= 0) {
        list.splice(i, 1);
        continue;
      }
      const dragK = Math.max(0, 1 - p.drag * dt);
      p.vx *= dragK;
      p.vy = p.vy * dragK + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx) {
    for (const p of this.list) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// Floating score and event text ("+10", "Wave 5", "The flame gutters").
export class Floaters {
  constructor() {
    this.list = [];
  }

  clear() {
    this.list.length = 0;
  }

  add(x, y, text, color, size = 16) {
    this.list.push({ x, y, text, color, size, life: 1.1, maxLife: 1.1 });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i];
      f.life -= dt;
      f.y -= 34 * dt;
      if (f.life <= 0) this.list.splice(i, 1);
    }
  }

  draw(ctx) {
    ctx.textAlign = 'center';
    for (const f of this.list) {
      const alpha = Math.max(0, Math.min(1, f.life / (f.maxLife * 0.5)));
      ctx.globalAlpha = alpha;
      ctx.font = `700 ${f.size}px Georgia, serif`;
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }
}
