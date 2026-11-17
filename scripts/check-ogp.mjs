import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import { inflateSync } from 'node:zlib';
import { onRequest } from '../functions/api/og.js';
import { detectTheme, parseAnswer, displayAnswer, renderPixels, SCORE_GRADIENTS } from '../lib/og-renderer.js';
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
for (const query of ['r=5566476C25&score=40', 'r=5566476C25&score=40&lang=en', 'r=0&score=0', 'r=ABC567CABC&score=100&stat=rarity', 'r=0123456789ABC0123456789ABC&mode=26&score=50', 'r=0-5']) {
  const response = await request(query);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'image/png');
  const png = Buffer.from(await response.arrayBuffer());
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  if (query.startsWith('r=5566')) await writeFile(new URL(`../design/ogp/${query.includes('lang=en') ? 'final-en' : 'final'}.png`, import.meta.url), png);
  if (query === 'r=0-5') await writeFile(new URL('../design/ogp/partial.png', import.meta.url), png);
}
const image = new URL(ogImageUrl('https://example.test/result?r=5566476C25&score=28&stat=empathy'));
const mock = await readFile(new URL('../design/ogp/mock.html', import.meta.url), 'utf8');
const mockColors = vm.runInNewContext(`(${mock.match(/const themeScores = (\{[\s\S]*?\});/)[1]})`);
assert.equal(JSON.stringify(mockColors), JSON.stringify(SCORE_GRADIENTS));
const strip = inflateSync(await readFile(new URL('../assets/ogp/empathy-40.rgba.deflate', import.meta.url)));
let rankPixel = null, labelPixel = null;
for (let offset = 0; offset < strip.length; offset += 4) {
  if (strip[offset + 3] !== 255) continue;
  const x = offset / 4 % 1200, y = Math.floor(offset / 4 / 1200);
  if (strip[offset] === 0 && strip[offset + 1] === 0 && strip[offset + 2] === 255) {
    if (!rankPixel || x < rankPixel.x) rankPixel = { x, y };
  } else if (!labelPixel) labelPixel = { x, y };
}
assert(rankPixel && labelPixel);
for (const [theme, r] of Object.entries({sunset:'0',ocean:'5664',forest:'4',void:'A',bloom:'8',neon:'054',dream:'7',earth:'9'})) {
  const answer = parseAnswer(r, '10');
  assert.equal(detectTheme(answer), theme);
  const pixels = await renderPixels({request:new Request('https://example.test/api/og'),env:{ASSETS:assets}}, answer, '10', 40, 'empathy');
  const rankOffset = ((rankPixel.y + 100) * 1200 + rankPixel.x) * 3;
  const expected = [1,3,5].map(index => parseInt(SCORE_GRADIENTS[theme][0].slice(index,index+2),16));
  for (let channel = 0; channel < 3; channel++) assert(Math.abs(pixels[rankOffset+channel]-expected[channel]) <= 3, theme);
  const labelOffset = ((labelPixel.y + 100) * 1200 + labelPixel.x) * 3;
  assert.deepEqual(Array.from(pixels.subarray(labelOffset,labelOffset+3)), [255,253,249]);
}
assert.equal(image.searchParams.get('score'), '28');
assert.equal(image.searchParams.get('stat'), 'empathy');
assert.equal(new URL(ogImageUrl('https://example.test/result-en?r=5&score=28')).searchParams.get('lang'), 'en');
console.log('OGP checks passed: PNG output, 10/26 letters, partial and invalid answers, score limits, theme agreement and share URL.');
