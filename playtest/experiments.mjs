// The experiments from the plan. Each one is a list of games to play; run.mjs plays them.
import fs from 'node:fs';
import { DEFAULT_FORMATION, PRESETS, FIRST_PRESETS, mirror as mirrorFiles, without } from './formations.mjs';
import { V03 } from './engine.mjs';

let seed = 1;
// n games of A against B, alternating colours: A is White in even games, Black in odd ones.
// A and B are player configs like { type: 'careful' }; fa/fb are their formations.
function both(tag, A, B, n, { fa = 'default', fb = 'default', ...extra } = {}) {
  return Array.from({ length: n }, (_, i) => {
    const aWhite = i % 2 === 0;
    return {
      tag, a: aWhite ? 'w' : 'b', seed: seed++, ...extra,
      white: aWhite ? A : B, black: aWhite ? B : A,
      whiteFormation: aWhite ? fa : fb, blackFormation: aWhite ? fb : fa,
    };
  });
}
// n games of the same player against itself; side A is always White.
const mirror = (tag, P, n, extra = {}) =>
  Array.from({ length: n }, () => ({ tag, a: 'w', seed: seed++, white: P, black: P, whiteFormation: 'default', blackFormation: 'default', ...extra }));

// Every pair of players meets n times, half with each colour. The first move of each side is
// random, so players that pick the same move every time still get varied games. labels names the
// players for the ratings (rating.mjs).
function roundRobin(tag, players, n, extra = {}) {
  const names = Object.keys(players), out = [];
  for (let i = 0; i < names.length; i++)
    for (let j = i + 1; j < names.length; j++)
      for (let k = 0; k < n; k++) {
        const [w, b] = k % 2 ? [names[j], names[i]] : [names[i], names[j]];
        out.push({ tag: `${tag}: ${names[i]} v ${names[j]}`, a: k % 2 ? 'b' : 'w', seed: seed++, randomOpening: 2,
          white: players[w], black: players[b], whiteFormation: 'default', blackFormation: 'default', labels: { w, b }, ...extra });
      }
  return out;
}

// Every pair of presets meets n times, half with each colour, both sides played by the same bot.
function presetRoundRobin(bot, n, firstSeed, rules = {}) {
  const names = Object.keys(FIRST_PRESETS), out = [];
  seed = firstSeed;
  for (let i = 0; i < names.length; i++)
    for (let j = i + 1; j < names.length; j++)
      for (let k = 0; k < n; k++) {
        const [w, b] = k % 2 ? [names[j], names[i]] : [names[i], names[j]];
        out.push({ tag: `${names[i]} v ${names[j]}`, a: k % 2 ? 'b' : 'w', seed: seed++, white: bot, black: bot, randomOpening: 2, maxPlies: 1000,
          whiteFormation: FIRST_PRESETS[w], blackFormation: FIRST_PRESETS[b], labels: { w, b }, ...rules });
      }
  return out;
}

const random = { type: 'random' }, greedy = { type: 'greedy' }, careful = { type: 'careful' }, thinker = { type: 'thinker' };

// The 12 element pieces of the default formation, by square.
const DEFAULT_PIECES = Object.entries(DEFAULT_FORMATION).filter(([, v]) => v !== 'wizard');

