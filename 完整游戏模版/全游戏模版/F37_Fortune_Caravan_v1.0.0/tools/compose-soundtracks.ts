import fs from 'node:fs';
import {MUSIC_SCENES,themeMusic} from '../assets/scripts/audio/MusicTheme';
import {RECORDING_THEMES,musicDuration,musicKey,awardKey,finaleKey} from '../assets/scripts/audio/SoundtrackCatalog';
import {awardScore,awardFinale} from '../assets/scripts/audio/AwardScore';
import {awardTiming} from '../assets/scripts/vfx/AwardTimeline';
type MidiNote={program:number;pitch:number;at:number;duration:number;velocity:number;pan:number;percussion?:boolean;role?:'melody'|'harmony'|'bass'|'colour'|'percussion'};
type Score={name:string;duration:number;notes:MidiNote[];loopSeconds?:number;bpm?:number;style?:string};
const scores:Score[]=[];
const add=(notes:MidiNote[],program:number,pitch:number,at:number,duration:number,velocity:number,pan=0,percussion=false,role?:MidiNote['role'])=>{
 if(pitch<21||pitch>108||duration<=0)return;
 notes.push({program,pitch,at:Math.max(0,at),duration:Math.max(.045,duration),velocity:Math.min(105,Math.max(20,Math.round(velocity))),pan,...(role?{role}:{}),...(percussion?{percussion:true}:{})});
};
const drum=(notes:MidiNote[],pitch:number,at:number,velocity:number)=>add(notes,0,pitch,at,.085,velocity,0,true,'percussion');
for(const scene of MUSIC_SCENES){
 const t=themeMusic(scene),r=RECORDING_THEMES[scene],step=60/t.bpm/2,L=musicDuration(scene),notes:MidiNote[]=[];
 const [lead,answer,bass,colour]=r.programs;
 // Two cycles allow sampled release tails to settle before the loop is cut.
 // One melodic lane; answers occupy breaths, never a second competing tune.
 for(let cycle=0;cycle<2;cycle++)for(let bar=0;bar<r.bars;bar++){
  const localBar=bar%8,B=bar>=8,start=cycle*L+bar*t.eighthsPerBar*step;
  const chord=t.chords[localBar%t.chords.length];
  const pulse=(beat:number,pitch:number,velocity=36)=>add(notes,bass,pitch,start+beat*step,step*1.35,velocity,-8,false,'bass');
  const support=(beat:number,duration:number,program=answer)=>{
   // A two-note middle-register voicing, not three offbeat chord stabs.
   [chord[1],chord[3]].forEach(p=>add(notes,program,p,start+beat*step,step*duration,28,-13,false,'harmony'));
  };
  for(let beat=0;beat<t.eighthsPerBar;beat++){
   const pitch=t.melody[localBar*t.eighthsPerBar+beat];if(!pitch)continue;
   const response=B&&localBar%4===3,program=response?answer:lead;
   const next=t.melody[localBar*t.eighthsPerBar+beat+1];
   const swing=r.style==='merchant-swing'&&beat%2?.13*step:0;
   add(notes,program,pitch,start+beat*step+swing,step*(next ? .80 : 1.60),46+(beat===0?5:beat%2===0?2:0)+(B?1:0),8,false,'melody');
  }
  if(r.style==='merchant-swing'){
   pulse(0,chord[0],40);pulse(4,chord[0]+7,34);support(2,1.4);
   drum(notes,36,start,30);drum(notes,38,start+4*step,20);
  }else if(r.style==='caravan-procession'){
   pulse(0,chord[0],42);pulse(4,chord[0],36);support(2,1.3);
   drum(notes,41,start,33);drum(notes,41,start+4*step,25);drum(notes,77,start+6*step,20);
  }else if(r.style==='oasis-dance'){
   pulse(0,chord[0],34);pulse(4,chord[0]+7,30);support(0,5.0,colour);
   drum(notes,41,start,26);drum(notes,76,start+4*step,22);
  }else if(r.style==='bazaar-waltz'){
   pulse(0,chord[0],38);support(2,1.4);support(4,1.1,B?colour:answer);
   drum(notes,36,start,26);if(localBar%2===1)drum(notes,54,start+4*step,22);
  }else{
   pulse(0,chord[0],38);pulse(3,chord[0]+7,31);support(0,4.4);
   drum(notes,41,start,28);drum(notes,77,start+3*step,20);
  }
  // A small colour answer only at phrase endings, while the lead is resting.
  if(localBar===3||localBar===7){
   const last=t.eighthsPerBar-1;
   if(!t.melody[localBar*t.eighthsPerBar+last]&&!t.melody[localBar*t.eighthsPerBar+last-1])add(notes,colour,chord[2],start+last*step,step*.65,27,13,false,'colour');
  }
 }
 scores.push({name:musicKey(scene),duration:2*L+2,loopSeconds:L,bpm:t.bpm,style:r.style,notes});
 if(scene==='lobby')continue;
 const program=(instrument?:string)=>instrument==='bass'?33:instrument==='felt'?0:instrument==='harp'?46:instrument==='bell'?8:instrument==='coin'?11:instrument==='wood'?115:instrument==='strings'?48:instrument==='brass'?60:instrument===t.lead?lead:answer;
 for(let tier=0;tier<=4;tier++){
  const countEnd=awardTiming(tier).countEnd,main:MidiNote[]=[];
  for(const n of awardScore(tier,countEnd,scene,tier>0)){
   if(n.noise){if(tier>0)drum(main,t.percussion==='frame'?41:54,n.at,29+tier*3);continue;}
   add(main,program(n.instrument),Math.round(69+12*Math.log2(n.pitch/440)),n.at,n.duration*(n.instrument==='strings'?1.15:1),35+n.volume*950,(n.pan??0)*45);
  }
  // The visual-clock score already owns melody, bass and harmony.
  // Add only a quiet ceremonial pulse; no duplicate chord line or second run.
  if(tier>0){
   drum(main,49,.03,30+tier*3);
   const beats=Math.floor((countEnd-.4)/(step*4));
   for(let beat=0;beat<beats;beat++)drum(main,beat%2?41:36,.4+beat*step*4,27+tier*2);
  }
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
