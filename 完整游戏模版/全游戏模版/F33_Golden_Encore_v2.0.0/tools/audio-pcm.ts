import assert from 'node:assert/strict';
/** Our offline renderer deliberately emits canonical PCM, no opaque codec metadata. */
export function readPcm(bytes: Buffer) {
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WAVE');
  assert.equal(bytes.toString('ascii',12,16),'fmt ');
  assert.equal(bytes.readUInt32LE(16),16);
  assert.equal(bytes.readUInt16LE(20),1);
  assert.equal(bytes.toString('ascii',36,40),'data');
  const channels=bytes.readUInt16LE(22), rate=bytes.readUInt32LE(24);
  assert.ok(channels===1 || channels===2);
  assert.equal(rate,32000); assert.equal(bytes.readUInt16LE(34),16);
  assert.equal(bytes.readUInt16LE(32),channels*2);
  assert.equal(bytes.readUInt32LE(28),rate*channels*2);
  assert.equal(bytes.readUInt32LE(40),bytes.length-44);
  const frames=(bytes.length-44)/(2*channels);
  assert.ok(Number.isInteger(frames));
  const samples=Array.from({length:channels},()=>new Float64Array(frames));
  for(let i=0;i<frames;i++)for(let ch=0;ch<channels;ch++)samples[ch][i]=bytes.readInt16LE(44+(i*channels+ch)*2)/32768;
  return {channels,rate,frames,duration:frames/rate,samples};
}
