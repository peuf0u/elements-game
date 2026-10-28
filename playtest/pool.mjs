// Runs many games at once, one per processor core, and collects their records.
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import os from 'node:os';

if (!isMainThread) {
  // config.game picks the game: Elements by default, or 'chess' for the calibration (chess/).
  const play = { elements: (await import('./game.mjs')).playGame, chess: (await import('./chess/game.mjs')).playChessGame };
  parentPort.on('message', ({ i, config }) => parentPort.postMessage({ i, rec: { ...play[config.game ?? 'elements'](config), config } }));
}

export function runGames(configs, { workers = os.availableParallelism(), onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const out = new Array(configs.length);
    let next = 0, done = 0;
    const pool = [];
    const feed = w => { if (next < configs.length) { w.postMessage({ i: next, config: configs[next] }); next++; } };
    if (!configs.length) return resolve(out);
    for (let k = 0; k < Math.min(workers, configs.length); k++) {
      const w = new Worker(new URL(import.meta.url));
      w.on('message', ({ i, rec }) => {
        out[i] = rec;
        done++;
        onProgress?.(done, configs.length, rec);
        if (done === configs.length) { pool.forEach(x => x.terminate()); resolve(out); } else feed(w);
      });
      w.on('error', reject);
      pool.push(w);
      feed(w);
    }
  });
}
