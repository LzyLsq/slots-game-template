// @ts-nocheck
import { ThemeFestivity } from './vfx/ThemeFestivity';
import {_decorator,Component,Sprite,Node,BlockInputEvents,UITransform,UIOpacity,Vec3,Vec4,Color,Graphics,Label,LabelOutline,Mask,ScrollView,EditBox,tween,Tween,view,ResolutionPolicy,game,Game,sys,isValid,AudioSource,AudioClip,resources,profiler,dynamicAtlasManager,macro} from 'cc';
import {reelMotion} from './model/reelMotion';
import {TheatreArt,C,group,panel,label,alpha,clip,button,cabinetKey,bind,float,fadeIn,input,scroll,color} from './TheatreUI';
import {GAMES,SYMBOLS,WILD,SCATTER,BETS,LINES,board,draw,makeRound,basePay,evaluate,seeded} from './model/engine';
import {load,save,settle,startRound,claim,dateKey,DAILY,record,defaultState,MAIL,claimMail,normalizeState,configureStorage} from './model/store';
import {registerLocal,loginLocal,resumeGuest,removeLocalAccount,CONSENT_VERSION} from './model/auth';
import {currentProfile} from './model/store';
import {t,setLanguage,ruleText,phrase} from './model/i18n';
const {ccclass}=_decorator;
const W=720,wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const assetNames=['brand','hall-final','login','coin-crown','s9','s15',...Array.from({length:4},(_,i)=>['cabinet'+i,'title'+i,'hero'+i,'salon'+i,...SYMBOLS.map(s=>`symbol-${i}-${s}`),...Array.from({length:4},(_,j)=>`key-${i}-${j}`)]).flat(),...Array.from({length:16},(_,i)=>'avatar'+i),...Array.from({length:16},(_,i)=>'ui'+i)];
const geometries=[{rx:.10,ry:.41,rw:.80,rh:.21,ty:.308,th:.052,cy:.66,sy:.774},{rx:.10,ry:.41,rw:.80,rh:.20,ty:.303,th:.06,cy:.662,sy:.783},{rx:.10,ry:.387,rw:.80,rh:.205,ty:.27,th:.068,cy:.635,sy:.755},{rx:.114,ry:.373,rw:.77,rh:.215,ty:.291,th:.054,cy:.625,sy:.73}];
@ccclass('VelvetApp')
export class VelvetApp extends Component{
 art=new TheatreArt();state:any;page='login';stage:Node;scene:Node;modal:Node|null=null;toastNode:Node;H=1280;ready=false;busy=false;transition=false;auto=0;hidden=false;boardState:any;reels:Node;reelW=0;reelH=0;cabinet:Node;walletLabels:Label[]=[];lastWin:Label;banner:Label;betLabel:Label;autoLabel:Label;spinKey:Node;autoKey:Node;clock=0;timer=0;retiring:Node[]=[];particles:any[]=[];twinkles:any[]=[];idle:any[]=[];light:Node;awardDone:(()=>void)|null=null;audio:AudioSource[]=[];clips=new Map();music:AudioSource;cabinetMaterial:any=null;cabinetResponse=new Vec4();reelSpinAt=0;cabinetLamps:any[]=[];reelLightPhase='idle';reelLightAt=0;landedReels=0;feedbackAt=0;lastPress=0;lock=false;resizePending=false;
 async start(){
  profiler.hideStats();macro.CLEANUP_IMAGE_CACHE=false;dynamicAtlasManager.enabled=true;
  configureStorage(sys.localStorage);this.state=load();if(this.state.pending){settle(this.state);save(this.state)}setLanguage(this.state.lang);
  view.setDesignResolutionSize(W,1280,view.getFrameSize().width/view.getFrameSize().height>W/1280?ResolutionPolicy.SHOW_ALL:ResolutionPolicy.FIXED_WIDTH);this.H=view.getVisibleSize().height;
  this.stage=group(this.node,'Velvet Theatre',-W/2,-this.H/2,W,this.H);this.stage.setPosition(-W/2,this.H/2);
  const boot=group(this.stage,'Loading',0,0,W,this.H);panel(boot,0,0,W,this.H,'#241020','#241020',0);label(boot,'VELVET FORTUNE',50,this.H*.39,620,70,38,C.gold,true);label(boot,'A seat in the extraordinary',60,this.H*.45,600,40,21,C.cream);const track=panel(boot,160,this.H*.53,400,12,'#58364A','#A67A51',6);const bar=panel(track,2,2,4,8,C.gold,C.gold,4);const pct=label(boot,'0%',260,this.H*.56,200,40,22,C.cream);
  try{await this.art.load(assetNames,(n,total)=>{bar.setScale((396*n/total)/4,1,1);pct.string=Math.round(n/total*100)+'%';if(typeof window!=='undefined')window.velvetBootProgress?.(n/total*.94)});await this.art.loadEffect();await this.loadAudio()}catch(e){label(boot,'Artwork could not load. Please reload.',40,this.H*.65,640,90,24);console.error(e);if(typeof window!=='undefined')window.velvetBootError?.();return}
  boot.destroy();this.ready=true;this.page=this.state.loggedIn?'home':'login';this.render();if(typeof window!=='undefined')window.velvetBootReady?.();view.on('canvas-resize',this.resize,this);game.on(Game.EVENT_HIDE,this.onHide,this);game.on(Game.EVENT_SHOW,this.onShow,this);
  if(typeof window!=='undefined'&&new URLSearchParams(location.search).get('debug')==='1')window.f25Cocos={state:()=>JSON.parse(JSON.stringify(this.state)),page:p=>{if(!this.busy){this.page=p;this.state.loggedIn=p!=='login';this.render()}},enter:i=>this.enter(i),spin:()=>this.spin(),preview:(tier='big')=>this.presentAward(this.state.bet*({ordinary:2,big:12,mega:40,epic:120}[tier]||12),tier==='ordinary'),feature:()=>this.feature(),nodes:()=>this.nodeReport(),setLanguage:l=>{this.state.lang=l;setLanguage(l);this.persist();this.render()},setMotion:b=>{this.state.motion=b;this.persist();this.render()},setAuto:n=>{this.auto=n;this.spin()},render:()=>this.render(),version:'F25 Cocos 3.8.8',frames:()=>this.clock,audioStatus:()=>({loaded:Array.from(this.clips.keys()),enabled:this.state.sound,hidden:this.hidden,musicPlaying:!!this.music?.playing,musicVolume:this.music?.volume,activeEffects:this.audio.filter(a=>a.playing).length}),lifecycle:(hidden:boolean)=>hidden?this.onHide():this.onShow()};
 }
 resize(){if(!this.ready)return;const frame=view.getFrameSize(),policy=frame.width/frame.height>W/1280?ResolutionPolicy.SHOW_ALL:ResolutionPolicy.FIXED_WIDTH;view.setDesignResolutionSize(W,1280,policy);const next=view.getVisibleSize().height;if(Math.abs(next-this.H)<2&&Math.abs(this.stage.scale.x-1)<.001)return;if(this.busy){this.resizePending=true;const scale=Math.min(1,next/this.H);this.stage.setScale(scale,scale,1);this.stage.setPosition(-W*scale/2,next/2);return}this.H=next;this.stage.setScale(1,1,1);this.stage.setPosition(-W/2,next/2);this.stage.getComponent(UITransform).height=next;this.render()}
 onHide(){this.hidden=true;this.auto=0;this.stopAudio();this.refreshControls()}
 onShow(){this.hidden=false;this.syncMusic()}
 persist(){try{save(this.state);return true}catch{this.state=load();this.toast(t('errorSave'));return false}}
 money(n:number){return new Intl.NumberFormat(this.state.lang==='zh'?'zh-CN':this.state.lang).format(Math.floor(n))}
 destroyChildren(n:Node){for(const child of [...n.children]){child.removeFromParent();child.destroy()}}
 clearScene(){this.cabinetMaterial=null;this.cabinetLamps=[];this.reelLightPhase='idle';for(const p of this.particles)if(p.node&&isValid(p.node))p.node.destroy();this.particles=[];this.twinkles=[];this.idle=[];this.walletLabels=[];if(this.modal){this.modal.destroy();this.modal=null}if(this.scene){Tween.stopAllByTarget(this.scene);const old=this.scene;old.active=this.state.motion;setTimeout(()=>{if(isValid(old))old.destroy()},300)}this.scene=group(this.stage,'Page '+this.page,0,0,W,this.H);this.scene.addComponent(BlockInputEvents)}
 render(){if(!this.ready)return;this.art.sheenEnabled=this.state.motion;this.clearScene();if(this.page==='game'){this.gamePage()}else if(this.page==='login'){this.login()}else{if(this.page==='home')this.home();else{this.art.image(this.scene,'hall-final',0,0,W,this.H,'cover');this.auxPage();}this.header();this.nav()}if(this.state.motion)fadeIn(this.scene,.24);this.syncMusic()}
 async go(p:string){if(this.busy||this.transition)return;this.auto=0;this.transition=true;this.cue('touch');this.page=p;this.render();this.transition=false}
 brassMoulding(p:Node,y:number){const n=group(p,'Continuous brass moulding',0,y,W,6),g=n.addComponent(Graphics);['#69452D','#C79B5A','#F2D7A2','#B88447','#69452D','#321A22'].forEach((c,i)=>{g.fillColor=color(c);g.rect(0,-i,W,-1);g.fill()});}
 header(){const h=group(this.scene,'Header',0,0,W,116);panel(h,0,0,W,116,'#38202B','',0);this.brassMoulding(h,110);const av=this.art.image(h,'avatar'+this.state.avatar,20,14,84,84);bind(av,()=>this.go('account'));label(h,'VELVET CLUB',118,16,230,26,16,C.gold,true,0);label(h,this.state.name,118,46,225,45,26,C.cream,true,0);const mail=this.art.image(h,'ui2',355,22,62,66);bind(mail,()=>this.mail());if(MAIL.some(m=>!this.state.mailClaims.includes(m.id)))panel(h,400,18,12,12,'#F06C66','#FFE8AA',6);this.wallet(h,435,25,266,64)}
 wallet(p:Node,x:number,y:number,w:number,h:number){const n=this.art.plate(p,x,y,w,h);this.art.image(n,'coin-crown',9,6,h-12,h-12);const l=label(n,this.money(this.state.balance),h,3,w-h-43,h-6,29,C.ink,true);this.walletLabels.push(l);label(n,'+',w-40,5,30,h-10,30,'#8F512A',true);bind(n,()=>{if(!this.busy)this.go('shop')});return n}
 refreshWallet(){for(const l of this.walletLabels)if(isValid(l))l.string=this.money(this.state.balance)}
 nav(){const n=group(this.scene,'Navigation',0,this.H-125,W,125);panel(n,0,0,W,125,'#38202B',C.line,0);this.brassMoulding(n,0);['home','shop','rewards','honour','account'].forEach((p,i)=>{const b=group(n,'Nav '+p,i*144,0,144,125);if(this.page===p){const glow=group(b,'Selected navigation light',72,40,120,84),gg=glow.addComponent(Graphics);for(let r=16;r>0;r--){gg.fillColor=new Color(236,187,102,3);gg.ellipse(0,0,r*3.5,r*2.8);gg.fill()}panel(b,45,2,54,3,C.gold,C.gold,1)}this.art.image(b,'ui'+[0,4,2,1,3][i],40,10,64,66);label(b,t(p),6,80,132,32,20,this.page===p?'#FFE59B':'#EDDCBD',true);bind(b,()=>this.go(p));if(p==='rewards'&&!this.state.claims.includes(dateKey()))panel(b,103,16,10,10,'#E87367',C.gold,5)})}
 authMode='login';authPending=false;authAccepted=false;
 authCaption(key:string){const text={signIn:['SIGN IN','登录'],register:['Register','注册'],guest:['Guest play','游客体验'],username:['Username · 3–18 letters / numbers','用户名 · 3–18 位字母或数字'],password:['Password · 10–72 characters','密码 · 10–72 个字符'],confirm:['Confirm password','确认密码'],nickname:['Nickname','昵称'],create:['CREATE ACCOUNT','创建账户'],back:['Back to sign in','返回登录'],terms:['Terms','条款'],privacy:['Privacy','隐私'],support:['Support','帮助'],apple:['Sign in with Apple','通过 Apple 登录'],consent:['I meet the age requirement and agree to Terms & Privacy.','我符合年龄要求，并同意条款与隐私政策。']}[key];return text?phrase(text[0],text[1]):key}
 authButton(p:Node,title:string,x:number,y:number,w:number,h:number,fn:()=>void,primary=false){const n=group(p,title,x,y,w,h);panel(n,1,5,w-2,h-5,'#523228','#B38B55',8);const face=this.art.surface(n,0,0,w,h-3,primary?'#6F2939':'#F1DFBD');label(face,title,16,2,w-32,h-9,23,primary?C.cream:C.ink,true);bind(n,fn,()=>!this.authPending,face);return n}
 login(){
 this.art.image(this.scene,'login',0,0,W,this.H,'cover');this.sparkle(this.scene,30,115,660,this.H*.7,15);
 const reg=this.authMode==='register',height=reg?784:660,y=Math.max(295,(this.H-height)*.57);
 const mark=this.art.image(this.scene,'brand',160,Math.max(92,y-230),400,175);this.breathe(mark,9,4);
 const card=group(this.scene,'Club invitation',50,y,620,height);
 this.art.plate(card,0,0,620,height);
 label(card,'THE VELVET CLUB',32,25,556,27,16,'#8E6D47',true);
 label(card,reg?phrase('Your royal membership','开启你的皇家会员之旅'):t('welcome'),30,65,560,55,30,C.ink,true);
 label(card,phrase('An evening of fortune, made for you','为你开启一场华丽幸运之夜'),35,122,550,32,19,'#80614D');
 const field=(key:string,yy:number,secret=false)=>{const e=input(card,'',38,yy,544,69);e.placeholder=this.authCaption(key);e.placeholderLabel.string=this.authCaption(key);e.placeholderLabel.fontSize=21;e.textLabel.fontSize=24;e.maxLength=secret?72:18;if(secret)e.inputFlag=EditBox.InputFlag.PASSWORD;return e};
 const username=field('username',179),password=field('password',266,true);
 if(reg){const confirm=field('confirm',353,true),nickname=field('nickname',440);const check=group(card,'Consent',36,522,550,75);panel(check,0,16,34,34,'#FFFAEE','#AA895C',4);const tick=label(check,this.authAccepted?'✓':'',1,12,32,39,27,C.ink,true);label(check,this.authCaption('consent'),48,0,500,75,19,C.ink,false,0);bind(check,()=>{if(this.authPending)return;this.authAccepted=!this.authAccepted;tick.string=this.authAccepted?'✓':''});this.authButton(card,this.authCaption('create'),38,616,544,70,()=>this.submitAuth(username.string,password.string,confirm.string,nickname.string),true);this.authButton(card,this.authCaption('back'),38,705,544,54,()=>{this.authMode='login';this.render()});}
 else{this.authButton(card,this.authCaption('signIn'),38,361,544,76,()=>this.submitAuth(username.string,password.string),true);this.authButton(card,this.authCaption('apple'),38,456,544,68,()=>this.info(this.authCaption('apple'),phrase('Apple sign-in is not connected in this web build. It requires the signed iOS app and Apple authorization. Use a local account or Guest play here.','此网页版尚未接入 Apple 登录。该方式需要签名 iOS 应用及 Apple 授权。当前请使用本地账户或游客体验。')));this.authButton(card,this.authCaption('guest'),38,546,258,65,()=>this.guestEntry());this.authButton(card,this.authCaption('register'),324,546,258,65,()=>{this.authMode='register';this.authAccepted=false;this.render()});label(card,phrase('Local accounts · Progress stays on this device','本地账户 · 进度保存在此设备'),25,617,570,27,17,'#80614D');}
 button(this.art,this.scene,this.languageName(),W-210,28,186,58,()=>{if(!this.authPending)this.languages()},'ui7',true);
 ['terms','privacy','support'].forEach((key,i)=>this.authButton(this.scene,this.authCaption(key),48+i*215,this.H-132,194,51,()=>this.legal(key)));
 label(this.scene,t('local'),32,this.H-65,656,36,17,C.cream);
 }
 async submitAuth(username:string,password:string,confirmation?:string,nickname?:string){if(this.authPending)return;this.authPending=true;const lang=this.state.lang;try{const result=confirmation===undefined?await loginLocal(username,password):await registerLocal(username,password,confirmation,nickname||'',this.authAccepted);this.state=result;this.state.lang=lang;setLanguage(lang);this.persist();this.page='home';this.authMode='login';this.render();}catch(e){const errors={username:['Use 3–18 letters, numbers or underscores.','用户名须为 3–18 位字母、数字或下划线。'],password:['Use a password of 10–72 characters.','密码长度须为 10–72 个字符。'],mismatch:['Passwords do not match.','两次密码不一致。'],nickname:['Enter a nickname of 1–18 characters.','请输入 1–18 个字符的昵称。'],consent:['Please confirm age eligibility and accept the policies.','请先确认年龄要求并同意协议。'],exists:['This local username is already registered.','该本地用户名已注册。'],invalid:['Username or password is incorrect.','用户名或密码错误。']}[e.message];this.toast(errors?phrase(errors[0],errors[1]):phrase('Account storage is unavailable. Please try again.','账户存储暂不可用，请重试。'));}finally{this.authPending=false}}
 guestEntry(){if(this.authPending)return;const lang=this.state.lang;this.state=resumeGuest();this.state.lang=lang;setLanguage(lang);const start=()=>{this.state.loggedIn=true;this.state.consent={version:CONSENT_VERSION,at:new Date().toISOString()};if(this.persist()){this.page='home';this.render()}};if(this.state.consent?.version===CONSENT_VERSION)start();else this.confirm(phrase('Guest play','游客体验'),phrase('Confirm that you meet the applicable age requirement and agree to Terms & Privacy. Your progress stays on this device.','请确认你符合适用的年龄要求，并同意条款与隐私政策。进度保存在此设备。'),start)}
 legal(kind:string){const content={terms:[['Local game terms','本地游戏条款'],['Eligibility','使用资格','Use only if you meet the age requirement for simulated casino games where you live. This is entertainment with virtual coins.','仅在符合所在地模拟博彩游戏年龄要求时使用。本游戏使用虚拟金币，仅供娱乐。'],['Virtual coins','虚拟金币','Coins cannot be cashed out, transferred, sold or exchanged for prizes. This build has no real-money purchase processing. Shop bundles are free demo grants.','金币不能兑换现金、转让、出售或兑换奖品。此版本不处理真实付款，商店礼包为免费演示金币。'],['Game results','游戏结果','Each round uses the displayed rules and paytable. Wins are not guaranteed. Rules show how line wins, scatters and free spins are calculated.','每轮按所示规则和赔付表计算，不保证获奖。规则页说明中奖线、散布符号与免费旋转的计算方式。'],['Local progress','本地进度','Accounts and progress exist only on this device. Clearing browser storage removes them. Back up your progress in Account.','账户和进度仅存于当前设备，清除浏览器存储会移除这些数据。可在账户页备份进度。']],privacy:[['Privacy & local data','隐私与本地数据'],['Stored on this device','设备内保存的数据','Nickname, avatar, language, settings, virtual balance, rewards and recent game history are stored locally. Local accounts store a salted password verifier, not the password itself.','昵称、头像、语言、设置、虚拟余额、奖励和近期游戏记录保存在本地。本地账户保存加盐密码校验值，不保存明文密码。'],['Use of data','数据用途','These records let you sign in locally, resume progress and prevent repeated local reward claims. This build has no remote account server or advertising tracker.','这些记录用于本地登录、恢复进度和防止本地重复领取奖励。此版本没有远程账户服务器或广告追踪。'],['Backups','备份','Exported backup files include your game progress. Keep them private. They do not contain your account password or password verifier.','导出的备份包含游戏进度，请妥善保管。备份不包含账户密码或密码校验值。'],['Your controls','你的管理选项','You can change settings, sign out, back up progress, or delete the current local account in Account. Deletion on this device does not remove previously exported files.','你可在账户页更改设置、退出登录、备份进度或删除当前本地账户。设备内删除操作不会删除已导出的文件。']],support:[['Player support','玩家帮助'],['Sign-in options','登录方式','Register a local username and password, sign in to that local account, or continue as a guest. Apple authorization is not connected in this web build.','可注册并登录本地账户，或以游客体验。此网页版尚未接入 Apple 授权。'],['Progress & passwords','进度与密码','Accounts do not synchronize across devices. This build has no password recovery service. Keep your password and a progress backup safe.','账户不会跨设备同步，此版本没有密码找回服务。请保管好密码与进度备份。'],['Coins & purchases','金币与购买','Shop grants are free demo coins. No real payment is taken and there is no purchase to restore in this build.','商店发放免费演示金币，不会真实扣款，此版本没有可恢复的真实购买。'],['Play comfortably','轻松游戏','Turn sound and motion on or off in Account. Stop auto-play at any time. Take breaks whenever you need them.','可在账户页开关声音和动态效果，随时停止自动旋转，并适时休息。']]}[kind];const h=Math.min(this.H-100,960),n=this.openModal(phrase(...content[0]),h),p=scroll(n,25,107,586,h-137,1160).content;content.slice(1).forEach((entry,i)=>{const y=i*260;label(p,phrase(entry[0],entry[1]),12,y+4,556,46,25,C.gold,true,0);label(p,phrase(entry[2],entry[3]),12,y+57,556,188,23,C.cream,false,0)});label(p,phrase('Local build · Version ','本地版本 · ')+CONSENT_VERSION,12,1070,556,52,18,C.gold);}
 // Flame cores stay fixed to their fixtures; only their tips and warm falloff breathe.
 fixtureFlame(p:Node,x:number,y:number,phase:number,scale=1){if(!this.state.motion)return;
 const light=group(p,'Living fixture light',x,y,40,60),g=light.addComponent(Graphics);
 for(let r=16;r>0;r--){g.fillColor=new Color(255,186,83,3);g.ellipse(0,0,r*2.4*scale,r*3.5*scale);g.fill()}
 const op=alpha(light,75);tween(op).delay(phase).to(1.35,{opacity:235},{easing:'sineInOut'}).to(2.25,{opacity:65},{easing:'sineInOut'}).union().repeatForever().start();
 const flame=group(p,'Warm fixture flame',x,y,12,22),fg=flame.addComponent(Graphics);fg.fillColor=new Color(255,220,146,175);fg.ellipse(0,0,3*scale,10*scale);fg.fill();fg.fillColor=new Color(255,250,216,235);fg.ellipse(0,-1,1.5*scale,5*scale);fg.fill();
 tween(flame).delay(phase).to(.95,{scale:new Vec3(.85,1.22,1)},{easing:'sineInOut'}).to(1.35,{scale:new Vec3(1.12,.82,1)},{easing:'sineInOut'}).to(.8,{scale:Vec3.ONE},{easing:'sineInOut'}).union().repeatForever().start();}
 cabinetAmbient(mode:number){if(!this.state.motion)return;const geo=geometries[mode];for(const side of [0,1]){const n=group(this.cabinet,'Practical lamp glow',side?680:40,this.H*.225,70,70),g=n.addComponent(Graphics);const rgb=mode===2?[231,221,193]:[255,204,119];for(let r=34;r>0;r-=2){g.fillColor=new Color(rgb[0],rgb[1],rgb[2],Math.round(2+(34-r)*.16));g.circle(0,0,r);g.fill()}const o=alpha(n,115);tween(o).delay(side*1.3).to(3.7,{opacity:210},{easing:'sineInOut'}).to(4.6,{opacity:115},{easing:'sineInOut'}).union().repeatForever().start()}
 const atmosphere=clip(this.cabinet,'Cabinet atmosphere',65,this.H*.09,590,this.H*.205);
 for(let i=0;i<9;i++){
 const n=group(atmosphere,'Theme drifting detail',30+i*67%540,(i*41)%190,12,18),g=n.addComponent(Graphics);
 if(mode===1){g.fillColor=new Color(197,57,75,130);g.ellipse(0,0,4,8);g.fill();g.fillColor=new Color(255,160,146,85);g.ellipse(-1,2,1.4,4);g.fill()}
 else{g.fillColor=mode===2?new Color(255,247,220,105):new Color(255,216,132,105);g.ellipse(0,0,mode===3?2.2:1.7,mode===3?5:1.7);g.fill()}
 const start=n.position.clone(),o=alpha(n,0),duration=6+i*.37;
 tween(n).delay(i*.63).by(duration,{position:new Vec3(18+Math.sin(i)*25,-this.H*.13),angle:mode===1?65:-35},{easing:'sineInOut'}).set({position:start,angle:0}).union().repeatForever().start();
 tween(o).delay(i*.63).to(1.5,{opacity:190}).delay(duration-3).to(1.5,{opacity:0}).union().repeatForever().start();
 }
 // A grazing reflection belongs to the narrow control rim, never the character/background.
 const rim=clip(this.cabinet,'Brass rim reflection',55,this.H*(geo.cy+.105),610,6),beam=group(rim,'Rim glint',-120,0,120,6),g=beam.addComponent(Graphics);for(let i=0;i<24;i++){g.fillColor=new Color(255,235,188,Math.round(Math.sin(i/24*Math.PI)*95));g.rect(i*5,-5,5,5);g.fill()}tween(beam).delay(mode+1.8).to(3.2,{position:new Vec3(730,0)},{easing:'sineInOut'}).delay(6).set({position:new Vec3(-120,0)}).union().repeatForever().start();}
 home(){
 // One camera transform keeps the openings attached to their carved architecture.
 const available=this.H-241,scale=Math.max(W/1024,available/1536),world=group(this.scene,'Theatre architecture',(W-1024*scale)/2,116+(available-1536*scale)/2,1024,1536);world.setScale(scale,scale,1);
 const architecture=this.art.image(world,'hall-final',0,0,1024,1536);this.art.architectureLight(architecture);
 ThemeFestivity.hall(world,1024,1536,!this.state.motion,512,-768);
 const brand=this.art.image(world,'brand',286,81,452,155);this.breathe(brand,8.8,5);this.art.shine(brand,.6,.28);
 const swipe=(node:Node)=>{let down:{x:number,y:number}|null=null;node.on(Node.EventType.TOUCH_START,e=>{const p=e.getUILocation();down={x:p.x,y:p.y}});const finish=e=>{if(!down)return;const p=e.getUILocation(),dx=p.x-down.x,dy=p.y-down.y;down=null;if(Math.abs(dx)>80&&Math.abs(dx)>Math.abs(dy)*1.4&&!this.transition){e.propagationStopped=true;this.state.mode=(this.state.mode+(dx<0?1:3))%4;this.persist();world.children.filter(n=>n.name.startsWith('Portal ')).forEach((portal,index)=>{const light=portal.getChildByName('Architectural opening')?.getChildByName('Selected box footlight');if(light)light.active=index===this.state.mode})}};node.on(Node.EventType.TOUCH_END,finish);node.on(Node.EventType.TOUCH_CANCEL,()=>{down=null})};
 const opening=(g:Graphics,w:number,h:number)=>{g.moveTo(0,-h);g.lineTo(0,-97);g.bezierCurveTo(0,-35,w*.20,0,w*.5,0);g.bezierCurveTo(w*.80,0,w,-35,w,-97);g.lineTo(w,-h);g.close()};
 for(let i=0;i<4;i++){
 const x=i%2?576:163,y=i<2?302:773,width=282,height=i<2?306:310,n=group(world,'Portal '+i,x,y,width,height);
 const aperture=group(n,'Architectural opening',0,0,width,height),mask=aperture.addComponent(Mask);mask.type=Mask.Type.GRAPHICS_STENCIL;const mg=aperture.getComponent(Graphics)!;mg.clear();opening(mg,width,height);mg.fill();
 const picture=group(aperture,'Recessed portrait',0,0,width,height),portrait=this.art.image(picture,'hero'+i,0,0,width,height,'cover'),image=portrait.children[0],iw=image.getComponent(UITransform)!.width;image.setPosition(-(iw-width)*[.14,.48,.45,.52][i],image.position.y);
 const shade=group(aperture,'Arch contact shadows',0,0,width,height),g=shade.addComponent(Graphics);
 for(let k=0;k<18;k++){g.strokeColor=new Color(34,12,17,Math.round((1-k/18)*16));g.lineWidth=2+k*2;opening(g,width,height);g.stroke()}
 for(let row=0;row<70;row++){const t=row/69,depth=148/70;g.fillColor=new Color(40,16,25,Math.round(252*Math.min(1,t*1.7)));g.rect(0,-(height-148+row*depth),width,-depth);g.fill()}
 label(aperture,GAMES[i].name.toUpperCase(),8,height-107,width-16,48,25,'#FFF0CE',true);
 label(aperture,t(['classic','both','waysRule','free'][i]),7,height-62,width-14,25,19,C.cream);
 const entryHint=label(aperture,t('tap'),12,height-35,width-24,29,23,'#FFE3A6',true);
 if(this.state.motion){const arrow=label(aperture,'›',width-44,height-36,24,29,26,'#FFE3A6',true);const base=arrow.node.position.clone();tween(arrow.node).delay(i*.42).to(1.1,{position:new Vec3(base.x+7,base.y)},{easing:'sineInOut'}).to(1.4,{position:base},{easing:'sineInOut'}).union().repeatForever().start();const hintOpacity=alpha(entryHint.node,205);tween(hintOpacity).delay(i*.65).to(2.4,{opacity:255},{easing:'sineInOut'}).to(2.9,{opacity:205},{easing:'sineInOut'}).union().repeatForever().start()}
 {const line=group(aperture,'Selected box footlight',18,height-4,width-36,3),lg=line.addComponent(Graphics);line.active=i===this.state.mode;lg.strokeColor=new Color(255,222,146,220);lg.lineWidth=2;lg.moveTo(0,0);lg.lineTo(width-36,0);lg.stroke();if(this.state.motion)tween(alpha(line,110)).to(2.2,{opacity:245},{easing:'sineInOut'}).to(2.2,{opacity:110},{easing:'sineInOut'}).union().repeatForever().start()}
 this.sparkle(aperture,18,65,width-36,height-168,3);bind(n,()=>this.enter(i),()=>!this.transition,picture);swipe(n);
 }
 // Lights occupy the painted sconces rather than floating over the whole picture.
 if(this.state.motion){for(const [i,xy] of [[118,211],[906,211],[86,479],[939,479],[83,887],[940,887],[513,485],[513,931],[181,1100],[839,1100]].entries()){
 const lamp=group(world,'Architectural candle light '+i,xy[0],xy[1],50,70),g=lamp.addComponent(Graphics);
 for(let r=12;r>0;r--){g.fillColor=new Color(255,204,121,3);g.ellipse(0,0,r*3,r*4.5);g.fill()}
 const opacity=alpha(lamp,125);tween(opacity).delay(i*.23).to(1.6+i*.07,{opacity:235},{easing:'sineInOut'}).to(2.3,{opacity:105},{easing:'sineInOut'}).union().repeatForever().start();
 }for(const [i,xy] of [[118,211],[906,211],[513,485],[513,931]].entries())this.fixtureFlame(world,xy[0],xy[1],i*.71,1);this.sparkle(world,453,15,120,130,5);this.sparkle(world,64,1225,890,180,8)}
 label(world,phrase('CHOOSE YOUR ROYAL BOX','选择你的皇家包厢'),255,1140,514,42,23,'#542C23',true);swipe(this.scene);
 }
 salonSurface(p:Node,height:number){
 panel(p,0,0,W,height,'#E9DBC2','',0);
 const n=group(p,'Salon architectural lining',0,300,W,height-300),g=n.addComponent(Graphics);
 for(let i=0;i<28;i++){g.fillColor=new Color(87,46,29,Math.round(23*(1-i/28)));g.rect(i*2,0,2,-height);g.fill();g.rect(W-i*2-2,0,2,-height);g.fill()}
 // Recessed side mouldings remain outside every text and touch target.
 for(const x of [13,706]){g.strokeColor=new Color(144,101,54,125);g.lineWidth=2;g.moveTo(x,0);g.lineTo(x,-height);g.stroke();g.strokeColor=new Color(255,241,206,190);g.moveTo(x+3,0);g.lineTo(x+3,-height);g.stroke()}
 for(let y=44;y<height;y+=112){g.strokeColor=new Color(157,115,66,22);g.lineWidth=1;g.moveTo(65,-y);g.bezierCurveTo(210,-y-12,510,-y+12,655,-y);g.stroke()}
 }
 auxPage(){const content=scroll(this.scene,0,116,W,this.H-241,this.page==='account'?2180:this.page==='rewards'?1350:this.page==='honour'?1330:1160).content;this.salonSurface(content,this.page==='account'?2180:1800);const index={shop:0,rewards:1,honour:2,account:3}[this.page];this.art.image(content,'salon'+index,0,0,W,320,'cover');const seam=group(content,'Salon material transition',0,285,W,40),sg=seam.addComponent(Graphics);for(let i=0;i<20;i++){sg.fillColor=new Color(235,223,201,Math.round(255*i/19));sg.rect(0,-i*2,W,2);sg.fill()}this.art.plate(content,36,237,648,80);label(content,t({shop:'book',rewards:'daily',honour:'leaderboard',account:'account'}[this.page]),80,249,560,55,32,C.ink,true);this.sparkle(content,25,20,670,245,12);if(this.page==='shop')this.shop(content);if(this.page==='rewards')this.rewards(content);if(this.page==='honour')this.honour(content);if(this.page==='account')this.account(content);}
 shop(p:Node){
 label(p,t('storeNote'),42,337,636,72,21,C.ink);
 // Two continuous velvet display bays share their brass shelves; no floating product cards.
 for(let row=0;row<2;row++){
 const bay=group(p,'Treasury display '+row,31,423+row*326,658,300);this.art.plate(bay,0,0,658,300);panel(bay,18,15,622,271,'#562735','',8);
 const carving=group(bay,'Display bay moulding',0,0,658,300),g=carving.addComponent(Graphics);
 g.strokeColor=new Color(230,187,119,90);g.lineWidth=1;
 g.roundRect(9,-287,640,279,7);g.stroke();
 g.moveTo(329,-22);g.lineTo(329,-196);g.stroke();
 // The same ledge supports both treasures and catches a restrained local reflection.
 for(let j=0;j<8;j++){g.fillColor=new Color(13,6,11,19-j*2);g.rect(13,-180-j*2,632,2);g.fill()}
 g.fillColor=color('#BD8E50');g.roundRect(12,-180,634,8,3);g.fill();
 g.fillColor=color('#F5D9A0');g.rect(17,-174,624,2);g.fill();
 this.sparkle(bay,35,171,580,4,4);
 }
 [10000,30000,80000,200000].forEach((coins,i)=>{
 const x=42+(i%2)*329,y=423+Math.floor(i/2)*326,n=group(p,'Treasury bundle '+i,x,y,307,300);
 // Ground the prize on its shelf; the art remains still while its gilding catches light.
 const shade=group(n,'Treasure contact shadow',0,0,307,180),g=shade.addComponent(Graphics);
 for(let j=5;j>0;j--){g.fillColor=new Color(20,7,13,12);g.ellipse(153,-159,65+j*5,6+j*2);g.fill()}
 const treasure=this.art.image(n,['coin-crown','symbol-3-2','symbol-0-1','symbol-2-1'][i],74,18,159,143);
 this.art.shine(treasure,i*1.4,.16);
 this.art.plate(n,41,176,225,57);label(n,this.money(coins),57,184,193,36,29,C.ink,true);
 button(this.art,n,t('get'),24,238,259,55,()=>{
 this.confirm(t('get'),this.money(coins)+' '+t('balance'),()=>{this.state.balance+=coins;record(this.state,'Demo coins',coins);if(this.persist()){this.refreshWallet();this.coinFlight(360,700);this.toast(t('giftReceived'))}})
 },'ui4');
 });
 label(p,t('demo')+' · '+t('local'),36,1091,648,55,18,C.ink);
 }
 rewardCabinet(p:Node){
 const chest=this.art.plate(p,25,410,670,558);
 panel(chest,12,10,646,537,'#ECDBB8','#B68E50',8);
 const lining=group(chest,'Joined treasure compartments'),g=lining.addComponent(Graphics);
 for(const y of [190,378]){for(let k=0;k<7;k++){g.fillColor=new Color(87,46,27,30-k*4);g.rect(14,-y-k,642,1);g.fill()}g.strokeColor=color('#BD9558');g.lineWidth=3;g.moveTo(14,-y);g.lineTo(656,-y);g.stroke();g.strokeColor=color('#FFF1CD');g.lineWidth=1;g.moveTo(14,-y+2);g.lineTo(656,-y+2);g.stroke()}
 for(const x of [224,450]){g.strokeColor=new Color(157,118,63,120);g.lineWidth=2;g.moveTo(x,-13);g.lineTo(x,-367);g.stroke()}
 }
 rewards(p:Node){label(p,t('dailyNote'),40,333,640,64,22,C.ink);const claimed=this.state.claims.includes(dateKey()),idx=this.state.claims.length%7,shown=claimed?(this.state.claims.length-1)%7:idx;this.rewardCabinet(p);DAILY.forEach((v,i)=>{const x=35+(i%3)*226,y=420+Math.floor(i/3)*188,n=group(p,'Reward compartment '+(i+1),x,y,i===6?650:198,166);if(i===shown){const glow=panel(n,4,3,i===6?642:190,159,'#FFF0C6','#C49B58',6);if(this.state.motion&&!claimed)tween(alpha(glow,180)).to(2.4,{opacity:255},{easing:'sineInOut'}).to(2.8,{opacity:180},{easing:'sineInOut'}).union().repeatForever().start()}const taken=i<shown||(claimed&&i===shown);const rewardIcon=this.art.image(n,taken?'ui15':'coin-crown',i===6?220:68,i===6?39:43,i===6?78:62,i===6?65:53);if(i===shown&&!claimed){this.breathe(rewardIcon,6,3);this.sparkle(n,28,28,i===6?580:140,65,3)}const dateWidth=i===6?180:198;const ribbon=group(n,'Day ribbon '+(i+1),0,0,dateWidth,36),rg=ribbon.addComponent(Graphics);rg.fillColor=color(i===shown?'#6B2C3C':'#DAC49C');rg.roundRect(0,-36,dateWidth,36,5);rg.fill();label(ribbon,(taken?'✓  ':'')+(this.state.lang==='en'?'DAY ':'')+(i+1),8,1,dateWidth-16,32,20,i===shown?C.cream:C.ink,true);label(n,this.money(v),i===6?330:10,i===6?48:102,i===6?210:178,32,26,C.ink,true);label(n,taken?t('collected'):i===shown?t('today'):t('future'),i===6?330:8,i===6?86:137,i===6?210:182,24,16,i===shown?'#A3453C':'#82624C',true)});button(this.art,p,claimed?t('claimed'):t('claim'),65,983,590,78,()=>{if(this.state.claims.includes(dateKey()))return;const v=claim(this.state);if(v&&this.persist()){this.render();this.coinFlight(360,900);this.toast(t('giftReceived'));this.cue('win')}},'ui2',claimed);button(this.art,p,t('dailyGift')+' · 2,000',65,1110,590,78,()=>{if(this.state.dailyGift===dateKey()){this.toast(t('claimed'));return}this.state.dailyGift=dateKey();this.state.balance+=2000;record(this.state,'Arrival gift',2000);if(this.persist()){this.refreshWallet();this.coinFlight(360,800);this.toast(t('giftReceived'))}},'ui2');}
 honour(p:Node){label(p,t('rankNote'),40,333,640,75,21,C.ink);const entries=[['Lady Amelie',6,125000],['Count Louis',3,88000],['Pearl Belle',9,56000],['Ruby Rose',7,34500],['Duke Felix',4,22000],['Sophie',11,12000],['Oliver',12,5000], [this.state.name,this.state.avatar,this.state.won,true]].sort((a,b)=>b[2]-a[2]);entries.forEach((v,i)=>{if(i<3){const x=[260,42,478][i],y=i===0?424:468,n=group(p,'Honour podium '+(i+1),x,y,200,280);const portrait=this.art.image(n,'avatar'+v[1],40,0,120,120);this.breathe(portrait,6+i,3);this.art.image(n,'ui1',80,102,40,40);this.art.plate(n,0,144,200,59);label(n,v[0],12,153,176,38,22,C.ink,true);label(n,this.money(v[2]),0,209,200,39,27,C.ink,true);label(n,v[3]?t('you'):t('demo'),10,251,180,24,16,'#8C623D');this.sparkle(n,20,0,160,130,3);return}const n=panel(p,32,785+(i-3)*102,656,88,v[3]?'#EDD397':'#FFF3D7',v[3]?'#AE732F':'#C9A676',15);label(n,String(i+1),10,15,54,52,30,'#9B622E',true);this.art.image(n,'avatar'+v[1],70,8,72,72);label(n,v[0]+(v[3]?' · '+t('you'):''),156,9,266,42,25,C.ink,true,0);label(n,v[3]?t('you'):t('demo'),156,50,256,24,16,'#9A7553',false,0);this.art.image(n,'coin-crown',444,29,34,34);label(n,this.money(v[2]),484,19,156,52,25,C.ink,true);if(this.state.motion){const a=alpha(n,0);tween(a).delay((i-3)*.055).to(.3,{opacity:255}).start()}})}
 account(parent:Node){const p=group(parent,'Account details',0,68,W,2080);const avatar=this.art.image(p,'avatar'+this.state.avatar,286,278,148,148);bind(avatar,()=>this.avatars());this.breathe(avatar,6,3);label(p,this.state.name,60,434,600,56,37,C.ink,true);label(p,currentProfile()?phrase('LOCAL ACCOUNT','本地账户'):t('session'),130,493,460,30,18,'#9A673B');const stats=this.art.plate(p,35,551,650,122);[[this.state.spins,'spins'],[this.state.won,'totalWon'],[this.state.biggest,'largest']].forEach(([n,k],i)=>{label(stats,this.money(n),i*213+10,20,210,42,30,C.ink,true);label(stats,t(k),i*213+10,72,210,30,16,C.ink)});label(p,t('name'),40,710,630,35,22,C.ink,false,0);const e=input(p,this.state.name,35,752,650,74);button(this.art,p,t('save'),35,847,650,70,()=>{const name=e.string.trim();if(!name)return;this.state.name=name.slice(0,18);if(this.persist()){this.render();this.toast(t('saved'))}},'ui15');button(this.art,p,t('language')+' · '+this.languageName(),35,946,650,72,()=>this.languages(),'ui7');button(this.art,p,t('sound')+' · '+t(this.state.sound?'on':'off'),35,1033,315,72,()=>{this.state.sound=!this.state.sound;this.persist();if(!this.state.sound)this.stopAudio();this.render()},'ui5');button(this.art,p,t('motion')+' · '+t(this.state.motion?'on':'off'),370,1033,315,72,()=>{this.state.motion=!this.state.motion;this.persist();this.render()},'ui6');button(this.art,p,t('history'),35,1120,650,72,()=>this.history(),'ui8');button(this.art,p,phrase('Back up progress','备份进度'),35,1207,315,72,()=>this.backup(),'ui8');button(this.art,p,phrase('Restore backup','恢复备份'),370,1207,315,72,()=>this.restore(),'ui3');button(this.art,p,t('help'),35,1294,650,72,()=>this.legal('support'),'ui7');button(this.art,p,phrase('Sign out','退出登录'),35,1381,650,72,()=>this.confirm(phrase('Sign out','退出登录'),t('loginNote'),()=>{this.state.loggedIn=false;this.persist();this.authMode='login';this.page='login';this.render()}),'ui12',true);button(this.art,p,t('reset'),35,1468,650,72,()=>this.confirm(t('reset'),t('resetNote'),()=>{this.state=defaultState();this.persist();setLanguage('en');this.page='login';this.render()}),'ui6',true);['terms','privacy'].forEach((key,i)=>button(this.art,p,this.authCaption(key),35+i*335,1560,315,70,()=>this.legal(key),'ui7'));if(currentProfile())button(this.art,p,phrase('Delete local account','删除本地账户'),35,1647,650,70,()=>this.confirm(phrase('Delete local account','删除本地账户'),phrase('Delete this local account and its progress? This cannot be undone. Exported backup files remain.','删除当前本地账户及进度？此操作不可撤销，已导出的备份文件仍会保留。'),()=>{removeLocalAccount();this.state=resumeGuest();this.state.loggedIn=false;setLanguage(this.state.lang);this.persist();this.page='login';this.authMode='login';this.render()}),'ui6',true);}
 gamePage(){const m=this.state.mode,g=geometries[m],cw=W,ch=this.H;this.cabinet=group(this.scene,'Cabinet '+m,0,0,cw,ch);const shell=this.art.image(this.cabinet,'cabinet'+m,0,0,cw,ch,'stretch');this.cabinetMaterial=this.art.cabinetLight(shell,g,m);ThemeFestivity.cabinet(this.cabinet,cw*(g.rx+g.rw/2),-ch*(g.ry+g.rh/2),cw*g.rw,ch*g.rh,GAMES[m].cols,!this.state.motion);const title=this.art.image(this.cabinet,'title'+m,cw*.12,ch*g.ty,cw*.76,ch*g.th);this.breathe(title,7.8+m*.35,7);this.art.shine(title,m*1.15,.32);this.sparkle(this.cabinet,42,ch*.14,48,ch*.54,5);this.sparkle(this.cabinet,630,ch*.14,48,ch*.54,5);this.cabinetAmbient(m);const back=this.art.image(this.cabinet,'ui12',22,18,73,73);bind(back,()=>{if(!this.busy)this.go('home')});this.wallet(this.cabinet,155,23,380,65);const soundKey=this.art.image(this.cabinet,'ui5',560,18,65,63);bind(soundKey,()=>{this.state.sound=!this.state.sound;this.persist();if(!this.state.sound)this.stopAudio();else this.syncMusic();this.toast(t('sound')+' · '+t(this.state.sound?'on':'off'))});const rulesKey=this.art.image(this.cabinet,'ui7',635,18,65,63);bind(rulesKey,()=>this.rules(),()=>!this.busy);const caption=panel(this.cabinet,149,ch*g.ry-32,422,26,'#492938','#A57B50',12);label(caption,t(['classic','both','waysRule','free'][m]),8,0,406,26,15,C.cream,true);this.reelW=cw*g.rw;this.reelH=ch*g.rh;this.reels=clip(this.cabinet,'Reel window',cw*g.rx,ch*g.ry,this.reelW,this.reelH);panel(this.reels,0,0,this.reelW,this.reelH,'#211826','#B8935C',0);this.boardState??=board(GAMES[m],seeded(25+m));if(this.boardState.length!==GAMES[m].cols)this.boardState=board(GAMES[m],seeded(25+m));this.reelBed();this.paintBoard();this.drawGrid();this.reelGlass();this.light=group(this.cabinet,'Win paths',cw*g.rx,ch*g.ry,this.reelW,this.reelH);this.statusPlate=panel(this.cabinet,98,ch*(g.sy+.045),524,37,'#422333','#956B45',18);alpha(this.statusPlate,230);this.banner=label(this.cabinet,t('ready'),109,ch*(g.sy+.045),502,37,18,C.cream,true);this.lastWin=label(this.cabinet,'0',390,ch*g.sy,184,ch*.035,32,'#5D2D25',true);this.winCaption=label(this.cabinet,t('win'),147,ch*g.sy,230,ch*.035,19,'#5D2D25',true);const y=ch*(g.cy-.009),h=ch*.083;const spin=cabinetKey(this.art,this.cabinet,'SPIN',m,0,266,y-5,188,h+10,()=>this.spin(),()=>!this.busy&&!this.auto);this.spinKey=spin.node;label(spin.node,t('spin'),20,h-15,148,29,23,C.ink,true);
 const auto=cabinetKey(this.art,this.cabinet,'AUTO',m,1,92,y+5,130,h,()=>{if(this.auto){this.auto=0;this.refreshControls()}else if(!this.busy)this.autoMenu()},()=>!this.busy||this.auto>0);this.autoKey=auto.node;this.autoLabel=label(auto.node,t('auto'),-4,h-24,138,28,19,C.ink,true);
 label(this.cabinet,t('bet'),500,y+ch*.009-1,150,25,15,C.ink,true);this.betLabel=label(this.cabinet,this.money(this.state.bet),500,y+ch*.009+24,150,37,28,C.ink,true);['minus','plus'].forEach((name,i)=>{cabinetKey(this.art,this.cabinet,'Bet '+name,m,i+2,490+i*88,y+61,82,86,()=>{if(this.busy||this.auto)return;this.state.bet=BETS[Math.max(0,Math.min(BETS.length-1,BETS.indexOf(this.state.bet)+(i?1:-1)))];this.persist();this.betLabel.string=this.money(this.state.bet);this.cue('touch')},()=>!this.busy&&!this.auto)});button(this.art,this.cabinet,t('rules'),54,ch-115,200,62,()=>this.rules(),'ui7',true);label(this.cabinet,t('largest')+'  '+this.money(this.state.biggest),370,ch-108,295,50,17,C.cream,true);this.cabinetJewels();this.refreshControls();}
 symbolName(s:number){return SYMBOLS.includes(s)?`symbol-${this.state.mode}-${s}`:'s'+s}
 paintBoard(){if(!this.reels||!isValid(this.reels))return;for(const n of [...this.reels.children])if(n.name.startsWith('Column'))n.destroy();const g=GAMES[this.state.mode],w=this.reelW/g.cols,h=this.reelH/3;this.boardState.forEach((col,c)=>{const n=clip(this.reels,'Column '+c,c*w,0,w,this.reelH);col.forEach((s,r)=>{const item=this.art.image(n,this.symbolName(s),w*.06,r*h+h*.06,w*.88,h*.88);item.name='Symbol '+c+' '+r;this.breathe(item,6+c*.4+r*.3,2)})})}
 reelBed(){
 const n=group(this.reels,'Reel enamel',0,0,this.reelW,this.reelH),g=n.addComponent(Graphics),w=this.reelW,h=this.reelH,cols=GAMES[this.state.mode].cols,cw=w/cols;
 // Muted ivory satin: a curved drum with warm edge shadow, not a flat yellow panel.
 const tone=[[242,228,203],[247,229,215],[240,235,219],[245,231,207]][this.state.mode];
 for(let c=0;c<cols;c++)for(let j=0;j<36;j++)for(let i=0;i<8;i++){
 const yy=(j+.5)/36,xx=(i+.5)/8,edge=(Math.abs(yy-.5)*2)**2,side=(Math.abs(xx-.5)*2)**3;
 const shade=edge*43+side*13;g.fillColor=new Color(tone[0]-shade,tone[1]-shade,tone[2]-shade,255);g.rect(c*cw+i*cw/8,-h*(j+1)/36,cw/8+.4,h/36+.4);g.fill();
 }
 }

