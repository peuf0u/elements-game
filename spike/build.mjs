// Builds the public version of the spike into spike/dist/ (the folder Vercel serves):
//   index.html  the spike page, wrapped in a full HTML document and the small CSS reset that the
//               artifact host adds itself, with the engine's preset formations filled in
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

// The engine's presets, read through esbuild so the build doesn't depend on Node running TypeScript.
const { outputFiles: [engine] } = await build({
  entryPoints: [new URL('../packages/engine/src/index.ts', here).pathname],
  bundle: true, format: 'esm', write: false, logLevel: 'warning',
});
const { PRESETS } = await import(`data:text/javascript;base64,${Buffer.from(engine.text).toString('base64')}`);
// The presets in the page's form: { square: [element, size] | 'wizard' }, in the engine's order.
const presets = Object.fromEntries(Object.entries(PRESETS).map(([name, f]) => [name,
  Object.fromEntries(Object.entries(f).map(([s, v]) => [s, v === 'wizard' ? v : [v.element, v.size]]))]));
const page = (await readFile(new URL('index.html', here), 'utf8')).replace('<script id="rules">',
  `<script>globalThis.ELEMENTS_PRESETS = ${JSON.stringify(presets)};</script>\n<script id="rules">`);
if (!page.includes('ELEMENTS_PRESETS =')) throw new Error('index.html has no rules block for the presets');
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
