// Builds the public version of the spike into spike/dist/ (the folder Vercel serves):
//   index.html  the spike page, wrapped in a full HTML document and the small CSS reset that the
//               artifact host adds itself
//   bot.js      the computer opponent: spike/bot.mjs bundled with the playtest players and the engine
// Run from the repo root: node spike/build.mjs
import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const here = new URL('.', import.meta.url);
const out = new URL('dist/', here);
await mkdir(out, { recursive: true });

await build({
  entryPoints: [new URL('bot.mjs', here).pathname],
  outfile: new URL('bot.js', out).pathname,
  bundle: true, format: 'iife', target: 'es2022', minify: true, logLevel: 'warning',
});

const page = await readFile(new URL('index.html', here), 'utf8');
await writeFile(new URL('index.html', out), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>/* the reset the artifact host adds around the page */
*, ::before, ::after { box-sizing: border-box; }
body { margin: 0; }
[hidden] { display: none !important; }
</style>
<meta name="description" content="Elements, a two-player strategy board game of Fire, Wind, Water and Earth. Play against the computer or a friend.">
</head>
<body>
${page}
</body>
</html>
`);
console.log('Built spike/dist/');
