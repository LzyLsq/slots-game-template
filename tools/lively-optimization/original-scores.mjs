/** Each title has a written hook, metre, harmonic path and accompaniment.
 * Shared rendering/lifecycle does not mean a shared musical composition.
 * GM programs are zero-based; all recordings are rendered offline.
 */
const themes = {
  13: { name:'Harvest picnic', feel:'acoustic folk', bpm:112, meter:4, key:55, lead:73, answer:105, comp:24, bass:32, pad:45, drum:'folk', backing:'pluck',
    chords:[0,5,0,7,9,5,2,7], minor:[4], a:[4,7,9,7,4,2,0,2], b:[9,12,11,9,7,4,2,0], rhythm:[0,.5,1.5,2.5], pulse:[0,.5,2,2.5] },
  14: { name:'Cloud Crown sky waltz', feel:'celesta and harp 3/4', bpm:126, meter:3, key:60, lead:8, answer:73, comp:46, bass:43, pad:48, drum:'none', backing:'harp',
    chords:[0,9,5,7,0,5,2,7], minor:[1], a:[7,12,9,4,7,2,4,0], b:[12,14,16,14,9,7,4,2], rhythm:[0,.5,1.5,2.25], pulse:[0,1,2] },
  15: { name:'Honey bee polka', feel:'accordion and clarinet polka', bpm:116, meter:2, key:53, lead:21, answer:71, comp:24, bass:58, pad:45, drum:'polka', backing:'oompah',
    chords:[0,7,0,5,0,9,7,0], minor:[5], a:[0,4,7,9,7,5,4,2], b:[12,9,7,4,5,4,2,0], rhythm:[0,.5,1,1.5], pulse:[0,1] },
  16: { name:'Treasure street samba', feel:'brass samba and hand percussion', bpm:108, meter:4, key:58, lead:56, answer:65, comp:12, bass:33, pad:48, drum:'samba', backing:'syncopated',
    chords:[0,5,2,7,9,2,7,0], minor:[2,4,5], a:[4,7,9,12,9,7,5,4], b:[7,10,12,14,12,9,7,4], rhythm:[.25,1,1.75,3], pulse:[0,.75,2,2.75] },
  17: { name:'Caravan moonlit road', feel:'nylon guitar, flute and frame drum', bpm:100, meter:4, key:57, lead:24, answer:75, comp:104, bass:32, pad:89, drum:'caravan', backing:'desert',
    chords:[0,5,7,0,9,5,7,0], minor:[0,3,4,7], a:[0,2,3,7,8,7,3,2], b:[12,10,8,7,3,5,7,0], rhythm:[0,.75,1.5,3], pulse:[0,1.5,2.5] },
  18: { name:'Gilded Express lounge', feel:'clarinet swing and walking upright bass', bpm:118, meter:4, key:53, lead:71, answer:11, comp:0, bass:32, pad:66, drum:'swing', backing:'swing',
    chords:[0,9,2,7,4,9,2,7], minor:[1,2,4,5,6], a:[4,7,10,9,7,4,2,0], b:[9,10,12,14,12,10,7,4], rhythm:[0,2/3,1+2/3,3], pulse:[0,1,2,3] },
  19: { name:'Treasury jewel minuet', feel:'harpsichord and oboe chamber minuet', bpm:120, meter:3, key:62, lead:6, answer:68, comp:42, bass:42, pad:48, drum:'none', backing:'minuet',
    chords:[0,7,9,4,5,0,7,0], minor:[2,3], a:[4,2,0,7,5,4,2,0], b:[7,9,11,12,9,7,5,4], rhythm:[0,1,1.5,2.5], pulse:[0,1,2] },
  21: { name:'Royal Jubilee ballroom', feel:'French horn and orchestral waltz', bpm:144, meter:3, key:55, lead:60, answer:40, comp:48, bass:43, pad:46, drum:'waltz', backing:'waltz',
    chords:[0,5,7,0,9,2,7,0], minor:[4,5], a:[7,4,9,7,12,11,9,7], b:[12,16,14,12,11,9,7,0], rhythm:[0,1.5,2,2.5], pulse:[0,1,2] },
  22: { name:'Celestial stargazer', feel:'sparkling arpeggiator and spacious synth', bpm:88, meter:4, key:59, lead:98, answer:10, comp:88, bass:38, pad:91, drum:'space', backing:'arpeggio',
    chords:[0,5,9,7,0,2,5,7], minor:[2,5], a:[12,7,14,9,16,14,7,12], b:[19,16,14,12,9,14,16,12], rhythm:[0,1.5,2.75,3.5], pulse:[0,.5,1,1.5,2,2.5,3,3.5] },
  23: { name:'Lamp bazaar dance', feel:'dulcimer and reed bazaar dance', bpm:112, meter:4, key:55, lead:15, answer:69, comp:104, bass:32, pad:45, drum:'bazaar', backing:'desert',
    chords:[0,7,5,0,5,7,0,7], minor:[0,2,3,4,6], a:[7,8,7,3,2,0,2,3], b:[12,11,8,7,5,3,2,0], rhythm:[0,.5,1.25,2.75], pulse:[0,1,2.5,3.5] },
  24: { name:'Atelier afternoon bossa', feel:'warm piano and nylon guitar bossa', bpm:104, meter:4, key:60, lead:0, answer:24, comp:4, bass:32, pad:45, drum:'bossa', backing:'bossa',
    chords:[0,9,2,7,4,9,2,7], minor:[1,2,4,5,6], a:[7,9,11,7,4,5,2,4], b:[12,11,9,7,9,5,4,2], rhythm:[.5,1.75,2.5,3.25], pulse:[0,1.5,2,3.5] },
  26: { name:'Fortune Tides island party', feel:'steel drums and calypso guitar', bpm:110, meter:4, key:62, lead:114, answer:73, comp:25, bass:33, pad:89, drum:'calypso', backing:'offbeat',
    chords:[0,5,7,0,9,5,7,0], minor:[4], a:[0,7,9,7,4,7,2,4], b:[12,9,7,12,14,12,9,7], rhythm:[0,.75,1.5,2.5], pulse:[.5,1.5,2.5,3.5] },
  27: { name:'Sovereign palace promenade', feel:'ceremonial trumpet and pizzicato march', bpm:100, meter:2, key:58, lead:56, answer:68, comp:45, bass:58, pad:48, drum:'march', backing:'march',
    chords:[0,0,5,7,9,5,7,0], minor:[4], a:[0,0,7,4,5,7,9,7], b:[12,12,14,11,9,7,5,4], rhythm:[0,.75,1,1.5], pulse:[0,1] },
  29: { name:'Jade Lantern lantern walk', feel:'pentatonic flute and plucked zither', bpm:96, meter:4, key:62, lead:75, answer:107, comp:15, bass:43, pad:48, drum:'jade', backing:'zither',
    chords:[0,5,0,7,9,5,0,7], minor:[4], a:[0,2,7,9,7,4,2,4], b:[12,9,14,12,7,9,4,2], rhythm:[0,.5,1.5,3], pulse:[0,.75,2,3] },
  30: { name:'Clockwork tiny automaton', feel:'staccato music box and bassoon clockwork', bpm:108, meter:4, key:60, lead:10, answer:70, comp:6, bass:42, pad:45, drum:'clock', backing:'clock',
    chords:[0,7,9,4,5,0,2,7], minor:[2,3,6], a:[0,7,4,11,9,2,7,4], b:[12,7,14,9,16,11,12,7], rhythm:[0,.5,1.5,2.5], pulse:[0,.5,1,1.5,2,2.5,3,3.5] },
  31: { name:'Carnival carousel parade', feel:'fairground organ, banjo and brass', bpm:124, meter:2, key:55, lead:20, answer:57, comp:105, bass:58, pad:48, drum:'march', backing:'oompah',
    chords:[0,7,0,5,9,5,7,0], minor:[4], a:[7,9,7,4,12,11,9,7], b:[4,5,7,12,14,12,7,0], rhythm:[0,.5,.75,1.5], pulse:[0,1] },
  33: { name:'Library enchanted pages', feel:'storybook harp and clarinet 6/8', bpm:132, meter:3, key:57, lead:46, answer:71, comp:8, bass:42, pad:48, drum:'none', backing:'storybook',
    chords:[0,9,5,7,4,9,2,7], minor:[1,4,5,6], a:[4,7,12,11,9,7,4,2], b:[9,12,14,16,14,11,7,4], rhythm:[0,.5,1.5,2], pulse:[0,.5,1,1.5,2,2.5] },
};
const instrument=(program,volume,pan=0,percussion=false)=>({program,volume,pan,percussion});
export const musicalThemes=themes;
export function compose(p,kind) {
  const t=themes[p.id];if(!t)throw Error(`No original musical theme for F${p.id}`);
  const loop=kind.startsWith('music-'),home=kind==='music-home';
  const rank=['win-small','win-big','win-mega','win-epic','win-super'].indexOf(kind);
  if(!loop&&rank<0)throw Error('Unknown score '+kind);
  const bpm=t.bpm,beat=60/bpm,bars=home?16:12;
  const softRegister=[14,19,22,29,30,33].includes(p.id)?0:12;
  const beats=loop?bars*t.meter:[t.meter,2*t.meter,3*t.meter,4*t.meter,5*t.meter][rank];
  const s={id:kind,title:`F${p.id} ${t.name} — ${kind}`,description:`${t.feel}; ${t.meter}/4; independently written A/B hooks, harmony and accompaniment.`,bpm,meter:t.meter,theme:t.name,loop,duration:beats*beat+(loop?0:.8),
    instruments:[instrument(t.lead,.72,-.1),instrument(t.answer,.53,.18),instrument(t.comp,.39,-.25),instrument(t.bass,.59),instrument(t.pad,.25,.2),instrument(0,.37,-.05,true)],notes:[]};
  const note=(i,pitch,b,len,v=65)=>{
    if(b>=beats||len<=0)return;
    s.notes.push({instrument:i,note:Math.max(28,Math.min(108,Math.round(pitch))),time:b*beat,duration:Math.min(len,beats-b)*beat,velocity:v});
  };
  const chord=(i,pitches,b,len,v)=>pitches.forEach((n,j)=>note(i,n,b+j*.008,len,v));
  const harmony=bar=>{const k=bar%8,root=t.key+t.chords[k],minor=t.minor.includes(k);return [root,root+(minor?3:4),root+7];};
  function drums(b,quiet=false){
    const v=quiet?29:44,m=t.meter;
    if(t.drum==='none')return;
    if(t.drum==='samba'||t.drum==='bazaar'||t.drum==='caravan'||t.drum==='jade'){
      const pattern=t.drum==='samba'?[0,.75,1.5,2,2.75,3.5]:t.drum==='jade'?[0,1.5,3]:t.drum==='caravan'?[0,1.5,2,3.5]:[0,.5,1.25,2.5,3.5];
      pattern.forEach((x,j)=>note(5,[64,69,62,63][j%4],b+x,.09,v+(j%2?0:9)));return;
    }
    if(t.drum==='space'){[.5,2.5].forEach(x=>note(5,54,b+x,.1,v-6));note(5,36,b,.12,v);return;}
    if(t.drum==='clock'){for(let j=0;j<8;j++)note(5,j%2?76:77,b+j*.5,.06,v-6);return;}
    if(t.drum==='bossa'||t.drum==='calypso'){
      [0,1.5,2.5].forEach(x=>note(5,36,b+x,.1,v));[1,3].forEach(x=>note(5,37,b+x,.1,v));[.5,1.5,2.5,3.5].forEach(x=>note(5,69,b+x,.07,v-10));return;
    }
    for(let j=0;j<m;j++){
      note(5,j%2?37:36,b+j,.1,v);if(t.drum==='swing')note(5,51,b+j+2/3,.12,v-10);
      else if(t.drum!=='waltz')note(5,t.drum==='folk'?69:42,b+j+.5,.06,v-12);
    }
  }
  function backing(bar,quiet){
    const b=bar*t.meter,c=harmony(bar),q=quiet?45:57,m=t.meter;
    if(['waltz','minuet','oompah','march'].includes(t.backing)){
      note(3,c[0]-12,b,.72,q+12);for(let j=1;j<m;j++)chord(2,c.map(n=>n+12),b+j,.42,q-7);
      if(m===2){chord(2,c.map(n=>n+12),b+.5,.22,q-9);chord(2,c.map(n=>n+12),b+1.5,.22,q-9);note(3,c[2]-12,b+1,.62,q+8);}
    } else if(['harp','arpeggio','storybook','clock','zither'].includes(t.backing)){
      t.pulse.forEach((x,j)=>note(2,c[j%3]+12+(j>=3?12:0),b+x,t.backing==='clock'?.16:.56,q-9));
      note(3,c[0]-12,b,m*.7,q+4);
    } else if(t.backing==='swing'){
      [c[0]-12,c[1]-12,c[2]-12,c[0]-1].forEach((n,j)=>note(3,n,b+j,.7,q+4));
      [.67,2.67].forEach(x=>chord(2,[...c,c[0]+10].map(n=>n+12),b+x,.35,q-12));
    } else {
      note(3,c[0]-12,b,.65,q+8);note(3,c[2]-12,b+m/2,.65,q+5);
      t.pulse.forEach((x,j)=>t.backing==='pluck'||t.backing==='desert'?note(2,c[j%3]+12,b+x,.55,q-7):chord(2,c.map(n=>n+12),b+x,.3,q-13));
    }
    if(bar%4===0)chord(4,c.map(n=>n+12),b,Math.min(m*2,beats-b),quiet?28:36);
    drums(b,quiet);
  }
  if(loop){
    for(let bar=0;bar<bars;bar++){
      backing(bar,!home);
      // Space between phrases leaves room for the cabinet's feedback sounds.
      if(!home&&bar%3===2)continue;
      const hook=bar<8?t.a:t.b,offset=(bar%4)*2,voice=bar%4===3?1:0;
      t.rhythm.forEach((x,j)=>{
        if(!home&&j%2===1)return;
        const d=hook[(offset+j)%hook.length],next=t.rhythm[j+1]??t.meter;
        note(voice,t.key+softRegister+d+(home?0:-5),bar*t.meter+x,Math.max(.16,(next-x)*.8),home?66:51);
      });
      if(home&&bar%4===3){const c=harmony(bar);note(1,c[2]+12,bar*t.meter+t.meter-.5,.35,51);}
    }
  } else {
    // Award melodies quote this title's hook, not a common transposed fanfare.
    const melody=t.a.slice(0,rank===0?4:8),opening=rank===0?0:.25,spacing=rank===0?t.meter/5:t.meter/4;
    melody.forEach((d,j)=>note(rank%2?1:0,t.key+softRegister+d,opening+j*spacing,spacing*.75,rank===0?64:73));
    if(rank>=2)t.b.slice(0,4).forEach((d,j)=>note(0,t.key+softRegister+d,t.meter*2+j*.5,.4,68));
    const finale=beats-Math.min(t.meter*.7,1.5),c=[t.key,t.key+4,t.key+7];
    chord(2,c.map(n=>n+12),0,.5,49);note(3,t.key-12,0,.7,64);
    chord(4,c.map(n=>n+12),finale,beats-finale,rank===0?42:58);
    chord(1,c.map(n=>n+12),finale,beats-finale,rank===0?45:57);
    if(rank>0){drums(0);note(5,49,finale,.2,48);note(3,t.key-12,finale,.9,72);}
  }
  s.notes.sort((a,b)=>a.time-b.time);return s;
}
