// The spike's rules block (spike/index.html), loaded without copying it. Used only by check.mjs
// to confirm that packages/engine plays exactly the same game as the spike.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const html = fs.readFileSync(fileURLToPath(new URL('../spike/index.html', import.meta.url)), 'utf8');
const code = html.match(/<script id="rules">([\s\S]*?)<\/script>/)[1];
export const Spike = new Function(code + '; return Rules;')();

export function setSpikeVariant({ exactRange = false, noWaterEdge = false, waterStraightCapture = false, waterRiver = false, waterStraightSteps = false, waterDiagonalBends = false, waterOneWay = false } = {}) {
  Spike.variant.exact = exactRange;
  Spike.variant.noWaterEdge = noWaterEdge;
  Spike.variant.waterStraightCapture = waterStraightCapture;
  Spike.variant.waterRiver = waterRiver;
  Spike.variant.waterStraightSteps = waterStraightSteps;
  Spike.variant.waterDiagonalBends = waterDiagonalBends;
  Spike.variant.waterOneWay = waterOneWay;
}
