import { ThemeFestivity } from '../vfx/ThemeFestivity';
import {Color,Graphics,Label,Node,EventTouch,tween,Tween,Vec3,UITransform,Sprite} from 'cc';
import {box,text,bindPress,opacity,COLORS} from './SalonArt';
import {SafeAreaAdapter as Safe} from './SafeAreaAdapter';
import {GAME_CONFIGS} from '../math/GameConfigs';
import {tr} from './Language';

function plate(a:any,p:Node,x:number,y:number,w:number,h:number,ivory=false):Node{return ivory?a.art.enamel(p,x,y,w,h):a.art.lacquer(p,x,y,w,h);}
/** Each loop belongs to its artwork node, including opacity-targeted tweens. */
function ambientLoop(owner:Node,animation:Tween<any>):void{
 animation.start();owner.once(Node.EventType.NODE_DESTROYED,()=>animation.stop());
}
function atelierGlint(a:any,parent:Node,x:number,y:number,size:number,phase:number):void{
 if(a.reduced||a.art.reducedMotion)return;
 const gleam=a.art.light(parent,0,x,y,size,size*.7,0);gleam.name='Atelier metal gleam';
 const alpha=opacity(gleam,0);
 ambientLoop(gleam,tween(alpha).delay(phase).repeatForever(tween().to(.25,{opacity:155},{easing:'sineOut'}).to(.65,{opacity:0},{easing:'sineIn'}).delay(4.4)));
 ambientLoop(gleam,tween(gleam).delay(phase).repeatForever(tween().set({position:new Vec3(x-size*.22,y-2,0),scale:new Vec3(.62,.62,1)}).to(.9,{position:new Vec3(x+size*.22,y+2,0),scale:new Vec3(1.12,1.12,1)},{easing:'sineInOut'}).delay(4.4)));
}
function atelierFloat(a:any,art:Node,phase:number,lift=4):void{
 if(a.reduced||a.art.reducedMotion)return;
 const origin=art.position.clone();
 ambientLoop(art,tween(art).delay(phase).repeatForever(tween().to(2.6,{position:new Vec3(origin.x,origin.y+lift,origin.z)},{easing:'sineInOut'}).to(2.6,{position:origin},{easing:'sineInOut'})));
}

