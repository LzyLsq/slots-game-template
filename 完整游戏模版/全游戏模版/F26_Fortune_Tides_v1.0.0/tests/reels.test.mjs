import test from 'node:test';
import assert from 'node:assert/strict';
import {Reels} from '../src/reels.js';

function setup({reduced = false, mode = {cols: 3, rows: 3, id: 'mint'}} = {}) {
  const calls = [], callbacks = new Map(), listeners = new Map();
  let nextId = 0, disconnected = false;
  globalThis.requestAnimationFrame = callback => { callbacks.set(++nextId, callback); return nextId; };
  globalThis.cancelAnimationFrame = id => callbacks.delete(id);
  globalThis.ResizeObserver = class { observe() {} disconnect() { disconnected = true; } };
  const context = new Proxy({}, {get(target, name) {
    if (name in target) return target[name];
    return (...args) => { calls.push([name, ...args]); return name === 'measureText' ? {width: 20} : name === 'createLinearGradient' ? {addColorStop() {}} : undefined; };
  }});
  const canvas = {
    getContext: () => context,
    getBoundingClientRect: () => ({left: 0, top: 0, width: 300, height: 300}),
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: name => listeners.delete(name),
  };
  const images = Array.from({length: 8}, (_, id) => ({id}));
  const reel = new Reels(canvas, images, mode, {reduced});
  const render = elapsed => {
    callbacks.delete(reel.id);
    calls.length = 0;
    reel.frame(reel.start + elapsed);
    return calls.filter(call => call[0] === 'drawImage');
  };
  return {reel, calls, callbacks, listeners, render, disconnected: () => disconnected};
}

const before = [[0, 1, 2], [3, 4, 5], [6, 7, 0]];
const target = [[7, 6, 5], [4, 3, 2], [1, 0, 7]];

test('spin begins on the existing symbols and smoothly lands on exact target cells', () => {
  const {reel, render} = setup();
  reel.settle(before);
  reel.begin(target);
  const first = render(0);
  for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) {
    const actual = first[c * 5 + r + 1];
    assert.equal(actual[1].id, before[c][r]);
  }
  // The last arriving strip row must be the target, before switching to static symbols.
  for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) assert.equal(reel.stripSymbol(c, r - (10 + c * 2), 10 + c * 2), target[c][r]);
  render(2250);
  assert.equal(reel.phase, 'idle');
  assert.deepEqual(reel.grid, target);
  const final = render(0);
  assert.deepEqual(final.map(call => call[1].id), target.flat());
  assert.equal(reel.target, null);
  reel.destroy();
});

test('held coins retain their original symbol while other cells spin inside clips', () => {
  const {reel, render, calls} = setup();
  reel.settle(before);
  reel.begin(target, {locked: [[0, 25, 0], [0, 0, 0], [0, 0, 0]]});
  const draws = render(420);
  // Symbols now draw in local coordinates after a center translation.
  const translations = calls.filter(call => call[0] === 'translate');
  const held = draws.filter((call, i) => translations[i]?.[1] === 50 && translations[i]?.[2] === 150);
  assert.equal(held.length, 1);
  assert.equal(held[0][1].id, 1);
  assert.equal(calls.filter(call => call[0] === 'rect').length, 8);
  assert.equal(calls.filter(call => call[0] === 'fillText')[0][1], '25');
  reel.destroy();
});

test('wins are deduplicated and never leak into a new board or removed cell', () => {
  const {reel} = setup();
  const win = {cells: [{c: 0, r: 1}, {c: 1, r: 1}]};
  reel.highlight([win, win]);
  assert.equal(reel.wins.length, 2);
  assert.equal(reel.particles.length, 16);
  reel.settle(target);
  assert.equal(reel.wins.length, 0);
  assert.equal(reel.winKeys.size, 0);
  reel.highlight([win]);
  reel.collapse(win.cells, before);
  assert.equal(reel.winKeys.size, 0);
  reel.destroy();
});

