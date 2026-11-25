import classifyColorType from './color-type.js';

const WIDTH = 1200;
const HEIGHT = 630;
const COLORS = ['#ff7f7f','#ffae66','#f5dc72','#a8d85c','#67bf92','#4da8e8','#8edfff','#9272ff','#ee9fd0','#9f6f4f','#2b2d38','#9698a8','#fffdf9'];
const IDS = '0123456789ABC';
const SUBJECTS = ['language','math','science','social','english'];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const INK = [255,253,249];
const LABEL_INK = [228,233,246];
const RANK_INK = [255,171,181];
const BACKGROUND_PALETTES = {
  warm: [[96,59,70], [122,68,103]],
  cool: [[48,66,89], [68,80,130]],
  nature: [[24,64,57], [49,94,71]],
  mono: [[34,41,56], [64,72,88]],
  pastel: [[82,60,99], [108,71,122]],
  neon: [[63,37,87], [54,73,138]],
  dream: [[52,44,100], [77,69,145]],
  earth: [[61,65,43], [112,79,57]],
};

export function displayAnswer(answer) {
  const visible = answer.slice(0, 6);
  if (answer.length > visible.length) visible.push({ letter: '…' });
  return visible;
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

function applyTypeBackground(pixels, type) {
  const [light, accent] = BACKGROUND_PALETTES[type];
  // Carry the waves and antialiased lettering from the existing OGP artwork into the darker palette.
  for (let y = 0; y < HEIGHT; y++) {
    const vertical = y / (HEIGHT - 1);
    const textRow = (y >= 22 && y < 65) || (y >= 96 && y < 180) || (y >= 475 && y < 535);
    for (let x = 0; x < WIDTH; x++) {
      const offset = (y * WIDTH + x) * 3;
      const brightness = Math.max(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
      const horizontal = x / (WIDTH - 1);
      const strength = horizontal * horizontal * .61 + vertical * .39;
      const letter = textRow ? Math.min(1, Math.max(0, (226 - brightness) / 152)) : 0;
      const logo = x >= 24 && x < 60 && y >= 24 && y < 60
        ? Math.max(0, Math.min(1, 18.1 - Math.hypot(x + .5 - 42, y + .5 - 42))) : 0;
      const wave = Math.max(0, brightness - 221) * .85;
      for (let channel = 0; channel < 3; channel++) {
        const tint = light[channel] + (accent[channel] - light[channel]) * strength + wave;
        const foreground = tint + (INK[channel] - tint) * letter;
        pixels[offset + channel] = Math.round(foreground + (pixels[offset + channel] - foreground) * logo);
      }
    }
  }
}

const PEARL = [255,252,255];

function paintTitleGlow(pixels) {
  // The title is baked into the base image. The two flourishes sit outside the lettering area.
  const left = 272, top = 96, width = 656, height = 84;
  const radius = 7;
  const horizontal = new Float32Array(width * height);
  const glow = [255, 252, 255];
  const brightnessAt = (x, y) => {
    const i = ((top + y) * WIDTH + left + x) * 3;
    return Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
  };
  const titleCoverage = (x, y) => {
    if (x < 18 || x >= width - 18) return 0;
    return Math.min(1, Math.max(0, (brightnessAt(x, y) - 174) / 81));
  };

  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = -radius; x < width; x++) {
      sum += titleCoverage(x + radius, y) - titleCoverage(x - radius - 1, y);
      if (x >= 0) horizontal[y * width + x] = sum / (2 * radius + 1);
    }
  }
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let y = -radius; y < height; y++) {
      if (y + radius < height) sum += horizontal[(y + radius) * width + x];
      if (y - radius - 1 >= 0) sum -= horizontal[(y - radius - 1) * width + x];
      if (y < 0 || sum <= 0 || brightnessAt(x, y) >= 174) continue;
      blend(pixels, left + x, top + y, glow, sum / (2 * radius + 1) * .22);
    }
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
  const linear = color?.map(channel => ((channel / 255 + .055) / 1.055) ** 2.4);
  const bright = linear && linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722 > .88;
  // Match the glass highlight and light-color border of result.html's palette dots.
  const stops = bright ? [.48, .22, .08, 0] : [.62, .32, .10, 0];
  const positions = [0, .22, .42, .65];
  const extent = isMore ? radius : radius + 24;
  for (let y = -extent; y <= extent; y++) {
    for (let x = -extent; x <= extent; x++) {
      const distance = Math.hypot(x, y);
      const coverage = Math.min(1, radius - distance + .5);
      if (coverage <= 0) {
        if (!isMore) blend(pixels, cx + x, cy + y, [180,220,255], .12 * Math.exp(-((distance - radius) ** 2) / 320));
        continue;
      }
      if (isMore) {
        blend(pixels, cx + x, cy + y, [255,255,255], coverage * .2);
      } else {
        const position = .5 + (.5 * x + Math.sqrt(3) / 2 * y) / (radius * (1 + Math.sqrt(3)));
        let light = 0;
        for (let stop = 1; stop < positions.length; stop++) {
          if (position > positions[stop]) continue;
          const ratio = (position - positions[stop - 1]) / (positions[stop] - positions[stop - 1]);
          light = stops[stop - 1] + (stops[stop] - stops[stop - 1]) * ratio;
          break;
        }
        const shaded = color.map(value => value + (255 - value) * light);
        blend(pixels, cx + x, cy + y, shaded, coverage);
        const edge = Math.max(0, Math.min(1, (distance - radius + 3) / 3));
        const rim = bright ? .08 : .20 * Math.max(0, -y / radius);
        if (edge) blend(pixels, cx + x, cy + y, bright ? [0,0,0] : [255,255,255], coverage * edge * rim);
      }
    }
  }
  if (isMore) {
    for (const center of [-16,0,16]) {
      for (let y = -4; y <= 4; y++) {
        for (let x = -4; x <= 4; x++) {
          const coverage = Math.max(0, Math.min(1, 3.5 - Math.hypot(x,y)));
          if (coverage) blend(pixels, cx + center + x, cy + y, [220,218,242], coverage);
        }
      }
    }
    return;
  }
  const index = (subject ? SUBJECTS : LETTERS).indexOf(item.letter);
  const ink = bright ? [150,152,168] : [255,253,249];
  paintMask(pixels, masks, index, 72, 72, cx - 36, cy - 36, ink);
}

