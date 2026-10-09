import {TextFit} from '../ui/TextFit';
import {AudioManager} from '../audio/AudioManager';
import type {AwardSoundtrack} from '../audio/AwardScore';
import {awardTiming,awardPhase,awardValue,type AwardTiming} from './AwardTimeline';
import {AwardCoinField} from './AwardCoinField';
import {awardProbe,clearAwardProbe} from './AwardProbe';
import {_decorator,Component,Label,Node,UIOpacity} from 'cc';
import {SalonArt,box,COLORS,opacity,outlined,text} from '../ui/SalonArt';
import {language} from '../ui/Language';
const {ccclass}=_decorator;

export interface OrdinaryWinPlacement { readonly y?:number; readonly width?:number; }
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
 * Resolves after 2.35s, or immediately on destruction. Never labels a loss a win.
 */
@ccclass('OrdinaryWinStage')
export class OrdinaryWinStage extends Component {
 private audio?:AudioManager;private field?:AwardCoinField;private soundtrack?:AwardSoundtrack;private plan!:AwardTiming;private revealed=false;
 private amount=0;private elapsed=0;private reduced=false;private finished=true;
 private group?:Node;private alpha?:UIOpacity;private count?:Label;private gleam?:Node;private spark?:Node;private spark2?:Node;private spark3?:Node;
 private done?:()=>void;private locale='en-US';private width=980;private displayed=-1;private baseY=0;
 public setup(art:SalonArt,amount:number,height:number,reduced:boolean,bet=0,placement:OrdinaryWinPlacement={},audio?:AudioManager):Promise<void>{
  this.complete();
  if(!Number.isFinite(amount)||amount<=0)return Promise.resolve();
  this.audio=audio;this.amount=amount;this.plan=awardTiming(0,reduced);this.revealed=false;
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
  this.field=new AwardCoinField(this.group,art,reduced||amount<=stake?0:12,true);
  const plate=art.awardPlate(this.group,0,0,this.width,160);
  // Reflection stays within the plate's inner rim; text is drawn on top.
  this.gleam=art.light(plate,1,-this.width*.22,0,this.width*.35,108,0);
  this.spark=art.light(plate,0,this.width*.39,0,66,66,0);
  this.spark2=art.light(plate,0,-this.width*.39,4,52,52,0);
  this.spark3=art.light(plate,0,this.width*.05,18,42,42,0);
  const title=stake===0?'award':this.amount<stake?'partial':this.amount===stake?'even':'win';
  // The sculpted plate is ivory only through its centre; the upper shoulder
  // is dark enamel. Give the title its own high-contrast metal lettering.
  const titleLabel=outlined(text(this.group,phrase(title),0,98,this.width*.80,36,30,COLORS.cream,true),COLORS.ink,2);
  // The award plate has a dark timber/enamel centre. Dark ink hid the
  // payout on phones even though the small WIN register had updated.
  this.count=outlined(text(plate,'+0',0,-5,this.width*.72,50,43,'#FFF3D1',true),'#281407',3);
  // Two generous lines keep translated titles and exact amounts readable on phones.
  for(const label of [titleLabel,this.count]){label.enableWrapText=false;label.overflow=Label.Overflow.SHRINK;label.node.getComponent(TextFit)!.compactLine=true;}
  this.alpha=opacity(this.group,reduced?255:0);
  this.group.setScale(reduced?1:.965,reduced?1:.965,1);
  this.setCount(reduced?this.amount:0);this.soundtrack=audio?.beginAward(0,this.plan.countEnd,amount>stake);if(reduced){this.soundtrack?.finish();this.revealed=true;}
  awardProbe(0,awardPhase(0,this.plan),reduced?this.amount:0);
  return new Promise<void>(resolve=>{this.done=resolve;});
 }
 private format(value:number):string{return value.toLocaleString(this.locale,{maximumFractionDigits:3});}
 private setCount(value:number):void{if(this.count&&value!==this.displayed){this.displayed=value;this.count.string='+'+this.format(value)+'  COINS';}}
 protected update(dt:number):void{
  if(this.finished||!this.group||!this.alpha)return;
  this.elapsed+=Number.isFinite(dt)?Math.max(0,Math.min(.25,dt)):0;
  const t=this.elapsed;this.soundtrack?.update(t);
  if(!this.revealed&&t>=this.plan.countEnd){this.revealed=true;this.soundtrack?.finish();}
  this.field?.update(t,this.plan,this.width);awardProbe(0,awardPhase(t,this.plan),awardValue(this.amount,t,this.plan),this.audio?.awardDiagnostics());
  if(!this.reduced){
   const p=Math.min(1,t/.34),q=p-1,settle=1+2.2*q*q*q+1.2*q*q;
   const pulse=t>.34?1+Math.sin(Math.min(1,(t-.34)/1.25)*Math.PI)*.018:1;
   const scale=(.965+.035*settle)*pulse;this.group.setScale(scale,scale,1);
   this.group.setPosition(0,this.baseY-5*(1-p)*(1-p));
   this.setCount(awardValue(this.amount,t,this.plan));
   const sweep=Math.max(0,Math.min(1,(t-.18)/1.05));
   if(this.gleam){this.gleam.setPosition(this.width*(-.22+.44*sweep),0);opacity(this.gleam,Math.round(Math.sin(sweep*Math.PI)*44));}
   const glow=Math.pow(Math.max(0,Math.sin(Math.min(1,t/1.1)*Math.PI)),4);
   if(this.spark)opacity(this.spark,Math.round(glow*110));
   if(this.spark2){const p=Math.max(0,Math.min(1,(t-.12)/.95));this.spark2.setPosition(-this.width*(.39-.22*p),4+Math.sin(p*Math.PI)*18);opacity(this.spark2,Math.round(Math.pow(Math.sin(p*Math.PI),2)*92));}
   if(this.spark3){const p=Math.max(0,Math.min(1,(t-.28)/.82));this.spark3.setScale(1+.55*Math.sin(p*Math.PI),1+.55*Math.sin(p*Math.PI),1);opacity(this.spark3,Math.round(Math.pow(Math.sin(p*Math.PI),3)*100));}
  }
  const enter=this.reduced?1:Math.min(1,t/.14),leave=Math.max(0,Math.min(1,(2.35-t)/.28));
  this.alpha.opacity=Math.round(255*enter*leave);
  if(t>=2.35){this.setCount(this.amount);this.complete();}
 }
 private complete():void{
  this.finished=true;this.soundtrack?.stop();this.soundtrack=undefined;this.field?.destroy();this.field=undefined;clearAwardProbe();
  if(this.group?.isValid)this.group.destroy();
  this.group=undefined;this.alpha=undefined;this.count=undefined;this.gleam=undefined;this.spark=undefined;this.spark2=undefined;this.spark3=undefined;
  const done=this.done;this.done=undefined;done?.();
 }
 protected onDestroy():void{this.complete();}
}
