import {AWARD_REVEAL_IMPACTS, AWARD_HOLD_SECONDS} from '../assets/scripts/vfx/AwardTiming';
import assert from 'node:assert/strict';
import {awardDigitLayout} from '../assets/scripts/vfx/AwardDigitLayout';
import {ART_CROPS} from '../assets/scripts/ui/SymbolCrop';
import {winTier,winTierForRound,celebrationCaption,tierCaption,tierRules} from '../assets/scripts/vfx/WinPresentation';
import {LANGUAGES,setLanguage,tr} from '../assets/scripts/ui/Language';
import {awardStageLayout} from '../assets/scripts/vfx/AwardStageLayout';
import {CABINETS,cabinetLayout,imagePoint} from '../assets/scripts/ui/CabinetGeometry';
import {AWARD_CHOREOGRAPHY,awardCoinSpec,awardCoinFrame,awardLightEnvelope,awardCountProgress,awardVisibleTier,awardAccentEnvelope,awardRailPulse} from '../assets/scripts/vfx/AwardChoreography';

for(const bet of [1,5,80,500,10000]){
  for(const [payout,tier] of [[0,0],[bet*.2,0],[bet,0],[bet+.001,1],[bet*1.01,1],[bet*9.999,1],[bet*10,2],[bet*49.999,2],[bet*50,3],[bet*99.999,3],[bet*100,4],[bet*1000,4]]){
    assert.equal(winTierForRound(payout,bet),tier,`payout=${payout}, charged bet=${bet}`);
  }
}
// A restored stake cannot be silently replaced by the currently displayed bet.
assert.equal(winTierForRound(81,80),1);assert.equal(winTierForRound(81,500),0);
for(const invalid of [NaN,Infinity,-1])assert.equal(winTier(invalid),0);
assert.equal(winTierForRound(100,0),0);
assert.equal(winTier(1),0);assert.equal(winTier(1+Number.EPSILON),1);
for(const {code} of LANGUAGES){
  setLanguage(code);assert.ok(tierRules().length>50);
  assert.ok(celebrationCaption(1.01).length>0);
  for(const ratio of [10,50,100]){
    assert.ok(celebrationCaption(ratio).includes(String(ratio)),`${code}: higher-tier threshold`);
    assert.ok(tierCaption(ratio).includes(String(ratio)));
  }
  assert.ok(celebrationCaption(7,true).length>0);
  if(code!=='en')assert.notEqual(tr('Total return'),'Total return',`${code}: payout label translated`);
}
setLanguage('en');assert.equal(celebrationCaption(1.01),'RETURN EXCEEDS BET');
assert.ok(tierRules().includes('strictly greater'));assert.ok(tierRules().includes('including break-even'));
const modes=['golden-otter','moon-rabbit','star-fox','cloud-elephant'] as const;
for(const height of [1917,1920,2160,2337,2430])for(let theme=0;theme<4;theme++){
  const g=CABINETS[modes[theme]],placement=cabinetLayout(1080,height,g);
  const l=awardStageLayout(theme,height,1080,{...placement,hintY:-height/2+(height<2050?48:116)});
  const top=l.screen.y+l.screen.height/2,bottom=l.screen.y-l.screen.height/2;
  assert.equal(l.scale,placement.scale,'award uses the live cabinet scale');
  assert.equal(l.y,placement.y,'award keeps the live cabinet origin');
  assert(l.titleY+l.titleHeight/2+14<=imagePoint(g.title)[1]+g.title[3]/2+160,'prize crown clears the guardian shelf above the original marquee');
  assert(l.titleY-l.titleHeight/2<imagePoint(g.title)[1],'prize lettering overlaps its original marquee mount');
  assert(l.titleWidth<=g.title[2]-12,'award lettering stays within the original marquee side trims');
  assert(l.titleWidth>=480,'large award title stays readable on short phones');
  assert(l.captionY+23<l.titleY-l.titleHeight/2,'caption clear of title');
  assert(l.amount.y+l.amountHeight/2<l.captionY-23,'amount clear of caption');
  assert(l.amount.y-l.amountHeight/2>=bottom+12,'payout stays inside the glass');
  assert.deepEqual([l.collectX,l.collectY],imagePoint(g.spin),'continue belongs to the physical SPIN key');
  assert.deepEqual([l.wallet.x,l.wallet.y],imagePoint(g.balance),'coin resolution targets the real balance meter');
  assert(l.y+(l.collectY-l.collectHeight/2)*l.scale>l.hintY+44,'floor instructions stay below the console');
}
console.log('PASS strict charged-bet boundaries, retained tiers, translated captions and cabinet-anchored award text across phone proportions.');

