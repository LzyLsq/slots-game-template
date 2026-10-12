import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TaskGoldPlayback, taskGoldPose, TASK_GOLD_ART, TASK_GOLD_CAST, TASK_GOLD_DURATION, TASK_GOLD_SMILE, TASK_GOLD_REFLECTION, taskGoldStagePlacement, TaskGoldCharacter } from '../assets/scripts/ui/TaskGoldMotion';
import { TASK_GOLD_FACES } from '../assets/scripts/ui/TaskGoldFaceLayout';
import { TASK_GOLD_RIGS, TASK_GOLD_STAGE } from '../assets/scripts/ui/TaskGoldRigLayout';
import { goldElbowAngle, jointWeight, TASK_GOLD_JOINTS, transformGoldBody, transformGoldWrist } from '../assets/scripts/ui/TaskGoldJoints';
const cueList = ['reach', 'shine', 'smile', 'return', 'complete'];
const fingerprints: string[] = [];
for (const mode of [0, 1, 2, 3] as TaskGoldCharacter[]) {
  for (const fps of [24, 30, 60, 90, 120]) {
    const player = new TaskGoldPlayback(false, mode); const cues: string[] = [];
    for (let i = 0; i < fps * 7; i++) cues.push(...player.advance(1 / fps).cues);
    assert.deepEqual(cues, cueList, `${TASK_GOLD_CAST[mode].character}, ${fps} fps: each beat only once`);
    assert.equal(player.time, TASK_GOLD_DURATION);
  }
  const hitch = new TaskGoldPlayback(false, mode);
  assert.deepEqual(hitch.advance(100).cues, cueList);
  assert.deepEqual(hitch.advance(100).cues, []);
  const cancelled = new TaskGoldPlayback(false, mode); cancelled.advance(1); cancelled.cancel();
  assert.deepEqual(cancelled.advance(20).cues, []); assert.equal(cancelled.time, 1);
  const reduced = new TaskGoldPlayback(true, mode);
  assert.deepEqual(reduced.advance(20).cues, ['reach', 'shine', 'smile', 'complete']);
  const first = taskGoldPose(0, false, mode), last = taskGoldPose(TASK_GOLD_DURATION, false, mode);
  for (const key of ['bodyAngle', 'bodyX', 'bodyY', 'torsoAngle', 'headAngle', 'wristAngle', 'armX', 'armY', 'armAngle', 'smileFrame', 'glint', 'toothGlint'] as const)
    assert.equal(first[key], last[key], `mode ${mode}: return to original ${key}; no ending jump`);
  for (let t = 0; t <= TASK_GOLD_DURATION; t += .001) {
    const pose = taskGoldPose(t, false, mode), next = taskGoldPose(t + .001, false, mode), after = taskGoldPose(t + .002, false, mode);
    assert.ok(Number.isInteger(pose.smileFrame) && pose.smileFrame >= 0 && pose.smileFrame < TASK_GOLD_SMILE.frames);
    assert.ok(pose.glint >= 0 && pose.glint <= 255);
    assert.ok(Math.abs(next.armX - pose.armX) < .1 && Math.abs(next.armY - pose.armY) < .2, 'no arm teleportation');
    assert.ok(Math.abs(next.armAngle - pose.armAngle) < .36, 'bounded continuous angular velocity');
    assert.ok(Math.abs(after.armAngle - 2 * next.armAngle + pose.armAngle) < .006, 'no sudden acceleration at authored beat boundaries');
    assert.ok(pose.toothGlint >= 0 && pose.toothGlint <= 182);
    if (pose.toothGlint > 0) assert.ok(pose.smileFrame >= 14, 'enamel reflects only after its own teeth are exposed');
  }
  for (const n of [NaN, Infinity, -5]) assert.ok(Number.isFinite(taskGoldPose(n, false, mode).armX));
  fingerprints.push(JSON.stringify([.7, 1.5, 2, 2.6, 3.3].map(t => taskGoldPose(t, false, mode))));
  assert.ok(TASK_GOLD_RIGS[mode].elbow[0] > 0, 'one elbow per generated viewer-right sleeve');
}
assert.equal(new Set(fingerprints).size, 4, 'four authored timelines, not one animation with recoloring');
assert.equal(new Set(TASK_GOLD_CAST.map(cast => cast.body)).size, 4);
assert.equal(new Set(TASK_GOLD_CAST.map(cast => cast.arm)).size, 4);
assert.equal(new Set(TASK_GOLD_CAST.map(cast => cast.smile)).size, 4, 'four independently generated mouths, not the otter face reused');
assert.equal(TASK_GOLD_ART.length, 12);
assert.equal(taskGoldPose(2.75).smileFrame, 15);
assert.ok(taskGoldPose(1.98).glint > 175, 'ingot shines before the smile');
for (const name of [...TASK_GOLD_ART, TASK_GOLD_REFLECTION]) {
  const png = readFileSync(new URL(`../assets/resources/art/${name}.png`, import.meta.url));
  assert.equal(png[25], 6, `${name}: true RGBA, not a rectangular sticker`);
}
for (const mode of [0, 1, 2, 3] as TaskGoldCharacter[]) {
  const face = TASK_GOLD_FACES[mode];
  const atlas = readFileSync(new URL(`../assets/resources/art/${TASK_GOLD_CAST[mode].smile}.png`, import.meta.url));
  assert.equal(atlas.readUInt32BE(16), face.width * TASK_GOLD_SMILE.columns);
  assert.equal(atlas.readUInt32BE(20), face.height * 2);
  assert.ok(face.toothSize <= 24, 'reflection is tiny, not a face-obscuring effect');
  assert.ok(Math.abs(face.tooth[0] - face.center[0]) < face.width / 2);
  assert.ok(Math.abs(face.tooth[1] - face.center[1]) < face.height / 2);
  assert.ok(TASK_GOLD_RIGS[mode].soleX > 0, 'register actual sole center, not tail-heavy canvas center');
}
// Scene coordinates, not device-space guesses: stone platform registration is
// invariant when the background cover scale changes on short/wide displays.
for (const [width, height] of [[320, 568], [375, 812], [390, 844], [360, 640], [430, 932], [739, 766], [1024, 768]]) {
  const overlayScale = Math.min(width / 1024, height / 1800);
  const stageScale = Math.max(width / overlayScale / 1024, height / overlayScale / 1536);
  const placement = taskGoldStagePlacement(stageScale);
  assert.equal(placement.x / stageScale + 512, TASK_GOLD_STAGE.footX);
  assert.equal(768 - placement.y / stageScale, TASK_GOLD_STAGE.footY);
  assert.ok(placement.y + 750 * placement.scale <= TASK_GOLD_STAGE.maxActorTop + 1e-6, 'ears/horns never cover caption');
  assert.ok(537 - TASK_GOLD_STAGE.maxActorTop >= 30, 'real caption headroom, not just a device-pixel guess');
  assert.ok((765 + 54) * overlayScale < height / 2, 'acknowledgement button fits inside the viewport');
}
const source = readFileSync(new URL('../assets/scripts/ui/TaskGoldReveal.ts', import.meta.url), 'utf8');
assert.ok(!source.includes('repeatForever') && !source.includes('Math.sin(time'), 'one authored action; no whole-picture pumping loop');
assert.ok(source.includes('transformGoldBody(rig.elbow[0]'), 'sleeve follows its actual coat joint');
assert.ok(!source.includes('this.actor.angle') && !source.includes('placement.x + pose.bodyX'), 'no rocking or inflating the whole character');
const point = { x: 0, y: 0 }, other = { x: 0, y: 0 };
const deg = Math.PI / 180;
const rotate = (x: number, y: number, px: number, py: number, a: number) => ({x:px+Math.cos(a)*(x-px)-Math.sin(a)*(y-py),y:py+Math.sin(a)*(x-px)+Math.cos(a)*(y-py)});
const inverse = (x: number, y: number, pose: ReturnType<typeof taskGoldPose>, mode: TaskGoldCharacter, arm = false) => {
  const q={x,y}, fx={x:0,y:0}, fy={x:0,y:0};
  const transform=arm ? transformGoldWrist : transformGoldBody;
  // Numerical Jacobian is independent of the shader's analytic derivative.
  for(let i=0;i<4;i++) {
    transform(q.x,q.y,pose,mode,point); transform(q.x+.0001,q.y,pose,mode,fx); transform(q.x,q.y+.0001,pose,mode,fy);
    const a=(fx.x-point.x)/.0001,b=(fy.x-point.x)/.0001,c=(fx.y-point.y)/.0001,d=(fy.y-point.y)/.0001;
    const det=a*d-b*c,ex=point.x-x,ey=point.y-y;
    q.x-=(d*ex-b*ey)/det; q.y-=(a*ey-c*ex)/det;
  }
  return q;
};
for(const mode of [0,1,2,3] as TaskGoldCharacter[]) {
  const rig=TASK_GOLD_RIGS[mode], j=TASK_GOLD_JOINTS[mode], face=TASK_GOLD_FACES[mode];
  assert.ok(face.center[1]-face.height/2>j.headBand[1], 'entire mouth remains in rigid head region, never stretches');
  assert.ok(j.neck[1]>j.torsoBand[1], 'neck pivot receives complete torso rotation');
  assert.ok(rig.gold[0]>j.wristBand[1], 'gripped gold is rigid with the paw, not independently stretched');
  for(let t=0;t<=TASK_GOLD_DURATION;t+=.04) {
    const pose=taskGoldPose(t,false,mode);
    assert.equal(pose.bodyAngle,0); assert.equal(pose.bodyY,0); assert.equal(pose.bodyX,0);
    assert.ok(Math.abs(pose.torsoAngle)<=2.5 && Math.abs(pose.headAngle)<=4.3 && Math.abs(pose.wristAngle)<=12.1, 'conservative joint bounds');
    for(const x of [-20,rig.soleX,rig.soleX+45]) {
      transformGoldBody(x,10,pose,mode,point); assert.deepEqual(point,{x,y:10},'soles stay planted');
    }
    // Independently compute rigid face registration rather than duplicating the shader loop.
    const n=rotate(j.neck[0],j.neck[1],j.hip[0],j.hip[1],pose.torsoAngle*deg);
    const m=rotate(face.center[0],face.center[1],j.hip[0],j.hip[1],pose.torsoAngle*deg);
    const expected=rotate(m.x,m.y,n.x,n.y,pose.headAngle*deg);
    transformGoldBody(face.center[0],face.center[1],pose,mode,point);
    assert.ok(Math.hypot(expected.x-point.x,expected.y-point.y)<1e-8,'rigid face and registered mouth coincide');
    // Shader inverse accuracy over the silhouette; no fold/duplicate image at transitions.
    for(let y=0;y<=732;y+=36) for(let x=-295;x<=295;x+=40) {
      transformGoldBody(x,y,pose,mode,point); const target={...point};
      const q=inverse(target.x,target.y,pose,mode);
      assert.ok(Math.hypot(q.x-x,q.y-y)<.025,'four Newton inverse steps match forward body below 0.025 source pixels');
      transformGoldBody(x+1,y,pose,mode,point); transformGoldBody(x,y+1,pose,mode,other);
      const jacobian=(point.x-target.x)*(other.y-target.y)-(point.y-target.y)*(other.x-target.x);
      assert.ok(jacobian>.3,'positive orientation: no folds or inverted face regions');
    }
    for(let x=rig.armCenter[0]-rig.armSize[0]/2;x<rig.armCenter[0]+rig.armSize[0]/2;x+=20) {
      const y=rig.armCenter[1]; transformGoldWrist(x,y,pose,mode,point);
      const q=inverse(point.x,point.y,pose,mode,true);
      assert.ok(Math.hypot(q.x-x,q.y-y)<.025,'wrist inverse stays registered');
    }
    assert.equal(goldElbowAngle(pose,mode),pose.armAngle+pose.torsoAngle*jointWeight(rig.elbow[1],j.torsoBand[0],j.torsoBand[1]));
  }
  // Interior retrieval pose carries momentum; show/shine/smile events do not stop every bone.
  const at=mode===3?1.49:mode===1?1.19:mode===2?1.29:1.15;
  const velocity=(taskGoldPose(at+.001,false,mode).armAngle-taskGoldPose(at-.001,false,mode).armAngle)/.002;
  assert.ok(velocity>50,'hand travels continuously through interior retrieval pose');
  const reduced=taskGoldPose(.6,true,mode);
  assert.equal(reduced.headAngle,0); assert.equal(reduced.torsoAngle,0); assert.equal(reduced.wristAngle,0);
}
const shader=readFileSync(new URL('../assets/resources/effects/task-gold-joints.effect',import.meta.url),'utf8');
assert.ok(shader.includes('i < 4') && shader.includes('CCSampleWithAlphaSeparated'), 'existing generated texture sampled continuously');
assert.ok(!shader.includes('sin(time') && !shader.includes('mix(texture'), 'no periodic UV ripple or pose crossfade ghosting');
console.log('PASS coordinated grounded torso/head/wrist joints, rigid face/paw registration, inverse accuracy, no folding, continuous retrieval momentum, four distinct reward keepers: independent subtle smiles/enamel glints, actual sole anchors and caption clearance, unique generated body/treasure, continuous elbow choreography, fixed-face registration, five frame rates, exactly-once cues, cancellation, reduced motion and responsive dais alignment');
