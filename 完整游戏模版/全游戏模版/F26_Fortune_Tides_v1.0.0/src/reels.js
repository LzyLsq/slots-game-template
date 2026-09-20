import {symbolBounds} from './symbol-alignment.js';
// A single cancellable canvas renderer; every effect stays inside the cabinet glass.
const clamp = value => Math.max(0, Math.min(1, value));
const key = (c, r) => `${c},${r}`;
const copyGrid = grid => grid.map(column => [...column]);
// Both ends meet their neighbouring motion with zero recoil velocity.
const spring = p => Math.sin(p * Math.PI * 2) * Math.sin(p * Math.PI) * (1 - p) * 1.6;
// Four soft phases: anticipation, lift, landing compression, quiet recovery.
// Squared sine envelopes meet at zero velocity, without a hard pose change.
function buoyantPose(progress) {
  const p = clamp(progress);
  const pulse = (a,b) => Math.sin(clamp((p-a)/(b-a))*Math.PI)**2;
  const prepare = pulse(0,.16), lift = pulse(.16,.60);
  const land = pulse(.60,.79), recover = pulse(.79,1);
  return {lift:lift*.052-prepare*.009-land*.012+recover*.008,
    stretch:1-prepare*.055+lift*.045-land*.065+recover*.018};
}
const numberFormats = [false, true].map(compact => new Intl.NumberFormat('en', {
  maximumFractionDigits: 1, notation: compact ? 'compact' : 'standard',
}));

// S05's staggered stops, short recoil and row pulses translated to a continuous strip.
// Each profile fits the app's 2250ms spin / 1150ms respin presentation window.
const motionProfiles = {
  mint: {start: 42, stop: 85, land: 260, recoil: .070, distance: 18, tint: '255,218,130', dance: .075},
  pearl: {start: 35, stop: 95, land: 290, recoil: .045, distance: 16, tint: '170,224,244', dance: .035},
  reef: {start: 28, stop: 65, land: 270, recoil: .055, distance: 15, tint: '119,230,200', dance: .045},
  beacon: {start: 36, stop: 78, land: 300, recoil: .040, distance: 17, tint: '255,200,111', dance: .025},
};

// Cosine ramps integrate velocity continuously through acceleration, cruise and brake.
function spinProgress(progress) {
  const p = clamp(progress), accelerate = .16, brake = .38;
  const area = 1 - (accelerate + brake) / 2;
  const ramp = (x, length) => (x - length / Math.PI * Math.sin(Math.PI * x / length)) / 2;
  if (p < accelerate) return ramp(p, accelerate) / area;
  if (p < 1 - brake) return (p - accelerate / 2) / area;
  return 1 - ramp(1 - p, brake) / area;
}

export class Reels {
  constructor(canvas, images, mode, {reduced = false, onCell} = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.images = images;
    this.sprites = [];
    this.mode = mode;
    this.motion = motionProfiles[mode.id] || motionProfiles.mint;
    this.reduced = reduced;
    this.grid = Array.from({length: mode.cols}, (_, c) => Array.from({length: mode.rows}, (_, r) => (c + r * 2) % 6));
    this.wins = [];
    this.winKeys = new Set();
    this.particles = [];
    this.phase = 'idle';
    this.start = performance.now();
    this.live = true;
    this.values = null;
    this.labels = new Map();
    this.onCell = onCell;
    this.frame = this.frame.bind(this);
    this.resize = new ResizeObserver(() => this.size());
    this.resize.observe(canvas);
    this.pointer = event => {
      if (this.phase !== 'idle' || !this.live) return;
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const c = Math.floor((event.clientX - bounds.left) / bounds.width * mode.cols);
      const r = Math.floor((event.clientY - bounds.top) / bounds.height * mode.rows);
      if (c < 0 || c >= mode.cols || r < 0 || r >= mode.rows) return;
      this.touch = {c, r, start: performance.now()};
      this.burst(c, r, 5);
      onCell?.(c, r, this.grid[c][r]);
    };
    canvas.addEventListener('pointerup', this.pointer);
    this.size();
    this.id = requestAnimationFrame(this.frame);
  }

