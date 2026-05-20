/**
 * functions/api/og.js
 * SVG → PNG変換でOGP画像を動的生成
 * resvg-wasm を使用
 */

const PRESET_COLORS = [
  '#e03a2a','#e87820','#f0e040','#a8d020',
  '#2a9e60','#1888c8','#70cbff','#7028c0',
  '#ff90b8','#8b4513','#181818','#888880','#ffffff',
];
const COLOR_IDS = '0123456789ABC';

const COLOR_TYPES = {
  warm:   { name: '暖色タイプ',    color: '#e87820', bg: '#f5ede4', g1: 'rgba(240,140,60,0.5)',  g2: 'rgba(255,180,60,0.4)' },
  cool:   { name: '深海タイプ',    color: '#1888c8', bg: '#e8f0f8', g1: 'rgba(24,136,200,0.5)',  g2: 'rgba(112,40,192,0.3)' },
  nature: { name: '森林タイプ',    color: '#2a7a30', bg: '#edf4e8', g1: 'rgba(42,158,96,0.5)',   g2: 'rgba(168,208,32,0.3)' },
  mono:   { name: 'モノクロタイプ', color: '#555550', bg: '#f0f0ee', g1: 'rgba(80,80,80,0.4)',   g2: 'rgba(136,136,128,0.3)' },
  pastel: { name: 'パステルタイプ', color: '#c0507a', bg: '#fdf0f5', g1: 'rgba(255,144,184,0.5)', g2: 'rgba(112,203,255,0.3)' },
  neon:   { name: 'ネオンタイプ',   color: '#c02818', bg: '#f0eef8', g1: 'rgba(224,58,42,0.5)',  g2: 'rgba(112,40,192,0.4)' },
  dream:  { name: '夢想タイプ',    color: '#7028c0', bg: '#f0eaf8', g1: 'rgba(176,96,232,0.5)', g2: 'rgba(255,144,184,0.3)' },
  earth:  { name: '大地タイプ',    color: '#c07840', bg: '#f0ece4', g1: 'rgba(192,120,64,0.5)', g2: 'rgba(42,158,96,0.3)' },
};

function parseColors(r, mode) {
  const letters = mode === '26'
    ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    : ['A','B','C','D','E','F','G','X','Y','Z'];
  const map = {};
  letters.forEach((l, i) => {
    const id = r[i];
    if (!id || id === '-') return;
    const idx = COLOR_IDS.indexOf(id);
    if (idx >= 0) map[l] = PRESET_COLORS[idx];
  });
  return map;
}

function detectType(colorMap) {
  const values = Object.values(colorMap);
  const total  = values.length;
  if (total === 0) return 'warm';
  const count = (arr) => arr.filter(c => values.includes(c)).length / total;
  const warm   = count(['#e03a2a','#e87820','#f0e040']);
  const cool   = count(['#1888c8','#70cbff','#7028c0']);
  const nature = count(['#2a9e60','#a8d020']);
  const mono   = count(['#181818','#888880','#ffffff']);
  const pastel = count(['#ffffff','#70cbff','#ff90b8','#f0e040']);
  const dream  = count(['#7028c0','#ff90b8','#1888c8']);
  const hasBrown = values.includes('#8b4513');
  const earth  = hasBrown ? count(['#8b4513','#2a9e60','#a8d020']) : 0;
  if (mono   >= 0.55) return 'mono';
  if (earth  >= 0.4)  return 'earth';
  if (pastel >= 0.55 && warm < 0.3 && cool < 0.3) return 'pastel';
  if (dream  >= 0.5  && warm < 0.2) return 'dream';
  if (cool   >= 0.5  && warm < 0.2) return 'cool';
  if (nature >= 0.45 && warm < 0.3) return 'nature';
  if (warm   >= 0.45) return 'warm';
  if (warm   >= 0.22 && cool >= 0.22) return 'neon';
  return 'warm';
}

function getLuminance(hex) {
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b = parseInt(hex.slice(5,7),16)/255;
  const t = c => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4);
  return 0.2126*t(r)+0.7152*t(g)+0.0722*t(b);
}

function buildSVG(colorMap, typeId) {
  const type    = COLOR_TYPES[typeId] || COLOR_TYPES.warm;
  const letters = Object.keys(colorMap);
  const maxDots = Math.min(letters.length, 13);
  const dotR    = 28;
  const gap     = 10;
  const totalW  = maxDots * (dotR*2 + gap) - gap;
  const startX  = (1200 - totalW) / 2 + dotR;
  const dotsY   = 455;

  const dots = letters.slice(0, maxDots).map((l, i) => {
    const c  = colorMap[l];
    const tc = getLuminance(c) > 0.4 ? '#181818' : '#ffffff';
    const x  = startX + i * (dotR*2 + gap);
    const border = getLuminance(c) > 0.8 ? ` stroke="rgba(0,0,0,0.12)" stroke-width="1.5"` : '';
    return `<circle cx="${x}" cy="${dotsY}" r="${dotR}" fill="${c}"${border}/>
      <text x="${x}" y="${dotsY+6}" text-anchor="middle" fill="${tc}"
        font-family="sans-serif" font-weight="bold" font-size="18">${l}</text>`;
  }).join('');

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="g1" cx="80%" cy="15%" r="60%">
      <stop offset="0%" stop-color="${type.g1}"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <radialGradient id="g2" cx="15%" cy="88%" r="55%">
      <stop offset="0%" stop-color="${type.g2}"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="${type.bg}"/>
  <rect width="1200" height="630" fill="url(#g1)"/>
  <rect width="1200" height="630" fill="url(#g2)"/>
  <text x="600" y="108" text-anchor="middle"
    fill="rgba(24,24,24,0.32)" font-family="sans-serif" font-size="15" font-weight="600" letter-spacing="5">SYNESTHESHARE</text>
  <text x="600" y="225" text-anchor="middle"
    fill="${type.color}" font-family="sans-serif" font-size="72" font-weight="bold">${type.name}</text>
  <text x="600" y="295" text-anchor="middle"
    fill="rgba(24,24,24,0.42)" font-family="sans-serif" font-size="22">あなたの文字には、どんな色が見えますか？</text>
  <line x1="480" y1="345" x2="720" y2="345" stroke="rgba(24,24,24,0.12)" stroke-width="1"/>
  ${dots}
  <text x="600" y="572" text-anchor="middle"
    fill="rgba(24,24,24,0.28)" font-family="sans-serif" font-size="15" letter-spacing="3">#SynestheShare</text>
</svg>`;
}

export async function onRequest(context) {
  const url  = new URL(context.request.url);
  const r    = url.searchParams.get('r') || '';
  const mode = url.searchParams.get('mode') || '10';

  if (!r) return new Response('r parameter required', { status: 400 });

  const colorMap = parseColors(r, mode);
  const typeId   = detectType(colorMap);
  const svg      = buildSVG(colorMap, typeId);

  try {
    /* resvg-wasm でSVG→PNG変換 */
    const { Resvg, initWasm } = await import('npm:@resvg/resvg-wasm');
    const wasmRes = await fetch('https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm');
    const wasmBuf = await wasmRes.arrayBuffer();
    await initWasm(wasmBuf);

    const resvg  = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
    const pngBuf = resvg.render().asPng();

    return new Response(pngBuf, {
      headers: {
        'Content-Type':  'image/png',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (_) {
    /* フォールバック: SVGのまま返す */
    return new Response(svg, {
      headers: {
        'Content-Type':  'image/svg+xml',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }
}
