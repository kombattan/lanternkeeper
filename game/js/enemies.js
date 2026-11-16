// enemies.js — the Hollow: three shapes of hunger that come out of the dark
// for the lantern's flame, and the embers their banishing leaves behind.
// Drifters wobble straight in, Darts flicker in fast bursts, and the Brute
// simply walks through everything, slow and very hard to stop.

import { COLORS, LANTERN, clamp, dist } from './world.js';

export const ENEMY_KINDS = {
  drifter: { r: 15, hp: 2, speed: 62, score: 10, playerDmg: 8, flameDmg: 4, color: COLORS.drifter },
  dart: { r: 10, hp: 1, speed: 132, score: 15, playerDmg: 6, flameDmg: 2, color: COLORS.dart },
  brute: { r: 30, hp: 26, speed: 34, score: 150, playerDmg: 16, flameDmg: 9, color: COLORS.brute },
};

export function createEnemy(kind, x, y, wave, rng) {
  const base = ENEMY_KINDS[kind];
  const hpScale = 1 + 0.07 * (wave - 1);
  return {
    kind,
    x,
    y,
    r: base.r,
    hp: Math.max(1, Math.round(base.hp * (kind === 'dart' ? 1 : hpScale))),
    maxHp: Math.max(1, Math.round(base.hp * (kind === 'dart' ? 1 : hpScale))),
    speed: base.speed * (1 + 0.012 * (wave - 1)),
    score: base.score,
    playerDmg: base.playerDmg,
    flameDmg: base.flameDmg,
    color: base.color,
    phase: rng() * Math.PI * 2,
    attackCd: 0,
    flashT: 0,
    burstT: rng() * 1.2, // darts dash on this clock; others ignore it
  };
}

function chooseTarget(game, e) {
  const p = game.player;
  const toPlayer = dist(e.x, e.y, p.x, p.y);
  if (toPlayer < 250) return { x: p.x, y: p.y, kind: 'player', reach: p.r + e.r - 2 };
  return { x: LANTERN.x, y: LANTERN.y, kind: 'lantern', reach: LANTERN.r + e.r - 4 };
}

export function updateEnemies(game, dt) {
  const enemies = game.enemies;
  for (const e of enemies) {
    e.phase += dt * 3;
    e.flashT = Math.max(0, e.flashT - dt);
    e.attackCd -= dt;

    const target = chooseTarget(game, e);
    const d = dist(e.x, e.y, target.x, target.y);
    if (d > target.reach) {
      let speed = e.speed;
      if (e.kind === 'dart') {
        // Darts move in flickers: a fast dash, a hover, a dash again.
        e.burstT += dt;
        const cycle = e.burstT % 1.15;
        speed *= cycle < 0.55 ? 1.55 : 0.25;
      }
      const wobble = e.kind === 'drifter' ? Math.sin(e.phase * 1.7) * 26 : 0;
      const dx = (target.x - e.x) / (d || 1);
      const dy = (target.y - e.y) / (d || 1);
      e.x += (dx * speed + -dy * wobble) * dt;
      e.y += (dy * speed + dx * wobble) * dt;
    } else if (e.attackCd <= 0) {
      e.attackCd = 0.7;
      if (target.kind === 'player') game.hurtPlayer(e.playerDmg);
      else game.hurtFlame(e.flameDmg);
    }
  }

  // Gentle separation so a swarm reads as many bodies, not one stack.
  for (let i = 0; i < enemies.length; i++) {
    for (let j = i + 1; j < enemies.length; j++) {
      const a = enemies[i];
      const b = enemies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const rr = a.r + b.r;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0.01 && d2 < rr * rr) {
        const d = Math.sqrt(d2);
        const push = ((rr - d) / d) * 0.5;
        a.x -= dx * push * 0.5;
        a.y -= dy * push * 0.5;
        b.x += dx * push * 0.5;
        b.y += dy * push * 0.5;
      }
    }
  }
}

