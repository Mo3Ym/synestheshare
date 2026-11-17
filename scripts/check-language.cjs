const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
// Exercise the menu's actual event handlers, including an answer changed after load.
for (const english of [false, true]) {
  const events = {};
  const trigger = { attributes: {}, addEventListener:(name,fn)=>events[`trigger-${name}`]=fn, setAttribute(name,value){this.attributes[name]=value;}, focus(){} };
  const link = { addEventListener:(name,fn)=>events[`link-${name}`]=fn };
  const options = { hidden:true, querySelector:()=>link };
  const menu = { innerHTML:'', querySelector:selector=>selector==='button'?trigger:options, contains:target=>target===trigger };
  const location = { pathname:`/alphabet${english?'-en':''}.html`, href:`https://example.test/alphabet${english?'-en':''}.html?mode=26&r=0#palette` };
  const document = {
    querySelector:()=>({classList:{contains:()=>true},prepend(){}}),
    createElement:()=>menu,
    addEventListener:(name,fn)=>events[name]=fn,
  };
  vm.runInNewContext(fs.readFileSync('assets/language.js','utf8'),{document,location,URL});
  assert(menu.innerHTML.includes(english?'Select language':'言語を選択'));
  events['trigger-click']();
  assert.equal(options.hidden,false);
  assert.equal(new URL(link.href).pathname,english?'/alphabet.html':'/alphabet-en.html');
  location.href = location.href.replace('r=0','r=5');
  events['link-click']();
  assert.equal(new URL(link.href).searchParams.get('r'),'5');
  assert.equal(new URL(link.href).searchParams.get('mode'),'26');
  assert.equal(new URL(link.href).hash,'#palette');
  events.keydown({key:'Escape'});
  assert.equal(options.hidden,true);
}
for (const page of ['index', 'alphabet', 'result', 'number', 'subject']) {
  const source = fs.readFileSync(`${page}-en.html`, 'utf8');
  for (const script of source.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (!/type="(module|importmap)"/.test(script[1])) new vm.Script(script[2], { filename: page });
  }
  const visible = source.replace(/<style>[\s\S]*?<\/style>/g, '')
    .replace(/<script type="module">[\s\S]*?<\/script>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  console.log(page, [...new Set(visible.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々〜～、。！？「」・…％：]+/gu) || [])].join('|'));
  assert(source.includes('<html lang="en">'));
  assert(source.includes('assets/language.js'));
  if (page === 'alphabet') assert(source.includes('result-en.html?mode='));
  if (page === 'subject') {
    assert(source.includes('const LETTERS_10 = Object.keys(LETTER_LABELS)'));
    assert(source.includes('"language":"Language"'));
  }
  if (page === 'result') {
    const script = [...source.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].find(match => match[2].includes('const DUMMY_VOTES'))[2].split('window.DUMMY_VOTES =')[0];
    const context = vm.createContext({
      URL, URLSearchParams,
      location: { origin:'https://example.test', href:'https://example.test/result-en?r=5566476C25&mode=10', search:'?r=5566476C25&mode=10' },
      window: { addEventListener() {}, innerWidth:1200 },
      document: { getElementById:()=>({setAttribute(){}}) },
    });
    vm.runInContext(script, context);
    for (const builder of ['buildTypeHero(colored,diag)', 'buildDiagSection(diag)', 'buildColorTypeSection(colored,diag)', 'buildSenseCard(colored)', 'buildVoteSection(colored)', 'buildShareSection(diag,colored)']) {
      const output = vm.runInContext(`(() => {const colored=letters.filter(l=>colorMap[l]),diag=calcDiagnosis(); return ${builder};})()`, context);
      assert(!/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(output), `${builder}: ${output.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu)}`);
    }
    const original = fs.readFileSync('result.html','utf8');
    const schema = text => text.match(/const COLOR_NAME = \{[\s\S]*?\};/)[0].replace(/\r\n/g,'\n');
    assert.equal(schema(source),schema(original));
  }
}