function drawStats(pixels, labels, values, majority, score, stat) {
  const panelWidth = majority !== null && score !== null ? 786 : 414;
  const centerY = 410;
  const radius = 24;
  const halfWidth = panelWidth / 2, halfHeight = 53;
  for (let y = centerY - halfHeight; y <= centerY + halfHeight; y++) {
    for (let x = WIDTH / 2 - halfWidth; x <= WIDTH / 2 + halfWidth; x++) {
      const edge = Math.hypot(Math.max(0, Math.abs(x - WIDTH / 2) - halfWidth + radius),
        Math.max(0, Math.abs(y - centerY) - halfHeight + radius));
      if (edge < radius) blend(pixels, x, y, PEARL, edge > radius - 1.5 ? .23 : .09);
    }
  }
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
    for (let y = 377; y < 443; y++) blend(pixels, 600, y, INK, .34);
  }
}

export async function renderPixels(context, answer, mode, score, stat, language = 'ja', majority = null) {
  const subject = mode === 'subject';
  const layout = subject || mode === 'number' ? mode : 'alphabet';
  const [pixels, glyphs] = await Promise.all([
    loadPixels(context, `v17-${layout}-${language}.rgb.deflate`, WIDTH * HEIGHT * 3),
    loadPixels(context, subject ? 'v17-subjects.alpha.deflate' : 'v17-letters.alpha.deflate', (subject ? 5 : 36) * 72 * 72),
  ]);
  const colorType = classifyColorType(answer.map(({ color }) => color));
  applyTypeBackground(pixels, colorType);
  paintTitleGlow(pixels);
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
