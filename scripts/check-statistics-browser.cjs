const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const assert = require('node:assert/strict');
// All database operations in this check use an isolated fixture, never production.
const firestoreFixture = `
export const getFirestore=()=>({});
export const collection=(db,name)=>({path:name});
export const doc=(base,group,id)=>({path:id===undefined ? base.path+'/response' : group+'/'+id});
export const increment=n=>n;
export const serverTimestamp=()=>0;
export const writeBatch=()=>{const operations=[];return {
set:(ref,value,options)=>operations.push({ref,value,options}),
commit:async()=>{
if(window.__denyWrite) throw Object.assign(new Error('Denied'),{code:'permission-denied'});
const next=structuredClone(window.__fixtureDB);
for(const {ref,value,options} of operations){
if(options?.merge) {const entry=next[ref.path]||{};for(const [k,v] of Object.entries(value)) entry[k]=(entry[k]||0)+v;next[ref.path]=entry;}
else next[ref.path]=value;
}
window.__fixtureDB=next;window.__commits++;
}}};
export const getDoc=async ref=>({exists:()=>!!window.__fixtureDB[ref.path],data:()=>window.__fixtureDB[ref.path]});
`;
(async () => {
 const browser = await chromium.launch({channel:'chrome',headless:true});
 try {
 const cases=[{mode:'number',answer:'---3------'},{mode:'number',answer:'4C45111111'},{mode:'subject',answer:'0----'},{mode:'subject',answer:'0531-',legacy:true}];
 for(const english of [false,true]) for(const {mode,answer,legacy} of cases) {
 const context=await browser.newContext();
 await context.addInitScript(legacy=>{window.__fixtureDB=JSON.parse(sessionStorage.getItem('fixtureDB')||(legacy?'{"statistics/subject-language":{"赤":2}}':'{"statistics/4":{"赤":2}}'));window.__commits=0;if(legacy)localStorage.setItem('ss_submitted_subject','1');},legacy);
 const page=await context.newPage();const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route(/^https?:/,async route=>{
 const url=route.request().url();
 const body=url.endsWith('firebase-app.js')?'export const initializeApp=()=>({});':url.endsWith('firebase-firestore.js')?firestoreFixture:'';
 if(body) await route.fulfill({contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body});else await route.abort();
 });
 const url=pathToFileURL(path.resolve(`${mode}${english?'-en':''}.html`));url.search=`?mode=${mode}&r=${answer}`;
 await page.goto(url.href);await page.locator('#btnResult').click();
 await page.locator('.type-stat-card').waitFor();await page.locator('#mainWrap .sense-grid').waitFor();
 assert.equal(await page.evaluate(()=>window.__commits),1);
 const stats=await page.evaluate(()=>window.__fixtureDB);const ids=mode==='subject'?['language','math','science','social','english']:'1234567890'.split('');
 for(let i=0;i<answer.length;i++) if(answer[i]!=='-') assert.equal(Object.values(stats['statistics/'+(mode==='subject'?'subject-':'')+ids[i]]).reduce((a,b)=>a+b,0),mode==='number'&&ids[i]==='4'?3:legacy&&ids[i]==='language'?2:1);
 assert.equal(await page.locator('.type-palette-dot').count(),answer.replaceAll('-','').length);
 if(mode==='number')assert.match(await page.locator('.type-stat-card-label').last().innerText(),english?/number/i:/数字/);
 assert.equal(new URL(page.url()).hash,'');
 assert(!(await page.locator('#btnXShare').getAttribute('data-url')).includes('submit'));
 await page.evaluate(()=>sessionStorage.setItem('fixtureDB',JSON.stringify(window.__fixtureDB)));
 await page.reload();await page.locator('.type-stat-card').waitFor();
 assert.equal(await page.evaluate(()=>window.__commits),0);assert.deepEqual(errors,[]);
 if(mode==='subject'&&!legacy){
 url.search='?mode=subject&r=0531-';await page.goto(url.href);await page.locator('#btnResult').click();
 await page.locator('.type-stat-card').waitFor();
 const completed=await page.evaluate(()=>window.__fixtureDB);
 for(const id of ['language','math','science','social'])assert.equal(Object.values(completed['statistics/subject-'+id]).reduce((a,b)=>a+b,0),1);
 assert(!completed['statistics/subject-english']);
 }
 await context.close();
 }
 const deniedContext=await browser.newContext();
 await deniedContext.addInitScript(()=>{window.__fixtureDB={};window.__commits=0;window.__denyWrite=true;});
 const deniedPage=await deniedContext.newPage();
 await deniedPage.route(/^https?:/,async route=>{
 const url=route.request().url();
 const body=url.endsWith('firebase-app.js')?'export const initializeApp=()=>({});':url.endsWith('firebase-firestore.js')?firestoreFixture:'';
 if(body)await route.fulfill({contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body});else await route.abort();
 });
 const deniedUrl=pathToFileURL(path.resolve('result.html'));deniedUrl.search='?mode=number&r=---3------';deniedUrl.hash='submit';
 await deniedPage.goto(deniedUrl.href);
 await deniedPage.waitForFunction(()=>window.themeVoteError==='permission-denied');
 assert.match(await deniedPage.locator('#mainWrap').innerText(),/permission-denied/);
 assert.deepEqual(await deniedPage.evaluate(()=>window.__fixtureDB),{});
 assert.equal(await deniedPage.evaluate(()=>localStorage.getItem('ss_submitted_number')),null);
 await deniedContext.close();
 console.log('Browser checks passed: picker-to-result, atomic vote counts, single/all digits, Japanese/English, no duplicate on reload and no vote marker in sharing. Database is mocked.');
 } finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
