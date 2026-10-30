// One test per rule in GAME_SPEC.md, using the spec's own examples where it gives one.
// Positions are in the one-line text form (src/notation.ts): ranks 9 down to 1, upper case White.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fromPositionText, legalActions, apply, status, pieceAt, parseSquare, squareName, parseAction, positionText,
  PRESETS, DEFAULT_FORMATION, startFromFormations, type GameState, type RulesConfig,
} from '../src/index.ts';

const at = (text: string, config: Partial<RulesConfig> = {}) => fromPositionText(text, config);
const dests = (st: GameState, from: string) =>
  legalActions(st).filter(a => a.from === parseSquare(from)).map(a => squareName(a.to)).sort();
const play = (st: GameState, ...moves: string[]) => moves.reduce((s, m) => apply(s, parseAction(m)).state, st);

// §3 Water movement rule: Water 3 on b2, Earth on c3 (the spec's example).
const WATER_EXAMPLE = '4z4/9/9/9/8Z/9/2E16/1R37/9 w';
// The v0.2 Water rule, kept as a playtest switch: bends with any step, forward and back in one move.
const V02: Partial<RulesConfig> = { waterDiagonalBends: false, waterOneWay: false };

test('§3 v0.3 Water: flows, bends diagonally around Earth, slides along the edge, one way per move (spec example)', () => {
  assert.deepEqual(dests(at(WATER_EXAMPLE), 'b2'), ['a1', 'b1', 'b3', 'b4', 'b5', 'c1', 'c4', 'c5', 'd1']);
});

test('§3 v0.3 Water: no sideways bend, and no turning back within a move', () => {
  const d = dests(at(WATER_EXAMPLE), 'b2');
  assert.ok(!d.includes('c2'), 'b2 → c2 is a sideways step around the Earth');
  assert.ok(!d.includes('c2') && !d.includes('a2'), 'b2 → b1 → c1 → c2 and b2 → b1 → a1 → a2 turn back up');
});

test('§3 v0.2 Water flows, banks around Earth, and comes back (spec example)', () => {
  const d = dests(at(WATER_EXAMPLE, V02), 'b2');
  for (const s of ['b5', 'd2', 'd3', 'c4', 'd1']) assert.ok(d.includes(s), `b2 should reach ${s}`);
});

test('§3 v0.2 Water slides along the edge: b2 → b1 → a1 → a2 (spec example)', () => {
  assert.ok(dests(at(WATER_EXAMPLE, V02), 'b2').includes('a2'));
  const noEdge = dests(at(WATER_EXAMPLE, { ...V02, noWaterEdge: true }), 'b2');
  assert.ok(!noEdge.includes('a2') && !noEdge.includes('a1'), 'no edge slide: a1 and a2 are out of reach');
  assert.ok(noEdge.includes('b1'), 'flowing down to b1 is still fine');
});

test('§3 Straight captures: Water may bend to move, but must capture with a straight flow', () => {
  // White Water 2 on b2, Earth on c3; Black Fire on d3 (reachable only by banking) and on b4 (straight).
  const text = '4z4/9/9/9/1f16Z/9/2E1f15/1R27/9 w';
  assert.deepEqual(['b4', 'd3'].filter(s => dests(at(text, V02), 'b2').includes(s)), ['b4', 'd3']);
  assert.deepEqual(['b4', 'd3'].filter(s => dests(at(text, { ...V02, waterStraightCapture: true }), 'b2').includes(s)), ['b4']);
});

