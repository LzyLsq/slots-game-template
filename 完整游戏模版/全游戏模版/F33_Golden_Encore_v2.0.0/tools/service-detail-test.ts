import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { ACCOUNT_DETAIL, AVATAR_DETAIL, CALENDAR_DETAIL, NAME_NOTICE, RENAME_DETAIL, RANK_DETAIL, HISTORY_DETAIL, RULES_DETAIL, buttonLettering, lanternDay, sheetViewport, noticeLayout } from '../assets/scripts/ui/ServiceDetailLayout';
import { LANGUAGES, setLanguage, tr } from '../assets/scripts/ui/Language';
import { ControlTap } from '../assets/scripts/ui/ControlTap';
const source=readFileSync('assets/scripts/ui/GoldenEncoreApp.ts','utf8');
const tree=ts.createSourceFile('App.ts',source,ts.ScriptTarget.Latest,true);
const klass=tree.statements.find(s=>ts.isClassDeclaration(s)&&s.name?.text==='GoldenEncoreApp') as ts.ClassDeclaration;
const method=(name:string)=>klass.members.find(m=>ts.isMethodDeclaration(m)&&m.name?.getText(tree)===name)!.getText(tree);
const separate=(a:number,aw:number,b:number,bw:number,gap=0)=>a+aw/2+gap<=b-bw/2;
for(const [width,height] of [[112,68],[300,82],[380,85],[620,90],[850,140]]) {
  for(const art of ['ui-wide-ticket','ui-ticket-button','button-gold','button-coral','ui-spin-button']) {
    const box=buttonLettering(art,width,height);
    assert.ok(box.x-box.width/2>=-width/2 && box.x+box.width/2<=width/2);
    assert.ok(box.y-box.height/2>=-height/2 && box.y+box.height/2<=height/2);
    if(art==='ui-wide-ticket')assert.ok(box.x+box.width/2<=width*.38,'Wax seal remains outside text');
    if(art==='ui-ticket-button')assert.ok(box.x+box.width/2<=width*.30,'Ribbon seal remains outside text');
  }
}
for(const x of AVATAR_DETAIL.upperXs) {
  assert.ok(Math.abs(x)+AVATAR_DETAIL.tagWidth/2<=AVATAR_DETAIL.paperHalfWidth,'Keeper captions stay on ivory paper');
  assert.ok(Math.abs(x)+AVATAR_DETAIL.portraitWidth/2<AVATAR_DETAIL.paperHalfWidth,'Keeper portraits avoid jade scroll border');
}
assert.ok(RENAME_DETAIL.copyWidth/2<790*.37,'Rename explanation stays on ivory paper');
assert.ok(RENAME_DETAIL.copyY-RENAME_DETAIL.copyHeight/2>25+92/2+20,'Wrapped rename help remains above the input');
for(const x of ACCOUNT_DETAIL.statXs)assert.ok(x-ACCOUNT_DETAIL.statCopyWidth/2>=-855*.41 && x+ACCOUNT_DETAIL.statCopyWidth/2<=855*.40);
for(let i=0;i<2;i++)assert.ok(separate(ACCOUNT_DETAIL.settingXs[i],ACCOUNT_DETAIL.settingWidth,ACCOUNT_DETAIL.settingXs[i+1],ACCOUNT_DETAIL.settingWidth,10));
assert.ok(separate(RANK_DETAIL.nameX,RANK_DETAIL.nameWidth,RANK_DETAIL.amountX,RANK_DETAIL.amountWidth,28));
assert.ok(RANK_DETAIL.amountX+RANK_DETAIL.amountWidth/2<=850*.40);
assert.ok(separate(HISTORY_DETAIL.copyX,HISTORY_DETAIL.copyWidth,HISTORY_DETAIL.amountX,HISTORY_DETAIL.amountWidth,28));
assert.ok(HISTORY_DETAIL.amountX+HISTORY_DETAIL.amountWidth/2<=850*.40);
for(let current=1;current<=7;current++)for(const ready of [true,false])for(let day=1;day<=7;day++) {
  const value=lanternDay(day,current,ready);
  assert.equal(value.current,day===current);
  assert.equal(value.state,day<current || day===current&&!ready?'TAKEN':day===current?'READY':'NEXT');
  assert.equal(value.art,day===current?'button-coral':'ui-wide-ticket');
  for(const choice of LANGUAGES){setLanguage(choice.code);assert.ok(tr(value.state));assert.ok(tr('DAY {day}',{day}).includes(String(day)));}
}
for(const [w,h] of [[320,568],[393,769],[430,932],[739,766],[1024,768]]) {
  const scale=Math.min(w/1024,h/1800),shield=sheetViewport(w,h);
  for(const page of ['home','login','account','game','store','rewards','rank','ledger']) {
    const notice=noticeLayout(page,w,h);
    assert.ok(w/2-notice.width*notice.scale/2>=0 && w/2+notice.width*notice.scale/2<=w);
    assert.ok(h/2-(notice.y+notice.height/2)*notice.scale>=0 && h/2-(notice.y-notice.height/2)*notice.scale<=h);
    if(['store','rewards','rank','ledger'].includes(page))assert.ok(notice.y-notice.height/2>-737,'Notice avoids the service footer');
  }
  assert.ok(shield.width*scale>=w && shield.height*scale>=h,'No unshielded side bands');
  for(const x of ACCOUNT_DETAIL.settingXs){assert.ok(w/2+(x-150)*scale>=0 && w/2+(x+150)*scale<=w);}
  assert.ok(h/2-(-682-41)*scale<=h,'Settings remain above the page footer');
}

