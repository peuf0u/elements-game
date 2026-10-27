import fs from 'node:fs';
const html = fs.readFileSync(process.argv[2], 'utf8');
const code = html.match(/<script id="rules">([\s\S]*?)<\/script>/)[1];
const R = new Function(code + '; return Rules;')();
const P = (o, e, s) => (e === 'wiz' ? { o, wiz: true } : { o, els: [{ e, s }] });
const board = items => { const b = Array(81).fill(null); for (const [sq, p] of Object.entries(items)) b[R.parse(sq)] = p; return b; };
const dests = (b, from) => R.pseudoMoves(b, R.parse(from)).map(m => R.name(m.to) + (m.kind !== 'move' ? `(${m.kind})` : '')).sort();
const route = (b, from, to) => R.pseudoMoves(b, R.parse(from)).find(m => m.to === R.parse(to))?.path.map(R.name).join('→');
const shift = (sq, dx, dy) => String.fromCharCode(sq.charCodeAt(0) + dx) + (parseInt(sq.slice(1)) + dy);
let ok = true;
const expect = (label, got, want) => { const pass = JSON.stringify(got) === JSON.stringify(want); ok &&= pass; console.log(pass ? 'PASS' : 'FAIL', label, pass ? '' : `\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`); };

// --- Water example, shifted to the middle of the board (no edges involved) ---
const dx = 3, dy = 3, s = t => shift(t, dx, dy), un = t => shift(t, -dx, -dy);
let b = board({ [s('b2')]: P('w', 'water', 3), [s('c3')]: P('w', 'earth', 1) });
const mid = dests(b, s('b2')).map(un).sort();
console.log('Water b2 + Earth c3 (shifted, no edges):', mid.join(' '));
for (const t of ['b5', 'b4', 'b3', 'c2', 'd2', 'd3', 'c4', 'd1']) expect(`spec route reaches ${t}`, mid.includes(t), true);
expect('✗ a2 not reachable', mid.includes('a2'), false);
for (const [to, want] of [['b5', 'b2→b3→b4→b5'], ['d2', 'b2→c2→d2'], ['d3', 'b2→c2→d3'], ['c4', 'b2→b3→c4'], ['d1', 'b2→c2→d2→d1']])
  console.log('  shown route to', to, '=', route(b, s('b2'), s(to)).split('→').map(un).join('→'), 'spec:', want);

// --- Same example at the real board corner (a-file and rank 1 are edges) ---
b = board({ b2: P('w', 'water', 3), c3: P('w', 'earth', 1) });
const corner = dests(b, 'b2');
console.log('Water b2 + Earth c3 (real corner):', corner.join(' '));
console.log('  extra vs middle:', corner.filter(t => !mid.includes(t)).join(' '), ' missing vs middle:', mid.filter(t => !corner.includes(t)).join(' '));
console.log('  route to a2:', route(b, 'b2', 'a2'));

// exact range
R.variant.exact = true;
b = board({ [s('b2')]: P('w', 'water', 3), [s('c3')]: P('w', 'earth', 1) });
console.log('Exact range, shifted:', dests(b, s('b2')).map(un).sort().join(' '));
b = board({ d4: P('w', 'fire', 3), d5: P('b', 'wind', 1) });
expect('exact: Fire 3 cannot take adjacent enemy', dests(b, 'd4'), ['a4', 'd1', 'g4']);
R.variant.exact = false;
expect('up to N: Fire 3 takes adjacent enemy', dests(b, 'd4'), ['a4', 'b4', 'c4', 'd1', 'd2', 'd3', 'd5(capture)', 'e4', 'f4', 'g4'].sort());

