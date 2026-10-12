// Supplement XCTest results with normal, non-test app launch screenshots.
// Never runs alongside XCTest on the same simulator. No game edits or login.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,statfsSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

const resultFile=process.argv[2];
assert(resultFile,'Supply completed Xcode results.json');
const source=JSON.parse(readFileSync(resultFile));
assert(source.finishedAt,'Wait for all XCTest work to finish on this simulator');
const selected=process.argv.slice(3).filter(x=>/^\d+$/.test(x)).map(Number);
const out=join(source.out,'normal-launch');mkdirSync(out,{recursive:true});
const ocr=join(out,'recognize-screen');
execFileSync('xcrun',['swiftc',join(import.meta.dirname,'recognize-simulator-screen-20261012.swift'),'-o',ocr],{timeout:120000});
const report={startedAt:new Date().toISOString(),sourceResults:resultFile,scope:'Normal launch, rendered screen OCR and screenshots on the same iPhone 11 simulator. No real device or physical/automated gameplay taps.',results:[]};
const save=()=>writeFileSync(join(out,'results.json'),JSON.stringify(report,null,2)+'\n');
for(const game of source.results.filter(g=>g.passed&&(!selected.length||selected.includes(g.id)))){
 const free=statfsSync(out);assert(free.bavail*free.bsize>512*1024**2,'Less than 512 MiB free');
 const item={id:game.id,bundleId:game.bundleId};report.results.push(item);save();
 console.log(`F${game.id}: normal launch + loading-screen exit check`);
 try{
  item.launch=execFileSync('xcrun',['simctl','launch','--terminate-running-process',source.destination,game.bundleId],{encoding:'utf8',timeout:60000}).trim();
  const started=Date.now();
  for(let poll=0;poll<10;poll++){
   await new Promise(resolve=>setTimeout(resolve,poll?4000:8000));
   item.screenshot=join(out,`F${game.id}.png`);
   execFileSync('xcrun',['simctl','io',source.destination,'screenshot',item.screenshot],{stdio:'ignore',timeout:30000});
   item.text=JSON.parse(execFileSync(ocr,[item.screenshot],{encoding:'utf8',timeout:60000}));
   const text=item.text.join(' ');
   item.loading=/Preparing your golden celebration|Loading your|Getting.*ready|Starting.*game|Opening (?:treasury|library)/i.test(text);
   // Generic "coins" and "treasury" copy can also appear on a loading screen.
   // Require actual navigation/authentication/game labels, then exclude loaders.
   item.recognizedGameScreen=/(?:Welcome|Login|Sign in|Register|Guest|Play|Golden Hour|Jade Treasury|Pearl Palace|Ruby Revel|Terms|Agreement|Privacy|Account|Daily|Leaderboard|Cabinet|Continue|Aurum|Sovereign|Golden Tide|Captain|Cargo|Reef|Mint|Vault|Orchard|Lanterns|Hall|Treasury|Gifts|Honours|Member|Settings|Shop|Profile)/i.test(text);
   item.seconds=Math.round((Date.now()-started)/1000);
   save();
   if(!item.loading&&item.recognizedGameScreen)break;
   if(item.seconds>=60)break;
  }
  item.passed=!item.loading&&item.recognizedGameScreen;
  if(!item.passed)item.error='No recognized post-loading game screen within observation window; inspect screenshot';
  item.terminated=execFileSync('xcrun',['simctl','terminate',source.destination,game.bundleId],{encoding:'utf8',timeout:30000}).trim();
 }catch(e){item.passed=false;item.error=String(e);}
 save();console.log(`F${game.id}: normal screen ${item.passed?'PASS':'NEEDS REVIEW'} (${item.seconds??0}s)`);
}
report.finishedAt=new Date().toISOString();report.passed=report.results.length>0&&report.results.every(g=>g.passed);save();
console.log('Normal launch evidence: '+join(out,'results.json'));
if(!report.passed)process.exitCode=1;
