// Starting formations, each written from White's side (rows 1–3). See engine.mjs startGame.
import { DEFAULT_FORMATION, PRESETS, FIRST_PRESETS } from './engine.mjs';

export { DEFAULT_FORMATION, PRESETS, FIRST_PRESETS };

const ELEMENTS = ['fire', 'wind', 'water', 'earth'];
const ZONE = [];
for (const f of 'abcdefghi') for (const r of [1, 2, 3]) ZONE.push(f + r);

// All 13 pieces on random squares of the home zone.
export function randomFormation(rng) {
  const squares = ZONE.slice();
  for (let i = squares.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [squares[i], squares[j]] = [squares[j], squares[i]];
  }
  const f = { [squares[0]]: 'wizard' };
  let k = 1;
  for (const e of ELEMENTS) for (const s of [3, 2, 1]) f[squares[k++]] = [e, s];
  return f;
}

// The formation seen in a mirror: files a↔i swapped, rows kept.
export const mirror = f => Object.fromEntries(Object.entries(f).map(([s, v]) => ['ihgfedcba'['abcdefghi'.indexOf(s[0])] + s[1], v]));

// Small changes: move a piece to another square of the zone, swapping if that square is taken.
export function mutate(f, changes, rng) {
  const g = { ...f };
  for (let i = 0; i < changes; i++) {
    const keys = Object.keys(g), from = keys[Math.floor(rng() * keys.length)];
    const others = ZONE.filter(s => s !== from), to = others[Math.floor(rng() * others.length)];
    const moving = g[from];
    if (g[to]) g[from] = g[to]; else delete g[from];
    g[to] = moving;
  }
  return g;
}

// The default formation with one piece taken away (the handicap test).
export function without(formation, square) {
  const f = { ...formation };
  delete f[square];
  return f;
}

// Wizard in the corner under an Earth roof, Fire beside it, the rest spread out in front.
//  3  W3 W2 F2 R3 W1 R2 ·  R1 ·
//  2  E3 E2 E1 ·  ·  ·  ·  ·  ·
//  1  Z  F3 F1 ·  ·  ·  ·  ·  ·
export const FORTRESS = {
  a1: 'wizard', a2: ['earth', 3], b2: ['earth', 2], c2: ['earth', 1], b1: ['fire', 3], c1: ['fire', 1],
  a3: ['wind', 3], b3: ['wind', 2], c3: ['fire', 2], d3: ['water', 3], e3: ['wind', 1], f3: ['water', 2], h3: ['water', 1],
};

// Wizard in the middle of the back row, ringed by all three Earth.
//  3  ·  W3 R3 R2 F3 R1 W2 ·  ·
//  2  ·  ·  F2 E3 E2 E1 F1 ·  ·
//  1  ·  ·  ·  ·  Z  W1 ·  ·  ·
export const CENTRE_BUNKER = {
  e1: 'wizard', d2: ['earth', 3], e2: ['earth', 2], f2: ['earth', 1], f1: ['wind', 1],
  c2: ['fire', 2], g2: ['fire', 1], b3: ['wind', 3], c3: ['water', 3], d3: ['water', 2], e3: ['fire', 3], f3: ['water', 1], g3: ['wind', 2],
};

// From the formation search (results/formation-search.json): the default with Fire 2 moved to the front.
//  3  ·  W3 E1 ·  E3 ·  E2 W2 ·
//  2  ·  ·  R1 R2 F2 ·  R3 F1 ·
//  1  ·  ·  ·  F3 Z  W1 ·  ·  ·
export const FIRE_FORWARD = {
  b3: ['wind', 3], c3: ['earth', 1], e3: ['earth', 3], g3: ['earth', 2], h3: ['wind', 2],
  c2: ['water', 1], d2: ['water', 2], e2: ['fire', 2], g2: ['water', 3], h2: ['fire', 1], d1: ['fire', 3], e1: 'wizard', f1: ['wind', 1],
};

// From the formation search: Fire 2 in front of the Wizard, Earth 3 beside it, Water 2 on the back row.
//  3  ·  W3 E1 ·  ·  ·  E2 W2 ·
//  2  ·  ·  R1 W1 F2 E3 R3 F1 ·
//  1  ·  ·  ·  F3 Z  R2 ·  ·  ·
export const FIRE_FORWARD_2 = {
  b3: ['wind', 3], c3: ['earth', 1], g3: ['earth', 2], h3: ['wind', 2],
  c2: ['water', 1], d2: ['wind', 1], e2: ['fire', 2], f2: ['earth', 3], g2: ['water', 3], h2: ['fire', 1], d1: ['fire', 3], e1: 'wizard', f1: ['water', 2],
};

// Hand-made: Fire on the front row, Earth on both sides of the Wizard so nothing can slide along row 1.
//  3  ·  W3 F3 ·  E3 ·  F2 W2 ·
//  2  ·  ·  R1 W1 R2 F1 R3 ·  ·
//  1  ·  ·  ·  E1 Z  E2 ·  ·  ·
export const EARTH_SHIELD = {
  b3: ['wind', 3], c3: ['fire', 3], e3: ['earth', 3], g3: ['fire', 2], h3: ['wind', 2],
  c2: ['water', 1], d2: ['wind', 1], e2: ['water', 2], f2: ['fire', 1], g2: ['water', 3], d1: ['earth', 1], e1: 'wizard', f1: ['earth', 2],
};

export const FORMATIONS = {
  default: DEFAULT_FORMATION, fortress: FORTRESS, bunker: CENTRE_BUNKER,
  fireForward: FIRE_FORWARD, fireForward2: FIRE_FORWARD_2, earthShield: EARTH_SHIELD,
};
