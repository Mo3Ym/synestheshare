import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import { onRequest } from '../functions/api/og.js';
import { detectTheme, parseAnswer, displayAnswer } from '../lib/og-renderer.js';
import { ogImageUrl } from '../lib/og-url.js';

const assets = { async fetch(url) {
  try { return new Response(await readFile(new URL(`..${new URL(url).pathname}`, import.meta.url))); }
  catch { return new Response('missing', { status: 404 }); }
} };
async function request(query) {
  return onRequest({ request: new Request(`https://example.test/api/og?${query}`), env: { ASSETS: assets } });
}

for (const query of ['', 'r=---', 'r=invalid', 'r=0&mode=11']) {
  assert.equal((await request(query)).status, 400);
}
const resultHtml = await readFile(new URL('../result.html', import.meta.url), 'utf8');
const fullAnswer = parseAnswer('0123456789ABC0123456789ABC', '26');
const displayed = displayAnswer(fullAnswer);
assert.equal(displayed.map(item => item.letter).join(''), 'ABCDEFGXYZ');
for (const item of displayed) assert.equal(item.color, fullAnswer.find(full => full.letter === item.letter).color);
const partial = displayAnswer(parseAnswer('0-5', '10'));
assert.equal(partial.length, 10);
assert.equal(partial.filter(item => item.color === null).length, 8);
const detectCode = resultHtml.match(/function detectColorType\(coloredLetters\) \{[\s\S]*?\n\}/)[0];
const themes = { warm: 'sunset', cool: 'ocean', nature: 'forest', mono: 'void', pastel: 'bloom', neon: 'neon', dream: 'dream', earth: 'earth' };
for (const id of '0123456789ABC') {
  const answer = parseAnswer(id.repeat(10), '10');
  const colorMap = Object.fromEntries(answer.map(item => [item.letter, item.color]));
  const browserType = vm.runInNewContext(`${detectCode}; detectColorType(Object.keys(colorMap))`, { colorMap });
  assert.equal(detectTheme(answer), themes[browserType]);
}
for (const query of ['r=5566476C25&score=40', 'r=0&score=0', 'r=ABC567CABC&score=100&stat=rarity', 'r=0123456789ABC0123456789ABC&mode=26&score=50', 'r=0-5']) {
  const response = await request(query);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'image/png');
  const png = Buffer.from(await response.arrayBuffer());
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  if (query.startsWith('r=5566')) await writeFile(new URL('../design/ogp/final.png', import.meta.url), png);
  if (query === 'r=0-5') await writeFile(new URL('../design/ogp/partial.png', import.meta.url), png);
}
const image = new URL(ogImageUrl('https://example.test/result?r=5566476C25&score=28&stat=empathy'));
assert.equal(image.searchParams.get('score'), '28');
assert.equal(image.searchParams.get('stat'), 'empathy');
console.log('OGP checks passed: PNG output, 10/26 letters, partial and invalid answers, score limits, theme agreement and share URL.');
