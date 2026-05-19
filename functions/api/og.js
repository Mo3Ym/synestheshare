/**
 * functions/api/og.js
 * Cloudflare Pages Functions — OGP画像生成
 *
 * URL: /api/og?r=163620B1C2
 *
 * r パラメータ（色IDの配列文字列）からタイプ・色を復元し、
 * SVGベースのOGP画像（1200×630px）を返す。
 *
 * ▼ ローカルテスト
 *   npx wrangler pages dev . --port 8788
 *   → http://localhost:8788/api/og?r=001122----
 */

/* ── 色ID → hex ── */
const PRESET_COLORS = [
  '#e03a2a','#e87820','#f0e040','#a8d020',
  '#2a9e60','#1888c8','#70cbff','#7028c0',
  '#ff90b8','#8b4513','#181818','#888880','#ffffff',
];
const COLOR_NAMES = [
  '赤','橙','黄','黄緑','緑','青','水色','紫','ピンク','茶色','黒','グレー','白',
];
const COLOR_IDS = '0123456789ABC';

/* ── タイプ定義 ── */
const COLOR_TYPES = {
  warm:   { name: '🔥 暖色タイプ',   color: '#e87820', bg: '#f5ede4' },
  cool:   { name: '🌊 深海タイプ',   color: '#1888c8', bg: '#e8f0f8' },
  nature: { name: '🌿 森林タイプ',   color: '#2a7a30', bg: '#edf4e8' },
  mono:   { name: '🖤 モノクロタイプ', color: '#555550', bg: '#f0f0ee' },
  pastel: { name: '🌸 パステルタイプ', color: '#c0507a', bg: '#fdf0f5' },
  neon:   { name: '⚡ ネオンタイプ',  color: '#c02818', bg: '#f0eef8' },
  dream:  { name: '🌙 夢想タイプ',   color: '#7028c0', bg: '#f0eaf8' },
  earth:  { name: '🌱 大地タイプ',   color: '#c07840', bg: '#f0ece4' },
};

/* ── URLパラメータから色を復元 ── */
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

/* ── タイプ判定 ── */
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

/* ── 輝度計算 ── */
function getLuminance(hex) {
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b = parseInt(hex.slice(5,7),16)/255;
  const t = c => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
  return 0.2126*t(r) + 0.7152*t(g) + 0.0722*t(b);
}
function textColor(hex) {
  return getLuminance(hex) > 0.4 ? '#181818' : '#ffffff';
}

/* ── SVG OGP画像生成（1200×630） ── */
function buildSVG(colorMap, typeId) {
  const type     = COLOR_TYPES[typeId] || COLOR_TYPES.warm;
  const letters  = Object.keys(colorMap);
  const colors   = Object.values(colorMap);

  // 上位2色でグラデーション背景
  const countMap = {};
  colors.forEach(c => { countMap[c] = (countMap[c]||0)+1; });
  const top2 = Object.entries(countMap).sort((a,b)=>b[1]-a[1]).map(e=>e[0]);
  const c1   = top2[0] || '#e03a2a';
  const c2   = top2[1] || c1;

  // 色ドット（最大13個）
  const dotSize = 44;
  const gap     = 10;
  const maxDots = Math.min(letters.length, 13);
  const totalW  = maxDots * (dotSize + gap) - gap;
  const dotStartX = (1200 - totalW) / 2;
  const dotsY    = 480;

  const dots = letters.slice(0, maxDots).map((l, i) => {
    const c  = colorMap[l];
    const tc = textColor(c);
    const x  = dotStartX + i * (dotSize + gap) + dotSize/2;
    const hasBorder = getLuminance(c) > 0.8;
    return `
      <circle cx="${x}" cy="${dotsY}" r="${dotSize/2}"
        fill="${c}"
        ${hasBorder ? `stroke="rgba(0,0,0,0.12)" stroke-width="1.5"` : ''}/>
      <text x="${x}" y="${dotsY + 5}"
        text-anchor="middle" dominant-baseline="middle"
        fill="${tc}" font-family="sans-serif" font-weight="700" font-size="16">${l}</text>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630"
     xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg1" cx="75%" cy="20%" r="70%">
      <stop offset="0%" stop-color="${c1}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${c1}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bg2" cx="15%" cy="85%" r="60%">
      <stop offset="0%" stop-color="${c2}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${c2}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- 背景 -->
  <rect width="1200" height="630" fill="${type.bg}"/>
  <rect width="1200" height="630" fill="url(#bg1)"/>
  <rect width="1200" height="630" fill="url(#bg2)"/>

  <!-- ビネット -->
  <defs>
    <radialGradient id="vig" cx="50%" cy="50%" r="75%">
      <stop offset="0%" stop-color="transparent"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.10)"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#vig)"/>

  <!-- サイト名 -->
  <text x="600" y="110" text-anchor="middle"
    fill="rgba(24,24,24,0.4)" font-family="sans-serif"
    font-size="18" font-weight="600" letter-spacing="4">
    SYNESTHESHARE — ALPHABET
  </text>

  <!-- タイプ名 -->
  <text x="600" y="220" text-anchor="middle"
    fill="${type.color}" font-family="sans-serif"
    font-size="64" font-weight="700" letter-spacing="-1">
    ${type.name}
  </text>

  <!-- サブコピー -->
  <text x="600" y="290" text-anchor="middle"
    fill="rgba(24,24,24,0.45)" font-family="sans-serif"
    font-size="22" letter-spacing="2">
    あなたの文字には、どんな色が見えますか？
  </text>

  <!-- 区切り線 -->
  <line x1="500" y1="340" x2="700" y2="340"
    stroke="rgba(24,24,24,0.15)" stroke-width="1"/>

  <!-- 色ドット -->
  ${dots}

  <!-- フッター -->
  <text x="600" y="580" text-anchor="middle"
    fill="rgba(24,24,24,0.3)" font-family="sans-serif"
    font-size="16" letter-spacing="3">
    #SynestheShare
  </text>
</svg>`;
}

/* ── Worker エントリポイント ── */
export async function onRequest(context) {
  const url    = new URL(context.request.url);
  const r      = url.searchParams.get('r') || '';
  const mode   = url.searchParams.get('mode') || '10';

  if (!r) {
    return new Response('r parameter required', { status: 400 });
  }

  const colorMap = parseColors(r, mode);
  const typeId   = detectType(colorMap);
  const svg      = buildSVG(colorMap, typeId);

  return new Response(svg, {
    headers: {
      'Content-Type':  'image/svg+xml',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
