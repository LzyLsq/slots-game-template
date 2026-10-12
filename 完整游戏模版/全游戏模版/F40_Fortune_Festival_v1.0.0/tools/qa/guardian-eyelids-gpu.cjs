// Render the actual Cocos material at open, partial, closed and reopened states.
// Use an isolated browser wallet and hide other scene art only in this fixture.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const O=path.resolve(process.env.QA_OUTPUT||'docs/screenshots/f40-eyelids-limb-isolation-20261010/final');fs.mkdirSync(O,{recursive:true});
(async()=>{const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});const reports=[],errors=[];
for(const [theme,mode] of ['golden-phoenix','jade-dragon','pearl-qilin','amber-panda'].entries()){
 const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const p=await c.newPage();p.on('pageerror',e=>errors.push({mode,error:e.message}));p.on('console',m=>{if(m.type()==='error')errors.push({mode,error:m.text()})});
 await p.goto('http://127.0.0.1:6040/?debug=1&screen=game&game='+mode+'&v='+encodeURIComponent(process.env.QA_VERSION||'f40-eyelids-limb-isolation-20261010'));
 await p.waitForFunction(()=>{const a=window.cc?.director?.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp');return a?.page==='game'&&!a.busy&&!document.getElementById('csw-preloader')&&a.content?.getComponentsInChildren('CabinetGuardian')[0]?.mesh?.spriteFrame},null,{timeout:90000});await p.waitForTimeout(600);
 const data=await p.evaluate(()=>{const a=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp'),g=a.content.getComponentsInChildren('CabinetGuardian')[0],m=g.mesh,e=m.node.getComponent('GuardianEyelids');return{eyelidComponents:e?1:0,hasCustomMaterial:!!m.customMaterial,effect:m.customMaterial?.effectAsset?.name,textureSize:e?[e.material.getProperty('closedEyelids').width,e.material.getProperty('closedEyelids').height]:null,sourceUv:m.spriteFrame.uv.slice(),position:m.node.worldPosition,scale:m.node.scale}});
 assert.equal(data.eyelidComponents,1);assert.equal(data.hasCustomMaterial,true);if(true){assert.deepEqual(data.textureSize,[1472,896]);assert(data.effect.endsWith('guardian-eyelids')); }
 await p.screenshot({path:path.join(O,mode+'-eyelid-scene.png')});
 await p.evaluate(()=>{const a=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp'),g=a.content.getComponentsInChildren('CabinetGuardian')[0];g.enabled=false;g.reducedMotion=true;g.update(0);g.sprite.enabled=false;let keep=g.mesh.node;while(keep.parent){const parent=keep.parent;for(const n of parent.children)if(n!==keep&&!n.getComponent('cc.Camera'))n.active=false;keep=parent;}window.__eyeTestGuardian=g;});
 // Collect mesh coordinates only after Cocos has rendered the neutral fixture.
 await p.waitForTimeout(100);
 const states=[];for(const [label,closure]of [['open',0],['partial',.5],['closed',1],['reopened',0]]){
  const state=await p.evaluate(closure=>{const g=window.__eyeTestGuardian,e=g.mesh.node.getComponent('GuardianEyelids');e?.setClosure(closure);return{closure:e?e.material.getProperty('eyelidState').x:0,vertices:g.mesh.renderData.data.map(v=>[v.x,v.y]),facePoint:g.point(366,217)}} ,closure);
  await p.waitForTimeout(100);await p.screenshot({path:path.join(O,mode+'-eyelids-'+label+'.png')});if(states.length)assert.deepEqual(state.vertices,states[0].vertices,'Eyelid closure changed the mesh');states.push(state);
 }
 reports.push({mode,...data,states:states.map(({vertices,...rest})=>({...rest,vertices:vertices.length}))});await c.close();console.log('PASS GPU eyelids '+mode);
}
await b.close();fs.writeFileSync(path.join(O,'eyelids-gpu.json'),JSON.stringify({reports,errors},null,2));assert.deepEqual(errors,[]);})().catch(e=>{console.error(e);process.exit(1)});