// --- Earth: can't capture, can't be captured; Water bends around enemy Earth to capture ---
b = board({ e5: P('w', 'earth', 2), e6: P('b', 'fire', 1), d5: P('b', 'earth', 1) });
expect('Earth cannot capture', dests(b, 'e5').some(t => t.includes('capture')), false);
b = board({ e4: P('w', 'fire', 3), e5: P('b', 'earth', 1) });
expect('Fire cannot take Earth / pass it', dests(b, 'e4').filter(t => t[0] === 'e'), ['e1', 'e2', 'e3']);
// tactical example: Earth bank lets Water capture
b = board({ d3: P('w', 'water', 3), e5: P('b', 'fire', 2) });
expect('without Earth, Water d3 cannot reach Fire e5', dests(b, 'd3').includes('e5(capture)'), false);
b = board({ d3: P('w', 'water', 3), e4: P('b', 'earth', 1), e5: P('b', 'fire', 2) });
console.log('  with enemy Earth e4, route to e5:', route(b, 'd3', 'e5'));
expect('enemy Earth e4 lets Water capture Fire e5', dests(b, 'd3').includes('e5(capture)'), true);

// --- Combining ---
let st = R.fromPosition(board({ e1: P('w', 'wiz'), e9: P('b', 'wiz'), c3: P('w', 'fire', 3), c4: P('w', 'wind', 1), d3: P('w', 'fire', 1), g7: P('b', 'water', 2) }), 'w');
const comb = R.legalFrom(st.board, R.parse('c3')).find(m => m.to === R.parse('c4'));
expect('Fire c3 → own Wind c4 is a combine', comb && comb.kind, 'combine');
expect('Fire c3 → own Fire d3 (same element) not allowed', R.legalFrom(st.board, R.parse('c3')).some(m => m.to === R.parse('d3')), false);
st = R.makeMove(st, comb);
const stack = st.board[R.parse('c4')];
expect('stack holds both', stack.els.map(x => x.e + x.s), ['fire3', 'wind1']);
expect('turn passes to Black', st.turn, 'b');
console.log('Stack Fire3+Wind1 on c4 moves to:', R.pseudoMoves(st.board, R.parse('c4')).map(m => R.name(m.to) + ':' + m.as).join(' '));
expect('stack moves diagonally 3 (range = larger)', R.pseudoMoves(st.board, R.parse('c4')).some(m => R.name(m.to) === 'f7' && m.as === 'wind'), true);
expect('stack cannot move onto own piece', R.pseudoMoves(st.board, R.parse('c4')).some(m => m.kind === 'combine'), false);
// Earth+Fire: moves only as Fire, capturable, not a bank
b = board({ d4: { o: 'w', els: [{ e: 'earth', s: 3 }, { e: 'fire', s: 1 }] }, c3: P('b', 'water', 2) });
expect('Earth+Fire moves only orthogonally, range 3', dests(b, 'd4').filter(t => !t.includes('(')).every(t => t[0] === 'd' || t[1] === '4'), true);
expect('Earth+Fire is capturable by Water flowing in', dests(b, 'c3').includes('d4(capture)'), false); // c3→d4 not a flow; check bank below
b = board({ d4: { o: 'w', els: [{ e: 'earth', s: 3 }, { e: 'fire', s: 1 }] }, d2: P('b', 'water', 2) });
expect('Water flows up and captures Earth+Fire', dests(b, 'd2').includes('d4(capture)'), true);
expect('Earth+Fire is not a bank for Water (c1/e1 come from the edge)', dests(b, 'd2').sort(), ['c1', 'd1', 'd3', 'd4(capture)', 'e1'].sort());

// --- Capture of a combined piece: both elements lost ---
st = R.fromPosition(board({ e1: P('w', 'wiz'), a9: P('b', 'wiz'), e3: P('w', 'fire', 2), e5: { o: 'b', els: [{ e: 'wind', s: 2 }, { e: 'water', s: 1 }] }, h8: P('b', 'fire', 1) }), 'w');
st = R.makeMove(st, R.legalFrom(st.board, R.parse('e3')).find(m => m.to === R.parse('e5')));
expect('captured stack recorded whole', st.captured.w[0].els.map(x => x.e), ['wind', 'water']);
expect('game continues (Black still has Fire)', st.phase, 'play');

