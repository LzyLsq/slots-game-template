import { _decorator,Component,Node,UIOpacity } from 'cc';
import {SalonArt} from '../ui/SalonArt';
const {ccclass}=_decorator;
/** Coins follow one localized fountain stream; architecture never deforms. */
@ccclass('TreasuryAmbience')
export class TreasuryAmbience extends Component{
 private burstAge=2;private burstCoins:{node:Node;alpha:UIOpacity}[]=[];
 private elapsed=0;private coins:{node:Node;alpha:UIOpacity;phase:number}[]=[];private reduced=false;
 private glints:{node:Node;alpha:UIOpacity;phase:number}[]=[];
 public setup(art:SalonArt,reduced:boolean):void{
  this.reduced=reduced;if(reduced)return;
  for(let i=0;i<16;i++){const node=art.image(this.node,'symbols',0,0,22+i%3*3,22+i%3*3,0);node.name='Fountain coin';const alpha=node.addComponent(UIOpacity);alpha.opacity=0;this.coins.push({node,alpha,phase:i/16});}
  for(let i=0;i<12;i++){const node=art.image(this.node,'symbols',0,-320,30,30,0);node.name='Interactive fountain coin';const alpha=node.addComponent(UIOpacity);alpha.opacity=0;this.burstCoins.push({node,alpha});}
  for(let i=0;i<10;i++){const node=art.light(this.node,3,Math.sin(i*2.4)*105,-335+(i%3)*13,28+i%3*8,28+i%3*8,0);node.name='Fountain landing glint';this.glints.push({node,alpha:node.getComponent(UIOpacity)!,phase:i/10});}
 }
 public burst():boolean{if(this.reduced||this.burstAge<1.25)return false;this.burstAge=0;return true;}
 protected update(dt:number):void{
  if(this.reduced)return;this.elapsed+=Math.min(dt,.1);this.burstAge+=Math.min(dt,.1);
  this.burstCoins.forEach(({node,alpha},i)=>{const t=Math.max(0,Math.min(1,(this.burstAge-i*.018)/1.05)),side=i%2?1:-1;
   node.setPosition(side*(35+i%6*12)*t,-320+4*(140+i%4*18)*t*(1-t));node.setScale(.3+.7*Math.abs(Math.cos(t*9+i)),1,1);node.angle=side*t*150;
   alpha.opacity=t<=0||t>=1?0:Math.min(1,t*12,(1-t)*7)*225;
  });
  this.glints.forEach(({node,alpha,phase},i)=>{const t=(this.elapsed/2.9+phase)%1,pulse=Math.pow(Math.sin(t*Math.PI),10);alpha.opacity=pulse*210;node.setScale(.65+pulse*.55,.65+pulse*.55,1);node.angle=i*29+t*32;});
  this.coins.forEach(({node,alpha,phase},i)=>{const t=(this.elapsed/3.8+phase)%1;node.setPosition(Math.sin(i*2.4)*32*t,270-620*t*t);node.setScale(.4+.6*Math.abs(Math.cos(t*7+i)),1,1);node.angle=t*120;alpha.opacity=Math.min(1,t*8,(1-t)*6)*195;});
 }
}
