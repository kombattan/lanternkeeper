// render.js — everything the eye sees. The scene is drawn lit, then a mask of
// night is laid over it with holes punched where light lives: the lantern
// (its reach grows and shrinks with the flame), the keeper's spark, embers,
// bolts, and the faint loom of the Hollow at the light's edge. HUD and the
// title / pause / end panels sit on top, unshaken and readable.

import { COLORS, DAWN_WAVE, LANTERN, VIEW_H, VIEW_W, clamp, mulberry32 } from './world.js';
import { drawEmber, drawEnemy } from './enemies.js';
import { drawPlayer } from './player.js';

// The stage owns two offscreen canvases: a static ground texture painted
// once, and the darkness mask rebuilt every frame.
export function createStage() {
  const ground = document.createElement('canvas');
  ground.width = VIEW_W;
  ground.height = VIEW_H;
  paintGround(ground.getContext('2d'));

  const light = document.createElement('canvas');
  light.width = VIEW_W;
  light.height = VIEW_H;

  return { ground, light };
}

function paintGround(ctx) {
  ctx.fillStyle = COLORS.ground;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const glow = ctx.createRadialGradient(LANTERN.x, LANTERN.y, 40, LANTERN.x, LANTERN.y, 460);
  glow.addColorStop(0, 'rgba(52, 66, 102, 0.55)');
  glow.addColorStop(1, 'rgba(52, 66, 102, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const rng = mulberry32(7);
  ctx.fillStyle = COLORS.stone;
  for (let i = 0; i < 90; i++) {
    ctx.globalAlpha = 0.25 + rng() * 0.3;
    const x = rng() * VIEW_W;
    const y = rng() * VIEW_H;
    ctx.beginPath();
    ctx.ellipse(x, y, 3 + rng() * 7, 2 + rng() * 4, rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = COLORS.grassTuft;
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 150; i++) {
    ctx.globalAlpha = 0.35 + rng() * 0.3;
    const x = rng() * VIEW_W;
    const y = rng() * VIEW_H;
    ctx.beginPath();
    for (let blade = -1; blade <= 1; blade++) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + blade * 3 + (rng() - 0.5) * 2, y - 6 - rng() * 5);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function punch(ctx, x, y, radius, strength) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
  g.addColorStop(0.65, `rgba(0, 0, 0, ${strength * 0.55})`);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function drawLantern(ctx, game) {
  const { x, y } = LANTERN;
  // Stone ring and post.
  ctx.fillStyle = '#2c3852';
  ctx.beginPath();
  ctx.ellipse(x, y + 16, 34, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a3620';
  ctx.fillRect(x - 3, y - 16, 6, 32);
  // Glass housing.
  ctx.strokeStyle = '#8a6f3c';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 11, y - 34, 22, 24);
  ctx.beginPath();
  ctx.moveTo(x - 13, y - 34);
  ctx.lineTo(x, y - 44);
  ctx.lineTo(x + 13, y - 34);
  ctx.stroke();

  // The flame itself: three nested teardrops, taller as the flame is fed.
  const flicker = Math.sin(game.time * 11) * 0.5 + Math.sin(game.time * 23 + 1.7) * 0.3;
  const h = (10 + game.flame * 0.24) * (1 + flicker * 0.08);
  const w = 6 + game.flame * 0.05;
  const baseY = y - 10;
  const layers = [
    [COLORS.flameOuter, 1],
    [COLORS.flameMid, 0.68],
    [COLORS.flameCore, 0.4],
  ];
  for (const [color, scale] of layers) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - w * scale, baseY);
    ctx.quadraticCurveTo(x - w * scale, baseY - h * scale * 0.55, x + flicker * 2 * scale, baseY - h * scale);
    ctx.quadraticCurveTo(x + w * scale, baseY - h * scale * 0.55, x + w * scale, baseY);
    ctx.quadraticCurveTo(x, baseY + 3 * scale, x - w * scale, baseY);
    ctx.fill();
  }
}

function drawDarkness(ctx, stage, game) {
  const lctx = stage.light.getContext('2d');
  lctx.clearRect(0, 0, VIEW_W, VIEW_H);
  let alpha = 0.94;
  if (game.mode === 'title') alpha = 0.88;
  if (game.mode === 'won') alpha = 0.55;
  lctx.fillStyle = `rgba(5, 7, 20, ${alpha})`;
  lctx.fillRect(0, 0, VIEW_W, VIEW_H);

  lctx.globalCompositeOperation = 'destination-out';
  const flicker = Math.sin(game.time * 11) * 5 + Math.sin(game.time * 23 + 1.7) * 3;
  punch(lctx, LANTERN.x, LANTERN.y - 16, 118 + game.flame * 1.65 + flicker, 0.98);
  punch(lctx, game.player.x, game.player.y, 98, 0.9);
  for (const em of game.embers) punch(lctx, em.x, em.y, 30, 0.7);
  for (const b of game.bullets) punch(lctx, b.x, b.y, 20, 0.55);
  for (const e of game.enemies) punch(lctx, e.x, e.y, e.r * 1.25, 0.3);
  lctx.globalCompositeOperation = 'source-over';

  ctx.drawImage(stage.light, 0, 0);

  // Warm glows laid additively over the dark.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const flameGlow = ctx.createRadialGradient(LANTERN.x, LANTERN.y - 16, 0, LANTERN.x, LANTERN.y - 16, 90 + game.flame);
  flameGlow.addColorStop(0, 'rgba(255, 150, 50, 0.20)');
  flameGlow.addColorStop(1, 'rgba(255, 150, 50, 0)');
  ctx.fillStyle = flameGlow;
  ctx.fillRect(LANTERN.x - 220, LANTERN.y - 236, 440, 440);
  for (const em of game.embers) {
    ctx.fillStyle = 'rgba(255, 180, 80, 0.13)';
    ctx.beginPath();
    ctx.arc(em.x, em.y, 17, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawScene(ctx, stage, game) {
  ctx.drawImage(stage.ground, 0, 0);
  if (game.mode === 'won') {
    const dawn = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    dawn.addColorStop(0, 'rgba(255, 170, 90, 0.20)');
    dawn.addColorStop(0.5, 'rgba(255, 170, 90, 0.04)');
    dawn.addColorStop(1, 'rgba(255, 170, 90, 0)');
    ctx.fillStyle = dawn;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  for (const em of game.embers) drawEmber(ctx, em, game.time);
  drawLantern(ctx, game);
  for (const e of game.enemies) drawEnemy(ctx, e, game.time);
  if (game.mode !== 'over') drawPlayer(ctx, game);
  ctx.fillStyle = COLORS.bullet;
  for (const b of game.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
  game.particles.draw(ctx);
  drawDarkness(ctx, stage, game);
  game.floaters.draw(ctx);
}

function bar(ctx, x, y, w, h, fraction, color) {
  ctx.fillStyle = 'rgba(10, 14, 26, 0.72)';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * clamp(fraction, 0, 1), h);
}

export function drawHUD(ctx, game) {
  ctx.textAlign = 'left';
  ctx.font = '700 13px Georgia, serif';
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText('F L A M E', 26, 34);
  const flameColor = game.flame > 50 ? COLORS.flameMid : game.flame > 25 ? '#ff8c42' : COLORS.hp;
  bar(ctx, 26, 42, 240, 13, game.flame / 100, flameColor);

  ctx.font = '700 21px Georgia, serif';
  ctx.fillStyle = COLORS.textBright;
  ctx.fillText(`WAVE ${Math.max(1, game.wave)} / ${DAWN_WAVE}`, 26, 88);
  ctx.font = '14px Georgia, serif';
  ctx.fillStyle = COLORS.textDim;
  const left = game.director ? game.director.remaining : 0;
  ctx.fillText(game.director ? `Hollow remaining: ${left}` : 'A breath before the next wave', 26, 110);

  ctx.textAlign = 'right';
  ctx.font = '700 24px Georgia, serif';
  ctx.fillStyle = COLORS.textBright;
  ctx.fillText(`SCORE ${String(game.score).padStart(6, '0')}`, VIEW_W - 26, 40);
  ctx.font = '14px Georgia, serif';
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText(`Banished ${game.stats.banished} · Embers fed ${game.stats.embersFed}`, VIEW_W - 26, 64);

  ctx.textAlign = 'left';
  ctx.font = '700 13px Georgia, serif';
  ctx.fillText('K E E P E R', 26, VIEW_H - 44);
  bar(ctx, 26, VIEW_H - 36, 180, 11, game.player.hp / game.player.maxHp, COLORS.hp);

  ctx.textAlign = 'right';
  ctx.font = '13px Georgia, serif';
  ctx.fillStyle = 'rgba(139, 152, 169, 0.8)';
  ctx.fillText('WASD move · Mouse aim · Hold click to fire · P pause · M sound', VIEW_W - 26, VIEW_H - 24);

  if (game.flame < 25 && game.mode === 'playing') {
    const pulse = 0.55 + Math.sin(game.time * 6) * 0.35;
    ctx.globalAlpha = pulse;
    ctx.textAlign = 'center';
    ctx.font = '700 22px Georgia, serif';
    ctx.fillStyle = COLORS.hp;
    ctx.fillText('THE FLAME GUTTERS — FEED IT EMBERS', VIEW_W / 2, 44);
    ctx.globalAlpha = 1;
  }
}

export function drawBanner(ctx, game) {
  const banner = game.banner;
  if (!banner) return;
  const t = banner.t / banner.dur;
  const alpha = t < 0.15 ? t / 0.15 : t > 0.8 ? (1 - t) / 0.2 : 1;
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.textAlign = 'center';
  ctx.font = '700 56px Georgia, serif';
  ctx.fillStyle = COLORS.textBright;
  ctx.fillText(banner.title, VIEW_W / 2, 190);
  if (banner.sub) {
    ctx.font = 'italic 19px Georgia, serif';
    ctx.fillStyle = COLORS.flameMid;
    ctx.fillText(banner.sub, VIEW_W / 2, 226);
  }
  ctx.globalAlpha = 1;
}

function panel(ctx, game, title, titleColor, lines, prompt) {
  ctx.fillStyle = 'rgba(3, 5, 12, 0.52)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.font = '700 76px Georgia, serif';
  ctx.fillStyle = titleColor;
  ctx.fillText(title, VIEW_W / 2, 218);
  ctx.font = '19px Georgia, serif';
  let y = 268;
  for (const line of lines) {
    ctx.fillStyle = line.color || COLORS.textDim;
    ctx.font = line.font || '19px Georgia, serif';
    ctx.fillText(line.text, VIEW_W / 2, y);
    y += line.gap || 30;
  }
  if (prompt) {
    const pulse = 0.6 + Math.sin(game.time * 3.2) * 0.4;
    ctx.globalAlpha = pulse;
    ctx.font = '700 22px Georgia, serif';
    ctx.fillStyle = COLORS.flameMid;
    ctx.fillText(prompt, VIEW_W / 2, VIEW_H - 84);
    ctx.globalAlpha = 1;
  }
}

export function drawTitle(ctx, game) {
  panel(
    ctx,
    game,
    'LANTERNKEEPER',
    COLORS.flameMid,
    [
      { text: 'Keep the last light alive until dawn.', color: COLORS.textBright, font: 'italic 22px Georgia, serif', gap: 44 },
      { text: 'The Hollow comes out of the dark for the flame. Banish what reaches for it.' },
      { text: 'Every banished Hollow drops embers — walk over them to feed the flame.' },
      { text: 'If the flame dies, or the keeper falls, the night wins. Survive ten waves.', gap: 48 },
      { text: 'WASD / arrows — move      Mouse — aim      Hold click — fire', font: '16px Georgia, serif' },
      { text: 'P — pause      M — sound on/off', font: '16px Georgia, serif' },
    ],
    'Click or press Enter to light the lantern',
  );
}

export function drawEnd(ctx, game) {
  const won = game.mode === 'won';
  const s = game.stats;
  const lines = [
    won
      ? { text: 'The light held. The Hollow retreats with the night.', color: COLORS.textBright, font: 'italic 21px Georgia, serif', gap: 46 }
      : { text: game.endReason, color: COLORS.textBright, font: 'italic 21px Georgia, serif', gap: 46 },
    { text: `Score  ${game.score}`, font: '700 24px Georgia, serif', color: COLORS.textBright, gap: 34 },
  ];
  if (won && game.dawnBonus) {
    lines.push({ text: `Dawn bonus  +${game.dawnBonus}  (flame and keeper, unspent)`, font: '16px Georgia, serif', gap: 40 });
  }
  lines.push(
    { text: `Waves survived  ${s.wavesSurvived} / ${DAWN_WAVE}` },
    { text: `Hollow banished  ${s.banished}` },
    { text: `Embers fed to the flame  ${s.embersFed}` },
  );
  panel(ctx, game, won ? 'DAWN BREAKS' : 'THE DARK PREVAILS', won ? COLORS.flameMid : COLORS.drifter, lines, 'Press R or click to play again');
}

export function drawPause(ctx, game) {
  panel(ctx, game, 'PAUSED', COLORS.textBright, [{ text: 'The night waits, barely.', font: 'italic 19px Georgia, serif' }], 'Press P to resume');
}

// One full frame: the shaken world, then the steady interface over it.
export function drawFrame(ctx, stage, game) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.save();
  if (game.shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
  }
  drawScene(ctx, stage, game);
  ctx.restore();

  if (game.mode === 'playing' || game.mode === 'paused') {
    drawHUD(ctx, game);
    drawBanner(ctx, game);
  }
  if (game.mode === 'title') drawTitle(ctx, game);
  if (game.mode === 'paused') drawPause(ctx, game);
  if (game.mode === 'over' || game.mode === 'won') drawEnd(ctx, game);
}
