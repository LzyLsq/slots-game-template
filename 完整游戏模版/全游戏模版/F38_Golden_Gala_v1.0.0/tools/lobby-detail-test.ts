import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GALA_LOBBY,galaStageScale} from '../assets/scripts/ui/GalaLobbyLayout';
import {LANGUAGES,setLanguage,tr} from '../assets/scripts/ui/Language';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
import {cabinetToolText} from '../assets/scripts/ui/CabinetToolText';
import {galaCollectionCaption,journeyCounts,lobbyEnterCaption,lobbyJourneyCaption,lobbyModeCaption,lobbyModeFacts,ruleNavigationCaption} from '../assets/scripts/ui/LobbyDetails';
import {fittedText,plateTextBox,textGlyphs} from '../assets/scripts/ui/TextLayout';

// Physical direct-entry geometry replaces the F37 carousel. Both the renderer
// and these checks import the same seat map.
for(const [width,height] of [[320,568],[390,844],[430,932],[768,1024]]){
 const f=Math.min(width/1080,height/1920),scale=galaStageScale(width/f,height/f),L=GALA_LOBBY;
 assert(scale>0&&scale<=1);
 assert(L.play.height*scale*f>=44,'direct entry has a real >=44px touch target');
 const bottom=L.rows[1]+L.play.y-L.play.height/2;
 assert(bottom>L.collection.y+L.collection.height/2,'play clears the collection strip');
 assert(L.rows[0]+L.play.y-L.play.height/2>L.rows[1]+L.guardian.y+L.guardian.height/2,'row two does not touch row one controls');
 assert(L.title.y-L.title.height/2>L.facts.y+L.facts.height/2);
 assert(L.facts.y-L.facts.height/2>L.play.y+L.play.height/2);
 for(let i=0;i<4;i++)assert.equal(GAME_CONFIGS[i].id,['crown-club','emerald-fortune','ruby-royale','vault-reserve'][i]);
}
console.log('PASS four direct-entry exhibits, compact >=44px PLAY and non-overlapping physical seats.');

const approximate=(value:string,size:number)=>textGlyphs(value).reduce((n,g)=>n+size*(/^[\u0000-\u00ff]/u.test(g)?.62:1),0);
for(const locale of LANGUAGES){
 setLanguage(locale.code);
 for(const direction of [-1,1] as const){
  const value=ruleNavigationCaption(direction),seat=plateTextBox(230,110);
  const fit=fittedText(value,{width:Math.min(150,seat.width)-8,height:54-6,maximum:42,wrap:false,leading:1.05,measure:approximate});
  assert.equal(fit.text,value);assert(fit.size*320/1080>=11,value+' remains readable at 320px');
 }
 const arrivalCopy=GAME_CONFIGS.map(c=>c.modeLabel).concat(['Preparing your chamber…','Your chamber is ready']);
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
  const fact=lobbyModeFacts(i),fit=fittedText(fact,{width:386,height:50,maximum:44,wrap:false,leading:1.05,measure:approximate});
  assert.equal(fit.text,fact);assert(fit.size*320/1080*galaStageScale(1080,1917)>=10.5,'compact facts have a readable minimum, not a truncated sentence');
 }
 const enter=lobbyEnterCaption(),seat=plateTextBox(790,132);
 const fit=fittedText(enter,{width:seat.width-12,height:seat.height-6,maximum:48,wrap:false,leading:1.05,measure:approximate});
 assert.equal(fit.text,enter);assert(fit.size*320/1080>=11);
 const stop={roundsDone:120,rounds:12,modesDone:8,modes:2},line=lobbyJourneyCaption(stop);
 assert(line.includes('12/12'));assert(line.includes('2/2'));assert(!line.includes('120/12'));assert(!line.includes('8/2'));
 assert.notEqual(lobbyJourneyCaption(undefined,true),lobbyJourneyCaption(undefined,false),'remote preview cannot look like a completed local journey');
 const seals=[{modesDone:1,claimed:true,ready:false},{modesDone:0,claimed:false,ready:false},{modesDone:1,claimed:false,ready:true},{modesDone:0,claimed:false,ready:false}];
 const collection=galaCollectionCaption(seals,false,locale.code);
 assert(collection.includes('2/4'),'lobby counts discoveries across all four cabinets');
 assert(collection.includes('1'),'unclaimed discoveries have an explicit ready count');
 assert(!collection.includes('0/1'),'the next undiscovered table cannot reset visible collection progress');
 const collectionFit=fittedText(collection,{width:814,height:49,maximum:36,wrap:false,leading:1.05,measure:approximate});
 assert.equal(collectionFit.text,collection);assert(collectionFit.size>=32,'all five collection translations fit their engraved plate');
 assert.notEqual(galaCollectionCaption(seals,true,locale.code),collection,'remote collections must remain explicitly local-preview-only');

}
assert.deepEqual(journeyCounts({roundsDone:-1,rounds:12,modesDone:-5,modes:2}),{rounds:'0/12',modes:'0/2'});
setLanguage('en');
const app=readFileSync(new URL('../assets/scripts/ui/AureliaApp.ts',import.meta.url),'utf8');
const rule=readFileSync(new URL('../assets/scripts/ui/RuleText.ts',import.meta.url),'utf8');
assert(app.includes('arrival.finish();if(this.root!==root)return;'),'retired page arrivals cannot update the new root');
assert(app.includes('this.pageArrival.cancel();this.transitionShield=undefined;'),'retired transitions are cancelled before rendering');
assert(app.includes('const x=L.columns[i%2],y=L.rows[Math.floor(i/2)]'));
assert(app.includes("()=>void this.navigate('game',cfg),i"));
assert(!app.includes('homeSelection')&&!app.includes('switchHome('),'no redundant selection gate');
assert(rule.includes("'gala-soft-plate-0'"));assert(rule.includes('Math.max(152,h)'));assert(!rule.includes("'interfaces'"));
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

assert(app.includes("'Virtual coins only · No cash value'"),'cashier must disclose virtual-only preview');
console.log('PASS shop notice uses compact dark copy with a light contrast edge.');

// Each direct PLAY receives a restrained clipped material sweep, with no
// per-selection allocation or invisible carousel interaction layer.
assert(app.includes('this.sheen(play,L.play.width,L.play.height,i*.8)'));
const sheenSource=app.slice(app.indexOf('private sheen('),app.indexOf('private sheen(')+800);
assert(sheenSource.includes('if(this.reduced)return'));
assert(sheenSource.includes('Mask.Type.GRAPHICS_RECT'));
assert(sheenSource.includes('h*2.2,h*2.2,38'));
assert(sheenSource.includes('to(1.6,')&&sheenSource.includes('delay(4.5)'),'slow material sweep, not a flashing CTA');
console.log('PASS four PLAY material cues, reduced motion and clipped slow CTA sheen.');

assert(app.includes("text(this.content!,tr(cfg.modeLabel)"),'actual cabinet footer uses translated mode rule, not the raw English label');
console.log('PASS all four initial rule summaries localized in five languages inside the original cabinet footer.');
