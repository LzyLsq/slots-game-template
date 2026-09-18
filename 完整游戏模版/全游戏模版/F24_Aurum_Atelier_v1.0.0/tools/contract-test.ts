import assert from 'node:assert/strict';
import { CONTRACT_GAMES,contractBoard,contractWon,canStep,newContracts,chargeContract,normalizeContracts,type ContractRun,type ContractMode } from '../assets/scripts/math/LampContract';
import { LampContractService } from '../assets/scripts/services/LampContractService';
import { SaveService,MemoryStorage,createPlayerScope } from '../assets/scripts/services/SaveService';
import { LocalAuthService } from '../assets/scripts/services/LocalAuthService';
import { EconomyService } from '../assets/scripts/services/EconomyService';
import { PlayerProfileService } from '../assets/scripts/services/PlayerProfileService';
import { RemoteSpinJournal } from '../assets/scripts/services/RemoteSpinJournal';
import { ResultGenerator } from '../assets/scripts/math/ResultGenerator';
import { GAME_CONFIGS } from '../assets/scripts/math/GameConfigs';
import { SeededRNG } from '../assets/scripts/core/SeededRNG';
import { PRIVACY_VERSION,TERMS_VERSION } from '../assets/scripts/core/ReleaseConfig';

function solve(id:typeof CONTRACT_GAMES[number],index:number,mode:ContractMode):number[]{
 const b=contractBoard(id,index);
 const visit=(r:ContractRun):number[]|undefined=>{if(contractWon(b,r))return r.path;for(let to=0;to<16;to++){if(canStep(b,r,to)){const next={...r,path:[...r.path,to]};if(to===b.exit&&!contractWon(b,next))continue;const path=visit(next);if(path)return path;}}};
 const path=visit({board:index,mode,path:[b.start]});assert(path,`${id}/${index}/${mode} must be solvable`);return path;
}
async function main(){
 for(const id of CONTRACT_GAMES)for(let i=0;i<3;i++)for(const mode of ['explorer','master'] as const)solve(id,i,mode);
 const invalid=newContracts();invalid['golden-hour'].energy=NaN;invalid['golden-hour'].active={board:0,mode:'master',path:[12,1]};
 const cleaned=normalizeContracts(invalid);assert.equal(cleaned['golden-hour'].energy,8);assert.equal(cleaned['golden-hour'].active,undefined);
 const charged=newContracts();chargeContract(charged,{gameId:'golden-hour',grid:['bell','bell','bell','ruby']});assert.equal(charged['golden-hour'].energy,11);assert.equal(charged['ruby-revel'].energy,8);
 for(let i=0;i<50;i++)chargeContract(charged,{gameId:'golden-hour',grid:['bell']});assert.equal(charged['golden-hour'].energy,24);
 const storage=new MemoryStorage();const save=new SaveService(storage);save.acceptCompliance(TERMS_VERSION,PRIVACY_VERSION);const auth=new LocalAuthService(save);const login=await auth.guestLogin();assert(login.ok);const user=save.read().currentUserId!;
 const service=new LampContractService(save),economy=new EconomyService(save,new PlayerProfileService(save));const before=economy.balance();
 assert(service.start('golden-hour','master',0));assert.equal(service.progress('golden-hour')!.energy,0);assert(!service.start('golden-hour','master',0));
 assert.equal(service.step('golden-hour',1),'invalid');assert(service.step('golden-hour',8)==='moved');
 const reload=new SaveService(storage),resume=new LampContractService(reload);assert.deepEqual(resume.progress('golden-hour')!.active!.path,[12,8]);assert(resume.undo('golden-hour'));assert(resume.reset('golden-hour'));
 const path=solve('golden-hour',0,'master');for(const to of path.slice(1,-1))assert.equal(resume.step('golden-hour',to),'moved');assert.equal(resume.step('golden-hour',path[path.length-1]),'won');assert.equal(resume.step('golden-hour',path[path.length-1]),'invalid');
 assert.equal(resume.stars(),3);assert.equal(resume.progress('golden-hour')!.completed,1);assert.equal(reload.read().players[user].credits,before,'Collectible game must never affect coin balance');
 reload.update(d=>{d.playerData[user].contracts['golden-hour'].energy=8;});assert(resume.start('golden-hour','explorer',0));for(const to of solve('golden-hour',0,'explorer').slice(1))resume.step('golden-hour',to);assert.equal(resume.stars(),3,'Repeat/easier completion cannot duplicate or reduce stars');
 reload.update(d=>{d.players.other={...d.players[user],id:'other',username:'other'};d.playerData.other=createPlayerScope();d.currentUserId='other';});assert.equal(resume.stars(),0);assert.equal(resume.progress('golden-hour')!.energy,8,'Accounts must remain isolated');
 const current=new SaveService(storage),e=new EconomyService(current,new PlayerProfileService(current)),generator=new ResultGenerator(),r=generator.generate(GAME_CONFIGS[0],GAME_CONFIGS[0].bets[0],new SeededRNG(42));
 assert(e.reserveSpin('contract-test-spin-0001',GAME_CONFIGS[0].bets[0]));assert(e.settleSpin('contract-test-spin-0001',r.totalWin,r));const gained=current.currentScope()!.contracts['golden-hour'].energy;assert(gained>8);assert(!e.settleSpin('contract-test-spin-0001',r.totalWin,r));assert.equal(current.currentScope()!.contracts['golden-hour'].energy,gained);
 const journal=new RemoteSpinJournal(current);journal.begin('contract-remote-0001','golden-hour',GAME_CONFIGS[0].bets[0]);journal.settle('contract-remote-0001',r,90000);const remoteEnergy=current.currentScope()!.contracts['golden-hour'].energy;assert(remoteEnergy>gained);assert.throws(()=>journal.settle('contract-remote-0001',r,90000));assert.equal(current.currentScope()!.contracts['golden-hour'].energy,remoteEnergy);
 // Atomic failure leaves both the wallet and collectible charge unchanged.
 let fail=false;const failing={getItem:(k:string)=>storage.getItem(k),removeItem:(k:string)=>storage.removeItem(k),setItem:(k:string,v:string)=>{if(fail)throw Error('quota');storage.setItem(k,v);}};
 const durable=new SaveService(failing),dEconomy=new EconomyService(durable,new PlayerProfileService(durable));assert(dEconomy.reserveSpin('contract-quota-0001',GAME_CONFIGS[0].bets[0]));const saved=JSON.stringify(durable.read());fail=true;assert.throws(()=>dEconomy.settleSpin('contract-quota-0001',r.totalWin,r));assert.equal(JSON.stringify(durable.read()),saved);
 console.log('PASS: 24 solvable routes; invalid moves/save normalization; charge caps; resume/undo; exactly-once album; account isolation; atomic local + remote spin charge; unchanged coin rewards; storage failure.');
}
void main();
