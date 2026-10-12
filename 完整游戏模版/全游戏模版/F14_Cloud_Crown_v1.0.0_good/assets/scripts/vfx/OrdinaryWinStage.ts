import {rewardInk,rewardOutline,rewardTextWidth} from '../ui/RewardArtwork';
import {_decorator,Component,Label,Node,UIOpacity} from 'cc';
import {SalonArt,box,COLORS,opacity,text} from '../ui/SalonArt';
import {language} from '../ui/Language';
const {ccclass}=_decorator;

export interface OrdinaryWinPlacement { readonly y?:number; readonly width?:number; readonly theme?:number; readonly feedback?:(progress:number)=>void; }
const LOCALES=['en','zh-CN','zh-TW','ja','ko'] as const;
const COPY={
 award:['COINS AWARDED','获得金币','獲得金幣','獲得コイン','획득 코인'],
 partial:['PARTIAL RETURN','部分返还','部分返還','一部払い戻し','일부 반환'],
 even:['BET RETURNED','下注返还','下注返還','ベット返還','베팅금 반환'],
 win:['ROUND WIN','本局中奖','本局中獎','今回の獲得','이번 회차 당첨'],
} as const;

/** Compact paid-result feedback. Caller settles first, hides the underlying hint,
 * and anchors this stage OUTSIDE the reel aperture; no input blocker or veil.
 * setup(art, credits, height, reduced, chargedBet, {y: hintY, width:980}).
 * Resolves after 1.85s, or immediately on destruction. Never labels a loss a win.
 */
