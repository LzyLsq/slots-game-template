import { _decorator, Component, Node, Sprite } from 'cc';
const {ccclass}=_decorator;
export const FORTUNE_PANELS=[{width:560,bottom:839,pivot:[375,524]},{width:530,bottom:921,pivot:[363,532]},{width:480,bottom:961,pivot:[329,560]},{width:540,bottom:933,pivot:[378,602]}] as const;
export const fortuneResources=(id:string):string[]=>[id+'-room-continuous',id+'-guardian-base',id+'-guardian-arm',id+'-guardian-eyelids'];
const ease=(v:number)=>{const x=Math.max(0,Math.min(1,v));return x*x*(3-2*x);};
export const guardianBlink=(t:number,theme:number):number=>{const p=(t+theme*.73)%5.8-2.1;if(p<0||p>=.34)return 0;if(p<.105)return ease(p/.105);if(p<.155)return 1;return 1-ease((p-.155)/.185);};
@ccclass('CabinetGuardian')
export class CabinetGuardian extends Component{
 public reducedMotion=false;public sprite?:Sprite;public clock=0;public gesture=0;
 private hinge?:Node;private theme=0;private watching=false;private cheer=0;private strength=1;private energy=0;private eyelids?:{setClosure(value:number):void};
 public setup(sprite:Sprite,hinge:Node,theme:number,eyelids?:{setClosure(value:number):void}):void{this.sprite=sprite;this.hinge=hinge;this.theme=theme;this.eyelids=eyelids;}
 public anticipate(active:boolean):void{this.watch(active);}public watch(active:boolean):void{this.watching=active;}
 public celebrate(strength=1):void{this.cheer=5.8;this.strength=Math.max(0,Math.min(1,strength));}
 protected update(dt:number):void{
  if(!this.hinge)return;if(!this.reducedMotion)this.clock+=dt;this.cheer=Math.max(0,this.cheer-dt);
  const target=this.reducedMotion?0:this.cheer>0?this.strength:this.watching?.32:0;
  this.energy+=(target-this.energy)*(1-Math.exp(-dt*3));
  const p=((this.clock+this.theme*.63)%6.8)/4.6;
  const beckon=p<1?Math.sin(p*Math.PI*2)*Math.sin(p*Math.PI)**2:0;
  this.gesture=this.reducedMotion?0:beckon*(4.5+this.energy*5)+this.energy*2;
  this.hinge.angle=this.gesture;this.eyelids?.setClosure(this.reducedMotion?0:guardianBlink(this.clock,this.theme));
 }
}
