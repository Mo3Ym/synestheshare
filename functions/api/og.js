/**
 * functions/api/og.js
 * satori + @resvg/resvg-wasm による OGP 画像生成
 * result.html の type-hero セクションに近いデザインを再現
 */

import satori from 'satori';
import { Resvg, initWasm } from '@resvg/resvg-wasm';

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

// ── パーサー / 判定 ────────────────────────────────────────────────────

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

// ── フォント読み込み（Workers Cache API でキャッシュ） ─────────────────

async function cachedFetch(url, cacheKey) {
  const cache = caches.default;
  const req   = new Request(`https://og-font-cache.internal/${cacheKey}`);
  const hit   = await cache.match(req);
  if (hit) return hit.arrayBuffer();
  const buf   = await fetch(url).then(r => r.arrayBuffer());
  await cache.put(req, new Response(buf, { headers: { 'Cache-Control': 'public, max-age=2592000' } }));
  return buf;
}

/**
 * Google Fonts CSS を取得し、woff2 URL を抽出してフォントデータを返す
 * text パラメータで文字をサブセット化（ファイルサイズを大幅に削減）
 */
async function fetchGoogleFont(family, weight, text) {
  const params = new URLSearchParams({ family: `${family}:wght@${weight}`, display: 'block' });
  if (text) params.set('text', text);
  const cssUrl = `https://fonts.googleapis.com/css2?${params}`;
  const css = await fetch(cssUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36' },
  }).then(r => r.text());

  // woff2 URL を全て抽出し最初のものを使用
  const match = css.match(/url\((https:[^)]+\.woff2)\)/);
  if (!match) throw new Error(`Font URL not found for ${family} ${weight}`);
  return cachedFetch(match[1], `${family}-${weight}`);
}

// ── resvg WASM 初期化（インスタンス内で一度だけ） ──────────────────────

let resvgInited = false;
async function ensureResvg() {
  if (resvgInited) return;
  // WASM バイナリを CDN から取得（Cache API でキャッシュ）
  const wasmUrl = 'https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm';
  const cache   = caches.default;
  let wasmResp  = await cache.match(wasmUrl);
  if (!wasmResp) {
    wasmResp = await fetch(wasmUrl);
    await cache.put(wasmUrl, wasmResp.clone());
  }
  await initWasm(wasmResp.arrayBuffer());
  resvgInited = true;
}

// ── OGP レイアウト（satori オブジェクト） ───────────────────────────────

