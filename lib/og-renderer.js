const WIDTH = 1200;
const HEIGHT = 630;
const COLORS = ['#ff7f7f','#ffae66','#f5dc72','#a8d85c','#67bf92','#4da8e8','#8edfff','#9272ff','#ee9fd0','#9f6f4f','#2b2d38','#9698a8','#fffdf9'];
const IDS = '0123456789ABC';

export function parseAnswer(r, mode) {
  const letters = mode === '26' ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : 'ABCDEFGXYZ';
  if (!r || r.length > letters.length || !/^[0-9ABC-]+$/.test(r)) return null;
  return Array.from(letters).flatMap((letter, index) => {
    const color = COLORS[IDS.indexOf(r[index])];
    return color ? [{ letter, color }] : [];
  });
}

// Same color counts and fallback order as result.html's detectColorType.
export function detectTheme(answer) {
  const fraction = ids => answer.filter(item => ids.includes(IDS[COLORS.indexOf(item.color)])).length / answer.length;
  const warm = fraction('012'), cool = fraction('567'), nature = fraction('34');
  const mono = fraction('ABC'), pastel = fraction('C682'), dream = fraction('785');
  const earth = answer.some(item => item.color === COLORS[9]) ? fraction('934') : 0;
  if (mono >= .55) return 'void';
  if (earth >= .4) return 'earth';
  if (pastel >= .55 && warm < .3 && cool < .3) return 'bloom';
  if (dream >= .5 && warm < .2) return 'dream';
  if (cool >= .5 && warm < .2) return 'ocean';
  if (nature >= .45 && warm < .3) return 'forest';
  if (warm >= .45) return 'sunset';
  if (warm >= .22 && cool >= .22) return 'neon';
  const scores = { sunset: warm, ocean: cool, forest: nature, void: mono, dream, bloom: pastel };
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
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

function drawDot(pixels, masks, item, cx, cy, radius) {
  const color = [1, 3, 5].map(offset => parseInt(item.color.slice(offset, offset + 2), 16));
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const distance = Math.hypot(x, y);
      if (distance > radius) continue;
      const light = Math.max(0, .4 * (1 - ((x + radius) / (radius * 2) * .6 + (y + radius) / (radius * 2)) / .65));
      const shaded = color.map(value => value * (1 - light) + 255 * light);
      blend(pixels, cx + x, cy + y, shaded, Math.min(1, radius - distance));
    }
  }
  const ink = color[0] * .2126 + color[1] * .7152 + color[2] * .0722 > 165 ? [33,51,69] : [255,253,249];
  const scale = radius / 39;
  const width = Math.round(48 * scale), height = Math.round(50 * scale);
  const maskOffset = (item.letter.charCodeAt(0) - 65) * 48 * 50;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = masks[maskOffset + Math.floor(y / scale) * 48 + Math.floor(x / scale)] / 255;
      blend(pixels, Math.round(cx - width / 2) + x, Math.round(cy - height / 2) + y, ink, alpha);
    }
  }
}

export async function renderPixels(context, answer, mode, score, stat) {
  const [pixels, masks] = await Promise.all([
    loadPixels(context, `${detectTheme(answer)}.rgb.deflate`, WIDTH * HEIGHT * 3),
    loadPixels(context, 'letters.alpha.deflate', 26 * 48 * 50),
  ]);
  if (score !== null) {
    const strip = await loadPixels(context, `${stat}-${score}.rgba.deflate`, WIDTH * 220 * 4);
    for (let y = 0; y < 220; y++) {
      for (let x = 0; x < WIDTH; x++) {
        const offset = (y * WIDTH + x) * 4;
        if (strip[offset + 3]) blend(pixels, x, y + 100, strip.subarray(offset, offset + 3), strip[offset + 3] / 255);
      }
    }
  }
  const letters = mode === '26' ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : 'ABCDEFGXYZ';
  for (const item of answer) {
    const index = letters.indexOf(item.letter);
    const full = mode === '26';
    drawDot(pixels, masks, item, full ? 84 + index % 13 * 86 : 109 + index * 109,
      full ? 354 + Math.floor(index / 13) * 72 : 403, full ? 28 : 39);
  }
  return pixels;
}