test('cascade offsets preserve survivor ordering and complete before app advances', () => {
  const {reel, render} = setup();
  reel.settle(before);
  reel.collapse([{c: 0, r: 1}, {c: 1, r: 0}, {c: 1, r: 2}], target);
  reel.drop(target);
  assert.deepEqual(reel.dropOffsets, [[1, 1, 0], [2, 2, 1], [0, 0, 0]]);
  render(750);
  assert.equal(reel.phase, 'idle');
  assert.deepEqual(reel.grid, target);
  reel.destroy();
});

test('reduced motion has no rolling, bounce, particles or delayed drop', () => {
  const {reel, render, calls} = setup({reduced: true});
  reel.settle(before);
  reel.begin(target);
  assert.equal(render(0).length, 9);
  assert.equal(calls.filter(call => call[0] === 'rect').length, 0);
  render(85);
  assert.equal(reel.phase, 'idle');
  reel.highlight([{cells: [{c: 0, r: 0}]}]);
  assert.equal(reel.particles.length, 0);
  reel.collapse([{c: 0, r: 0}], before);
  const collapsed = render(0);
  assert.equal(collapsed[0][8], 0);
  reel.drop(before);
  render(0);
  assert.equal(reel.phase, 'idle');
  reel.destroy();
});

test('all drawing is enclosed by glass clipping and destroy cancels work and input', () => {
  const {reel, render, calls, callbacks, listeners, disconnected} = setup();
  reel.highlight([{cells: [{c: 0, r: 0}]}]);
  render(100);
  const clipIndex = calls.findIndex(call => call[0] === 'clip');
  assert.ok(clipIndex >= 0 && clipIndex < calls.findIndex(call => call[0] === 'drawImage'));
  assert.equal(calls.at(-1)[0], 'restore');
  reel.destroy();
  assert.equal(callbacks.size, 0);
  assert.equal(listeners.size, 0);
  assert.equal(disconnected(), true);
  assert.equal(reel.particles.length, 0);
  const count = calls.length;
  reel.frame(performance.now());
  assert.equal(calls.length, count);
});


test('every symbol silhouette is centered and constrained to its cell', () => {
  const {reel,calls} = setup({reduced:true});
  for(let id=0;id<8;id++) {
    calls.length=0;reel.drawSymbol(id,0,0,50);
    const draw=calls.find(c=>c[0]==='drawImage');
    assert.equal(draw[6]+draw[8]/2,0);
    assert.equal(draw[7]+draw[9]/2,0);
    assert.ok(draw[8]<=88 && draw[9]<=82, 'leave horizontal and vertical room for the landing recoil');
    if(id===3)assert.ok(draw[3]+draw[5]<200, 'ruby excludes the detached lower remnant');
  }
  reel.destroy();
});


test('all mode profiles finish within app timing and keep the exact supplied board', () => {
  const profiles = new Set();
  for (const [id, cols, rows] of [['mint', 5, 3], ['pearl', 4, 4], ['reef', 5, 4], ['beacon', 5, 3]]) {
    for (const duration of [1600, 480]) {
      const {reel, render} = setup({mode: {id, cols, rows}});
      const board = Array.from({length: cols}, (_, c) => Array.from({length: rows}, (_, r) => (c * 3 + r) % 8));
      reel.begin(board, {duration});
      profiles.add(JSON.stringify(reel.motion));
      render(duration === 1600 ? 2250 : 1150);
      assert.equal(reel.phase, 'idle', `${id} duration ${duration}`);
      assert.deepEqual(reel.grid, board);
      assert.deepEqual(render(0).map(call => call[1].id), board.flat());
      reel.destroy();
    }
  }
  assert.equal(profiles.size, 4);
});

test('the rolling strip converges on each final symbol without a last-frame swap', () => {
  const {reel, render} = setup();
  reel.settle(before); reel.begin(target);
  render(1599.9);
  // Close to the first stop, its three fully visible rows already contain the target.
  const seen = [];
  const draw = reel.drawSymbol.bind(reel);
  reel.drawSymbol = (...args) => { seen.push(args); draw(...args); };
  render(1599.99);
  const visible = seen.filter(args => args[1] === 0 && args[3] > 0 && args[3] < 300);
  assert.deepEqual(visible.map(args => args[0]), target[0]);
  visible.forEach((args, row) => assert.ok(Math.abs(args[3] - (row + .5) * 100) < .001));
  reel.destroy();
});