function buildOGP(colorMap, type, W, H) {
  const letters = Object.keys(colorMap);
  const [r1, g1, b1] = hexRgb(type.blob1);
  const [r2, g2, b2] = hexRgb(type.blob2);

  const PAD_V = 52;
  const PAD_H = 96;
  const DOT   = 62;
  const GAP   = 8;
  const COLS  = Math.min(letters.length, 5);

  // パレットドット（列ごとに分割）
  const numRows = Math.ceil(letters.length / COLS);
  const dotRows = Array.from({ length: numRows }, (_, row) => ({
    type: 'div',
    props: {
      style: { display: 'flex', flexDirection: 'row', gap: GAP },
      children: letters.slice(row * COLS, (row + 1) * COLS).map(l => {
        const col = colorMap[l];
        const lum = getLuminance(col);
        const tc  = lum > 0.4 ? '#181818' : '#ffffff';
        const shadow = lum > 0.88
          ? 'inset 0 0 0 1.5px rgba(0,0,0,0.13)'
          : '0 2px 8px rgba(0,0,0,0.14)';
        return {
          type: 'div',
          props: {
            style: {
              width: DOT, height: DOT, borderRadius: DOT / 2,
              background: col,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: tc, fontSize: 24, fontFamily: 'Outfit', fontWeight: 700,
              boxShadow: shadow,
            },
            children: l,
          },
        };
      }),
    },
  }));

  // 右側の装飾サークル（type カラーのグロー）
  const glowCircle = {
    type: 'div',
    props: {
      style: {
        width: 240, height: 240, borderRadius: 120, flexShrink: 0,
        background: `radial-gradient(circle at center, ${type.color}55 0%, ${type.color}20 55%, transparent 75%)`,
      },
      children: null,
    },
  };

  return {
    type: 'div',
    props: {
      style: {
        width: W, height: H,
        display: 'flex', flexDirection: 'column',
        background: [
          `radial-gradient(circle at 82% 15%, rgba(${r1},${g1},${b1},0.48) 0%, transparent 55%)`,
          `radial-gradient(circle at 18% 82%, rgba(${r2},${g2},${b2},0.40) 0%, transparent 52%)`,
          '#f5f2ef',
        ].join(', '),
        padding: `${PAD_V}px ${PAD_H}px`,
        fontFamily: 'Noto Sans JP',
      },
      children: [
        // ── メイン行（左: テキスト、右: グロー） ──
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'row', flex: 1, alignItems: 'center', gap: 56 },
            children: [
              // 左: テキストカラム
              {
                type: 'div',
                props: {
                  style: { display: 'flex', flexDirection: 'column', gap: 14, flex: 1 },
                  children: [
                    // eyebrow
                    {
                      type: 'div',
                      props: {
                        style: { display: 'flex', alignItems: 'center', gap: 10 },
                        children: [
                          { type: 'div', props: { style: { width: 24, height: 1, background: 'rgba(24,24,24,0.22)', flexShrink: 0 }, children: null } },
                          { type: 'span', props: { style: { fontSize: 13, fontFamily: 'Outfit', fontWeight: 700, letterSpacing: 3, color: 'rgba(24,24,24,0.30)' }, children: 'COLOR PERSONALITY — ALPHABET' } },
                        ],
                      },
                    },
                    // サブラベル
                    { type: 'div', props: { style: { fontSize: 22, color: 'rgba(24,24,24,0.50)', fontWeight: 400 }, children: 'あなたの共感覚タイプ' } },
                    // セパレーター
                    { type: 'div', props: { style: { width: 180, height: 1, background: 'rgba(24,24,24,0.14)' }, children: null } },
                    // タイプ名（大）
                    { type: 'div', props: { style: { fontSize: 60, fontWeight: 700, color: type.color, lineHeight: 1.15 }, children: type.name } },
                    // パレットドット
                    { type: 'div', props: { style: { display: 'flex', flexDirection: 'column', gap: GAP, marginTop: 10 }, children: dotRows } },
                  ],
                },
              },
              // 右: グロー
              glowCircle,
            ],
          },
        },
        // ── ブランド行 ──
        {
          type: 'div',
          props: {
            style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 },
            children: [
              { type: 'div', props: { style: { fontSize: 16, fontFamily: 'Outfit', fontWeight: 700, color: 'rgba(24,24,24,0.28)', letterSpacing: 1 }, children: 'SynestheShare' } },
              { type: 'div', props: { style: { fontSize: 13, fontFamily: 'Outfit', fontWeight: 600, color: 'rgba(24,24,24,0.20)', letterSpacing: 2 }, children: '#SynestheShare' } },
            ],
          },
        },
      ],
    },
  };
}

// ── メインハンドラ ───────────────────────────────────────────────────────

const PNG_HEADERS = {
  'Content-Type':  'image/png',
  'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
};

// OGP に必要な日本語文字（Google Fonts サブセット用）
const JP_CHARS = 'あなたの共感覚タイプ暖色深海森林モノクロパステルネオン夢想大地';

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

    // フォント読み込みと resvg 初期化を並列実行
    const [notoData, outfitData] = await Promise.all([
      fetchGoogleFont('Noto Sans JP', 700, JP_CHARS),
      fetchGoogleFont('Outfit', 700, null),
      ensureResvg(),
    ]);

    // SVG 生成
    const svg = await satori(buildOGP(colorMap, type, W, H), {
      width: W,
      height: H,
      fonts: [
        { name: 'Noto Sans JP', data: notoData,  weight: 700, style: 'normal' },
        { name: 'Outfit',       data: outfitData, weight: 700, style: 'normal' },
      ],
    });

    // SVG → PNG 変換
    const resvg  = new Resvg(svg, { fitTo: { mode: 'width', value: W } });
    const pngBuf = resvg.render().asPng();

    return new Response(pngBuf, { headers: PNG_HEADERS });

  } catch (err) {
    return new Response(`og error: ${err.message}\n${err.stack}`, { status: 500 });
  }
}
