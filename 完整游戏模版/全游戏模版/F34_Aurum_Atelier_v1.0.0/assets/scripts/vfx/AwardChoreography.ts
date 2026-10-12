/** Layered image-coin fountains use a measured, text-free treasure envelope.
 * A second reveal volley supplies a separate crest without a camera zoom. */
export const AWARD_CHOREOGRAPHY = [
  {stream:36, burst:28, encore:12, lift:245, flare:155},
  {stream:56, burst:42, encore:18, lift:300, flare:180},
  {stream:78, burst:58, encore:26, lift:355, flare:205},
  {stream:100, burst:76, encore:34, lift:415, flare:230},
] as const;
export interface AwardCoinSpec {delay:number;life:number;side:number;lane:number;size:number;pixels:number;burst:boolean;wave:number;sourceX:number;landingX:number;}
export interface AwardCoinEnvelope {baseY:number;floor:number;ceiling:number;scale:number;}
export function awardCoinSpec(index:number,burst:boolean,wave=0):AwardCoinSpec {
  const front=index%3===0;
  // Fixed visual scatter distributes independent throws without touching the
  // game's random source. Every path originates in the same painted treasure.
  const scatter=(index*.61803398875+(burst?.41:.17)+wave*.23)%1;
  const source=(index*.754877666+.11+wave*.31)%1;
  return {burst,wave,sourceX:239+source*42,landingX:90+scatter*350,delay:burst?(wave?.65:0)+Math.floor(index/2)*.012:(index%8)*.07+Math.floor(index/8)*.07,
    life:burst?(wave?1.28:1.48)+(index%5)*.07:1.85+(index%5)*.11,
    side:index%2?1:-1,lane:Math.floor(index/2)%7,size:.76+(index%4)*.07,
    pixels:burst?(wave?109:96)+(index%4)*7:front?112+(index%3)*6:78+(index%5)*6};
}
export function awardCoinFrame(c:AwardCoinSpec,age:number,tier:number,e:AwardCoinEnvelope){
  const cycle=c.burst?age:age%(c.life+.23);
  if(age<0||cycle<0||cycle>c.life)return {alpha:0,x:0,y:0,angle:0,sx:1,sy:1,progress:0};
  const p=cycle/c.life,sy=c.size*(.90+.10*Math.sin(p*Math.PI));
  // A diagonal coin has a larger footprint than an unrotated sprite. Reserve
  // its full enclosing square, so no rotation can enter the number plinth.
  const radius=c.pixels*sy*Math.SQRT1_2;
  const start=Math.max(e.baseY+(c.wave?24:0),e.floor+radius+32),end=Math.max(start-60,e.floor+radius+26);
  const lift=Math.max(0,Math.min((AWARD_CHOREOGRAPHY[tier].lift+c.lane*13)*(c.burst?c.wave?1.34:1.16:1)*Math.min(1.45,e.scale),e.ceiling-radius-start));
  // Inner and outer throws form a broad plume rather than identical coin
  // trains. Horizontal travel and a parabolic rise share the same clock.
  const spread=c.sourceX+(c.landingX-c.sourceX)*p;
  const x=c.side*Math.min(spread,500-radius);
  const y=start+(end-start)*p+4*p*(1-p)*lift;
  const turn=.18+.82*Math.abs(Math.cos(p*Math.PI*(c.burst?3:2)+c.lane*.39));
  return {alpha:Math.round(Math.min(1,p*11,(1-p)*5)*(c.burst?255:242)),x,y,
    angle:c.side*(c.lane*27+p*(c.burst?c.wave?345:285:175)),sx:sy*turn,sy,progress:p};
}
/** Two broad light fans emerge from the painted treasure, never the camera.
 * The second crest follows the exact reveal, including an early user tap. */
export function awardLightEnvelope(elapsed:number,resolvedAge:number,tier:number,countDuration:number){
  const buildup=Math.min(1,Math.max(0,(elapsed-.85)/Math.max(.1,countDuration-.85)));
  const pulse=(age:number,life:number)=>age>=0&&age<life?Math.sin(age/life*Math.PI):0;
  const crest=Math.min(1,pulse(resolvedAge,1.4)+pulse(resolvedAge-.65,1.65)*.70);
  return {buildup,crest,fanOpacity:Math.round(28+buildup*(25+tier*7)+crest*(76+tier*12)),
    poolOpacity:Math.round(34+buildup*32+crest*(82+tier*16)),rimOpacity:Math.round(crest*AWARD_CHOREOGRAPHY[tier].flare)};
}
