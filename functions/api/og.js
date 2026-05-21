/**
 * functions/api/og.js
 * OGP画像（PNG）生成
 * OffscreenCanvas が使える場合はテキスト付きリッチ版
 * 使えない場合は 5x7 ピクセルフォントでテキスト描画
 */

const PRESET_COLORS = [
  '#e03a2a','#e87820','#f0e040','#a8d020',
  '#2a9e60','#1888c8','#70cbff','#7028c0',
  '#ff90b8','#8b4513','#181818','#888880','#ffffff',
];
const COLOR_IDS = '0123456789ABC';

const COLOR_TYPES = {
  warm:   { name: '暖色タイプ',     name_en: 'WARM TYPE',    color: '#e87820' },
  cool:   { name: '深海タイプ',     name_en: 'COOL TYPE',    color: '#1888c8' },
  nature: { name: '森林タイプ',     name_en: 'NATURE TYPE',  color: '#2a7a30' },
  mono:   { name: 'モノクロタイプ',  name_en: 'MONO TYPE',    color: '#555550' },
  pastel: { name: 'パステルタイプ',  name_en: 'PASTEL TYPE',  color: '#c0507a' },
  neon:   { name: 'ネオンタイプ',    name_en: 'NEON TYPE',    color: '#c02818' },
  dream:  { name: '夢想タイプ',     name_en: 'DREAM TYPE',   color: '#7028c0' },
  earth:  { name: '大地タイプ',     name_en: 'EARTH TYPE',   color: '#c07840' },
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

function getTopColors(colorMap) {
  const counts = {};
  Object.values(colorMap).forEach(c => { counts[c] = (counts[c]||0)+1; });
  return Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(e=>e[0]);
}

// ─── 5x7 ピクセルフォント（A-Z, 0-9, #, space） ──────────────────────
// 各行は 5bit: bit4=左端, bit0=右端

const FONT_5X7 = {
  A:[14,17,17,31,17,17,17], B:[30,17,17,30,17,17,30], C:[15,16,16,16,16,16,15],
  D:[30,17,17,17,17,17,30], E:[31,16,16,30,16,16,31], F:[31,16,16,30,16,16,16],
  G:[15,16,16,23,17,17,15], H:[17,17,17,31,17,17,17], I:[31,4,4,4,4,4,31],
  J:[7,1,1,1,17,17,14],    K:[17,18,20,24,20,18,17], L:[16,16,16,16,16,16,31],
  M:[17,27,21,17,17,17,17], N:[17,25,21,19,17,17,17], O:[14,17,17,17,17,17,14],
  P:[30,17,17,30,16,16,16], Q:[14,17,17,17,21,18,13], R:[30,17,17,30,20,18,17],
  S:[15,16,16,14,1,1,30],   T:[31,4,4,4,4,4,4],       U:[17,17,17,17,17,17,14],
  V:[17,17,17,17,17,10,4],  W:[17,17,17,21,21,27,17],  X:[17,10,10,4,10,10,17],
  Y:[17,17,10,4,4,4,4],     Z:[31,1,2,4,8,16,31],
  '0':[14,17,19,21,25,17,14], '1':[4,12,4,4,4,4,14],   '2':[14,17,1,6,8,16,31],
  '3':[30,1,1,14,1,1,30],    '4':[2,6,10,18,31,2,2],   '5':[31,16,16,30,1,1,30],
  '6':[7,8,16,30,17,17,14],  '7':[31,1,2,4,4,4,4],     '8':[14,17,17,14,17,17,14],
  '9':[14,17,17,15,1,2,12],
  '#':[10,31,10,31,10,0,0],  ' ':[0,0,0,0,0,0,0],
};

/**
 * 1文字を中心座標 (cx, cy) に描画する
 */
function drawPixelChar(px, W, H, char, cx, cy, scale, r, g, b) {
  const rows = FONT_5X7[char.toUpperCase()];
  if (!rows) return;
  const startX = Math.round(cx - 5 * scale / 2);
  const startY = Math.round(cy - 7 * scale / 2);
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (rows[row] & (1 << (4 - col))) {
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const pidx = (startY + row * scale + dy) * W + (startX + col * scale + dx);
            if (pidx >= 0 && pidx < W * H) {
              px[pidx*3] = r; px[pidx*3+1] = g; px[pidx*3+2] = b;
            }
          }
        }
      }
    }
  }
}

/**
 * 文字列を (x, y) = 左上隅から描画する
 */
function drawPixelString(px, W, H, str, x, y, scale, r, g, b) {
  const charStep = 5 * scale + scale; // charW + 1px gap
  const cy = y + Math.floor(7 * scale / 2);
  for (let i = 0; i < str.length; i++) {
    const cx = x + i * charStep + Math.floor(5 * scale / 2);
    drawPixelChar(px, W, H, str[i], cx, cy, scale, r, g, b);
  }
}

/** 文字列の描画幅（ピクセル）を返す */
function textWidth(str, scale) {
  return str.length * (5 * scale + scale) - scale;
}

// ─── OffscreenCanvas 版（テキスト付きリッチ画像） ────────────────

