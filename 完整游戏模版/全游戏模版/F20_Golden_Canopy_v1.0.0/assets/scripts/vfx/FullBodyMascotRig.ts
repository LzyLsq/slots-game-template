import { _decorator, Component, Game, game, Node } from 'cc';
import { ArticulatedMascot } from './ArticulatedMascot';
import { FULL_BODY_BONES } from './FullBodyMascotData';
const { ccclass } = _decorator;
@ccclass('FullBodyMascotRig')
export class FullBodyMascotRig extends Component {
  public static supports(name: string): boolean { return !!FULL_BODY_BONES[name]; }
  public static contains(node: Node): boolean {
    return !!node.getComponent(FullBodyMascotRig) || node.children.some(n => this.contains(n));
  }
  private actor?: ArticulatedMascot;
  private time = 0;
  private hidden = false;
  private reduced = false;
  private media?: MediaQueryList;
  private preference = (): void => { this.reduced = !!this.media?.matches; this.actor?.setPose(this.time, this.reduced); };
  protected onLoad(): void {
    this.media = globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.media?.addEventListener?.('change', this.preference); this.preference();
    game.on(Game.EVENT_HIDE, this.hide, this); game.on(Game.EVENT_SHOW, this.show, this);
  }
  public setup(actor: ArticulatedMascot, name: string): void {
    this.actor = actor; actor.setBones(FULL_BODY_BONES[name]); actor.setPose(this.time, this.reduced);
  }
  private hide(): void { this.hidden = true; }
  private show(): void { this.hidden = false; this.preference(); }
  protected update(dt: number): void {
    if (this.hidden || this.reduced) return;
    this.time += Math.min(.08, Math.max(0, dt)); this.actor?.setPose(this.time);
  }
  protected onDestroy(): void {
    game.off(Game.EVENT_HIDE, this.hide, this); game.off(Game.EVENT_SHOW, this.show, this);
    this.media?.removeEventListener?.('change', this.preference); this.actor = undefined;
  }
}
