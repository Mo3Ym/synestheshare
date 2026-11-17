// Development-only rasterization. Run with sharp available via NODE_PATH.
// Cloudflare serves these compressed pixels without loading fonts or native libraries.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { deflateSync } = require('node:zlib');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'assets/ogp');
fs.mkdirSync(output, { recursive: true });
const html = fs.readFileSync(path.join(root, 'design/ogp/mock.html'), 'utf8');
const fields = {};
for (const [tag] of html.matchAll(/<input\b[^>]+>/g)) {
  fields[tag.match(/name="([^"]+)"/)[1]] = {
    value: tag.match(/value="([^"]*)"/)?.[1] || '',
    checked: tag.includes('checked'),
  };
}
const preview = { innerHTML: '', style: {} };
const form = { elements: fields, addEventListener() {} };
const colors = { set innerHTML(value) {
  for (const [tag] of value.matchAll(/<input\b[^>]+>/g)) {
    fields[tag.match(/name="([^"]+)"/)[1]] = {
      value: tag.match(/value="([^"]*)"/)?.[1] || '',
      checked: tag.includes('checked'),
    };
  }
} };
const context = vm.createContext({
  document: {
    getElementById: id => ({ controls: form, preview, colors }[id]),
    querySelectorAll: () => [],
  },
  requestAnimationFrame: fn => fn(),
});
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
fields.paletteVisible.checked = false;

function render() {
  vm.runInContext('render()', context);
  return preview.innerHTML;
}

async function writePixels(name, svg, channels) {
  let image = sharp(Buffer.from(svg));
  image = channels === 3 ? image.removeAlpha() : image.ensureAlpha();
  const pixels = await image.raw().toBuffer();
  fs.writeFileSync(path.join(output, name), deflateSync(pixels));
}

(async () => {
  const japanese = { headline: fields.headline.value, cta: fields.cta.value };
  for (const language of ['ja', 'en']) {
  const prefix = language === 'en' ? 'en-' : '';
  fields.headline.value = language === 'en' ? 'Your letter-color sense...' : japanese.headline;
  fields.cta.value = language === 'en' ? 'See results & find your colors (2 min) →' : japanese.cta;
  for (const theme of ['sunset', 'ocean', 'forest', 'void', 'bloom', 'neon', 'dream', 'earth']) {
    const background = await sharp(path.join(root, `assets/backgrounds/${theme}.webp`)).png().toBuffer();
    for (const mode of ['alphabet', 'number', 'subject']) {
    fields.headline.value = language === 'en' ? (mode === 'subject' ? 'Your school-subject colors...' : mode === 'number' ? 'Your number-color sense...' : 'Your letter-color sense...')
      : mode === 'subject' ? 'あなたの教科色感覚は...' : mode === 'number' ? 'あなたの数字色感覚は...' : japanese.headline;
    const svg = render()
      .replace(/<text x="600" y="270"[\s\S]*?<\/text>/, '')
      .replace('../../assets/backgrounds/ocean.webp', `data:image/png;base64,${background.toString('base64')}`);
    await writePixels(`${prefix}${mode !== 'alphabet' ? mode + '-' : ''}${theme}.rgb.deflate`, svg, 3);
    }
  }
  // Transparent score strips preserve the approved font, gradient and 1:3 ratio.
  for (const [kind, label] of [['empathy', '共感度 上位'], ['rarity', '珍しさ 上位']]) {
    fields.scoreLabel.value = language === 'en' ? (kind === 'empathy' ? 'Resonance Top' : 'Rarity Top') : label;
    for (let score = 0; score <= 100; score++) {
      fields.score.value = String(score);
      const svg = render();
      const text = svg.match(/<text x="600" y="270"[\s\S]*?<\/text>/)[0];
      const defs = svg.match(/<defs>[\s\S]*?<\/defs>/)[0];
      await writePixels(`${prefix}${kind}-${score}.rgba.deflate`, `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="220" viewBox="0 100 1200 220">${defs}${text}</svg>`, 4);
    }
  }
  }
  const masks = [];
  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="50"><text x="24" y="37" text-anchor="middle" font-family="Outfit,sans-serif" font-size="34.32" font-weight="700" fill="white">${letter}</text></svg>`;
    const rgba = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
    masks.push(Buffer.from(Array.from({ length: 48 * 50 }, (_, i) => rgba[i * 4 + 3])));
  }
  fs.writeFileSync(path.join(output, 'letters.alpha.deflate'), deflateSync(Buffer.concat(masks)));
  for (const [language, labels] of [['ja',['国語','数学','理科','社会','英語']],['en',['Lang','Math','Sci','Soc','Eng']]]) {
    const subjectMasks = [];
    for (const label of labels) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="78" height="50"><text x="39" y="35" text-anchor="middle" font-family="Outfit,Noto Sans JP,sans-serif" font-size="${language === 'ja' ? 28 : 22}" font-weight="700" fill="white">${label}</text></svg>`;
      const rgba = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
      subjectMasks.push(Buffer.from(Array.from({length:78*50},(_,i)=>rgba[i*4+3])));
    }
    fs.writeFileSync(path.join(output,`subjects-${language}.alpha.deflate`),deflateSync(Buffer.concat(subjectMasks)));
  }
  console.log('Built OGP backgrounds, score strips and letter masks.');
})().catch(error => { console.error(error); process.exitCode = 1; });