async function drawWithCanvas(colorMap, type, W, H) {
  const canvas = new OffscreenCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  ctx.fillStyle = '#f0f0ec';
  ctx.fillRect(0, 0, W, H);

  const top = getTopColors(colorMap);
  const blob1 = top[0];
  const blob2 = top[1] || top[0];

  if (blob1) {
    const [r,g,b] = hexRgb(blob1);
    const gr = ctx.createRadialGradient(W*0.82, H*0.12, 0, W*0.82, H*0.12, W*0.65);
    gr.addColorStop(0, `rgba(${r},${g},${b},0.52)`);
    gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  }
  if (blob2) {
    const [r,g,b] = hexRgb(blob2);
    const gr = ctx.createRadialGradient(W*0.12, H*0.85, 0, W*0.12, H*0.85, W*0.58);
    gr.addColorStop(0, `rgba(${r},${g},${b},0.42)`);
    gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  }

  const px = 96;

  ctx.fillStyle   = 'rgba(24,24,24,0.28)';
  ctx.font        = '600 13px sans-serif';
  ctx.textAlign   = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('COLOR SYNESTHESIA', px, 92);

  ctx.fillStyle = 'rgba(24,24,24,0.45)';
  ctx.font      = '300 18px sans-serif';
  ctx.fillText('あなたの共感覚タイプ', px, 132);

  ctx.strokeStyle = 'rgba(24,24,24,0.10)';
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.moveTo(px, 150); ctx.lineTo(px+240, 150); ctx.stroke();

  ctx.fillStyle    = type.color;
  ctx.font         = 'bold 78px sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(type.name, px, 268);

  const letters = Object.keys(colorMap);
  const n       = Math.min(letters.length, 13);
  const dotR    = 30;
  const gap     = 8;
  const dotsY   = 388;

  ctx.textBaseline = 'middle';
  letters.slice(0, n).forEach((l, i) => {
    const col = colorMap[l];
    const cx  = px + dotR + i * (dotR*2 + gap);
    const lum = getLuminance(col);

    ctx.beginPath();
    ctx.arc(cx, dotsY, dotR, 0, Math.PI*2);
    ctx.fillStyle = col;
    ctx.fill();

    if (lum > 0.75) {
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }

    ctx.fillStyle = lum > 0.4 ? '#181818' : '#ffffff';
    ctx.font      = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(l, cx, dotsY);
  });

  ctx.fillStyle    = 'rgba(24,24,24,0.25)';
  ctx.font         = '600 13px sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign    = 'left';
  ctx.fillText('SynestheShare', px, 575);
  ctx.textAlign = 'right';
  ctx.fillText('#SynestheShare', W - px, 575);

  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return await blob.arrayBuffer();
}

// ─── 純粋 JS PNG 版（ピクセルフォントでテキスト描画） ─────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const tb     = new TextEncoder().encode(type);
  const crcBuf = new Uint8Array(4 + data.length);
  crcBuf.set(tb); crcBuf.set(data, 4);
  const out = new Uint8Array(12 + data.length);
  const dv  = new DataView(out.buffer);
  dv.setUint32(0, data.length, false);
  out.set(tb, 4); out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(crcBuf), false);
  return out;
}

async function encodePNG(pixels, W, H) {
  const sig = new Uint8Array([137,80,78,71,13,10,26,10]);
  const ihdr = new Uint8Array(13);
  const dv   = new DataView(ihdr.buffer);
  dv.setUint32(0, W, false); dv.setUint32(4, H, false);
  ihdr[8]=8; ihdr[9]=2;
  const stride   = W * 3;
  const filtered = new Uint8Array(H * (1+stride));
  for (let y=0; y<H; y++) {
    filtered[y*(1+stride)] = 0;
    filtered.set(pixels.subarray(y*stride,(y+1)*stride), y*(1+stride)+1);
  }
  const cs = new CompressionStream('deflate');
  const cw = cs.writable.getWriter();
  cw.write(filtered); cw.close();
  const idat  = new Uint8Array(await new Response(cs.readable).arrayBuffer());
  const parts = [sig, pngChunk('IHDR',ihdr), pngChunk('IDAT',idat), pngChunk('IEND',new Uint8Array(0))];
  const out   = new Uint8Array(parts.reduce((s,p)=>s+p.length,0));
  let off = 0; parts.forEach(p => { out.set(p,off); off+=p.length; });
  return out;
}

function fillBg(px, W, H, r, g, b) {
  for (let i=0,n=W*H; i<n; i++) { px[i*3]=r; px[i*3+1]=g; px[i*3+2]=b; }
}

function blendGradient(px, W, H, cx, cy, radius, r, g, b, maxA) {
  const x0=Math.max(0,Math.floor(cx-radius)), x1=Math.min(W-1,Math.ceil(cx+radius));
  const y0=Math.max(0,Math.floor(cy-radius)), y1=Math.min(H-1,Math.ceil(cy+radius));
  for (let y=y0; y<=y1; y++) for (let x=x0; x<=x1; x++) {
    const d2 = ((x-cx)/radius)**2 + ((y-cy)/radius)**2;
    if (d2 >= 1) continue;
    const a = maxA * (1 - Math.sqrt(d2));
    const i = (y*W+x)*3;
    px[i]   = Math.round(px[i]  *(1-a)+r*a);
    px[i+1] = Math.round(px[i+1]*(1-a)+g*a);
    px[i+2] = Math.round(px[i+2]*(1-a)+b*a);
  }
}

