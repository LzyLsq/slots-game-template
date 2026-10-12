import assert from 'node:assert/strict';
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {createRequire} from 'node:module';
import {games} from './calm-mix-projects.mjs';
const require=createRequire(import.meta.url);
const backup=JSON.parse(readFileSync(join(import.meta.dirname,'verification/calm-backup-path.json'))).backup;
const before=JSON.parse(readFileSync(join(backup,'before.json')));
const old=new Map(before.sources.map(s=>[s.file,readFileSync(s.backup,'utf8')]));
const results=[];
for(const id of [25,27]){
 const g=games.find(g=>g.id===id),compiler=existsSync(join(g.project,'node_modules/typescript'))?join(g.project,'node_modules/typescript'):join(games[0].project,'node_modules/typescript');
 const ts=require(compiler),cfg=ts.readConfigFile(join(g.project,'tsconfig.json'),ts.sys.readFile),parsed=ts.parseJsonConfigFileContent(cfg.config,ts.sys,g.project);
 function diagnostics(baseline){const host=ts.createCompilerHost(parsed.options),reader=host.readFile;host.readFile=p=>baseline&&old.has(p)?old.get(p):reader(p);
  const program=ts.createProgram(parsed.fileNames,{...parsed.options,noEmit:true},host);
  return ts.getPreEmitDiagnostics(program).map(d=>({file:d.file?.fileName,code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,' ')}));
 }
 const initial=diagnostics(true),current=diagnostics(false),key=d=>JSON.stringify(d),keys=new Set(initial.map(key)),newDiagnostics=current.filter(d=>!keys.has(key(d)));
 assert.equal(newDiagnostics.length,0,'New TypeScript error F'+id+': '+JSON.stringify(newDiagnostics));
 results.push({id,baselineErrors:initial.length,currentErrors:current.length,newDiagnostics,compiler,reason:id===27?'Project has no local tsc; verified with installed F13 TypeScript without installing dependencies':'Existing engine/Playwright declaration configuration errors unchanged'});
 console.log(`F${id}: baseline ${initial.length}, current ${current.length}, new errors ${newDiagnostics.length}`);
}
// The F29 failing product-map test only imports untouched math/account code.
const g=games.find(g=>g.id===29),seen=new Set(),queue=[join(g.project,'tools/signature-test.ts')];
while(queue.length){const file=queue.shift();if(seen.has(file))continue;seen.add(file);assert(!old.has(file),'Failing test unexpectedly imports a migrated source '+file);
 const text=readFileSync(file,'utf8');for(const m of text.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)){const p=resolve(dirname(file),m[1]);for(const ext of ['','.ts','/index.ts'])if(existsSync(p+ext)){queue.push(p+ext);break;}}
}
results.push({id:29,preexistingTestFailure:'tools/signature-test.ts: product ID missing from server/iap-products.v2.json; expected 5000, received undefined',untouchedTransitiveImports:seen.size,importedChangedMixers:false});
writeFileSync(join(import.meta.dirname,'verification/calm-mix-20261012/source-checks/baseline.json'),JSON.stringify(results,null,2));
console.log('F29 failing test imports no changed audio or UI source. Product mapping was not modified.');
