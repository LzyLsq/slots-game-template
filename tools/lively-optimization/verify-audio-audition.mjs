// Local playback and layout QA only. This does not measure listening quality.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {polishedFeedbackRevision as revision,polishedEvidenceDirectory} from './polished-feedback-profiles.mjs';

const require=createRequire('/Users/mengjunzhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright');
const roots=[resolve(import.meta.dirname,'../../Xcode_H5/WebP_IAP_20261010'),'/Users/mengjunzhu/Desktop/Xcode_H5/WebP_IAP_20261010'];
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const out=join(import.meta.dirname,polishedEvidenceDirectory);
mkdirSync(out,{recursive:true});
assert.equal(hash(join(roots[0],'音频试听.html')),hash(join(roots[1],'音频试听.html')),'Audition copies differ');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({viewport:{width:320,height:568}});
const page=await context.newPage(),games=[],errors=[];
let currentCue;
page.on('pageerror',e=>errors.push(String(e)));
try{
 await page.goto(pathToFileURL(join(roots[1],'音频试听.html')).href);
 const data=await page.locator('#audio-data').evaluate(el=>JSON.parse(el.textContent));
 assert.equal(data.length,20);
 for(const g of data){
  await page.selectOption('#game',String(g.id));
  assert(await page.locator('#player').evaluate(el=>el.paused&&!el.hasAttribute('src')),'Selection did not stop previous cue');
  const tracks=[];
  for(const section of ['music','feedback','wins']){
   const expected=g.tracks.filter(t=>section==='music'?t.id.startsWith('music-'):section==='wins'?t.id.startsWith('win-'):t.id.startsWith('sfx-'));
   const buttons=page.locator(`#${section} .cue`);
   assert.equal(await buttons.count(),expected.length);
   for(let i=0;i<expected.length;i++){
    currentCue={game:g.id,id:expected[i].id};
    const button=buttons.nth(i),b=await button.boundingBox();
    assert(b&&b.width>=44&&b.height>=44&&b.x>=0&&b.x+b.width<=320,'Small-screen cue clipped '+expected[i].id);
    await button.click();
    // Very short feedback may finish before the next browser polling tick.
    // Completed playback is valid evidence too; paused-at-zero is not.
    await page.waitForFunction(()=>{const p=document.querySelector('#player');return !p.error&&(!p.paused||p.ended)&&p.readyState>=2&&p.currentTime>0;},null,{timeout:12000});
    const status=await page.locator('#player').evaluate(el=>({src:decodeURIComponent(el.currentSrc),duration:el.duration,time:el.currentTime,error:el.error?.code}));
    assert(status.src.endsWith('/'+expected[i].file),'Wrong cue '+expected[i].id);
    assert(Number.isFinite(status.duration)&&status.duration>0&&!status.error,'Invalid playable cue');
    assert.equal(await page.locator('#error').textContent(),'');
    tracks.push({id:expected[i].id,duration:status.duration,playbackAdvanced:true});
    await page.locator('#stop').click();
    assert(await page.locator('#player').evaluate(el=>el.paused&&!el.hasAttribute('src')),'Stop failed');
   }
  }
  assert.equal(tracks.length,24);
  games.push({id:g.id,passed:true,tracks,smallScreenCueButtons:true,selectionStopsPreviousCue:true});
  console.log(`F${g.id} AUDITION PASS (24 local clips)`);
 }
 assert.equal(errors.length,0,JSON.stringify(errors));
 await page.selectOption('#game','14');
 await page.screenshot({path:join(out,'audition-320px.png'),fullPage:true});
 writeFileSync(join(out,'audition.json'),JSON.stringify({checkedAt:new Date().toISOString(),revision,passed:true,
  scope:'Both local HTML copies match. All 480 stored files load and playback advances in an isolated headless Chromium context at 320x568; selection and stop clear prior playback. Not human listening, in-game mix or real-device verification.',
  files:480,games,errors},null,2)+'\n');
}catch(error){
 const state=await page.locator('#player').evaluate(el=>({src:el.currentSrc,paused:el.paused,ended:el.ended,readyState:el.readyState,currentTime:el.currentTime,duration:el.duration,error:el.error?.message})).catch(()=>null);
 writeFileSync(join(out,'audition.json'),JSON.stringify({checkedAt:new Date().toISOString(),revision,passed:false,currentCue,error:String(error),state,games,errors},null,2)+'\n');
 console.error('Audition failure:',currentCue,state);
 throw error;
}finally{await context.close();await browser.close();}
