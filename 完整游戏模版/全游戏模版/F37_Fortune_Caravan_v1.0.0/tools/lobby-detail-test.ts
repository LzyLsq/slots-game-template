import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LobbyCarousel} from '../assets/scripts/ui/LobbyCarousel';
import {LANGUAGES,setLanguage,tr} from '../assets/scripts/ui/Language';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
import {cabinetToolText} from '../assets/scripts/ui/CabinetToolText';
import {journeyCounts,lobbyEnterCaption,lobbyJourneyCaption,lobbyModeCaption,lobbyModeFacts,ruleNavigationCaption} from '../assets/scripts/ui/LobbyDetails';
import {fittedText,plateTextBox,textGlyphs} from '../assets/scripts/ui/TextLayout';

// Actual carousel behavior, including last-intent queuing and stale completion.
const carousel=new LobbyCarousel(4);
assert.equal(carousel.request(0),undefined);assert(!carousel.moving);
const previous=carousel.request(carousel.step(-1),-1)!;assert.equal(previous.index,3);assert.equal(previous.direction,-1);
assert.equal(carousel.complete(previous),undefined);
const wrap=carousel.request(carousel.step(1),1)!;assert.equal(wrap.index,0);assert.equal(wrap.direction,1);
carousel.complete(wrap);
const first=carousel.request(1)!;
assert.equal(carousel.request(2),undefined);assert.equal(carousel.target,2);
assert.equal(carousel.request(3),undefined);assert.equal(carousel.target,3);
const latest=carousel.complete(first)!;assert.equal(latest.index,3);assert.equal(carousel.index,3);assert(carousel.moving);
assert.equal(carousel.complete(first),undefined);assert(carousel.moving,'duplicate completion cannot consume a new transition');
carousel.request(0);carousel.request(3);assert.equal(carousel.target,3);
assert.equal(carousel.complete(latest),undefined);assert(!carousel.moving,'selecting the current destination cancels an old queued intent');
const stale=carousel.request(0)!;carousel.reset();const afterReset=carousel.request(2)!;
assert.equal(carousel.complete(stale),undefined);assert(carousel.moving);carousel.complete(afterReset);
assert.equal(carousel.request(6),undefined);assert.equal(carousel.index,2);
assert.throws(()=>new LobbyCarousel(0),RangeError);assert.throws(()=>carousel.request(NaN),RangeError);
for(let i=0;i<400;i++){
 const move=carousel.request(carousel.step(1),1)!;assert.equal(move.direction,1);carousel.complete(move);assert(!carousel.moving);
}
const quick=new LobbyCarousel(4),moving=quick.request(1)!;
quick.request(quick.step(1),1);quick.request(quick.step(1),1);
assert.equal(quick.target,3,'repeated next uses the queued target, not a stale index');
const queued=quick.complete(moving)!;assert.equal(queued.index,3);assert.equal(queued.direction,1);quick.complete(queued);
const one=new LobbyCarousel(1);assert.equal(one.request(one.step(1),1),undefined);
console.log('PASS bounded last-intent carousel, both wrap directions, no-op clicks, 400 cycles and page-rebuild guards.');

const approximate=(value:string,size:number)=>textGlyphs(value).reduce((n,g)=>n+size*(/^[\u0000-\u00ff]/u.test(g)?.62:1),0);
for(const locale of LANGUAGES){
 setLanguage(locale.code);
 for(const direction of [-1,1] as const){
  const value=ruleNavigationCaption(direction),seat=plateTextBox(230,110);
  const fit=fittedText(value,{width:Math.min(150,seat.width)-8,height:54-6,maximum:42,wrap:false,leading:1.05,measure:approximate});
  assert.equal(fit.text,value);assert(fit.size*320/1080>=11,value+' remains readable at 320px');
 }
 const arrivalCopy=['5 PAYLINES','243 WAYS','25 PAYLINES','5+ CONNECTED','Travelling WILD respins','Sticky WILD free spins','Mystery reveal free spins','Neighbour-clearing cascades','Preparing your chamber…','Your chamber is ready'];
 for(const source of arrivalCopy){
  const localized=tr(source);if(locale.code!=='en')assert.notEqual(localized,source,'arrival copy must not fall back to English');
  const fit=fittedText(localized,{width:775,height:43,maximum:35,wrap:false,leading:1.05,measure:approximate});
  assert.equal(fit.text,localized);assert(fit.size*320/1080>=8,'arrival hint remains inside its seat');
 }
 for(const config of GAME_CONFIGS){
  const caption=tr(config.modeLabel);
  if(locale.code!=='en')assert.notEqual(caption,config.modeLabel,'all four initial cabinet rule summaries are localized');
  const fit=fittedText(caption,{width:892,height:88,maximum:39,wrap:false,leading:1.18,measure:approximate});
  assert.equal(fit.text,caption);assert(fit.size*320/1080>=11,'initial rule caption fits the existing footer without shrinking below 11px');
 }
 const captions=Array.from({length:4},(_,i)=>lobbyModeCaption(i));assert.equal(new Set(captions).size,4);
 for(const value of captions){const fit=fittedText(value,{width:187,height:43,maximum:39,wrap:false,leading:1.05,measure:approximate});assert.equal(fit.text,value);assert(fit.size*320/1080>=10,'destination label minimum');}
 assert(!cabinetToolText('SOUND').includes('\n'));
 if(locale.code!=='en'){assert.notEqual(cabinetToolText('SOUND'),'SOUND');assert.notEqual(cabinetToolText('ON'),'ON');assert.notEqual(cabinetToolText('OFF'),'OFF');}
 for(let i=0;i<4;i++){
  const fact=lobbyModeFacts(i),fit=fittedText(fact,{width:694,height:35,maximum:31,wrap:false,leading:1.05,measure:approximate});
  assert.equal(fit.text,fact);assert(fit.size*320/1080>=8,'compact facts have a readable minimum, not a truncated sentence');
 }
 const enter=lobbyEnterCaption(),seat=plateTextBox(790,132);
 const fit=fittedText(enter,{width:seat.width-12,height:seat.height-6,maximum:48,wrap:false,leading:1.05,measure:approximate});
 assert.equal(fit.text,enter);assert(fit.size*320/1080>=11);
 const stop={roundsDone:120,rounds:12,modesDone:8,modes:2},line=lobbyJourneyCaption(stop);
 assert(line.includes('12/12'));assert(line.includes('2/2'));assert(!line.includes('120/12'));assert(!line.includes('8/2'));
 assert.notEqual(lobbyJourneyCaption(undefined,true),lobbyJourneyCaption(undefined,false),'remote preview cannot look like a completed local journey');
}
assert.deepEqual(journeyCounts({roundsDone:-1,rounds:12,modesDone:-5,modes:2}),{rounds:'0/12',modes:'0/2'});
setLanguage('en');
const app=readFileSync(new URL('../assets/scripts/ui/AureliaApp.ts',import.meta.url),'utf8');
const rule=readFileSync(new URL('../assets/scripts/ui/RuleText.ts',import.meta.url),'utf8');
assert(app.includes('this.homeSelection.reset()'));assert(app.includes('generation!==this.generation'));
assert(app.includes('this.homeEnterPending=true'));assert(app.includes('this.homeSelection.step(1),1'));
assert(app.includes('184,236'));assert(236*320/1080>=44);
assert(rule.includes("'caravan-soft-plate-0'"));assert(rule.includes('Math.max(152,h)'));assert(!rule.includes("'interfaces'"));
assert(152*320/1080>=44);
assert(app.includes('if(this.modal?.isValid)this.fitModalShield(this.modal)'));
assert(app.includes('dim.clear()'));assert(app.includes('setContentSize(width,height)'));
console.log('PASS five-language detail copy, carved rule controls, >=44px hit seats, translated SOUND and persistent resize shield.');

