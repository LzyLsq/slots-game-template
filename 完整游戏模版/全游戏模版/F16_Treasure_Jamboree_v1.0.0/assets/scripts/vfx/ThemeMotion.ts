import { _decorator, Component, EffectAsset, Game, game, Material, resources, Sprite, SpriteFrame, Vec4 } from 'cc';
import { MOTION_REGIONS } from './ThemeMotionRegions';
const { ccclass } = _decorator;

/** Single-sample painted-art motion: no cutout, copied picture or touch surface.
 * All coordinates are local to the authored SpriteFrame, including atlas tiles.
 * Owns its default material. Explicitly compatible shaders may lend their material;
 * the component never replaces or destroys those borrowed materials.
 */
@ccclass('ThemeMotion')
export class ThemeMotion extends Component {
  private static effect?: EffectAsset;
  private static loading?: Promise<void>;
  public static prepare(): Promise<void> {
    return this.loading ??= new Promise(resolve => {
      let settled=false;
      const finish=(error?:unknown,asset?:EffectAsset):void=>{
        if(settled)return;settled=true;clearTimeout(timeout);
        if(error){this.loading=undefined;console.warn('Theme motion unavailable; artwork remains intact.',error);}
        else this.effect=asset;
        resolve();
      };
      // Optional decoration must not indefinitely block artwork or login.
      const timeout=setTimeout(()=>finish(new Error('Theme motion load timeout')),10000);
      try{resources.load('effects/theme-motion',EffectAsset,(error,asset)=>finish(error??undefined,asset));}
      catch(error){finish(error);}
    });
  }
  public static attach(sprite: Sprite, name: string, index = -1): void {
    const regions = MOTION_REGIONS[name+':'+index] ?? MOTION_REGIONS[name];
    if (!regions || !this.effect || sprite.customMaterial || sprite.node.getComponent(ThemeMotion)) return;
    const c = sprite.node.addComponent(ThemeMotion);
    c.setup(sprite, regions, index);
  }
  /** Only call after adding the PaintedMotion uniforms to a known shader. */
  public static attachCompatible(sprite: Sprite, material: Material, name: string, index = -1): void {
    const regions = MOTION_REGIONS[name+':'+index] ?? MOTION_REGIONS[name];
    if (!regions || sprite.customMaterial !== material || sprite.node.getComponent(ThemeMotion)) return;
    sprite.node.addComponent(ThemeMotion).setup(sprite, regions, index, material);
  }
  private sprite?: Sprite;
  private material?: Material;
  private ownsMaterial = true;
  private frame?: SpriteFrame;
  private time = 0;
  private hidden = false;
  private reduced = false;
  private media?: MediaQueryList;
  private clock = new Vec4();
  private frameUV = new Vec4();
  private regions: readonly (readonly number[])[] = [];
  private poses = [new Vec4(),new Vec4(),new Vec4(),new Vec4()];
  private readPreference = (): void => { this.reduced = !!this.media?.matches; this.apply(); };
  protected onLoad(): void {
    this.media = globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.media?.addEventListener?.('change', this.readPreference);
    game.on(Game.EVENT_HIDE, this.hide, this);
    game.on(Game.EVENT_SHOW, this.show, this);
  }
  private setup(sprite: Sprite, regions: readonly (readonly number[])[], index: number, borrowed?: Material): void {
    this.sprite = sprite;
    this.regions = regions;
    this.time = Math.max(0,index) * .73;
    this.ownsMaterial = !borrowed;
    this.material = borrowed ?? new Material();
    if (!borrowed) this.material.initialize({ effectAsset: ThemeMotion.effect!, defines: { USE_TEXTURE: true } });
    for (let i=0;i<4;i++) {
      const r=regions[i] ?? [0,0,0,0,0,0,6,0];
      this.material.setProperty('region'+i,new Vec4(r[0],r[1],r[2],r[3]));
      this.material.setProperty('pose'+i,this.poses[i]);
    }
    sprite.customMaterial = this.material;
    this.readPreference();
  }
  private apply(): void {
    const s=this.sprite,m=this.material,f=s?.spriteFrame;
    if (!s || !m || !f || s.customMaterial!==m) return;
    if (f!==this.frame) {
      this.frame=f;
      const r=f.rect,t=f.texture;
      this.frameUV.set(r.x/t.width,r.y/t.height,r.width/t.width,r.height/t.height);
      m.setProperty('frameUV',this.frameUV);
    }
    this.clock.set(this.time,this.hidden||this.reduced?0:1,f.rect.width/f.rect.height,0);
    m.setProperty('motionClock',this.clock);
    // Trigonometry is per sprite, not four sine/cosine pairs per screen pixel.
    for(let i=0;i<4;i++){
      const r=this.regions[i],pose=this.poses[i];
      if(r){const phase=this.time*2*Math.PI/Math.max(2,r[6])+r[7],a=r[4]*Math.sin(phase);pose.set(Math.sin(a),Math.cos(a)-1,r[5]*Math.sin(phase+.7),0);}
      else pose.set(0,0,0,0);
      m.setProperty('pose'+i,pose);
    }
  }
  private hide(): void { this.hidden=true;this.apply(); }
  private show(): void { this.hidden=false;this.apply(); }
  protected update(dt:number):void {
    if(this.hidden||this.reduced)return;
    this.time+=Math.min(Math.max(dt,0),.05);
    this.apply();
  }
  protected onDestroy():void {
    game.off(Game.EVENT_HIDE,this.hide,this);game.off(Game.EVENT_SHOW,this.show,this);
    this.media?.removeEventListener?.('change',this.readPreference);
    if(this.sprite?.isValid&&this.sprite.customMaterial===this.material){
      if(this.ownsMaterial)this.sprite.customMaterial=null;
      else {this.clock.set(this.time,0,1,0);this.material?.setProperty('motionClock',this.clock);}
    }
    if(this.ownsMaterial)this.material?.destroy();this.material=undefined;this.sprite=undefined;
  }
}