// Sample all throws through a full multi-loop celebration. Measure complete
// rotated sprites so large coins cannot cross the readable glass or leave the rails.
for(const height of [1917,2337])for(let theme=0;theme<4;theme++)for(let tier=0;tier<4;tier++) {
  const l=awardStageLayout(theme,height),e=l.coins;
  const choreography=AWARD_CHOREOGRAPHY[tier];
  for(const [burst,wave,total] of [[false,0,choreography.stream],[true,0,choreography.burst],[true,1,choreography.encore]] as const)for(let i=0;i<total;i++){
    const c=awardCoinSpec(i,burst,wave);
    for(let t=-.1;t<8;t+=.025){
      const f=awardCoinFrame(c,t-c.delay,tier,e);
      if(!f.alpha)continue;
      const radians=f.angle*Math.PI/180,cos=Math.abs(Math.cos(radians)),sin=Math.abs(Math.sin(radians));
      const halfWidth=c.pixels/2*(f.sx*cos+f.sy*sin),halfHeight=c.pixels/2*(f.sx*sin+f.sy*cos);
      assert(f.y-halfHeight>e.floor,'rotated coin stays above the treasure shelf floor');
      assert(f.y+halfHeight<=e.ceiling+.01,'rotated coin stays below the crown');
      for(const z of e.protectedZones){
        if(f.y+halfHeight>z.bottom&&f.y-halfHeight<z.top)
          assert(Math.abs(f.x)-halfWidth>z.halfWidth,'rotated coin avoids complete award text, wallet and controls');
      }
      assert(Math.abs(f.x)+halfWidth<=e.sideOuter+.01,'rotated coin remains inside its cabinet rail');
      assert(f.sx>0&&f.sy>0&&f.alpha<=255,'valid rendered transform');
    }
    if(burst)assert.equal(awardCoinFrame(c,2.5-c.delay,tier,e).alpha,0,'volley finishes within the hold');
  }
}
console.log('PASS all three coin layers across four tiers and cabinets: full rotated bounds clear every reading/control band; both volleys finish before exit.');

// Both automatic and early reveals retain valid image lighting through exit.
for(let tier=0;tier<4;tier++)for(const revealAt of [.15,3.1,5.3]){
  let lateCrest=0;
  for(let elapsed=0;elapsed<revealAt+2.5;elapsed+=.025){
    const age=elapsed>=revealAt?elapsed-revealAt:-1,f=awardLightEnvelope(elapsed,age,tier,5.3);
    for(const alpha of [f.fanOpacity,f.poolOpacity,f.rimOpacity])assert(Number.isFinite(alpha)&&alpha>=0&&alpha<=255,'valid image light intensity');
    if(age>=.65)lateCrest=Math.max(lateCrest,f.crest);
  }
  assert(lateCrest>.8,'second reveal crest remains visible after early or automatic reveal');
}
console.log('PASS paired light crests after early and automatic reveals; all opacity values remain in the render range.');

// Check the visible counter and its genuine 10/50/100× milestones; an early
// reveal must jump straight to the final tier without adding a wallet credit.
for(const ratio of [2,10,12,50,55,100,110]){
  const final=winTier(ratio)-1,duration=[3.1,4,4.7,5.3][final];let previous=0,previousTier=0;
  for(let t=0;t<=duration+.01;t+=.01){
    const p=awardCountProgress(t,duration);assert(p>=previous-1e-9&&p>=0&&p<=1);previous=p;
    const visible=Math.floor(80*ratio*p),tier=awardVisibleTier(visible,80,final);
    assert(tier>=previousTier&&tier<=final);previousTier=tier;
    if(tier>0)assert(visible>=80*[1,10,50,100][tier],'upgrade follows an actually counted payout threshold');
  }
  assert.equal(awardVisibleTier(80*ratio,80,final),final);assert.equal(awardCountProgress(duration,duration),1);
}
for(let tier=0;tier<4;tier++)for(let t=0;t<2.5;t+=.01){
 const f=awardAccentEnvelope(3+t,t,tier,5.3,t);
 assert(f.titleScale>=.9&&f.titleScale<1.06,'title accent remains within measured mount clearance');
 assert(Number.isInteger(f.titleLift)&&Number.isInteger(f.amountLift),'text/art settle at integer positions');
}
console.log('PASS measured count, genuine tier upgrades, bounded title accents and integer payout motion.');

