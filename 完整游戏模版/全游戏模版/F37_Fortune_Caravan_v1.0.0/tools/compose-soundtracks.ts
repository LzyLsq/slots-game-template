import fs from 'node:fs';
import {MUSIC_SCENES,themeMusic} from '../assets/scripts/audio/MusicTheme';
import {RECORDING_THEMES,musicDuration,musicKey,awardKey,finaleKey} from '../assets/scripts/audio/SoundtrackCatalog';
import {awardScore,awardFinale} from '../assets/scripts/audio/AwardScore';
import {awardTiming} from '../assets/scripts/vfx/AwardTimeline';
type MidiNote={program:number;pitch:number;at:number;duration:number;velocity:number;pan:number;percussion?:boolean};
type Score={name:string;duration:number;notes:MidiNote[];loopSeconds?:number;bpm?:number;style?:string};
const scores:Score[]=[];
const add=(notes:MidiNote[],program:number,pitch:number,at:number,duration:number,velocity:number,pan=0,percussion=false)=>{
 if(pitch<21||pitch>108||duration<=0)return;
 notes.push({program,pitch,at:Math.max(0,at),duration:Math.max(.045,duration),velocity:Math.min(105,Math.max(20,Math.round(velocity))),pan,...(percussion?{percussion:true}:{})});
};
const drum=(notes:MidiNote[],pitch:number,at:number,velocity:number)=>add(notes,0,pitch,at,.085,velocity,0,true);
for(const scene of MUSIC_SCENES){
 const t=themeMusic(scene),r=RECORDING_THEMES[scene],step=60/t.bpm/2,L=musicDuration(scene),notes:MidiNote[]=[];
 const [lead,answer,bass,colour]=r.programs;
 // Render two whole performances; retain the second for natural acoustic loop tails.
 for(let cycle=0;cycle<2;cycle++)for(let bar=0;bar<r.bars;bar++){
  const localBar=bar%8,B=bar>=8,start=cycle*L+bar*t.eighthsPerBar*step;
  const chord=t.chords[localBar%t.chords.length];
  const chordStab=(at:number,duration:number,velocity:number,program=answer)=>{
   chord.slice(1).forEach((p,j)=>add(notes,program,p,at+.006*j,duration,velocity,-17));
  };
  for(let beat=0;beat<t.eighthsPerBar;beat++){
   const index=localBar*t.eighthsPerBar+beat,pitch=t.melody[index];
   const swing=r.style==='merchant-swing'&&beat%2?.19*step:0;
   const at=start+beat*step+swing,accent=beat===0?7:beat%2?-2:2;
   if(pitch){
    const response=B&&[1,3,5,7].includes(localBar),program=response?answer:lead;
    // Articulated lead + actual timbral answers, never a playback-rate variant.
    const length=r.style==='oasis-dance'?.80:r.style==='caravan-procession'?.72:r.style==='bazaar-waltz'?.90:.84;
    add(notes,program,pitch,at,step*length,57+accent+(B?3:0),program===answer?-17:12);
    if(B&&r.style==='voyage-jig'&&beat===0)add(notes,lead,pitch-12,at+.009,step*1.4,35,12);
   }
   if(r.style==='merchant-swing'){
    if(beat%2===0)add(notes,bass,chord[0]+[0,7,12,7][beat/2],at,step*1.3,54,-9);
    if([1,4,7].includes(beat))chordStab(at,step*.67,38,0);
    if(B&&[2,6].includes(beat))add(notes,colour,chord[2]+12,at,step*.82,39,21);
    drum(notes,42,at,beat%2?24:31);if([0,4].includes(beat))drum(notes,36,at,39);
    if([2,6].includes(beat))drum(notes,38,at,34);if(beat===7&&localBar%4===3)drum(notes,54,at,32);
   }else if(r.style==='caravan-procession'){
    if([0,3,4,6,7].includes(beat))add(notes,bass,chord[0]+(beat===6?12:beat===3?7:0),at,step*.80,55,-9);
    if([1,3,6].includes(beat))chordStab(at,step*.76,39);
    if(B&&[2,7].includes(beat))add(notes,colour,chord[3]+12,at,step*.8,42,22);
    drum(notes,42,at,beat%2?26:33);if([0,3,4].includes(beat))drum(notes,36,at,44);
    if([2,6].includes(beat))drum(notes,38,at,39);if(B&&beat===7)drum(notes,54,at,28);
   }else if(r.style==='oasis-dance'){
    if([0,2,4,6].includes(beat))add(notes,bass,chord[beat===0?0:beat===4?1:2],at,step*.82,44,-14);
    if(beat===0)chord.slice(1).forEach((p,j)=>add(notes,colour,p,at+.012*j,step*5.5,28,-20));
    if(B&&[1,5].includes(beat))add(notes,lead,chord[2]+12,at,step*.72,38,12);
    // Wooden blocks and light temple-drum accents; not a generic club backbeat.
    if([0,4].includes(beat))drum(notes,41,at,42);
    if([2,6].includes(beat))drum(notes,77,at,36);
    if(beat%2)drum(notes,76,at,26);drum(notes,70,at,24);
   }else if(r.style==='bazaar-waltz'){
    if([0,3].includes(beat))add(notes,colour,chord[0]+(beat===3?7:0),at,step*1.5,51,-9);
    add(notes,bass,chord[beat===0?0:1+beat%3]+(beat===5?12:0),at+.012,step*1.1,37,-18);
    if(B&&beat===3)add(notes,lead,chord[2]+12,at,step*1.2,39,12);
    if([0,3].includes(beat))drum(notes,36,at,35);
    if([2,5].includes(beat))drum(notes,54,at,29);drum(notes,70,at,23);
    if(beat===5&&localBar%4===3)drum(notes,81,at,26);
   }else{
    if([0,3].includes(beat))add(notes,bass,chord[0]+(beat===3?7:0),at,step*1.22,53,-9);
    if([1,4].includes(beat))chordStab(at,step*.82,34);
    if([2,5].includes(beat))add(notes,colour,chord[1+beat%3]+12,at,step*.9,36,23);
    drum(notes,70,at,22);if([0,3].includes(beat))drum(notes,36,at,34);
    if([2,5].includes(beat))drum(notes,54,at,27);
   }
   // Restrained turnaround fills signal the returning phrase without constant crashes.
   if(localBar%4===3&&beat===t.eighthsPerBar-1){
    drum(notes,scene==='sapphire-oasis'?76:50,at,30);
    drum(notes,scene==='sapphire-oasis'?77:47,at+step*.5,32);
   }
  }
 }
 scores.push({name:musicKey(scene),duration:2*L+2,loopSeconds:L,bpm:t.bpm,style:r.style,notes});
 if(scene==='lobby')continue;
 const program=(instrument?:string)=>instrument==='bass'?33:instrument==='felt'?0:instrument==='harp'?46:instrument==='bell'?8:instrument==='coin'?11:instrument==='wood'?115:instrument===t.lead?lead:answer;
 for(let tier=0;tier<=4;tier++){
  const countEnd=awardTiming(tier).countEnd,main:MidiNote[]=[];
  for(const n of awardScore(tier,countEnd,scene,tier>0)){
   if(n.noise){if(tier>0)drum(main,t.percussion==='frame'?41:54,n.at,29+tier*3);continue;}
   add(main,program(n.instrument),Math.round(69+12*Math.log2(n.pitch/440)),n.at,n.duration*(n.instrument==='strings'?1.15:1),35+n.volume*950,(n.pan??0)*45);
  }
  // Grade-specific victory arrangement locked to the real visual count clock.
  // The drum groove and horn stabs build together; BGM ducks underneath.
  if(tier>0){
   drum(main,49,.03,38+tier*4);
   const beats=Math.floor((countEnd-.4)/(step*2));
   for(let beat=0;beat<beats;beat++){
    const at=.4+beat*step*2,chord=t.chords[Math.floor(beat/4)%t.chords.length];
    drum(main,beat%2?38:36,at,30+tier*3);drum(main,54,at+step,23+tier*2);
    if(beat%2===0){add(main,33,chord[0],at,step*1.35,44+tier*2,-9);
     chord.slice(1).forEach((p,j)=>add(main,answer,p,at+.009*j,step*.85,34+tier*3,-18));}
    if(tier>=2&&beat%4===3)add(main,colour,chord[3]+12,at+step,step*.7,40,21);
   }
  }
  if(tier>=2)for(let j=0;j<7+tier;j++)add(main,colour,t.finale[j%t.finale.length]+12,countEnd-.75+j*.055,.26,39+j,21);
  scores.push({name:awardKey(scene,tier),duration:countEnd+.85,notes:main});
  const finale:MidiNote[]=[];
  for(const n of awardFinale(tier,scene,tier>0)){
   if(n.noise){if(tier>=1)drum(finale,49,n.at,40+tier*4);continue;}
   add(finale,program(n.instrument),Math.round(69+12*Math.log2(n.pitch/440)),n.at,n.duration*1.12,36+n.volume*1050,(n.pan??0)*48);
  }
  if(tier>0){drum(finale,36,0,42);if(tier>=2){drum(finale,54,.21,35);drum(finale,54,.41,32);}}
  scores.push({name:finaleKey(scene,tier),duration:tier===0?.65:2.25,notes:finale});
 }
}
const out=process.argv[2]??'/tmp/f37-festive-audio/scores.json';fs.writeFileSync(out,JSON.stringify(scores));console.log(`COMPOSED ${scores.length} festive sampled-instrument scores with dedicated percussion`);