export const EXPERIMENTS = {
  // 1. Do games end, and how?
  ends: s => [
    ...mirror('random v random', random, 1000 * s),
    ...mirror('greedy v greedy', greedy, 1000 * s),
    ...mirror('random v random, random formations', random, 1000 * s, { whiteFormation: 'random', blackFormation: 'random' }),
  ],
  // 2. Does skill matter? Each player against the next one up.
  ladder: s => [
    ...both('greedy v random', greedy, random, 400 * s),
    ...both('careful v greedy', careful, greedy, 200 * s),
    ...both('thinker v careful', thinker, careful, 100 * s),
    ...both('careful(flat values) v careful', { type: 'careful', values: 'flat' }, careful, 200 * s),
  ],
  // 3. White against Black between equal players.
  colours: s => [
    ...mirror('careful v careful', careful, 400 * s),
    ...mirror('careful v careful, flat values', { type: 'careful', values: 'flat' }, 200 * s),
    ...mirror('thinker v thinker', thinker, 100 * s),
    // Same random formation for both sides, so only the first move differs.
    ...Array.from({ length: 300 * s }, () => ({ tag: 'careful v careful, same random formation', a: 'w', seed: seed++, white: careful, black: careful, whiteFormation: 'random', blackFormation: 'same' })),
  ],
  // 4. Piece strength: the default formation minus one piece, against the full default formation.
  handicap: s => DEFAULT_PIECES.flatMap(([square, [e, size]]) =>
    both(`without ${e}${size} (${square})`, careful, careful, 80 * s, { fa: without(DEFAULT_FORMATION, square) })),
  // 4b. Piece strength apart from position: both sides share a fresh random formation each game,
  // and side A is missing one piece.
  handicapRandom: s => ['fire', 'wind', 'water', 'earth'].flatMap(e => [3, 2, 1].flatMap(size =>
    Array.from({ length: 100 * s }, (_, i) => {
      const a = i % 2 === 0 ? 'w' : 'b';
      return {
        tag: `without ${e}${size}`, a, seed: seed++, white: careful, black: careful,
        whiteFormation: 'random', blackFormation: 'same', remove: { side: a, piece: [e, size] },
      };
    }))),
  // 5. Cheat hunt: style players against Careful (and the Turtle against Thinker).
  styles: s => [
    ...both('turtle v careful', { type: 'turtle' }, careful, 100 * s),
    ...both('turtle v thinker', { type: 'turtle' }, thinker, 40 * s),
    ...both('rusher v careful', { type: 'rusher' }, careful, 100 * s),
    ...both('combiner v careful', { type: 'combiner' }, careful, 100 * s),
    ...both('never-combiner v careful', { type: 'neverCombiner' }, careful, 100 * s),
    ...both('hunter v careful', { type: 'hunter' }, careful, 100 * s),
  ],
  // 6. Exact range: the ladder and colour tests again with the variant on.
  exact: s => [
    ...both('careful v greedy', careful, greedy, 200 * s, { exactRange: true }),
    ...both('thinker v careful', thinker, careful, 100 * s, { exactRange: true }),
    ...mirror('careful v careful', careful, 400 * s, { exactRange: true }),
    ...mirror('thinker v thinker', thinker, 100 * s, { exactRange: true }),
  ],
  // 6b. Water variants (GAME_SPEC open question 6): the colour, ladder and key-piece handicap tests again.
  water: s => [['no edge slide', { noWaterEdge: true }], ['straight captures', { waterStraightCapture: true }],
    ['both', { noWaterEdge: true, waterStraightCapture: true }]].flatMap(([name, v]) => [
    ...mirror(`${name}: careful v careful`, careful, 300 * s, v),
    ...mirror(`${name}: thinker v thinker`, thinker, 50 * s, v),
    ...both(`${name}: thinker v careful`, thinker, careful, 50 * s, v),
    ...[['g2', 'water3'], ['d1', 'fire3'], ['b3', 'wind3']].flatMap(([square, piece]) =>
      both(`${name}: without ${piece} (${square})`, careful, careful, 80 * s, { fa: without(DEFAULT_FORMATION, square), ...v })),
  ]),
  // 6c. Thinker against itself again, with the first two moves random: under straight captures it played
  // the same opening in every game, so those games weren't independent.
  waterThinker: s => [['normal rules', {}], ['straight captures', { waterStraightCapture: true }],
    ['both', { noWaterEdge: true, waterStraightCapture: true }]].flatMap(([name, v]) =>
    mirror(`${name}: thinker v thinker, random opening`, thinker, 60 * s, { ...v, randomOpening: 2 })),
  // 6d. More of the above for straight captures, where White looked weak. Fresh seeds, so no game repeats.
  straightThinker: s => { seed = 100000; return mirror('straight captures: thinker v thinker, random opening', thinker, 200 * s, { waterStraightCapture: true, randomOpening: 2 }); },
  // 8. Rating ladder: the old and new look-ahead players, every pair against each other.
  // Deep 80k was dropped after the first ladder (2026-10-28): no stronger than 20k (44% head to head).
  rating: s => roundRobin('rating', {
    careful, thinker,
    'deep 2k': { type: 'deep', nodes: 2000 }, 'deep 5k': { type: 'deep', nodes: 5000 }, 'deep 20k': { type: 'deep', nodes: 20000 },
    'deep 2k tuned': { type: 'deep', nodes: 2000, weights: 'tuned' }, 'deep 5k tuned': { type: 'deep', nodes: 5000, weights: 'tuned' },
    'deep 20k tuned': { type: 'deep', nodes: 20000, weights: 'tuned' },
  }, 100 * s),
  // 9. Material for tune.mjs: Deep against itself, half from the default formation and half from
  // a random formation shared by both sides, so every piece shows up in many situations.
  selfplay: s => Array.from({ length: 4000 * s }, (_, i) => ({
    tag: i % 2 ? 'deep 2k, same random formation' : 'deep 2k, default formation', a: 'w', seed: 200000 + i, randomOpening: 2,
    white: { type: 'deep', nodes: 2000 }, black: { type: 'deep', nodes: 2000 },
    whiteFormation: i % 2 ? 'random' : 'default', blackFormation: i % 2 ? 'same' : 'default',
  })),
  // 9b. The same with the tuned values, for a second round of tuning.
  selfplayTuned: s => Array.from({ length: 4000 * s }, (_, i) => ({
    tag: i % 2 ? 'deep 2k tuned, same random formation' : 'deep 2k tuned, default formation', a: 'w', seed: 300000 + i, randomOpening: 2,
    white: { type: 'deep', nodes: 2000, weights: 'tuned' }, black: { type: 'deep', nodes: 2000, weights: 'tuned' },
    whiteFormation: i % 2 ? 'random' : 'default', blackFormation: i % 2 ? 'same' : 'default',
  })),
  // 10. The key experiments again with the strongest fast player, Deep 2k with tuned values
  // (2026-10-28): colours (1), the handicap tests (4, 4b) and the Water variants (6b). Every game
  // starts with one random move per side, because Deep repeats itself more than Careful.
  recheck: s => {
    const bot = { type: 'deep', nodes: 2000, weights: 'tuned' }, ro = { randomOpening: 2 };
    seed = 400000;
    // Both sides get the same random formation; with `piece`, side A is missing that piece.
    const sameRandom = (tag, n, piece = null) => Array.from({ length: n }, (_, i) => ({
      tag, a: i % 2 ? 'b' : 'w', seed: seed++, white: bot, black: bot, whiteFormation: 'random', blackFormation: 'same', ...ro,
      ...(piece ? { remove: { side: i % 2 ? 'b' : 'w', piece } } : {}),
    }));
    return [
      ...mirror('colours: default formation', bot, 400 * s, ro),
      ...sameRandom('colours: same random formation', 400 * s),
      ...DEFAULT_PIECES.flatMap(([square, [e, size]]) =>
        both(`handicap: without ${e}${size} (${square})`, bot, bot, 100 * s, { fa: without(DEFAULT_FORMATION, square), ...ro })),
      ...['fire', 'wind', 'water', 'earth'].flatMap(e => [3, 2, 1].flatMap(size =>
        sameRandom(`handicap random: without ${e}${size}`, 100 * s, [e, size]))),
      ...[['normal rules', {}], ['no edge slide', { noWaterEdge: true }], ['straight captures', { waterStraightCapture: true }],
        ['both', { noWaterEdge: true, waterStraightCapture: true }]].flatMap(([name, v]) => [
        ...mirror(`water, ${name}: equal`, bot, 400 * s, { ...v, ...ro }),
        ...[['g2', 'water3'], ['d1', 'fire3'], ['b3', 'wind3']].flatMap(([square, piece]) =>
          both(`water, ${name}: without ${piece} (${square})`, bot, bot, 100 * s, { fa: without(DEFAULT_FORMATION, square), ...v, ...ro })),
      ]),
    ];
  },
  // 10b. The 50-move rule (GAME_SPEC open question 2): most strong-bot draws come from it. Does a
  // longer limit turn them into wins, or only make games longer? 0 = no limit (capped at 500 moves each).
  drawLimit: s => {
    const bot = { type: 'deep', nodes: 2000, weights: 'tuned' };
    seed = 800000;
    return [50, 75, 100, 0].flatMap(limit => {
      const name = limit ? `limit ${limit}` : 'no limit';
      return [
        ...mirror(`${name}: default formation`, bot, 400 * s, { quietMoveLimit: limit, randomOpening: 2, maxPlies: 1000 }),
        ...Array.from({ length: 400 * s }, () => ({
          tag: `${name}: same random formation`, a: 'w', seed: seed++, white: bot, black: bot, whiteFormation: 'random', blackFormation: 'same',
          quietMoveLimit: limit, randomOpening: 2, maxPlies: 1000,
        })),
      ];
    });
  },
  // 10c. Every pairing of the formations found by search.mjs (plus the default): each one as White
  // against each one as Black, itself included. Do mixed formations change balance, draws, length
  // or how games end? labels lets rating.mjs rate the formations too.
  formationMatrix: s => {
    const found = JSON.parse(fs.readFileSync(new URL('./results/formation-search-deep.json', import.meta.url)));
    const set = { default: DEFAULT_FORMATION };
    found.roundRobin.formations.slice(1).forEach((f, i) => { set[`#${i + 1}`] = f; });
    const bot = { type: 'deep', nodes: 2000, weights: 'tuned' };
    seed = 1000000;
    return Object.entries(set).flatMap(([w, wf]) => Object.entries(set).flatMap(([b, bf]) =>
      Array.from({ length: 40 * s }, () => ({
        tag: `${w} v ${b}`, a: 'w', seed: seed++, white: bot, black: bot, whiteFormation: wf, blackFormation: bf,
        randomOpening: 2, maxPlies: 1000, labels: { w, b },
      }))));
  },
  // 10d. The three best formations from formationMatrix against each other, 200 games per pair, to
  // see whether one of them is really the best.
  topThree: s => {
    const f = JSON.parse(fs.readFileSync(new URL('./results/formation-search-deep.json', import.meta.url))).roundRobin.formations;
    const set = { 'mirrored and reshaped': f[3], 'wind 3 held back': f[1], 'fire in front of the wizard': f[2] };
    const bot = { type: 'deep', nodes: 2000, weights: 'tuned' }, names = Object.keys(set), out = [];
    seed = 1100000;
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++)
      for (let k = 0; k < 200 * s; k++) {
        const [w, b] = k % 2 ? [names[j], names[i]] : [names[i], names[j]];
        out.push({ tag: `${names[i]} v ${names[j]}`, a: k % 2 ? 'b' : 'w', seed: seed++, white: bot, black: bot,
          whiteFormation: set[w], blackFormation: set[b], randomOpening: 2, maxPlies: 1000, labels: { w, b } });
      }
    return out;
  },
  // 10e. Is a preset's mirror image as strong as the preset? Each preset, and its mirror image, plays
  // all seven presets, 40 games each (20 with each colour). A formation against its own mirror image
  // would prove nothing: the board is the same seen in a mirror, so that's a fair fight by symmetry.
  mirrorCheck: s => {
    const bot = { type: 'deep', nodes: 2000, weights: 'tuned' }, out = [];
    seed = 1200000;
    for (const [name, f] of Object.entries(FIRST_PRESETS))
      for (const [tag, fa] of [[name, f], [`${name} mirrored`, mirrorFiles(f)]])
        for (const [opp, fb] of Object.entries(FIRST_PRESETS))
          for (let k = 0; k < 40 * s; k++)
            out.push({ tag, opp, a: k % 2 ? 'b' : 'w', seed: seed++, white: bot, black: bot, randomOpening: 2, maxPlies: 1000,
              whiteFormation: k % 2 ? fb : fa, blackFormation: k % 2 ? fa : fb });
    return out;
  },
  // 10f. The seven presets in a round robin, 60 games per pair, played by the strongest bot (Deep 20k)
  // and, for comparison, by the search's bot (Deep 2k): does the ranking hold with stronger play?
  presets20k: s => presetRoundRobin({ type: 'deep', nodes: 20000, weights: 'tuned' }, 60 * s, 1300000),
  presets2k: s => presetRoundRobin({ type: 'deep', nodes: 2000, weights: 'tuned' }, 60 * s, 1400000),
  // 10g. Is neglecting Water early worse than neglecting another element? One side may not move any
  // piece holding the element during its first 10 moves; both sides are Deep 2k with learned values.
  neglect: s => {
    const bot = { type: 'deep', nodes: 2000, weights: 'tuned' };
    seed = 1500000;
    return ['original', 'windHeldBack'].flatMap(f => ['water', 'fire', 'wind', 'earth'].flatMap(element =>
      both(`${f}: no ${element} moves for the first 10 moves`, { ...bot, avoid: { element, moves: 10 } }, bot, 200 * s,
        { fa: PRESETS[f], fb: PRESETS[f], randomOpening: 2, maxPlies: 1000 })));
  },
  // 10h. The designer's Water movement candidates (GAME_SPEC open question 10), edge slide kept:
  // equal games from the default formation (Wind 3 held back), and the handicap test, one side
  // without Water 3, Fire 3 or Wind 3.
  waterRules: s => {
    const bot = { type: 'deep', nodes: 2000, weights: 'tuned' }, f = PRESETS.windHeldBack, ro = { randomOpening: 2, maxPlies: 1000 };
    seed = 1600000;
    return [['today', {}], ['river', { waterRiver: true }], ['straight steps', { waterStraightSteps: true }],
      ['river + straight steps', { waterRiver: true, waterStraightSteps: true }]].flatMap(([name, v]) => [
      ...Array.from({ length: 400 * s }, () => ({ tag: `${name}: equal`, a: 'w', seed: seed++, white: bot, black: bot,
        whiteFormation: f, blackFormation: f, ...ro, ...v })),
      ...[['g2', 'water3'], ['d1', 'fire3'], ['c1', 'wind3']].flatMap(([square, piece]) =>
        both(`${name}: without ${piece} (${square})`, bot, bot, 150 * s, { fa: without(f, square), fb: f, ...ro, ...v })),
    ]);
  },
  // 10i. The same for "when it bends, it bends diagonally", alone and with the river rule.
  waterBends: s => {
    const bot = { type: 'deep', nodes: 2000, weights: 'tuned' }, f = PRESETS.windHeldBack, ro = { randomOpening: 2, maxPlies: 1000 };
    seed = 1700000;
    return [['diagonal bends', { waterDiagonalBends: true }], ['river + diagonal bends', { waterRiver: true, waterDiagonalBends: true }]].flatMap(([name, v]) => [
      ...Array.from({ length: 400 * s }, () => ({ tag: `${name}: equal`, a: 'w', seed: seed++, white: bot, black: bot,
        whiteFormation: f, blackFormation: f, ...ro, ...v })),
      ...[['g2', 'water3'], ['d1', 'fire3'], ['c1', 'wind3']].flatMap(([square, piece]) =>
        both(`${name}: without ${piece} (${square})`, bot, bot, 150 * s, { fa: without(f, square), fb: f, ...ro, ...v })),
    ]);
  },
  // 10j. One way per move (the designer: "the river should only flow forward or backwards in one
  // turn"), alone and with the other candidates.
  waterOneWay: s => {
    const bot = { type: 'deep', nodes: 2000, weights: 'tuned' }, f = PRESETS.windHeldBack, ro = { randomOpening: 2, maxPlies: 1000 };
    seed = 1800000;
    return [['one way', { waterOneWay: true }], ['diagonal bends, one way', { waterDiagonalBends: true, waterOneWay: true }],
      ['river + diagonal bends, one way', { waterRiver: true, waterDiagonalBends: true, waterOneWay: true }],
      ['straight steps, one way', { waterStraightSteps: true, waterOneWay: true }]].flatMap(([name, v]) => [
      ...Array.from({ length: 400 * s }, () => ({ tag: `${name}: equal`, a: 'w', seed: seed++, white: bot, black: bot,
        whiteFormation: f, blackFormation: f, ...ro, ...v })),
      ...[['g2', 'water3'], ['d1', 'fire3'], ['c1', 'wind3']].flatMap(([square, piece]) =>
        both(`${name}: without ${piece} (${square})`, bot, bot, 150 * s, { fa: without(f, square), fb: f, ...ro, ...v })),
    ]);
  },
  // 12. Rules v0.3 (GAME_SPEC §3: Water bends diagonally, one way per move). The key tests again.
  // a. The strongest bot, Deep 20k, on v0.2 and v0.3 Water from Wind 3 held back: equal games and
  //    the handicap test without Water 3, Fire 3 or Wind 3.
  v03strong: s => {
    const bot = { type: 'deep', nodes: 20000, weights: 'tuned' }, f = PRESETS.windHeldBack, ro = { randomOpening: 2, maxPlies: 1000 };
    seed = 1900000;
    return [['v0.2', {}], ['v0.3', V03]].flatMap(([name, v]) => [
      ...Array.from({ length: 200 * s }, () => ({ tag: `${name}: equal`, a: 'w', seed: seed++, white: bot, black: bot,
        whiteFormation: f, blackFormation: f, ...ro, ...v })),
      ...[['g2', 'water3'], ['d1', 'fire3'], ['c1', 'wind3']].flatMap(([square, piece]) =>
        both(`${name}: without ${piece} (${square})`, bot, bot, 100 * s, { fa: without(f, square), fb: f, ...ro, ...v })),
    ]);
  },
  // b. Deep 2k on v0.3: White's edge from the default formation and from random ones, and the
  //    handicap test for every piece of Wind 3 held back and by element and size from random formations.
  v03recheck: s => {
    const bot = { type: 'deep', nodes: 2000, weights: 'tuned' }, f = PRESETS.windHeldBack, ro = { randomOpening: 2, maxPlies: 1000, ...V03 };
    seed = 2000000;
    const sameRandom = (tag, n, piece = null) => Array.from({ length: n }, (_, i) => ({
      tag, a: i % 2 ? 'b' : 'w', seed: seed++, white: bot, black: bot, whiteFormation: 'random', blackFormation: 'same', ...ro,
      ...(piece ? { remove: { side: i % 2 ? 'b' : 'w', piece } } : {}),
    }));
    return [
      ...Array.from({ length: 400 * s }, () => ({ tag: 'colours: default formation', a: 'w', seed: seed++, white: bot, black: bot,
        whiteFormation: f, blackFormation: f, ...ro })),
      ...sameRandom('colours: same random formation', 400 * s),
      ...Object.entries(f).filter(([, v]) => v !== 'wizard').flatMap(([square, [e, size]]) =>
        both(`handicap: without ${e}${size} (${square})`, bot, bot, 100 * s, { fa: without(f, square), fb: f, ...ro })),
      ...['fire', 'wind', 'water', 'earth'].flatMap(e => [3, 2, 1].flatMap(size =>
        sameRandom(`handicap random: without ${e}${size}`, 100 * s, [e, size]))),
    ];
  },
  // c. The style players (Careful with one habit) on v0.3: is there a dominant strategy now?
  v03styles: s => {
    const f = PRESETS.windHeldBack, x = { fa: f, fb: f, ...V03 };
    seed = 2100000;
    return [
      ...both('turtle v careful', { type: 'turtle' }, careful, 100 * s, x),
      ...both('rusher v careful', { type: 'rusher' }, careful, 100 * s, x),
      ...both('combiner v careful', { type: 'combiner' }, careful, 100 * s, x),
      ...both('never-combiner v careful', { type: 'neverCombiner' }, careful, 100 * s, x),
      ...both('hunter v careful', { type: 'hunter' }, careful, 100 * s, x),
    ];
  },
  // d. The seven presets' round robin on v0.3 (Deep 2k), as presets2k on v0.2.
  presetsV03: s => presetRoundRobin({ type: 'deep', nodes: 2000, weights: 'tuned' }, 60 * s, 2200000, V03),
  // e. The new search's best (Fire forward) against the default, Wind 3 held back, head to head.
  v03topTwo: s => {
    const ff = JSON.parse(fs.readFileSync(new URL('./results/formation-search-v03.json', import.meta.url))).roundRobin.formations[1];
    seed = 2300000;
    return [['deep 2k', 2000, 200], ['deep 20k', 20000, 100]].flatMap(([name, nodes, n]) => {
      const bot = { type: 'deep', nodes, weights: 'tuned' };
      return both(`${name}: fire forward v wind 3 held back`, bot, bot, n * s, { fa: ff, fb: PRESETS.windHeldBack, randomOpening: 2, maxPlies: 1000, ...V03 });
    });
  },
  // 12. Does Earth's comeback (§5: combine Earth with an attacker) work? Deep 2k from Wind 3 held back
  //     on v0.3, side A never combining Earth, from an equal start and from one piece down.
  earthComeback: s => {
    const bot = { type: 'deep', nodes: 2000, weights: 'tuned' }, noEarth = { ...bot, noEarthCombine: true };
    const f = PRESETS.windHeldBack, ro = { randomOpening: 2, maxPlies: 1000, ...V03 };
    seed = 2400000;
    return [
      ...both('equal: no earth combines v normal', noEarth, bot, 400 * s, { fa: f, fb: f, ...ro }),
      ...[['fire2', 'f1'], ['water3', 'g2']].flatMap(([piece, square]) => [
        ...both(`without ${piece}: normal v normal`, bot, bot, 400 * s, { fa: without(f, square), fb: f, ...ro }),
        ...both(`without ${piece}: no earth combines v normal`, noEarth, bot, 400 * s, { fa: without(f, square), fb: f, ...ro }),
      ]),
    ];
  },
  // 10j. "Earth breaks Earth" (GAME_SPEC open question 13): Earth combined with an attacker can
  // capture plain Earth, to break the Earth walls behind which drawn endings stall (FINDINGS §16).
  // Both sides score positions with WEIGHTS.earthWall; 'normal rules, tuned' is today's bot as a check.
  earthBreaks: s => {
    const tuned = { type: 'deep', nodes: 2000, weights: 'tuned' }, bot = { ...tuned, weights: 'earthWall' }, strong = { ...bot, nodes: 20000 };
    const f = PRESETS.windHeldBack, ro = { randomOpening: 2, maxPlies: 1000, ...V03 }, on = { ...ro, earthBreaksEarth: true };
    const shared = (tag, P, n, extra) => Array.from({ length: n }, () => ({ tag, a: 'w', seed: seed++, white: P, black: P, whiteFormation: 'random', blackFormation: 'same', ...extra }));
    seed = 2500000;
    return [
      ...both('normal rules, tuned', tuned, tuned, 400 * s, { fa: f, fb: f, ...ro }),
      ...both('normal rules', bot, bot, 400 * s, { fa: f, fb: f, ...ro }),
      ...both('earth breaks earth', bot, bot, 400 * s, { fa: f, fb: f, ...on }),
      ...shared('random formations: normal rules', bot, 400 * s, ro),
      ...shared('random formations: earth breaks earth', bot, 400 * s, on),
      ...both('deep 20k: normal rules', strong, strong, 400 * s, { fa: f, fb: f, ...ro }),
      ...both('deep 20k: earth breaks earth', strong, strong, 400 * s, { fa: f, fb: f, ...on }),
    ];
  },
  // 10k. The Wizard can't leave its zone (GAME_SPEC open question 14): its 3-row home zone, or the
  // 3×3 castle d1–f3, against today's rule. Random formations put the Wizard in the castle, so all
  // three rules start from the same kind of formation.
  wizardZone: s => {
    const bot = { type: 'deep', nodes: 2000, weights: 'tuned' }, strong = { ...bot, nodes: 20000 };
    const f = PRESETS.windHeldBack, ro = { randomOpening: 2, maxPlies: 1000, ...V03 };
    const shared = (tag, P, n, extra) => Array.from({ length: n }, () => ({ tag, a: 'w', seed: seed++, white: P, black: P, whiteFormation: 'randomCastle', blackFormation: 'same', ...extra }));
    const rules = [['anywhere', 'anywhere'], ['home zone', 'home'], ['castle', 'castle']];
    seed = 2600000;
    return [
      ...rules.flatMap(([name, zone]) => both(`wizard ${name}`, bot, bot, 400 * s, { fa: f, fb: f, ...ro, wizardZone: zone })),
      ...rules.flatMap(([name, zone]) => shared(`random formations: wizard ${name}`, bot, 400 * s, { ...ro, wizardZone: zone })),
      ...rules.flatMap(([name, zone]) => both(`deep 20k: wizard ${name}`, strong, strong, 400 * s, { fa: f, fb: f, ...ro, wizardZone: zone })),
    ];
  },
  // 10l. The castle return (GAME_SPEC open question 15): Wizards move freely, and a Wizard standing in
  // the enemy castle (d7–f9 for White) may, instead of moving, bring back one captured piece onto its
  // own home zone or own castle, once per visit or every turn. Against today's rule and the strict
  // castle of 10k. Both sides score with WEIGHTS.castleWalk, which pulls a Wizard toward the enemy
  // castle late in the game and is the same as `tuned` when the rule is off.
  castleReturn: s => {
    const bot = { type: 'deep', nodes: 2000, weights: 'castleWalk' }, strong = { ...bot, nodes: 20000 };
    const f = PRESETS.windHeldBack, ro = { randomOpening: 2, maxPlies: 1000, ...V03 };
    const shared = (tag, P, n, extra) => Array.from({ length: n }, () => ({ tag, a: 'w', seed: seed++, white: P, black: P, whiteFormation: 'randomCastle', blackFormation: 'same', ...extra }));
    const rules = [
      ['today', {}], ['strict castle', { wizardZone: 'castle' }],
      ['return once per visit, home zone', { castleReturn: 'oncePerVisit', returnTo: 'home' }],
      ['return once per visit, home castle', { castleReturn: 'oncePerVisit', returnTo: 'castle' }],
      ['return every turn, home zone', { castleReturn: 'everyTurn', returnTo: 'home' }],
    ];
    seed = 2700000;
    return [
      ...rules.flatMap(([name, r]) => both(name, bot, bot, 400 * s, { fa: f, fb: f, ...ro, ...r })),
      ...rules.flatMap(([name, r]) => shared(`random formations: ${name}`, bot, 400 * s, { ...ro, ...r })),
      ...rules.flatMap(([name, r]) => both(`deep 20k: ${name}`, strong, strong, 400 * s, { fa: f, fb: f, ...ro, ...r })),
    ];
  },
  // 11. Chess calibration (chess/): the same pipeline on a game with known answers.
  // a. Deep 2k with naive values (every piece worth 1) against itself, to learn values from.
  chessSelfplay: s => Array.from({ length: 4000 * s }, (_, i) => ({
    game: 'chess', tag: 'chess: deep 2k naive', a: 'w', seed: 500000 + i, randomOpening: 2,
    white: { type: 'deep', nodes: 2000, values: 'naive' }, black: { type: 'deep', nodes: 2000, values: 'naive' },
  })),
  // a2. The same with the round-1 learned values, for a second round of learning.
  chessSelfplayTuned: s => Array.from({ length: 4000 * s }, (_, i) => ({
    game: 'chess', tag: 'chess: deep 2k tuned', a: 'w', seed: 700000 + i, randomOpening: 2,
    white: { type: 'deep', nodes: 2000, values: 'tuned' }, black: { type: 'deep', nodes: 2000, values: 'tuned' },
  })),
  // b. The key tests on chess with the learned values: White against Black, and the handicap test
  // (one side without its queen, a rook, a bishop, a knight or a pawn), like Elements in recheck.
  chessRecheck: s => {
    const bot = { type: 'deep', nodes: 2000, values: 'tuned' }, chess = { game: 'chess', randomOpening: 2 };
    seed = 600000;
    return [
      ...mirror('chess: colours', bot, 400 * s, chess),
      ...[['queen', 'd1'], ['rook', 'a1'], ['bishop', 'c1'], ['knight', 'b1'], ['pawn', 'f2']].flatMap(([piece, square]) =>
        Array.from({ length: 200 * s }, (_, i) => {
          const a = i % 2 ? 'b' : 'w';
          return { tag: `chess: without ${piece} (${square})`, a, seed: seed++, white: bot, black: bot, remove: { side: a, squares: [square] }, ...chess };
        })),
    ];
  },
  // c. How much learned values help in chess, compared with Elements (§10 of FINDINGS).
  chessRating: s => roundRobin('chess rating', {
    'deep 2k naive': { type: 'deep', nodes: 2000, values: 'naive' }, 'deep 2k classic': { type: 'deep', nodes: 2000, values: 'classic' },
    'deep 2k tuned': { type: 'deep', nodes: 2000, values: 'tuned' }, 'deep 20k tuned': { type: 'deep', nodes: 20000, values: 'tuned' },
  }, 100 * s, { game: 'chess' }),
  // 7. Formations against the default one.
  formations: s => [
    ...both('random formation v default', careful, careful, 200 * s, { fa: 'random' }),
    ...both('fortress v default', careful, careful, 100 * s, { fa: 'fortress' }),
    ...both('bunker v default', careful, careful, 100 * s, { fa: 'bunker' }),
    ...both('turtle in fortress v careful', { type: 'turtle' }, careful, 100 * s, { fa: 'fortress' }),
  ],
  // 7b. Do the searched and hand-made formations hold off the default formation's Water?
  // analyze.mjs shows how side A (the formation under test) was mated.
  formationWater: s => ['default', 'fireForward', 'fireForward2', 'earthShield'].flatMap(f =>
    both(`${f} v default`, careful, careful, 150 * s, { fa: f })),
};