test('restarting a spin discards old outcomes and copies held values', () => {
  const {reel, render} = setup();
  reel.settle(before); reel.begin(target); render(400);
  const held = [[0, 25, 0], [0, 0, 0], [0, 0, 0]];
  reel.begin(before, {duration: 480, locked: held});
  held[0][1] = 99;
  assert.equal(reel.locked[0][1], 25);
  render(1150);
  assert.deepEqual(reel.grid, before);
  assert.equal(reel.values[0][1], 25);
  reel.destroy();
});

test('winning symbols keep a restrained pulse while their positions remain settled', () => {
  const {reel, render} = setup();
  reel.settle(before); reel.highlight([{cells: [{c: 0, r: 0}, {c: 1, r: 0}]}]);
  const frames = [];
  const draw = reel.drawSymbol.bind(reel);
  reel.drawSymbol = (...args) => { frames.push(args); draw(...args); };
  render(1800);
  const settled = frames.splice(0);
  render(3500);
  assert.deepEqual(frames.map(args => args.slice(0, 4)), settled.map(args => args.slice(0, 4)));
  for (const frame of [...settled, ...frames]) {
    const winning = frame[2] === 0 && frame[1] < 2;
    assert.ok(winning ? frame[4] >= 1.015 && frame[4] <= 1.034 : frame[4] === 1);
  }
  reel.clearWins();
  frames.length = 0;
  render(4000);
  assert.ok(frames.every(args => args[4] === 1));
  reel.destroy();
});


test('pearl ways connect one award at a time without crossing paying symbols', () => {
  const awards = [0, 2].map(r => ({cells: [0, 1, 2].map(c => ({c, r}))}));
  for (const reduced of [false, true]) {
    const {reel, render, calls} = setup({mode: {id: 'pearl', cols: 3, rows: 3}, reduced});
    reel.highlight(awards);
    reel.particles = []; // Isolate connector geometry from decorative star paths.
    const connectors = elapsed => {
      render(elapsed);
      // Reel dividers end at y=295; award connectors end at a cell center.
      return calls.filter(call => call[0] === 'lineTo' && call[2] !== 295);
    };
    assert.deepEqual(connectors(600), [['lineTo', 150, 50], ['lineTo', 250, 50]]);
    assert.deepEqual(connectors(1900), reduced
      ? [['lineTo', 150, 50], ['lineTo', 250, 50]]
      : [['lineTo', 150, 250], ['lineTo', 250, 250]]);
    assert.equal(reel.wins.length, 6, 'all awards retain per-cell highlights');
    reel.destroy();
  }
});

test('reef scatter highlights never suggest an adjacency requirement', () => {
  const {reel, render, calls} = setup({mode: {id: 'reef', cols: 3, rows: 3}});
  reel.highlight([{cells: [{c: 0, r: 0}, {c: 1, r: 0}, {c: 1, r: 1}, {c: 2, r: 2}]}]);
  reel.particles = []; // Scatter connectors, not particle silhouettes.
  render(600);
  assert.equal(calls.filter(call => call[0] === 'lineTo').length, 0);
  assert.equal(reel.winKeys.size, 4);
  assert.equal(calls.filter(call => call[0] === 'roundRect').length, 9, 'glass and two highlights per winner');
  reel.destroy();
});

test('outer reel rows preserve their proportions across the landing boundary', () => {
  for (const [id, rows] of [['mint', 3], ['pearl', 4]]) {
    const {reel, render} = setup({mode: {id, cols: 3, rows}});
    const board = Array.from({length: 3}, (_, c) => Array.from({length: rows}, (_, r) => (c + r) % 8));
    reel.begin(board);
    const samples = [];
    const draw = reel.drawSymbol.bind(reel);
    reel.drawSymbol = (...args) => { if (args[1] === 0 && args[3] > 0 && args[3] < 300) samples.push(args); draw(...args); };
    render(1599.99);
    const moving = samples.splice(0);
    render(1600.01);
    assert.equal(moving.length, rows);
    assert.equal(samples.length, rows);
    for (let r = 0; r < rows; r++) {
      assert.equal(moving[r][0], samples[r][0]);
      assert.ok(Math.abs(moving[r][3] - samples[r][3]) < .00001, 'position meets smoothly');
      assert.ok(Math.abs(moving[r][6] - samples[r][6]) < .00001, 'stretch meets smoothly');
    }
    reel.destroy();
  }
});

