/**
 * functions/result.html.js
 * result.html へのリクエスト時にOGPタグを動的注入する
 * Cloudflare Pages Functions として動作
 */

const PRESET_COLORS = [
  '#ff7f7f','#ffae66','#f5dc72','#a8d85c',
  '#67bf92','#4da8e8','#8edfff','#9272ff',
  '#ee9fd0','#9f6f4f','#2b2d38','#9698a8','#fffdf9',
];
const COLOR_IDS = '0123456789ABC';

const COLOR_TYPES = {
  warm:   { name: 'SUNSET TYPE' },
  cool:   { name: 'OCEAN TYPE'  },
  nature: { name: 'FOREST TYPE' },
  mono:   { name: 'VOID TYPE'   },
  pastel: { name: 'BLOOM TYPE'  },
  neon:   { name: 'NEON TYPE'   },
  dream:  { name: 'DREAM TYPE'  },
  earth:  { name: 'EARTH TYPE'  },
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
  const warm   = count(['#ff7f7f','#ffae66','#f5dc72']);
  const cool   = count(['#4da8e8','#8edfff','#9272ff']);
  const nature = count(['#67bf92','#a8d85c']);
  const mono   = count(['#2b2d38','#9698a8','#fffdf9']);
  const pastel = count(['#fffdf9','#8edfff','#ee9fd0','#f5dc72']);
  const dream  = count(['#9272ff','#ee9fd0','#4da8e8']);
  const hasBrown = values.includes('#9f6f4f');
  const earth  = hasBrown ? count(['#9f6f4f','#67bf92','#a8d85c']) : 0;
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

export async function onRequest(context) {
  const url    = new URL(context.request.url);
  const r      = url.searchParams.get('r') || '';
  const mode   = url.searchParams.get('mode') || '10';

  // 通常のHTMLを取得
  const response = await context.next();

  // rパラメータがない場合はそのまま返す
  if (!r) return response;

  // タイプ名を取得
  const colorMap = parseColors(r, mode);
  const typeId   = detectType(colorMap);
  const typeName = COLOR_TYPES[typeId]?.name || 'SynestheShare';

  const ogImageUrl = `${url.origin}/api/og?r=${encodeURIComponent(r)}&mode=${mode}`;
  const pageUrl    = url.href;
  const title      = `${typeName} — SynestheShare`;
  const desc       = `あなたの文字には、どんな色が見えますか？`;

  // HTMLRewriterでOGPタグを書き換え（コンマ区切りセレクタは非対応のため個別に指定）
  return new HTMLRewriter()
    .on('meta[property="og:title"]',       { element(el) { el.setAttribute('content', title); } })
    .on('meta[name="twitter:title"]',      { element(el) { el.setAttribute('content', title); } })
    .on('meta[property="og:description"]', { element(el) { el.setAttribute('content', desc);  } })
    .on('meta[name="twitter:description"]',{ element(el) { el.setAttribute('content', desc);  } })
    .on('meta[property="og:url"]',         { element(el) { el.setAttribute('content', pageUrl); } })
    .on('meta[property="og:image"]',       { element(el) { el.setAttribute('content', ogImageUrl); } })
    .on('meta[name="twitter:image"]',      { element(el) { el.setAttribute('content', ogImageUrl); } })
    .on('title',                           { element(el) { el.setInnerContent(title); } })
    .transform(response);
}
