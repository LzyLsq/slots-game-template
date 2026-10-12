import test from 'node:test';
import assert from 'node:assert/strict';
import {Reels} from '../src/reels.js';
import {MODES} from '../src/engine.js';

function setup(mode,{reduced=false,onCell}={}){
  const calls=[],callbacks=new Map(),listeners=new Map();let nextId=0,disconnected=false;
  globalThis.requestAnimationFrame=callback=>{callbacks.set(++nextId,callback);return nextId;};
  globalThis.cancelAnimationFrame=id=>callbacks.delete(id);
  globalThis.ResizeObserver=class{observe(){} disconnect(){disconnected=true;}};
  const context=new Proxy({}, {get(target,name){
    if(name in target)return target[name];
    return (...args)=>{calls.push([name,...args]);return name==='measureText'?{width:20}:name==='createLinearGradient'?{addColorStop(){}}:undefined;};
  }});
  const canvas={
    getContext:()=>context,
    getBoundingClientRect:()=>({left:0,top:0,width:360,height:300}),
    addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name),
  };
  const images=Array.from({length:8},(_,id)=>({id}));
  const reel=new Reels(canvas,images,mode,{reduced,onCell});
  const render=elapsed=>{callbacks.delete(reel.id);calls.length=0;reel.frame(reel.start+elapsed);return calls;};
  return {reel,canvas,calls,callbacks,listeners,render,disconnected:()=>disconnected};
}
const makeBoard=mode=>Array.from({length:mode.cols},(_,c)=>Array.from({length:mode.rows},(_,r)=>(c+r)%8));

test('all four F27 modes construct, animate downward and settle on the supplied board',()=>{
  for(const mode of MODES){
    const {reel,render}=setup(mode);
    const start=makeBoard(mode),target=start.map(column=>column.map(value=>(value+3)%8));
    reel.settle(start);reel.begin(target,{duration:320});
    assert.equal(reel.phase,'spin');
    assert.deepEqual(reel.before,start);
    for(let c=0;c<mode.cols;c++)for(let r=0;r<mode.rows;r++)
      assert.equal(reel.stripSymbol(c,r-(mode.rows+2),mode.rows+2),target[c][r]);
    render(3000);
    assert.equal(reel.phase,'idle');
    assert.deepEqual(reel.grid,target);
    reel.destroy();
  }
});

test('settle and begin copy boards instead of retaining mutable caller data',()=>{
  const mode=MODES[0],{reel}=setup(mode),board=makeBoard(mode);
  reel.settle(board);board[0][0]=7;
  assert.notEqual(reel.grid[0][0],7);
  const target=makeBoard(mode);reel.begin(target);target[1][1]=7;
  assert.notEqual(reel.target[1][1],7);
  reel.destroy();
});

test('winning cells are deduplicated, framed individually and cleared for the next spin',()=>{
  const mode=MODES[1],{reel}=setup(mode);
  const win={cells:[{c:0,r:0},{c:1,r:1},{c:1,r:1}]};
  reel.highlight([win,win]);
  assert.equal(reel.wins.length,2);
  assert.equal(reel.winKeys.size,2);
  assert.equal(reel.particles.length,16);
  reel.begin(makeBoard(mode));
  assert.equal(reel.wins.length,0);
  assert.equal(reel.winKeys.size,0);
  assert.equal(reel.particles.length,0);
  reel.destroy();
});

test('Diamond Foundry collapse preserves survivor offsets and completes its drop',()=>{
  const mode=MODES.find(item=>item.id==='diamond-foundry'),{reel,render}=setup(mode);
  const board=makeBoard(mode),next=makeBoard(mode).map(column=>column.map(value=>(value+1)%8));
  reel.settle(board);
  reel.collapse([{c:0,r:1},{c:0,r:3},{c:1,r:0}],next);
  reel.drop(next);
  assert.deepEqual(reel.dropOffsets[0],[2,2,2,1,0]);
  assert.deepEqual(reel.dropOffsets[1],[1,0,0,0,0]);
  render(1000);
  assert.equal(reel.phase,'idle');
  assert.deepEqual(reel.grid,next);
  reel.destroy();
});

test('reduced motion settles promptly and suppresses particles',()=>{
  const mode=MODES[3],{reel,render}=setup(mode,{reduced:true});
  reel.begin(makeBoard(mode));render(100);
  assert.equal(reel.phase,'idle');
  reel.highlight([{cells:[{c:0,r:0}]}]);
  assert.equal(reel.particles.length,0);
  reel.destroy();
});

test('pointer feedback stays within the grid and destroy removes all work',()=>{
  const mode=MODES[0];let selected=null;
  const {reel,callbacks,listeners,disconnected}=setup(mode,{onCell:(c,r,symbol)=>{selected={c,r,symbol};}});
  const pointer=listeners.get('pointerup');
  pointer({clientX:180,clientY:150});
  assert.deepEqual(selected,{c:1,r:1,symbol:reel.grid[1][1]});
  assert.ok(reel.particles.length>0);
  reel.destroy();
  assert.equal(callbacks.size,0);
  assert.equal(listeners.size,0);
  assert.equal(disconnected(),true);
  assert.equal(reel.particles.length,0);
});