function drawCircle(px, W, H, cx, cy, rad, r, g, b) {
  const inner=rad-0.5, outer=rad+0.5;
  const x0=Math.max(0,Math.floor(cx-rad-1)), x1=Math.min(W-1,Math.ceil(cx+rad+1));
  const y0=Math.max(0,Math.floor(cy-rad-1)), y1=Math.min(H-1,Math.ceil(cy+rad+1));
  for (let y=y0; y<=y1; y++) for (let x=x0; x<=x1; x++) {
    const d=Math.sqrt((x-cx)**2+(y-cy)**2);
    if (d > outer) continue;
    const i=(y*W+x)*3;
    if (d <= inner) { px[i]=r; px[i+1]=g; px[i+2]=b; }
    else {
      const a=outer-d;
      px[i]=Math.round(px[i]*(1-a)+r*a); px[i+1]=Math.round(px[i+1]*(1-a)+g*a); px[i+2]=Math.round(px[i+2]*(1-a)+b*a);
    }
  }
}

async function generatePurePNG(colorMap, type, W, H) {
  const px = new Uint8Array(W * H * 3);

  // 背景 #f0f0ec
  fillBg(px, W, H, 0xf0, 0xf0, 0xec);

  // ユーザーの上位2色でblobグラデーション
  const top = getTopColors(colorMap);
  if (top[0]) {
    const [r,g,b] = hexRgb(top[0]);
    blendGradient(px, W, H, W*0.82, H*0.12, W*0.65, r, g, b, 0.52);
  }
  const c2 = top[1] || top[0];
  if (c2) {
    const [r,g,b] = hexRgb(c2);
    blendGradient(px, W, H, W*0.12, H*0.85, W*0.58, r, g, b, 0.42);
  }

  // タイプカラーの上部アクセントバー（5px）
  const [acR,acG,acB] = hexRgb(type.color);
  for (let x=0; x<W; x++) for (let y=0; y<5; y++) {
    const i=(y*W+x)*3; px[i]=acR; px[i+1]=acG; px[i+2]=acB;
  }

  const margin = 96;

  // ── テキスト描画 ──

  // "COLOR SYNESTHESIA" eyebrow (scale 2 = 10×14 px/char, 薄いグレー)
  drawPixelString(px, W, H, 'COLOR SYNESTHESIA', margin, 70, 2, 80, 80, 80);

  // セパレーター
  for (let x = margin; x < margin + 220; x++) {
    const i = (100 * W + x) * 3;
    if (i + 2 < px.length) { px[i] = 180; px[i+1] = 180; px[i+2] = 180; }
  }

  // タイプ名（英語、scale 3 = 15×21 px/char、タイプカラー）
  drawPixelString(px, W, H, type.name_en, margin, 118, 3, acR, acG, acB);

  // ── カラードット（文字ラベル付き） ──
  const letters = Object.keys(colorMap);
  const n       = Math.min(letters.length, 13);
  const dotR    = 30, gap = 8;
  const startX  = margin + dotR;
  const dotsY   = Math.round(H * 0.62); // ≈ 391px

  letters.slice(0, n).forEach((l, i) => {
    const col = colorMap[l];
    const cx  = startX + i * (dotR*2 + gap);
    const [r,g,b] = hexRgb(col);
    drawCircle(px, W, H, cx, dotsY, dotR, r, g, b);

    // 文字ラベル（scale 2 = 10×14px、暗い背景→白、明るい背景→黒）
    const lum = getLuminance(col);
    const [lr, lg, lb] = lum > 0.4 ? [24, 24, 24] : [255, 255, 255];
    drawPixelChar(px, W, H, l, cx, dotsY, 2, lr, lg, lb);
  });

  // ── ブランドテキスト ──
  const brandY = H - 70;
  // 左: "SYNESTHESHARE"
  drawPixelString(px, W, H, 'SYNESTHESHARE', margin, brandY, 2, 100, 100, 96);
  // 右: "#SYNESTHESHARE"
  const tag = '#SYNESTHESHARE';
  const tagX = W - margin - textWidth(tag, 2);
  drawPixelString(px, W, H, tag, tagX, brandY, 2, 100, 100, 96);

  return await encodePNG(px, W, H);
}

// ─── メインハンドラ ─────────────────────────────────────────────

const PNG_HEADERS = {
  'Content-Type':  'image/png',
  'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
};

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

    if (typeof OffscreenCanvas !== 'undefined') {
      const buf = await drawWithCanvas(colorMap, type, W, H);
      return new Response(buf, { headers: PNG_HEADERS });
    }

    const png = await generatePurePNG(colorMap, type, W, H);
    return new Response(png, { headers: PNG_HEADERS });

  } catch (err) {
    return new Response(`og error: ${err.message}`, { status: 500 });
  }
}
