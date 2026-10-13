import { _decorator, Component, EffectAsset, Material, resources, SpriteFrame, Vec4 } from 'cc';
import { Sprite } from 'cc';
const { ccclass } = _decorator;
/** Registered eye patches only. Geometry, source alpha and the rest of the face
 * remain untouched. The upper lid travels over the iris rather than squeezing
 * the face or blending two whole-character poses. */
@ccclass('GuardianEyelids')
export class GuardianEyelids extends Component {
  private static effect?: EffectAsset;
  private static loading?: Promise<void>;
  public static prepare(): Promise<void> {
    if (this.effect) return Promise.resolve();
    return this.loading ??= new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error | null, effect?: EffectAsset): void => {
        if (settled) return; settled = true; clearTimeout(timeout);
        if (error || !effect) { this.loading = undefined; reject(error ?? new Error('Eyelid material unavailable')); }
        else { this.effect = effect; resolve(); }
      };
      const timeout = setTimeout(() => finish(new Error('Eyelid material load timed out')), 15000);
      resources.load('effects/guardian-eyelids', EffectAsset, finish);
    });
  }
  public static attach(mesh: Sprite, texture: SpriteFrame['texture'], theme: number): GuardianEyelids | undefined {
    if (!this.effect) return undefined;
    const c = mesh.node.addComponent(GuardianEyelids);
    c.mesh = mesh;
    c.material = new Material();
    c.material.initialize({ effectAsset: this.effect, defines: { USE_TEXTURE: true } });
    c.material.setProperty('closedEyelids', texture);
    const boxes = [
      [[440,310,503,365],[550,335,613,393]],
      [[385,275,483,378],[558,319,662,429]],
      [[406,263,506,355],[559,311,665,403]],
      [[414,377,504,463],[578,407,664,497]],
    ][theme];
    boxes.forEach(([x,y,right,bottom], i) => c.material!.setProperty('eye'+i,
      new Vec4(x/1024, y/1024, (right-x)/1024, (bottom-y)/1024)));
    c.setClosure(0);
    mesh.customMaterial = c.material;
    return c;
  }
  private mesh?: Sprite;
  private material?: Material;
  private closure = new Vec4();
  public setClosure(value: number): void {
    this.closure.set(value, 0, 0, 0);
    this.material?.setProperty('eyelidState', this.closure);
  }
  protected onDestroy(): void {
    if (this.mesh?.isValid && this.mesh.customMaterial === this.material) this.mesh.customMaterial = null;
    this.material?.destroy(); this.material = undefined; this.mesh = undefined;
  }
}
