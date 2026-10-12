import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';

const expected=[13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,33];
const argumentsFor=key=>process.argv.filter(a=>a.startsWith('--'+key+'=')).map(a=>a.slice(key.length+3));
const read=file=>JSON.parse(readFileSync(file,'utf8'));
const browserPaths=argumentsFor('browser'),nativePaths=argumentsFor('native'),regressionPaths=argumentsFor('regression');
assert(browserPaths.length&&nativePaths.length&&regressionPaths.length,'Provide browser, native and regression evidence');
const browsers=new Map(),natives=new Map(),regression=new Map();
for(const path of browserPaths)for(const result of read(path).results)browsers.set(result.id,{...result,evidence:path});
for(const path of nativePaths)for(const result of read(path).results)natives.set(result.id,{...result,evidence:path});
for(const path of regressionPaths)for(const result of read(path))regression.set(result.id+':'+result.check,{...result,evidence:path});
assert.deepEqual([...browsers.keys()].sort((a,b)=>a-b),expected,'Incomplete browser coverage');
assert.deepEqual([...natives.keys()].sort((a,b)=>a-b),expected,'Incomplete Xcode coverage');
for(const id of expected)assert(regression.has(id+':existing-tests'),'Missing source tests F'+id);
for(const id of expected.filter(id=>![26,28].includes(id)))assert(regression.has(id+':types'),'Missing TypeScript check F'+id);
const knownBaselineFailures=[...regression.values()].filter(r=>r.code!==0);
assert(knownBaselineFailures.every(r=>r.id===29&&r.check==='existing-tests'),'Unexpected source regression');
const games=expected.map(id=>{
 const b=browsers.get(id),n=natives.get(id);assert(b.passed,'Browser failure F'+id+': '+b.error);assert(n.passed,'Xcode failure F'+id+': '+n.error);
 assert.equal(b.errors.length,0,'Browser errors F'+id);assert.equal(b.failedResources.length,0,'Missing browser resources F'+id);
 assert(n.copiedFiles>0,'Missing bundled resource comparison F'+id);
 assert.equal(b.checks.length,12,'Incomplete page/input coverage F'+id);
 for(const width of [414,375]){
  const atWidth=b.checks.filter(c=>(c.width||414)===width);
  assert(atWidth.some(c=>c.page==='home'),'Missing hall viewport F'+id);
  for(let index=0;index<4;index++)assert(atWidth.some(c=>c.page==='cabinet'&&c.index===index),'Missing cabinet viewport F'+id+':'+index);
 }
 assert.equal(b.checks.filter(c=>c.page==='spin-back'&&c.realPointer).length,2,'Missing pointer flow F'+id);
 return{id,browserPassed:true,browserChecks:b.checks.length,maximumJointActors:Math.max(...b.checks.map(c=>c.articulatedActors||0)),jointNames:[...new Set(b.checks.flatMap(c=>c.bones||[]))],unsignedReleaseBuild:true,copiedWebFiles:n.copiedFiles,browserEvidence:b.evidence,nativeEvidence:n.evidence};
});
const out=join(import.meta.dirname,'verification/articulated-20261010');mkdirSync(out,{recursive:true});
// Keep evidence outside the OS temporary directory so the final report remains
// inspectable after its diagnostic browser / DerivedData folders are cleaned.
writeFileSync(join(out,'browser-results.json'),JSON.stringify({results:[...browsers.values()]},null,2));
writeFileSync(join(out,'native-results.json'),JSON.stringify({results:[...natives.values()]},null,2));
writeFileSync(join(out,'regression-results.json'),JSON.stringify([...regression.values()],null,2));
const logs=join(out,'native-logs');mkdirSync(logs,{recursive:true});
for(const n of natives.values())if(n.log&&existsSync(n.log))copyFileSync(n.log,join(logs,`F${n.id}.log`));
const summary={checkedAt:new Date().toISOString(),scope:expected,browserViewports:[{width:414,height:896},{width:375,height:812}],browserChecks:games.reduce((n,g)=>n+g.browserChecks,0),games,regression:[...regression.values()],knownBaselineFailures,realDeviceVerified:false,realStoreKitPurchaseVerified:false};
writeFileSync(join(out,'summary.json'),JSON.stringify(summary,null,2));
for(const id of expected){const source=browsers.get(id).evidence.replace(/\/results\.json$/,'');for(const name of ['home','cabinet0','cabinet1','cabinet2','cabinet3']){const f=join(source,`F${id}-${name}.png`);if(existsSync(f))copyFileSync(f,join(out,`F${id}-${name}.png`));}}
console.log(`PASS ${games.length} titles, ${summary.browserChecks} browser checks and ${natives.size} unsigned Release builds; evidence: ${out}`);
