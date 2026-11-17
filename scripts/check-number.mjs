import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import { parseAnswer, displayAnswer } from '../lib/og-renderer.js';
import { onRequest } from '../functions/api/og.js';

const page = await readFile(new URL('../number.html', import.meta.url), 'utf8');
const main = [...page.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].find(match => match[2].includes('const LETTERS_10'))[2];
const restore = main.slice(0, main.indexOf('/* ══ DOM参照'));
for (const search of ['?mode=number&r=0123456789', '?1=%23ff7f7f&0=%234da8e8']) {
  const colors = vm.runInNewContext(`${restore}; JSON.stringify(colorMap)`, { URLSearchParams, location: { search } });
  const map = JSON.parse(colors);
  assert.equal(map['1'], '#ff7f7f');
  assert.equal(map['0'], search.includes('r=') ? '#9f6f4f' : '#4da8e8');
}
assert(!page.includes('id="btnModeToggle"'));
assert(page.includes('result.html?mode=number&r='));
assert(page.includes('ss_submitted_number'));
const answer = parseAnswer('0123456789', 'number');
assert.equal(answer.map(item=>item.letter).join(''), '1234567890');
assert.equal(displayAnswer(parseAnswer('0-', 'number'), 'number').length,10);
for (const english of [false,true]) for (const local of [false,true]) {
  const html = await readFile(new URL(`../result${english?'-en':''}.html`, import.meta.url),'utf8');
  const script = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].find(match=>match[2].includes('const DUMMY_VOTES'))[2].split('window.DUMMY_VOTES =')[0];
  const elements = {};
  const context = vm.createContext({ URL, URLSearchParams,
    location:{protocol:local?'file:':'https:',origin:local?'null':'https://example.test',href:`${local?'file:///C:/preview':'https://example.test'}/result${english?'-en':''}.html?mode=number&r=---3------`,search:'?mode=number&r=---3------'},
    window:{addEventListener(){}},
    document:{getElementById:id=>elements[id] ||= {innerHTML:'',setAttribute(){}}},
  });
  vm.runInContext(script,context);
  assert.equal(vm.runInContext('letters.join("")',context),'1234567890');
  vm.runInContext('renderWithoutStats(letters.filter(l=>colorMap[l]))',context);
  assert(!elements.shareOuter.innerHTML.includes('score='));
  assert(!elements.shareOuter.innerHTML.includes('null/api/og'));
  assert(elements.mainWrap.innerHTML.includes('r=---3------'));
  if(english) assert(elements.shareOuter.innerHTML.includes('lang=en'));
  vm.runInContext('letters.forEach(l=>DUMMY_VOTES[l]=[{color:colorMap[l],pct:100,name:"Red"}])',context);
  vm.runInContext('var colored = letters.filter(l=>colorMap[l])',context);
  for (const builder of ['buildTypeHero(letters,calcDiagnosis())', 'buildDiagSection(calcDiagnosis())', 'buildColorTypeSection(letters,calcDiagnosis())', 'buildSenseCard(letters)', 'buildVoteSection(letters)']) {
    vm.runInContext(builder.replaceAll('(letters', '(colored'), context);
  }
  const share = vm.runInContext('buildShareSection(calcDiagnosis(),letters)',context);
  assert(share.includes('mode=number'));
  const title = english ? 'Most shared letter' : '最も共感された文字';
  const tweetUrl = share.match(/id="btnXShare" data-url="([^"]+)"/)[1];
  assert(new URL(tweetUrl).searchParams.get('text').includes(title));
  if(english) assert(!/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(share));
}
const env={ASSETS:{fetch:async url=>{try{return new Response(await readFile(new URL(`..${new URL(url).pathname}`,import.meta.url)))}catch{return new Response('missing',{status:404})}}}};
for(const language of ['ja','en']) {
  const response=await onRequest({request:new Request(`https://example.test/api/og?mode=number&r=0123456789&score=40&lang=${language}`),env});
  assert.equal(response.status,200);
  const png=Buffer.from(await response.arrayBuffer());
  assert.equal(png.readUInt32BE(16),1200);
  await writeFile(new URL(`../design/ogp/number${language==='en'?'-en':''}.png`,import.meta.url),png);
}
console.log('Number checks passed: modern and legacy URL restoration, separate voting, empty statistics, bilingual results and numeric OGP.');
