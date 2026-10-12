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
 private group?:Node;private alpha?:UIOpacity;private count?:Label;private gleam?:Node;private spark?:Node;
 private feedback?:(progress:number)=>void;private done?:()=>void;private locale='en-US';private width=980;private displayed=-1;private baseY=0;
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
  // Reflection stays within the plate's inner rim; text is drawn on top.
  this.gleam=art.light(plate,1,-this.width*.22,0,this.width*.35,108,0);
  this.spark=art.light(plate,0,this.width*.39,0,66,66,0);
  const title=stake===0?'award':this.amount<stake?'partial':this.amount===stake?'even':'win';
  const titleLabel=text(plate,phrase(title),0,34,rewardTextWidth(this.width),48,40,rewardInk(theme),true);
  this.count=text(plate,'0',0,-22,rewardTextWidth(this.width),73,58,rewardInk(theme));
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
   const scale=.965+.035*settle;this.group.setScale(scale,scale,1);
   this.group.setPosition(0,this.baseY-5*(1-p)*(1-p));
   this.setCount(t>=.72?this.amount:Math.floor(this.amount*(1-Math.pow(1-t/.72,3))));
   const sweep=Math.max(0,Math.min(1,(t-.18)/1.05));
   if(this.gleam){this.gleam.setPosition(this.width*(-.22+.44*sweep),0);opacity(this.gleam,Math.round(Math.sin(sweep*Math.PI)*44));}
   if(this.spark)opacity(this.spark,Math.round(Math.pow(Math.max(0,Math.sin(Math.min(1,t/1.1)*Math.PI)),4)*68));
  }
  const enter=this.reduced?1:Math.min(1,t/.14),leave=Math.max(0,Math.min(1,(1.85-t)/.22));
  this.alpha.opacity=Math.round(255*enter*leave);
  if(t>=1.85){this.setCount(this.amount);this.complete();}
 }
 private complete():void{
  this.finished=true;this.feedback=undefined;
  if(this.group?.isValid)this.group.destroy();
  this.group=undefined;this.alpha=undefined;this.count=undefined;this.gleam=undefined;this.spark=undefined;
  const done=this.done;this.done=undefined;done?.();
 }
 protected onDestroy():void{this.complete();}
}
