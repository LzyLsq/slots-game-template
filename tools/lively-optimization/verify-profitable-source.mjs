import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('/Applications/CocosCreator.app/Contents/Resources/app.asar.unpacked/node_modules/typescript');
const base=join(import.meta.dirname,'../../完整游戏模版/全游戏模版');
const common=[13,14,15,17,18,19,20,21,22,23,24,29,30,31,33];
const ids=[...common,16,25,26,27,28].sort((a,b)=>a-b);
let locale='en';
for(const id of ids){
  const project=join(base,readdirSync(base).find(n=>n.startsWith(`F${id}_`)&&(id!==25||n.includes('_Cocos_'))));
  const app=join(project,id===26?'src/app.js':'assets/scripts/'+(id===25?'VelvetApp.ts':id===27?'SovereignApp.ts':id===28?'RegattaApp.ts':'ui/AureliaApp.ts'));
  const source=readFileSync(app,'utf8');
  const helper=common.includes(id)?readFileSync(join(project,'assets/scripts/vfx/WinPresentation.ts'),'utf8'):source;
  const policy=helper.match(/(?:export )?function isBigWin\([^\n]+/)[0];
  const js=ts.transpile(policy.replace(/^export /,''));
  const isBigWin=Function(js+';return isBigWin;')();
  for(const [total,bet,expected] of [[0,100,false],[99,100,false],[100,100,false],[100.001,100,true],[101,100,true],[10000,100,true],[1,0,false],[101,-1,false],[NaN,100,false],[Infinity,100,false],[101,NaN,false]])assert.equal(isBigWin(total,bet),expected,`F${id}: ${total}/${bet}`);
  for(const file of [app,...(common.includes(id)?[join(project,'assets/scripts/vfx/WinPresentation.ts')]:[])]){
    const code=readFileSync(file,'utf8'),parsed=ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,id===26?ts.ScriptKind.JS:ts.ScriptKind.TS);
    assert.equal(parsed.parseDiagnostics.length,0,`F${id}: invalid syntax ${file}`);
    const names=parsed.statements.filter(s=>ts.isFunctionDeclaration(s)&&s.name).map(s=>s.name.text);
    assert.equal(new Set(names).size,names.length,`F${id}: duplicate helper declarations`);
  }
  if(common.includes(id)){
    const output=ts.transpileModule(helper,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
    const exports={};Function('exports','require',output)(exports,()=>({language:()=>locale,tr:x=>x}));
    for(const ratio of [0,.99,1,1.00001,1.01,10,50,100])assert.equal(exports.winTier(ratio)>0,ratio>1,`F${id} tier ${ratio}`);
    assert.equal(exports.winTier(Infinity),0);
    for(locale of ['en','zh-CN','zh-TW','ja','ko']){
      for(const ratio of [1,1.01,10,50,100])assert(exports.tierCaption(ratio)&&!exports.tierCaption(ratio).includes('undefined'));
      assert(exports.tierRules());
      assert(exports.awardReason({primaryKind:'line',paylines:[],modeLabel:'line'},{kind:'line',lineIndex:0,credits:101}));
    }
    assert(source.includes('const roundBet=this.bet;')&&source.includes('isBigWin(result.totalWin,roundBet)'));
  }else assert(source.includes(id===25?'isBigWin(r.total,r.bet)':id===27?'isBigWin(round.totalWin,round.bet)':id===28?'isBigWin(this.round.totalWin, this.round.bet)':id===26?'isBigWin(lastWin,roundBet)':'isBigWin(result.totalWin,roundBet)'),`F${id}: missing real payout routing`);
  console.log(`F${id} source PASS: strict >stake, normal ≤stake, finite inputs, actual result routing`);
}
console.log(`All ${ids.length} games source policy PASS`);