test('Open question 10: the river rule and straight steps', () => {
  // Water 3 on d3 with an Earth right in front on d4, and Water 3 on d2 with an Earth diagonal on e3.
  const inFront = '4z4/9/9/9/8Z/3E15/3R35/9/9 w', diagonal = '4z4/9/9/9/8Z/9/4E14/3R35/9 w';
  const reach = (text: string, from: string, config: Partial<RulesConfig>) => dests(at(text, { ...V02, ...config }), from);
  // River: the Earth in its column still lets it past (d3 → c4 → d5); the diagonal Earth gives no turn.
  assert.ok(reach(inFront, 'd3', { waterRiver: true }).includes('d5'));
  assert.ok(reach(diagonal, 'd2', {}).includes('f3'));
  assert.ok(!reach(diagonal, 'd2', { waterRiver: true }).includes('f3'));
  // Straight steps: no diagonal step past the Earth, so d5 is 4 steps away; c5 is 3 (d3 → c3 → c4 → c5).
  const both = reach(inFront, 'd3', { waterRiver: true, waterStraightSteps: true });
  assert.ok(!both.includes('d5') && both.includes('c5'));
  assert.ok(reach(diagonal, 'd2', { waterStraightSteps: true }).includes('f3'), 'straight steps alone still bend around any Earth');
});

test('§3 Exact range: pieces move exactly N squares', () => {
  const d = dests(at('4z4/9/9/9/4F34/9/9/9/Z8 w', { exactRange: true }), 'e5');
  assert.deepEqual(d, ['b5', 'e2', 'e8', 'h5']);
});

test('§3/§4 Earth blocks, can\'t capture and can\'t be captured', () => {
  // White Earth on d4; Black Fire on d5 and Black Earth on e4 right next to it.
  const st = at('4z4/9/9/9/3f15/3E1e14/9/9/Z8 w');
  const d = dests(st, 'd4');
  assert.ok(!d.includes('d5') && !d.includes('e4'), 'Earth captures nothing');
  assert.ok(!dests({ ...st, toMove: 'black' }, 'd5').includes('d4'), 'Fire can\'t take Earth');
});

test('Open question 13: Earth breaks Earth, only a stack holding Earth, only when switched on', () => {
  // White Earth 2 + Fire 3 stack on e5 and plain Earth on d6; Black plain Earths on d7 and e7
  // guarding the Wizard on e8.
  const text = '9/4z4/3e1e14/3E15/4(F3E2)4/9/9/9/Z8 w';
  assert.ok(!dests(at(text), 'e5').includes('e7'), 'normal rules: the Earth on e7 blocks');
  const on = at(text, { earthBreaksEarth: true });
  assert.ok(dests(on, 'e5').includes('e7'), 'the Earth + Fire stack takes the Earth on e7');
  const after = play(on, 'e5-e7');
  assert.deepEqual(pieceAt(after, parseSquare('e7')), {
    owner: 'white', kind: 'element', units: [{ element: 'fire', size: 3 }, { element: 'earth', size: 2 }],
  });
  assert.ok(!dests(on, 'd6').includes('d7'), 'plain Earth still captures nothing');
  const fire = at('9/4z4/3e1e14/9/4F34/9/9/9/Z8 w', { earthBreaksEarth: true });
  assert.ok(!dests(fire, 'e5').includes('e7'), 'a plain Fire still can\'t take Earth');
});

test('Open question 14: the Wizard stays in its home zone or its castle, only when switched on', () => {
  // White's Wizard on f3, the castle's corner and the home zone's top row.
  const text = '4z4/9/9/9/F17f1/9/5Z3/9/9 w';
  assert.deepEqual(dests(at(text), 'f3'), ['e2', 'e3', 'e4', 'f2', 'f4', 'g2', 'g3', 'g4']);
  assert.deepEqual(dests(at(text, { wizardZone: 'home' }), 'f3'), ['e2', 'e3', 'f2', 'g2', 'g3']);
  assert.deepEqual(dests(at(text, { wizardZone: 'castle' }), 'f3'), ['e2', 'e3', 'f2']);
  assert.throws(() => startFromFormations({ ...DEFAULT_FORMATION, e1: { element: 'earth', size: 1 }, b1: 'wizard' }, DEFAULT_FORMATION,
    { config: { wizardZone: 'castle' } }), /outside the castle/);
});

