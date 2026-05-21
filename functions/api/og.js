/**
 * functions/api/og.js
 * OffscreenCanvas（CF Workers ネイティブ）でOGP画像（PNG）を生成
 */

const PRESET_COLORS = [
  '#e03a2a','#e87820','#f0e040','#a8d020',
  '#2a9e60','#1888c8','#70cbff','#7028c0',
  '#ff90b8','#8b4513','#181818','#888880','#ffffff',
];
const COLOR_IDS = '0123456789ABC';

const COLOR_TYPES = {
  warm:   { name: '暖色タイプ',    color: '#e87820', bg: '#f5ede4', g1: [240,140,60,0.50], g2: [255,180,60,0.40] },
  cool:   { name: '深海タイプ',    color: '#1888c8', bg: '#e8f0f8', g1: [24,136,200,0.50], g2: [112,40,192,0.30] },
  nature: { name: '森林タイプ',    color: '#2a7a30', bg: '#edf4e8', g1: [42,158,96,0.50],  g2: [168,208,32,0.30] },
  mono:   { name: 'モノクロタイプ', color: '#555550', bg: '#f0f0ee', g1: [80,80,80,0.40],  g2: [136,136,128,0.30] },
  pastel: { name: 'パステルタイプ', color: '#c0507a', bg: '#fdf0f5', g1: [255,144,184,0.50],g2: [112,203,255,0.30] },
  neon:   { name: 'ネオンタイプ',   color: '#c02818', bg: '#f0eef8', g1: [224,58,42,0.50], g2: [112,40,192,0.40] },
  dream:  { name: '夢想タイプ',    color: '#7028c0', bg: '#f0eaf8', g1: [176,96,232,0.50], g2: [255,144,184,0.30] },
  earth:  { name: '大地タイプ',    color: '#c07840', bg: '#f0ece4', g1: [192,120,64,0.50], g2: [42,158,96,0.30] },
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
  const t = c => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
  return 0.2126*t(r) + 0.7152*t(g) + 0.0722*t(b);
}

export async function onRequest(context) {
  const url  = new URL(context.request.url);
  const r    = url.searchParams.get('r') || '';
  const mode = url.searchParams.get('mode') || '10';

  if (!r) return new Response('r parameter required', { status: 400 });

  const colorMap = parseColors(r, mode);
  const typeId   = detectType(colorMap);
  const type     = COLOR_TYPES[typeId] || COLOR_TYPES.warm;

  const W = 1200, H = 630;
  const canvas = new OffscreenCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // ── 背景 ──
  ctx.fillStyle = type.bg;
  ctx.fillRect(0, 0, W, H);

  // ── グラデーション（グレーにじみ防止のため transparent ではなく rgba(...,0) を使用）──
  const [r1, g1, b1, a1] = type.g1;
  const gr1 = ctx.createRadialGradient(W*0.8, H*0.15, 0, W*0.8, H*0.15, W*0.6);
  gr1.addColorStop(0, `rgba(${r1},${g1},${b1},${a1})`);
  gr1.addColorStop(1, `rgba(${r1},${g1},${b1},0)`);
  ctx.fillStyle = gr1;
  ctx.fillRect(0, 0, W, H);

  const [r2, g2, b2, a2] = type.g2;
  const gr2 = ctx.createRadialGradient(W*0.15, H*0.88, 0, W*0.15, H*0.88, W*0.55);
  gr2.addColorStop(0, `rgba(${r2},${g2},${b2},${a2})`);
  gr2.addColorStop(1, `rgba(${r2},${g2},${b2},0)`);
  ctx.fillStyle = gr2;
  ctx.fillRect(0, 0, W, H);

  // ── ロゴラベル ──
  ctx.fillStyle = 'rgba(24,24,24,0.32)';
  ctx.font = '600 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('SYNESTHESHARE', W/2, 108);

  // ── タイプ名 ──
  ctx.fillStyle = type.color;
  ctx.font = 'bold 72px sans-serif';
  ctx.fillText(type.name, W/2, 225);

  // ── サブテキスト ──
  ctx.fillStyle = 'rgba(24,24,24,0.42)';
  ctx.font = '22px sans-serif';
  ctx.fillText('あなたの文字には、どんな色が見えますか？', W/2, 295);

  // ── 区切り線 ──
  ctx.strokeStyle = 'rgba(24,24,24,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(480, 345);
  ctx.lineTo(720, 345);
  ctx.stroke();

  // ── カラードット ──
  const letters = Object.keys(colorMap);
  const maxDots = Math.min(letters.length, 13);
  const dotR    = 28;
  const gap     = 10;
  const totalDW = maxDots * (dotR*2 + gap) - gap;
  const startX  = (W - totalDW) / 2 + dotR;
  const dotsY   = 455;

  ctx.textBaseline = 'middle';
  letters.slice(0, maxDots).forEach((l, i) => {
    const c   = colorMap[l];
    const x   = startX + i * (dotR*2 + gap);
    const lum = getLuminance(c);

    ctx.beginPath();
    ctx.arc(x, dotsY, dotR, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();

    if (lum > 0.8) {
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.fillStyle  = lum > 0.4 ? '#181818' : '#ffffff';
    ctx.font       = 'bold 18px sans-serif';
    ctx.textAlign  = 'center';
    ctx.fillText(l, x, dotsY);
  });

  // ── ハッシュタグ ──
  ctx.fillStyle    = 'rgba(24,24,24,0.28)';
  ctx.font         = '15px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('#SynestheShare', W/2, 572);

  // ── PNG出力 ──
  const blob        = await canvas.convertToBlob({ type: 'image/png' });
  const arrayBuffer = await blob.arrayBuffer();

  return new Response(arrayBuffer, {
    headers: {
      'Content-Type':  'image/png',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
