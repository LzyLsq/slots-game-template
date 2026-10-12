import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { MUSIC_TRACKS } from '../assets/scripts/ui/SceneMusic';
import { readPcm } from './audio-pcm';

// Measures the final checked-in waveform, not an alleged EQ setting. Unlike the
// retired double low-pass audit, acoustic upper harmonics need not be erased.
function spectrum(samples: Float64Array[]) {
  const size=4096, frames=samples[0].length;
  let total=0, high3=0, high6=0, centroid=0;
  const blocks=Math.min(24,Math.max(1,Math.floor(frames/size)));
  for(let block=0;block<blocks;block++) {
    const start=Math.round(Math.max(0,frames-size)*block/Math.max(1,blocks-1));
    const re=new Float64Array(size), im=new Float64Array(size);
    for(let i=0;i<size;i++) {
      const mono=samples.reduce((sum,ch)=>sum+(ch[start+i]??0),0)/samples.length;
      re[i]=mono*(.5-.5*Math.cos(2*Math.PI*i/(size-1)));
    }
    for(let i=1,j=0;i<size;i++) {
      let bit=size>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;
      if(i<j)[re[i],re[j]]=[re[j],re[i]];
    }
    for(let width=2;width<=size;width*=2) {
      const half=width/2;
      for(let origin=0;origin<size;origin+=width)for(let j=0;j<half;j++) {
        const angle=-2*Math.PI*j/width,c=Math.cos(angle),s=Math.sin(angle),a=origin+j,b=a+half;
        const r=re[b]*c-im[b]*s,v=re[b]*s+im[b]*c;
        re[b]=re[a]-r;im[b]=im[a]-v;re[a]+=r;im[a]+=v;
      }
    }
    for(let i=1;i<=size/2;i++) {
      const e=re[i]**2+im[i]**2, hz=i*32000/size;
      total+=e;centroid+=e*hz;if(hz>=3000)high3+=e;if(hz>=6000)high6+=e;
    }
  }
  return {above3000:high3/total,above6000:high6/total,centroid:centroid/total};
}
const report=JSON.parse(readFileSync('docs/audio-acoustic-regression.json','utf8'));
const manifest=JSON.parse(readFileSync('docs/audio-score-manifest.json','utf8'));
assert.equal(report.version,'orchestral-awards-20261012');assert.equal(report.items.length,66);
assert.equal(manifest.soundDesign,report.version);
assert.equal(manifest.mastering.version,'material-feedback-20261012','Richer awards do not loosen the established warm master');
let runtimeBytes=0;
for(const item of report.items) {
  const bytes=readFileSync(`assets/resources/audio/${item.asset}.wav`),pcm=readPcm(bytes);
  runtimeBytes+=bytes.length;
  assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);
  const m=[...manifest.tracks,...manifest.foley].find((r:any)=>r.asset===item.asset);
  assert.equal(m.sha256,item.sha256);
  let peak=0,energy=0,monoEnergy=0,maxDelta=0;
  const means=pcm.samples.map(()=>0);
  for(let i=0;i<pcm.frames;i++) {
    let mono=0;
    for(let ch=0;ch<pcm.channels;ch++) {
      const v=pcm.samples[ch][i];peak=Math.max(peak,Math.abs(v));energy+=v*v;means[ch]+=v;mono+=v;
      if(i>0)maxDelta=Math.max(maxDelta,Math.abs(v-pcm.samples[ch][i-1]));
    }
    monoEnergy+=(mono/pcm.channels)**2;
  }
  const rms=Math.sqrt(energy/(pcm.frames*pcm.channels));
  assert.ok(peak>=.12&&peak<=.65,`${item.asset}: transient headroom`);
  assert.ok(rms>.015&&rms<.25,`${item.asset}: audible but not heavily limited`);
  assert.ok(Math.abs(rms-item.rms)<1e-7,'Report comes from actual PCM');
  assert.ok(means.every(mean=>Math.abs(mean/pcm.frames)<.003),'No DC rumble');
  assert.ok(maxDelta<.32,`${item.asset}: no near-fullscale abrupt discontinuity`);
  assert.ok(Math.sqrt(monoEnergy/pcm.frames)/rms>.85,'Stereo preserves the melody on one phone speaker');
  for(const ch of pcm.samples){assert.equal(ch[0],0);assert.equal(ch[ch.length-1],0);}
  const bands=spectrum(pcm.samples);
  assert.ok(bands.above3000<.18,`${item.asset}: restrained upper attack energy ${bands.above3000}`);
  assert.ok(bands.above6000<.015,`${item.asset}: no brittle/hissing upper tail`);
  assert.ok(Number.isFinite(bands.centroid));
  assert.ok(Math.abs(bands.above3000-item.spectrum.above3000)<.002,'Stored spectral audit agrees with independent FFT');
  if(manifest.tracks.some((t:any)=>t.asset===item.asset)) {
    assert.equal(pcm.channels,2);assert.equal(item.bars,16);assert.ok(item.notesPerCycle>100);
    assert.match(item.form,/contrasting B/);assert.ok(item.instruments.length>=5);
    assert.ok(item.crestDb>8&&item.crestDb<22,'Preserved phrase/transient dynamics');
    // Four milliseconds of seam smoothing must not cause a whole-beat hole.
    const window=Math.min(3200,pcm.frames), edgeEnergy=pcm.samples.reduce((n,ch)=>n+ch.slice(0,window).reduce((e,v)=>e+v*v,0)+ch.slice(-window).reduce((e,v)=>e+v*v,0),0);
    assert.ok(Math.sqrt(edgeEnergy/(window*2*pcm.channels))>.006,'Music loop has an audible continuing room tail');
  }
}
assert.equal(runtimeBytes,report.runtimeBytes);assert.ok(runtimeBytes<44*1024*1024,'Mobile PCM package is bounded');
assert.equal(new Set(manifest.tracks.map((t:any)=>t.description)).size,8);
assert.equal(new Set(manifest.tracks.map((t:any)=>JSON.stringify(t.instruments))).size,8);
const sources=JSON.parse(readFileSync('docs/licenses/audio-sources.json','utf8'));
assert.equal(sources.soundfont.license,'MIT');assert.equal(sources.renderer.license,'MIT');
assert.equal(createHash('sha256').update(readFileSync('tools/vendor/tinysoundfont/tsf.h')).digest('hex'),sources.renderer.headerSha256);
assert.ok(Object.values(MUSIC_TRACKS).every(track=>track.volume>=.17&&track.volume<=.23),'Scoring stays below interaction and presentation cues');
console.log('PASS acoustic audio: 66 actual PCM/hash/spectrum/dynamics/seam checks, 8 arrangements, mono compatibility, package budget and licensed provenance (not a listening certification)');
