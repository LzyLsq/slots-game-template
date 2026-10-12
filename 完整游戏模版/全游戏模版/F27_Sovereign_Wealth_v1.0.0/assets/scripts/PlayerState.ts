import { sys } from 'cc';

export type Locale = 'en'|'zh-CN'|'es'|'ja';
export interface PlayerStateData {
  purchaseIds:string[];balance:number; bet:number; locale:Locale; sound:boolean; nickname:string; avatar:number;
  claimedDay:string; spins:number; biggestWin:number; history:{mode:string;bet:number;win:number;at:number}[];
}
const KEY='f27.sovereign.cocos.player.v1';
const DEFAULT:PlayerStateData={purchaseIds:[],balance:25000,bet:100,locale:'en',sound:true,nickname:'Guest Captain',avatar:0,claimedDay:'',spins:0,biggestWin:0,history:[]};
export class PlayerState {
  data:PlayerStateData;
  constructor(){
    try{this.data={...DEFAULT,...JSON.parse(sys.localStorage.getItem(KEY)||'{}')};}
    catch{this.data={...DEFAULT};}
  }
  save():void{sys.localStorage.setItem(KEY,JSON.stringify(this.data));}
  grantPurchase(id:string,amount:number):'new'|'duplicate'{
    if(this.data.purchaseIds.includes(id))return 'duplicate';
    const draft={...this.data,purchaseIds:[...this.data.purchaseIds,id],balance:this.data.balance+amount};
    sys.localStorage.setItem(KEY,JSON.stringify(draft));this.data=draft;return 'new';
  }
  credit(amount:number):void{this.data.balance=Math.max(0,Math.round((this.data.balance+amount)*100)/100);this.save();}
  debit(amount:number):boolean{if(this.data.balance<amount)return false;this.credit(-amount);return true;}
  record(mode:string,bet:number,win:number):void{
    this.data.spins++;this.data.biggestWin=Math.max(this.data.biggestWin,win);
    this.data.history.unshift({mode,bet,win,at:Date.now()});this.data.history=this.data.history.slice(0,30);this.save();
  }
}
