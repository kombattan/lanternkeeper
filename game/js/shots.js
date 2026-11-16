// shots.js — deterministic staged scenes for the entry's screenshots, driven
// by the ?shot= query the kit's shots.json names. Each scene is assembled
// from fixed numbers (never the live RNG stream), so the same seed always
// renders the same frame: start, play, end — and dawn, the win, for the
// fourth screenshot.

import { createEnemy, createEmber } from './enemies.js';
import { createBullet, createPlayer } from './player.js';
import { LANTERN, mulberry32 } from './world.js';

// The title scene: the lantern lit, the keeper at his post, five Drifters
// circling far out in the dark and a few embers waiting on the ground.
export function setupTitleScene(game) {
  game.flame = 82;
  game.player = createPlayer();
  game.enemies = [];
  const ring = mulberry32(99);
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + 0.4;
    const e = createEnemy('drifter', LANTERN.x + Math.cos(angle) * 330, LANTERN.y + Math.sin(angle) * 250, 1, ring);
    e.orbit = angle;
    game.enemies.push(e);
  }
  game.embers = [
    createEmber(LANTERN.x - 150, LANTERN.y + 90, ring),
    createEmber(LANTERN.x + 190, LANTERN.y - 70, ring),
    createEmber(LANTERN.x + 60, LANTERN.y + 150, ring),
  ];
}

function stagePlay(game) {
  game.mode = 'playing';
  game.wave = 4;
  game.score = 1230;
  game.flame = 68;
  game.stats = { banished: 17, embersFed: 9, wavesSurvived: 3 };
  game.player = createPlayer();
  game.player.x = 430;
  game.player.y = 420;
  game.player.aim = Math.atan2(300 - 420, 900 - 430);
  game.input.mouse.x = 900;
  game.input.mouse.y = 300;

  const rng = mulberry32(4);
  game.enemies = [
    createEnemy('drifter', 880, 300, 4, rng),
    createEnemy('drifter', 965, 385, 4, rng),
    createEnemy('drifter', 760, 205, 4, rng),
    createEnemy('dart', 1025, 520, 4, rng),
    createEnemy('dart', 305, 175, 4, rng),
    createEnemy('brute', 1015, 245, 4, rng),
  ];
  game.enemies[0].hp = 1; // one bolt from banishing: it flashes when hit below
  game.embers = [createEmber(520, 300, rng), createEmber(600, 470, rng), createEmber(705, 380, rng)];
  game.bullets = [
    createBullet(560, 382, game.player.aim),
    createBullet(660, 348, game.player.aim),
    createBullet(770, 312, game.player.aim),
  ];
  game.director = { remaining: 14 };
}

function stageEnd(game, won) {
  const rng = mulberry32(11);
  game.player = createPlayer();
  game.stats = won
    ? { banished: 88, embersFed: 51, wavesSurvived: 10 }
    : { banished: 41, embersFed: 23, wavesSurvived: 6 };
  game.wave = won ? 10 : 7;
  game.score = won ? 5420 : 2870;
  if (won) {
    game.mode = 'won';
    game.flame = 43;
    game.player.hp = 62;
    game.dawnBonus = 880;
    game.enemies = [];
    game.embers = [createEmber(560, 300, rng), createEmber(730, 430, rng)];
  } else {
    game.mode = 'over';
    game.flame = 6;
    game.endReason = 'The dark drinks the last of the flame.';
    game.enemies = [
      createEnemy('drifter', LANTERN.x - 70, LANTERN.y - 30, 7, rng),
      createEnemy('drifter', LANTERN.x + 84, LANTERN.y + 44, 7, rng),
      createEnemy('dart', LANTERN.x + 30, LANTERN.y - 96, 7, rng),
    ];
    game.embers = [];
  }
}

export function setupShot(game, name) {
  game.bullets = [];
  game.banner = null;
  game.director = null;
  if (name === 'play') stagePlay(game);
  else if (name === 'end') stageEnd(game, false);
  else if (name === 'dawn') stageEnd(game, true);
  else {
    game.mode = 'title';
    setupTitleScene(game);
  }
  game.time = 12.5; // a lively, fixed flicker phase for every shot
}
