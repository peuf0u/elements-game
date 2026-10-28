// Runs one experiment: node run.mjs <name> [scale]
// scale multiplies the number of games (0.1 for a quick try). Records go to results/<name>.json,
// the summary to results/<name>.summary.json and the screen.
import fs from 'node:fs';
import { EXPERIMENTS } from './experiments.mjs';
import { runGames } from './pool.mjs';
import { summarize, pieceActivity } from './stats.mjs';
import { ratings } from './rating.mjs';

const [name, scaleArg] = process.argv.slice(2);
if (!EXPERIMENTS[name]) {
  console.log('Experiments:', Object.keys(EXPERIMENTS).join(', '));
  process.exit(1);
}
const configs = EXPERIMENTS[name](Number(scaleArg ?? 1));
const t0 = Date.now();
let last = 0;
const records = await runGames(configs, {
  onProgress(done, total) {
    if (Date.now() - last > 30000 || done === total) {
      last = Date.now();
      console.log(`${done}/${total} games, ${Math.round((Date.now() - t0) / 1000)}s`);
    }
  },
});
const summary = { experiment: name, scale: Number(scaleArg ?? 1), seconds: Math.round((Date.now() - t0) / 1000), matchups: summarize(records), pieces: pieceActivity(records) };
if (records.some(r => r.config.labels)) summary.ratings = ratings(records, { anchor: records[0].config.labels.w });
const dir = new URL('./results/', import.meta.url);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(new URL(`${name}.json`, dir), JSON.stringify(records));
fs.writeFileSync(new URL(`${name}.summary.json`, dir), JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary, null, 1));
