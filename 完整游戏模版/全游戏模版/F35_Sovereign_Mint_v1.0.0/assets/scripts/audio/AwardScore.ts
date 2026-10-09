import {midi,themeMusic,type Instrument} from './MusicTheme';
/** Original theme-matched score, scheduled from the visual clock rather than timers. */
export interface AwardNote{at:number;pitch:number;duration:number;volume:number;wave:OscillatorType;instrument?:Instrument;pan?:number;noise?:boolean;noiseCutoff?:number}
export interface AwardSoundtrack{update(elapsed:number):void;finish():void;stop():void}
export function awardFinale(tier:number,scene:string,profitable=true):AwardNote[]{
 const theme=themeMusic(scene),notes:AwardNote[]=[];
 if(!profitable)return [{at:0,pitch:midi(theme.award[0]),duration:.22,volume:.018,wave:'sine',instrument:'felt'}];
 theme.finale.forEach((pitch,i)=>notes.push({pitch:midi(pitch),at:i*.026,duration:tier?1.12:.42,volume:i<2?.014:.020,wave:'sine',instrument:i<2?'bass':theme.backing,pan:(i%3-1)*.22}));
 if(tier>=2){
  theme.award.slice(-3).forEach((pitch,i)=>notes.push({pitch:midi(pitch),at:.20+i*.10,duration:.6,volume:.015,wave:'sine',instrument:theme.lead,pan:.2}));
  notes.push({at:0,pitch:0,duration:.62,volume:.019,wave:'sine',noise:true,noiseCutoff:theme.percussion==='brush'?4200:2800});
  // The second ring of gold answers with a theme-specific upper chord, not a louder beep.
  theme.finale.slice(-3).forEach((pitch,i)=>notes.push({pitch:midi(pitch+12),at:.55+i*.035,duration:.9,volume:.010,wave:'sine',instrument:theme.backing,pan:(i-1)*.3}));
  notes.push({pitch:midi(theme.award[theme.award.length-1]+12),at:.64,duration:.75,volume:.010,wave:'sine',instrument:'bell',pan:-.2});
 }
 return notes;
}
export function awardScore(tier:number,countEnd:number,scene:string,profitable=true):AwardNote[]{
 const t=Number.isFinite(tier)?Math.max(0,Math.min(4,Math.floor(tier))):0,theme=themeMusic(scene),notes:AwardNote[]=[];
 const add=(pitch:number,at:number,duration:number,volume:number,instrument:Instrument,pan=0)=>notes.push({pitch:midi(pitch),at,duration,volume,wave:'sine',instrument,pan});
 if(t===0){
  // Partial return / break-even has a quiet acknowledgement, never a victory fanfare.
  const motif=profitable?theme.award.slice(0,3):theme.award.slice(0,2);
  motif.forEach((pitch,i)=>add(pitch,i*.14,.22,profitable?.023:.012,profitable?theme.lead:'felt'));
  if(profitable)for(let i=0;i<3;i++)add(theme.award[2]+12,.22+i*.14,.075,.006,'coin',(i%2?1:-1)*.18);
 }else{
  const root=theme.chords[0][0];add(root,0,.64,.025,'bass');
  // A character-specific pickup: hammered gold, plucked jade, flowing pearl, regal ruby.
  theme.award.slice(0,3).forEach((pitch,i)=>add(pitch,.08+i*.15,.40,.017,theme.lead,(i-1)*.15));
  const phrase=t>=2?[...theme.award,...theme.award.slice(-4)]:theme.award;
  const step=(countEnd-.74)/phrase.length;
  phrase.forEach((pitch,i)=>{
   const at=.67+i*step;add(pitch,at,Math.min(.43,step*1.35),.021,theme.lead,.16);
   if(i%3===0)add(pitch+12,at+.065,.19,.0037,'bell',.3);
   if(i%4===0){
    const chord=theme.chords[Math.floor(i/4)%theme.chords.length];
    add(chord[0],at,.64,.018,'bass',-.15);add(chord[2],at+.035,.52,.009,theme.backing,-.24);add(chord[3],at+.065,.47,.008,theme.backing,.24);
   }
   if(i%2===0){
    if(theme.percussion==='wood')add(50,at+.025,.075,.009,'wood',-.1);
    else notes.push({at:at+.02,pitch:0,duration:theme.percussion==='frame'?.15:.10,volume:theme.percussion==='brush'?.007:.011,wave:'sine',noise:true,noiseCutoff:theme.percussion==='brush'?4500:theme.percussion==='frame'?500:2100});
   }
  });
  // An ascending pickup leads into the visible double-bloom cadence.
  if(t>=2)for(let i=0;i<6;i++){const pitch=theme.award[(theme.award.length-6+i+theme.award.length)%theme.award.length];add(pitch+12,countEnd-.82+i*.11,.20,.010,theme.lead,(i%2?1:-1)*.3);}
  const ticks=10+t*3;
  for(let i=0;i<ticks;i++){const p=i/ticks,at=1+(countEnd-1)*Math.pow(p,.82);add(theme.award[i%3]+12,at,.075,.006,'coin',(i%2?1:-1)*.28);}
 }
 return notes.filter(n=>n.at<countEnd).sort((a,b)=>a.at-b.at);
}
