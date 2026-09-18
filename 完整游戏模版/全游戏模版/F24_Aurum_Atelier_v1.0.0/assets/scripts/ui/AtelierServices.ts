import { Color, Graphics, Label, Node, tween, Tween, Vec3 } from 'cc';
import { box, text, bindPress, outlined, opacity } from './SalonArt';
import { language, tr } from './Language';
import { ATELIER_TRANSLATIONS } from './AtelierTranslations';
import { atelierPortrait } from './AtelierLobby';
import { hallStandings } from '../services/RankService';
import { ECONOMY } from '../math/EconomyProfile';

export const ATELIER_SERVICE_METADATA={theme:'AURUM ATELIER',pages:['store','rewards','rank','profile'],layoutVersion:1,ranking:'local-exhibition-and-verified-remote',coinPacks:[20000,110000,240000,520000]} as const;
const ink='#183D33',paper='#183D33',gold='#CBA358',muted='#536454';
const t=(value:string):string=>{const index=['zh-CN','zh-TW','ja','ko'].indexOf(language());return index<0?value:ATELIER_TRANSLATIONS[value]?.[index]??tr(value);};
const amount=(value:number):string=>Math.max(0,Math.floor(value)).toLocaleString('en-US');
function copy(parent:Node,value:string,x:number,y:number,w:number,h=62,size=37,color=ink):Label{
 size=Math.max(34,size);
 const l=text(parent,t(value),x,y,w,h,size,color);l.node.name='Atelier copy '+value;l.fontFamily='Arial';l.lineHeight=size*1.12;l.enableWrapText=true;l.overflow=Label.Overflow.SHRINK;
 const fit=l.node.getComponent('TextFit');if(fit)fit.enabled=false;return l;
}
function stroke(parent:Node,x:number,y:number,w:number,color=gold):void{const g=box(parent,'Inlaid brass rule',x,y,w,3).addComponent(Graphics);g.strokeColor=new Color(color);g.lineWidth=2;g.moveTo(-w/2,0);g.lineTo(w/2,0);g.stroke();}
/** Material-backed panels inherit the app's sculpted nine-slice gold assets. */
function well(app:any,parent:Node,name:string,x:number,y:number,w:number,h:number,dark=false):Node{
 const n=dark?app.art.lacquer(parent,x,y,w,h):app.art.enamel(parent,x,y,w,h);n.name=name;return n;
}
function button(app:any,parent:Node,name:string,x:number,y:number,w:number,h:number,label:string,action:()=>void,light=false):Node{
 const hit=box(parent,name,x,y,w,h),face=well(app,hit,name+' gilded face',0,0,w,h,!light);
 // Text stays inside the enamel, clear of ribbon folds and gilded end caps.
 copy(face,label,0,0,w*.72,h*.62,36,light?ink:paper);
 bindPress(hit,face,()=>{app.audio.play('tap');action();},{depth:4,compression:.985,release:.2});return hit;
}
function ambientCopy(parent:Node,value:string,x:number,y:number,w:number,h:number,size:number,secondary=false):Label{return outlined(copy(parent,value,x,y,w,h,size,secondary?'#3D5746':'#244738'),'#FFF3DD',2);}
function title(stage:Node,heading:string,subtitle:string):void{ambientCopy(stage,heading,0,620,910,76,47);ambientCopy(stage,subtitle,0,543,912,68,35,true);stroke(stage,0,493,874);}
function seal(app:any,parent:Node,x:number,y:number,size:number,index:number,active=false):Node{
 const n=box(parent,'Hallmark '+index,x,y,size,size);
 app.art.image(n,'canopy-button-0',0,0,size,size);
 app.art.image(n,'symbols',0,0,size*.70,size*.70,index===7?14:index===6?1:index===5?15:0);
 if(active){const glint=app.art.light(n,0,size*.27,size*.28,size*.43,size*.43,165);glint.name='Current hallmark bevel sparkle';}
 return n;
}
function store(app:any,stage:Node):void{
 title(stage,'THE COIN COUNTER','Choose a minting batch');const stamp=app.generation;const mount=well(app,stage,'Coin showcase',0,177,900,560,true);
 const opening=copy(mount,'Opening the counter…',0,0,760,84,37,paper);
 void app.services.store.catalog().then((items:any[])=>{if(!stage.isValid||stamp!==app.generation)return;if(!items.length)throw new Error('Empty catalogue');opening.node.active=false;
 let selected=0,display:Node|undefined;const names=['Starter','Artisan','Master','Patron'];const tabs:Node[]=[];
 const show=(index:number):void=>{if(!stage.isValid)return;selected=index;display?.destroy();display=box(mount,'Selected coin batch',0,0,860,520);const item=items[index];
 copy(display,names[index],0,193,760,70,48,paper);stroke(display,0,142,710);const coins=box(display,'Stack of minted coins',-269,-5,210,235);
 app.art.image(coins,'symbols',0,0,210,220,15);
 if(index>0)app.art.image(coins,'symbols',-56,-70,98,98,0);
 if(index>1)app.art.image(coins,'symbols',68,-61,100,104,6);
 if(index>2)app.art.image(coins,'symbols',15,76,104,109,1);
 copy(display,'COINS DELIVERED',111,70,460,52,31,ink);copy(display,amount(item.credits+item.bonus),111,-1,470,94,62,paper);copy(display,t('Included bonus')+' · '+amount(item.bonus),111,-81,470,64,31,paper);
 copy(display,item.available?'Verified delivery only':'Preview catalogue',0,-191,760,64,33,paper);
 const ring=app.art.light(coins,0,0,0,180,164,74);ring.setSiblingIndex(0);
 if(!app.reduced){const glow=opacity(ring,44),loop=tween(glow).to(1.3,{opacity:110},{easing:'sineInOut'}).to(1.8,{opacity:44},{easing:'sineInOut'}).union().repeatForever().start();ring.once(Node.EventType.NODE_DESTROYED,()=>loop.stop());}
 tabs.forEach((node,i)=>{const marker=node.getChildByName('Selected mark');if(marker)marker.active=i===index;});
 const old=stage.getChildByName('Checkout');old?.destroy();button(app,stage,'Checkout',0,-463,870,116,item.available?item.displayPrice:'Purchase unavailable',()=>{if(item.available)void app.purchase(item.id);else app.toast('Secure Apple purchases are unavailable on this device.');});
 if(!app.reduced){coins.setScale(.96,.96,1);tween(coins).to(.24,{scale:new Vec3(1,1,1)},{easing:'sineOut'}).start();}
 };
 items.slice(0,4).forEach((item:any,i:number)=>{const x=(i-1.5)*232,n=button(app,stage,'Choose batch '+item.id,x,-239,220,176,t(names[i])+'\n'+amount(item.credits+item.bonus),()=>show(i),true);tabs.push(n);const marker=box(n,'Selected mark',0,-64,56,5).addComponent(Graphics);marker.fillColor=new Color(ink);marker.roundRect(-28,-2,56,4,2);marker.fill();});show(selected);
 }).catch(()=>{if(!stage.isValid||stamp!==app.generation)return;opening.node.active=true;opening.string=t('Shop unavailable. Please try again.');opening.node.setPosition(0,80);button(app,mount,'Retry coin catalogue',0,-76,620,110,'Retry',()=>app.render(),true);});
 button(app,stage,'Synchronize purchases',0,-588,870,88,'Unfinished purchases',()=>void app.restorePurchases(),true);ambientCopy(stage,'Virtual coins. No cash value.',0,-668,916,56,34,true);
}
function rewards(app:any,stage:Node):void{
 const today=new Date().toISOString().slice(0,10),scope=app.services.save.currentScope(),progress=scope?.checkIn,claimed=progress?.lastClaimDate===today,active=claimed?((progress?.cycleDay??0)+6)%7:(progress?.cycleDay??0);
 title(stage,'DAILY HALLMARKS','Seven visits. Seven rewards.');const book=well(app,stage,'Hallmark book',0,91,920,735);
 stroke(book,0,235,724);copy(book,claimed?'TODAY’S REWARD COLLECTED':'TODAY’S REWARD',0,286,728,52,34,ink);
 const rewards=app.services.checkIn.rewards as readonly number[];rewards.forEach((value,i)=>{const x=i<3?(i-1)*261:(i-4.5)*213,y=i<3?137:-70,current=i===active,done=i<active||(current&&claimed);const n=seal(app,book,x,y,current?137:115,i+1,current&&!claimed);
 if(!current&&!done)opacity(n,172);
 if(current){const halo=app.art.light(n,0,0,0,178,164,110);halo.setSiblingIndex(0);
  if(!claimed&&!app.reduced){const phase={v:0},loop=tween(phase).to(2.1,{v:1},{easing:'sineInOut',onUpdate:()=>{if(n.isValid)n.setPosition(x,y+Math.sin(phase.v*Math.PI)*5);}}).set({v:0}).union().repeatForever().start();n.once(Node.EventType.NODE_DESTROYED,()=>loop.stop());}
 }
 if(done){const check=copy(n,'✓',39,-26,46,46,36,ink);check.node.name='Collected hallmark '+(i+1);}
 copy(book,tr('DAY '+(i+1)),x,y-73,i<3?220:201,40,34,done?muted:ink);
 copy(book,amount(value),x,y-116,i<3?220:201,43,37,ink);
 bindPress(n,n,()=>{if(current&&!claimed)void app.claim('check-in');else app.toast(tr('DAY '+(i+1))+' · '+amount(value));});});
 button(app,book,'Claim hallmark',0,-270,796,106,claimed?'Come back tomorrow':'Stamp & collect',()=>{if(!claimed)void app.claim('check-in');else app.toast('Next reward after 00:00 UTC.');});
 const collected=!!scope?.claims['daily-free:'+today],allowance=well(app,stage,'Allowance drawer',0,-463,920,225,true);
 copy(allowance,'WORKSHOP ALLOWANCE',-156,49,520,52,33,paper);copy(allowance,amount(ECONOMY.daily),-156,-28,520,70,48,paper);
 button(app,allowance,'Collect allowance',284,0,299,125,collected?'COLLECTED':'Collect allowance',()=>{if(!collected)void app.claim('daily');else app.toast('Today’s gift is already collected.');},true);
 ambientCopy(stage,'Resets at 00:00 UTC',0,-631,900,56,34,true);
}
function rank(app:any,stage:Node):void{
 title(stage,'Rankings',app.services.remoteMode?'Verified leaderboard':'Workshop standings');
 const stamp=app.generation,p=app.services.profile.current();
 const ribbon=well(app,stage,'Personal ranking ribbon',0,368,920,190,true);
 app.art.image(ribbon,'symbols',-348,0,101,101,9);
 copy(ribbon,'YOUR RANK',-121,41,300,48,32,paper);
 const ownRank=copy(ribbon,'—',-121,-33,300,74,49,paper);
 copy(ribbon,'TOTAL WON',239,41,337,48,32,paper);copy(ribbon,amount(p?.totalWin??0),239,-33,337,74,46,paper);
 const ledger=well(app,stage,'Record ledger',0,-72,920,632);
 copy(ledger,app.services.remoteMode?'Real account records only':'Includes simulated workshop characters',0,232,660,48,28,muted);stroke(ledger,0,208,786);
 let rows:Node|undefined,controls:Node|undefined,page=0;
 const pending=copy(ledger,'Loading rankings…',0,0,760,85,38,muted);
 const valid=()=>stage.isValid&&stamp===app.generation;
 const show=(players:any[],failed=false):void=>{
  if(!valid())return;
  pending.node.active=false;rows?.destroy();controls?.destroy();
  const current=players.find(r=>r.current);
  ownRank.string=current?'#'+current.rank:failed?'—':t('Unranked');
  const pages=Math.max(1,Math.ceil(players.length/4));page=Math.min(page,pages-1);
  const draw=()=>{
   rows?.destroy();rows=box(ledger,'Actual ranking entries',0,0,860,465);
   players.slice(page*4,page*4+4).forEach((r,i)=>{
    const y=141-i*107;
    if(r.current)well(app,rows!,'Your ranking highlight',0,y,818,102,true);
    copy(rows!,'#'+r.rank,-354,y,96,68,35);
    const portrait=atelierPortrait(app,rows!,-248,y,82,r.avatar);bindPress(portrait,portrait,()=>app.toast(r.nickname));
    copy(rows!,r.nickname+(r.current?' · '+t('YOU'):''),-14,y,329,71,33);copy(rows!,amount(r.winnings),291,y,229,72,37);
    if(i<3)stroke(rows!,0,y-54,785,'#DAC69F');
   });
   if(!players.length){copy(rows!,failed?'Rankings unavailable':'No records yet',0,68,766,70,42);copy(rows!,failed?'Please try again.':'Finish a round to begin your record.',0,-21,762,103,36,muted);}
   if(pageLabel)pageLabel.string=(page+1)+' / '+pages;
  };
  controls=box(stage,'Ranking page controls',0,-478,920,90);
  let pageLabel:Label|undefined;
  if(pages>1){
   button(app,controls,'Previous rank page',-303,0,296,86,'Previous',()=>{page=(page+pages-1)%pages;draw();},true);
   button(app,controls,'Next rank page',303,0,296,86,'Next',()=>{page=(page+1)%pages;draw();},true);
   pageLabel=copy(controls,'',0,0,190,65,34);
  }else if(failed)button(app,controls,'Retry rankings',0,0,520,86,'Retry',()=>{controls?.destroy();rows?.destroy();pending.node.active=true;void load();},true);
  draw();
 };
 const load=async():Promise<void>=>{try{show(app.services.remoteMode?await app.services.rank.refresh('all-time'):hallStandings(app.services.rank.list('all-time',p)));}catch{show([],true);}};
 void load();
 button(app,stage,'Return to workshop',0,-615,894,102,'Return to the workshop',()=>void app.navigate('home'));
}
function profile(app:any,stage:Node):void{
 const p=app.services.profile.current();if(!p)return;title(stage,'ARTISAN DOSSIER','Your personal workshop record');
 const identity=well(app,stage,'Artisan identity',0,336,918,240,true),portrait=atelierPortrait(app,identity,-318,0,164,p.avatar);bindPress(portrait,portrait,()=>app.avatars());
 copy(identity,p.nickname,90,54,558,71,43,paper);button(app,identity,'Edit identity',90,-49,552,85,'Edit identity',()=>app.editNickname(),true);
 const document=well(app,stage,'Personal account register',0,-34,918,406);const stats:[string,number][]=[['Wallet balance',app.services.economy.balance()],['Round count',p.gamesPlayed],['Best round',p.biggestWin],['TOTAL WON',p.totalWin]];
 stats.forEach(([label,value],i)=>{const y=114-i*76;copy(document,label,-208,y,391,67,34);copy(document,amount(value),237,y,391,71,42);if(i<3)stroke(document,0,y-38,746,'#D8C69F');});
 const contacts=box(stage,'Desk utilities',0,-343,940,154);
 button(app,contacts,'Open correspondence',-235,0,448,132,'Mail',()=>app.mail(),true);button(app,contacts,'Open coin journal',235,0,448,132,'COIN JOURNAL',()=>app.history(),true);
 button(app,stage,'Language',-234,-491,448,87,'Language',()=>app.languages(),true);button(app,stage,'Privacy',234,-491,448,87,'Privacy',()=>app.legal('privacy'),true);
 button(app,stage,'Sign out',-234,-603,448,87,'Sign out',()=>void app.signOut());button(app,stage,'Delete account',234,-603,448,87,'Delete account',()=>app.deleteAccount(),true);
}
/** Call at the beginning of the matching legacy page method; true means rendered. */
export function drawAtelierService(app:any,page:string):boolean{
 if(!ATELIER_SERVICE_METADATA.pages.includes(page as any))return false;
 const stage=app.pageStage('Atelier '+page);Tween.stopAllByTarget(stage);stage.angle=0;
 if(page==='store')store(app,stage);else if(page==='rewards')rewards(app,stage);else if(page==='rank')rank(app,stage);else profile(app,stage);return true;
}
