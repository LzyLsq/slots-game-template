import {readFileSync,writeFileSync,readdirSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';
import {randomUUID,createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..'),base=join(root,'完整游戏模版/全游戏模版');
const sharp=createRequire(import.meta.url)('/Users/mengjunzhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const ids=process.argv.slice(2).map(Number),all=[13,14,15,16,17,18,19,20,21,22,23,24,29,30,33];
const template=readFileSync(join(import.meta.dirname,'RewardArtwork.template.ts'),'utf8');
const entries=[];
function save(path,value){writeFileSync(path,value);}
function replace(source,from,to,path){if(!source.includes(from))throw Error('Expected source missing: '+path+' '+from);return source.replace(from,to);}
for(const id of all.filter(id=>!ids.length||ids.includes(id))){
 const dir=join(base,readdirSync(base).find(n=>n.startsWith(`F${id}_`))),scripts=join(dir,'assets/scripts'),artDir=join(dir,'assets/resources/art');
 const prefix=id<=15?'harvest':id===17?'caravan':id===18?'express':id===19?'treasury':'canopy';
 const specs=[];
 for(let i=0;i<4;i++){
  let name=`${prefix}-soft-plate-${i}`,source=join(artDir,name+'.png');
  let cell;
  if(id===30||id===33){name='plates';source=join(artDir,'plates.png');cell={left:(i%2)*512,top:Math.floor(i/2)*512,width:512,height:512};}
  const pipeline=sharp(source);if(cell)pipeline.extract(cell);
  const {data,info}=await pipeline.ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let x0=info.width,y0=info.height,x1=0,y1=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>18){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  x0=Math.max(0,x0-2);y0=Math.max(0,y0-2);x1=Math.min(info.width-1,x1+2);y1=Math.min(info.height-1,y1+2);
  const width=x1-x0+1,height=y1-y0+1,at=(Math.floor((y0+y1)/2)*info.width+Math.floor((x0+x1)/2))*4;
  const luminance=data[at]*.2126+data[at+1]*.7152+data[at+2]*.0722;
  const spec={source:name,bounds:[x0+(cell?.left??0),y0+(cell?.top??0),width,height],ink:luminance<110?'#FFF1CE':'#633C24'};
  if(id===15){const atlases=['golden-hour','jade-treasury','pearl-palace','ruby-revel'];spec.atlas='symbols-'+atlases[i];spec.ornaments=[[8,5],[10,14],[7,10],[10,1]][i];}
  specs.push(spec);entries.push({id,theme:i,original:source.replace(root+'/',''),sha256:createHash('sha256').update(readFileSync(source)).digest('hex'),...spec,method:'Original bitmap / measured alpha bounds / horizontal three-piece rendering; no AI generation'});
 }
 save(join(scripts,'ui/RewardArtwork.ts'),template.replace('__ARTWORK_SPECS__',JSON.stringify(specs)));
 const meta=join(scripts,'ui/RewardArtwork.ts.meta');if(!existsSync(meta))save(meta,JSON.stringify({ver:'4.0.24',importer:'typescript',imported:true,uuid:randomUUID(),files:[],subMetas:{},userData:{}},null,2));
 const path=join(scripts,'ui/SalonArt.ts');let art=readFileSync(path,'utf8');
 if(!art.includes("from './RewardArtwork'"))art="import {rewardArtwork,rewardInk,rewardTextWidth,type RewardPlateKind} from './RewardArtwork';\n"+art;
 if(id===15){
  art=art.replace(/import \{rewardTheme,rewardInk,rewardPlateLayout,type RewardPlateKind\} from '\.\/RewardTheme';/,"import {rewardTheme,rewardPlateLayout} from './RewardTheme';");
  const start=art.indexOf('  public rewardPanel('),end=art.indexOf('  public rewardButton(',start);
  if(start<0||end<0)throw Error('F15 panel boundary');
  art=art.slice(0,start)+"  public rewardPanel(parent:Node,x:number,y:number,w:number,h:number,theme=0,kind:RewardPlateKind='detail'):Node {return rewardArtwork(this,parent,x,y,w,h,theme,kind);}\n"+art.slice(end);
  art=art.replace("rewardInk(theme,'button')","rewardInk(theme)").replace("rewardTheme(theme).deep,2);","'#FFF3DC',1);");
 }else if(!art.includes('public rewardPanel(')){
  const at=art.indexOf('  public panel(');if(at<0)throw Error('No panel '+id);
  art=art.slice(0,at)+`  public rewardPanel(parent:Node,x:number,y:number,w:number,h:number,theme=0,kind:RewardPlateKind='detail'):Node {return rewardArtwork(this,parent,x,y,w,h,theme,kind);}
  public rewardButton(parent:Node,x:number,y:number,w:number,h:number,label:string,theme:number,action:()=>void):Node {
    const hit=box(parent,'Collect your treasure',x,y,w,h),face=this.rewardPanel(hit,0,0,w,h,theme,'button');
    const caption=text(face,label,0,0,rewardTextWidth(w),h*.58,34,rewardInk(theme));caption.enableWrapText=false;caption.overflow=Label.Overflow.SHRINK;
    bindPress(hit,face,action);return hit;
  }
`+art.slice(at);
 }
 if((id===30||id===33)&&!art.includes("name === 'plates'"))art=art.replace("name === 'exhibits' ||", "name === 'plates' || name === 'exhibits' ||");
 save(path,art);
 if(id===30||id===33){const appPath=join(scripts,'ui/AureliaApp.ts');let app=readFileSync(appPath,'utf8');if(!app.includes("'plates'"))app=replace(app,"'optics'","'optics','plates'",appPath);save(appPath,app);}
 // F15 already has four-theme wiring and a non-settling local style preview.
 if(id===15){
  const p=join(scripts,'ui/RewardTheme.ts');let s=readFileSync(p,'utf8');s=s.replace("return ['title','amount','button'].includes(kind)?'#FFF3CE':rewardTheme(index).ink;","return rewardTheme(index).ink;");save(p,s);
 }else{
  const p=join(scripts,'vfx/SalonWinStage.ts');let stage=readFileSync(p,'utf8');
  if(id!==16&&id!==24){
   if(!stage.includes("from '../ui/RewardArtwork'"))stage="import {rewardInk,rewardOutline,rewardTextWidth} from '../ui/RewardArtwork';\n"+stage;
   stage=stage.replace(/art\.(?:panel|awardPlate)\(this\.group,0,635,1040,240(?:,0)?\)/g,"art.rewardPanel(this.group,0,635,1040,240,this.theme,'title')");
   stage=stage.replace(/art\.(?:panel|awardPlate)\(this\.group,0,455,940,100(?:,0)?\)/g,"art.rewardPanel(this.group,0,455,940,100,this.theme,'detail')");
   stage=stage.replace(/art\.(?:panel|awardPlate)\(this\.group,0,-503,871,189(?:,0)?\)/g,"art.rewardPanel(this.group,0,-503,871,189,this.theme,'amount')");
   stage=stage.split('\n').map(line=>{
    if(/text\((titlePlate|rulePlate|plate),/.test(line)){
     line=line.replace(/COLORS\.(gold|cream|ink)|'#573225'/g,'rewardInk(this.theme)').replace(/,'#[0-9a-fA-F]{6}',[1-5]\)/g,',rewardOutline(this.theme),1)');
     line=line.replace(',840,',',rewardTextWidth(1040),').replace(',860,',',rewardTextWidth(1040),').replace(',800,',',rewardTextWidth(940),').replace(',650,',',rewardTextWidth(871),');
    }return line;
   }).join('\n');
  }
  // Preserve the bespoke F24 scene and F16 timing/choreography.
  stage=stage.replace(/art\.button\((this\.group|theatre),'[^']+',0,(-760|-642),(730|680|660),(118|114|108),'([^']+)',1,\(\)=>this\.advance\(\)\)/g,"art.rewardButton($1,0,$2,$3,$4,'$5',this.theme,()=>this.advance())");
  if(id===20)stage=stage.replace("art.button(this.group,'Collect your treasure',0,-760,730,118,'Collect treasure',1,()=>this.advance(),3)","art.rewardButton(this.group,0,-760,730,118,'Collect treasure',this.theme,()=>this.advance())");
  save(p,stage);
  const smallPath=join(scripts,'vfx/OrdinaryWinStage.ts');
  if(existsSync(smallPath)){
   let small=readFileSync(smallPath,'utf8');if(!small.includes("from '../ui/RewardArtwork'"))small="import {rewardInk,rewardOutline,rewardTextWidth} from '../ui/RewardArtwork';\n"+small;
   small=small.replace(/readonly width\?:number;(?:\s*readonly theme\?:number;)*/,'readonly width?:number; readonly theme?:number;');
   small=small.replace(/const plate=art\.(?:panel|awardPlate)\(this\.group,0,0,this\.width,160(?:,0)?\);/,"const theme=placement.theme??0;\n  const plate=art.rewardPanel(this.group,0,0,this.width,160,theme,'compact');");
   small=small.split('\n').map(line=>/text\(plate,/.test(line)?line.replace(/COLORS\.(ink|gold|cream)/g,'rewardInk(theme)').replace(/this\.width\*\.(80|81)/g,'rewardTextWidth(this.width)').replace(/,0,(39|43),/,',0,34,').replace(/\),rewardInk\(theme\),2\)/g,'),rewardOutline(theme),1)'):line).join('\n');
   save(smallPath,small);
   const appPath=join(scripts,'ui/AureliaApp.ts');let app=readFileSync(appPath,'utf8');app=app.split('\n').map(line=>line.includes('OrdinaryWinStage).setup(')?line.replace('width:980}','width:980,theme:GAME_CONFIGS.indexOf(this.config)}'):line).join('\n');save(appPath,app);
  }
 }
 console.log(`F${id}: reward bitmap frames installed`);
}
const out=join(import.meta.dirname,'verification/reward-images-20261009');mkdirSync(out,{recursive:true});
const manifest=join(out,'artwork-manifest.json');const existing=existsSync(manifest)?JSON.parse(readFileSync(manifest,'utf8')):[];
save(manifest,JSON.stringify([...existing.filter(e=>!entries.some(n=>n.id===e.id)),...entries],null,2));
