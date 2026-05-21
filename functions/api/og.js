/**
 * functions/api/og.js
 * 純粋 JS による OGP 画像生成（npm依存ゼロ・WASM不使用）
 * カラードット＋グラデーション背景を PNG として出力
 */

// ── カラーデータ ────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#e03a2a','#e87820','#f0e040','#a8d020',
  '#2a9e60','#1888c8','#70cbff','#7028c0',
  '#ff90b8','#8b4513','#181818','#888880','#ffffff',
];
const COLOR_IDS = '0123456789ABC';

const COLOR_TYPES = {
  warm:   { blob1: '#e03a2a', blob2: '#e87820', accent: '#e87820' },
  cool:   { blob1: '#1888c8', blob2: '#7028c0', accent: '#1888c8' },
  nature: { blob1: '#2a9e60', blob2: '#a8d020', accent: '#2a7a30' },
  mono:   { blob1: '#181818', blob2: '#888880', accent: '#555550' },
  pastel: { blob1: '#ff90b8', blob2: '#70cbff', accent: '#c0507a' },
  neon:   { blob1: '#e03a2a', blob2: '#7028c0', accent: '#c02818' },
  dream:  { blob1: '#7028c0', blob2: '#ff90b8', accent: '#7028c0' },
  earth:  { blob1: '#8b4513', blob2: '#2a9e60', accent: '#c07840' },
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

// ── 5×7 ピクセルフォント（A-Z）────────────────────────────────────────

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
  '#':[10,31,10,31,10,0,0], ' ':[0,0,0,0,0,0,0],
};

function drawPixelChar(px, W, H, char, cx, cy, scale, r, g, b) {
  const rows = FONT_5X7[char.toUpperCase()];
  if (!rows) return;
  const sx = Math.round(cx - 5*scale/2);
  const sy = Math.round(cy - 7*scale/2);
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (rows[row] & (1 << (4-col))) {
        for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
          const i = (sy+row*scale+dy)*W + (sx+col*scale+dx);
          if (i >= 0 && i < W*H) { px[i*3]=r; px[i*3+1]=g; px[i*3+2]=b; }
        }
      }
    }
  }
}

function drawPixelString(px, W, H, str, x, y, scale, r, g, b) {
  const step = 5*scale + scale;
  const cy = y + Math.floor(7*scale/2);
  for (let i = 0; i < str.length; i++) {
    drawPixelChar(px, W, H, str[i], x + i*step + Math.floor(5*scale/2), cy, scale, r, g, b);
  }
}

// ── 描画プリミティブ ──────────────────────────────────────────────────────

function fillBg(px, W, H, r, g, b) {
  for (let i = 0, n = W*H; i < n; i++) { px[i*3]=r; px[i*3+1]=g; px[i*3+2]=b; }
}

function blendGradient(px, W, H, cx, cy, radius, r, g, b, maxA) {
  const x0=Math.max(0,cx-radius|0), x1=Math.min(W-1,(cx+radius+1)|0);
  const y0=Math.max(0,cy-radius|0), y1=Math.min(H-1,(cy+radius+1)|0);
  for (let y=y0; y<=y1; y++) for (let x=x0; x<=x1; x++) {
    const d2 = ((x-cx)/radius)**2 + ((y-cy)/radius)**2;
    if (d2 >= 1) continue;
    const a = maxA*(1-Math.sqrt(d2));
    const i = (y*W+x)*3;
    px[i]  =Math.round(px[i]  *(1-a)+r*a);
    px[i+1]=Math.round(px[i+1]*(1-a)+g*a);
    px[i+2]=Math.round(px[i+2]*(1-a)+b*a);
  }
}

function drawCircle(px, W, H, cx, cy, rad, r, g, b) {
  const inner=rad-0.5, outer=rad+0.5;
  const x0=Math.max(0,(cx-rad-1)|0), x1=Math.min(W-1,(cx+rad+2)|0);
  const y0=Math.max(0,(cy-rad-1)|0), y1=Math.min(H-1,(cy+rad+2)|0);
  for (let y=y0; y<=y1; y++) for (let x=x0; x<=x1; x++) {
    const d=Math.sqrt((x-cx)**2+(y-cy)**2);
    if (d>outer) continue;
    const i=(y*W+x)*3;
    if (d<=inner) { px[i]=r; px[i+1]=g; px[i+2]=b; }
    else {
      const a=outer-d;
      px[i]=Math.round(px[i]*(1-a)+r*a);
      px[i+1]=Math.round(px[i+1]*(1-a)+g*a);
      px[i+2]=Math.round(px[i+2]*(1-a)+b*a);
    }
  }
}

// ── PNG エンコーダ ────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n=0; n<256; n++) { let c=n; for (let k=0; k<8; k++) c=(c&1)?0xEDB88320^(c>>>1):c>>>1; t[n]=c; }
  return t;
})();

