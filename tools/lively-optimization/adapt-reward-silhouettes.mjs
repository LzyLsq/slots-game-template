import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';
import {createHash,randomUUID} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..'),base=join(root,'完整游戏模版/全游戏模版');
const sharp=createRequire(import.meta.url)('/Users/mengjunzhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const template=readFileSync(join(import.meta.dirname,'RewardArtwork.template.ts'),'utf8'),records=[];
const folder=id=>join(base,readdirSync(base).find(n=>n.startsWith(`F${id}_`)));
function put(path,text){writeFileSync(path,text);}
function install(dir,specs){
 const path=join(dir,'assets/scripts/ui/RewardArtwork.ts');put(path,template.replace('__ARTWORK_SPECS__',JSON.stringify(specs)));
 if(!existsSync(path+'.meta'))put(path+'.meta',JSON.stringify({ver:'4.0.24',importer:'typescript',imported:true,uuid:randomUUID(),files:[],subMetas:{},userData:{}},null,2));
}
function record(id,index,path,spec){records.push({id,theme:index,original:path.replace(root+'/',''),sha256:createHash('sha256').update(readFileSync(path)).digest('hex'),...spec,method:'Own original bitmap / cached crop frames / reward-only stencil silhouette; source bitmap unchanged'});}
// F27: measure the non-white silhouette, rather than including its opaque white canvas.
const d27=folder(27),modes=['royal-mint','jade-treasury','diamond-foundry','crown-wheel'],s27=[];
for(const [index,mode] of modes.entries()){
 const path=join(d27,`assets/resources/f27/controls/${mode}-plaque.png`),{data,info}=await sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const rows=[];
 for(let y=0;y<info.height;y++){
  let left=info.width,right=-1;
  for(let x=0;x<info.width;x++){const p=(y*info.width+x)*4,r=data[p],g=data[p+1],b=data[p+2];if(data[p+3]>220&&Math.min(r,g,b)<220){left=Math.min(left,x);right=Math.max(right,x);}}
  if(right-left>80)rows.push({y,left,right});
 }
 const x0=Math.min(...rows.map(r=>r.left)),x1=Math.max(...rows.map(r=>r.right)),y0=rows[0].y,y1=rows.at(-1).y,w=x1-x0+1,h=y1-y0+1;
 const samples=rows.filter((r,i)=>i===0||i===rows.length-1||i%8===0),point=(r,side)=>[(r[side]-x0)/w,(r.y-y0)/h];
 const spec={source:`f27/controls/${mode}-plaque`,bounds:[x0,y0,w,h],ink:'#FFF1CE',outline:[...samples.map(r=>point(r,'left')),...samples.toReversed().map(r=>point(r,'right'))]};
 s27.push(spec);record(27,index,path,spec);
}
install(d27,s27);
let p=join(d27,'assets/scripts/SovereignApp.ts'),app=readFileSync(p,'utf8');
if(!app.includes("from './ui/RewardArtwork'"))app="import {rewardArtwork,rewardInk} from './ui/RewardArtwork';\n"+app;
if(!app.includes('frame(key:string)'))app=app.replace('  get(key:string):SpriteFrame','  frame(key:string):SpriteFrame{return this.get(key);}\n  get(key:string):SpriteFrame');
app=app.replace("const panel=this.materialPanel(this.gameRoot!,0,30,680,170,1);panel.name='Ordinary win'","const panel=rewardArtwork(this.art,this.gameRoot!,0,30,680,170,MODE_IDS.indexOf(this.currentMode),'compact');panel.name='Ordinary win'");
app=app.replace("outlined(label(stage,feature||tr(this.player.data.locale,'big'),0,15,910,100,62,hex('#FFF1A7'),true),'#7A250C',5);outlined(label(stage,`+${this.money(amount)}`,0,-110,850,130,82,hex('#FFD356'),true),'#711E08',5);", "const theme=MODE_IDS.indexOf(this.currentMode),title=rewardArtwork(this.art,stage,0,15,910,160,theme,'title'),meter=rewardArtwork(this.art,stage,0,-165,850,175,theme,'amount');outlined(label(title,feature||tr(this.player.data.locale,'big'),0,0,580,95,58,hex(rewardInk(theme)),true),'#3E2318',2);outlined(label(meter,`+${this.money(amount)}`,0,0,560,100,76,hex(rewardInk(theme)),true),'#3E2318',2);");
app=app.replace("this.largeButton(stage,tr(this.player.data.locale,'claim'),'f27/ui/claim',0,-365,580,100,()=>", "this.rewardButton(stage,tr(this.player.data.locale,'claim'),0,-365,580,118,()=>");
// Stable hit surface; press animation never changes the tappable rectangle.
if(!app.includes('private rewardButton('))app=app.replace('  private largeButton(',`  private rewardButton(parent:Node,value:string,x:number,y:number,w:number,h:number,action:()=>void,_style=0):Node {
    const hit=box(parent,'Collect reward',x,y,w,h),face=rewardArtwork(this.art,hit,0,0,w,h,MODE_IDS.indexOf(this.currentMode),'button');
    outlined(label(face,value,0,0,w*.66,h*.58,31,hex('#FFF1CE'),true),'#3E2318',2);this.bindPress(hit,face,action,{depth:6,scale:.975});return hit;
  }
  private largeButton(`);
put(p,app);
// F31: original cabinet nameplates. Polygons follow the inner gold rim and omit
// surrounding curtains/clouds/glass. The order must match GAME_CONFIGS.
const d31=folder(31),names=['celestial-mint','coin-carousel','lucky-parade','lantern-vault'];
const specs=[
 {bounds:[810,1480,430,113],ink:'#FFF1CE',outline:[[.02,.18],[.1,.08],[.3,.01],[.7,.01],[.9,.08],[.98,.18],[1,.5],[.97,.76],[.9,.9],[.7,.97],[.3,.97],[.1,.9],[.03,.76],[0,.5]]},
 {bounds:[784,1408,480,170],ink:'#633C24',outline:[[.05,.18],[.14,.09],[.32,.02],[.68,.02],[.86,.09],[.95,.18],[1,.48],[.96,.76],[.87,.94],[.68,.88],[.32,.88],[.13,.94],[.04,.76],[0,.48]]},
 {bounds:[748,1410,552,206],ink:'#633C24',outline:[[.015,.35],[.045,.26],[.21,.25],[.3,.13],[.39,.04],[.47,.02],[.5,.12],[.53,.02],[.61,.04],[.7,.13],[.79,.25],[.955,.26],[.985,.35],[.98,.63],[.955,.88],[.9,.99],[.1,.99],[.045,.88],[.02,.63]]},
 {bounds:[782,1428,485,170],ink:'#FFF1CE',outline:[[.06,.26],[.14,.17],[.26,.14],[.37,.04],[.48,.01],[.5,.1],[.52,.01],[.63,.04],[.74,.14],[.86,.17],[.94,.26],[1,.53],[.97,.76],[.88,.93],[.73,.87],[.63,.94],[.5,.98],[.37,.94],[.27,.87],[.12,.93],[.03,.76],[0,.53]]},
].map((spec,i)=>({...spec,source:names[i]+'-tall'}));
const runtimeOrder=['coin-carousel','lantern-vault','lucky-parade','celestial-mint'];
specs.sort((a,b)=>runtimeOrder.indexOf(a.source.replace('-tall',''))-runtimeOrder.indexOf(b.source.replace('-tall','')));
for(const [i,spec]of specs.entries())record(31,i,join(d31,'assets/resources/art/'+spec.source+'.png'),spec);
install(d31,specs);
p=join(d31,'assets/scripts/ui/SalonArt.ts');let art=readFileSync(p,'utf8');
if(!art.includes("from './RewardArtwork'"))art="import {rewardArtwork,rewardInk,rewardTextWidth,type RewardPlateKind} from './RewardArtwork';\n"+art;
if(!art.includes('public rewardPanel('))art=art.replace('  public panel(',`  public rewardPanel(parent:Node,x:number,y:number,w:number,h:number,theme=0,kind:RewardPlateKind='detail'):Node{return rewardArtwork(this,parent,x,y,w,h,theme,kind);}
  public rewardButton(parent:Node,x:number,y:number,w:number,h:number,value:string,theme:number,action:()=>void):Node{
    const hit=box(parent,'Collect your treasure',x,y,w,h),face=this.rewardPanel(hit,0,0,w,h,theme,'button');
    const caption=text(face,value,0,0,rewardTextWidth(w),h*.5,31,rewardInk(theme));caption.enableWrapText=false;
    bindPress(hit,face,action);return hit;
  }
  public panel(`);
put(p,art);
p=join(d31,'assets/scripts/vfx/SalonWinStage.ts');let stage=readFileSync(p,'utf8');
if(!stage.includes("from '../ui/RewardArtwork'"))stage="import {rewardInk,rewardOutline,rewardTextWidth} from '../ui/RewardArtwork';\n"+stage;
const start=stage.indexOf('function crownTitle('),end=stage.indexOf('/** A staged',start);
if(start<0||end<0)throw Error('F31 reward helper boundaries');
stage=stage.slice(0,start)+`function crownTitle(art:SalonArt,parent:Node,theme:number,tier:number,name:string):{root:Node;title:Label}{
  const root=art.rewardPanel(parent,0,680,1040,220,theme,'title');
  const title=outlined(text(root,['BIG WIN','MEGA WIN','EPIC WIN'][tier],0,22,rewardTextWidth(1040),92,76,rewardInk(theme),true),rewardOutline(theme),1);title.enableWrapText=false;
  const subtitle=text(root,name,0,-46,rewardTextWidth(1040),42,26,rewardInk(theme));subtitle.enableWrapText=false;return {root,title};
}
function ruleRibbon(art:SalonArt,parent:Node,theme:number,value:string):Node{
  const root=art.rewardPanel(parent,0,493,930,110,theme,'detail');const copy=text(root,value,0,0,rewardTextWidth(930),54,25,rewardInk(theme));copy.enableWrapText=false;return root;
}
function amountMeter(art:SalonArt,parent:Node,theme:number):{root:Node;count:Label;glints:UIOpacity[]}{
  const root=art.rewardPanel(parent,0,-485,980,230,theme,'amount');const count=outlined(text(root,'0',0,0,rewardTextWidth(980),118,88,rewardInk(theme)),rewardOutline(theme),1);count.enableWrapText=false;return {root,count,glints:[]};
}
`+stage.slice(end);
stage=stage.replace('crownTitle(this.group,','crownTitle(art,this.group,').replace('ruleRibbon(this.group,','ruleRibbon(art,this.group,').replace('amountMeter(this.group,','amountMeter(art,this.group,');
stage=stage.replace("art.button(this.group,'Collect your treasure',0,-752,730,118,'Collect treasure',1,()=>this.advance(),3)","art.rewardButton(this.group,0,-752,730,118,'Collect treasure',this.theme,()=>this.advance())");put(p,stage);
p=join(d31,'assets/scripts/vfx/OrdinaryWinStage.ts');let small=readFileSync(p,'utf8');
if(!small.includes("from '../ui/RewardArtwork'"))small="import {rewardInk,rewardTextWidth} from '../ui/RewardArtwork';\n"+small;
small=small.replace(/readonly width\?:number;(?:\s*readonly theme\?:number;)*/,'readonly width?:number; readonly theme?:number;').replace('const plate=art.panel(this.group,0,0,this.width,160,0);',"const theme=placement.theme??0;const plate=art.rewardPanel(this.group,0,0,this.width,160,theme,'compact');").replaceAll('COLORS.ink','rewardInk(theme)').replaceAll('this.width*.80','rewardTextWidth(this.width)').replaceAll('this.width*.81','rewardTextWidth(this.width)').replace(',0,39,',',0,34,');put(p,small);
p=join(d31,'assets/scripts/ui/AureliaApp.ts');app=readFileSync(p,'utf8').replace('width:980}','width:980,theme:GAME_CONFIGS.indexOf(this.config)}');put(p,app);
const manifest=join(import.meta.dirname,'verification/reward-images-20261009/artwork-manifest.json');const previous=JSON.parse(readFileSync(manifest,'utf8'));put(manifest,JSON.stringify([...previous.filter(r=>![27,31].includes(r.id)),...records],null,2));
console.log('F27 + F31 original reward silhouettes installed; no image pixels changed.');
