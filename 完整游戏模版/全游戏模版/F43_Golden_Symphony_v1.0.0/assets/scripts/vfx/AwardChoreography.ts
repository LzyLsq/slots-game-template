import {AWARD_REVEAL_IMPACTS} from './AwardTiming';
/** Deliberately spaced image-coin throws grow with the real award tier. */
export const AWARD_CHOREOGRAPHY = [
  {stream:30, burst:30, encore:12, lift:430, flare:145},
  {stream:40, burst:42, encore:18, lift:525, flare:175},
  {stream:50, burst:54, encore:24, lift:630, flare:200},
  {stream:60, burst:68, encore:32, lift:725, flare:225},
] as const;
export interface AwardCoinSpec {delay:number;life:number;side:number;lane:number;size:number;pixels:number;burst:boolean;wave:number;sourceX:number;landingX:number;}
export interface AwardProtectedZone {bottom:number;top:number;halfWidth:number;}
export interface AwardCoinEnvelope {baseY:number;floor:number;ceiling:number;scale:number;sideInner?:number;sideOuter?:number;protectedHalfWidth?:number;protectedZones?:AwardProtectedZone[];}
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(x:number)=>{const p=clamp(x);return p*p*(3-2*p);};
const pulse=(age:number,life:number)=>age>=0&&age<life?Math.sin(age/life*Math.PI)**2:0;
const revealPulse=(age:number,impact:number,tail:number)=>age<0?0:age<=impact?smooth(age/impact):1-smooth((age-impact)/tail);
/** Count tiers are derived from the visible payout, never from another RNG. */
export function awardCountProgress(elapsed:number,duration:number,start=.7):number {
  const p=clamp((elapsed-start)/Math.max(.1,duration-start));
  // A measured opening, a sustained count, then a short final acceleration.
  return p<.72 ? .68*smooth(p/.72) : .68+.32*smooth((p-.72)/.28);
}
export function awardVisibleTier(visibleReturn:number,chargedBet:number,finalTier:number):number {
  const ratio=chargedBet>0?visibleReturn/chargedBet:0;
  return Math.min(finalTier,ratio>=100?3:ratio>=50?2:ratio>=10?1:0);
}
/** Short material and lettering accents, separated from the two reveal crests. */
export function awardAccentEnvelope(elapsed:number,resolvedAge:number,tier:number,countDuration:number,accentAge=-1){
  const buildup=smooth((elapsed-.55)/Math.max(.1,countDuration-.55));
  const crest=Math.min(1,AWARD_REVEAL_IMPACTS.reduce((sum,at,i)=>sum+revealPulse(resolvedAge-(at-AWARD_REVEAL_IMPACTS[0]),AWARD_REVEAL_IMPACTS[0],i===2?.58:.70)*[1,.92,.92][i],0));
  const accent=pulse(accentAge,.60);
  const entrance=smooth((elapsed-.1)/.7);
  return {buildup,crest,accent,entrance,
    titleScale:.90+.10*entrance+crest*(.018+tier*.004)+accent*.02,
    titleLift:Math.round((1-entrance)*-18+accent*5+crest*3),
    amountLift:Math.round(crest*7+accent*3),
    fanOpacity:Math.round(12+buildup*(32+tier*7)+crest*(94+tier*9)+accent*32),
    poolOpacity:Math.round(26+buildup*36+crest*(86+tier*9)+accent*36),
    rimOpacity:Math.round(Math.max(crest,accent*.72)*AWARD_CHOREOGRAPHY[tier].flare)};
}
export function awardCoinSpec(index:number,burst:boolean,wave=0):AwardCoinSpec {
  const scatter=(index*.61803398875+(burst?.41:.17)+wave*.23)%1;
  const source=(index*.754877666+.11+wave*.31)%1;
  return {burst,wave,sourceX:180+source*154,landingX:150+scatter*315,
    delay:burst?(wave?AWARD_REVEAL_IMPACTS[1]-AWARD_REVEAL_IMPACTS[0]:0)+Math.floor(index/2)*.014:Math.floor(index/2)*.055,
    life:burst?(wave?1.15:1.42)+(index%5)*.055:2.15+(index%5)*.12,
    side:index%2?1:-1,lane:Math.floor(index/2)%7,size:.74+(index%4)*.065,
    pixels:burst?(wave?92:105)+(index%4)*7:index%3===0?106:84+(index%5)*6};
}
export function awardCoinFrame(c:AwardCoinSpec,age:number,tier:number,e:AwardCoinEnvelope){
  const cycle=c.burst?age:age%(c.life+.42);
  if(age<0||cycle<0||cycle>c.life)return {alpha:0,x:0,y:0,angle:0,sx:1,sy:1,progress:0};
  const p=cycle/c.life,outer=e.sideOuter??494;
  let sy=c.size*(c.burst?.84:.72)*(.90+.10*Math.sin(p*Math.PI));
  let radius=c.pixels*sy*Math.SQRT1_2;
  const start=Math.max(e.floor+radius+10,e.baseY+(c.wave?18:0));
  const lift=Math.min((AWARD_CHOREOGRAPHY[tier].lift+c.lane*24)*(c.burst?c.wave?1.13:1.22:1),e.ceiling-radius-start);
  const y=start-28*p+4*p*(1-p)*Math.max(0,lift);
  let inner=e.sideInner??0;
  for(const z of e.protectedZones??[])if(y+radius>z.bottom&&y-radius<z.top)inner=Math.max(inner,z.halfWidth+4);
  if(!e.protectedZones)inner=Math.max(inner,e.protectedHalfWidth??0);
  // The narrow meter band reduces depth slightly instead of hiding labels or
  // drawing a vertical train of coins from top to bottom.
  sy=Math.min(sy,Math.max(1,outer-inner-18)/(c.pixels*Math.SQRT2));
  radius=c.pixels*sy*Math.SQRT1_2;
  const candidate=c.sourceX+(c.landingX-c.sourceX)*p+Math.sin(p*Math.PI)*(48+c.lane*8);
  const x=c.side*Math.max(inner+radius+8,Math.min(outer-radius-8,candidate));
  const turn=.22+.78*Math.abs(Math.cos(p*Math.PI*(c.burst?2.5:1.7)+c.lane*.39));
  return {alpha:Math.round(Math.min(1,p*10,(1-p)*6)*(c.burst?248:215)),x,y,
    angle:c.side*(c.lane*29+p*(c.burst?c.wave?310:250:155)),sx:sy*turn,sy,progress:p};
}
export function awardLightEnvelope(elapsed:number,resolvedAge:number,tier:number,countDuration:number){
  return awardAccentEnvelope(elapsed,resolvedAge,tier,countDuration);
}