/** One clock per room: fixed-size pools, no per-frame creation or layout work. */
function atelierRoomLight(a:any):void{
 if(a.reduced||a.art.reducedMotion)return;
 const host=box(a.content,'Living atelier light',0,0,Safe.visibleWidth,a.height);
 const lamps=[-1,1].map((side,i)=>{const n=a.art.light(host,1,side*Safe.visibleWidth*.40,a.height*.14,170,a.height*.56,34);n.angle=side*-9;return{n,alpha:opacity(n,34)};});
 const motes=Array.from({length:10},(_,i)=>{const n=a.art.light(host,i%3===0?0:3,0,0,18+i%3*9,18+i%3*9,0);return{n,alpha:opacity(n,0)};});
 const clock={t:0};
 const draw=()=>{const t=clock.t;lamps.forEach((m,i)=>m.alpha.opacity=20+Math.round((Math.sin(t*.7+i*2)+1)*8));
  motes.forEach((m,i)=>{const q=(t/8+i*.137)%1,side=i%2?-1:1;m.n.setPosition(side*(Safe.visibleWidth*.40+Math.sin(t*.5+i)*24),(-.32+q*.63)*a.height);m.alpha.opacity=Math.round(Math.sin(q*Math.PI)**2*(i%3===0?150:90));m.n.angle=t*8+i*31;});};
 draw();ambientLoop(host,tween(clock).to(56,{t:56},{onUpdate:draw}).set({t:0}).union().repeatForever());
}
/** Reflections follow the sculpted rim; all treasure animation is clipped inside the picture. */
function atelierExhibitLife(a:any,surround:Node,painting:Node,index:number):void{
 if(a.reduced||a.art.reducedMotion)return;
 const interior=box(painting,'Living workshop treasure '+index,0,0,900,650);
 const tint=['#FFE1A0','#B9FFCE','#E3E2FF','#FFDEA0'][index];
 const glow=a.art.light(interior,1,0,-178,490,150,48);glow.getComponent(Sprite)!.color=new Color(tint);const glowAlpha=opacity(glow,48);
 const glass=a.art.light(interior,2,-520,0,118,740,0);glass.angle=-22;const glassAlpha=opacity(glass,0);
 const particles=Array.from({length:8},(_,i)=>{
  const symbol=index===1?[1,2,3][i%3]:index===2?10:0;
  const n=a.art.image(interior,'symbols',0,0,index===2?52:42+i%3*8,index===2?52:42+i%3*8,symbol);n.name='Workshop treasure particle '+i;
  return{n,alpha:opacity(n,0)};
 });
 const sparks=Array.from({length:6},(_,i)=>{const n=a.art.light(interior,0,0,0,26+i%3*10,26+i%3*10,0);n.getComponent(Sprite)!.color=new Color(tint);return{n,alpha:opacity(n,0)};});
 const runners=Array.from({length:2},(_,i)=>{const n=a.art.light(surround,0,0,0,92,62,0);n.name='Travelling gold reflection '+i;return{n,alpha:opacity(n,0)};});
 const clock={t:0};const draw=()=>{const t=clock.t;
  glowAlpha.opacity=42+Math.round((Math.sin(t*1.3)+1)*18);
  const pass=(t%7)/7;glass.setPosition(-590+pass*1180,0);glassAlpha.opacity=Math.round(Math.sin(pass*Math.PI)**8*34);
  particles.forEach((p,i)=>{const q=(t/(index===0?3.7:index===1?5.8:index===2?4.8:6.2)+i/8)%1,side=i%2?1:-1;
   let x=0,y=0,scale=.75;
   if(index===0){x=90+side*(40+q*200);y=-80+Math.sin(q*Math.PI)*74-q*190;scale=.72+q*.30;p.n.angle=side*q*125;}
   else if(index===1){x=side*(225+Math.sin(q*Math.PI*2+i)*58);y=-260+q*510;scale=.62+Math.sin(q*Math.PI)*.28;p.n.angle=Math.sin(t+i)*12;}
   else if(index===2){x=side*(100+q*236);y=-145+Math.sin(q*Math.PI)*104-q*87;scale=.65+q*.40;p.n.angle=side*(q*55-20);}
   else{x=Math.sin(q*Math.PI*2)*300;y=-185+Math.cos(q*Math.PI*2)*65;scale=.55+(Math.cos(q*Math.PI*2)+1)*.24;p.n.angle=-q*90;}
   p.n.setPosition(x,y);p.n.setScale(scale*(index===0?Math.max(.23,Math.abs(Math.cos(q*Math.PI*2))):1),scale,1);p.alpha.opacity=Math.round(Math.sin(q*Math.PI)**.8*205);
  });
  sparks.forEach((p,i)=>{const phase=(t*.19+i/6)%1;p.n.setPosition((i%2?1:-1)*(305+Math.sin(t*.65+i)*62),-242+phase*478);p.n.angle=t*18+i*25;p.alpha.opacity=Math.round(Math.sin(phase*Math.PI)**3*175);});
  runners.forEach((p,i)=>{const angle=(t/10+i/2)*Math.PI*2,c=Math.cos(angle),v=Math.sin(angle);p.n.setPosition(Math.sign(c)*Math.abs(c)**.34*443,Math.sign(v)*Math.abs(v)**.34*295);p.alpha.opacity=115+Math.round((Math.sin(angle*3)+1)*35);});
 };
 draw();ambientLoop(interior,tween(clock).to(2590,{t:2590},{onUpdate:draw}).set({t:0}).union().repeatForever());
}

