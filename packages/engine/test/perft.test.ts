// Perft: count every sequence of legal moves to a fixed depth from a position, and compare with
// known totals (architecture research §9). Any change to these numbers means move generation changed.
// The totals were computed with the spike's rules (spike/index.html) on 2026-10-28 and match this
// engine; playtest/check.mjs compares the two engines move by move. "v0.2" cases use the old Water
// rule (and its variants); "v0.3" cases use today's defaults: diagonal bends, one way per move.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fromPositionText, positionOf, type RulesConfig } from "../src/index.ts";
import { legalMoves, type Position } from "../src/core.ts";

const buffers = Array.from({ length: 6 }, () => new Int32Array(512));
export function perft(pos: Position, depth: number): number {
  if (depth === 0) return 1;
  const moves = buffers[depth], n = legalMoves(pos, moves);
  if (depth === 1) return n;
  let total = 0;
  for (let i = 0; i < n; i++) { pos.make(moves[i]); total += perft(pos, depth - 1); pos.unmake(); }
  return total;
}

const V02 = { waterDiagonalBends: false, waterOneWay: false };
const VARIANTS: Record<string, Partial<RulesConfig>> = {
  'v0.3': {}, 'v0.2': V02, exactRange: { ...V02, exactRange: true }, noWaterEdge: { ...V02, noWaterEdge: true },
  waterStraightCapture: { ...V02, waterStraightCapture: true },
};

