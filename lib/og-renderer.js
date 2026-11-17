const WIDTH = 1200;
const HEIGHT = 630;
const COLORS = ['#ff7f7f','#ffae66','#f5dc72','#a8d85c','#67bf92','#4da8e8','#8edfff','#9272ff','#ee9fd0','#9f6f4f','#2b2d38','#9698a8','#fffdf9'];
const IDS = '0123456789ABC';
const SUBJECTS = ['language','math','science','social','english'];
export const SCORE_GRADIENTS = {
  sunset: ['#ffd0bd', '#ffadb2', '#ffbfe1'],
  ocean: ['#b6f3ff', '#c5e7ff', '#a8c7ff'],
  forest: ['#c2f2c8', '#aeead4', '#e4f3b5'],
  void: ['#f1edf9', '#cdd4e9', '#ddd2f1'],
  bloom: ['#ffd1e5', '#eed4ff', '#ffe0cd'],
  neon: ['#f6b8ff', '#b7f5ff', '#d4bbff'],
  dream: ['#e2cdff', '#c3c9ff', '#eed8ff'],
  earth: ['#f2d6b2', '#efc99e', '#d9dfb9'],
};

export function displayAnswer(answer, mode = '10') {
  const colors = new Map(answer.map(item => [item.letter, item.color]));
  return Array.from(mode === 'subject' ? SUBJECTS : mode === 'number' ? '1234567890' : 'ABCDEFGXYZ', letter => ({ letter, color: colors.get(letter) || null }));
}

export function parseAnswer(r, mode) {
  const letters = mode === 'subject' ? SUBJECTS : mode === 'number' ? '1234567890' : mode === '26' ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : 'ABCDEFGXYZ';
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

function drawDot(pixels, masks, item, cx, cy, radius, subject = false) {
  const selected = Boolean(item.color);
  const color = selected ? [1, 3, 5].map(offset => parseInt(item.color.slice(offset, offset + 2), 16)) : [255,255,255];
  const linear = color.map(value => value / 255 <= .03928 ? value / 255 / 12.92 : ((value / 255 + .055) / 1.055) ** 2.4);
  const bright = linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722 > .88;
  const stops = bright ? [.48, .22, .08, 0] : [.62, .32, .10, 0];
  const positions = [0, .22, .42, .65];
  const blur = radius * 12 / 34;
  const extent = Math.ceil(radius + blur * 3);
  for (let y = -extent; y <= extent; y++) {
    for (let x = -extent; x <= extent; x++) {
      const distance = Math.hypot(x, y);
      if (distance > radius) {
        blend(pixels, cx + x, cy + y, [180,220,255], .12 * Math.exp(-(((distance - radius) / blur) ** 2) / 2));
        if (!selected) blend(pixels, cx + x, cy + y, [255,255,255], .20 * Math.exp(-(((distance - radius) / (radius * 10 / 34)) ** 2) / 2));
        continue;
      }
      if (!selected) {
        const coverage = Math.min(1, radius - distance);
        blend(pixels, cx + x, cy + y, [255,255,255], .06 * coverage);
        const border = Math.min(1, Math.max(0, distance - radius + 2)) * coverage;
        blend(pixels, cx + x, cy + y, [255,255,255], .38 * border);
        continue;
      }
      // CSS linear-gradient(150deg), using the same four stops as result.html.
      const position = Math.max(0, Math.min(1, .5 + (.5 * x + Math.sqrt(3) / 2 * y) / (2 * radius * (.5 + Math.sqrt(3) / 2))));
      let light = 0;
      for (let stop = 1; stop < positions.length; stop++) {
        if (position <= positions[stop]) {
          const fraction = (position - positions[stop - 1]) / (positions[stop] - positions[stop - 1]);
          light = stops[stop - 1] + (stops[stop] - stops[stop - 1]) * fraction;
          break;
        }
      }
      const shaded = color.map(value => value * (1 - light) + 255 * light);
      blend(pixels, cx + x, cy + y, shaded, Math.min(1, radius - distance));
      const edge = Math.max(0, Math.min(1, distance - radius + radius * 2 / 34));
      if (bright) blend(pixels, cx + x, cy + y, [0,0,0], edge * .08);
      else blend(pixels, cx + x, cy + y, [255,255,255], edge * .20 * Math.max(0, -y / radius));
    }
  }
  const ink = selected && bright ? [150,152,168] : [255,253,249];
  const scale = radius / 39;
  const maskWidth = subject ? 78 : 48;
  const width = Math.round(maskWidth * scale), height = Math.round(50 * scale);
  const index = subject ? SUBJECTS.indexOf(item.letter) : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.indexOf(item.letter);
  const maskOffset = index * maskWidth * 50;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = masks[maskOffset + Math.floor(y / scale) * maskWidth + Math.floor(x / scale)] / 255 * (selected ? 1 : .82);
      blend(pixels, Math.round(cx - width / 2) + x, Math.round(cy - height / 2) + y, ink, alpha);
    }
  }
}

export async function renderPixels(context, answer, mode, score, stat, language = 'ja') {
  const prefix = language === 'en' ? 'en-' : '';
  const theme = detectTheme(answer);
  const [pixels, masks] = await Promise.all([
    loadPixels(context, `${prefix}${['number','subject'].includes(mode) ? mode + '-' : ''}${theme}.rgb.deflate`, WIDTH * HEIGHT * 3),
    mode === 'subject' ? loadPixels(context, `subjects-${language}.alpha.deflate`, 5 * 78 * 50)
      : loadPixels(context, 'letters.alpha.deflate', 36 * 48 * 50),
  ]);
  if (score !== null) {
    const strip = await loadPixels(context, `${prefix}${stat}-${score}.rgba.deflate`, WIDTH * 220 * 4);
    const tintable = offset => strip[offset + 3] && strip[offset] < 5 && strip[offset + 1] < 5 && strip[offset + 2] > 250;
    let left = WIDTH, right = 0;
    for (let offset = 0; offset < strip.length; offset += 4) {
      if (!tintable(offset)) continue;
      const x = offset / 4 % WIDTH;
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
    const stops = SCORE_GRADIENTS[theme].map(hex => [1,3,5].map(index => parseInt(hex.slice(index, index + 2), 16)));
    const gradient = Array.from({ length: WIDTH }, (_, x) => {
      const position = Math.max(0, Math.min(1, (x - left) / Math.max(1, right - left))) * 2;
      const segment = Math.min(1, Math.floor(position));
      return stops[segment].map((value, channel) => value + (stops[segment + 1][channel] - value) * (position - segment));
    });
    for (let y = 0; y < 220; y++) {
      for (let x = 0; x < WIDTH; x++) {
        const offset = (y * WIDTH + x) * 4;
        if (strip[offset + 3]) blend(pixels, x, y + 100, tintable(offset) ? gradient[x] : strip.subarray(offset, offset + 3), strip[offset + 3] / 255);
      }
    }
  }
  for (const [index, item] of displayAnswer(answer, mode).entries()) {
    drawDot(pixels, masks, item, mode === 'subject' ? 240 + index * 180 : 109 + index * 109, 363, mode === 'subject' ? 52 : 39, mode === 'subject');
  }
  return pixels;
}