test('particle paths exclude coin value badges while keeping surrounding sparkles', () => {
  const {reel, render, calls} = setup();
  reel.settle(before, [[25, 0, 0], [0, 0, 0], [0, 0, 0]]);
  reel.particles = [
    {x: 50, y: 85, vx: 0, vy: 0, t: reel.start, life: 1000, color: '#fff', size: 2},
    {x: 50, y: 40, vx: 0, vy: 0, t: reel.start, life: 1000, color: '#fff', size: 2},
  ];
  render(100);
  const sparkles = calls.filter(call => call[0] === 'arc');
  assert.equal(sparkles.length, 1);
  assert.ok(sparkles[0][2] < 50);
  assert.equal(calls.filter(call => call[0] === 'fillText')[0][1], '25');
  reel.destroy();
});

test('idle glint moves only along the glass lip and respects reduced motion', () => {
  for (const reduced of [false, true]) {
    const {reel, render, calls} = setup({reduced});
    const first = render(100);
    const firstGlint = calls.filter(call => call[0] === 'createLinearGradient').at(-1);
    const later = render(5000);
    const laterGlint = calls.filter(call => call[0] === 'createLinearGradient').at(-1);
    if (reduced) assert.deepEqual(first, later, 'reduced-motion symbols remain still');
    else assert.deepEqual(first.map(draw=>draw[1]),later.map(draw=>draw[1]),'idle animation preserves every symbol');
    assert.equal(firstGlint[2], 0);
    assert.equal(firstGlint[4], 0);
    assert.ok(calls.some(call => call[0] === 'fillRect' && call[2] === 1 && call[4] === 1.5));
    if (reduced) assert.deepEqual(firstGlint, laterGlint);
    else assert.notDeepEqual(firstGlint, laterGlint);
    reel.destroy();
  }
});


test('short respins keep cruise speed near a normal spin and still arrive on the target strip', () => {
  for (const [id, cols, rows] of [['mint', 5, 3], ['pearl', 4, 4], ['reef', 5, 4], ['beacon', 5, 3]]) {
    const speeds = [];
    for (const duration of [1600, 480]) {
      const {reel, render} = setup({mode: {id, cols, rows}});
      const board = Array.from({length: cols}, (_, c) => Array.from({length: rows}, (_, r) => (c + r) % 8));
      reel.begin(board, {duration});
      let positions = [];
      reel.drawSymbol = (symbol, c, row, y, scale, alpha = 1) => {
        if (c === 0 && row === 0 && alpha === 1) positions.push(y);
      };
      render(duration * .4); render(duration * .4 + 1);
      speeds.push((positions[1] - positions[0] + 300 / rows) % (300 / rows));
      const seen = [];
      reel.drawSymbol = (symbol, c, row, y, scale, alpha = 1) => {
        if (c === 0 && y > 0 && y < 300 && alpha === 1) seen.push(symbol);
      };
      render(duration - .001);
      assert.deepEqual(seen, board[0], `${id} ${duration}: no symbol swap at the stop`);
      reel.destroy();
    }
    assert.ok(speeds[1] < speeds[0] * 1.4, `${id}: respin should not triple cruise speed`);
    assert.ok(speeds[1] > speeds[0] * .7, `${id}: respin retains a lively cruise`);
  }
});

