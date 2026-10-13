import {_decorator,Component,Node,Graphics,Color,UIOpacity} from 'cc';
import type {GameConfig} from '../math/types';
import {box,opacity,SalonArt} from '../ui/SalonArt';
const {ccclass}=_decorator;
/** Pool the guide nodes once. Idle motion follows the actual evaluation geometry. */
@ccclass('CoreReelGuide')
export class CoreReelGuide extends Component{
 private c!:GameConfig;private w=0;private h=0;private cw=0;private ch=0;private points:number[][]=[];private dots:Node[]=[];private frames:{node:Node;alpha:UIOpacity;visible:boolean}[]=[];private shade!:Graphics;private shadeAlpha!:UIOpacity;private t=0;private age=99;private hasAward=false;
 public busy=false;public reduced=false;
 public selectedPositions:readonly number[]=[];public dimmedPositions:readonly number[]=[];
 private xy(p:number):number[]{return[-this.w/2+(Math.floor(p/this.c.rows)+.5)*this.cw,this.h/2-(p%this.c.rows+.5)*this.ch];}
 public setup(c:GameConfig,w:number,h:number,art:SalonArt):void{
  this.c=c;this.w=w;this.h=h;this.cw=w/c.columns;this.ch=h/c.rows;
  const mode=c.coreMode;
  // A quiet rim reflection is decorative; only winning cells carry rule highlights.
  // Do not imply that a centre-line, diagonal or perimeter is a paying path.
  this.points=[[-w*.485,h*.485],[w*.485,h*.485],[w*.485,-h*.485],[-w*.485,-h*.485],[-w*.485,h*.485]];
  const colors:Record<string,string>={'harvest-columns':'#EDD480','cloud-orbit':'#CCEFFF','parade-blocks':'#FFD68D','caravan-route':'#F9D692','railway-rows':'#CFEAEE','vault-count':'#F4D27E','garden-patches':'#B9EDB2','jubilee-mirror':'#FBE1BE','fortune-ladder':'#FDE2A2','lamp-recipes':'#E6C1FC'};
  const tint=colors[mode??'']??'#FBE5AD';
  for(let i=0;i<2;i++){const node=box(this.node,'Material guide light',0,0,30,30),g=node.addComponent(Graphics);g.fillColor=new Color(tint);g.circle(0,0,3.5-i);g.fill();g.strokeColor=new Color(tint);g.lineWidth=1.3;g.circle(0,0,10);g.stroke();opacity(node,0);this.dots.push(node);}
  const shade=box(this.node.parent??this.node,'Unawarded cells shade',0,0,w,h);this.shade=shade.addComponent(Graphics);this.shadeAlpha=opacity(shade,0);
  const style=['golden-strings','sapphire-harp','ruby-brass','pearl-rhythm'].indexOf(c.id);
  for(let p=0;p<c.columns*c.rows;p++){
   const [x,y]=this.xy(p),node=art.image(this.node,'win-frame-'+Math.max(0,style),x,y,this.cw*.91,this.ch*.91);
   this.frames.push({node,alpha:opacity(node,0),visible:false});
  }
 }
 /** Keep the awarded cells readable until a new board explicitly clears them. */
 public highlight(ps:readonly number[]):void{
  this.shade.clear();this.age=0;
  const unique=Array.from(new Set(ps)).filter(p=>Number.isInteger(p)&&p>=0&&p<this.c.columns*this.c.rows);
  this.selectedPositions=unique;
  this.dimmedPositions=unique.length?Array.from({length:this.c.columns*this.c.rows},(_,p)=>p).filter(p=>!unique.includes(p)):[];
  // Shade reel art underneath the locked-treasure overlay, preserving its amount labels.
  const host=this.node.parent,shadeNode=this.shade.node;
  if(host&&shadeNode.parent===host){
   const before=host.children.find(n=>n.name==='Locked treasure')??this.node;
   const index=before.getSiblingIndex()-(shadeNode.getSiblingIndex()<before.getSiblingIndex()?1:0);
   shadeNode.setSiblingIndex(Math.max(0,index));
  }
  this.hasAward=unique.length>0;this.shadeAlpha.opacity=0;
  const chosen=new Set(unique);for(let p=0;p<this.frames.length;p++)this.frames[p].visible=chosen.has(p);
  if(!unique.length)return;
  // One subdued unawarded region, with exact holes for actual winning cells.
  // No selected symbol is dimmed, no per-cell card borders or invented payline.
  this.shade.fillColor=new Color(18,13,20,86);
  for(const p of this.dimmedPositions){
   const [x,y]=this.xy(p);this.shade.rect(x-this.cw/2,y-this.ch/2,this.cw,this.ch);
  }
  this.shade.fill();

 }
 protected onDestroy():void{
  // The shade is a sibling so locked amounts remain above it; release that pooled node too.
  // The shade is a sibling and may have been destroyed earlier in the
  // parent's teardown. Cocos clears Component.node during that destruction.
  const shadeNode=this.shade?.node;
  if(shadeNode?.isValid&&shadeNode.parent!==this.node)shadeNode.destroy();
 }
 protected update(dt:number):void{
  this.t+=Math.min(dt,.1);this.age+=Math.min(dt,.1);
  const enter=this.reduced?1:Math.min(1,this.age/.18);
  this.shadeAlpha.opacity=this.hasAward?255*enter*enter*(3-2*enter):0;
  for(let p=0;p<this.frames.length;p++){
   const frame=this.frames[p],target=frame.visible?(this.reduced?220:196+Math.sin(this.t*2.4+p*.48)*14):0;
   frame.alpha.opacity=this.reduced?target:frame.alpha.opacity+(target-frame.alpha.opacity)*Math.min(1,dt*(frame.visible?11:17));
   const size=frame.visible&&!this.reduced?1+Math.sin(this.t*2.4+p*.48)*.006:1;
   frame.node.setScale(size,size,1);
  }
  for(let i=0;i<this.dots.length;i++){const node=this.dots[i];node.getComponent(UIOpacity)!.opacity=this.busy||this.reduced?0:110+Math.sin(this.t*1.8+i)*55;if(this.points.length<2)continue;const phase=(this.t*.22+i*.6)%(this.points.length-1),index=Math.floor(phase),u=phase-index,a=this.points[index],b=this.points[index+1];let x=a[0]+(b[0]-a[0])*u,y=a[1]+(b[1]-a[1])*u;if(this.c.coreMode==='jubilee-mirror'&&i)x=-x;node.setPosition(x,y);}
 }
}