/** Circular portrait fitted into a real sculpted gold medallion. */
export function atelierPortrait(a:any,parent:Node,x:number,y:number,size:number,index:number):Node{
 const mount=box(parent,'Artisan portrait medallion',x,y,size,size);
 a.art.image(mount,'canopy-button-0',0,0,size,size);
 const diameter=size*.79;
 a.art.cover(mount,'portraits',0,0,diameter,diameter,index,diameter/2);
 return mount;
}
export function atelierHeader(a:any):void{
 const y=a.top-Safe.safeTop-94;
 if(a.page==='home'){
  const brand=a.art.image(a.content,'canopy-brand',-331,y,342,120);brand.name='Workshop home';bindPress(brand,brand,()=>void a.navigate('home'));
 }else{
  const back=box(a.content,'Workshop home',-331,y,342,120),face=plate(a,back,0,0,342,108,true);
  text(face,'‹',-129,2,48,74,58,COLORS.jade);
  const label=text(face,'Home',24,0,224,76,34,COLORS.jade);label.enableWrapText=true;
  bindPress(back,face,()=>void a.navigate('home'));
 }
 const wallet=plate(a,a.content,228,y,515,108,true),coin=a.art.image(wallet,'symbols',-187,0,70,70,0);
 if(!a.reduced&&!a.art.reducedMotion)ambientLoop(coin,tween(coin).delay(1.2).repeatForever(tween().to(.24,{scale:new Vec3(.08,1.04,1)},{easing:'sineIn'}).to(.3,{scale:new Vec3(1,1,1)},{easing:'sineOut'}).delay(4.8)));
 atelierGlint(a,wallet,-186,22,39,1.65);
 a.balanceLabel=text(wallet,a.services.economy.balance().toLocaleString('en-US'),-5,0,275,66,45,COLORS.ink);
 const add=a.art.image(wallet,'canopy-button-0',196,0,82,82);text(add,'+',0,2,62,66,48,COLORS.jade,true);add.name='Add coins';bindPress(add,add,()=>void a.navigate('store'));
}
export function atelierNav(a:any):void{
 // Five equal cells in the safe central dock; artwork never determines hit size.
 const dockWidth=Math.min(1040,Safe.visibleWidth-Safe.safeLeft-Safe.safeRight-40),cellWidth=dockWidth/5;
 const y=-a.top+113+Safe.safeBottom,rail=box(a.content,'Goldsmith service dock',(Safe.safeLeft-Safe.safeRight)/2,y,dockWidth,180);
 // One continuous enamel sill anchors the five medallions.
 plate(a,rail,0,-25,dockWidth+18,146,true);
 const pages=['home','store','rewards','rank','profile'],labels=['Home','Shop','Gifts','Rank','Profile'],icons=[13,6,14,9];
 pages.forEach((page,i)=>{
  const active=a.page===page,hit=box(rail,'Atelier '+page,(i-2)*cellWidth,0,cellWidth-10,180);
  const visual=box(hit,'Atelier '+page+' visual',0,0,cellWidth-10,180);
  if(page==='profile')atelierPortrait(a,visual,0,35,99,a.services.profile.current()?.avatar??0);
  else{const socket=a.art.image(visual,'canopy-button-0',0,35,99,99);a.art.image(socket,'symbols',0,0,66,66,icons[i]);}
  const label=text(visual,labels[i],0,-48,cellWidth-24,50,36,COLORS.jade);label.enableWrapText=false;
  if(active){a.art.light(visual,0,0,45,106,72,130);const mark=box(visual,'Current destination',0,-78,32,5);const g=mark.addComponent(Graphics);g.fillColor=new Color(COLORS.jade);g.roundRect(-16,-2.5,32,5,2.5);g.fill();}
  bindPress(hit,visual,()=>void a.navigate(page));
 });
}
export function atelierHome(a:any):void{
 atelierRoomLight(a);
 const available=a.height-410-Safe.safeTop-Safe.safeBottom,scale=Math.min((Safe.visibleWidth-60)/1020,available/1540);
 const stage=box(a.content,'Atelier exhibition',0,-8,1020,1540);stage.setScale(scale,scale,1);
 ThemeFestivity.hall(stage,1020,1540,a.reduced);
 const identity=plate(a,stage,-125,675,735,125,true);
 const profile=a.services.profile.current(),avatar=atelierPortrait(a,identity,-295,0,108,profile?.avatar??0);bindPress(avatar,avatar,()=>void a.navigate('profile'));
 atelierGlint(a,avatar,-34,36,40,2.1);
 const welcome=text(identity,profile?.nickname??'Guest',12,0,444,62,38,COLORS.jade);welcome.enableWrapText=false;
 const mail=a.art.button(stage,'Mail',411,675,165,98,'Mail',undefined,()=>a.mail());a.refreshMailBadge(mail);
 text(stage,'CHOOSE YOUR WORKSHOP',0,556,890,54,38,COLORS.jade,true);
 let index=Math.max(0,Math.min(3,a.selectedRoute??0));
 const host=box(stage,'Featured workshop',0,82,980,930);
 let display:Node|undefined;const show=(n:number)=>{const next=(n+4)%4;if(display&&next===index)return;const direction=n>index?1:-1;index=next;a.selectedRoute=index;const old=display;display=box(host,'Exhibit '+index,0,0,980,930);const cfg=GAME_CONFIGS[index];
  const surround=box(display,'Carved exhibition aperture',0,44,972,720);const painting=a.art.cover(surround,'canopy-destinations',0,0,900,650,index,20);a.art.image(surround,'canopy-frame-0',0,0,972,720);painting.name='Enter '+cfg.name;atelierExhibitLife(a,surround,painting,index);
  // Move only the oversized painting beneath its fixed clipped aperture.
  const scene=painting.children[0];
  if(scene&&!a.reduced&&!a.art.reducedMotion){scene.setScale(1.035,1.035,1);ambientLoop(scene,tween(scene).repeatForever(tween().to(7,{scale:new Vec3(1.055,1.055,1),position:new Vec3(0,4,0)},{easing:'sineInOut'}).to(7,{scale:new Vec3(1.035,1.035,1),position:new Vec3(0,-4,0)},{easing:'sineInOut'})));}
  atelierGlint(a,surround,-434,305,82,.55);atelierGlint(a,surround,436,305,69,3.15);

  const title=plate(a,display,0,-299,894,178,true);text(title,cfg.name,0,33,790,70,51,COLORS.ink,true);text(title,cfg.modeLabel,0,-40,786,62,37,COLORS.ink);
  text(display,'Tap the exhibit to enter',0,-423,834,46,32,COLORS.jade);bindPress(painting,painting,()=>void a.navigate('game',cfg));bindPress(title,title,()=>void a.navigate('game',cfg));
  if(old?.isValid){const alpha=opacity(display,0);if(a.reduced){alpha.opacity=255;old.destroy();}else{display.setPosition(direction*28,0,0);ambientLoop(display,tween(display).to(.3,{position:new Vec3(0,0,0)},{easing:'cubicOut'}));ambientLoop(display,tween(alpha).to(.23,{opacity:255},{easing:'sineOut'}).call(()=>old?.isValid&&old.destroy()));}}
  selectors.forEach((s,i)=>{Tween.stopAllByTarget(s);const scale=i===index?1.06:.92;if(a.reduced)s.setScale(scale,scale,1);else ambientLoop(s,tween(s).to(.24,{scale:new Vec3(scale,scale,1)},{easing:'sineOut'}));opacity(s,i===index?255:235);const marker=s.getChildByName("Selected workshop enamel");if(marker)marker.active=i===index;});
 };
 const selectors:Node[]=[];
 const modeNames=['MINT','PRISM','LINKS','VAULT'];
 const modeSymbols=[0,1,10,14];
 for(let i=0;i<4;i++){
  const tab=box(stage,'Workshop seal '+i,-354+i*236,-552,215,254);
  // Large, isolated signature symbols read at phone size; preserve the carved rim.
  a.art.image(tab,'canopy-button-0',0,26,182,182);
  const inset=box(tab,'Ivory medallion inset',0,26,134,134);
  const enamel=inset.addComponent(Graphics);enamel.fillColor=new Color('#F4E7BF');enamel.circle(0,0,64);enamel.fill();
  const preview=a.art.image(tab,'symbols',0,26,138,138,modeSymbols[i]);
  const selected=a.art.enamel(tab,0,-94,211,73);selected.name='Selected workshop enamel';selected.active=false;
  atelierGlint(a,tab,-48,83,45,.8+i*1.2);
  const caption=text(tab,modeNames[i],0,-94,161,44,33,COLORS.jade);caption.enableWrapText=false;
  bindPress(tab,preview,()=>show(i));selectors.push(tab);
 }
 text(stage,'Swipe to explore',0,-710,700,45,29,COLORS.jade);
 let start:{x:number;y:number}|undefined;host.on(Node.EventType.TOUCH_START,(e:EventTouch)=>{const p=e.getUILocation();start={x:p.x,y:p.y};});
 host.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{if(!start)return;const p=e.getUILocation(),dx=p.x-start.x,dy=p.y-start.y;start=undefined;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.4)show(index+(dx<0?1:-1));});host.on(Node.EventType.TOUCH_CANCEL,()=>{start=undefined;});
 show(index);
}
export function atelierAuth(a:any):void{
 const register=a.page==='register';
 a.art.button(a.content,'Language selector',Safe.visibleWidth/2-165,a.top-Safe.safeTop-87,300,100,'Language',undefined,()=>a.languages());
 const stage=box(a.content,'Workshop pass desk',0,-35,1000,1650);const sc=Math.min((Safe.visibleWidth-48)/1000,(a.height-250-Safe.safeTop-Safe.safeBottom)/1650);stage.setScale(sc,sc,1);
 const brand=a.art.image(stage,'canopy-brand',0,650,754,264);a.idleAccent(brand,0,8,0,7);
 const panel=plate(a,stage,0,-80,932,register?1220:1070,true);
 text(panel,register?'Create your workshop pass':'WORKSHOP PASS',0,register?510:430,810,80,47,COLORS.ink,true);
 text(panel,'Your craft. Your fortune.',0,register?426:344,806,48,30,COLORS.ink);
 a.field(panel,'Username',register?325:231,a.draft.username,(v:string)=>a.draft.username=v);
 a.field(panel,'Password · 10–72 characters',register?197:103,a.draft.password,(v:string)=>a.draft.password=v,true);
 if(register){
  a.field(panel,'Confirm password',69,a.draft.confirmPassword,(v:string)=>a.draft.confirmPassword=v,true);a.field(panel,'Nickname',-59,a.draft.nickname,(v:string)=>a.draft.nickname=v);
  const check=a.art.button(panel,'Accept terms',-340,-184,78,78,'✓',undefined,()=>{a.draft.acceptedTerms=!a.draft.acceptedTerms;opacity(check,a.draft.acceptedTerms?255:100);});opacity(check,a.draft.acceptedTerms?255:100);
  text(panel,'I meet the age requirement and accept\nthe Terms and Privacy Policy.',74,-184,618,88,29,COLORS.ink);
  a.art.primary(panel,'Create account',0,-332,785,120,'CREATE ACCOUNT',()=>void a.authAction('register'));a.art.button(panel,'Back to sign in',0,-485,752,90,'Back to sign in',undefined,()=>void a.navigate('login'));
 }else{
  a.art.primary(panel,'Sign in',0,-38,785,116,'SIGN IN',()=>void a.authAction('login'));
  a.art.button(panel,'Guest',0,-185,785,112,'Guest play',undefined,()=>a.guestConsent());
  const apple=plate(a,panel,-202,-323,376,94,true);apple.name='Sign in with Apple';a.art.image(apple,'apple-mark',-125,0,30,38);text(apple,'Apple',28,0,230,66,37,COLORS.ink);bindPress(apple,apple,()=>void a.authAction('apple'));
  a.art.button(panel,'Register',202,-323,376,94,'Register',undefined,()=>void a.navigate('register'));text(panel,'Virtual coins · No cash prizes',0,-440,800,52,29,COLORS.ink);
 }
 ['Privacy','Terms','Support'].forEach((label,i)=>a.art.button(stage,label,(i-1)*310,-760,290,98,label,undefined,()=>a.legal(['privacy','terms','support'][i])));
}
