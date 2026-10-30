// Zobrist hashing: a 64-bit fingerprint of a position, kept as two 32-bit halves.
// Every (piece, square) pair and the side to move get a fixed random number; a position's hash is
// all of its numbers XOR-ed together, so a move updates it with a few XORs instead of a rescan.
// Used for threefold repetition now and for the bots' memory of searched positions.
// The seed is fixed, so hashes are the same on every device.
import { VALID } from './pieces.ts';

// Dense id per piece, with a stack's two orders sharing one id.
const ID = new Int16Array(2048).fill(-1);
let ids = 0;
for (let code = 0; code < 2048; code++) {
  if (!VALID[code]) continue;
  let canon = code;
  if (code & 64 && ((code >> 7) & 3) < ((code >> 2) & 3)) // stack listed in the other order: swap the units
    canon = (code & 3) | 64 | (((code >> 7) & 15) << 2) | (((code >> 2) & 15) << 7);
  if (ID[canon] < 0) ID[canon] = ids++;
  ID[code] = ID[canon];
}

let seed = 0x9e3779b9;
const next = () => { // xorshift32
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return seed | 0;
};
const KEYS_LO = new Int32Array(ids * 81), KEYS_HI = new Int32Array(ids * 81);
for (let i = 0; i < ids * 81; i++) { KEYS_LO[i] = next(); KEYS_HI[i] = next(); }
export const SIDE_LO = next(), SIDE_HI = next();
// Per side: its Wizard has already brought a piece back on this visit (castleReturn, position.ts).
export const RETURNED_LO = [next(), next()], RETURNED_HI = [next(), next()];

export const keyLo = (code: number, s: number): number => KEYS_LO[ID[code] * 81 + s];
export const keyHi = (code: number, s: number): number => KEYS_HI[ID[code] * 81 + s];
