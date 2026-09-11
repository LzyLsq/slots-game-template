import { _decorator, Component, EffectAsset, Material, Node, Sprite, Vec4 } from 'cc';
const { ccclass } = _decorator;
/** Stationary architecture with animated, gold-selective material lighting. */
@ccclass('StationFloat')
export class StationFloat extends Component {
  private elapsed=0;private material?:Material;private light=new Vec4();
  public setup(sprite:Sprite,effect:EffectAsset,anchors:Node[],reduced:boolean):void{
    if(reduced)return;
    anchors.forEach(n=>n.setPosition(0,0));this.material=new Material();this.material.initialize({effectAsset:effect,defines:{USE_TEXTURE:true}});sprite.customMaterial=this.material;this.apply();
  }
  private apply():void{
    this.light.set(this.elapsed,1,0,0);this.material?.setProperty('stationLight',this.light);
  }
  protected update(dt:number):void{if(!this.material)return;this.elapsed+=Math.min(dt,.1);this.apply();}
  protected onDestroy():void{this.material?.destroy();}
}