// --- Check: may not leave Wizard attacked; Water gives check around Earth ---
st = R.fromPosition(board({ e1: P('w', 'wiz'), e9: P('b', 'wiz'), e2: P('w', 'fire', 1), e4: P('b', 'fire', 3) }), 'w');
expect('pinned Fire e2 may only stay on the e-file', R.legalFrom(st.board, R.parse('e2')).map(m => R.name(m.to) + (m.kind !== 'move' ? '(' + m.kind + ')' : '')).sort(), ['e3']);
b = board({ e1: P('w', 'wiz'), d3: P('w', 'earth', 1), c4: P('b', 'water', 3), a9: P('b', 'wiz') });
console.log('Water c4 attacks:', dests(b, 'c4').join(' '));
expect('Water c4 checks Wizard e1? (via bank around d3)', R.inCheck(b, 'w'), dests(b, 'c4').includes('e1(capture)'));

// --- Checkmate ---
// White Wizard a1 boxed by own Earth a2/b2? Earth is own, so pieces: Black Fire b9 size 3? use a clean mate:
st = R.fromPosition(board({ a1: P('w', 'wiz'), a2: P('w', 'earth', 1), b2: P('w', 'earth', 1), h1: P('w', 'water', 1), e8: P('b', 'wiz'), c1: P('b', 'fire', 1), c2: P('b', 'wind', 1) }), 'b');
const mateMove = R.legalFrom(st.board, R.parse('c1')).find(m => m.to === R.parse('b1'));
st = R.makeMove(st, mateMove);
expect('Fire c1→b1, guarded by Wind c2, is checkmate (Wizard a1 boxed by own Earth)', st.result, { winner: 'b', reason: 'checkmate' });
// same idea but White can capture the checker: not mate
st = R.fromPosition(board({ a1: P('w', 'wiz'), a2: P('w', 'earth', 1), b2: P('w', 'earth', 1), e1: P('w', 'fire', 3), e8: P('b', 'wiz'), c1: P('b', 'fire', 1), c2: P('b', 'wind', 1) }), 'b');
st = R.makeMove(st, R.legalFrom(st.board, R.parse('c1')).find(m => m.to === R.parse('b1')));
expect('…not mate when Fire e1 can take on b1', [st.phase, R.inCheck(st.board, 'w')], ['play', true]);

// --- Elimination win beats stalemate (end-check order) ---
st = R.fromPosition(board({ a1: P('w', 'wiz'), c1: P('w', 'wind', 2), i9: P('b', 'wiz'), e3: P('b', 'water', 1), h8: P('b', 'earth', 1), g9: P('b', 'earth', 1), h9x: null }), 'w');
delete st.board[NaN];
st = R.makeMove(st, R.legalFrom(st.board, R.parse('c1')).find(m => m.to === R.parse('e3')));
expect('taking the last capturing piece wins', st.result, { winner: 'w', reason: 'elimination' });

// --- Stalemate ---
st = R.fromPosition(board({ a1: P('b', 'wiz'), a2: P('w', 'earth', 1), b2: P('w', 'earth', 1), b1: P('w', 'earth', 1), e5: P('b', 'fire', 1), d5: P('w', 'earth', 1), f5: P('w', 'earth', 1), e4: P('w', 'earth', 1), e7: P('w', 'earth', 1), i9: P('w', 'wiz') }), 'w');
st = R.makeMove(st, R.legalFrom(st.board, R.parse('e7')).find(m => m.to === R.parse('e6')));
expect('Earth e7→e6 boxes everything in: stalemate draw', st.result, { winner: null, reason: 'stalemate' });

// --- Formation ---
st = R.newGame();
expect('White must place the Wizard first', [R.canPick(st, 0), R.canPick(st, 1)], [true, false]);
expect('White places only in rows 1–3', R.placeTargets(st, 0).length, 27);
for (let i = 0; i < 26; i++) { const o = st.turn; st = R.place(st, 0, R.placeTargets(st, 0)[0]); }
expect('after 26 placements play starts with White', [st.phase, st.turn], ['play', 'w']);

console.log(ok ? '\nALL PASS' : '\nSOME FAILED');