test('cascade recoil joins the falling trajectory without a velocity kick', () => {
  const {reel, render} = setup({mode: {id: 'reef', cols: 3, rows: 3}});
  reel.settle(before);
  reel.collapse([{c: 0, r: 0}], target);
  reel.drop(target);
  const positions = [];
  reel.drawSymbol = (symbol, c, r, y) => { if (c === 0 && r === 0) positions.push(y); };
  const join = 460 * .7, epsilon = .01;
  render(join - epsilon); render(join); render(join + epsilon);
  const incoming = (positions[1] - positions[0]) / epsilon;
  const outgoing = (positions[2] - positions[1]) / epsilon;
  assert.ok(Math.abs(outgoing - incoming) < .0001, 'spring starts with continuous velocity');
  render(460);
  assert.equal(positions.at(-1), 50, 'spring finishes at the exact cell center');
  reel.destroy();
});

test('unchanged resize notifications preserve the canvas and in-flight particles', () => {
  const {reel} = setup();
  reel.burst(0, 0, 4);
  const particles = reel.particles;
  let resets = 0;
  Object.defineProperty(reel.canvas, 'width', {set() { resets++; }});
  Object.defineProperty(reel.canvas, 'height', {set() { resets++; }});
  reel.size();
  assert.equal(resets, 0, 'assigning canvas dimensions clears the existing bitmap');
  assert.equal(reel.particles, particles);
  reel.canvas.getBoundingClientRect = () => ({width: 360, height: 300});
  reel.size();
  assert.equal(reel.w, 360);
  assert.equal(resets, 2);
  assert.equal(reel.particles.length, 0, 'real resize discards old viewport coordinates');
  reel.destroy();
});

test('prepared symbol sprites preserve source crops and are released on destroy', () => {
  const {reel,render}=setup();
  const previous=globalThis.document,prepared=[];
  try {
    globalThis.document={createElement:()=>{
      const sprite={width:0,height:0,getContext:()=>({drawImage:(...args)=>prepared.push(args)})};
      return sprite;
    }};
    reel.images[0].symbolCrop=[12,18,120,200];
    reel.prepareSprites();
    assert.equal(reel.sprites.length,8);
    assert.deepEqual(prepared[0].slice(1,5),[12,18,120,200]);
    assert.ok(Math.abs(reel.sprites[0].width/reel.sprites[0].height-.6)<.02);
    reel.settle(before);
    const draws=render(0);
    assert.equal(draws[0][1],reel.sprites[0]);
    assert.ok(draws.every(call=>reel.sprites.includes(call[1])));
    reel.destroy();assert.equal(reel.sprites.length,0);
  } finally {
    if(previous===undefined)delete globalThis.document;else globalThis.document=previous;
  }
});

test('settling preserves live landing sparks but the next spin discards them', () => {
  const {reel}=setup();
  reel.burst(0,0,4);
  assert.equal(reel.particles.length,4);
  reel.settle(target);
  assert.equal(reel.particles.length,4);
  reel.begin(before);
  assert.equal(reel.particles.length,0);
  reel.destroy();
});

test('idle invitation stays within each cell and never moves held-value symbols', () => {
  for (const id of ['mint', 'pearl', 'reef', 'beacon']) {
    const {reel,render,calls}=setup({mode:{id,cols:3,rows:3}});
    reel.settle(before);
    for (const elapsed of Array.from({length:185},(_,i)=>i*50)) {
      render(elapsed);
      let x=0,y=0,angle=0;
      for(const call of calls){
        if(call[0]==='translate'){x=call[1];y=call[2];}
        if(call[0]==='rotate')angle=call[1];
        if(call[0]==='drawImage'){
          const dw=call.at(-2),dh=call.at(-1);
          const halfW=(Math.abs(dw*Math.cos(angle))+Math.abs(dh*Math.sin(angle)))/2;
          const halfH=(Math.abs(dh*Math.cos(angle))+Math.abs(dw*Math.sin(angle)))/2;
          const col=Math.floor(x/100),row=Math.floor(y/100);
          assert.ok(x-halfW>=col*100 && x+halfW<=(col+1)*100);
          assert.ok(y-halfH>=row*100 && y+halfH<=(row+1)*100);
        }
      }
    }
    reel.settle(before,Array.from({length:3},()=>[10,10,10]));
    const initial=render(0).map(call=>call.slice(2));
    assert.deepEqual(render(1300).map(call=>call.slice(2)),initial);
    reel.destroy();
  }
});