 drawGrid(){
 let n=this.reels.getChildByName('Grid');if(n)n.destroy();n=group(this.reels,'Grid',0,0,this.reelW,this.reelH);const g=n.addComponent(Graphics),cols=GAMES[this.state.mode].cols;
 // Paired shadow/highlight makes an engraved separator in the warm reel bed.
 for(const highlight of [false,true]){const d=highlight?1.5:0;g.lineWidth=highlight?1:1.8;g.strokeColor=highlight?new Color(255,247,219,155):new Color(132,83,40,145);
 for(let i=1;i<cols;i++){const x=i*this.reelW/cols+d;g.moveTo(x,-3);g.lineTo(x,-this.reelH+3)}
 for(let i=1;i<3;i++){const y=-this.reelH*i/3-d;g.moveTo(3,y);g.lineTo(this.reelW-3,y)}g.stroke()}
 }

 reelGlass(){
 const w=this.reelW,h=this.reelH,n=group(this.reels,'Inset glass',0,0,w,h),g=n.addComponent(Graphics);
 for(let i=0;i<18;i++){g.fillColor=new Color(83,49,30,Math.round(95*(1-i/18)**2));g.rect(0,-i*1.5-1.5,w,1.5);g.fill();g.rect(0,-h+i*1.5,w,1.5);g.fill()}
 g.lineWidth=2;g.strokeColor=new Color(255,226,166,140);g.rect(1,-h+1,w-2,h-2);g.stroke();
 if(!this.state.motion)return;
 const light=group(n,'Glass reflection',-w,0,w,h),r=light.addComponent(Graphics);
 for(let i=0;i<12;i++){r.fillColor=new Color(210,225,255,Math.round(9*Math.sin(i/12*Math.PI)));const x=i*7;r.moveTo(x,0);r.lineTo(x+65,0);r.lineTo(x-25,-h);r.lineTo(x-90,-h);r.close();r.fill()}
 tween(light).delay(2).to(3.8,{position:new Vec3(w+130,0)},{easing:'sineInOut'}).delay(5).set({position:new Vec3(-w,0)}).union().repeatForever().start();
 }
 cabinetJewels(){
 if(!this.state.motion)return;const g=geometries[this.state.mode],x=W*g.rx-13,y=this.H*g.ry-10,w=this.reelW+26,h=this.reelH+20;
 const n=group(this.cabinet,'Frame jewels',x,y,w,h);
 for(let i=0;i<12;i++){const px=i<6?0:w,py=12+(i%6)*(h-24)/5,gem=group(n,'Setting glint',px,py,20,20),a=gem.addComponent(Graphics);
 a.fillColor=new Color(255,205,94,25);a.circle(0,0,9);a.fill();a.fillColor=new Color(255,234,171,80);a.circle(0,0,4);a.fill();a.fillColor=new Color(255,253,224,235);a.circle(0,0,1.8);a.fill();
 this.cabinetLamps.push({node:gem,opacity:alpha(gem,75),index:i});}
 this.sparkle(n,0,0,w,4,5);this.sparkle(n,0,h-3,w,3,5);
 }
 async rotate(grid:any,fast=false){
 const game=GAMES[this.state.mode],w=this.reelW/game.cols,h=this.reelH/3;
 this.reelLightPhase='spin';this.reelSpinAt=this.clock;this.reelLightAt=this.clock;this.landedReels=0;this.destroyChildren(this.light);this.idle=this.idle.filter(x=>!x.node.name.startsWith('Symbol'));this.cue('spin');
 await Promise.all(grid.map(async(col,c)=>{
 const column=this.reels.getChildByName('Column '+c);this.destroyChildren(column);
 // Only eight recycled symbols per drum; no long strip allocation at every spin.
 const values=[...col,...Array.from({length:15+c*2},()=>draw(game)),...this.boardState[c]],distance=(values.length-3)*h;
 const ghosts=group(column,'Velocity trails',0,0,w,this.reelH);
 const pool=Array.from({length:8},(_,i)=>{
 const tail=[0,1].map(j=>{const node=this.art.image(ghosts,this.symbolName(values[0]),0,0,w*.88,h*.88);return {node,sprite:node.getComponent(Sprite),opacity:alpha(node,0)}});
 const node=this.art.image(column,this.symbolName(values[0]),0,0,w*.88,h*.88);node.name='Drum symbol '+i;
 return {node,sprite:node.getComponent(Sprite),tail,index:-1,iw:0,ih:0};
 });
 const timer={t:-c*.045},duration=reelMotion(0,distance,h,c,fast).duration;let landed=false;
 const project=()=>{
 const motion=reelMotion(timer.t,distance,h,c,fast),offset=distance-motion.travel,first=Math.floor(offset/h)-2;
 pool.forEach((slot,j)=>{
 const index=first+j,visible=index>=0&&index<values.length;slot.node.active=visible;slot.tail.forEach(g=>g.node.active=visible);if(!visible)return;
 if(slot.index!==index){slot.index=index;const sf=this.art.frames.get(this.symbolName(values[index]));slot.sprite.spriteFrame=sf;slot.tail.forEach(g=>g.sprite.spriteFrame=sf);const scale=Math.min(w*.88/sf.rect.width,h*.88/sf.rect.height);slot.iw=sf.rect.width*scale;slot.ih=sf.rect.height*scale;slot.node.getComponent(UITransform).setContentSize(slot.iw,slot.ih);slot.tail.forEach(g=>g.node.getComponent(UITransform).setContentSize(slot.iw,slot.ih))}
 const linear=(index+.5)*h-offset,radius=this.reelH*.68,theta=(linear-this.reelH/2)/radius,curve=motion.curve*.86;
 const cy=linear+(radius*Math.sin(Math.max(-1.6,Math.min(1.6,theta)))-(linear-this.reelH/2))*curve;
 const sy=1-(1-Math.max(.18,Math.cos(theta)))*curve,sx=1-Math.min(1,Math.abs(theta))*.055*curve;
 slot.node.setScale(sx,sy,1);slot.node.setPosition((w-slot.iw*sx)/2,-cy+slot.ih*sy/2);
 const shade=1-Math.min(1,Math.abs(theta))*.20*curve;slot.sprite.color=new Color(255*shade,255*shade,255*shade,255);
 slot.tail.forEach((g,k)=>{const trail=Math.min(h*.24,motion.velocity*.010)*(k+1);g.node.setPosition((w-slot.iw*sx)/2,-cy+slot.ih*sy/2+trail);g.node.setScale(sx,sy+motion.curve*.08,1);g.opacity.opacity=motion.curve*(k?25:48)});
 });
 if(!landed&&timer.t>=duration-.30){landed=true;this.landedReels++;this.reelLightAt=this.clock;this.cue('stop');this.cabinet?.getComponentInChildren(ThemeFestivity)?.land(c);if(this.state.motion)this.stopFlash(column,w,this.reelH)}
 };
 project();let beam:Node|null=null;
 if(this.state.motion){beam=this.spinBeam(column,w,this.reelH,c);await new Promise(resolve=>tween(timer).to(duration+c*.045,{t:duration},{onUpdate:project}).call(resolve).start())}else {timer.t=duration;project();await wait(100)}
 // Keep the exact final sprites in place; no texture swap or frame pop at landing.
 ghosts.destroy();if(beam)beam.destroy();
 pool.forEach(slot=>{if(slot.index<0||slot.index>2){slot.node.destroy();return}slot.node.name='Symbol '+c+' '+slot.index;slot.sprite.color=Color.WHITE;const base=slot.node.position.clone(),u=slot.node.getComponent(UITransform);
 if(this.state.motion)tween(slot.node).delay(slot.index*.032).to(.09,{scale:new Vec3(1.035,.965,1),position:new Vec3(base.x-u.width*.0175,base.y-u.height*.0175)},{easing:'sineOut'}).to(.13,{scale:new Vec3(.99,1.018,1),position:new Vec3(base.x+u.width*.005,base.y+u.height*.009)},{easing:'sineInOut'}).to(.16,{scale:Vec3.ONE,position:base},{easing:'sineOut'}).call(()=>{if(isValid(slot.node))this.breathe(slot.node,7+c*.5+slot.index*.3,1.3)}).start();
 });
 if(this.state.motion)await wait(440);
 }));this.boardState=grid;this.reelLightPhase='idle';
 }
 spinBeam(parent:Node,w:number,h:number,column:number){
 const n=group(parent,'Spin silk trails',0,0,w,h);
 for(let i=0;i<4;i++){
 const line=group(n,'Reel light trail',w*(.15+i*.23),-h*.25-i*37,8,h*.32),g=line.addComponent(Graphics);
 for(let j=0;j<12;j++){g.fillColor=new Color(255,224,169,Math.round(35*Math.sin(j/12*Math.PI)));g.rect(-2,-j*h*.027,4,h*.027+1);g.fill()}
 tween(line).delay(i*.075+column*.03).by(.34,{position:new Vec3(0,-h*1.5)},{easing:'quadIn'}).set({position:new Vec3(w*(.15+i*.23),h*.25+i*37)}).union().repeatForever().start()
 }
 return n;
 }
 stopFlash(parent:Node,w:number,h:number){
 const n=group(parent,'Stop illumination',0,0,w,h),g=n.addComponent(Graphics);
 for(let i=0;i<20;i++){const y=h*i/20;g.fillColor=new Color(255,242,200,Math.round(60*Math.sin((i+.5)/20*Math.PI)));g.rect(0,-y-h/20,w,h/20+1);g.fill()}
 const o=alpha(n,0);tween(o).to(.055,{opacity:200}).to(.25,{opacity:0},{easing:'sineOut'}).call(()=>n.destroy()).start();
 }
 refreshControls(){if(this.autoLabel&&isValid(this.autoLabel))this.autoLabel.string=this.auto?t('stop')+' '+this.auto:t('auto');if(this.spinKey&&isValid(this.spinKey))alpha(this.spinKey,this.busy?190:255)}
 async spin(){if(this.busy||this.page!=='game'||this.hidden)return;if(this.state.balance<this.state.bet){this.auto=0;this.refreshControls();this.toast(t('insufficient'));return}if(this.lock)return;this.lock=true;const selectedMode=this.state.mode,selectedBet=this.state.bet;const run=async()=>{this.state=load();this.state.mode=selectedMode;this.state.bet=selectedBet;if(this.state.pending){settle(this.state);if(!this.persist())return}if(this.state.balance<this.state.bet)return;this.busy=true;this.refreshControls();try{const r=makeRound(GAMES[this.state.mode],this.state.bet);startRound(this.state,r);if(!this.persist())return;this.refreshWallet();this.lastWin.string='0';let total=0;for(let i=0;i<r.steps.length;i++){const s=r.steps[i];this.banner.string=i?`${t('freeSpins')} ${i}/8 · ${s.multiplier}×`:t('ready');await this.rotate(s.grid,i>0);total+=s.amount;if(s.amount){this.showPaths(s);this.lastWin.string=this.money(total);await this.ordinary(s.amount,i>0)}if(s.trigger)await this.feature()}settle(this.state);if(!this.persist())return;this.refreshWallet();this.lastWin.string=this.money(r.total);if(r.total){this.coinFlight(360,this.H*.5);if(r.total>=r.bet*10)await this.presentAward(r.total,false)}this.banner.string=r.total?`${r.total<r.bet?phrase('Partial return','部分返还'):t('win')} +${this.money(r.total)}`:t('ready')}catch(e){console.error(e);if(this.state.pending){settle(this.state);this.persist();this.refreshWallet()}this.toast(phrase('Round restored safely','本轮已安全结算'))}finally{this.busy=false;this.auto=Math.max(0,this.auto-1);if(this.resizePending){this.resizePending=false;this.resize()}this.refreshControls()}};
 try{if(typeof navigator!=='undefined'&&navigator.locks)await navigator.locks.request('f25-cocos-round',{ifAvailable:true},async l=>{if(l)await run();else{this.auto=0;this.toast(phrase('Another game window is active','另一个游戏窗口正在运行'))}});else await run()}finally{this.lock=false}if(this.auto&&!this.hidden){await wait(500);if(this.auto&&this.page==='game')this.spin()}}
 showPaths(s:any){
 this.destroyChildren(this.light);const w=this.reelW/GAMES[this.state.mode].cols,h=this.reelH/3;
 // Each winning symbol gets its own open-centre picture frame; no connecting lines.
 const cells=new Set(s.wins.flatMap(win=>win.cells.map(c=>c.join(','))));
 // Focus the actual winning symbols; restore every face before the next round.
 for(let c=0;c<GAMES[this.state.mode].cols;c++)for(let r=0;r<3;r++){
 const symbol=this.reels.getChildByName('Column '+c)?.getChildByName('Symbol '+c+' '+r);if(!symbol)continue;
 const sprite=symbol.getComponent(Sprite);if(!sprite||cells.has(c+','+r))continue;
 if(this.state.motion)tween(sprite).to(.28,{color:new Color(209,199,187,255)},{easing:'sineInOut'}).delay(.72).to(.42,{color:Color.WHITE},{easing:'sineInOut'}).start();
 }

 for(const cell of Array.from(cells)){
 const [c,r]=String(cell).split(',').map(Number),n=group(this.light,'Winning picture frame '+c+' '+r,c*w,r*h,w,h),g=n.addComponent(Graphics);
 const inset=7,radius=Math.min(w,h)*.11;
 // Layered bevel: recessed shadow, warm brass body, ivory highlight and inner lip.
 // The centre is transparent so the winning artwork remains untouched.
 for(const [offset,width,tint] of [
 [0,8,new Color(92,48,23,30)],
 [0,5,new Color(150,99,45,205)],
 [-.3,3.4,new Color(230,185,103,245)],
 [-1.4,1.2,new Color(255,238,179,255)],
 [2.4,1,new Color(130,77,32,180)]
 ] as [number,number,Color][]){
 g.strokeColor=tint;g.lineWidth=width;
 g.roundRect(inset+offset,-h+inset+offset,w-2*(inset+offset),h-2*(inset+offset),radius);g.stroke();
 }
 // Small corner studs tie the frame to the cabinet's gold hardware.
 for(const [x,y] of [[inset,-inset],[w-inset,-inset],[inset,-h+inset],[w-inset,-h+inset]]){
 g.fillColor=new Color(155,96,37,255);g.circle(x,y,3.2);g.fill();
 g.fillColor=new Color(255,229,155,255);g.circle(x-.5,y+.6,1.7);g.fill();
 }
 if(this.state.motion){const op=alpha(n,0);tween(op).delay(c*.045+r*.025).to(.32,{opacity:235},{easing:'sineInOut'}).to(.52,{opacity:190},{easing:'sineInOut'}).to(.48,{opacity:230},{easing:'sineInOut'}).start();}
 const symbol=this.reels.getChildByName('Column '+c)?.getChildByName('Symbol '+c+' '+r);
 if(symbol&&this.state.motion){this.idle=this.idle.filter(v=>v.node!==symbol);Tween.stopAllByTarget(symbol);const base=symbol.position.clone(),u=symbol.getComponent(UITransform);
 tween(symbol).delay(c*.055+r*.025).to(.19,{scale:new Vec3(1.075,1.075,1),position:new Vec3(base.x-u.width*.0375,base.y+u.height*.0375)},{easing:'sineOut'}).to(.26,{scale:Vec3.ONE,position:base},{easing:'sineInOut'}).delay(.13).union().repeat(2).call(()=>{if(isValid(symbol))this.breathe(symbol,6,2)}).start();}
 }
 if(s.scatterAward||s.trigger)this.toast(s.trigger?t('bonus'):'SCATTER +'+this.money(s.scatterAward*this.state.bet));
 }
 async ordinary(amount:number,free=false){
 this.cue('win');this.reelLightPhase='award';this.reelLightAt=this.clock;const geo=geometries[this.state.mode];
 const title=free?phrase('FREE SPIN AWARD','免费旋转奖励'):amount<this.state.bet?phrase('PARTIAL RETURN','部分返还'):amount===this.state.bet?phrase('BET RETURNED','下注返还'):t('smallWin');
 const awardHeight=this.H*.035;const n=group(this.cabinet,'Ordinary award',108,this.H*geo.sy,504,awardHeight);
 const hidden=[this.lastWin?.node,this.winCaption?.node,this.banner?.node,this.statusPlate].filter(v=>v&&isValid(v));hidden.forEach(v=>v.active=false);
 const coinSize=Math.min(39,awardHeight-6);this.art.image(n,'coin-crown',18,(awardHeight-coinSize)/2,coinSize,coinSize);label(n,title,66,0,214,awardHeight,18,C.ink,true);const count=label(n,'0',286,0,198,awardHeight,33,'#6F2C30',true);this.count(count,amount,.72);
 if(this.state.motion){alpha(n,0);tween(alpha(n)).to(.16,{opacity:255}).start();this.sparkle(n,8,3,480,Math.max(8,awardHeight-6),4,1.5)}
 await wait(this.state.motion?1450:300);this.reelLightPhase='idle';
 if(this.state.motion&&isValid(n)){
 // Release the award and its frames together instead of cutting directly to idle.
 hidden.forEach(v=>{if(isValid(v)){v.active=true;fadeIn(v,.28)}});
 for(const frame of this.light.children)if(frame.name.startsWith('Winning picture frame')){const op=frame.getComponent(UIOpacity)||alpha(frame);Tween.stopAllByTarget(op);tween(op).to(.28,{opacity:0},{easing:'sineInOut'}).start()}
 await new Promise<void>(resolve=>tween(alpha(n)).to(.28,{opacity:0},{easing:'sineInOut'}).call(resolve).start());
 }
 if(isValid(n))n.destroy();hidden.forEach(v=>{if(isValid(v))v.active=true});
 }
 async feature(){const n=this.openModal(t('bonus'),480);this.art.image(n,'symbol-3-2',205,-80,190,150);label(n,GAMES[3].name,55,93,510,30,19,C.gold,true);label(n,'8',80,145,460,130,108,C.cream,true);label(n,t('freeSpins')+' · 1× → 5×',50,294,520,60,29,C.cream,true);this.sparkle(n,40,60,540,340,24);this.cue('grand');await wait(this.state.motion?1800:500);this.closeModal();}
 async presentAward(amount:number,ordinary=false){
 if(ordinary){await this.ordinary(amount);return}
 const ratio=amount/this.state.bet,tier=ratio>=100?'epicWin':ratio>=30?'megaWin':'bigWin',m=this.state.mode;
 const n=group(this.stage,'Award',0,0,W,this.H);this.modal=n;n.addComponent(BlockInputEvents);
 // Keep the cabinet visible in its own light: the award belongs to this theatre.
 alpha(panel(n,0,0,W,this.H,'#281622','',0),224);
 const centreY=Math.max(105,(this.H-1020)/2),rays=group(n,'Award radiance',W/2,centreY+420),rg=rays.addComponent(Graphics);
 for(let i=0;i<20;i++){const a=i*Math.PI/10;rg.fillColor=new Color(255,214,134,i%2?10:19);rg.moveTo(0,0);rg.lineTo(Math.cos(a)*650,Math.sin(a)*650);rg.lineTo(Math.cos(a+.065)*650,Math.sin(a+.065)*650);rg.close();rg.fill()}
 if(this.state.motion)tween(rays).by(45,{angle:360}).repeatForever().start();
 // Sliced original carving keeps the frame relief intact at every phone aspect.
 const frame=this.art.plate(n,65,centreY+285,590,590);
 const motif=this.art.image(n,`symbol-${m}-${m===3?2:1}`,240,centreY+10,240,240);this.breathe(motif,5,7);
 this.art.image(n,'title'+m,80,centreY+213,560,74);
 label(n,t(tier),110,centreY+327,500,68,48,C.ink,true);
 const divider=group(n,'Award engraved rule',158,centreY+419,404,10),dg=divider.addComponent(Graphics);
 dg.strokeColor=new Color(163,111,48,130);dg.lineWidth=1;dg.moveTo(0,0);dg.lineTo(404,0);dg.stroke();
 const count=label(n,'0',93,centreY+443,534,119,90,'#792D37',true);this.count(count,amount,1.6);
 label(n,phrase('ROUND AWARD','本轮奖励')+' · '+ratio.toFixed(1)+'×',110,centreY+585,500,43,23,'#865C36',true);
 const stars=ratio>=100?3:ratio>=30?2:1;
 for(let i=0;i<3;i++){const star=this.art.image(n,'ui1',245+i*82,centreY+655,66,57);alpha(star,i<stars?255:65);if(this.state.motion&&i<stars){const op=alpha(star,0);tween(op).delay(.35+i*.16).to(.25,{opacity:255}).start()}}
 this.sparkle(n,95,centreY+300,530,410,18);this.sparkle(n,190,centreY+35,340,205,10);this.cue('grand');fadeIn(n,.28);
 // Coins remain behind the text plaque, away from the amount and the primary action.
 const confetti=group(n,'Celebration perimeter',0,0,W,this.H);confetti.setSiblingIndex(2);
 this.rain(confetti,24);
 await new Promise<void>(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;this.awardDone=null;const end=()=>{n.destroy();if(this.modal===n)this.modal=null;resolve()};if(this.state.motion)tween(alpha(n)).to(.22,{opacity:0}).call(end).start();else end()};this.awardDone=finish;
 button(this.art,n,t('continue'),150,centreY+756,420,82,finish,'ui15');n.on(Node.EventType.TOUCH_START,()=>{count.string=this.money(amount);count.node['countSkip']=true});if(this.auto)setTimeout(finish,3500)});
 }
 async enter(mode:number){if(this.busy||this.transition)return;this.state.mode=mode;this.state.loggedIn=true;if(!this.persist())return;this.transition=true;this.boardState=board(GAMES[mode],seeded(25+mode));let cover:Node|null=null;try{cover=await this.loading(mode);this.page='game';this.render();cover.setSiblingIndex(this.stage.children.length-1);await new Promise(resolve=>tween(alpha(cover)).to(this.state.motion?.32:0,{opacity:0},{easing:'sineInOut'}).call(resolve).start());}catch(error){console.error('Cabinet preparation failed',error);this.toast(phrase('Unable to load this room. Please try again.','房间加载失败，请重试。'))}finally{if(cover&&isValid(cover))cover.destroy();this.transition=false}}
 async loading(mode:number){
 const n=group(this.stage,'Theme loading',0,0,W,this.H);n.addComponent(BlockInputEvents);
 const tones=['#402128','#381D30','#273A3E','#422634'];panel(n,0,0,W,this.H,tones[mode],tones[mode],0);
 this.art.image(n,'hero'+mode,0,0,W,this.H*.55,'cover');
 // Feather the original scene into the velvet lower stage instead of a hard rectangular image edge.
 const veil=group(n,'Soft scene falloff'),vg=veil.addComponent(Graphics);for(let i=0;i<160;i++){const c=color(tones[mode]);c.a=Math.round(i/159*255);vg.fillColor=c;vg.rect(0,-this.H*(.40+(i+1)*.001),W,this.H*.001+.02);vg.fill()}
 const mark=this.art.image(n,'title'+mode,65,this.H*.53,590,110);this.breathe(mark,7,3);
 label(n,'THE VELVET CLUB · ACT '+(mode+1),60,this.H*.66,600,35,19,C.gold,true);
 label(n,t('loading'),55,this.H*.715,610,40,23,C.cream);
 panel(n,115,this.H*.79,490,16,'#231820','#AD8A58',8);
 const fill=panel(n,119,this.H*.79+4,4,8,'#F1CF8A','#F1CF8A',4),count=label(n,'0%',230,this.H*.825,260,38,21,C.cream);
 this.sparkle(n,40,60,640,this.H*.38,6);
 try{
 await this.art.load([`cabinet${mode}`,`title${mode}`,...SYMBOLS.map(symbol=>`symbol-${mode}-${symbol}`)],(done,total)=>{const progress=done/total;fill.setScale(120.5*progress,1,1);count.string=Math.round(progress*100)+'%'});
 // Give the completed state one rendered frame before revealing the prepared cabinet.
 await wait(120);return n;
 }catch(error){n.destroy();throw error}

 }
 openModal(title:string,height=700){this.closeModal();const root=group(this.stage,'Modal',0,0,W,this.H);this.modal=root;root.addComponent(BlockInputEvents);const shade=group(root,'Modal scrim'),sg=shade.addComponent(Graphics);sg.fillColor=new Color(23,14,32,180);sg.rect(0,-this.H,W,this.H);sg.fill();const h=Math.min(height,this.H-90),n=panel(root,42,(this.H-h)/2,636,h,'#422032',C.gold,26);label(n,title,28,24,520,62,30,C.cream,true);if(!this.busy){const close=this.art.image(n,'ui12',552,26,58,58);bind(close,()=>this.closeModal())}if(this.state.motion){fadeIn(root,.2);const resting=n.position.clone();n.setPosition(resting.x,resting.y-16);tween(n).to(.28,{position:resting},{easing:'cubicOut'}).start()}return n}
 closeModal(){if(this.modal){this.modal.destroy();this.modal=null}}
 confirm(title:string,body:string,fn:()=>void){const n=this.openModal(title,420);label(n,body,34,122,568,134,26,C.cream);button(this.art,n,t('cancel'),32,303,269,72,()=>this.closeModal(),'ui12',true);button(this.art,n,t('confirm'),333,303,270,72,()=>{this.closeModal();fn()},'ui15')}
 info(title:string,body:string){const n=this.openModal(title,680);label(n,body,38,112,560,430,26,C.cream);button(this.art,n,t('close'),135,574,366,66,()=>this.closeModal(),'ui12')}
 autoMenu(){const n=this.openModal(t('autoMenu'),420);label(n,t('autoNote'),40,111,556,126,24,C.cream);[10,25,50].forEach((count,i)=>button(this.art,n,String(count),26+i*205,285,181,80,()=>{this.closeModal();this.auto=count;this.spin()},`key-${this.state.mode}-1`))}
 languages(){const n=this.openModal(t('language'),600);Object.entries({en:'English',zh:'简体中文','zh-TW':'繁體中文',ja:'日本語',ko:'한국어'}).forEach(([l,title],i)=>button(this.art,n,title+(this.state.lang===l?'  ✓':''),40,112+i*87,556,72,()=>{this.state.lang=l;setLanguage(l);this.persist();this.render()},'ui7'))}
 languageName(){return {en:'English',zh:'简体中文','zh-TW':'繁體中文',ja:'日本語',ko:'한국어'}[this.state.lang]}
 avatars(){const n=this.openModal(t('avatars'),790);for(let i=0;i<16;i++){const x=30+i%4*150,y=110+Math.floor(i/4)*150,frame=panel(n,x,y,126,126,i===this.state.avatar?'#986132':'#512B3B',i===this.state.avatar?'#FFE0A0':'#7E5260',22);const av=this.art.image(frame,'avatar'+i,4,4,118,118);bind(frame,()=>{this.state.avatar=i;this.persist();this.render();this.toast(t('saved'))})}}
 mail(){const n=this.openModal(phrase('Mailbox','邮箱'),580);MAIL.forEach((m,i)=>{const y=114+i*187;panel(n,26,y,584,160,'#633448','#936049',16);this.art.image(n,'ui2',39,y+32,94,94);label(n,phrase(m.en,m.zh),148,y+9,426,51,24,C.cream,true,0);label(n,m.coins?this.money(m.coins)+' '+t('balance'):t('rules'),148,y+59,240,37,22,C.gold,false,0);const claimed=this.state.mailClaims.includes(m.id);button(this.art,n,claimed?t('collected'):t('collect'),352,y+98,227,48,()=>{if(claimed)return;const result=claimMail(this.state,m.id);if(result&&this.persist()){this.refreshWallet();this.mail();if(result.coins){this.coinFlight(360,680);this.toast(t('giftReceived'))}else this.info(t('rules'),t('allWins'))}},'ui15',claimed)})}
 history(){const n=this.openModal(t('history'),950),s=scroll(n,22,110,592,Math.min(790,this.H-240),Math.max(300,this.state.history.length*107)).content;if(!this.state.history.length)label(s,t('empty'),20,40,552,120,25,C.cream);this.state.history.forEach((h,i)=>{panel(s,4,i*105,584,94,'#613447','#936049',14);label(s,phrase(h.label,({'Daily check-in':'每日签到','Arrival gift':'到访奖励','Demo coins':'演示金币','Spin settlement':'旋转净结算','Mailbox gift':'邮箱赠礼'})[h.label]||h.label),18,i*105+8,360,42,23,C.cream,true,0);label(s,new Date(h.at).toLocaleString(),18,i*105+51,360,30,16,'#CDAE98',false,0);label(s,(h.amount>=0?'+':'')+this.money(h.amount),386,i*105+20,185,53,25,h.amount<0?'#E5A5A3':'#FFE2A0',true)})}
 rules(){const m=this.state.mode,g=GAMES[m],height=Math.min(this.H-80,1100),n=this.openModal(t('rules'),height),s=scroll(n,25,105,586,height-130,1410).content;label(s,g.name,8,3,570,53,30,C.gold,true);label(s,ruleText(m),16,71,554,305,23,C.cream,false,0);label(s,t('paytable'),20,401,546,52,30,C.gold,true);label(s,phrase('Total-bet multiplier per winning line / way','每条中奖线／路径的总投注倍数'),20,462,546,58,19,C.cream);label(s,'3                 4                 5',123,540,440,36,24,C.gold,true);[...SYMBOLS,WILD].forEach((symbol,i)=>{const y=588+i*75;panel(s,12,y,558,68,'#593044','#9C6B47',10);this.art.image(s,this.symbolName(symbol),28,y+7,55,54);[3,4,5].forEach((count,j)=>label(s,g.cols<count?'—':(basePay(symbol,count)*g.scale/g.lines).toFixed(4).replace(/0+$/,'').replace(/\.$/,'')+'×',108+j*150,y+9,147,50,22,C.cream,true))});label(s,t('bonusInfo'),20,1140,546,79,21,C.gold);label(s,t('allWins'),20,1230,546,66,20,C.cream);}
 backup(){if(typeof document==='undefined'){this.toast(phrase('Export is available in the web build','请在网页版导出备份'));return}const blob=new Blob([JSON.stringify({format:'f25-local-backup',version:1,savedAt:new Date().toISOString(),state:this.state},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='F25-Cocos-'+dateKey()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);this.toast(t('saved'))}
 restore(){if(typeof document==='undefined'){this.toast(phrase('Import is available in the web build','请在网页版导入备份'));return}const e=document.createElement('input');e.type='file';e.accept='.json';e.onchange=async()=>{try{const file=e.files[0];if(!file||file.size>1e6)throw Error();const data=JSON.parse(await file.text());if(data.format!=='f25-local-backup'||data.version!==1)throw Error();const s=normalizeState(data.state);if(s.pending)settle(s);this.confirm(phrase('Restore backup','恢复备份'),s.name+' · '+this.money(s.balance),()=>{this.state=s;this.state.loggedIn=true;this.persist();setLanguage(s.lang);this.render();this.toast(t('saved'))})}catch{this.toast(phrase('This backup cannot be read.','无法读取此备份。'))}};e.click()}
 toast(text:string){if(this.toastNode&&isValid(this.toastNode))this.toastNode.destroy();const n=panel(this.stage,70,this.H-243,580,88,'#321A2E','#DBB572',20);this.toastNode=n;label(n,text,19,10,542,67,23,C.cream);fadeIn(n,.15);setTimeout(()=>{if(isValid(n)){tween(alpha(n)).to(.25,{opacity:0}).call(()=>n.destroy()).start()}},2200)}
 count(l:Label,total:number,duration:number){const v={n:0};tween(v).to(this.state.motion?duration:.01,{n:total},{easing:'cubicOut',onUpdate:()=>{if(isValid(l)&&!l.node['countSkip'])l.string=this.money(v.n)}}).start()}
 breathe(node:Node,seconds=6,distance=4){if(!this.state.motion)return;this.idle.push({node,base:node.position.clone(),seconds,distance,phase:this.idle.length*1.4})}
 sparkle(p:Node,x:number,y:number,w:number,h:number,count=10,lifetime=0){if(!this.state.motion)return;for(let i=0;i<count;i++){const px=x+((i*137+29)%997)/997*w,py=y+((i*233+53)%991)/991*h,n=group(p,'Glint',px,py,12,12),g=n.addComponent(Graphics);g.strokeColor=new Color(255,232,177,190);g.lineWidth=1.6;g.moveTo(-6,0);g.lineTo(6,0);g.moveTo(0,-7);g.lineTo(0,7);g.stroke();g.fillColor=new Color(255,244,210,210);g.circle(0,0,1.4);g.fill();this.twinkles.push({node:n,opacity:alpha(n,0),phase:i*1.8,life:lifetime,created:this.clock})}}
 theatreLights(p:Node){if(!this.state.motion)return;for(let i=0;i<2;i++){const n=group(p,'Velvet spotlight',i?W-95:95,120,240,this.H*.63),g=n.addComponent(Graphics);g.fillColor=new Color(255,218,143,9);g.moveTo(0,0);g.lineTo(i?-190:65,-this.H*.63);g.lineTo(i?-65:190,-this.H*.63);g.close();g.fill();tween(n).to(7,{angle:i?5:-5},{easing:'sineInOut'}).to(7,{angle:i?-4:4},{easing:'sineInOut'}).union().repeatForever().start()}}
 coinFlight(x:number,y:number){
 this.cue('win');if(!this.state.motion)return;
 // Resolve the current wallet rather than aiming at a fixed lobby coordinate.
 const wallet=this.walletLabels.find(l=>isValid(l)&&l.node.activeInHierarchy);let target=new Vec3(560,-55);
 if(wallet){const rect=wallet.node.getComponent(UITransform).getBoundingBoxToWorld();target=this.stage.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(rect.x+rect.width*.5,rect.y+rect.height*.5));}
 for(let i=0;i<10;i++){
 const n=this.art.image(this.stage,'coin-crown',0,0,34+i%3*3,34+i%3*3);n.getComponent(UITransform).setAnchorPoint(.5,.5);
 const start=new Vec3(x+(i%3-1)*13,-y+(i%2)*10);n.setPosition(start);const opacity=alpha(n,0);
 const mid=new Vec3(start.x+(i-4.5)*20,Math.max(start.y,target.y)+95+i*5);
 this.particles.push({node:n,opacity,t:0,duration:.85+i*.024,delay:i*.045,start,mid,target,phase:i*.65,arrives:i===9,wallet});
 }
 }
 walletArrival(l:Label){if(!l||!isValid(l))return;Tween.stopAllByTarget(l);l.color=color('#A56526');tween(l).to(.5,{color:color(C.ink)},{easing:'sineOut'}).start();}

 rain(p:Node,count:number){if(!this.state.motion)return;for(let i=0;i<count;i++){const n=this.art.image(p,'coin-crown',i*137%700,-60-(i*83%this.H),26+i%5*7,26+i%5*7);this.particles.push({node:n,rain:true,t:0,speed:90+i%6*33,phase:i*.7,height:this.H})}}
 update(dt:number){if(!this.ready||this.hidden)return;this.clock+=Math.min(dt,.1);if(!this.state.motion)return;const elapsed=this.clock-this.reelLightAt;
 if(this.cabinetMaterial){const energy=this.reelLightPhase==='award'?.65+.3*Math.sin(elapsed*4):this.reelLightPhase==='spin'?.24+Math.exp(-elapsed*8)*Math.min(1,this.landedReels/2)*.5:0;this.cabinetResponse.x=energy;this.cabinetMaterial.setProperty('response',this.cabinetResponse);}
 for(const lamp of this.cabinetLamps){if(!isValid(lamp.node))continue;const row=lamp.index%6,side=lamp.index<6?0:1;let strength=.20+.25*Math.pow(.5+.5*Math.sin(this.clock*1.05-row*.75+side*.9),2);
 if(this.reelLightPhase==='spin'){const wave=Math.max(0,Math.cos((this.clock-this.reelSpinAt)*5.2-row*.72+side*.45));strength=.22+.48*wave**4;strength+=Math.exp(-elapsed*8)*Math.min(1,this.landedReels/2)*.40;}
 else if(this.reelLightPhase==='award'){const wave=.5+.5*Math.cos(elapsed*4-row*.3);strength=.43+.53*wave*wave;}
 lamp.opacity.opacity=Math.min(255,strength*255);}
 this.idle=this.idle.filter(v=>isValid(v.node));for(const v of this.idle)v.node.setPosition(v.base.x,v.base.y+Math.sin(this.clock*Math.PI*2/v.seconds+v.phase)*v.distance);this.twinkles=this.twinkles.filter(v=>{if(!isValid(v.node))return false;if(v.life&&this.clock-v.created>v.life){v.node.destroy();return false}const value=Math.max(0,Math.sin(this.clock*1.7+v.phase));v.opacity.opacity=230*value**5;v.node.setScale(.7+value*.6,.7+value*.6);return true});this.particles=this.particles.filter(p=>{if(!isValid(p.node))return false;p.t+=dt;if(p.rain){let y=p.node.position.y-dt*p.speed;if(y<-p.height-80)y=80;p.node.setPosition(p.node.position.x+Math.sin(this.clock+p.phase)*dt*10,y);p.node.angle=Math.sin(this.clock+p.phase)*28;return true}if(p.t<p.delay)return true;
 const t=Math.max(0,Math.min(1,(p.t-p.delay)/p.duration)),u=1-t;
 p.node.setPosition(u*u*p.start.x+2*u*t*p.mid.x+t*t*p.target.x,u*u*p.start.y+2*u*t*p.mid.y+t*t*p.target.y);
 const size=1-t*.6,turn=.34+.66*Math.abs(Math.cos(t*Math.PI*2.5+p.phase));p.node.setScale(size*turn,size,1);p.node.angle=Math.sin(t*Math.PI+p.phase)*18;
 if(p.opacity)p.opacity.opacity=255*Math.min(1,t*10)*Math.min(1,(1-t)*9);
 if(t>=1){if(p.arrives)this.walletArrival(p.wallet);p.node.destroy();return false}return true})}
 async loadAudio(){this.music=this.node.addComponent(AudioSource);this.music.loop=true;for(let i=0;i<4;i++)this.audio.push(this.node.addComponent(AudioSource));await Promise.all(['touch','spin','stop','win','grand','salon'].map(name=>new Promise<void>(resolve=>resources.load('audio/'+name,AudioClip,(e,clip)=>{if(!e)this.clips.set(name,clip);resolve()}))))}
 cue(name:string){if(!this.state.sound||this.hidden||!this.clips.has(name))return;const source=this.audio.find(a=>!a.playing)||this.audio[0];source.stop();source.clip=this.clips.get(name);source.volume=name==='touch'?.2:.38;source.play();if((name==='win'||name==='grand')&&this.music?.playing){Tween.stopAllByTarget(this.music);const target=this.page==='game'?.055:.09;tween(this.music).to(.15,{volume:.022}).delay(name==='grand'?2.8:.9).call(()=>{if(this.state.sound&&!this.hidden)tween(this.music).to(.65,{volume:target},{easing:'sineInOut'}).start()}).start()}}
 syncMusic(){if(!this.music)return;if(!this.state.sound||this.hidden){this.music.stop();return}const clip=this.clips.get('salon');if(!clip)return;if(this.music.clip!==clip)this.music.clip=clip;Tween.stopAllByTarget(this.music);if(!this.music.playing){this.music.volume=0;this.music.play()}tween(this.music).to(.55,{volume:this.page==='game'?.055:.09},{easing:'sineInOut'}).start()}
 stopAudio(){this.audio.forEach(s=>s.stop());if(this.music){Tween.stopAllByTarget(this.music);this.music.stop()}}

 nodeReport(){const out=[];const walk=(n:Node)=>{if(!n.activeInHierarchy)return;const u=n.getComponent(UITransform);if(u&&u.width>0&&u.height>0){const r=u.getBoundingBoxToWorld();out.push({name:n.name,x:r.x,y:r.y,w:r.width,h:r.height,text:n.getComponent(Label)?.string})}n.children.forEach(walk)};walk(this.stage);return {width:W,height:this.H,page:this.page,busy:this.busy,auto:this.auto,nodes:out}}
 onDestroy(){view.off('canvas-resize',this.resize,this);game.off(Game.EVENT_HIDE,this.onHide,this);game.off(Game.EVENT_SHOW,this.onShow,this);this.stopAudio()}
}
