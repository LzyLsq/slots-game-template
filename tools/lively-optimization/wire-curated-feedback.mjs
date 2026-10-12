// Assertion-guarded audio-only migration; no wager, wallet or purchase changes.
import {readdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'../..'),base=join(root,'完整游戏模版/全游戏模版');
const ids=[13,14,15,16,17,18,19,20,21,22,23,24,25,27,28,29,30,31,33];
function once(s,from,to,label){if(s.includes(to))return s;assert(s.includes(from),label);assert.equal(s.split(from).length,2,label+' must be unique');return s.replace(from,to);}
for(const id of ids){
 const project=join(base,readdirSync(base).find(d=>d.startsWith('F'+id+'_')));
 const file=join(project,'assets/scripts',id===25?'VelvetApp.ts':id===27?'SovereignApp.ts':id===28?'RegattaApp.ts':'ui/AureliaApp.ts');
 let s=readFileSync(file,'utf8');
 if(existsSync(join(project,'assets/scripts/vfx/OrdinaryWinStage.ts'))){
  const effect=join(project,'assets/scripts/vfx/OrdinaryWinStage.ts');let v=readFileSync(effect,'utf8');
  if(id!==20){
  v=once(v,'readonly theme?:number;','readonly theme?:number; readonly feedback?:(progress:number)=>void;','ordinary callback type F'+id);
  v=once(v,'private done?:()=>void;','private feedback?:(progress:number)=>void;private done?:()=>void;','ordinary callback field F'+id);
  v=once(v,'this.amount=amount;','this.amount=amount;this.feedback=placement.feedback;','ordinary callback init F'+id);
  v=once(v,'this.displayed=value;this.count.string=this.format(value);','this.displayed=value;this.count.string=this.format(value);if(!this.reduced&&value>0&&value<this.amount)this.feedback?.(value/this.amount);','ordinary actual digits F'+id);
  if(!v.includes('this.feedback=undefined;'))v=once(v,'private complete():void{\n  this.finished=true;','private complete():void{\n  this.finished=true;this.feedback=undefined;','ordinary callback cleanup F'+id);
  writeFileSync(effect,v);
  }
  s=once(s,'this.writeWinAmount(value.n,total);','this.writeWinAmount(value.n,total);\n        this.audio.playWinDetail(\'count\',(value.n-from)/(amount-from),0);','evidence count F'+id);
  if(id!==20)s=once(s,'if(amount>this.presentedWin)this.audio.playSmallWinJingle();','if(amount>0)this.audio.playSmallWinJingle();','ordinary jingle F'+id);
  const setup=/stage\.addComponent\(OrdinaryWinStage\)\.setup\([^\n]*theme:GAME_CONFIGS\.indexOf\(this.config\)/;
  const m=s.match(setup);assert(m,'ordinary placement F'+id);
  const withFeedback=m[0]+",feedback:p=>this.audio.playWinDetail('count',p,0)";
  if(id!==20&&!s.includes(withFeedback))s=s.replace(m[0],withFeedback);
  s=once(s,'this.audio.finishWinPresentation();\n        if(stage.isValid)stage.destroy();',"this.audio.finishWinPresentation();\n        if(amount>0&&stage.isValid&&stage.activeInHierarchy&&this.page==='game'&&this.visible)this.audio.playWinDetail('collect',1,0);\n        if(stage.isValid)stage.destroy();",'ordinary collect F'+id);
 }
 if(id===16){
  s=once(s,"if(available){this.audio.play('tap');ambient.land(-1);}","if(available){if(index!==0)this.audio.play(index===1?'bet-up':'bet-down');ambient.land(-1);}",'F16 successful button cue');
  s=once(s,'onUpdate:()=>{total.string=tr(money(v.n));',"onUpdate:()=>{if(!total.isValid)return;this.audio.playWinDetail('count',v.n/amount,0);total.string=tr(money(v.n));",'F16 ordinary count');
  s=once(s,'finally{this.audio.finishWinPresentation();if(banner.isValid)banner.destroy();}',"finally{this.audio.finishWinPresentation();if(banner.isValid&&banner.activeInHierarchy&&this.page==='game'&&this.visible)this.audio.playWinDetail('collect',1,0);if(banner.isValid)banner.destroy();}",'F16 ordinary collect');
 }else if(id===25){
  s=once(s,'if(r.total){this.coinFlight(360,this.H*.5);if(isBigWin(r.total,r.bet))await this.presentAward(r.total,false,r.bet)}','if(r.total){if(isBigWin(r.total,r.bet))await this.presentAward(r.total,false,r.bet);else this.coinFlight(360,this.H*.5)}','F25 one settlement feedback path');
  s=once(s,'if(this.busy||this.auto)return;this.state.bet=BETS[','if(this.busy||this.auto)return;const priorBet=this.state.bet;this.state.bet=BETS[','F25 remember actual bet');
  if(!s.includes('if(priorBet!==this.state.bet)'))s=once(s,"this.betLabel.string=this.money(this.state.bet);this.cue('touch')","this.betLabel.string=this.money(this.state.bet);this.cue(i?'bet-up':'bet-down')",'F25 bet cues');
  s=once(s,"this.cue(i?'bet-up':'bet-down')","if(priorBet!==this.state.bet)this.cue(i?'bet-up':'bet-down')",'F25 bound cannot sound success');
  s=once(s,"else this.webMusic.play(name==='spin'?'spin':'tap');","else this.webMusic.play(name==='spin'?'spin':name==='bet-up'?'bet-up':name==='bet-down'?'bet-down':name==='back'?'back':'tap');",'F25 cue routing');
 }else if(id===27){
  if(s.includes("this.audio.playWinDetail('count',value.n/amount,0);}}).call"))s=s.replace("this.audio.playWinDetail('count',value.n/amount,0);}}).call","this.audio.playWinDetail('count',value.n/amount,0);}}}).call");
  s=once(s,"this.audio.play('tap');action();this.scheduleOnce", "if(!['SPIN control','PLUS control','MINUS control'].includes(hit.name))this.audio.play(hit.name.includes('/back')?'back':'tap');action();this.scheduleOnce",'F27 no double start');
  s=once(s,'this.player.data.bet=bets[next];this.player.save();',"this.player.data.bet=bets[next];this.audio.play(direction>0?'bet-up':'bet-down');this.player.save();",'F27 actual bet change');
  s=once(s,"outlined(label(panel,`${tr(this.player.data.locale,'ordinary')}  +${this.money(amount)}`,0,0,620,90,46,hex('#FFF2A7'),true),'#7A260D',4);", "const count=outlined(label(panel,`${tr(this.player.data.locale,'ordinary')}  +${this.money(this.reduced?amount:0)}`,0,0,620,90,46,hex('#FFF2A7'),true),'#7A260D',4);if(!this.reduced){const value={n:0};tween(value).to(.58,{n:amount},{easing:'cubicOut',onUpdate:()=>{if(count.isValid){count.string=`${tr(this.player.data.locale,'ordinary')}  +${this.money(value.n)}`;this.audio.playWinDetail('count',value.n/amount,0);}}}).call(()=>{if(count.isValid)count.string=`${tr(this.player.data.locale,'ordinary')}  +${this.money(amount)}`;}).start();}",'F27 real ordinary count');
 }else if(id===28){
  s=once(s,"this.syncMusic(); this.sound('press'); this.safe(callback);", "this.syncMusic(); if(!color.endsWith('-spin')&&!color.endsWith('-minus')&&!color.endsWith('-plus'))this.sound(role==='back'?'back':'press'); this.safe(callback);",'F28 no duplicate launch');
  s=once(s,"else this.webMusic.play(key==='launch'?'spin':'tap');","else this.webMusic.play(key==='launch'?'spin':key==='bet-up'?'bet-up':key==='bet-down'?'bet-down':key==='back'?'back':'tap');",'F28 routing');
  s=once(s,'this.betIndex = Math.max(0, Math.min(BETS.length - 1, this.betIndex + delta)); this.refreshControls();',"const prior=this.betIndex; this.betIndex = Math.max(0, Math.min(BETS.length - 1, this.betIndex + delta)); if(prior!==this.betIndex)this.sound(delta>0?'bet-up':'bet-down'); this.refreshControls();",'F28 actual bet change');
  s=once(s,'private coinFlight(count: number): void {\n    if (this.reduced) return;',"private coinFlight(count: number): void {\n    if (this.reduced) return;\n    this.webMusic?.playWinDetail('burst');",'F28 flight feedback');
 }else{
  // Bet sound is emitted by successful changeBet, not the generic hit target.
  if(id===31)s=once(s,"this.audio.play('tap');ambient.land(-1);action();},{depth:kind", "if(kind==='auto')this.audio.play('tap');ambient.land(-1);action();},{depth:kind",'F31 control roles');
  else{
   const ctl=/bindPress\(hit,face,\(\)=>\{this.audio.play\((?:'tap'|cue)\);(?:ambient.land\((?:-1|index)\);)?action\(\);\},\[/;
   if(!s.includes("if(index!==0&&index!==1&&index!==2)this.audio.play('tap');")){
    const m=s.match(ctl);assert(m,'cabinet ctl F'+id);s=s.replace(m[0],m[0].replace(/this.audio.play\((?:'tap'|cue)\);/,"if(index!==0&&index!==1&&index!==2)this.audio.play('tap');"));
   }
  }
  if(id===18)s=once(s,"this.audio.play('tap');ambient.land(0);void this.spin();", "ambient.land(0);void this.spin();",'F18 lever no double sound');
  s=once(s,'this.betIndex=next;if(this.betLabel)',"this.betIndex=next;this.audio.play(delta>0?'bet-up':'bet-down');if(this.betLabel)",'successful bet cue F'+id);
 }
 if([21,22,23,29,30,31,33].includes(id)){
  const stageFile=join(project,'assets/scripts/vfx/SalonWinStage.ts');let stage=readFileSync(stageFile,'utf8');
  stage=once(stage,"this.count.string=tr(Math.floor(this.amount*(1-Math.pow(1-p,2.4))).toLocaleString('en-US'));", "this.count.string=tr(Math.floor(this.amount*(1-Math.pow(1-p,2.4))).toLocaleString('en-US'));if(!this.reduced&&p>0&&p<1)this.onSound?.('count',p);",'F'+id+' count matches rendered digits');
  writeFileSync(stageFile,stage);
 }
 writeFileSync(file,s);console.log('F'+id+': synchronized ordinary feedback and control roles');
}