@ccclass('OrdinaryWinStage')
export class OrdinaryWinStage extends Component {
 private amount=0;private elapsed=0;private reduced=false;private finished=true;
 private group?:Node;private alpha?:UIOpacity;private count?:Label;private gleam?:Node;private spark?:Node;private spark2?:Node;private spark3?:Node;private spark4?:Node;private spark5?:Node;
 private burst?:Node;private burstAlpha?:UIOpacity;private halo?:Node;private haloAlpha?:UIOpacity;
 private feedback?:(progress:number)=>void;private done?:()=>void;private locale='en-US';private width=980;private displayed=-1;private baseY=0;
 private mosaic(art:SalonArt,parent:Node,name:string,frames:readonly number[],w:number,h:number,alpha:number):Node{
  const group=box(parent,name,0,0,w,h),cw=w/2,ch=h/2;
  frames.forEach((frame,index)=>art.light(group,frame,(index%2-.5)*cw,(.5-Math.floor(index/2))*ch,cw,ch,alpha));
  return group;
 }
 public setup(art:SalonArt,amount:number,height:number,reduced:boolean,bet=0,placement:OrdinaryWinPlacement={}):Promise<void>{
  this.complete();
  if(!Number.isFinite(amount)||amount<=0)return Promise.resolve();
  this.amount=amount;this.feedback=placement.feedback;
  if(this.amount===0)return Promise.resolve();
  const stake=Number.isFinite(bet)?Math.max(0,bet):0;
  const lang=language(),i=Math.max(0,LOCALES.indexOf(lang));this.locale=lang==='en'?'en-US':lang;
  const phrase=(key:keyof typeof COPY)=>COPY[key][i];
  this.width=Math.max(320,Math.min(980,Number.isFinite(placement.width)?placement.width!:980));
  const viewport=Number.isFinite(height)?Math.max(160,height):1920;
  // Default is the bottom hint strip, never the toolbar or the reel aperture.
  this.baseY=Number.isFinite(placement.y)?placement.y!:-viewport/2+88;
  this.elapsed=0;this.displayed=-1;this.reduced=reduced;this.finished=false;
  this.group=box(this.node,'Ordinary award · hint area',0,this.baseY,this.width,160);
  const theme=placement.theme??0;
  const plate=art.rewardPanel(this.group,0,0,this.width,160,theme,'compact');
  // Reassemble the existing optics atlas as layered cc.Sprite mosaics. This
  // gives small awards a premium halo without loading another large texture.
  this.burst=this.mosaic(art,plate,'Small-win radial burst',[0,1,4,5],Math.min(this.width*.5,470),154,255);
  this.halo=this.mosaic(art,plate,'Small-win orbit halo',[2,3,6,7],Math.min(this.width*.68,620),146,255);
  this.burstAlpha=opacity(this.burst,reduced?72:0);this.haloAlpha=opacity(this.halo,reduced?92:0);
  // Reflection stays within the plate's inner rim; text is drawn on top.
  this.gleam=art.light(plate,1,-this.width*.22,0,this.width*.35,108,0);
  this.spark=art.light(plate,0,this.width*.39,0,66,66,0);
  this.spark2=art.light(plate,0,-this.width*.39,4,52,52,0);
  this.spark3=art.light(plate,0,this.width*.05,18,42,42,0);
  this.spark4=art.light(plate,10,-this.width*.29,-32,74,42,reduced?48:0);
  this.spark5=art.light(plate,15,this.width*.28,35,66,38,reduced?44:0);
  const title=stake===0?'award':this.amount<stake?'partial':this.amount===stake?'even':'win';
  const titleLabel=text(plate,phrase(title),0,34,rewardTextWidth(this.width),48,40,rewardInk(theme),true);
  this.count=text(plate,'0',0,-22,rewardTextWidth(this.width),73,60,rewardInk(theme));
  // Two generous lines keep translated titles and exact amounts readable on phones.
  for(const label of [titleLabel,this.count]){label.enableWrapText=false;label.overflow=Label.Overflow.SHRINK;}
  this.alpha=opacity(this.group,reduced?255:0);
  this.group.setScale(reduced?1:.965,reduced?1:.965,1);
  this.setCount(reduced?this.amount:0);
  return new Promise<void>(resolve=>{this.done=resolve;});
 }
 private format(value:number):string{return value.toLocaleString(this.locale,{maximumFractionDigits:3});}
 private setCount(value:number):void{if(this.count&&value!==this.displayed){this.displayed=value;this.count.string=this.format(value);if(!this.reduced&&value>0&&value<this.amount)this.feedback?.(value/this.amount);}}
 protected update(dt:number):void{
  if(this.finished||!this.group||!this.alpha)return;
  this.elapsed+=Number.isFinite(dt)?Math.max(0,dt):0;
  const t=this.elapsed;
  if(!this.reduced){
   const p=Math.min(1,t/.34),q=p-1,settle=1+2.2*q*q*q+1.2*q*q;
   const pulse=t>.34?1+Math.sin(Math.min(1,(t-.34)/1.25)*Math.PI)*.018:1;
   const scale=(.965+.035*settle)*pulse;this.group.setScale(scale,scale,1);
   this.group.setPosition(0,this.baseY-5*(1-p)*(1-p));
   this.setCount(t>=.72?this.amount:Math.floor(this.amount*(1-Math.pow(1-t/.72,3))));
   const sweep=Math.max(0,Math.min(1,(t-.18)/1.05));
   if(this.gleam){this.gleam.setPosition(this.width*(-.22+.44*sweep),0);opacity(this.gleam,Math.round(Math.sin(sweep*Math.PI)*44));}
   const glow=Math.pow(Math.max(0,Math.sin(Math.min(1,t/1.1)*Math.PI)),4);
   const flourish=Math.pow(Math.max(0,Math.sin(Math.min(1,t/1.62)*Math.PI)),.72);
   if(this.burst&&this.burstAlpha){const s=.92+.16*flourish;this.burst.setScale(s,s,1);this.burst.angle=t*13;this.burstAlpha.opacity=Math.round(flourish*148);}
   if(this.halo&&this.haloAlpha){const s=.94+.09*Math.sin(Math.min(1,t/1.55)*Math.PI);this.halo.setScale(s,s,1);this.halo.angle=-t*9;this.haloAlpha.opacity=Math.round(flourish*188);}
   if(this.spark)opacity(this.spark,Math.round(glow*110));
   if(this.spark2){const p=Math.max(0,Math.min(1,(t-.12)/.95));this.spark2.setPosition(-this.width*(.39-.22*p),4+Math.sin(p*Math.PI)*18);opacity(this.spark2,Math.round(Math.pow(Math.sin(p*Math.PI),2)*92));}
   if(this.spark3){const p=Math.max(0,Math.min(1,(t-.28)/.82));this.spark3.setScale(1+.55*Math.sin(p*Math.PI),1+.55*Math.sin(p*Math.PI),1);opacity(this.spark3,Math.round(Math.pow(Math.sin(p*Math.PI),3)*100));}
   if(this.spark4){const p=Math.max(0,Math.min(1,(t-.36)/.72));this.spark4.setScale(.8+.7*Math.sin(p*Math.PI),.8+.7*Math.sin(p*Math.PI),1);opacity(this.spark4,Math.round(Math.pow(Math.sin(p*Math.PI),3)*184));}
   if(this.spark5){const p=Math.max(0,Math.min(1,(t-.58)/.68));this.spark5.setScale(.75+.65*Math.sin(p*Math.PI),.75+.65*Math.sin(p*Math.PI),1);opacity(this.spark5,Math.round(Math.pow(Math.sin(p*Math.PI),3)*172));}
  }
  const enter=this.reduced?1:Math.min(1,t/.14),leave=Math.max(0,Math.min(1,(1.85-t)/.22));
  this.alpha.opacity=Math.round(255*enter*leave);
  if(t>=1.85){this.setCount(this.amount);this.complete();}
 }
 private complete():void{
  this.finished=true;this.feedback=undefined;
  if(this.group?.isValid)this.group.destroy();
  this.group=undefined;this.alpha=undefined;this.count=undefined;this.gleam=undefined;this.spark=undefined;this.spark2=undefined;this.spark3=undefined;this.spark4=undefined;this.spark5=undefined;
  this.burst=undefined;this.burstAlpha=undefined;this.halo=undefined;this.haloAlpha=undefined;
  const done=this.done;this.done=undefined;done?.();
 }
 protected onDestroy():void{this.complete();}
}