  size() {
    const bounds = this.canvas.getBoundingClientRect();
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 3);
    if (this.w === bounds.width && this.h === bounds.height && this.dpr === dpr) return;
    this.dpr = dpr;
    this.w = bounds.width;
    this.h = bounds.height;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.prepareSprites();
    // Particle coordinates belong to the old viewport; discard on resize.
    this.particles = [];
  }

  prepareSprites() {
    this.sprites=[];
    if (typeof document==='undefined' || !this.w || !this.h) return;
    const cellW=this.w/this.mode.cols,cellH=this.h/this.mode.rows;
    this.sprites=this.images.map((image,id)=>{
      if (!image) return null;
      const [sx,sy,sw,sh]=image.symbolCrop||symbolBounds[id]||[0,0,256,256];
      const canvas=document.createElement('canvas');
      // Cache at native crop resolution where practical; never enlarge source pixels.
      // A 2x display reserve preserves detail through win pulses and squashes.
      const fit=Math.min(1,Math.min(cellW*.88/sw,cellH*.82/sh)*this.dpr*2);
      canvas.width=Math.max(1,Math.ceil(sw*fit));
      canvas.height=Math.max(1,Math.ceil(sh*fit));
      const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      ctx.drawImage(image,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
      return canvas;
    });
  }

  clearWins() {
    this.wins = [];
    this.winKeys.clear();
    this.awards = [];
  }

  begin(grid, {duration = 1600, locked = null} = {}) {
    this.touch = null;
    this.before = copyGrid(this.grid);
    this.target = copyGrid(grid);
    this.phase = 'spin';
    this.start = performance.now();
    this.duration = this.reduced ? 80 : Math.max(1, duration);
    this.locked = locked ? copyGrid(locked) : null;
    this.landed = new Set();
    this.values = this.locked;
    this.clearWins();
    this.particles = [];
  }

  settle(grid, values) {
    this.grid = copyGrid(grid);
    this.values = values ? copyGrid(values) : null;
    this.phase = 'idle';
    this.start = performance.now();
    this.target = null;
    this.locked = null;
    this.clearWins();
    this.particles = this.particles.filter(p => performance.now()-p.t < p.life);
  }

  highlight(wins) {
    if (!this.live) return;
    this.awards = wins;
    this.wins = [...new Map(wins.flatMap(win => win.cells).map(cell => [key(cell.c, cell.r), cell])).values()];
    this.winKeys = new Set(this.wins.map(cell => key(cell.c, cell.r)));
    this.start = performance.now();
    for (const cell of this.wins) this.burst(cell.c, cell.r, 8);
  }

  collapse(remove, next) {
    this.remove = remove;
    this.removeKeys = new Set(remove.map(cell => key(cell.c, cell.r)));
    this.next = next;
    this.phase = 'collapse';
    this.start = performance.now();
    this.clearWins();
    for (const cell of remove) this.burst(cell.c, cell.r, 15);
  }

  drop(grid) {
    this.dropOffsets = grid.map((column, c) => {
      const survivors = this.grid[c].map((_, r) => r).filter(r => !this.removeKeys?.has(key(c, r)));
      const added = this.mode.rows - survivors.length;
      return column.map((_, r) => r < added ? added : r - survivors[r - added]);
    });
    this.grid = copyGrid(grid);
    this.phase = 'drop';
    this.start = performance.now();
    this.clearWins();
  }

  burst(c, r, count) {
    if (this.reduced || !this.live) return;
    const time = performance.now();
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2, speed = 20 + Math.random() * 34;
      this.particles.push({x: (c + .5) * this.w / this.mode.cols, y: (r + .5) * this.h / this.mode.rows,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 16,
        t: time, life: 420 + Math.random() * 220, color: i % 3 ? '#fff9dd' : `rgb(${this.motion.tint})`, star: i % 3 === 0, size: 1.2 + Math.random() * 2.2});
    }
    if (this.particles.length > 240) this.particles.splice(0, this.particles.length - 240);
  }

  drawSymbol(id, c, r, y, scale = 1, alpha = 1, stretch = 1, angle = 0) {
    const image = this.images[id];
    if (!image) return;
    const cellW=this.w/this.mode.cols,cellH=this.h/this.mode.rows;
    this.ctx.globalAlpha = alpha;
    this.ctx.save();
    this.ctx.translate((c + .5) * this.w / this.mode.cols, y);
    this.ctx.rotate(angle);
    const [sx,sy,sw,sh] = image.symbolCrop || symbolBounds[id] || [0,0,256,256];
    const fit = Math.min(cellW*.88/sw,cellH*.82/sh)*scale;
    const dw = sw * fit / Math.sqrt(stretch), dh = sh * fit * stretch;
    const sprite=this.sprites[id];
    if(sprite)this.ctx.drawImage(sprite,0,0,sprite.width,sprite.height,-dw/2,-dh/2,dw,dh);
    else this.ctx.drawImage(image, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
    this.ctx.restore();
    this.ctx.globalAlpha = 1;
  }

  stripSymbol(c, sourceRow, distance) {
    if (sourceRow >= 0 && sourceRow < this.mode.rows) return this.before[c][sourceRow];
    const targetRow = sourceRow + distance;
    if (targetRow >= 0 && targetRow < this.mode.rows) return this.target[c][targetRow];
    return ((sourceRow + c * 3) % 8 + 8) % 8;
  }

  frame(now) {
    if (!this.live) return;
    const g = this.ctx, w = this.w, h = this.h;
    const cw = w / this.mode.cols, ch = h / this.mode.rows, t = Math.max(0, now - this.start);
    const labelRects = [];
    const activeAward = ['mint', 'pearl'].includes(this.mode.id) && this.awards?.length
      ? this.awards[this.reduced ? 0 : Math.floor(t / 1300) % this.awards.length] : null;
    const activeWinKeys = activeAward ? new Set(activeAward.cells.map(cell => key(cell.c, cell.r))) : this.winKeys;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // Canvas resize resets sampling state. Set it on the final display pass too.
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.clearRect(0, 0, w, h);
    g.save();
    g.beginPath();
    g.roundRect(0, 0, w, h, Math.min(8, w * .02));
    g.clip();
    if (['mint', 'pearl'].includes(this.mode.id)) {
      g.strokeStyle = 'rgba(145,107,35,.13)';
      g.lineWidth = .65;
      for (let c = 1; c < this.mode.cols; c++) {
        g.beginPath(); g.moveTo(c * cw, 5); g.lineTo(c * cw, h - 5); g.stroke();
      }
    }
    if (this.mode.id === 'mint' && this.wins.length && this.phase === 'idle' && this.awards?.length) {
      const award = this.awards[this.reduced ? 0 : Math.floor(t / 1300) % this.awards.length];
      const cells = award.cells.slice().sort((a, b) => a.c - b.c);
      const progress = this.reduced ? 1 : clamp((t % 1300) / 380);
      g.save(); g.beginPath();
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        if (i === 0) g.moveTo((cell.c + .5) * cw, (cell.r + .5) * ch);
        else {
          const previous = cells[i - 1], part = clamp(progress * (cells.length - 1) - (i - 1));
          g.lineTo((previous.c + .5 + (cell.c - previous.c) * part) * cw, (previous.r + .5 + (cell.r - previous.r) * part) * ch);
          if (part < 1) break;
        }
      }
      g.strokeStyle = '#f2af2a'; g.lineWidth = 3; g.shadowColor = '#ffe47a'; g.shadowBlur = 7; g.stroke();
      g.shadowBlur = 0; g.strokeStyle = '#fff5cd'; g.lineWidth = 1; g.stroke(); g.restore();
    }
    if (this.mode.id === 'pearl' && this.phase === 'idle' && this.awards?.length) {
      // Present one paying symbol at a time: unioned cells can invent cross-symbol ways.
      const award = this.awards[this.reduced ? 0 : Math.floor(t / 1300) % this.awards.length];
      const cells = [...new Map(award.cells.map(cell => [key(cell.c, cell.r), cell])).values()];
      g.save(); g.strokeStyle = `rgba(${this.motion.tint},.48)`; g.lineWidth = 2;
      const reveal = this.reduced ? 1 : clamp((t % 1300) / 480);
      for (const cell of cells) {
        for (const next of cells.filter(other => other.c === cell.c + 1)) {
          g.beginPath(); g.moveTo((cell.c + .5) * cw, (cell.r + .5) * ch);
          g.lineTo((cell.c + .5 + (next.c - cell.c) * reveal) * cw, (cell.r + .5 + (next.r - cell.r) * reveal) * ch); g.stroke();
        }
      }
      g.restore();
    }
    for (let c = 0; c < this.mode.cols; c++) {
      const delay = this.reduced ? 0 : c * this.motion.start;
      const end = this.duration + (this.reduced ? 0 : c * this.motion.stop);
      const isRolling = this.phase === 'spin' && !this.reduced && t < end;
      // A short respin travels fewer whole cells instead of rushing a full strip.
      // Keep enough separation that the initial and final boards never overlap.
      const distance = Math.max(this.mode.rows + 2, Math.round((this.motion.distance + c * 2) * Math.min(1, this.duration / 1600)));
      const local = (t - delay) / (end - delay);
      const pickup = clamp((t - delay) / 160);
      const anticipation = pickup < 1 ? -.055 * Math.sin(pickup * Math.PI) ** 2 : 0;
      const travel = distance * spinProgress(local) + anticipation;
      const speed = clamp((spinProgress((t - delay + 12) / (end - delay)) - spinProgress((t - delay) / (end - delay))) * (end - delay) / 12);
      if (isRolling) {
        // One continuous strip per reel. Only held cells interrupt its aperture.
        g.save(); g.beginPath();
        for (let row = 0; row < this.mode.rows; row++) {
          if (!(this.locked?.[c]?.[row] > 0)) g.rect(c * cw, row * ch, cw, ch);
        }
        g.clip();
        const whole = Math.floor(travel), fraction = travel - whole;
        for (let row = -1; row <= this.mode.rows; row++) {
          const id = this.stripSymbol(c, row - whole, distance), y = (row + .5 + fraction) * ch;
          const edge = Math.abs(y / h * 2 - 1);
          // The curvature fades with velocity: the last rolling frame must have
          // the same proportions as the first stationary one, including outer rows.
          const stretch = (1 + speed * .27) * (1 - speed * Math.min(.22, Math.max(0, edge - .65) * .35));
          if (speed > .35) this.drawSymbol(id, c, row, y - ch * .16 * speed, .95, .17 * speed, stretch * 1.16);
          this.drawSymbol(id, c, row, y, 1, 1, stretch);
        }
        // Thin traveling reflections, contained to the reel glass.
        for (let j = 0; j < 3; j++) {
          const yy = ((t * (.42 + j * .07) + c * 71 + j * 109) % (h + 90)) - 90;
          g.fillStyle = `rgba(255,244,193,${speed * .24})`;
          g.fillRect((c + .15 + j * .31) * cw, yy, 1.2, ch * .65);
        }
        g.restore();
      } else if (this.phase === 'spin' && !this.reduced && !this.landed.has(c)) {
        this.landed.add(c);
        for (let row = 0; row < this.mode.rows; row++) if (!(this.locked?.[c]?.[row] > 0)) this.burst(c, row, 4);
      }
      for (let r = 0; r < this.mode.rows; r++) {
        const locked = this.locked?.[c]?.[r] > 0;
        if (isRolling && !locked) continue;
        const symbol = this.phase === 'spin' ? (locked ? this.before[c][r] : this.target[c][r]) : this.grid[c]?.[r];
        if (symbol === undefined) continue;
        let y = (r + .5) * ch, scale = 1, alpha = 1, stretch = 1, angle = 0;
        const winning = this.winKeys.has(key(c, r));
        if (this.phase === 'spin' && !this.reduced && !locked) {
          const p = clamp((t - end) / this.motion.land);
          // Zero entry/exit velocity prevents a visible kick after the strip brakes.
          const recoil = spring(p);
          y += recoil * ch * this.motion.recoil;
          stretch = 1 - recoil * .10;
          const rowPulse = clamp((t - end - r * 28) / 180);
          scale *= 1 + .028 * Math.sin(rowPulse * Math.PI) ** 2;
        }
        if (this.phase === 'collapse' && this.removeKeys.has(key(c, r))) {
          const p = this.reduced ? 1 : clamp(t / 300);
          scale = Math.max(0, (1 + .16 * Math.sin(p * Math.PI)) * (1 - p * p));
          alpha = 1 - p * p;
          if (!this.reduced) {
            g.save();g.globalAlpha=Math.sin(p*Math.PI)*.65;g.strokeStyle=`rgb(${this.motion.tint})`;g.lineWidth=2*(1-p)+.4;
            g.beginPath();g.ellipse((c+.5)*cw,(r+.5)*ch,cw*(.17+p*.3),ch*(.17+p*.3),0,0,Math.PI*2);g.stroke();g.restore();
            angle=Math.sin(p*Math.PI)*.12*((c+r)%2?1:-1);
          }
        }
        if (this.phase === 'drop' && !this.reduced) {
          const offset = this.dropOffsets?.[c]?.[r] || 0;
          const p = clamp((t - c * 30) / 460);
          // All cells in a column share a clock, preserving survivor spacing.
          y -= (1 - p) ** 3 * ch * offset;
          if (offset) {
            const landing=spring(clamp((p-.7)/.3));
            y += landing * ch * .018;
            // Stretch during travel, squash only at touchdown; exact rest at both ends.
            stretch=1+Math.sin(p*Math.PI)**2*.09-landing*.055;
          }
        }
        if (winning) {
          const pulse = this.reduced ? 0 : Math.sin((t % 1300) / 1300 * Math.PI) ** 2;
          const active = activeWinKeys.has(key(c, r));
          g.save(); g.fillStyle = `rgba(${this.motion.tint},${active ? .17 + pulse * .07 : .08})`; g.strokeStyle = active ? '#cd8519' : '#c7aa74'; g.lineWidth = active ? 2.2 : 1;
          g.beginPath(); g.roundRect(c * cw + 2, r * ch + 2, cw - 4, ch - 4, Math.min(cw, ch) * .17); g.fill(); g.stroke();
          g.strokeStyle = '#fff9d5'; g.lineWidth = 1;
          g.beginPath(); g.roundRect(c * cw + 4, r * ch + 4, cw - 8, ch - 8, Math.min(cw, ch) * .14); g.stroke(); g.restore();
          const stagger = this.mode.id === 'reef' ? (c + r) * 35 : this.mode.id === 'beacon' ? (c * this.mode.rows + r) * 22 : c * 65;
          const beat = this.reduced ? 1 : clamp((t - stagger) / 720);
          const dance = Math.sin(beat * Math.PI * 3) * (1 - beat);
          scale *= 1.015 + Math.max(0, dance) * .10 + pulse * .018;
          angle = dance * this.motion.dance;
          y -= Math.max(0, dance) * ch * (this.mode.id === 'beacon' ? .018 : .045);
          if (!this.reduced && beat < 1) {
            g.save(); g.globalAlpha = (1 - beat) * .7;
            g.strokeStyle = '#fff2ab'; g.lineWidth = 1.5;
            g.beginPath(); g.ellipse((c + .5) * cw, (r + .5) * ch, cw * (.2 + beat * .26), ch * (.2 + beat * .26), 0, 0, Math.PI * 2); g.stroke(); g.restore();
          }
          if (!this.reduced && active) {
            // Two opposite highlights trace the paying cell's perimeter.
            const inset=5,ww=cw-inset*2,hh=ch-inset*2,perimeter=2*(ww+hh);
            for(let j=0;j<2;j++){
              let d=((t/2400+j*.5+c*.07+r*.04)%1)*perimeter;
              let xx,yy;
              if(d<ww){xx=d;yy=0;}else if((d-=ww)<hh){xx=ww;yy=d;}
              else if((d-=hh)<ww){xx=ww-d;yy=hh;}else{d-=ww;xx=0;yy=hh-d;}
              g.save();g.globalAlpha=.6;g.fillStyle='#fff5b6';g.beginPath();
              g.arc(c*cw+inset+xx,r*ch+inset+yy,1.7,0,Math.PI*2);g.fill();g.restore();
            }
          }
        }
        // A staggered diagonal wave gives every row a visible breathing interval. Each symbol
        // stays inside its own cell; held values and winning choreography take priority.
        if (this.phase === 'idle' && !this.reduced && !this.wins.length && !(this.values?.[c]?.[r] > 0)) {
          const cycle = 5400;
          const local = (t + cycle - c * 260 - r * 1050) % cycle;
          const touching = this.touch?.c === c && this.touch?.r === r && now-this.touch.start < 900;
          if (!touching) {
            const pose = buoyantPose(local / 2400);
            const softness = this.mode.id === 'pearl' ? .8 : 1;
            y -= pose.lift * ch * softness;
            stretch *= 1 + (pose.stretch - 1) * softness;
          }
        }
        if (this.phase === 'idle' && !this.reduced && !winning && !(this.values?.[c]?.[r] > 0) && this.touch?.c === c && this.touch?.r === r) {
          const pose = buoyantPose((now - this.touch.start) / 900);
          y -= pose.lift * ch;
          stretch *= pose.stretch;
        }
        this.drawSymbol(symbol, c, r, y, scale, alpha, stretch, angle);
        const value = this.values?.[c]?.[r];
        if (value > 0) {
          if (!this.labels.has(value)) this.labels.set(value, numberFormats[Number(value >= 10000)].format(value));
          const label = this.labels.get(value);
          g.font = `800 ${Math.max(9, Math.min(14, cw * .23))}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle';
          const tw = Math.min(cw - 4, g.measureText(label).width + 9), height = Math.max(13, ch * .24);
          labelRects.push({x: (c + .5) * cw - tw / 2, y: (r + .78) * ch, w: tw, h: height});
          g.fillStyle = '#fff6d2'; g.beginPath(); g.roundRect((c + .5) * cw - tw / 2, (r + .78) * ch, tw, height, 6); g.fill();
          g.fillStyle = '#63411e'; g.fillText(label, (c + .5) * cw, (r + .78) * ch + height / 2, cw - 8);
        }
      }
    }
    // Reflected glass light, never a dark veil over the symbols or cabinet.
    const glass = g.createLinearGradient(0, 0, w, h);
    glass.addColorStop(0, 'rgba(255,255,248,.14)');
    glass.addColorStop(.28, 'rgba(255,255,248,0)');
    glass.addColorStop(.67, 'rgba(255,255,248,0)');
    glass.addColorStop(.72, 'rgba(255,255,248,.07)');
    glass.addColorStop(.8, 'rgba(255,255,248,0)');
    g.fillStyle = glass; g.fillRect(0, 0, w, h);
    // A slow glint travels only along the glass lip; symbols and labels remain still.
    if (this.phase === 'idle' && !this.wins.length) {
      const center = this.reduced ? w * .5 : (Math.sin(t / 3400 - Math.PI / 2) * .5 + .5) * w;
      const glint = g.createLinearGradient(center - w * .2, 0, center + w * .2, 0);
      glint.addColorStop(0, `rgba(${this.motion.tint},0)`);
      glint.addColorStop(.5, `rgba(${this.motion.tint},.38)`);
      glint.addColorStop(1, `rgba(${this.motion.tint},0)`);
      g.fillStyle = glint; g.fillRect(0, 1, w, 1.5);
    }
    if (this.phase === 'spin' && !this.reduced) {
      for (let c = 0; c < this.mode.cols; c++) {
        const age = t - this.duration - c * this.motion.stop;
        if (age < 0 || age > this.motion.land || this.locked?.[c]?.every(v => v > 0)) continue;
        const p = age / this.motion.land, intensity = Math.sin(p * Math.PI) * (1 - p);
        const light = g.createLinearGradient(c * cw, 0, (c + 1) * cw, 0);
        light.addColorStop(0, 'rgba(255,231,141,0)');
        light.addColorStop(.5, `rgba(${this.motion.tint},${intensity * .28})`);
        light.addColorStop(1, 'rgba(255,231,141,0)');
        g.fillStyle = light;
        for (let r = 0; r < this.mode.rows; r++) {
          if (!(this.locked?.[c]?.[r] > 0)) g.fillRect(c * cw, r * ch, cw, ch);
        }
      }
    }
    if (this.phase === 'spin' && t >= this.duration + (this.reduced ? 0 : (this.mode.cols - 1) * this.motion.stop + this.motion.land)) this.settle(this.target, this.values);
    if (this.phase === 'drop' && (this.reduced || t >= 460 + (this.mode.cols - 1) * 30)) this.phase = 'idle';
    this.particles = this.particles.filter(p => now - p.t < p.life);
    for (const particle of this.particles) {
      const age = Math.max(0, now - particle.t), seconds = age / 1000, fade = 1 - age / particle.life;
      const x = particle.x + particle.vx * seconds, y = particle.y + particle.vy * seconds + 30 * seconds * seconds, radius = particle.size * fade;
      // Sparkles may cross cells, but never pass over a held coin's numeric badge.
      const extent=radius*(particle.star?1.8:1);
      if (labelRects.some(rect => x + extent >= rect.x && x - extent <= rect.x + rect.w && y + extent >= rect.y && y - extent <= rect.y + rect.h)) continue;
      g.globalAlpha = fade * fade; g.fillStyle = particle.color; g.beginPath();
      if (particle.star) {
        // Tiny four-point facets, not a blanket of opaque circles.
        g.moveTo(x,y-radius*1.8);g.lineTo(x+radius*.35,y-radius*.35);
        g.lineTo(x+radius*1.8,y);g.lineTo(x+radius*.35,y+radius*.35);
        g.lineTo(x,y+radius*1.8);g.lineTo(x-radius*.35,y+radius*.35);
        g.lineTo(x-radius*1.8,y);g.lineTo(x-radius*.35,y-radius*.35);g.closePath();
      } else g.arc(x, y, radius, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1; g.restore();
    this.id = requestAnimationFrame(this.frame);
  }

  destroy() {
    this.live = false;
    cancelAnimationFrame(this.id);
    this.resize.disconnect();
    this.canvas.removeEventListener('pointerup', this.pointer);
    this.particles = [];
    this.labels.clear();
    this.sprites=[];
  }
}
