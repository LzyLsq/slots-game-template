import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {containTextBox,fittedText,plateSections,plateTextBox,textGlyphs,type TextBox} from '../assets/scripts/ui/TextLayout';
import {journeyCounts} from '../assets/scripts/ui/LobbyDetails';
import {CABINETS} from '../assets/scripts/ui/CabinetGeometry';
import {LANGUAGES,setLanguage,tr} from '../assets/scripts/ui/Language';
const inside=(rect:TextBox,bounds:TextBox)=>{
 for(const axis of ['x','y'] as const){const size=axis==='x'?'width':'height';assert(rect[axis]-rect[size]/2>=bounds[axis]-bounds[size]/2-1e-8);assert(rect[axis]+rect[size]/2<=bounds[axis]+bounds[size]/2+1e-8);}
};
// Every source pixel is sampled once: the old centre repeated the right shoulder.
for(const [width,height] of [[244,144],[744,122],[990,238],[958,344],[430,146],[525,107]]){
 const parts=plateSections(width,height);assert.equal(parts.reduce((n,p)=>n+p.width,0),width);
 let source=0;for(const part of parts){assert.equal(part.sourceX,source);source+=part.sourceWidth;}assert.equal(source,618);
 const quiet=plateTextBox(width,height);assert(quiet.width>width*.5);assert(quiet.height<height*.6);
 for(const [x,y] of [[0,0],[width,height],[-width,-height],[25,51]])inside(containTextBox({x,y,width:width*.9,height:height*.7},quiet),quiet);
}
const approximate=(value:string,size:number)=>textGlyphs(value).reduce((n,g)=>n+size*(/^[\u0000-\u00ff]/u.test(g)?.62:1),0);
let checked=0;
for(const lang of LANGUAGES){setLanguage(lang.code);
 for(const source of ['Background music · ON','Button & win sounds · OFF','Tap to reveal the full amount','Virtual coins · No cash value','123,456,789,012,345','玩家一二三四五六七八九十🍀','e\u0301'.repeat(40),'🏆\uFE0F👨‍👩‍👧‍👦'.repeat(10),'LongUnbrokenNickname1234567890','Multi line\nTitle\nCoins']){
  for(const [width,height] of [[128,34],[298,34],[500,70],[650,74],[635,540]])for(const wrap of [true,false]){
   const value=tr(source),leading=wrap?1.22:1.05,result=fittedText(value,{width:width-8,height:height-8,maximum:52,wrap,leading,measure:approximate});
   assert(result.size>0&&result.size<=52);const lines=result.text.split('\n');
   assert(lines.every(line=>approximate(line,result.size)<=width-8+.01));assert(lines.length*result.lineHeight<=height-8+.01);
   if(!wrap)assert.equal(result.text,value,'exact amounts / nicknames are not truncated');
   for(const line of lines)assert(!/^[\p{Mark}\uFE0E\uFE0F\u200D]/u.test(line),'no detached accent or emoji selector');checked++;
  }
 }
}
// AUTO captions preserve the exact localized state inside each measured
// console seat; the state must never wrap into the central SPIN lettering.
for(const locale of LANGUAGES){
 setLanguage(locale.code);
 for(const g of Object.values(CABINETS))for(const source of ['AUTO ON','AUTO OFF']){
  const value=tr(source),fit=fittedText(value,{width:g.status[2]-8,height:g.status[3]-5,maximum:29,wrap:false,leading:1.05,measure:approximate});
  assert.equal(fit.text,value);assert(!fit.text.includes('\n'));assert(fit.size>=21,'AUTO state needs readable full text, not just containment');
 }
}
setLanguage('en');
// Reward day and amount share one caption, not independently clamped boxes
// that overlap when ornamental shoulders narrow the face.
const rewardBounds=plateTextBox(430,146);
for(const amount of [300,500,800,1100,1500,2200,3800]){
 const value='DAY 7 · '+amount.toLocaleString('en-US');
 const result=fittedText(value,{width:rewardBounds.width-8,height:rewardBounds.height-6,maximum:35,wrap:false,leading:1.05,measure:approximate});
 assert.equal(result.text,value);assert(result.size>=20);assert(approximate(value,result.size)<=rewardBounds.width-8);
}
// Header balance must remain readable, not merely inside the image, on a
// 320px phone. The common compact seat and its outline preserve >=11px type.
const walletSeat=plateTextBox(525,160);
for(const value of ['73,661','999,999','1.23B','999.99M']){
 const result=fittedText(value,{width:walletSeat.width-12,height:walletSeat.height-6,maximum:42,wrap:false,leading:1.05,measure:approximate});
 assert(result.size*320/1080>=11,'narrow-phone balance font is legible');
 assert.equal(result.text,value);inside(walletSeat,{x:0,y:0,width:525,height:160});
}
// Portrait grid is below the dialog heading, and clear of its bottom carving.
const galleryTitle={x:0,y:495,width:740,height:76};
for(let row=0;row<4;row++){const centre=330-row*220;assert(centre+88<galleryTitle.y-galleryTitle.height/2);assert(centre-88>=-420);}
// Help copy must clear the centre finial, not only the flat outer rail.
const helpSource=readFileSync(new URL('../assets/scripts/ui/RuleHelp.ts',import.meta.url),'utf8');
const helpSeat=helpSource.match(/pages\[paragraph\],0,(-?\d+),720,(\d+),38/);assert(helpSeat,'help paragraph is centered inside the enamel panel');
const helpLines=Number(helpSource.match(/ruleTextPages\(value,(\d+),620,38\)/)?.[1]);
assert(helpLines>0);assert(helpLines*38*1.28<=Number(helpSeat[2]));
assert(Number(helpSeat[1])-Number(helpSeat[2])/2>=-320,'clear pointed bottom carving');
assert(helpSource.includes("diagram=box(parent,'Actual rule diagram',0,132,w,h)"),'rule diagram aligns with the centered explanation');
const rulePagesSource=readFileSync(new URL('../assets/scripts/ui/RulePages.ts',import.meta.url),'utf8');
const bodySeat=rulePagesSource.match(/copy\(parent,page\.body,0,(-?\d+),(\d+),(\d+),38\)/);assert(bodySeat,'all rule paragraphs share the centered reading seat');
const bodyLines=Number(rulePagesSource.match(/ruleTextPages\(value,(\d+),630,38\)/)?.[1]);
assert(bodyLines>0);assert(bodyLines*38*1.28<=Number(bodySeat[3]),'full rule page fits without reducing the type');
assert(Number(bodySeat[1])-bodyLines*38*1.28/2>=-320,'last rule line clears the pointed carving');
assert(Number(bodySeat[2])/2<=360,'equal side margins clear the ornamental shoulders');
console.log('PASS centered rule paragraphs / diagrams and bottom-carving clearance.');

