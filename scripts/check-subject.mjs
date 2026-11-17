import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import { parseAnswer, displayAnswer } from '../lib/og-renderer.js';
import { onRequest } from '../functions/api/og.js';

const ids = ['language','math','science','social','english'];
const picker = await readFile(new URL('../subject.html',import.meta.url),'utf8');
const pickerCode = [...picker.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].find(match=>match[2].includes('const LETTER_LABELS'))[2];
const restore = pickerCode.slice(0,pickerCode.indexOf('/* ══ DOM参照'));
for(const search of ['?mode=subject&r=01234','?%E5%9B%BD%E8%AA%9E=%23ff7f7f&%E6%95%B0%E5%AD%A6=%234da8e8']) {
  const map = JSON.parse(vm.runInNewContext(`${restore}; JSON.stringify(colorMap)`,{URLSearchParams,location:{search}}));
  assert.equal(map.language,'#ff7f7f');
  assert.equal(map.math,search.includes('r=')?'#ffae66':'#4da8e8');
}
assert(picker.includes('result.html?mode=subject&r='));
assert(picker.includes('ss_submitted_subject'));
assert(!picker.includes('images_sub/'));
assert.deepEqual(parseAnswer('01234','subject').map(item=>item.letter),ids);
assert.equal(displayAnswer(parseAnswer('0----','subject'),'subject').filter(item=>!item.color).length,4);

for(const english of [false,true]) {
  const html=await readFile(new URL(`../result${english?'-en':''}.html`,import.meta.url),'utf8');
  const code=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].find(match=>match[2].includes('const DUMMY_VOTES'))[2].split('window.DUMMY_VOTES =')[0];
  const elements={};
  const context=vm.createContext({URL,URLSearchParams,
    location:{origin:'https://example.test',href:`https://example.test/result${english?'-en':''}?mode=subject&r=01234`,search:'?mode=subject&r=01234'},
    window:{addEventListener(){}},document:{getElementById:id=>elements[id] ||= {innerHTML:'',setAttribute(){}}}});
  vm.runInContext(code,context);
  assert.equal(vm.runInContext('letters.join(",")',context),ids.join(','));
  vm.runInContext('renderWithoutStats(letters)',context);
  assert(!elements.shareOuter.innerHTML.includes('score='));
  assert(elements.mainWrap.innerHTML.includes(english?'subject-en.html':'subject.html'));
  vm.runInContext('letters.forEach(l=>DUMMY_VOTES[l]=[{color:colorMap[l],pct:100,name:"Red"}])',context);
  for(const builder of ['buildTypeHero(letters,calcDiagnosis())','buildSenseCard(letters)','buildVoteSection(letters)','buildShareSection(calcDiagnosis(),letters)']) {
    const output=vm.runInContext(builder,context);
    if(english) assert(!/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(output),builder);
  }
}
const env={ASSETS:{fetch:async url=>{try{return new Response(await readFile(new URL(`..${new URL(url).pathname}`,import.meta.url)))}catch{return new Response('missing',{status:404})}}}};
for(const language of ['ja','en']) {
  const response=await onRequest({request:new Request(`https://example.test/api/og?mode=subject&r=01234&score=40&lang=${language}`),env});
  assert.equal(response.status,200);
  const png=Buffer.from(await response.arrayBuffer());
  assert.equal(png.readUInt32BE(16),1200);
  await writeFile(new URL(`../design/ogp/subject${language==='en'?'-en':''}.png`,import.meta.url),png);
}
console.log('Subject checks passed: five subjects, old and new URLs, bilingual results, missing selections and OGP.');
