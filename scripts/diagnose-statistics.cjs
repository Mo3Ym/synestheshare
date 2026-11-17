// Read-only production connectivity check. No submission marker or vote intent.
const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
 const page=await browser.newPage();
 page.on('console',msg=>{if(msg.text().includes('[SynestheShare]'))console.log(msg.text());});
 page.on('pageerror',error=>console.log('Page error:',error.message));
 page.on('requestfailed',request=>{if(request.url().includes('firebase')||request.url().includes('firestore'))console.log('Request failed:',new URL(request.url()).hostname,request.failure()?.errorText);});
 const url=pathToFileURL(path.resolve('result.html'));url.search='?mode=number&r=4C45111111';
 await page.goto(url.href);
 await page.waitForFunction(()=>window.themeStatsStatus==='ready'||window.themeStatsStatus==='empty'||window.themeStatsStatus==='error',null,{timeout:20000}).catch(()=>{});
 console.log(await page.evaluate(()=>({status:window.themeStatsStatus||'pending',voteError:window.themeVoteError||'',message:document.getElementById('mainWrap').innerText})));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