// Room-loading copy spans both green enamel and the ivory crest. Keep a
// dark outline on ivory lettering rather than dark ink on the dark rail.
const appSource=readFileSync(new URL('../assets/scripts/ui/AureliaApp.ts',import.meta.url),'utf8');
assert(appSource.includes('walletSeat=plateTextBox(525,160)')&&appSource.includes('this.balanceLabel.node.getComponent(TextFit)!.compactLine=true'),'runtime uses the tested readable wallet seat');
for(const name of ['ruleTitle','ruleCopy'])assert(new RegExp(`const ${name}=outlined\\(text\\(stage,[^;]+COLORS\\.cream[^;]+,'#2B1D12',3\\)`).test(appSource),'loading rule has a high-contrast outlined seat');
setLanguage('en');
assert.deepEqual(textGlyphs('e\u0301🏆\uFE0F👨‍👩‍👧‍👦👍🏽'),['e\u0301','🏆\uFE0F','👨‍👩‍👧‍👦','👍🏽']);
const tiny=fittedText('123456789',{width:1,height:1,maximum:52,wrap:false,leading:1.05,measure:approximate});assert(approximate(tiny.text,tiny.size)<=1);
// The two award facts have distinct seats within the taller engraved register.
const award=plateTextBox(958,344),unit={x:0,y:26,width:500,height:24},value={x:0,y:-23,width:500,height:70};inside(unit,award);inside(value,award);assert(value.y+value.height/2<unit.y-unit.height/2);
console.log(`PASS ${checked} text fits: five languages, long exact balances, joined emoji, multiline height, measured enamel seats and non-overlapping award lines.`);