// Music's authored impact markers are also the light crests. A settle tail
// must clear the glass before automatic collection, even after an early reveal.
for(let tier=0;tier<4;tier++) {
  for(const impact of AWARD_REVEAL_IMPACTS) {
    const crest=awardLightEnvelope(5.3+impact,impact,tier,5.3).crest;
    assert(crest>=.9,'musical brass attack coincides with a full visual crest');
    assert(awardLightEnvelope(5.3+impact-.08,impact-.08,tier,5.3).crest<crest,'light approaches its attack');
    assert(awardLightEnvelope(5.3+impact+.08,impact+.08,tier,5.3).crest<crest,'light decays after its attack');
  }
  assert.equal(awardLightEnvelope(7.8,AWARD_HOLD_SECONDS,tier,5.3).crest,0,'light settles before collection');
}
console.log('PASS shared musical impact markers, two material crests and complete light decay before collection.');

// Actual F44 comma/dot cells are as tall as numerals. They must remain small
// baseline punctuation, and changing numeral values must not pump the counter.
const glyphs=ART_CROPS['festival-gold-digits-v2'].map(r=>({width:r[2],height:r[3]}));
for(const width of [220,460,760])for(const reserve of ['12,106','12,345,678.901']){
  for(const value of ['0','2,121','9,999','12,106','12,345,678.901']){
    const layout=awardDigitLayout(value,reserve,glyphs,width,150);
    for(const g of layout){
      assert(g.x-g.width/2>=-width/2-1e-8&&g.x+g.width/2<=width/2+1e-8);
      assert(g.y-g.height/2>=-75-1e-8&&g.y+g.height/2<=75+1e-8);
      if(g.index>=10){
        const digits=layout.filter(n=>n.index<10);
        assert(g.height<Math.min(...digits.map(n=>n.height))*.30,'separator cannot look like another numeral');
        assert(g.y<0,'punctuation shares the numeral baseline');
      }
    }
  }
  const first=awardDigitLayout('11,111',reserve,glyphs,width,150);
  const second=awardDigitLayout('88,888',reserve,glyphs,width,150);
  assert.deepEqual(first.map(g=>g.x),second.map(g=>g.x),'tabular numeral centers stay stable during count');
  for(let i=0;i<first.length;i++)assert(Math.abs(first[i].height/glyphs[first[i].index].height-second[i].height/glyphs[second[i].index].height)<1e-8,'counter keeps the final payout scale');
}
console.log('PASS real gold glyph punctuation, stable counter spacing and long decimal amount bounds.');

// A treasury ignition must travel through the rails. The two final musical
// attacks remain separate, and every lamp has a completely dark tail.
for(const rank of [0,.25,.5,.75,1]) {
  let peak=0;
  for(let t=0;t<1.6;t+=.01){const v=awardRailPulse(t,-1,rank);assert(v>=0&&v<=1);peak=Math.max(peak,v);}
  assert(peak>.69,'every rail segment participates in the opening');
  let finalPeak=0;
  for(let t=0;t<2.5;t+=.01)finalPeak=Math.max(finalPeak,awardRailPulse(8+t,t,rank));
  assert(finalPeak>.99,'every rail segment receives the reveal response');
  assert.equal(awardRailPulse(8,2.5,rank),0,'no residual stage lamps after collection');
}
assert.equal(awardRailPulse(.54,-1,1),0,'crown ignition follows treasury instead of blinking in unison');
assert(awardRailPulse(.54,-1,0)>.65,'treasury starts the ascent');
console.log('PASS treasury-to-crown lamp choreography, separated final responses and clean tails.');
