const WIDTH = 1200;
const HEIGHT = 630;
const COLORS = ['#ff7f7f','#ffae66','#f5dc72','#a8d85c','#67bf92','#4da8e8','#8edfff','#9272ff','#ee9fd0','#9f6f4f','#2b2d38','#9698a8','#fffdf9'];
const IDS = '0123456789ABC';
const SUBJECTS = ['language','math','science','social','english'];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const INK = [51,54,74];
const LABEL_INK = [104,104,124];
const RANK_INK = [255,90,90];

export function displayAnswer(answer) {
  return [...answer.slice(0, 6), { letter: '…' }];
}

export function parseAnswer(r, mode) {
  const letters = mode === 'subject' ? SUBJECTS : mode === 'number' ? '1234567890' : mode === '26' ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : 'ABCDEFGXYZ';
  if (!r || r.length > letters.length || !/^[0-9ABC-]+$/.test(r)) return null;
  return Array.from(letters).flatMap((letter, index) => {
    const color = COLORS[IDS.indexOf(r[index])];
    return color ? [{ letter, color }] : [];
  });
}

async function loadPixels(context, name, expectedLength) {
  const response = await context.env.ASSETS.fetch(new URL(`/assets/ogp/${name}`, context.request.url));
  if (!response.ok) throw new Error(`Missing OGP asset: ${name}`);
  const pixels = new Uint8Array(await new Response(response.body.pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
  if (pixels.length !== expectedLength) throw new Error(`Invalid OGP asset: ${name}`);
  return pixels;
}

function blend(pixels, x, y, color, alpha) {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const offset = (y * WIDTH + x) * 3;
  for (let channel = 0; channel < 3; channel++) {
    pixels[offset + channel] = Math.round(pixels[offset + channel] * (1 - alpha) + color[channel] * alpha);
  }
}

function paintMask(pixels, masks, tile, width, height, left, top, ink, opacity = 1) {
  const start = tile * width * height;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const coverage = masks[start + y * width + x];
      if (coverage) blend(pixels, left + x, top + y, ink, coverage / 255 * opacity);
    }
  }
}

function drawDot(pixels, masks, item, cx, subject) {
  const cy = 272;
  const radius = 54;
  const isMore = item.letter === '…';
  const color = isMore ? null : [1,3,5].map(i => parseInt(item.color.slice(i, i + 2), 16));
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const distance = Math.hypot(x, y);
      const coverage = Math.min(1, radius - distance + .5);
      if (coverage <= 0) continue;
      if (isMore) {
        blend(pixels, cx + x, cy + y, [255,255,255], coverage * .26);
      } else {
        const light = Math.max(0, .25 - (.45 * x + .89 * y) / (2 * radius));
        const shaded = color.map(value => value + (255 - value) * light * .65);
        blend(pixels, cx + x, cy + y, shaded, coverage);
        const rim = Math.max(0, distance - radius + 1.7) * Math.max(0, -y / radius);
        blend(pixels, cx + x, cy + y, [255,255,255], coverage * rim * .38);
      }
    }
  }
  if (isMore) {
    for (const center of [-16,0,16]) {
      for (let y = -4; y <= 4; y++) {
        for (let x = -4; x <= 4; x++) {
          const coverage = Math.max(0, Math.min(1, 3.5 - Math.hypot(x,y)));
          if (coverage) blend(pixels, cx + center + x, cy + y, [159,149,183], coverage);
        }
      }
    }
    return;
  }
  const index = (subject ? SUBJECTS : LETTERS).indexOf(item.letter);
  const ink = item.color === '#fffdf9' ? INK : [255,253,249];
  if (item.color === '#f5dc72') paintMask(pixels, masks, index, 72, 72, cx - 36, cy - 35, INK, .25);
  paintMask(pixels, masks, index, 72, 72, cx - 36, cy - 36, ink);
}

function drawStats(pixels, labels, values, majority, score, stat) {
  if (majority !== null) {
    const shift = score === null ? 198 : 0;
    paintMask(pixels, labels, 0, 180, 49, 229 + shift, 375, LABEL_INK);
    paintMask(pixels, values, majority, 190, 88, 423 + shift, 365, INK);
  }
  if (score !== null) {
    const shift = majority === null ? -198 : 0;
    paintMask(pixels, labels, stat === 'rarity' ? 2 : 1, 180, 49, 641 + shift, 375, LABEL_INK);
    paintMask(pixels, labels, 3, 180, 49, 744 + shift, 403, RANK_INK);
    paintMask(pixels, values, score, 190, 88, 815 + shift, 365, INK);
  }
  if (majority !== null && score !== null) {
    for (let y = 377; y < 443; y++) blend(pixels, 600, y, INK, .64);
  }
}

export async function renderPixels(context, answer, mode, score, stat, language = 'ja', majority = null) {
  const subject = mode === 'subject';
  const layout = subject || mode === 'number' ? mode : 'alphabet';
  const [pixels, glyphs] = await Promise.all([
    loadPixels(context, `v17-${layout}-${language}.rgb.deflate`, WIDTH * HEIGHT * 3),
    loadPixels(context, subject ? 'v17-subjects.alpha.deflate' : 'v17-letters.alpha.deflate', (subject ? 5 : 36) * 72 * 72),
  ]);
  const dots = displayAnswer(answer);
  for (const [index, item] of dots.entries()) {
    drawDot(pixels, glyphs, item, 600 + (index - (dots.length - 1) / 2) * 130, subject);
  }
  if (majority !== null || score !== null) {
    const [labels, values] = await Promise.all([
      loadPixels(context, `v17-labels-${language}.alpha.deflate`, 4 * 180 * 49),
      loadPixels(context, 'v17-values.alpha.deflate', 101 * 190 * 88),
    ]);
    drawStats(pixels, labels, values, majority, score, stat);
  }
  return pixels;
}