// [description, variant, position, totals at depth 1, 2, 3]
const CASES: Array<[string, string, string, number[]]> = [
  ["default formation", "v0.2", "3f2zf33/2r3f1r2w1r12/1w2e21e31e1w31/9/9/9/1W3E11E31E2W21/2R1W1R2F1R32/3F3ZF23 w", [92, 8420, 721921]],
  ["random formations", "v0.2", "e11e2e31r2r1r31/1w21f3f1w11w31/2f23z2/9/9/9/R12E31F3R21E2/W1E14ZF1W3/R3F24W22 w", [71, 3988, 275384]],
  ["midgame 1 (3 stacks)", "v0.2", "(e3w2)6w31/4r33z/f12f3r22w1e2/2(r1e1)1f24/2E14E21/4E34/1W35W21/3(R1W1)R24/3F3ZF23 w", [68, 3178, 206293]],
  ["midgame 1 (3 stacks)", "exactRange", "(e3w2)6w31/4r33z/f12f3r22w1e2/2(r1e1)1f24/2E14E21/4E34/1W35W21/3(R1W1)R24/3F3ZF23 w", [31, 738, 22829]],
  ["midgame 1 (3 stacks)", "noWaterEdge", "(e3w2)6w31/4r33z/f12f3r22w1e2/2(r1e1)1f24/2E14E21/4E34/1W35W21/3(R1W1)R24/3F3ZF23 w", [68, 2773, 179763]],
  ["midgame 1 (3 stacks)", "waterStraightCapture", "(e3w2)6w31/4r33z/f12f3r22w1e2/2(r1e1)1f24/2E14E21/4E34/1W35W21/3(R1W1)R24/3F3ZF23 w", [68, 3177, 206142]],
  ["midgame 2 (6 stacks)", "v0.2", "(e2w1)f15f2r3/3e11f33/r23z2(r1w3)1/6e32/1w27/6(W1R3)2/6R22/2F13(F3E1)W21/(W3R1)2(F2E2)2ZE31 b", [71, 3233, 204731]],
  ["midgame 2 (6 stacks)", "exactRange", "(e2w1)f15f2r3/3e11f33/r23z2(r1w3)1/6e32/1w27/6(W1R3)2/6R22/2F13(F3E1)W21/(W3R1)2(F2E2)2ZE31 b", [33, 692, 21964]],
  ["midgame 2 (6 stacks)", "noWaterEdge", "(e2w1)f15f2r3/3e11f33/r23z2(r1w3)1/6e32/1w27/6(W1R3)2/6R22/2F13(F3E1)W21/(W3R1)2(F2E2)2ZE31 b", [70, 2976, 183484]],
  ["midgame 2 (6 stacks)", "waterStraightCapture", "(e2w1)f15f2r3/3e11f33/r23z2(r1w3)1/6e32/1w27/6(W1R3)2/6R22/2F13(F3E1)W21/(W3R1)2(F2E2)2ZE31 b", [71, 3233, 206297]],
  ["midgame 3 (5 stacks)", "v0.2", "w35w2e31/1(r1w1)(E3W3)5f1/1e12R24/3z5/E18/3(f2r3)4(R3W2)/3R15/r22W1(E2F1)4/3F3ZF23 w", [43, 1881, 83780]],
  ["midgame 3 (5 stacks)", "exactRange", "w35w2e31/1(r1w1)(E3W3)5f1/1e12R24/3z5/E18/3(f2r3)4(R3W2)/3R15/r22W1(E2F1)4/3F3ZF23 w", [22, 632, 14712]],
  ["midgame 3 (5 stacks)", "noWaterEdge", "w35w2e31/1(r1w1)(E3W3)5f1/1e12R24/3z5/E18/3(f2r3)4(R3W2)/3R15/r22W1(E2F1)4/3F3ZF23 w", [43, 1839, 81077]],
  ["midgame 3 (5 stacks)", "waterStraightCapture", "w35w2e31/1(r1w1)(E3W3)5f1/1e12R24/3z5/E18/3(f2r3)4(R3W2)/3R15/r22W1(E2F1)4/3F3ZF23 w", [43, 1844, 82271]],
  ["midgame 4 (5 stacks)", "v0.2", "w11f3z5/(w2e2)4(e3w3)2e1/9/3f23r11/1r3f12E33/6(R1W3)2/(F1E1)(E2W2)3R21Z1/5W13/R31F24F31 b", [41, 2940, 118161]],
  ["midgame 4 (5 stacks)", "exactRange", "w11f3z5/(w2e2)4(e3w3)2e1/9/3f23r11/1r3f12E33/6(R1W3)2/(F1E1)(E2W2)3R21Z1/5W13/R31F24F31 b", [23, 808, 18238]],
  ["midgame 4 (5 stacks)", "noWaterEdge", "w11f3z5/(w2e2)4(e3w3)2e1/9/3f23r11/1r3f12E33/6(R1W3)2/(F1E1)(E2W2)3R21Z1/5W13/R31F24F31 b", [41, 2816, 112665]],
  ["midgame 4 (5 stacks)", "waterStraightCapture", "w11f3z5/(w2e2)4(e3w3)2e1/9/3f23r11/1r3f12E33/6(R1W3)2/(F1E1)(E2W2)3R21Z1/5W13/R31F24F31 b", [41, 2938, 117976]],
  ["default formation", "v0.3", "3f2zf33/2r3f1r2w1r12/1w2e21e31e1w31/9/9/9/1W3E11E31E2W21/2R1W1R2F1R32/3F3ZF23 w", [82, 6687, 513654]],
  ["random formations", "v0.3", "e11e2e31r2r1r31/1w21f3f1w11w31/2f23z2/9/9/9/R12E31F3R21E2/W1E14ZF1W3/R3F24W22 w", [70, 3931, 266213]],
  ["midgame 1 (3 stacks)", "v0.3", "(e3w2)6w31/4r33z/f12f3r22w1e2/2(r1e1)1f24/2E14E21/4E34/1W35W21/3(R1W1)R24/3F3ZF23 w", [66, 2824, 177613]],
  ["midgame 2 (6 stacks)", "v0.3", "(e2w1)f15f2r3/3e11f33/r23z2(r1w3)1/6e32/1w27/6(W1R3)2/6R22/2F13(F3E1)W21/(W3R1)2(F2E2)2ZE31 b", [66, 2890, 180921]],
  ["midgame 3 (5 stacks)", "v0.3", "w35w2e31/1(r1w1)(E3W3)5f1/1e12R24/3z5/E18/3(f2r3)4(R3W2)/3R15/r22W1(E2F1)4/3F3ZF23 w", [43, 1793, 79629]],
  ["midgame 4 (5 stacks)", "v0.3", "w11f3z5/(w2e2)4(e3w3)2e1/9/3f23r11/1r3f12E33/6(R1W3)2/(F1E1)(E2W2)3R21Z1/5W13/R31F24F31 b", [41, 2693, 107830]],
];

for (const [label, variant, text, totals] of CASES)
  test(`perft: ${label}, ${variant}`, () => {
    const pos = positionOf(fromPositionText(text, VARIANTS[variant]));
    assert.deepEqual(totals.map((_, i) => perft(pos, i + 1)), totals);
  });