test('§6 Castles: a Wizard in the enemy castle brings a captured piece back, once per visit (or every turn)', () => {
  // White's Wizard on e7, inside Black's castle; White has only Fire 1 left, so 11 units are captured.
  const text = 'z8/9/4Z4/9/8f1/9/9/9/F18 w';
  const returns = (st: GameState) => legalActions(st).filter(a => a.from >= 81);
  assert.equal(returns(at(text, { castleReturn: 'off' })).length, 0, 'switched off');
  const once = at(text);
  assert.equal(returns(once).length, 11 * 9, 'each captured unit onto each square of the home castle');
  assert.equal(returns(at(text, { returnTo: 'home' })).length, 11 * 26, 'or, as a variant, of the home zone (a1 is taken)');
  const water3 = { from: 81 + 2 * 3 + 2, to: parseSquare('e2') };
  const back = apply(once, water3).state;
  assert.deepEqual(pieceAt(back, parseSquare('e2')), { owner: 'white', kind: 'element', units: [{ element: 'water', size: 3 }] });
  assert.equal(back.clock, 0, 'a return restarts the 75-move count, like a capture');
  assert.equal(returns(play(back, 'i5-i6')).length, 0, 'once per visit: not again while the Wizard stays');
  const again = play(back, 'i5-i6', 'e7-e6', 'i6-i5', 'e6-e7', 'i5-i6');
  assert.ok(returns(again).length > 0, 'after leaving the castle and coming back');
  const every = apply(at(text, { castleReturn: 'everyTurn', returnTo: 'castle' }), water3).state;
  assert.ok(returns(play(every, 'i5-i6')).length > 0, 'every turn: again on the next turn');
});

test('§5 Combining: Wind 3 onto Water 1 makes one piece that moves 3 as either element', () => {
  const st = play(at('4z3f1/9/9/9/9/9/1W37/2R16/Z8 w'), 'b3-c2', 'e9-e8');
  assert.deepEqual(pieceAt(st, parseSquare('c2')), {
    owner: 'white', kind: 'element', units: [{ element: 'wind', size: 3 }, { element: 'water', size: 1 }],
  });
  const d = dests(st, 'c2');
  assert.ok(d.includes('c5'), 'flows 3 as Water');
  assert.ok(d.includes('f5'), 'slides 3 diagonally as Wind');
  assert.ok(!d.includes('c6'), 'not 4');
});

test('§5 A stack never combines again, and the same element can\'t combine', () => {
  // White stack (R1W3) on c2, own Earth on c5 (a Water flow away) and on d3 (a Wind step away).
  const st = at('4z4/9/9/9/2E16/9/3E15/2(R1W3)6/Z8 w');
  const d = dests(st, 'c2');
  assert.ok(!d.includes('c5') && !d.includes('d3'), 'a stack can\'t move onto its own pieces');
  assert.ok(!dests(st, 'd3').includes('c2'), 'nothing can move onto a stack');
  assert.ok(!dests(at('4z4/9/9/9/9/9/1W37/2W16/Z8 w'), 'b3').includes('c2'), 'Wind can\'t combine with Wind');
});

test('§5 Earth + Fire moves only as Fire, can be captured, and is no longer a bank for Water', () => {
  const st = play(at('4z3f1/9/9/9/4E24/3R1F14/9/9/Z8 w'), 'e4-e5', 'e9-e8');
  const d = dests(st, 'e5');
  assert.ok(d.includes('e7') && d.includes('c5'), 'moves orthogonally, range 2');
  assert.ok(!d.includes('f6'), 'not diagonally like Earth');
  assert.deepEqual(dests(st, 'd4'), ['d3', 'd5'], 'Water 1 next to the stack can only flow: the stack is no bank');
});

test('§6 You may not leave your Wizard attacked', () => {
  // White Wind on e2 shields the Wizard on e1 from Black Fire 3 on e4; every Wind move opens the line.
  assert.deepEqual(dests(at('4z4/9/9/9/9/4f34/9/4W14/4Z4 w'), 'e2'), []);
});