function crc32(buf) {
  let c=0xFFFFFFFF;
  for (let i=0; i<buf.length; i++) c=CRC_TABLE[(c^buf[i])&0xFF]^(c>>>8);
  return (c^0xFFFFFFFF)>>>0;
}

function pngChunk(type, data) {
  const tb=new TextEncoder().encode(type);
  const cb=new Uint8Array(4+data.length); cb.set(tb); cb.set(data,4);
  const out=new Uint8Array(12+data.length); const dv=new DataView(out.buffer);
  dv.setUint32(0,data.length,false); out.set(tb,4); out.set(data,8);
  dv.setUint32(8+data.length,crc32(cb),false);
  return out;
}

async function encodePNG(pixels, W, H) {
  const sig=new Uint8Array([137,80,78,71,13,10,26,10]);
  const ihdr=new Uint8Array(13); const dv=new DataView(ihdr.buffer);
  dv.setUint32(0,W,false); dv.setUint32(4,H,false); ihdr[8]=8; ihdr[9]=2;
  const stride=W*3;
  const filtered=new Uint8Array(H*(1+stride));
  for (let y=0; y<H; y++) {
    filtered[y*(1+stride)]=0;
    filtered.set(pixels.subarray(y*stride,(y+1)*stride), y*(1+stride)+1);
  }
  const cs=new CompressionStream('deflate');
  const cw=cs.writable.getWriter(); cw.write(filtered); cw.close();
  const idat=new Uint8Array(await new Response(cs.readable).arrayBuffer());
  const parts=[sig,pngChunk('IHDR',ihdr),pngChunk('IDAT',idat),pngChunk('IEND',new Uint8Array(0))];
  const out=new Uint8Array(parts.reduce((s,p)=>s+p.length,0));
  let off=0; parts.forEach(p=>{out.set(p,off);off+=p.length;});
  return out;
}

// ── PNG 生成メイン ────────────────────────────────────────────────────────

async function generatePNG(colorMap, type, W, H) {
  const px = new Uint8Array(W*H*3);

  // ── 背景（クリーム） ──
  fillBg(px, W, H, 0xf5, 0xf2, 0xef);

  // ── blob グラデーション（タイプカラー） ──
  const [r1,g1,b1] = hexRgb(type.blob1);
  const [r2,g2,b2] = hexRgb(type.blob2);
  blendGradient(px, W, H, W*0.82, H*0.16, W*0.60, r1,g1,b1, 0.50);
  blendGradient(px, W, H, W*0.18, H*0.84, W*0.54, r2,g2,b2, 0.42);

  // ── アクセントライン（上部・タイプカラー）──
  const [ar,ag,ab] = hexRgb(type.accent);
  for (let x=0; x<W; x++) for (let y=0; y<8; y++) {
    const i=(y*W+x)*3; px[i]=ar; px[i+1]=ag; px[i+2]=ab;
  }

  // ── カラードット ──
  const letters = Object.keys(colorMap);
  const n       = letters.length;
  const DOT_R   = 44;
  const DOT_D   = DOT_R * 2;
  const GAP     = 14;
  const COLS    = Math.min(n, 5);
  const ROWS    = Math.ceil(n / COLS);

  const totalW  = COLS*(DOT_D+GAP) - GAP;
  const totalH  = ROWS*(DOT_D+GAP) - GAP;
  const startX  = Math.round((W - totalW) / 2);
  const startY  = Math.round((H - totalH) / 2) + 10; // 少し下にずらしてブランドスペース確保

  letters.forEach((l, i) => {
    const col   = colorMap[l];
    const [cr,cg,cb] = hexRgb(col);
    const ci    = i % COLS;
    const ri    = Math.floor(i / COLS);
    const cx    = startX + DOT_R + ci*(DOT_D+GAP);
    const cy    = startY + DOT_R + ri*(DOT_D+GAP);

    drawCircle(px, W, H, cx, cy, DOT_R, cr, cg, cb);

    // 明るい色には薄い境界線
    if (getLuminance(col) > 0.88) {
      drawCircle(px, W, H, cx, cy, DOT_R, 200, 195, 190);
      drawCircle(px, W, H, cx, cy, DOT_R-1, cr, cg, cb);
    }

    // 文字ラベル（scale 3 = 15×21px）
    const lum = getLuminance(col);
    const [lr,lg,lb] = lum > 0.4 ? [24,24,24] : [255,255,255];
    drawPixelChar(px, W, H, l, cx, cy, 3, lr, lg, lb);
  });

  // ── ブランドテキスト（ボトム） ──
  const brandY = H - 44;
  drawPixelString(px, W, H, 'SYNESTHESHARE', 96, brandY, 2, 110, 106, 102);
  // 右端に #SYNESTHESHARE
  const tag = '#SYNESTHESHARE';
  const tagW = tag.length * (5*2+2) - 2;
  drawPixelString(px, W, H, tag, W-96-tagW, brandY, 2, 130, 126, 122);

  return encodePNG(px, W, H);
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
