import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {containTextBox,fittedText,plateSections,plateTextBox,textGlyphs,type TextBox} from '../assets/scripts/ui/TextLayout';
import {LANGUAGES,setLanguage,tr} from '../assets/scripts/ui/Language';
const inside=(rect:TextBox,bounds:TextBox)=>{
 for(const axis of ['x','y'] as const){const size=axis==='x'?'width':'height';assert(rect[axis]-rect[size]/2>=bounds[axis]-bounds[size]/2-1e-8);assert(rect[axis]+rect[size]/2<=bounds[axis]+bounds[size]/2+1e-8);}
};
// Every source pixel is sampled once: the old centre repeated the right shoulder.
for(const [width,height] of [[244,144],[744,122],[990,238],[958,344],[430,146],[525,107]]){
 const parts=plateSections(width,height);assert.equal(parts.reduce((n,p)=>n+p.width,0),width);
 let source=0;for(const part of parts){assert.equal(part.sourceX,source);source+=part.sourceWidth;}assert.equal(source,832);
 const quiet=plateTextBox(width,height);assert(quiet.width>width*.5);assert(quiet.height<height*.4);
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
 {name:'Check in',copy:'CLAIM DAY 7 · 3,800',minimum:11},
 {name:'Claim daily',copy:'Collect daily gift',minimum:10.5},
 {name:'Explore games',copy:'Explore the mint',minimum:11},
 {name:'Edit nickname',copy:'Edit name',minimum:11},
 {name:'Open coin history',copy:'View history',minimum:11},
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
  assert.equal(fit.text,value);assert(fit.size*568/1920>=action.minimum,`${action.name}: ${locale.code} is too small on 320×568`);
 }
}
setLanguage('en');
assert(appSource.includes("this.services.remoteMode?'PLAYERS · TOTAL WON':'VIRTUAL FRIENDS · TOTAL WON'"),'live players are not mislabelled as virtual friends');
const disjoint=(a:{x:number;y:number;width:number;height:number},b:{x:number;y:number;width:number;height:number})=>Math.abs(a.x-b.x)>=(a.width+b.width)/2||Math.abs(a.y-b.y)>=(a.height+b.height)/2;
// Real reward action rectangles, status/reset copy and bottom navigation.
const checkIn={x:0,y:-322,width:836,height:168},day7={x:0,y:-94,width:430,height:146},reset={x:0,y:-430,width:750,height:38};
const dailyHeader={x:109,y:-476,width:573,height:50},dailyAction={x:109,y:-604,width:660,height:156};
for(const [a,b] of [[checkIn,day7],[checkIn,reset],[reset,dailyHeader],[dailyHeader,dailyAction]])assert(disjoint(a,b));
assert(dailyAction.y-dailyAction.height/2>=-700,'daily claim stays above the service-stage/dock boundary');
// Supply art and every text lane stay separate, even for the last full amount.
const supply={x:-330,y:0,width:90,height:90},supplyAmount={x:-26,y:44,width:468,height:52},supplyBonus={x:-26,y:0,width:468,height:36},supplyDetail={x:26,y:-48,width:568,height:42},supplyPrice={x:293,y:0,width:150,height:52};
for(const a of [supplyAmount,supplyBonus,supplyDetail,supplyPrice])assert(disjoint(supply,a));
for(const a of [supplyAmount,supplyBonus,supplyDetail])assert(disjoint(supplyPrice,a));
for(const locale of LANGUAGES){setLanguage(locale.code);const value=tr('Base 100,000 · Gift 60,000'),fit=fittedText(value,{width:560,height:40,maximum:32,wrap:false,leading:1.05,measure:approximate});assert.equal(fit.text,value);assert(fit.size*568/1920>=9,'exact shop detail must be legible');}
setLanguage('en');
console.log('PASS service UI: five-language action legibility, reward/dock separation, exact supply columns, truthful remote-rank heading.');

// Reset information uses the same compact line, not paragraph leading.
assert(appSource.includes("this.compactCaption(outlined(text(stage,'Rewards reset at 00:00 UTC',0,-430,750,38,30"));
for(const locale of LANGUAGES){setLanguage(locale.code);const value=tr('Rewards reset at 00:00 UTC');const fit=fittedText(value,{width:738,height:32,maximum:30,wrap:false,leading:1.05,measure:approximate});assert(fit.size*568/1920>=8.8);}
// Match the actual service-frame source. Their upper relief stays in place
// while the enamel extends below the text: no squashing the bitmap carving.
const storeSource=appSource.slice(appSource.indexOf('private storePage()'),appSource.indexOf('private async purchase('));
const profileSource=appSource.slice(appSource.indexOf('private profilePage()'),appSource.indexOf('private accountOptions()'));
assert(storeSource.includes("this.art.image(stage,'canopy-frame-0',0,-99,934,1138)"));
assert(profileSource.includes("this.art.image(stage,'canopy-frame-0',0,-76,940,1210)"));
assert.equal(-99+1138/2,470);assert.equal(-76+1210/2,529);
assert(storeSource.includes("'canopy-soft-plate-0',0,-526,840,156"));
assert(-526-156/2>=-700);
const accountActionRows=[245,65,-115,-295].map(y=>({x:0,y,width:744,height:156}));
for(let i=1;i<accountActionRows.length;i++)assert(disjoint(accountActionRows[i-1],accountActionRows[i]));
setLanguage('en');
console.log('PASS carved relief clearance, readable reset line and separated account-option touch targets.');
