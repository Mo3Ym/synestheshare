/**
 * functions/result.js
 * /result（Pretty URL）へのリクエスト時にOGPタグを動的注入
 * CF Pagesが /result.html → /result にリダイレクトするため、
 * result.html.js とは別に /result 用のハンドラが必要。
 */

const PRESET_COLORS = [
  '#e03a2a','#e87820','#f0e040','#a8d020',
  '#2a9e60','#1888c8','#70cbff','#7028c0',
  '#ff90b8','#8b4513','#181818','#888880','#ffffff',
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

export async function onRequest(context) {
  const url  = new URL(context.request.url);
  const r    = url.searchParams.get('r') || '';
  const mode = url.searchParams.get('mode') || '10';

  const response = await context.next();

  if (!r) return response;

  const colorMap = parseColors(r, mode);
  const typeId   = detectType(colorMap);
  const typeName = COLOR_TYPES[typeId]?.name || 'SynestheShare';

  const ogImageUrl = `${url.origin}/api/og?r=${encodeURIComponent(r)}&mode=${mode}`;
  const pageUrl    = url.href;
  const title      = `${typeName} — SynestheShare`;
  const desc       = `あなたの文字には、どんな色が見えますか？`;

  return new HTMLRewriter()
    .on('meta[property="og:title"], meta[name="twitter:title"]', {
      element(el) { el.setAttribute('content', title); }
    })
    .on('meta[property="og:description"], meta[name="twitter:description"]', {
      element(el) { el.setAttribute('content', desc); }
    })
    .on('meta[property="og:url"]', {
      element(el) { el.setAttribute('content', pageUrl); }
    })
    .on('meta[property="og:image"], meta[name="twitter:image"]', {
      element(el) { el.setAttribute('content', ogImageUrl); }
    })
    .on('title', {
      element(el) { el.setInnerContent(title); }
    })
    .transform(response);
}
