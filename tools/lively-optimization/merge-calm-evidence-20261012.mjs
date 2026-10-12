// Merge independently tested game groups. Never hide a failure behind a later
// passing duplicate; any failure must be diagnosed before synchronization.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {games,revision} from './calm-mix-projects.mjs';
const files=process.argv.slice(2);
assert(files.length,'Supply browser results.json paths');
const records=new Map();
for(const file of files){
 const result=JSON.parse(readFileSync(file));
 for(const g of result.games){
  assert(g.passed,`Browser failed F${g.id} in ${file}: ${g.error}`);
  records.set(g.id,g);
 }
}
for(const g of games)assert(records.has(g.id),'Missing browser evidence F'+g.id);
const out=join(import.meta.dirname,'verification/calm-mix-20261012');mkdirSync(out,{recursive:true});
const report={checkedAt:new Date().toISOString(),revision,scope:'Browser playback/state checks for real accepted spin, ignored repeated taps, rules, five award presentation fixtures, collect/skip, music toggle, simulated host background/resume and lobby return. Not human listening, real iPhone or payment testing.',sourceReports:files,games:games.map(g=>records.get(g.id))};
const file=join(out,'combined-browser.json');writeFileSync(file,JSON.stringify(report,null,2));console.log(file);
