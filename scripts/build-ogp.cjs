// Development-only rasterization. Cloudflare composes the resulting pixels without native dependencies.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { deflateSync } = require('node:zlib');
const sharp = require('sharp');

const output = path.resolve(__dirname, '../assets/ogp');
const fontJP = 'Noto Sans JP,Meiryo,sans-serif';
const fontLatin = 'Outfit,Arial,sans-serif';
const ink = '#33364a';
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const svg = (width, height, content) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${content}</svg>`;

async function raster(markup, alphaOnly = false) {
  const image = sharp(Buffer.from(markup));
  if (!alphaOnly) return image.removeAlpha().raw().toBuffer();
  const rgba = await image.ensureAlpha().raw().toBuffer();
  return Buffer.from(Array.from({length: rgba.length / 4}, (_, i) => rgba[4 * i + 3]));
}

function save(name, pixels) {
  fs.writeFileSync(path.join(output, name), deflateSync(pixels));
}

function card(title, question, english, logoMark) {
  const family = english ? fontLatin : fontJP;
  return svg(1200, 630, `
    <defs>
      <linearGradient id="base" x2="100%" y2="85%">
        <stop stop-color="#f2ecec"/><stop offset=".52" stop-color="#eae4f1"/><stop offset="1" stop-color="#dbe3f3"/>
      </linearGradient>
      <radialGradient id="lilac"><stop stop-color="#d8cce8" stop-opacity=".7"/><stop offset="1" stop-color="#d8cce8" stop-opacity="0"/></radialGradient>
      <radialGradient id="mist"><stop stop-color="#fffdfb" stop-opacity=".7"/><stop offset="1" stop-color="#fffdfb" stop-opacity="0"/></radialGradient>
      <linearGradient id="wave" x2="75%" y2="100%">
        <stop stop-color="#fff" stop-opacity=".55"/><stop offset=".48" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity=".48"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#base)"/>
    <ellipse cx="1000" cy="15" rx="660" ry="400" fill="url(#lilac)"/>
    <ellipse cx="355" cy="196" rx="680" ry="410" fill="url(#mist)"/>
    <ellipse cx="200" cy="630" rx="640" ry="250" fill="url(#lilac)"/>
    <ellipse cx="636" cy="494" rx="530" ry="220" fill="url(#mist)"/>
    <path d="M-60 242Q134 75 329 158" fill="none" stroke="url(#wave)" stroke-width="1.5"/>
    <path d="M-40 552C295 449 344 657 740 580s325-170 495-188v246H-40Z" fill="#fff" fill-opacity=".11"/>
    <path d="M-40 552C295 449 344 657 740 580s325-170 495-188M-50 590C334 515 450 673 866 580q220-73 368-90"
      fill="none" stroke="url(#wave)" stroke-width="1.5"/>
    <image x="48" y="48" width="36" height="36" href="${logoMark}"/>
    <text x="94" y="78" font-family="${fontLatin}" font-size="35" font-weight="500" fill="${ink}">SynestheShare</text>
    <path d="M240 141h48m626 0h48" fill="none" stroke="${ink}" stroke-opacity=".7"/>
    <text x="600" y="157" text-anchor="middle" font-family="${family}" font-size="${english ? 44 : 47}"
      letter-spacing="${english ? 1 : 7}" fill="${ink}">${escape(title)}</text>
    <text x="600" y="521" text-anchor="middle" font-family="${family}" font-size="${english ? 35 : 33}"
      letter-spacing="${english ? 1 : 6}" fill="${ink}">${escape(question)}</text>
  `);
}

async function saveSheet(name, items, makeTile) {
  const masks = await Promise.all(items.map(async item => raster(makeTile(item), true)));
  save(name, Buffer.concat(masks));
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const outfitFont = process.env.OGP_OUTFIT_FONT || path.join(os.homedir(), 'AppData/Local/Microsoft/Windows/Fonts/Outfit-Bold.ttf');
  if (!fs.existsSync(outfitFont)) throw new Error('Set OGP_OUTFIT_FONT to the Outfit Bold .ttf file.');
  // Register the user-installed Outfit font before SVG rasterization.
  await sharp({ text: { text: '81%', font: 'Outfit Bold', fontfile: outfitFont, rgba: true } }).png().toBuffer();
  const outfitRegular = process.env.OGP_OUTFIT_REGULAR_FONT || path.join(path.dirname(outfitFont), 'Outfit-Regular.ttf');
  if (fs.existsSync(outfitRegular)) {
    await sharp({ text: { text: '81%', font: 'Outfit', fontfile: outfitRegular, rgba: true } }).png().toBuffer();
  }

  // Reuse the S badge from the navigation logo, which also contains the wordmark and version text.
  const logoMarkPng = await sharp(path.resolve(__dirname, '../images/logo.png'))
    .extract({ left: 0, top: 81, width: 306, height: 306 })
    .resize(72, 72)
    .png()
    .toBuffer();
  const logoMark = `data:image/png;base64,${logoMarkPng.toString('base64')}`;

  const copy = {
    ja: {
      alphabet: ['あなたの文字色感覚', 'あなたの A は、何色ですか？'],
      number: ['あなたの数字色感覚', 'あなたの 1 は、何色ですか？'],
      subject: ['あなたの教科色感覚', 'あなたの「国語」は、何色ですか？'],
      labels: ['多数派一致率', '共感度', '珍しさ', '上位'],
    },
    en: {
      alphabet: ['Your letter colors', 'What color is your A?'],
      number: ['Your number colors', 'What color is your 1?'],
      subject: ['Your school subject colors', 'What color is Japanese class to you?'],
      labels: ['Majority match', 'Resonance', 'Rarity', 'Top'],
    },
  };
  for (const [locale, text] of Object.entries(copy)) {
    for (const mode of ['alphabet', 'number', 'subject']) {
      save(`v17-${mode}-${locale}.rgb.deflate`, await raster(card(...text[mode], locale === 'en', logoMark)));
    }
    await saveSheet(`v17-labels-${locale}.alpha.deflate`, text.labels, (label) => {
      const isMatch = label === text.labels[0];
      const rank = label === text.labels[3];
      return svg(180, 49, `<text x="${isMatch ? 178 : 2}" y="34" text-anchor="${isMatch ? 'end' : 'start'}" font-family="${locale === 'en' ? fontLatin : fontJP}" font-size="${rank ? 29 : 25}" font-weight="500">${label}</text>`);
    });
  }
  await saveSheet('v17-values.alpha.deflate', Array.from({length: 101}, (_, value) => value), value =>
    svg(190, 88, `<text x="3" y="73" font-family="${fontLatin}" font-size="76">${value}<tspan font-size="47" dx="2">%</tspan></text>`));
  await saveSheet('v17-letters.alpha.deflate', [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'], letter =>
    svg(72, 72, `<text x="36" y="55" text-anchor="middle" font-family="${fontLatin}" font-size="53" font-weight="500">${letter}</text>`));
  await saveSheet('v17-subjects.alpha.deflate', ['国','数','理','社','英'], letter =>
    svg(72, 72, `<text x="36" y="53" text-anchor="middle" font-family="${fontJP}" font-size="42" font-weight="600">${letter}</text>`));
  console.log('Built v17 OGP backgrounds, stats and palette glyphs.');
})().catch(error => { console.error(error); process.exitCode = 1; });
