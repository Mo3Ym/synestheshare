import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { onRequest } from '../functions/api/og.js';
import { parseAnswer, displayAnswer, renderPixels } from '../lib/og-renderer.js';
import { ogImageUrl } from '../lib/og-url.js';
import classifyColorType from '../lib/color-type.js';

const assets = { async fetch(url) {
  try { return new Response(await readFile(new URL(`..${new URL(url).pathname}`, import.meta.url))); }
  catch { return new Response('missing', { status: 404 }); }
} };
const request = query => onRequest({
  request: new Request(`https://example.test/api/og?${query}`), env: { ASSETS: assets },
});

for (const query of ['', 'r=---', 'r=invalid', 'r=0&mode=11']) {
  assert.equal((await request(query)).status, 400);
}
const fullAnswer = parseAnswer('0123456789ABC0123456789ABC', '26');
assert.deepEqual(displayAnswer(fullAnswer), [...fullAnswer.slice(0, 6), { letter: '…' }]);
assert.deepEqual(displayAnswer(parseAnswer('0-5', '10')).map(item => item.letter), ['A', 'C']);
assert.equal(displayAnswer(parseAnswer('---------0', '10'))[0].letter, 'Z');
assert.equal(displayAnswer(parseAnswer('012345', '10')).at(-1).letter, 'F');
assert.equal(displayAnswer(parseAnswer('0123456', '10')).at(-1).letter, '…');

const samples = [
  ['r=0527416C25&majority=81&score=19', 'final.png'],
  ['r=0527416C25&majority=81&score=19&lang=en', 'final-en.png'],
  ['r=0&majority=0&score=0'],
  ['r=ABC567CABC&majority=100&score=100&stat=rarity'],
  ['r=0123456789ABC0123456789ABC&mode=26&score=50'],
  ['r=0-5', 'partial.png'],
];
for (const [query, file] of samples) {
  const response = await request(query);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'image/png');
  const png = Buffer.from(await response.arrayBuffer());
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  if (file) await writeFile(new URL(`../design/ogp/${file}`, import.meta.url), png);
}

const context = {request: new Request('https://example.test/api/og'), env: {ASSETS: assets}};
const backgroundSwatches = new Set();
for (const [encoded, type] of Object.entries({ '0': 'warm', '6': 'cool', '4': 'nature', A: 'mono', '8': 'pastel', '0554': 'neon', '7': 'dream', '9': 'earth' })) {
  const answer = parseAnswer(encoded, '10');
  assert.equal(classifyColorType(answer.map(item => item.color)), type);
  const pixels = await renderPixels(context, answer, '10', null, 'empathy');
  const corner = (600 * 1200 + 1150) * 3;
  backgroundSwatches.add(pixels.slice(corner, corner + 3).join(','));
}
assert.equal(backgroundSwatches.size, 8, 'Every color type has its own OGP background');

const answer = parseAnswer('0527416C25', '10');
const withoutStats = await renderPixels(context, answer, '10', null, 'empathy');
const withStats = await renderPixels(context, answer, '10', 19, 'empathy', 'ja', 81);
const statsRegion = pixels => pixels.subarray(360 * 1200 * 3, 460 * 1200 * 3);
assert.notDeepEqual(statsRegion(withStats), statsRegion(withoutStats));
const changedMajority = await renderPixels(context, answer, '10', 19, 'empathy', 'ja', 82);
assert.notDeepEqual(statsRegion(changedMajority), statsRegion(withStats));
const changedScore = await renderPixels(context, answer, '10', 20, 'empathy', 'ja', 81);
assert.notDeepEqual(statsRegion(changedScore), statsRegion(withStats));
const invalidStats = await request('r=0527416C25&score=-1&majority=101');
const absentStats = await request('r=0527416C25');
assert.deepEqual(await invalidStats.arrayBuffer(), await absentStats.arrayBuffer());

const effects = new Set();
for (const [sense, majority, score, stat] of [
  ['majority', 81, 19, 'empathy'],
  ['balanced', 50, 19, 'empathy'],
  ['distinctive', 30, 46, 'rarity'],
  ['singular', 10, 22, 'rarity'],
]) {
  const withSense = await renderPixels(context, answer, '10', score, stat, 'ja', majority, sense);
  assert.deepEqual(await renderPixels(context, answer, '10', score, stat, 'ja', majority), withSense);
  const pixels = await renderPixels(context, answer, '10', null, 'empathy', 'ja', null, sense);
  effects.add(createHash('sha256').update(pixels).digest('hex'));
}
assert.equal(effects.size, 4, 'Sense effects differ even for identical answers and statistics');

const image = new URL(ogImageUrl('https://example.test/result-en?r=0527416C25&majority=81&score=19&stat=empathy&sense=majority'));
assert.equal(image.searchParams.get('majority'), '81');
assert.equal(image.searchParams.get('score'), '19');
assert.equal(image.searchParams.get('stat'), 'empathy');
assert.equal(image.searchParams.get('lang'), 'en');
assert.equal(image.searchParams.get('sense'), 'majority');
assert.equal(image.searchParams.get('v'), '28');
console.log('OGP checks passed: PNG output, palette overflow, bilingual output, both scores, legacy URLs and share metadata.');
