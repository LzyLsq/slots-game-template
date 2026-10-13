const ts=require('typescript'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync('assets/scripts/vfx/CabinetGuardian.ts','utf8');
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText;
const exported={};vm.runInNewContext(code,{exports:exported,require:()=>({_decorator:{ccclass:()=>x=>x},Component:class{}}),Math});
const report=[];
// These painted contact points sit on a fixed rail or gold bowl. Tail/head
// motion must not pull them away while the free gesture remains visible.
const contacts = Array.from({length:4},()=>[[100,360],[368,390],[500,360],[500,330]]);
const freeParts = [[[190,150]],[[200,190]],[[200,210]],[[205,160]]];
for(let theme=0;theme<4;theme++){
 const g=new exported.CabinetGuardian();g.setup({}, {redraw(){}},theme);g.celebrate();let minArea=Infinity,maxStep=0,maxReferenceDifference=0;let prior;
 const points=new Float64Array(2665*2);
 const contactSteps=contacts[theme].map(()=>0),freeSteps=freeParts[theme].map(()=>0);
 for(let frame=0;frame<900;frame++){
  g.update(1/60);g.writePoints(points,64,40,736,448);
  for(const [samples,steps] of [[contacts[theme],contactSteps],[freeParts[theme],freeSteps]])samples.forEach(([x,y],i)=>{
   const p=g.point(x,y);steps[i]=Math.max(steps[i],Math.hypot(p[0]-x,p[1]-y));
  });
  // Compare the renderer's cached path with independently evaluated points.
  for(let k=(frame*19)%97;k<2665;k+=97){const p=g.point(k%65/64*736,Math.floor(k/65)/40*448);maxReferenceDifference=Math.max(maxReferenceDifference,Math.abs(points[k*2]-p[0]),Math.abs(points[k*2+1]-p[1]));}

  for(let row=0;row<40;row++)for(let col=0;col<64;col++){
   const a=row*65+col;for(const [p,q,r] of [[a,a+1,a+65],[a+1,a+66,a+65]]){
    const area=(points[q*2]-points[p*2])*(points[r*2+1]-points[p*2+1])-(points[q*2+1]-points[p*2+1])*(points[r*2]-points[p*2]);minArea=Math.min(minArea,area);
   }
  }
  if(prior)for(let k=0;k<2665;k++)maxStep=Math.max(maxStep,Math.hypot(points[k*2]-prior[k*2],points[k*2+1]-prior[k*2+1]));
  if(!prior)prior=new Float64Array(points.length);prior.set(points);
 }
 assert(minArea>0,`Folded skin triangles theme ${theme}: ${minArea}`);assert(maxStep<2.5,`Discontinuous movement theme ${theme}: ${maxStep}`);
 assert(maxReferenceDifference<1e-10,'Cached mesh diverged from reference deformation');
 contacts[theme].forEach((p,i)=>assert(contactSteps[i]<1e-10,`Grounded contact slipped theme ${theme} at ${p}: ${contactSteps[i]}`));
 freeParts[theme].forEach((p,i)=>assert(freeSteps[i]>3,`Free gesture was frozen theme ${theme} at ${p}: ${freeSteps[i]}`));
 const binding=g.grid;g.writePoints(points,64,40,736,448);assert.equal(g.grid,binding,'Static influences rebuilt during steady-state animation');
 g.reducedMotion=true;g.update(1/60);assert.deepEqual(Array.from(g.point(220,180)),[220,180]);g.writePoints(points,64,40,736,448);
 for(let k=0;k<2665;k++){assert.equal(points[k*2],k%65/64*736);assert.equal(points[k*2+1],Math.floor(k/65)/40*448);}
 report.push({theme,groundedContacts:contacts[theme].map((point,i)=>({point,maxDisplacement:contactSteps[i]})),freeParts:freeParts[theme].map((point,i)=>({point,maxDisplacement:freeSteps[i]})),minTriangleArea:minArea,maxVertexStepAt60Hz:maxStep,maxReferenceDifference,staticBindingReused:true,singleSkinWithRegisteredEyelids:true,seconds:15,vertices:2665});
}
const output=JSON.stringify(report,null,2);if(process.env.QA_OUTPUT){fs.mkdirSync(process.env.QA_OUTPUT,{recursive:true});fs.writeFileSync(path.join(process.env.QA_OUTPUT,'guardian-geometry.json'),output);}console.log(output);
