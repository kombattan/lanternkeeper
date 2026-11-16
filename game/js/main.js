// main.js — Lanternkeeper's entry point and conductor. It owns the game
// state and the hooks every module calls back into (banish, hurtPlayer,
// hurtFlame, feedFlame), runs the fixed-step loop, and moves between the
// title, the night itself, pause, and the two ways a run can end.
//
// The night in one paragraph: the flame decays on its own and the Hollow
// drinks it faster; embers from the banished feed it back. Ten waves, each
// harder than the last, stand between the keeper and dawn.

import { SoundBank } from './audio.js';
import { createEmber, updateEmbers, updateEnemies } from './enemies.js';
import { Input } from './input.js';
import { Floaters, Particles } from './particles.js';
import { createPlayer, updateBullets, updatePlayer } from './player.js';
import { createStage, drawFrame } from './render.js';
import { setupShot, setupTitleScene } from './shots.js';
import { WaveDirector, waveSubtitle } from './waves.js';
import { COLORS, DAWN_WAVE, LANTERN, clamp, mulberry32 } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const stage = createStage();
const params = new URLSearchParams(window.location.search);
const seed = Number.parseInt(params.get('seed') ?? '1', 10) || 1;

const game = {
  mode: 'title',
  time: 0,
  seed,
  runCount: 0,
  rng: mulberry32(seed),
  flame: 82,
  score: 0,
  wave: 0,
  player: createPlayer(),
  bullets: [],
  enemies: [],
  embers: [],
  particles: new Particles(),
  floaters: new Floaters(),
  input: new Input(canvas),
  sound: new SoundBank(),
  director: null,
  banner: null,
  shake: 0,
  respiteT: 0,
  flameSndCd: 0,
  dawnBonus: 0,
  endReason: '',
  stats: { banished: 0, embersFed: 0, wavesSurvived: 0 },
};

// --- The hooks the modules call ---------------------------------------------

game.banish = (enemy) => {
  const at = game.enemies.indexOf(enemy);
  if (at >= 0) game.enemies.splice(at, 1);
  game.stats.banished += 1;
  game.score += enemy.score;
  game.floaters.add(enemy.x, enemy.y - 12, `+${enemy.score}`, COLORS.bullet, 15);
  game.particles.banishBurst(enemy.x, enemy.y, enemy.color);
  game.sound.banish();
  if (enemy.kind === 'brute') {
    game.shake = Math.max(game.shake, 5);
    for (let i = 0; i < 3; i++) game.embers.push(createEmber(enemy.x, enemy.y, game.rng));
  } else if (game.rng() < 0.65) {
    game.embers.push(createEmber(enemy.x, enemy.y, game.rng));
  }
};

game.hurtPlayer = (dmg) => {
  const p = game.player;
  if (game.mode !== 'playing' || p.iframes > 0) return;
  p.hp -= dmg;
  p.iframes = 0.65;
  game.shake = Math.max(game.shake, 5);
  game.sound.hurt();
  game.particles.burst(p.x, p.y, 8, COLORS.hp, 150, 0.35, 2.5);
  if (p.hp <= 0) {
    p.hp = 0;
    endRun(false, 'The keeper falls, and no hand is left to feed the flame.');
  }
};

game.hurtFlame = (dmg) => {
  if (game.mode !== 'playing') return;
  game.flame -= dmg;
  game.shake = Math.max(game.shake, 2.5);
  if (game.flameSndCd <= 0) {
    game.sound.flameHurt();
    game.flameSndCd = 0.5;
  }
  game.particles.burst(LANTERN.x, LANTERN.y - 14, 5, COLORS.flameOuter, 120, 0.3, 2.5);
  if (game.flame <= 0) {
    game.flame = 0;
    endRun(false, 'The dark drinks the last of the flame.');
  }
};

game.feedFlame = (ember) => {
  game.flame = clamp(game.flame + 4, 0, 100);
  game.score += 5;
  game.stats.embersFed += 1;
  game.sound.ember();
  game.floaters.add(game.player.x, game.player.y - 28, '+ flame', COLORS.ember, 13);
  game.particles.emberTrail(ember.x, ember.y);
};

// --- Run control --------------------------------------------------------------

function startWave(n) {
  game.wave = n;
  game.director = new WaveDirector(game, n);
  game.banner = { title: `WAVE ${n}`, sub: waveSubtitle(n), t: 0, dur: 2.4 };
  game.sound.waveHorn();
}

