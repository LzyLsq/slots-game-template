import {rewardInk,rewardOutline,rewardTextWidth} from '../ui/RewardArtwork';
import {_decorator,Component,Label,Node,UIOpacity} from 'cc';
import {SalonArt,box,COLORS,opacity,text} from '../ui/SalonArt';
import {language} from '../ui/Language';
import type {WinSoundCue} from '../audio/AudioManager';
const {ccclass}=_decorator;

export interface OrdinaryWinPlacement { readonly y?:number; readonly width?:number; readonly theme?:number; }
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
 * Resolves after 2.15s, or immediately on destruction. Never labels a loss a win.
 */
@ccclass('OrdinaryWinStage')
export class OrdinaryWinStage extends Component {
 private amount=0;private elapsed=0;private reduced=false;private finished=true;
 private group?:Node;private alpha?:UIOpacity;private count?:Label;private gleam?:Node;private spark?:Node;private spark2?:Node;private spark3?:Node;
 private burst:{node:Node;alpha:UIOpacity;side:number;row:number}[]=[];
 private rays?:Node;private halo?:Node;private coins:{node:Node;alpha:UIOpacity;angle:number;delay:number}[]=[];
 private done?:()=>void;private locale='en-US';private width=980;private displayed=-1;private baseY=0;
 private onSound?:(cue:WinSoundCue,progress:number)=>void;private revealed=false;
 public setup(art:SalonArt,amount:number,height:number,reduced:boolean,bet=0,placement:OrdinaryWinPlacement={},onSound?:(cue:WinSoundCue,progress:number)=>void):Promise<void>{
  this.complete();
  if(!Number.isFinite(amount)||amount<=0)return Promise.resolve();
  this.amount=amount;
  if(this.amount===0)return Promise.resolve();
  const stake=Number.isFinite(bet)?Math.max(0,bet):0;
  const lang=language(),i=Math.max(0,LOCALES.indexOf(lang));this.locale=lang==='en'?'en-US':lang;
  const phrase=(key:keyof typeof COPY)=>COPY[key][i];
  this.width=Math.max(320,Math.min(980,Number.isFinite(placement.width)?placement.width!:980));
  const viewport=Number.isFinite(height)?Math.max(160,height):1920;
  // Default is the bottom hint strip, never the toolbar or the reel aperture.
  this.baseY=Number.isFinite(placement.y)?placement.y!:-viewport/2+88;
  this.elapsed=0;this.displayed=-1;this.reduced=reduced;this.finished=false;
  this.onSound=onSound;this.revealed=false;
  this.group=box(this.node,'Ordinary award · hint area',0,this.baseY,this.width,160);
  if(!reduced){
   this.rays=art.light(this.group,0,0,0,this.width*.88,340,0);
   this.halo=art.light(this.group,1,0,0,this.width*.7,300,0);
   for(let j=0;j<10;j++){
    const node=art.image(this.group,'symbols',0,0,58,58,0),alpha=opacity(node,0);
    node.name='Ordinary award coin spray';
    this.coins.push({node,alpha,angle:(j+.5)*Math.PI*2/10,delay:(j%3)*.06});
   }
  }
  const theme=placement.theme??0;
  const plate=art.rewardPanel(this.group,0,0,this.width,160,theme,'compact');
  // Reflection stays within the plate's inner rim; text is drawn on top.
  this.gleam=art.light(plate,1,-this.width*.22,0,this.width*.35,108,0);
  this.spark=art.light(plate,0,this.width*.39,0,66,66,0);
  this.spark2=art.light(plate,0,-this.width*.39,4,52,52,0);
  this.spark3=art.light(plate,0,this.width*.05,18,42,42,0);
  if(!reduced)for(let i=0;i<6;i++){
   const side=i%2?1:-1,row=Math.floor(i/2);
   const node=art.light(plate,3,side*this.width*.32,-21+row*40,52,52,0);
   this.burst.push({node,alpha:node.getComponent(UIOpacity)!,side,row});
  }
  const title=stake===0?'award':this.amount<stake?'partial':this.amount===stake?'even':'win';
  const titleLabel=text(plate,phrase(title),0,34,rewardTextWidth(this.width),48,40,rewardInk(theme),true);
  this.count=text(plate,'0',0,-22,rewardTextWidth(this.width),73,58,rewardInk(theme));
  // Two generous lines keep translated titles and exact amounts readable on phones.
  for(const label of [titleLabel,this.count]){label.enableWrapText=false;label.overflow=Label.Overflow.SHRINK;}
  this.alpha=opacity(this.group,reduced?255:0);
  this.group.setScale(reduced?1:.86,reduced?1:.86,1);
  this.setCount(reduced?this.amount:0);
  return new Promise<void>(resolve=>{this.done=resolve;});
 }
 private format(value:number):string{return value.toLocaleString(this.locale,{maximumFractionDigits:3});}
 private setCount(value:number):void{
  if(!this.count||value===this.displayed)return;
  this.displayed=value;this.count.string=this.format(value);
  if(value>=this.amount&&!this.revealed){this.revealed=true;this.onSound?.('reveal',1);}
  else if(value>0&&!this.revealed)this.onSound?.('count',value/this.amount);
 }
 protected update(dt:number):void{
  if(this.finished||!this.group||!this.alpha)return;
  this.elapsed+=Number.isFinite(dt)?Math.max(0,dt):0;
  const t=this.elapsed;
  if(!this.reduced){
   const p=Math.min(1,t/.48);
   const pulse=t>.48?1+Math.sin(Math.min(1,(t-.48)/1.35)*Math.PI)*.04:1;
   const scale=(.86+.14*p)*(1+.13*Math.sin(p*Math.PI))*pulse;this.group.setScale(scale,scale,1);
   this.group.setPosition(0,this.baseY-14*(1-p)*(1-p));
   this.setCount(t>=.9?this.amount:Math.floor(this.amount*(1-Math.pow(1-t/.9,3))));
   if(this.rays){this.rays.angle=t*25;opacity(this.rays,Math.round(105+65*Math.sin(Math.min(1,t/.75)*Math.PI)));}
   if(this.halo){const s=1+.18*Math.sin(t*4);this.halo.setScale(s,s,1);opacity(this.halo,Math.round(85+55*Math.sin(t*5)));}
   for(const {node,alpha,angle,delay} of this.coins){
    // Two short, pooled sprays frame the amount without hiding reel symbols.
    const cycle=t<1.12?t:t-1.12,part=Math.max(0,Math.min(1,(cycle-delay)/.78));
    const visible=cycle>=delay&&cycle<delay+.78?Math.sin(part*Math.PI):0;
    node.setPosition(Math.cos(angle)*this.width*.46*part,Math.sin(angle)*105*part+32*part*(1-part));
    node.angle=t*130+angle*35;node.setScale(.48+part*.52,.48+part*.52,1);
    alpha.opacity=Math.round(215*visible);
   }
   const sweep=Math.max(0,Math.min(1,(t-.18)/1.05));
   if(this.gleam){this.gleam.setPosition(this.width*(-.22+.44*sweep),0);opacity(this.gleam,Math.round(Math.sin(sweep*Math.PI)*44));}
   const glow=Math.pow(Math.max(0,Math.sin(Math.min(1,t/1.1)*Math.PI)),4);
   if(this.spark)opacity(this.spark,Math.round(glow*110));
   if(this.spark2){const p=Math.max(0,Math.min(1,(t-.12)/.95));this.spark2.setPosition(-this.width*(.39-.22*p),4+Math.sin(p*Math.PI)*18);opacity(this.spark2,Math.round(Math.pow(Math.sin(p*Math.PI),2)*92));}
   if(this.spark3){const p=Math.max(0,Math.min(1,(t-.28)/.82));this.spark3.setScale(1+.55*Math.sin(p*Math.PI),1+.55*Math.sin(p*Math.PI),1);opacity(this.spark3,Math.round(Math.pow(Math.sin(p*Math.PI),3)*100));}
   for(const {node,alpha,side,row} of this.burst){
    const v=Math.max(0,Math.min(1,(t-.08-row*.08)/.95)),flare=Math.sin(v*Math.PI);
    node.setPosition(side*(this.width*.32+44*v),-21+row*40+(row===1?26:-24)*v);
    node.setScale(.6+flare*1.15,.6+flare*1.15,1);alpha.opacity=Math.round(Math.pow(flare,1.5)*210);
   }
  }
  const enter=this.reduced?1:Math.min(1,t/.16),leave=Math.max(0,Math.min(1,(2.15-t)/.25));
  this.alpha.opacity=Math.round(255*enter*leave);
  if(t>=2.15){this.setCount(this.amount);this.complete();}
 }
 private complete():void{
  this.finished=true;
  this.onSound=undefined;
  if(this.group?.isValid)this.group.destroy();
  this.group=undefined;this.alpha=undefined;this.count=undefined;this.gleam=undefined;this.spark=undefined;this.spark2=undefined;this.spark3=undefined;this.rays=undefined;this.halo=undefined;this.coins=[];this.burst=[];
  const done=this.done;this.done=undefined;done?.();
 }
 protected onDestroy():void{this.complete();}
}
