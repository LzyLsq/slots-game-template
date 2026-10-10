import assert from 'node:assert/strict';
import {winTier,winTierForRound,celebrationCaption,tierCaption,tierRules} from '../assets/scripts/vfx/WinPresentation';
import {LANGUAGES,setLanguage,tr} from '../assets/scripts/ui/Language';
import {awardStageLayout} from '../assets/scripts/vfx/AwardStageLayout';
import {CABINETS,cabinetLayout,imagePoint} from '../assets/scripts/ui/CabinetGeometry';
import {AWARD_CHOREOGRAPHY,awardCoinSpec,awardCoinFrame,awardLightEnvelope} from '../assets/scripts/vfx/AwardChoreography';

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
const modes=['sun-lion','emerald-elephant','lotus-koi','moon-fox'] as const;
for(const height of [1917,1920,2160,2337,2430])for(let theme=0;theme<4;theme++){
  const g=CABINETS[modes[theme]],placement=cabinetLayout(1080,height,g);
  const l=awardStageLayout(theme,height,1080,{...placement,hintY:-height/2+(height<2050?48:116)});
  const top=l.screen.y+l.screen.height/2,bottom=l.screen.y-l.screen.height/2;
  assert.equal(l.scale,placement.scale,'award uses the live cabinet scale');
  assert.equal(l.y,placement.y,'award keeps the live cabinet origin');
  assert(l.titleY+l.titleHeight/2<=top-12,'artwork remains inside the real reel opening');
  assert(l.titleWidth<l.screen.width-180,'reel result remains visible beside the artwork');
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
      assert(Math.abs(f.x)-halfWidth>e.protectedHalfWidth,'rotated coin stays outside award lettering');
      assert(Math.abs(f.x)+halfWidth<=e.sideOuter+.01,'rotated coin remains inside its cabinet rail');
      assert(f.sx>0&&f.sy>0&&f.alpha<=255,'valid rendered transform');
    }
    if(burst)assert.equal(awardCoinFrame(c,2.5-c.delay,tier,e).alpha,0,'volley finishes within the hold');
  }
}
console.log('PASS all three coin layers across four tiers and cabinets: full rotated bounds clear the award copy; both volleys finish before exit.');

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