function onWaveCleared() {
  game.stats.wavesSurvived = game.wave;
  game.director = null;
  if (game.wave >= DAWN_WAVE) {
    game.dawnBonus = Math.round(game.flame) * 10 + Math.round(game.player.hp) * 5;
    game.score += game.dawnBonus;
    endRun(true, '');
    return;
  }
  game.flame = clamp(game.flame + 8, 0, 100);
  game.banner = { title: `WAVE ${game.wave} HELD`, sub: 'The flame breathes. The dark gathers again…', t: 0, dur: 2.2 };
  game.respiteT = 2.6;
}

function endRun(won, reason) {
  if (game.mode !== 'playing') return;
  game.mode = won ? 'won' : 'over';
  game.endReason = reason;
  game.banner = null;
  if (won) game.sound.dawn();
  else game.sound.gameOver();
}

function newRun() {
  game.runCount += 1;
  game.rng = mulberry32(game.seed * 1000 + game.runCount);
  game.flame = 85;
  game.score = 0;
  game.dawnBonus = 0;
  game.endReason = '';
  game.player = createPlayer();
  game.bullets = [];
  game.enemies = [];
  game.embers = [];
  game.particles.clear();
  game.floaters.clear();
  game.shake = 0;
  game.stats = { banished: 0, embersFed: 0, wavesSurvived: 0 };
  game.mode = 'playing';
  startWave(1);
}

// --- Updates --------------------------------------------------------------------

function updateTitle(dt) {
  // The title scene idles: orbiters circle the lantern, the flame breathes.
  for (const e of game.enemies) {
    e.orbit += dt * 0.1;
    e.x = LANTERN.x + Math.cos(e.orbit) * 330;
    e.y = LANTERN.y + Math.sin(e.orbit) * 250;
  }
  if (game.rng() < dt * 9) game.particles.flameLick(LANTERN.x, LANTERN.y - 12);
  game.particles.update(dt);
}

function updatePlaying(dt) {
  updatePlayer(game, dt);
  updateBullets(game, dt);
  if (game.director) {
    game.director.update(dt);
    if (game.director.drained) onWaveCleared();
  } else if (game.respiteT > 0) {
    game.respiteT -= dt;
    if (game.respiteT <= 0 && game.mode === 'playing') startWave(game.wave + 1);
  }
  updateEnemies(game, dt);
  updateEmbers(game, dt);

  // The night itself is hungry: the flame burns down even in peace.
  game.flame -= 0.5 * dt;
  if (game.flame <= 0) {
    game.flame = 0;
    endRun(false, 'The flame starves in the long night.');
  }
  if (game.rng() < dt * 10) game.particles.flameLick(LANTERN.x, LANTERN.y - 12);
}

function update(dt) {
  game.time += dt;
  game.flameSndCd = Math.max(0, game.flameSndCd - dt);
  game.shake = Math.max(0, game.shake - game.shake * 6 * dt - 4 * dt);
  if (game.banner) {
    game.banner.t += dt;
    if (game.banner.t >= game.banner.dur) game.banner = null;
  }

  const clicked = game.input.takeClick();
  if (game.input.pressed('KeyM')) {
    const muted = game.sound.toggleMute();
    game.floaters.add(game.player.x, game.player.y - 30, muted ? 'Sound off' : 'Sound on', COLORS.textDim, 13);
  }

  if (game.mode === 'title') {
    if (game.input.pressed('Enter') || clicked) {
      game.sound.unlock();
      newRun();
      return;
    }
    updateTitle(dt);
  } else if (game.mode === 'playing') {
    if (game.input.pressed('KeyP') || game.input.pressed('Escape')) {
      game.mode = 'paused';
      return;
    }
    updatePlaying(dt);
  } else if (game.mode === 'paused') {
    if (game.input.pressed('KeyP') || game.input.pressed('Escape') || game.input.pressed('Enter')) {
      game.mode = 'playing';
    }
    return; // the world holds its breath; only the frame is redrawn
  } else if (game.mode === 'over' || game.mode === 'won') {
    if (game.input.pressed('KeyR') || game.input.pressed('Enter') || clicked) {
      newRun();
      return;
    }
  }

  game.particles.update(dt);
  game.floaters.update(dt);
}

// --- Boot -----------------------------------------------------------------------

window.addEventListener('pointerdown', () => game.sound.unlock(), { once: true });
window.addEventListener('keydown', () => game.sound.unlock(), { once: true });

const shotName = params.get('shot');
if (shotName) {
  // Screenshot mode: stage one deterministic frame and hold it.
  setupShot(game, shotName);
  requestAnimationFrame(() => {
    drawFrame(ctx, stage, game);
    drawFrame(ctx, stage, game);
    window.__lanternReady = true;
  });
} else {
  setupTitleScene(game);
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    drawFrame(ctx, stage, game);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
