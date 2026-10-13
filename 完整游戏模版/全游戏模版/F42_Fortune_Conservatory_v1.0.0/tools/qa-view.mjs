import {launchBrowser,baseUrl,sourceFingerprint} from './qa-support.mjs';
import fs from 'node:fs/promises';
const browser=await launchBrowser();
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
for(const game of ['home','tiger-treasury','koi-reserve','crane-palace','tortoise-vault']){
 await page.goto(baseUrl+'?debug=1&screen='+ (game==='home'?'home':'game&game='+game));
 await page.waitForFunction(()=>window.F42_QA,{timeout:90000});await page.waitForTimeout(550);
 await page.screenshot({path:`docs/screenshots/${game}.png`});
 console.log(game,JSON.stringify(await page.evaluate(()=>({qa:F42_QA.snapshot(),text:document.querySelector('#app').innerText}))).slice(0,2500));
}
console.log('ERRORS',errors);await browser.close();
