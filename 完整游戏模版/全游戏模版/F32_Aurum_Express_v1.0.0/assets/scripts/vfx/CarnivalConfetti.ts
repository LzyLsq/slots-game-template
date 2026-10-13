import { _decorator,Component,Node,UIOpacity } from 'cc';
import { SalonArt } from '../ui/SalonArt';
const {ccclass}=_decorator;
/** A small fixed pool of coin confetti drifts along the safe outer margins. */
@ccclass('CarnivalConfetti')
export class CarnivalConfetti extends Component{
 private elapsed=0;private leaves:{node:Node;alpha:UIOpacity;x:number;phase:number}[]=[];private height=1920;private subtle=false;
 public setup(art:SalonArt,width:number,height:number,reduced:boolean,subtle=false):void{
  this.height=height;this.subtle=subtle;if(reduced)return;
  for(let i=0;i<(subtle?5:12);i++){const x=(i%2?1:-1)*(width/2-42-(i%3)*18),node=art.image(this.node,'f32-casino-symbols',x,0,34+i%3*8,34+i%3*8,0);node.name='Drifting fortune confetti';const alpha=node.addComponent(UIOpacity);alpha.opacity=0;this.leaves.push({node,alpha,x,phase:i/(subtle?5:12)});}
 }
 protected update(dt:number):void{this.elapsed+=Math.min(dt,.1);this.leaves.forEach(({node,alpha,x,phase},i)=>{const p=(this.elapsed/((this.subtle?19:12)+i%3*2)+phase)%1;node.setPosition(x+Math.sin(p*6.283+i)*21,this.height/2-90-p*(this.height-180));node.angle=Math.sin(p*6.283+i)*28+i*31;node.setScale(.62+.35*Math.abs(Math.cos(p*6.283)),1,1);alpha.opacity=Math.min(1,p*7,(1-p)*7)*(this.subtle?68:150);});}
}