const resizeSource=app.slice(app.indexOf('private resize():void'),app.indexOf('private render():void'));
assert(resizeSource.includes('if(this.modal?.isValid){'));
assert(resizeSource.includes('this.fitPageBackdrop();this.pageResizePending=true;return;'));
assert(resizeSource.indexOf('this.pageResizePending=true;return;')<resizeSource.indexOf('this.render()'),'Dialog resize must not rebuild the page');
const closeSource=app.slice(app.indexOf('private closeModal():void'),app.indexOf('private toast('));
assert(closeSource.includes('this.scheduleOnce('));
assert(closeSource.includes('this.pageResizePending&&!this.modal?.isValid&&!this.busy&&this.root?.isValid'));
assert(closeSource.includes('this.pageResizePending=false;this.resize()'));
assert(app.includes("removeAttribute('data-dialog-shield')"));
assert(app.includes('r.virtual?tr(r.nickname):r.nickname'),'Localize only fictional companions, not real players');
assert(app.includes('p.nickname,130,357,380,66,43,COLORS.ink,true,true'),'Account nickname is raw player data');
console.log('PASS modal resize preservation, deferred page layout, diagnostic cleanup and raw player names.');
assert(app.includes("error.string=tr('Use 2–18 characters')"));assert(app.includes("error.string=tr('Nickname could not be saved.')"));

assert(app.includes("this.compactCaption(outlined(text(showroom,'Virtual coins only · No withdrawals or cash prizes',0,-585,900,54,36,COLORS.ink),'#FFF3D5',2))"),'Merchant notice must remain dark and outlined over bright marble');
console.log('PASS shop notice uses compact dark copy with a light contrast edge.');

// Decorative selection and material polish reuse loaded optical art; they
// never change touch seats or introduce unbounded per-selection effects.
const selectedSource=app.slice(app.indexOf('private updateHomeSelection('),app.indexOf('private async switchHome('));
assert(app.includes("glow.name='Selected destination aura';glow.setSiblingIndex(0)"));
assert(app.includes('this.homeSeals.push({face:emblem,caption,glow})'));
assert(selectedSource.includes('Tween.stopAllByTarget(glow);Tween.stopAllByTarget(glowAlpha)'));
assert(selectedSource.includes('opacity:selected?78:0'),'unselected seals never accumulate glow');
assert(selectedSource.includes('animate&&!this.reduced'),'reduced motion has no selected-state tween');
assert(app.includes('this.sheen(play,790,132,1.2)'));
const sheenSource=app.slice(app.indexOf('private sheen('),app.indexOf('private sheen(')+800);
assert(sheenSource.includes('if(this.reduced)return'));
assert(sheenSource.includes('Mask.Type.GRAPHICS_RECT'));
assert(sheenSource.includes('h*2.2,h*2.2,38'));
assert(sheenSource.includes('to(1.6,')&&sheenSource.includes('delay(4.5)'),'slow material sweep, not a flashing CTA');
console.log('PASS restrained selected-seal optics, bounded tween replacement, reduced motion and clipped slow CTA sheen.');

assert(app.includes("text(this.content!,tr(cfg.modeLabel)"),'actual cabinet footer uses translated mode rule, not the raw English label');
console.log('PASS all four initial rule summaries localized in five languages inside the original cabinet footer.');
