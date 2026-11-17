const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
 for(const english of [false,true]) for(const mode of ['10','number','subject']) for(const viewport of [{width:320,height:568},{width:390,height:844},{width:1280,height:800}]){
  const context=await browser.newContext({viewport});
  const page=await context.newPage();
  await page.route(/^https?:/,route=>route.abort()); // No production writes.
  const url=pathToFileURL(path.resolve(`result${english?'-en':''}.html`));url.search=`?mode=${mode}&r=0531-`;
  await page.goto(url.href);
  const dialog=page.locator('dialog.result-intro');await dialog.waitFor();
  const box=await dialog.evaluate(el=>({client:el.clientHeight,scroll:el.scrollHeight,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));
  assert(box.scroll<=box.client+1,JSON.stringify({english,mode,viewport,box}));
  assert(box.width<viewport.width&&box.height<viewport.height);
  assert((await page.locator('.result-intro-actions a').getAttribute('href')).includes(english?'index-en':'index'));
  assert(await dialog.evaluate(el=>el===document.activeElement));
  if(!english&&mode==='10'&&viewport.width===390)await dialog.screenshot({path:'design/ogp/result-intro-mobile.png'});
  await page.keyboard.press('Escape');assert(!await dialog.isVisible());
  await page.waitForFunction(()=>!document.documentElement.classList.contains('result-intro-open'));
  assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('result-intro-open')),false);
  await page.reload();assert.equal(await page.locator('dialog.result-intro').count(),0);
  await context.close();
 }
 for(const [mode,hash] of [['10',''],['number','#submit'],['subject','#submit']]){
  const context=await browser.newContext();
  if(mode==='10')await context.addInitScript(()=>{sessionStorage.setItem('ss_from_alphabet','1');sessionStorage.setItem('ss_vote_key','ss_voted_0531-')});
  const page=await context.newPage();await page.route(/^https?:/,route=>route.abort());
  const url=pathToFileURL(path.resolve('result.html'));url.search=`?mode=${mode}&r=0531-`;url.hash=hash;
  await page.goto(url.href);assert.equal(await page.locator('dialog.result-intro').count(),0);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('ss_result_intro_seen')),'1');
  await context.close();
 }
 console.log('Result introduction checks passed: shared entries, own-result suppression, 3 modes, 2 languages, one-screen mobile/desktop layout, focus, Escape and session dismissal.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
