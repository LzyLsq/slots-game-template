import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PageArrival,type ArrivalSurface} from '../assets/scripts/ui/PageArrival';
class Surface implements ArrivalSurface {
 isValid=true;active=true;paused=false;resumes=0;destroys=0;
 constructor(readonly children:Surface[]=[]){ }
 pauseSystemEvents(recursive:boolean):void{assert(recursive);this.paused=true;for(const child of this.children)child.pauseSystemEvents(true);}
 resumeSystemEvents(recursive:boolean):void{assert(recursive);this.paused=false;this.resumes++;for(const child of this.children)child.resumeSystemEvents(true);}
 destroy():void{assert(this.isValid,'do not destroy a retired node twice');this.isValid=false;this.destroys++;}
}
async function main():Promise<void>{
 const barrier=new PageArrival(),oldButton=new Surface(),newButton=new Surface();
 const old=new Surface([oldButton]),next=new Surface([newButton]),shield=new Surface();
 const arrival=barrier.begin(next,old,shield);let ready=false;void arrival.ready.then(()=>{ready=true;});
 await Promise.resolve();assert(!ready);assert(barrier.active);assert(old.paused&&oldButton.paused&&next.paused&&newButton.paused);
 assert(old.isValid&&old.active,'outgoing page stays visible for the entire fade');assert(shield.isValid&&shield.active);
 arrival.finish();await arrival.ready;assert(ready);assert(!barrier.active);assert(!next.paused&&!newButton.paused);
 assert(!shield.active&&!shield.isValid);assert(!old.isValid);assert.equal(next.resumes,1);
 arrival.finish();assert.equal(next.resumes,1);assert.equal(old.destroys,1);
 console.log('PASS full-tree gesture protection, opaque outgoing scene retained, exact once entry/cleanup.');
 const interrupted=barrier.begin(new Surface(),next,new Surface());
 const latestRoot=new Surface(),latestShield=new Surface(),latest=barrier.begin(latestRoot,undefined,latestShield);
 await interrupted.ready;interrupted.finish();assert(barrier.active);assert(latestRoot.paused&&latestShield.active,'late callback cannot unlock the new page');
 latest.finish();await latest.ready;assert(!barrier.active&&!latestRoot.paused);
 const disposingRoot=new Surface(),disposingShield=new Surface(),disposing=barrier.begin(disposingRoot,undefined,disposingShield);
 barrier.cancel();await disposing.ready;assert(disposingRoot.paused);assert(!disposingShield.isValid&&!barrier.active);disposing.finish();assert.equal(disposingRoot.resumes,0);
 const invalid=new Surface(),invalidShield=new Surface(),invalidArrival=barrier.begin(invalid,undefined,invalidShield);
 invalid.isValid=false;invalidShield.isValid=false;invalidArrival.finish();await invalidArrival.ready;assert(!barrier.active);
 console.log('PASS interrupted fades settle waits, stale completion isolation, teardown never resumes destroyed/retiring nodes.');
 let incoming=new Surface();
 for(let i=0;i<500;i++){
  const outgoing=incoming;incoming=new Surface();const seat=new Surface();const ticket=barrier.begin(incoming,outgoing,seat);
  if(i%3===0)barrier.cancel();else ticket.finish();await ticket.ready;
  assert(!barrier.active&&!seat.isValid&&!outgoing.isValid);ticket.finish();
 }
 await barrier.ready;
 const reducedRoot=new Surface(),reduced=barrier.begin(reducedRoot);reduced.finish();await reduced.ready;
 assert(!barrier.active&&!reducedRoot.paused,'reduced motion / first page finishes synchronously');
 console.log('PASS 500 repeated/replaced scene entries, no unresolved waits; instant reduced-motion entry.');
 const app=readFileSync(new URL('../assets/scripts/ui/AureliaApp.ts',import.meta.url),'utf8');
 const render=app.slice(app.indexOf('private render():void'),app.indexOf('private loadingProgress?'));
 const navigate=app.slice(app.indexOf('private async navigate('),app.indexOf('private gameLoading('));
 assert(render.includes('this.pageArrival.cancel()'));assert(render.includes("'Scene arrival input shield'"));
 assert(render.includes('shield?.addComponent(BlockInputEvents)'));assert(render.includes('this.pageArrival.begin(root,previous,shield)'));
 assert(render.includes('const a=opacity(previous,255)'));assert(render.includes('a.opacity=255'));
 assert(!render.includes('previous.active=false'));assert(!render.includes('new Color(0,0,0'));
 assert(render.includes('if(crossfade)tween(o).to(.38,')&&render.includes('else complete()'));
 assert(navigate.includes('const ready=this.pageArrival.ready'));assert(navigate.includes('Promise.all([ready,'));assert(navigate.includes('else await ready'));
 assert(navigate.indexOf('else await ready')<navigate.indexOf('this.busy=false'));
 assert(app.includes('this.transitionShield?.getComponent(UITransform)?.setContentSize(Safe.visibleWidth,this.height)'));
 assert(app.includes('this.busy||this.pageArrival.active'));assert(app.includes('protected onDestroy():void{this.pageArrival.cancel()'));
 assert(render.includes("removeAttribute('data-page-transition')"));assert(render.includes("removeAttribute('data-cabinet-scene')"),'non-game pages clear stale cabinet diagnostics');
 console.log('PASS actual UI hookup: 380ms existing fade, transparent resize-aware shield, await entry before unlocking, teardown and diagnostic cleanup.');
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
