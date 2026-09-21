import { Node, Mask, Sprite, SpriteFrame, Graphics, Color, tween, Vec3, Tween, UIOpacity } from 'cc';
import type { Grid, Mode, Stage } from '../core/Model';
import { ReelTrajectory, type ReelSample } from '../motion/ReelTrajectory';
import { node, image, text } from '../ui/Surface';

interface Column { sprites: Sprite[]; trajectory: ReelTrajectory; sample: ReelSample; stopped: boolean }
/** Fixed-size reel pool. No nodes, vectors or outcome arrays are allocated in tick(). */
export class ReelView {
  readonly root: Node;
  private readonly columns: Column[] = [];
  private readonly overlays: Node;
  private readonly symbolIndex = new Map<string, number>();
  private grid: Grid;
  private elapsed = 0;
  private spinning = false;
  private idleClock = 0;
  private idleActive = false;
  private readonly cw: number;
  private readonly ch: number;
  private target: Grid;
  constructor(parent: Node, private readonly mode: Mode, private readonly frames: SpriteFrame[],
    x: number, y: number, private readonly width: number, private readonly height: number,
    private readonly onStop: (column: number) => void) {
    this.root = node(parent, 'Reel aperture', x, y, width, height);
    this.root.addComponent(Mask).type = Mask.Type.GRAPHICS_RECT;
    mode.symbols.forEach((s, i) => this.symbolIndex.set(s.id, i));
    this.cw = width / mode.columns; this.ch = height / mode.rows;
    this.grid = Array.from({ length: mode.columns }, (_, c) => Array.from({ length: mode.rows }, (_, r) => mode.symbols[(c + r * 2) % 6]!.id));
    this.target = this.grid;
    for (let c = 0; c < mode.columns; c++) {
      const sprites: Sprite[] = [];
      for (let r = -2; r < mode.rows + 2; r++) {
        const n = image(this.root, frames[0]!, -width / 2 + (c + .5) * this.cw, 0, Math.min(this.cw, this.ch) * .89, Math.min(this.cw, this.ch) * .89, 'Reel symbol');
        sprites.push(n.getComponent(Sprite)!);
      }
      this.columns.push({ sprites, trajectory: new ReelTrajectory(c), sample: { offset: 0, velocity: 0, phase: 'complete' }, stopped: true });
    }
    this.overlays = node(this.root, 'Winning positions'); this.show(this.grid);
  }
  start(target: Grid, turbo: boolean): void {
    this.clearHighlights(); this.resetIdlePose(); this.target = target; this.elapsed = 0; this.spinning = true;
    for (let c = 0; c < this.columns.length; c++) {
      const col = this.columns[c]!; col.trajectory = new ReelTrajectory(c, turbo); col.stopped = false;
    }
  }
  tick(dt: number): boolean {
    if (!this.spinning) return false;
    this.elapsed += dt; let done = true;
    for (let c = 0; c < this.columns.length; c++) {
      const col = this.columns[c]!; col.trajectory.sample(this.elapsed, col.sample);
      this.drawColumn(c, col.sample.offset, col.trajectory.target);
      if (col.sample.phase !== 'complete') done = false;
      else if (!col.stopped) { col.stopped = true; this.onStop(c); }
    }
    if (done) { this.spinning = false; this.grid = this.target; this.show(this.grid); }
    return done;
  }
  /**
   * Low-amplitude, asynchronous symbol motion keeps a stopped cabinet alive.
   * The four mechanics use distinct physical character; transforms only are
   * changed so the hot path remains allocation-free and atlas batching stays intact.
   */
  tickIdle(dt: number, enabled: boolean): void {
    if (this.spinning || !enabled) {
      if (this.idleActive) this.resetIdlePose();
      return;
    }
    this.idleActive = true; this.idleClock += dt;
    const character = this.mode.id === 'captain' ? 0 : this.mode.id === 'pearl' ? 1 : this.mode.id === 'cargo' ? 2 : 3;
    const speed = [1.08, .82, .68, .94][character]!;
    const lift = [3.2, 5.8, 2.2, 5.0][character]!;
    const turn = [1.9, .75, .45, 1.7][character]!;
    for (let c = 0; c < this.mode.columns; c++) for (let r = 0; r < this.mode.rows; r++) {
      const sprite = this.columns[c]!.sprites[r + 2]!;
      const phase = c * 1.73 + r * .97;
      const wave = Math.sin(this.idleClock * speed + phase);
      // A narrow crest gives one or two symbols a jewel-like pulse while the
      // rest remain quiet. It avoids the cheap "everything breathes together" look.
      const crest = Math.pow(Math.max(0, Math.sin(this.idleClock * .46 + phase * 1.41)), 9);
      const baseX = -this.width / 2 + (c + .5) * this.cw;
      const baseY = this.height / 2 - (r + .5) * this.ch;
      const driftX = character === 2 ? 0 : Math.cos(this.idleClock * speed * .72 + phase) * lift * .22;
      const driftY = character === 2 ? crest * 3.2 : wave * lift;
      const pulse = 1 + crest * (character === 2 ? .042 : .034) + wave * .007;
      sprite.node.setPosition(baseX + driftX, baseY + driftY);
      sprite.node.setScale(pulse, pulse, 1);
      sprite.node.setRotationFromEuler(0, 0, character === 1 ? wave * turn * .35 : wave * turn);
    }
  }
  private resetIdlePose(): void {
    this.idleActive = false;
    for (let c = 0; c < this.mode.columns; c++) for (let r = 0; r < this.mode.rows; r++) {
      const n = this.columns[c]!.sprites[r + 2]!.node;
      n.setPosition(-this.width / 2 + (c + .5) * this.cw, this.height / 2 - (r + .5) * this.ch);
      n.setScale(1, 1, 1); n.setRotationFromEuler(0, 0, 0);
    }
  }
  private drawColumn(c: number, offset: number, targetOffset: number): void {
    const whole = Math.floor(offset), fraction = offset - whole, col = this.columns[c]!;
    for (let i = 0; i < col.sprites.length; i++) {
      const r = i - 2, landingRow = r - whole + targetOffset;
      let index = ((r - whole + c * 3) % 6 + 6) % 6;
      if (landingRow >= 0 && landingRow < this.mode.rows) index = this.symbolIndex.get(this.target[c]![landingRow]!) ?? 0;
      else if (whole === 0 && r >= 0 && r < this.mode.rows) index = this.symbolIndex.get(this.grid[c]![r]!) ?? 0;
      const sprite = col.sprites[i]!, frame = this.frames[Math.max(0, index)]!;
      if (sprite.spriteFrame !== frame) sprite.spriteFrame = frame;
      sprite.node.setPosition(-this.width / 2 + (c + .5) * this.cw, this.height / 2 - (r + .5 + fraction) * this.ch);
    }
  }
  show(grid: Grid): void { this.grid = grid; this.target = grid; this.idleActive = false; for (let c = 0; c < this.columns.length; c++) this.drawColumn(c, 0, 0); }
  /** Cascades preserve the origin of surviving symbols; cargo only animates unlocked cells. */
  transition(previous: Stage, next: Stage, reduced: boolean, complete: () => void): void {
    this.clearHighlights();
    if (reduced) { this.show(next.grid); complete(); return; }
    this.show(next.grid);
    let latest = .05;
    for (let c = 0; c < this.mode.columns; c++) {
      const removed = new Set(previous.removed.filter(p => p.column === c).map(p => p.row));
      const survivors = Array.from({length: this.mode.rows}, (_, r) => r).filter(r => !removed.has(r));
      const fresh = this.mode.rows - survivors.length;
      for (let r = 0; r < this.mode.rows; r++) {
        const n = this.columns[c]!.sprites[r + 2]!.node;
        const finish = n.position.clone();
        const delay = c * .035;
        if (this.mode.mechanic === 'cluster') {
          const sourceRow = r < fresh ? r - fresh - .4 : survivors[r - fresh]!;
          n.setPosition(finish.x, this.height / 2 - (sourceRow + .5) * this.ch);
          tween(n).delay(delay).to(.43, {position: finish}, {easing:'bounceOut'}).start();
          latest = Math.max(latest, delay + .45);
        } else if (!previous.cargoValues?.[c]?.[r]) {
          const opacity = n.getComponent(UIOpacity) || n.addComponent(UIOpacity);
          opacity.opacity = 55; n.setPosition(finish.x, finish.y + this.ch * .32);
          tween(opacity).delay(delay).to(.38, {opacity:255}, {easing:'sineOut'}).start();
          tween(n).delay(delay).to(.38, {position:finish}, {easing:'backOut'}).start();
          latest = Math.max(latest, delay + .40);
        }
      }
    }
    tween(this.overlays).delay(latest).call(complete).start();
  }
  clearHighlights(): void {
    Tween.stopAllByTarget(this.overlays);
    this.overlays.destroyAllChildren();
    for (const c of this.columns) for (const s of c.sprites) {
      Tween.stopAllByTarget(s.node); s.node.setScale(1, 1, 1); s.node.setRotationFromEuler(0, 0, 0); s.color = Color.WHITE;
      const opacity = s.node.getComponent(UIOpacity); if (opacity) { Tween.stopAllByTarget(opacity); opacity.opacity = 255; }
    }
  }
  highlight(stage: Stage, reduced: boolean): void {
    this.clearHighlights(); const cells = new Set(stage.awards.flatMap(a => a.cells.map(c => `${c.column}:${c.row}`)));
    for (let c = 0; c < this.mode.columns; c++) for (let r = 0; r < this.mode.rows; r++) {
      const sprite = this.columns[c]!.sprites[r + 2]!;
      if (cells.size && !cells.has(`${c}:${r}`)) sprite.color = new Color(177, 164, 135);
      if (cells.has(`${c}:${r}`)) {
        const halo = node(this.overlays, 'Award cell', -this.width / 2 + (c + .5) * this.cw, this.height / 2 - (r + .5) * this.ch);
        const g = halo.addComponent(Graphics); g.lineWidth = 4; g.strokeColor = new Color(241, 159, 30); g.fillColor = new Color(255, 224, 112, 36);
        g.roundRect(-this.cw * .47, -this.ch * .46, this.cw * .94, this.ch * .92, 12); g.fill(); g.stroke();
        if (!reduced) tween(sprite.node).to(.15, { scale: new Vec3(1.09, 1.09, 1) }, { easing: 'backOut' }).to(.23, { scale: Vec3.ONE }, { easing: 'sineOut' }).start();
      }
      const value = stage.cargoValues?.[c]?.[r];
      if (value) {
        const badge = node(this.overlays, 'Locked coin value', -this.width / 2 + (c + .5) * this.cw, this.height / 2 - (r + .77) * this.ch);
        const plate = badge.addComponent(Graphics); plate.fillColor = new Color(72, 46, 20, 240);
        plate.roundRect(-38, -21, 76, 42, 12); plate.fill();
        text(badge, `×${value}`, 0, 0, 72, 36, Color.WHITE, 42);
      }
    }
    if (stage.awards.some(a => a.kind === 'line')) {
      const g = node(this.overlays, 'Paylines').addComponent(Graphics); g.lineWidth = 3; g.strokeColor = new Color(227, 129, 24, 190);
      for (const a of stage.awards) { if (a.kind !== 'line') continue;
        for (let i = 0; i < a.cells.length; i++) { const p = a.cells[i]!; const x = -this.width / 2 + (p.column + .5) * this.cw, y = this.height / 2 - (p.row + .5) * this.ch; if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke();
      }
    }
  }
}
