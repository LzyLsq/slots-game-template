import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(new URL('../../完整游戏模版/全游戏模版/F13_Golden_Harvest_v1.0.0/package.json',import.meta.url));
const ts=require('typescript');
const source=readFileSync(new URL('../../完整游戏模版/全游戏模版/F27_Sovereign_Wealth_v1.0.0/assets/scripts/SovereignApp.ts',import.meta.url),'utf8');
const method=source.match(/private waitForReels\(\):Promise<void>\{([\s\S]*?)\n  private reelLand/);
assert(method,'F27 reel completion method not found');
const js=ts.transpileModule('function waitForReels(){'+method[1],{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
const waitForReels=Function(js+'; return waitForReels;')();

function fixture(){
 const timers=new Map();
 return{
  reelRuntime:[0,1,2].map(()=>({stopped:false})),timers,
  schedule(callback){if(!timers.has(callback))timers.set(callback,{once:false});},
  scheduleOnce(callback){if(!timers.has(callback))timers.set(callback,{once:true});},
  unschedule(callback){timers.delete(callback);},
  frame(){for(const [callback,timer] of [...timers]){callback();if(timer.once)timers.delete(callback);}},
 };
}

// Model Cocos' duplicate-callback registration and post-callback cancellation:
// the old recursive scheduleOnce exits after one poll, before reels stop.
const old=fixture();let oldFinished=false;
const oldTick=()=>old.reelRuntime.every(r=>r.stopped)?oldFinished=true:old.scheduleOnce(oldTick,.04);
oldTick();old.frame();old.reelRuntime.forEach(r=>r.stopped=true);old.frame();
assert.equal(oldFinished,false);assert.equal(old.timers.size,0);

const app=fixture();
for(let round=0;round<100;round++){
 app.reelRuntime.forEach(r=>r.stopped=false);let completed=false;
 const pending=waitForReels.call(app).then(()=>completed=true);
 assert.equal(app.timers.size,1,'one poller per round');
 for(let frame=0;frame<70;frame++){
  app.reelRuntime.forEach((r,index)=>{if(frame===28+index*11)r.stopped=true;});
  app.frame();await Promise.resolve();
  if(frame<50)assert.equal(completed,false,'must not settle before all reels stop');
 }
 await pending;assert.equal(completed,true);assert.equal(app.timers.size,0,'poller released after settlement');
}
app.reelRuntime=[];await waitForReels.call(app);assert.equal(app.timers.size,0);
console.log('PASS F27 actual reel-completion method: 100 rounds, no early completion, no timer leaks; original scheduleOnce failure reproduced.');
