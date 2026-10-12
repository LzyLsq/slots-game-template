// Independent painted landmarks: the face and free paw/wing/ear should turn
// without changing their proportions. The old positive-triangle test alone
// allowed obvious rubber-sheet animation, so measure lengths/angles too.
const ts=require('typescript'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const source=process.env.QA_GUARDIAN_SOURCE||'assets/scripts/vfx/CabinetGuardian.ts';
const code=ts.transpileModule(fs.readFileSync(source,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText;
const exported={};vm.runInNewContext(code,{exports:exported,require:()=>({_decorator:{ccclass:()=>x=>x},Component:class{}}),Math});
const landmarks=[
 {mode:'golden-phoenix',parts:{face:[[340,125],[440,155],[350,185],[425,205]],wing:[[170,180],[190,180],[180,200],[195,205]]}},
 {mode:'jade-dragon',parts:{face:[[340,135],[440,165],[355,195],[425,210]],paw:[[180,180],[200,190],[220,200],[195,210]]}},
 {mode:'pearl-qilin',parts:{face:[[320,140],[425,160],[340,200],[410,210]],paw:[[190,190],[210,205],[220,215],[195,230]]}},
 {mode:'amber-panda',parts:{face:[[345,125],[420,150],[360,185],[420,190]],paw:[[180,140],[205,155],[200,180],[225,175]]}},
];
const results=[];
for(let theme=0;theme<4;theme++){
 const g=new exported.CabinetGuardian();g.setup({}, {redraw(){}},theme);
 const parts=Object.entries(landmarks[theme].parts).map(([name,points])=>({name,points,maxLengthChange:0,maxAngleChange:0,maxStep:0,prior:null}));
 for(let f=0;f<900;f++){
  if(f===120)g.watch(true);if(f===300)g.celebrate();if(f===420)g.watch(false);
  g.update(1/60);
  for(const part of parts){
   const moved=part.points.map(([x,y])=>g.point(x,y));
   for(let i=0;i<moved.length;i++){
    if(part.prior)part.maxStep=Math.max(part.maxStep,Math.hypot(moved[i][0]-part.prior[i][0],moved[i][1]-part.prior[i][1]));
    for(let j=i+1;j<moved.length;j++){
     const length=Math.hypot(part.points[i][0]-part.points[j][0],part.points[i][1]-part.points[j][1]);
     const next=Math.hypot(moved[i][0]-moved[j][0],moved[i][1]-moved[j][1]);
     part.maxLengthChange=Math.max(part.maxLengthChange,Math.abs(next/length-1));
    }
   }
   const angle=p=>{const a=[p[1][0]-p[0][0],p[1][1]-p[0][1]],b=[p[2][0]-p[0][0],p[2][1]-p[0][1]];return Math.atan2(a[0]*b[1]-a[1]*b[0],a[0]*b[0]+a[1]*b[1]);};
   part.maxAngleChange=Math.max(part.maxAngleChange,Math.abs(angle(moved)-angle(part.points)));part.prior=moved;
  }
 }
 for(const p of parts){
  if(!process.env.QA_BASELINE){assert(p.maxLengthChange<.002,`${landmarks[theme].mode} ${p.name} changes shape: ${p.maxLengthChange}`);assert(p.maxAngleChange<.002,`${landmarks[theme].mode} ${p.name} shears: ${p.maxAngleChange}`);assert(p.maxStep<1.5,`${landmarks[theme].mode} ${p.name} jumps: ${p.maxStep}`);}
  delete p.prior;
 }
 results.push({mode:landmarks[theme].mode,seconds:15,includesIdleWatchAndCelebration:true,parts});
}
// Separate hand movement from the nod/ears: static adjacent landmarks must
// not be pulled, even though the beckoning paw still visibly moves.
const limbIsolation=[];
for(const [theme,anchors,free] of [
 [0,[[350,280],[380,310],[500,330],[368,390]],[190,150]],
 [1,[[330,290],[380,315],[500,330],[368,390]],[200,190]],
 [2,[[320,290],[380,315],[500,330],[368,390]],[200,210]],
 [3,[[310,260],[380,310],[500,330],[368,390]],[205,160]],
]){
 const g=new exported.CabinetGuardian();g.setup({}, {redraw(){}},theme);
 g.joints.forEach(j=>{j.angle=j.motion==='gesture'?-.15:j.motion==='wrist'?.059:0;j.cos=Math.cos(j.angle);j.sin=Math.sin(j.angle)});
 const fixed=anchors.map(([x,y])=>{const p=g.point(x,y);const displacement=Math.hypot(p[0]-x,p[1]-y);if(!process.env.QA_BASELINE)assert(displacement<1e-10,`Adjacent body dragged by hand theme ${theme} at ${x},${y}: ${displacement}`);return{point:[x,y],displacement};});
 const p=g.point(...free),movement=Math.hypot(p[0]-free[0],p[1]-free[1]);if(!process.env.QA_BASELINE)assert(movement>8,'Hand motion became imperceptible');
 limbIsolation.push({theme,fixed,freePawDisplacement:movement});
}
const blinks=[];
for(let theme=0;theme<4;theme++){
 const closures=[];const g=new exported.CabinetGuardian();g.setup({}, {redraw(){ }},theme,{setClosure:x=>closures.push(x)});
 let closedFrames=0,activeFrames=0,maximum=0;
 for(let n=0;n<900;n++){g.update(1/60);maximum=Math.max(maximum,g.blink);if(g.blink===1)closedFrames++;if(g.blink>0)activeFrames++;}
 if(!process.env.QA_BASELINE){assert.equal(closures.length,901);assert.equal(maximum,1);assert(closedFrames>=6);assert(activeFrames>=40&&activeFrames<90);}
 g.reducedMotion=true;g.update(1/60);assert.equal(g.blink,0);
 // Eyelid closure may change texture, never face geometry.
 g.reducedMotion=false;g.lift=0;g.joints.forEach(j=>{j.cos=1;j.sin=0;j.angle=0});g.blink=1;assert.deepEqual(Array.from(g.point(323,178)),[323,178]);
 blinks.push({theme,maximum,closedFrames,activeFrames,seconds:15,faceGeometryUnaffected:true});
}
const output=JSON.stringify({source,baseline:!!process.env.QA_BASELINE,results,limbIsolation,blinks},null,2);
if(process.env.QA_OUTPUT){fs.mkdirSync(process.env.QA_OUTPUT,{recursive:true});fs.writeFileSync(path.join(process.env.QA_OUTPUT,'guardian-anatomy.json'),output);}console.log(output);
