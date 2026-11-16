// world.js — shared constants, the night palette, a seeded RNG and small math
// helpers. Everything Lanternkeeper needs to agree on lives here so the other
// modules never hard-code a size, a colour or a random call of their own.

export const VIEW_W = 1280;
export const VIEW_H = 720;

// The lantern stands at the centre of the clearing. Its flame is the thing
// the Hollow wants to drink; the keeper never wins by leaving it.
export const LANTERN = { x: VIEW_W / 2, y: VIEW_H / 2, r: 24 };

// Survive this many waves and dawn breaks: the win screen.
export const DAWN_WAVE = 10;

export const COLORS = {
  ground: '#11182b',
  groundEdge: '#0a0f1e',
  grassTuft: '#1b2742',
  stone: '#232f4d',
  flameCore: '#fff3c4',
  flameMid: '#ffb454',
  flameOuter: '#ff7847',
  ember: '#ffc46b',
  keeper: '#f2e7c9',
  keeperCoat: '#3e6fb0',
  keeperHat: '#2b4a73',
  bullet: '#ffe9a8',
  drifter: '#8fa3c7',
  drifterEye: '#dfe9ff',
  dart: '#c792ea',
  brute: '#e06c75',
  bruteEye: '#ffe1e3',
  hp: '#e5534b',
  textDim: '#8b98a9',
  textBright: '#f5efdd',
};

// mulberry32: a tiny deterministic PRNG. The game seeds it from the run seed
// so screenshot states and replays are reproducible frame for frame.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// A point on the clearing's rim at a random angle: where the Hollow steps in.
export function rimPoint(rng) {
  const angle = rng() * Math.PI * 2;
  const radius = Math.max(VIEW_W, VIEW_H) * 0.62;
  return {
    x: LANTERN.x + Math.cos(angle) * radius,
    y: LANTERN.y + Math.sin(angle) * radius,
  };
}
