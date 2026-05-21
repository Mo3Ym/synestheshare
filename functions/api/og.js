/**
 * functions/api/og.js
 * OffscreenCanvas + FontFace API で OGP 画像を生成
 * - satori / WASM は不使用（Workers の制約を回避）
 * - FontFace API は woff2 をネイティブサポート
 */

// ── カラーデータ ────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#e03a2a','#e87820','#f0e040','#a8d020',
  '#2a9e60','#1888c8','#70cbff','#7028c0',
  '#ff90b8','#8b4513','#181818','#888880','#ffffff',
];
const COLOR_IDS = '0123456789ABC';

const COLOR_TYPES = {
  warm:   { name: '暖色タイプ',    color: '#e87820', blob1: '#e03a2a', blob2: '#e87820' },
  cool:   { name: '深海タイプ',    color: '#1888c8', blob1: '#1888c8', blob2: '#7028c0' },
  nature: { name: '森林タイプ',    color: '#2a7a30', blob1: '#2a9e60', blob2: '#a8d020' },
  mono:   { name: 'モノクロタイプ', color: '#555550', blob1: '#181818', blob2: '#888880' },
  pastel: { name: 'パステルタイプ', color: '#c0507a', blob1: '#ff90b8', blob2: '#70cbff' },
  neon:   { name: 'ネオンタイプ',  color: '#c02818', blob1: '#e03a2a', blob2: '#7028c0' },
  dream:  { name: '夢想タイプ',    color: '#7028c0', blob1: '#7028c0', blob2: '#ff90b8' },
  earth:  { name: '大地タイプ',    color: '#c07840', blob1: '#8b4513', blob2: '#2a9e60' },
};

// ── ユーティリティ ──────────────────────────────────────────────────────

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
  const count  = (arr) => arr.filter(c => values.includes(c)).length / total;
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

function hexRgb(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

// ── OffscreenCanvas 描画 ────────────────────────────────────────────────
// FontFace API は Cloudflare Workers 未対応のため、
// Workers の Skia ランタイムに組み込まれたシステムフォントを使用する。
// Noto Sans JP / Noto Sans CJK は Workers の Skia ビルドに含まれている。

async function generatePNG(colorMap, type, W, H) {
  if (typeof OffscreenCanvas === 'undefined') {
    throw new Error(
      'OffscreenCanvas not available. ' +
      'Go to Cloudflare Pages → Settings → Functions → Compatibility Date, ' +
      'set to 2024-09-23 and redeploy.'
    );
  }
  const [r1,g1,b1] = hexRgb(type.blob1);
  const [r2,g2,b2] = hexRgb(type.blob2);
  const letters    = Object.keys(colorMap);

  const canvas = new OffscreenCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // ── 背景 ──
  ctx.fillStyle = '#f5f2ef';
  ctx.fillRect(0, 0, W, H);

  // Blob グラデーション（右上）
  {
    const g = ctx.createRadialGradient(W*0.82, H*0.15, 0, W*0.82, H*0.15, W*0.58);
    g.addColorStop(0, `rgba(${r1},${g1},${b1},0.48)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // Blob グラデーション（左下）
  {
    const g = ctx.createRadialGradient(W*0.18, H*0.82, 0, W*0.18, H*0.82, W*0.52);
    g.addColorStop(0, `rgba(${r2},${g2},${b2},0.40)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  const PX = 96, PY = 52;

  // ── Eyebrow ──
  // 装飾ライン
  ctx.fillStyle = 'rgba(24,24,24,0.20)';
  ctx.fillRect(PX, PY + 7, 24, 1);
  // テキスト
  ctx.fillStyle    = 'rgba(24,24,24,0.30)';
  ctx.font         = '700 13px sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('COLOR PERSONALITY — ALPHABET', PX + 32, PY + 7);

  // ── サブラベル ──
  ctx.fillStyle    = 'rgba(24,24,24,0.50)';
  ctx.font         = '700 21px "Noto Sans CJK JP", "Noto Sans JP", sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('あなたの共感覚タイプ', PX, PY + 26);

  // ── セパレーター ──
  ctx.fillStyle = 'rgba(24,24,24,0.14)';
  ctx.fillRect(PX, PY + 66, 180, 1);

  // ── タイプ名（大） ──
  ctx.fillStyle    = type.color;
  ctx.font         = '700 54px "Noto Sans CJK JP", "Noto Sans JP", sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(type.name, PX, PY + 80);

  // ── パレットドット ──
  const DOT_R  = 30, DOT_D = DOT_R * 2, DOT_GAP = 10;
  const COLS   = Math.min(letters.length, 5);
  const DOTS_Y = PY + 80 + 54 + 22;

  letters.forEach((l, i) => {
    const col   = colorMap[l];
    const col_i = i % COLS;
    const row_i = Math.floor(i / COLS);
    const cx    = PX + DOT_R + col_i * (DOT_D + DOT_GAP);
    const cy    = DOTS_Y + DOT_R + row_i * (DOT_D + DOT_GAP);

    // 円
    ctx.beginPath();
    ctx.arc(cx, cy, DOT_R, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();

    // 明るい色には細い境界線
    if (getLuminance(col) > 0.88) {
      ctx.strokeStyle = 'rgba(0,0,0,0.13)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 文字ラベル
    const lum = getLuminance(col);
    ctx.fillStyle    = lum > 0.4 ? '#181818' : '#ffffff';
    ctx.font         = '700 22px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(l, cx, cy);
  });

  // ── 右側グローサークル（装飾） ──
  {
    const [tc, tg, tb] = hexRgb(type.color);
    const gx = W - 190, gy = H * 0.38;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 130);
    g.addColorStop(0,    `rgba(${tc},${tg},${tb},0.35)`);
    g.addColorStop(0.55, `rgba(${tc},${tg},${tb},0.12)`);
    g.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(gx, gy, 130, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── ブランドテキスト ──
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle    = 'rgba(24,24,24,0.28)';
  ctx.font         = '700 16px sans-serif';
  ctx.textAlign    = 'left';
  ctx.fillText('SynestheShare', PX, H - PY);

  ctx.fillStyle = 'rgba(24,24,24,0.20)';
  ctx.font      = '600 13px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('#SynestheShare', W - PX, H - PY);

  // ── PNG 出力 ──
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return new Uint8Array(await blob.arrayBuffer());
}

// ── メインハンドラ ───────────────────────────────────────────────────────

export async function onRequest(context) {
  const url    = new URL(context.request.url);
  const rParam = url.searchParams.get('r') || '';
  const mode   = url.searchParams.get('mode') || '10';

  if (!rParam) return new Response('r parameter required', { status: 400 });

  try {
    const colorMap = parseColors(rParam, mode);
    const typeId   = detectType(colorMap);
    const type     = COLOR_TYPES[typeId] || COLOR_TYPES.warm;
    const W = 1200, H = 630;

    const png = await generatePNG(colorMap, type, W, H);

    return new Response(png, {
      headers: {
        'Content-Type':  'image/png',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err) {
    return new Response(`og error: ${err.message}\n${err.stack}`, { status: 500 });
  }
}
