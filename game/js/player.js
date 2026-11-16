// player.js — the keeper himself: movement, aim, his sparkler staff (the gun),
// the bolts it fires, and how he is drawn. The keeper is quick but fragile;
// the game is lost as surely by his fall as by the flame going out.

import { COLORS, LANTERN, VIEW_H, VIEW_W, clamp } from './world.js';

const FIRE_INTERVAL = 1 / 6.5; // bolts per second while the mouse is held
const BOLT_SPEED = 640;
const BOLT_LIFE = 0.95;

export function createPlayer() {
  return {
    x: LANTERN.x + 96,
    y: LANTERN.y + 46,
    r: 14,
    hp: 100,
    maxHp: 100,
    speed: 238,
    aim: 0,
    fireCd: 0,
    iframes: 0,
    stepPhase: 0,
  };
}

export function createBullet(x, y, angle) {
  return {
    x,
    y,
    vx: Math.cos(angle) * BOLT_SPEED,
    vy: Math.sin(angle) * BOLT_SPEED,
    r: 4,
    life: BOLT_LIFE,
  };
}

export function updatePlayer(game, dt) {
  const p = game.player;
  const move = game.input.moveVector();
  p.x = clamp(p.x + move.x * p.speed * dt, p.r + 6, VIEW_W - p.r - 6);
  p.y = clamp(p.y + move.y * p.speed * dt, p.r + 6, VIEW_H - p.r - 6);
  if (move.x !== 0 || move.y !== 0) p.stepPhase += dt * 11;

  p.aim = Math.atan2(game.input.mouse.y - p.y, game.input.mouse.x - p.x);
  p.fireCd -= dt;
  p.iframes = Math.max(0, p.iframes - dt);

  if (game.input.mouse.down && p.fireCd <= 0) {
    p.fireCd = FIRE_INTERVAL;
    const muzzleX = p.x + Math.cos(p.aim) * (p.r + 8);
    const muzzleY = p.y + Math.sin(p.aim) * (p.r + 8);
    game.bullets.push(createBullet(muzzleX, muzzleY, p.aim));
    game.particles.muzzle(muzzleX, muzzleY, p.aim);
    game.sound.shoot();
  }
}

// Bolts fly, expire at the clearing's edge, and bite the first Hollow they
// touch. A kill is handed back to main.js through game.banish so score, ember
// drops and statistics all live in one place.
export function updateBullets(game, dt) {
  const bullets = game.bullets;
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < -20 || b.x > VIEW_W + 20 || b.y < -20 || b.y > VIEW_H + 20) {
      bullets.splice(i, 1);
      continue;
    }
    for (const e of game.enemies) {
      const dx = e.x - b.x;
      const dy = e.y - b.y;
      const rr = e.r + b.r;
      if (dx * dx + dy * dy <= rr * rr) {
        bullets.splice(i, 1);
        e.hp -= 1;
        e.flashT = 0.09;
        game.particles.burst(b.x, b.y, 4, COLORS.bullet, 120, 0.25, 2);
        if (e.hp <= 0) game.banish(e);
        else game.sound.hit();
        break;
      }
    }
  }
}

export function drawPlayer(ctx, game) {
  const p = game.player;
  const bob = Math.sin(p.stepPhase) * 1.6;

  // The staff: a short line toward the aim with a spark at its tip.
  ctx.strokeStyle = '#7a5c33';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y + bob);
  ctx.lineTo(p.x + Math.cos(p.aim) * (p.r + 9), p.y + bob + Math.sin(p.aim) * (p.r + 9));
  ctx.stroke();
  ctx.fillStyle = COLORS.bullet;
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.aim) * (p.r + 11), p.y + bob + Math.sin(p.aim) * (p.r + 11), 3, 0, Math.PI * 2);
  ctx.fill();

  // Coat, head and hat: a small round keeper in blue, facing the dark.
  ctx.fillStyle = COLORS.keeperCoat;
  ctx.beginPath();
  ctx.arc(p.x, p.y + bob, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.keeper;
  ctx.beginPath();
  ctx.arc(p.x, p.y - 9 + bob, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.keeperHat;
  ctx.beginPath();
  ctx.moveTo(p.x - 9, p.y - 12 + bob);
  ctx.lineTo(p.x + 9, p.y - 12 + bob);
  ctx.lineTo(p.x, p.y - 24 + bob);
  ctx.closePath();
  ctx.fill();

  // A fresh wound flashes the keeper red for a beat.
  if (p.iframes > 0.35) {
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = COLORS.hp;
    ctx.beginPath();
    ctx.arc(p.x, p.y + bob, p.r + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
