import { _decorator, Component, EffectAsset, Material, resources, SpriteFrame, Vec4 } from 'cc';
import { GuardianMesh } from './GuardianMesh';
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
  public static attach(mesh: GuardianMesh, texture: SpriteFrame['texture'], theme: number): GuardianEyelids | undefined {
    if (!this.effect) return undefined;
    const c = mesh.node.addComponent(GuardianEyelids);
    c.mesh = mesh;
    c.material = new Material();
    c.material.initialize({ effectAsset: this.effect, defines: { USE_TEXTURE: true } });
    c.material.setProperty('closedEyelids', texture);
    const boxes = [
      [[307,91,376,162],[399,124,477,193]],
      [[299,109,363,172],[397,130,463,197]],
      [[292,113,360,180],[394,135,462,204]],
      [[306,94,362,144],[390,111,445,165]],
    ][theme];
    boxes.forEach(([x,y,right,bottom], i) => c.material!.setProperty('eye'+i,
      new Vec4(x/736, y/448, (right-x)/736, (bottom-y)/448)));
    c.setClosure(0);
    mesh.customMaterial = c.material;
    return c;
  }
  private mesh?: GuardianMesh;
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
