import {_decorator,Component,Node,UIOpacity,UITransform,Vec3} from 'cc';
import type {GameConfig} from '../math/types';
import {FoundryArt,box,opacity} from '../ui/FoundryArt';
const {ccclass}=_decorator;
interface GuideSprite{node:Node;alpha:UIOpacity;}
/** Generated-image rule guide. No runtime vector art is used. */
@ccclass('CoreReelGuide')
export class CoreReelGuide extends Component{
 private c!:GameConfig;private w=0;private h=0;private cw=0;private ch=0;private points:number[][]=[];
 private dots:GuideSprite[]=[];private shades:GuideSprite[]=[];private markers:GuideSprite[]=[];private beams:GuideSprite[]=[];
 private t=0;private age=99;private hasAward=false;
 public busy=false;public reduced=false;
 public selectedPositions:readonly number[]=[];public dimmedPositions:readonly number[]=[];
 private xy(p:number):number[]{return[-this.w/2+(Math.floor(p/this.c.rows)+.5)*this.cw,this.h/2-(p%this.c.rows+.5)*this.ch];}
 public setup(art:FoundryArt,c:GameConfig,w:number,h:number):void{
  this.c=c;this.w=w;this.h=h;this.cw=w/c.columns;this.ch=h/c.rows;
  this.points=[[-w*.485,h*.485],[w*.485,h*.485],[w*.485,-h*.485],[-w*.485,-h*.485],[-w*.485,h*.485]];
  for(let i=0;i<2;i++){
   const node=art.image(this.node,'foundry-ui-components',0,0,30,30,13);node.name='Generated material guide light';
   this.dots.push({node,alpha:opacity(node,0)});
  }
  const total=c.columns*c.rows;
  for(let p=0;p<total;p++){
   const [x,y]=this.xy(p);
   const shade=art.stretch(this.node,'foundry-ui-components',x,y,this.cw*.98,this.ch*.98,15,true);shade.name='Generated unawarded cell shade';
   const marker=art.image(this.node,'foundry-ui-components',x,y,Math.min(this.cw,this.ch)*.91,Math.min(this.cw,this.ch)*.91,13);marker.name='Generated winning cell light';
   this.shades.push({node:shade,alpha:opacity(shade,0)});this.markers.push({node:marker,alpha:opacity(marker,0)});
  }
  for(let i=0;i<Math.max(1,total*2);i++){
   const beam=art.stretch(this.node,'foundry-ui-components',0,0,100,18,14,true);beam.name='Generated winning energy beam';
   this.beams.push({node:beam,alpha:opacity(beam,0)});
  }
 }
 private setBeam(index:number,a:number,b:number):void{
  const beam=this.beams[index];if(!beam)return;const [ax,ay]=this.xy(a),[bx,by]=this.xy(b),dx=bx-ax,dy=by-ay,length=Math.hypot(dx,dy);
  beam.node.setPosition((ax+bx)/2,(ay+by)/2);beam.node.angle=Math.atan2(dy,dx)*180/Math.PI;
  beam.node.getComponent(UITransform)?.setContentSize(length+18,Math.max(12,Math.min(this.cw,this.ch)*.085));beam.alpha.opacity=215;
 }
 /** Keep awarded cells readable until a new board explicitly clears them. */
 public highlight(ps:readonly number[]):void{
  this.age=0;const total=this.c.columns*this.c.rows;
  const unique=Array.from(new Set(ps)).filter(p=>Number.isInteger(p)&&p>=0&&p<total);
  this.selectedPositions=unique;this.dimmedPositions=unique.length?Array.from({length:total},(_,p)=>p).filter(p=>!unique.includes(p)):[];
  this.hasAward=unique.length>0;const selected=new Set(unique);
  for(let p=0;p<total;p++){
   this.shades[p].alpha.opacity=this.hasAward&&!selected.has(p)?88:0;
   this.markers[p].alpha.opacity=selected.has(p)?225:0;
   this.markers[p].node.setScale(.82,.82,1);
  }
  this.beams.forEach(beam=>beam.alpha.opacity=0);
  if(!unique.length)return;
  let cursor=0;const kind=this.c.primaryKind;
  if(kind==='cluster-avalanche'){
   for(const p of unique){const column=Math.floor(p/this.c.rows),row=p%this.c.rows;if(column+1<this.c.columns&&selected.has(p+this.c.rows))this.setBeam(cursor++,p,p+this.c.rows);if(row+1<this.c.rows&&selected.has(p+1))this.setBeam(cursor++,p,p+1);}
  }else if(kind!=='scatter-groups'&&kind!=='collector-grid'){
   for(let i=1;i<unique.length;i++)this.setBeam(cursor++,unique[i-1],unique[i]);
  }
 }
 protected update(dt:number):void{
  this.t+=Math.min(dt,.1);this.age+=Math.min(dt,.1);const enter=this.reduced?1:Math.min(1,this.age/.16),pulse=this.reduced?1:.92+Math.sin(this.age*2.4)*.08;
  for(let p=0;p<this.markers.length;p++)if(this.markers[p].alpha.opacity){this.markers[p].alpha.opacity=225*enter;this.markers[p].node.setScale(.82*pulse,.82*pulse,1);}
  for(const beam of this.beams)if(beam.alpha.opacity)beam.alpha.opacity=215*enter;
  for(let i=0;i<this.dots.length;i++){
   const dot=this.dots[i];dot.alpha.opacity=this.busy||this.reduced?0:110+Math.sin(this.t*1.8+i)*55;
   if(this.points.length<2)continue;const phase=(this.t*.22+i*.6)%(this.points.length-1),index=Math.floor(phase),u=phase-index,a=this.points[index],b=this.points[index+1];
   let x=a[0]+(b[0]-a[0])*u,y=a[1]+(b[1]-a[1])*u;if(this.c.coreMode==='jubilee-mirror'&&i)x=-x;dot.node.setPosition(new Vec3(x,y,0));
  }
 }
}