test('§6 Water gives check along the edge and around Earth', () => {
  assert.equal(status(at('4z4/9/9/9/9/9/9/9/4Z1r22 w')).inCheck, true, 'r2 on g1 → f1 → e1 along the edge');
  const around = '4z4/9/9/9/9/9/5r23/4E14/4Z4 w'; // r2 on f3 → f2 → e1, banking around the Earth on e2
  assert.equal(status(at(around)).inCheck, true);
  assert.equal(status(at(around, { waterStraightCapture: true })).inCheck, false, 'not with straight captures');
});

test('§6 Elimination: taking the last capturing piece wins', () => {
  const { state } = apply(at('z8/e18/9/9/4f14/4F14/9/9/8Z w'), parseAction('e4-e5'));
  assert.deepEqual(state.result, { winner: 'white', reason: 'elimination' });
});

test('§6 Checkmate', () => {
  // Black Wizard on a9. Fire 3 from a5 to a6 checks along the a-file; Fire 3 on b6 covers b8 and b9.
  const { state } = apply(at('z8/9/9/1F37/F33f14/9/9/9/8Z w'), parseAction('a5-a6'));
  assert.deepEqual(state.result, { winner: 'white', reason: 'checkmate' });
});

test('§6 Stalemate is a draw', () => {
  // Black's Fire on i9 is walled in by White Earth; every Wizard square is covered, but a9 isn't attacked.
  const { state } = apply(at('z1F14E1f1/3F14E1/F18/9/9/9/9/9/4Z4 w'), parseAction('d8-c8'));
  assert.deepEqual(state.result, { winner: null, reason: 'stalemate' });
});

test('§6 Threefold repetition is a draw', () => {
  const st = play(at('8f1/4z4/9/9/9/9/9/4Z4/F18 w'), 'a1-a2', 'i9-i8', 'a2-a1', 'i8-i9', 'a1-a2', 'i9-i8', 'a2-a1');
  assert.equal(st.result, null);
  assert.deepEqual(apply(st, parseAction('i8-i9')).state.result, { winner: null, reason: 'repetition' });
});

test('§6 The 75-move rule: 75 moves each without a capture or combine is a draw', () => {
  const st = { ...at('8f1/4z4/9/9/9/9/9/4Z4/F18 w'), clock: 148 };
  assert.equal(apply(st, parseAction('a1-a2')).state.result, null, '74½ moves each');
  assert.deepEqual(apply({ ...st, clock: 149 }, parseAction('a1-a2')).state.result, { winner: null, reason: 'moveLimit' });
});

test('§6 The move limit is a rule setting: 50 (the chess rule), or off', () => {
  const st = { ...at('8f1/4z4/9/9/9/9/9/4Z4/F18 w', { quietMoveLimit: 50 }), clock: 99 };
  assert.deepEqual(apply(st, parseAction('a1-a2')).state.result, { winner: null, reason: 'moveLimit' });
  const off = { ...at('8f1/4z4/9/9/9/9/9/4Z4/F18 w', { quietMoveLimit: 0 }), clock: 999 };
  assert.equal(apply(off, parseAction('a1-a2')).state.result, null, '0 means no limit');
});

test('§6 A capture or combine resets the move count', () => {
  const st = { ...at('8f1/4z4/9/9/9/9/9/f13Z4/F18 w'), clock: 149 };
  const next = apply(st, parseAction('a1-a2')).state;
  assert.equal(next.clock, 0);
  assert.equal(next.result, null);
});

test('§6 Every preset formation is complete, inside its zone, and starts a playable game', () => {
  for (const [name, f] of Object.entries(PRESETS)) {
    assert.equal(Object.keys(f).length, 13, `${name}: 13 pieces`);
    assert.equal(Object.values(f).filter(v => v === 'wizard').length, 1, `${name}: one Wizard`);
    const st = startFromFormations(f);
    assert.ok(legalActions(st).length > 0 && !status(st).inCheck, `${name}: White can move and isn't in check`);
  }
  assert.equal(DEFAULT_FORMATION, PRESETS.windHeldBack);
});

test('Position text round-trips', () => {
  for (const t of [WATER_EXAMPLE, '4z4/9/2E1R1(F3W2)4/9/9/9/2e16/1R37/4Z4 b']) assert.equal(positionText(at(t)), t);
});
