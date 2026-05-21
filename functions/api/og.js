/**
 * functions/api/og.js
 * 純粋なJavaScriptでOGP画像（PNG）を生成
 * OffscreenCanvas・外部ライブラリに依存しない
 * 使用API: CompressionStream（CF Workers標準）のみ
 */

const PRESET_COLORS = [
  '#e03a2a','#e87820','#f0e040','#a8d020',
  '#2a9e60','#1888c8','#70cbff','#7028c0',
  '#ff90b8','#8b4513','#181818','#888880','#ffffff',
];
const COLOR_IDS = '0123456789ABC';

const COLOR_TYPES = {
  warm:   { color: '#e87820', bg: '#f5ede4', g1: [240,140, 60,0.50], g2: [255,180, 60,0.40] },
  cool:   { color: '#1888c8', bg: '#e8f0f8', g1: [ 24,136,200,0.50], g2: [112, 40,192,0.30] },
  nature: { color: '#2a7a30', bg: '#edf4e8', g1: [ 42,158, 96,0.50], g2: [168,208, 32,0.30] },
  mono:   { color: '#555550', bg: '#f0f0ee', g1: [ 80, 80, 80,0.40], g2: [136,136,128,0.30] },
  pastel: { color: '#c0507a', bg: '#fdf0f5', g1: [255,144,184,0.50], g2: [112,203,255,0.30] },
  neon:   { color: '#c02818', bg: '#f0eef8', g1: [224, 58, 42,0.50], g2: [112, 40,192,0.40] },
  dream:  { color: '#7028c0', bg: '#f0eaf8', g1: [176, 96,232,0.50], g2: [255,144,184,0.30] },
  earth:  { color: '#c07840', bg: '#f0ece4', g1: [192,120, 64,0.50], g2: [ 42,158, 96,0.30] },
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

// ─── PNG エンコーダ ─────────────────────────────────────────────

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
  const crcVal = crc32(crcBuf);
  const out    = new Uint8Array(12 + data.length);
  const dv     = new DataView(out.buffer);
  dv.setUint32(0, data.length, false);
  out.set(tb, 4);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crcVal, false);
  return out;
}

async function encodePNG(pixels, W, H) {
  const sig = new Uint8Array([137,80,78,71,13,10,26,10]);

  const ihdr = new Uint8Array(13);
  const dv   = new DataView(ihdr.buffer);
  dv.setUint32(0, W, false); dv.setUint32(4, H, false);
  ihdr[8]=8; ihdr[9]=2; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0; // RGB 8bit

  // 各行先頭にフィルタバイト 0x00（None）を付加
  const stride   = W * 3;
  const filtered = new Uint8Array(H * (1 + stride));
  for (let y = 0; y < H; y++) {
    filtered[y * (1+stride)] = 0;
    filtered.set(pixels.subarray(y*stride, (y+1)*stride), y*(1+stride)+1);
  }

  // zlib圧縮（CompressionStream('deflate') = ZLIB形式 = PNG IDAT が要求する形式）
  const cs = new CompressionStream('deflate');
  const cw = cs.writable.getWriter();
  cw.write(filtered); cw.close();
  const idat = new Uint8Array(await new Response(cs.readable).arrayBuffer());

  const parts = [sig, pngChunk('IHDR',ihdr), pngChunk('IDAT',idat), pngChunk('IEND',new Uint8Array(0))];
  const out   = new Uint8Array(parts.reduce((s,p)=>s+p.length,0));
  let off = 0;
  parts.forEach(p => { out.set(p,off); off+=p.length; });
  return out;
}

// ─── 描画ヘルパー ───────────────────────────────────────────────

function fillBg(px, W, H, r, g, b) {
  for (let i = 0, n = W*H; i < n; i++) { px[i*3]=r; px[i*3+1]=g; px[i*3+2]=b; }
}

function blendGradient(px, W, H, cx, cy, radius, r, g, b, maxA) {
  const x0 = Math.max(0, Math.floor(cx-radius));
  const x1 = Math.min(W-1, Math.ceil(cx+radius));
  const y0 = Math.max(0, Math.floor(cy-radius));
  const y1 = Math.min(H-1, Math.ceil(cy+radius));
  for (let y=y0; y<=y1; y++) {
    for (let x=x0; x<=x1; x++) {
      const d2 = ((x-cx)/radius)**2 + ((y-cy)/radius)**2;
      if (d2 >= 1) continue;
      const a = maxA * (1 - Math.sqrt(d2));
      const i = (y*W+x)*3;
      px[i]   = Math.round(px[i]  *(1-a)+r*a);
      px[i+1] = Math.round(px[i+1]*(1-a)+g*a);
      px[i+2] = Math.round(px[i+2]*(1-a)+b*a);
    }
  }
}

