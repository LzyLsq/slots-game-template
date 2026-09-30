import { _decorator,Component,Node,UIOpacity } from 'cc';
import { SalonArt } from '../ui/SalonArt';
const {ccclass}=_decorator;
/** A small fixed pool of leaves drifts down the outer branches, clear of text. */
@ccclass('CanopyLeaves')
export class CanopyLeaves extends Component{
 private elapsed=0;private leaves:{node:Node;alpha:UIOpacity;x:number;phase:number;star:boolean}[]=[];private height=1920;private festive=false;
 public setup(art:SalonArt,width:number,height:number,reduced:boolean,festive=false):void{
  this.height=height;this.festive=festive;if(reduced)return;
  const count=festive?18:12;
  for(let i=0;i<count;i++){
   const x=(i%2?1:-1)*(width/2-(festive?68:42)-(i%3)*(festive?29:18)),star=festive&&i%3===2,size=star?62:festive?60+i%3*10:34+i%3*8;
   const node=star?art.light(this.node,3,x,0,size,size,0):art.image(this.node,'symbols',x,0,size,size,15);
   node.name=star?'Canopy white-gold twinkle':'Drifting gold leaf';const alpha=node.getComponent(UIOpacity)??node.addComponent(UIOpacity);alpha.opacity=0;
   this.leaves.push({node,alpha,x,phase:i/count,star});
  }
 }
 protected update(dt:number):void{this.elapsed+=Math.min(dt,.1);this.leaves.forEach(({node,alpha,x,phase,star},i)=>{
  const p=(this.elapsed/((this.festive?7.2:12)+i%3*2)+phase)%1;
  node.setPosition(x+Math.sin(p*6.283+i)*(this.festive?37:21),this.height/2-90-p*(this.height-180));node.angle=Math.sin(p*6.283+i)*(this.festive?42:28)+i*31;
  const pulse=star?.65+.35*Math.sin(this.elapsed*3+phase*6.283)**2:1;
  node.setScale(star?pulse:.62+.35*Math.abs(Math.cos(p*6.283)),pulse,1);
  alpha.opacity=Math.min(1,p*7,(1-p)*7)*(this.festive?star?240:222:150);
 });}
}
