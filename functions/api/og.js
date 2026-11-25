import { parseAnswer, renderPixels } from '../../lib/og-renderer.js';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n=0; n<256; n++) { let c=n; for (let k=0; k<8; k++) c=(c&1)?0xEDB88320^(c>>>1):c>>>1; t[n]=c; }
  return t;
})();

function readPercentage(params, key) {
  const value = params.get(key);
  return value !== null && /^\d{1,3}$/.test(value) && Number(value) <= 100 ? Number(value) : null;
}

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


export async function onRequest(context) {
  const url = new URL(context.request.url);
  const mode = url.searchParams.get('mode') || '10';
  if (!['10', '26', 'number', 'subject'].includes(mode)) return new Response('Invalid mode', { status: 400 });
  const answer = parseAnswer(url.searchParams.get('r'), mode);
  if (!answer?.length) return new Response('Valid r parameter required', { status: 400 });
  const score = readPercentage(url.searchParams, 'score');
  const majority = readPercentage(url.searchParams, 'majority');
  const stat = url.searchParams.get('stat') === 'rarity' ? 'rarity' : 'empathy';
  try {
    const pixels = await renderPixels(context, answer, mode, score, stat, url.searchParams.get('lang') === 'en' ? 'en' : 'ja', majority, url.searchParams.get('sense'));
    const png = await encodePNG(pixels, 1200, 630);
    return new Response(png, { headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    } });
  } catch (error) {
    console.error('OGP generation failed', error);
    return new Response('OGP generation failed', { status: 500 });
  }
}
