/** Compare source math with the actual Cocos web build, including feature metadata. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const {GAME_CONFIGS}=await import(process.cwd()+'/assets/scripts/math/GameConfigs.ts');
const {ResultGenerator}=await import(process.cwd()+'/assets/scripts/math/ResultGenerator.ts');
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
async function main(){
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage();const evidence=[];
 try{for(const config of GAME_CONFIGS){
  let state=91723;const rng={int:(min:number,max:number)=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return min+state%(max-min);},snapshot:()=>state};
  const generator=new ResultGenerator();
  const expected=Array.from({length:3000},()=>{const {spinId,...r}=generator.generate(config,config.bets[0],rng);return JSON.parse(JSON.stringify(r));});
  await page.goto(`http://127.0.0.1:${process.env.PREVIEW_PORT}/?debug=1&screen=game&game=${config.id}&v=four-mode-parity`);
  await page.waitForFunction(()=>{const cc=(globalThis as any).cc;return cc?.director.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp')?.reels;},null,{timeout:60000});
  const actual=await page.evaluate(`(()=>{
   const a=globalThis.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');let state=91723;
   const rng={int:(min,max)=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return min+state%(max-min);},snapshot:()=>state};
   return Array.from({length:3000},()=>{const {spinId,...r}=a.generator.generate(a.config,a.config.bets[0],rng);return JSON.parse(JSON.stringify(r));});
  })()`);
  const normalize=(v:unknown)=>JSON.parse(JSON.stringify(v,(k,x)=>k==='multiplier'&&typeof x==='number'?Number(x.toFixed(10)):x));assert.deepEqual(normalize(actual),normalize(expected),`${config.id}: browser/source divergence`);
  const count=expected.filter(r=>r.featureResult).length;assert(count>0);
  evidence.push({id:config.id,spins:expected.length,features:count,parity:true});console.log('PASS',config.id,count,'features');
 }
 writeFileSync('docs/cabinet-browser-parity-v4.json',JSON.stringify(evidence,null,2));
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