// Service-screen actions used to fit technically but rendered at 6–8px on a
// 320px phone. Read the real button dimensions, then test translated copy and
// the source plate's enamel seat, including the caption's actual stroke.
const serviceActions=[
 {name:'Daily gift',copy:'DAILY GIFT · 800 COINS',minimum:11},
 {name:'Return to caravan',copy:'BACK TO THE CARAVAN',minimum:11},
 {name:'Edit traveller name',copy:'Edit name',minimum:11},
 {name:'Traveller coin journal',copy:'Coin journal',minimum:11},
 {name:'Account sound options',copy:'Sound & feedback',minimum:11},
 {name:'Account privacy',copy:'Privacy & Data',minimum:11},
 {name:'Account sign out',copy:'Sign out',minimum:11},
 {name:'Account delete',copy:'Delete account',minimum:11},
];
for(const action of serviceActions){
 const match=appSource.match(new RegExp(`this\\.art\\.button\\([^;]*?'${action.name}',(-?[\\d.]+),(-?[\\d.]+),(\\d+),(\\d+),`));assert(match,action.name+' has a measured button');
 const width=Number(match[3]),height=Number(match[4]),seat=plateTextBox(width,height);
 for(const locale of LANGUAGES){setLanguage(locale.code);const value=tr(action.copy);
  const fit=fittedText(value,{width:seat.width-11,height:seat.height-5,maximum:Math.min(48,height*.38),wrap:false,leading:1.05,measure:approximate});
  assert.equal(fit.text,value);assert(fit.size*320/1080>=action.minimum,action.name+' stays readable on 320px phones');
 }
}
setLanguage('en');
assert(appSource.includes("this.services.remoteMode?'PLAYERS · TOTAL COINS WON':'VIRTUAL FRIENDS · TOTAL COINS WON'"),'live players are not mislabelled as virtual friends');
const disjoint=(a:TextBox,b:TextBox)=>Math.abs(a.x-b.x)>=(a.width+b.width)/2||Math.abs(a.y-b.y)>=(a.height+b.height)/2;
// These are the final F37 UI seats, not inherited four-card coordinates.
const heading={x:0,y:598,width:870,height:220},lastStop={x:295,y:-290,width:274,height:122},notice={x:0,y:-478,width:885,height:46},daily={x:0,y:-609,width:860,height:145};
assert(disjoint(heading,{x:-79,y:397,width:347,height:50}));
assert(disjoint(lastStop,notice));assert(disjoint(notice,daily));assert(daily.y-daily.height/2>=-700);
for(let i=0;i<4;i++){
 const y=346-i*212,medal={x:-317,y,width:126,height:126},status={x:-79,y:y-2,width:347,height:43},claim={x:295,y,width:274,height:122};
 assert(disjoint(medal,status));assert(disjoint(status,claim));
 if(i>0)assert(disjoint(claim,{x:295,y:y+212,width:274,height:122}));
}
const title={x:0,y:-260,width:720,height:154},facts={x:0,y:-393,width:875,height:88},play={x:0,y:-516,width:790,height:132},journey={x:0,y:-648,width:910,height:126};
for(const [a,b] of [[title,facts],[facts,play],[play,journey]])assert(disjoint(a,b),'hall title / facts / play / progress cannot collide');
const supplyAmount={x:0,y:-53,width:710,height:64},supplyBonus={x:0,y:-113,width:690,height:38},selectors={x:0,y:-276,width:816,height:180},supplyAction={x:0,y:-456,width:860,height:156};
for(const [a,b] of [[supplyAmount,supplyBonus],[supplyBonus,selectors],[selectors,supplyAction]])assert(disjoint(a,b));
for(const locale of LANGUAGES){setLanguage(locale.code);const value=tr('Base 100,000 · Gift 60,000'),fit=fittedText(value,{width:682,height:38,maximum:34,wrap:false,leading:1.05,measure:approximate});assert.equal(fit.text,value);assert(fit.size*320/1080>=9);}
const accountActionRows=[245,65,-115,-295].map(y=>({x:0,y,width:744,height:156}));for(let i=1;i<accountActionRows.length;i++)assert(disjoint(accountActionRows[i-1],accountActionRows[i]));
setLanguage('en');console.log('PASS F37 measured service actions, 320px copy, in-place hall selection lanes, journey ledger, shop showroom, rank honesty and separated account touch targets.');