function fillRect(px, W, x0, y0, x1, y1, r, g, b) {
  for (let y=y0; y<=y1; y++) {
    for (let x=x0; x<=x1; x++) {
      const i=(y*W+x)*3; px[i]=r; px[i+1]=g; px[i+2]=b;
    }
  }
}

function drawCircle(px, W, H, cx, cy, rad, r, g, b) {
  // ソフトエッジ（±0.5px アンチエイリアス）
  const x0 = Math.max(0, Math.floor(cx-rad-1));
  const x1 = Math.min(W-1, Math.ceil(cx+rad+1));
  const y0 = Math.max(0, Math.floor(cy-rad-1));
  const y1 = Math.min(H-1, Math.ceil(cy+rad+1));
  const inner = rad - 0.5;
  const outer = rad + 0.5;
  for (let y=y0; y<=y1; y++) {
    for (let x=x0; x<=x1; x++) {
      const d = Math.sqrt((x-cx)**2+(y-cy)**2);
      if (d > outer) continue;
      const i = (y*W+x)*3;
      if (d <= inner) {
        px[i]=r; px[i+1]=g; px[i+2]=b;
      } else {
        const a = (outer-d);
        px[i]   = Math.round(px[i]  *(1-a)+r*a);
        px[i+1] = Math.round(px[i+1]*(1-a)+g*a);
        px[i+2] = Math.round(px[i+2]*(1-a)+b*a);
      }
    }
  }
}

function drawRing(px, W, H, cx, cy, rad, r, g, b) {
  // 白っぽい円に細い輪郭リングを描く（内側 0.5px）
  const x0 = Math.max(0, Math.floor(cx-rad-1));
  const x1 = Math.min(W-1, Math.ceil(cx+rad+1));
  const y0 = Math.max(0, Math.floor(cy-rad-1));
  const y1 = Math.min(H-1, Math.ceil(cy+rad+1));
  const inner = rad - 1.5;
  const outer = rad - 0.0;
  for (let y=y0; y<=y1; y++) {
    for (let x=x0; x<=x1; x++) {
      const d = Math.sqrt((x-cx)**2+(y-cy)**2);
      if (d < inner || d > outer) continue;
      const a = 0.18 * Math.min(1, (d-inner)/(outer-inner));
      const i = (y*W+x)*3;
      px[i]   = Math.round(px[i]  *(1-a)+r*a);
      px[i+1] = Math.round(px[i+1]*(1-a)+g*a);
      px[i+2] = Math.round(px[i+2]*(1-a)+b*a);
    }
  }
}

// ─── メインハンドラ ─────────────────────────────────────────────

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
    const px = new Uint8Array(W * H * 3);

    // ── 背景 ──
    const [bgR,bgG,bgB] = hexRgb(type.bg);
    fillBg(px, W, H, bgR, bgG, bgB);

    // ── グラデーション ──
    const [gr1r,gr1g,gr1b,gr1a] = type.g1;
    blendGradient(px, W, H, W*0.8, H*0.15, W*0.6, gr1r, gr1g, gr1b, gr1a);
    const [gr2r,gr2g,gr2b,gr2a] = type.g2;
    blendGradient(px, W, H, W*0.15, H*0.88, W*0.55, gr2r, gr2g, gr2b, gr2a);

    // ── 上部アクセントバー ──
    const [acR,acG,acB] = hexRgb(type.color);
    fillRect(px, W, 0, 0, W-1, 5, acR, acG, acB);

    // ── カラードット ──
    const letters = Object.keys(colorMap);
    const nDots   = Math.min(letters.length, 13);
    const dotRad  = 36;
    const dotGap  = 10;
    const rowW    = nDots * (dotRad*2 + dotGap) - dotGap;
    const startX  = Math.round((W - rowW) / 2) + dotRad;
    const dotY    = Math.round(H * 0.56);   // 中央より少し下

    letters.slice(0, nDots).forEach((l, i) => {
      const col = colorMap[l];
      const cx  = startX + i * (dotRad*2 + dotGap);
      const [cr,cg,cb] = hexRgb(col);
      drawCircle(px, W, H, cx, dotY, dotRad, cr, cg, cb);
      if (getLuminance(col) > 0.75) {
        drawRing(px, W, H, cx, dotY, dotRad, 0, 0, 0);
      }
    });

    const pngBytes = await encodePNG(px, W, H);
    return new Response(pngBytes, {
      headers: {
        'Content-Type':  'image/png',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err) {
    return new Response(`og image error: ${err.message}`, { status: 500 });
  }
}