export function drawEnemy(ctx, e, time) {
  const flash = e.flashT > 0;
  ctx.save();
  ctx.translate(e.x, e.y);

  if (e.kind === 'drifter') {
    // A pale ghost: round head, wavy hem, two dark eyes on the keeper.
    ctx.fillStyle = flash ? '#ffffff' : e.color;
    ctx.beginPath();
    ctx.arc(0, -2, e.r, Math.PI, 0);
    const hemY = e.r - 2;
    ctx.lineTo(e.r, hemY + Math.sin(time * 6 + e.phase) * 3);
    for (let i = 1; i <= 4; i++) {
      const x = e.r - (i * (e.r * 2)) / 4;
      ctx.lineTo(x - e.r / 4, hemY + (i % 2 === 0 ? 4 : 0) + Math.sin(time * 6 + e.phase + i) * 2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#10182b';
    ctx.beginPath();
    ctx.arc(-5, -4, 2.4, 0, Math.PI * 2);
    ctx.arc(5, -4, 2.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'dart') {
    // A moth of violet glass: slim body, wings beating with its phase.
    const flap = Math.sin(time * 26 + e.phase) * 0.5;
    ctx.fillStyle = flash ? '#ffffff' : e.color;
    ctx.save();
    ctx.rotate(flap * 0.4);
    ctx.beginPath();
    ctx.ellipse(-e.r - 3, -3, e.r + 2, 5.5, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.rotate(-flap * 0.4);
    ctx.beginPath();
    ctx.ellipse(e.r + 3, -3, e.r + 2, 5.5, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, e.r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.drifterEye;
    ctx.beginPath();
    ctx.arc(0, -4, 1.8, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // The Brute: a cracked red bulk with horns. Cracks deepen as it is hurt.
    ctx.fillStyle = flash ? '#ffffff' : e.color;
    ctx.beginPath();
    ctx.arc(0, 0, e.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30, 6, 10, 0.55)';
    ctx.lineWidth = 2;
    const crack = 1 - e.hp / e.maxHp;
    ctx.beginPath();
    ctx.moveTo(-e.r * 0.5, -e.r * 0.6);
    ctx.lineTo(-e.r * (0.1 + crack * 0.2), 0);
    ctx.lineTo(-e.r * 0.45, e.r * 0.55);
    ctx.moveTo(e.r * 0.55, -e.r * 0.4);
    ctx.lineTo(e.r * 0.2, e.r * 0.1);
    if (crack > 0.4) {
      ctx.moveTo(e.r * 0.2, e.r * 0.1);
      ctx.lineTo(e.r * 0.5, e.r * 0.6);
    }
    ctx.stroke();
    ctx.fillStyle = COLORS.bruteEye;
    ctx.beginPath();
    ctx.arc(-9, -6, 3.2, 0, Math.PI * 2);
    ctx.arc(9, -6, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = flash ? '#ffffff' : e.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-e.r + 2, -e.r + 4);
    ctx.quadraticCurveTo(-e.r - 8, -e.r - 10, -e.r + 8, -e.r - 12);
    ctx.moveTo(e.r - 2, -e.r + 4);
    ctx.quadraticCurveTo(e.r + 8, -e.r - 10, e.r - 8, -e.r - 12);
    ctx.stroke();
  }
  ctx.restore();
}

// --- Embers: the flame's food, dropped by the banished ---------------------

export function createEmber(x, y, rng) {
  return {
    x: x + (rng() - 0.5) * 26,
    y: y + (rng() - 0.5) * 26,
    r: 7,
    age: 0,
    life: 25,
    phase: rng() * Math.PI * 2,
  };
}

export function updateEmbers(game, dt) {
  const p = game.player;
  for (let i = game.embers.length - 1; i >= 0; i--) {
    const em = game.embers[i];
    em.age += dt;
    if (em.age > em.life) {
      game.embers.splice(i, 1);
      continue;
    }
    const d = dist(em.x, em.y, p.x, p.y);
    if (d < 96) {
      // Embers remember the flame: close to the keeper they drift to him.
      const pull = 300 * dt;
      em.x += ((p.x - em.x) / (d || 1)) * pull;
      em.y += ((p.y - em.y) / (d || 1)) * pull;
    }
    if (d < p.r + em.r + 4) {
      game.embers.splice(i, 1);
      game.feedFlame(em);
    }
  }
}

export function drawEmber(ctx, em, time) {
  const bob = Math.sin(time * 3 + em.phase) * 2.5;
  const blink = em.age > em.life - 6 ? (Math.sin(time * 10) > 0 ? 1 : 0.25) : 1;
  ctx.globalAlpha = blink;
  ctx.fillStyle = COLORS.ember;
  ctx.beginPath();
  ctx.arc(em.x, em.y + bob, em.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.flameCore;
  ctx.beginPath();
  ctx.arc(em.x, em.y + bob, em.r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export { clamp };