// Modal exit is an explicit texture-backed key, with a >=44px mobile hit area.
assert(appSource.includes("'Close dialog',320,height/2-90,230,110,'Close'"));
assert(appSource.includes('setContentSize(230,152)'));
assert(152*320/1080>=44);
for(const height of [1000,1120,1200,1280,1340,1360,1480]){
 const close={x:320,y:height/2-90,width:230,height:152};
 assert(close.x+close.width/2<978/2);assert(close.y+close.height/2<height/2);
 assert(disjoint(close,{x:0,y:height/2-245,width:740,height:76}));
}
for(const locale of LANGUAGES){setLanguage(locale.code);const seat=plateTextBox(230,110);
 const fit=fittedText(tr('Close'),{width:seat.width-11,height:seat.height-5,maximum:41.8,wrap:false,leading:1.05,measure:approximate});
 assert.equal(fit.text,tr('Close'));assert(fit.size*320/1080>=11);
}
assert(appSource.includes("COLORS.cream,true),'#3A2415',3.5"));
assert(appSource.includes("COLORS.gold,true),'#3A2415',3.5"));
setLanguage('en');console.log('PASS visible translated modal exit and bright-background podium contrast.');

// Login fields keep legible hints within the authored enamel, not a tiny
// line-height box. Actual 320px browser screenshots must confirm the result.
assert(appSource.includes("'Text entry',0,-3.7,590,56"));
assert(appSource.includes("568,52,42,'#FFF8E7'"));
const inputSeat=plateTextBox(778,118);
inside({x:0,y:-3.7,width:590,height:56},inputSeat);
for(const locale of LANGUAGES){setLanguage(locale.code);
 for(const placeholder of ['Username','Password','Confirm password','Nickname']){
  const value=tr(placeholder),fit=fittedText(value,{width:560,height:50,maximum:42,wrap:false,leading:1.05,measure:approximate});
  assert.equal(fit.text,value);assert(fit.size*320/1080>=11.5,placeholder+' mobile hint stays legible');
 }
}
assert(appSource.includes('authSubtitle.node.getComponent(TextFit)!.compactLine=true'));
assert(appSource.includes('appleCaption.node.getComponent(TextFit)!.compactLine=true'));
setLanguage('en');console.log('PASS legible single-line login hints within measured enamel.');

// Journey completion never shows misleading over-target fractions.
assert(appSource.includes('line=lobbyJourneyCaption(next,this.services.remoteMode)'));
assert(appSource.includes('journeyStopCaption(stop)'));
for(const done of [0,1,2,3,4])for(const target of [1,2,3,4]){
 const counts=journeyCounts({roundsDone:done,rounds:target,modesDone:done,modes:target});
 assert.equal(counts.rounds,`${Math.min(done,target)}/${target}`);assert.equal(counts.modes,counts.rounds);
}
// A live login resize changes the cover, not the EditBox tree. Keyboard/IME
// input remains intact; normal responsive changes reposition the legal rail.
assert(appSource.includes('room?.getComponent(UITransform)?.setContentSize(frame.rect.width*cover,frame.rect.height*cover)'));
assert(appSource.includes('if(!keyboardFocused&&this.content)'));
assert(appSource.includes("getChildByName('Engraved legal ribbon')?.setPosition"));
for(const [w,h] of [[1080,1920],[1080,2337],[1080,1100],[1440,1920]]){
 const scale=Math.max(w/1024,h/2304);assert(1024*scale>=w&&2304*scale>=h);
}
console.log('PASS capped route fractions and non-destructive login room resize.');