// Exercise actual production sheet ownership and tap guards. No duplicate
// timing model, no storage mutation, and no Cocos runtime needed by this test.
class V3 { constructor(public x=0,public y=0,public z=0){} clone(){return new V3(this.x,this.y,this.z);} }
class N {
  static EventType={TOUCH_START:'start',TOUCH_MOVE:'move',TOUCH_END:'end',TOUCH_CANCEL:'cancel',NODE_DESTROYED:'destroyed'};
  isValid=true; position=new V3(0,20,0); alpha={opacity:255}; callbacks=new Map<string,Array<(e?:any)=>void>>();
  once(type:string,cb:(e?:any)=>void){this.callbacks.set(type,[...(this.callbacks.get(type)||[]),cb]);}
  on(type:string,cb:(e?:any)=>void){this.once(type,cb);}
  setPosition(x:number,y:number,z:number){this.position=new V3(x,y,z);}
  destroy(){this.isValid=false;this.callbacks.get('destroyed')?.forEach(cb=>cb());}
  emit(type:string,id=1,x=0,y=0){this.callbacks.get(type)?.forEach(cb=>cb({getID:()=>id,getLocation:()=>({x,y})}));}
}
class Chain {
  steps:Array<()=>void>=[];stopped=false;
  constructor(public target:any){}
  to(_time:number,value:any){this.steps.push(()=>Object.assign(this.target,value));return this;}
  call(fn:()=>void){this.steps.push(fn);return this;}
  start(){return this;}
  finish(){while(this.steps.length&&!this.stopped)this.steps.shift()!();}
}
let chains:Chain[]=[];
const tween=(target:any)=>{const c=new Chain(target);chains.push(c);return c;};
const Tween={stopAllByTarget:(target:any)=>chains.filter(c=>c.target===target).forEach(c=>c.stopped=true)};
const opacity=(target:N,value=255)=>{target.alpha.opacity=value;return target.alpha;};
const Harness=vm.runInNewContext(ts.transpileModule(`class Harness { closingSheets=new Set(); reduced=false; transitionLock=false; ${method('presentSheet')} ${method('dismissSheet')} ${method('bindTap')} } Harness;`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,{Node:N,Tween,tween,opacity,ControlTap});
const app=new Harness();let completed=0;
const sheet=new N(),panel=new N();app.presentSheet(sheet,panel);
assert.equal(panel.position.y,12);assert.equal(panel.alpha.opacity,0);
chains.forEach(c=>c.finish());assert.equal(panel.position.y,20);assert.equal(panel.alpha.opacity,255);
chains=[];const hit=new N();let actions=0;app.bindTap(hit,()=>actions++);
app.dismissSheet(sheet,()=>completed++);app.dismissSheet(sheet,()=>completed++);
assert.equal(chains.length,1,'Repeated close does not schedule repeated navigation');
assert.ok(sheet.isValid && app.closingSheets.has(sheet),'Shield survives the full fade');
hit.emit('start');hit.emit('end');assert.equal(actions,0,'No click-through during close');
chains[0].finish();assert.ok(!sheet.isValid);assert.equal(completed,1);assert.equal(app.closingSheets.size,0);
hit.emit('start');hit.emit('end');assert.equal(actions,1,'Normal input resumes after close');
// All row/keeper taps use this exact production binding: an excursion cannot
// be rearmed by returning to the start, nor can a second finger end the tap.
hit.emit('start',1,0,0);hit.emit('move',1,60,0);hit.emit('move',1,0,0);hit.emit('end',1,0,0);
assert.equal(actions,1,'Dragging out and back is not a deliberate tap');
hit.emit('start',1,0,0);hit.emit('end',2,0,0);assert.equal(actions,1,'Other finger cannot finish the owning tap');
hit.emit('cancel',1);hit.emit('end',1,0,0);assert.equal(actions,1,'Cancelled keeper/row taps stay cancelled');
hit.emit('start',1,0,0);hit.emit('end',1,4,3);assert.equal(actions,2,'Small real tap remains responsive');

chains=[];const destroyed=new N();app.dismissSheet(destroyed,()=>completed++);destroyed.destroy();chains[0].finish();assert.equal(completed,1,'External destroy cancels a stale close callback');
chains=[];app.reduced=true;const reduced=new N();app.presentSheet(reduced,new N());app.dismissSheet(reduced,()=>completed++);assert.equal(chains.length,0);assert.equal(completed,2);assert.equal(app.closingSheets.size,0);
for(const name of ['rewardsPage','avatarPicker','mailbox','atlasPage','rulesPage','keeperInteraction']){assert.ok(method(name).includes('this.bindTap('));assert.ok(!method(name).includes('.on(Node.EventType.TOUCH_END'),'Rows use drag/cancel/multitouch-safe binding');}
for(const name of ['rewardCalendar','languagePicker','avatarPicker','rename','confirmReset','mailbox'])assert.ok(method(name).includes('this.presentSheet('));
assert.ok(method('button').includes('buttonLettering(art, w, h)'));
for(const name of ['rankPage','accountPage','ledgerPage'])assert.ok(method(name).includes('singleLine('));
assert.ok(method('storePage').includes('shopPlacement(slot, cabinetSize.width, cabinetSize.height)'),'Keep shop source registration intact');
assert.ok(!method('presentSheet').includes('setTimeout') && !method('dismissSheet').includes('setTimeout'));
console.log('PASS service detail polish: generated lettering safe zones, seal-free totals, five responsive sizes, 98 lantern states × five languages, actual modal reveal/close/cancel/reduced-motion/input shielding, deliberate row taps, preserved registered shop');

assert.ok(method('toast').includes('n.setScale(layout.scale, layout.scale, 1)'),'Notice must share the real UI scale, not offscreen pixel coordinates');
assert.ok(method('toast').includes('NODE_DESTROYED') && method('startSurface').includes('this.toastNode?.destroy()'),'Notice ownership ends on replacement/page transition');

assert.ok(method('button').includes("skin === 'ticket' ? INK : CREAM"),'Dark jade and coral hardware needs ivory lettering');
assert.ok(method('rewardCalendar').includes('const lettering = day.current ? CREAM : INK'),'Current lantern row needs high-contrast lettering');

assert.ok(separate(CALENDAR_DETAIL.dayX,CALENDAR_DETAIL.dayWidth,CALENDAR_DETAIL.amountX,CALENDAR_DETAIL.amountWidth,10));
assert.ok(separate(CALENDAR_DETAIL.amountX,CALENDAR_DETAIL.amountWidth,CALENDAR_DETAIL.stateX,CALENDAR_DETAIL.stateWidth,30));
assert.ok(CALENDAR_DETAIL.stateX+CALENDAR_DETAIL.stateWidth/2<=CALENDAR_DETAIL.jadeCoreHalfWidth,'Calendar status avoids the jade plaque carved end');

assert.ok(NAME_NOTICE.width/2<=790*.37,'Validation notice stays on the scroll paper');
assert.ok(NAME_NOTICE.y+NAME_NOTICE.height/2<25-92/2-10,'Validation notice stays below input');
assert.ok(NAME_NOTICE.y-NAME_NOTICE.height/2>-185+90/2,'Validation notice stays above actions');
assert.ok(method('rename').includes("this.toast('Please use at least two characters.', plate)"));
assert.ok(method('toast').includes('node(anchor ?? this.node'),'Field feedback uses the sheet owner');
for(const [w,h] of [[320,568],[393,769],[739,766]]) {
  const top=noticeLayout('account',w,h).y+56;
  assert.ok(top<(h/w<1.9?670.5:746),'Unanchored account notice clears the header and subtitle');
}

// Run the actual production rulebook layout and tap bindings at both aspect
// ratios. Geometry and the selected guide are checked together, not a second
// handwritten rendering implementation.
for (const compact of [false, true]) {
  const labels: Array<{ text: string; x: number; y: number; width: number; height: number }> = [];
  const hits: Array<N & { name: string; y: number; height: number }> = [];
  const emblems: Array<{ y: number; height: number }> = [];
  const RulesHarness = vm.runInNewContext(ts.transpileModule(`class RulesHarness {
    closingSheets=new Set(); transitionLock=false; guides=[];
    image(_root,_art,_x,y,_width,height) { emblems.push({y,height}); return new Node(); }
    float() {} button() {} playClick() {}
    roomGuide(_root,mode) { this.guides.push(mode); }
    ${method('bindTap')} ${method('rulesPage')}
  } RulesHarness;`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    Node: N, ControlTap, RULES_DETAIL, INK: {}, emblems,
    view: { getVisibleSize: () => ({ width: compact ? 320 : 390, height: compact ? 568 : 844 }) },
    liveLabel: (_root:any,text:string,x:number,y:number,width:number,height:number) => labels.push({text,x,y,width,height}),
    node: (_root:any,name:string,_x:number,y:number,_width:number,height:number) => {
      const hit=Object.assign(new N(),{name,y,height}); hits.push(hit); return hit;
    },
  });
  const rules = new RulesHarness(); rules.rulesPage(new N());
  assert.equal(hits.length,4); assert.equal(emblems.length,4);
  assert.equal(labels.length,compact?8:12);
  const titles=['JADE FERRY','PEARL GARDEN','EMBER FOUNDRY','CELESTIAL VAULT'];
  const layout=RULES_DETAIL[compact?'compact':'full'];
  for (let i=0;i<4;i++) {
    const hit=hits[i],title=labels.find(label=>label.text===titles[i])!;
    assert.equal(hit.y,layout.rowY-i*layout.rowStep);
    assert.equal(hit.height,layout.hitHeight);
    assert.ok(title.y-title.height/2>=hit.y-hit.height/2 && title.y+title.height/2<=hit.y+hit.height/2,'Title is inside its own target');
    assert.ok(emblems[i].height+4<=hit.height,'Floating emblem stays inside its own row');
    hit.emit('start'); hit.emit('end'); assert.equal(rules.guides.at(-1),i,'Each row opens its own guide');
    if(i<3) {
      const next=hits[i+1],nextTitle=labels.find(label=>label.text===titles[i+1])!;
      assert.ok(hit.y-hit.height/2>next.y+next.height/2,'Neighboring touch areas never overlap');
      if(!compact) {
        const detail=labels[3+i*2];
        assert.ok(detail.y-detail.height/2>=nextTitle.y+nextTitle.height/2+10,'Body clears the following title');
        assert.ok(detail.y-detail.height/2>=hit.y-hit.height/2,'Body stays inside its own target');
      }
    }
  }
  const firstTitle=labels.find(label=>label.text===titles[0])!;
  assert.ok(firstTitle.y+firstTitle.height/2<=labels[1].y-labels[1].height/2-10,'First title clears subtitle');
  const lastText=compact?labels.find(label=>label.text===titles[3])!:labels[9];
  const guarantee=labels.find(label=>label.text.startsWith('NEW PLAYER · BIG BY'))!;
  assert.ok(lastText.y-lastText.height/2>=guarantee.y+guarantee.height/2+12,'Final row clears the guarantee');
  assert.ok(hits.every(hit=>hit.y+hit.height/2<=260 && hit.y-hit.height/2>=-82),'All targets remain on rulebook paper');
  hits[0].emit('start');hits[0].emit('move',1,60,0);hits[0].emit('move',1,0,0);hits[0].emit('end');
  assert.deepEqual(Array.from(rules.guides),[0,1,2,3],'Drag is not a guide tap');
}
console.log('PASS rulebook detail: production full/compact layout, disjoint touch rows, subtitle/body/footer clearance, generated-paper bounds, correct room guides, no drag activation');
