// waves.js — how the night escalates. Each wave is a shuffled queue of Hollow
// kinds trickled in from the rim; the mix leans harder on Darts as the night
// deepens, and something Brute-shaped moves at waves 5, 8 and twice at 10.
// Clear wave 10 and dawn breaks.

import { createEnemy } from './enemies.js';
import { rimPoint } from './world.js';

export function waveComposition(wave) {
  const kinds = [];
  const drifters = 6 + wave * 3;
  for (let i = 0; i < drifters; i++) kinds.push('drifter');
  if (wave >= 2) {
    const darts = 2 + wave;
    for (let i = 0; i < darts; i++) kinds.push('dart');
  }
  if (wave === 5 || wave === 8) kinds.push('brute');
  if (wave === 10) kinds.push('brute', 'brute');
  return kinds;
}

export function waveSubtitle(wave) {
  if (wave === 1) return 'The Hollow has smelled the flame';
  if (wave === 5) return 'Something huge moves in the dark';
  if (wave === 8) return 'It brought a brother';
  if (wave === 10) return 'The last wave — hold until dawn';
  return '';
}

export class WaveDirector {
  constructor(game, wave) {
    this.game = game;
    this.wave = wave;
    this.queue = waveComposition(wave);
    // Shuffle with the run's seeded RNG so a seed always faces the same night.
    const rng = game.rng;
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = this.queue[i];
      this.queue[i] = this.queue[j];
      this.queue[j] = tmp;
    }
    this.spawnTimer = 0.4;
    this.interval = Math.max(0.5, 1.45 - wave * 0.09);
    this.total = this.queue.length;
  }

  get remaining() {
    return this.queue.length + this.game.enemies.length;
  }

  get drained() {
    return this.queue.length === 0 && this.game.enemies.length === 0;
  }

  update(dt) {
    if (this.queue.length === 0) return;
    this.spawnTimer -= dt;
    // Never flood the clearing: at most 26 Hollow on the field at once.
    if (this.spawnTimer <= 0 && this.game.enemies.length < 26) {
      this.spawnTimer = this.interval * (0.75 + this.game.rng() * 0.5);
      const kind = this.queue.shift();
      const at = rimPoint(this.game.rng);
      this.game.enemies.push(createEnemy(kind, at.x, at.y, this.wave, this.game.rng));
    }
  }
}
