import test from 'node:test';import assert from 'node:assert/strict';import {Soundscape} from '../src/audio.mjs';
test('music crossfade clamps timestamps and volume, then pauses the old track',()=>{
 const saved=globalThis.requestAnimationFrame,queue=[];globalThis.requestAnimationFrame=f=>queue.push(f);
 try{
  const make=theme=>{let volume=0;return {theme,a:{paused:true,get volume(){return volume;},set volume(v){assert.ok(v>=0&&v<=1,'media volume range');volume=v;},play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;}}};};
  const audio=new Soundscape();audio.players=[make('lobby'),make('tiger')];audio.unlocked=true;audio.players[0].a.volume=.2;audio.players[0].a.paused=false;
  const before=performance.now();audio.switch('tiger');queue.shift()(before-16);assert.equal(audio.players[0].a.volume,.2);queue.shift()(before+700);assert.equal(audio.players[0].a.paused,true);assert.equal(audio.players[1].a.paused,false);assert.equal(audio.players[1].a.volume,.45*.32);
 }finally{globalThis.requestAnimationFrame=saved;}
});

test('a click does not wait for unrelated award decoding',async()=>{
 let started=0;const audio=new Soundscape();audio.unlocked=true;
 audio.ctx={state:'running',destination:{},createBufferSource:()=>({connect(){},disconnect(){},start(){started++;}}),createGain:()=>({gain:{value:0},connect(){},disconnect(){}})};
 audio.loading=new Promise(()=>{});audio.pending.set('fx-tap',Promise.resolve().then(()=>audio.buffers.set('fx-tap',{})));
 const result=await Promise.race([audio.cue('tap').then(()=>true),new Promise(r=>setTimeout(()=>r(false),100))]);
 assert.equal(result,true);assert.equal(started,1);
});
test('audio settings clamp out-of-range local preferences',()=>{
 const audio=new Soundscape();audio.set({music:4,sfx:-1});assert.equal(audio.musicLevel,1);assert.equal(audio.sfxLevel,0);
});
