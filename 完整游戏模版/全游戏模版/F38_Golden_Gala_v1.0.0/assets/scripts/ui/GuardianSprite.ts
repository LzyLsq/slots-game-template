import {_decorator,EventTouch,game,Game,Node,RenderData,Sprite,SpriteFrame,Tween,tween,UIOpacity,UITransform,type IAssembler} from 'cc';
import type {GameId} from '../math/types';
import {AudioManager} from '../audio/AudioManager';
import {SalonArt} from './SalonArt';
import {GuardianRig,GUARDIAN_CHOREOGRAPHY,GUARDIAN_GRID_X as NX,GUARDIAN_GRID_Y as NY,type GuardianCue,type GuardianContext,type GuardianPoint} from './GuardianMotion';
import {GUARDIAN_JEWELS,GUARDIAN_SOURCE,fitGuardianSeat,type GuardianJewel} from './GuardianDetails';
import {emptyGuardianCoinPose,guardianWealthCoin,guardianWealthDetail,type GuardianDetailKind,type GuardianCoinPose} from './GuardianProsperity';
import {guardianGridIndices,appendGuardianIndices} from './GuardianIndices';
const {ccclass}=_decorator;
interface WealthCoin {node:Node;alpha:UIOpacity;pose:GuardianCoinPose;point:GuardianPoint;}
interface WealthDetail extends WealthCoin {kind:GuardianDetailKind;index:number;}
interface JewelReflection {node:Node;alpha:UIOpacity;jewel:GuardianJewel;point:GuardianPoint;tangent:GuardianPoint;}
const INDICES=guardianGridIndices(NX,NY);
const mappedIndices=new WeakMap<RenderData,Uint16Array>();
const uvSnapshots=new WeakMap<RenderData,Float64Array>();
function guardianUVChanged(rd:RenderData,frame:SpriteFrame):boolean{
 const old=uvSnapshots.get(rd),uv=frame.uv;
 if(!old||old.length!==uv.length)return true;
 for(let i=0;i<uv.length;i++)if(old[i]!==uv[i])return true;
 return false;
}
// Cocos 3.8 Sprite assembler, preserving Sprite's stock alpha, world transform,
// batching and native RenderData path. The only difference is its skinned grid.
const ASSEMBLER:IAssembler={
 createData(comp){
  const rd=comp.requestRenderData();rd.dataLength=(NX+1)*(NY+1);rd.resize(rd.dataLength,INDICES.length);rd.chunk.setIndexBuffer(INDICES);mappedIndices.set(rd,new Uint16Array(INDICES.length));return rd;
 },
 updateUVs(comp){
  const sprite=comp as GuardianSprite,rd=sprite.renderData,frame=sprite.spriteFrame;if(!rd||!frame)return;
  const uv=frame.uv,vb=rd.chunk.vb,stride=rd.floatStride;let i=0;
  uvSnapshots.set(rd,Float64Array.from(uv));
  for(let row=0;row<=NY;row++)for(let col=0;col<=NX;col++){
   const u=col/NX,v=row/NY,o=i++*stride;
   vb[o+3]=(uv[4]*(1-u)+uv[6]*u)*(1-v)+(uv[0]*(1-u)+uv[2]*u)*v;
   vb[o+4]=(uv[5]*(1-u)+uv[7]*u)*(1-v)+(uv[1]*(1-u)+uv[3]*u)*v;
  }
 },
 updateColor(comp){
  const sprite=comp as Sprite,rd=sprite.renderData;if(!rd)return;
  const color=sprite.color,vb=rd.chunk.vb;
  for(let i=0;i<rd.dataLength;i++){const o=i*rd.floatStride+5;vb[o]=color.r/255;vb[o+1]=color.g/255;vb[o+2]=color.b/255;vb[o+3]=color.a/255;}
 },
 updateRenderData(comp){
  const sprite=comp as GuardianSprite,rd=sprite.renderData,frame=sprite.spriteFrame;if(!rd||!frame)return;
  if(rd.vertDirty){
   const points=sprite.points,ui=sprite.node.getComponent(UITransform)!;
   for(let i=0;i<rd.dataLength;i++){
    const u=points?points[i*2]:(i%(NX+1))/NX,v=points?points[i*2+1]:Math.floor(i/(NX+1))/NY;
    rd.data[i].x=(u-ui.anchorX)*ui.width;rd.data[i].y=(1-v-ui.anchorY)*ui.height;
   }
  }
  // Deforming the character changes positions, not texture coordinates.
  // Still detect atlas/frame UV changes, including in-place repacks.
  if(guardianUVChanged(rd,frame))ASSEMBLER.updateUVs!(sprite);
  rd.updateRenderData(sprite,frame);
 },
 fillBuffers(comp){
  const sprite=comp as GuardianSprite,rd=sprite.renderData;if(!rd)return;
  const chunk=rd.chunk;
  {
   const m=sprite.node.worldMatrix,vb=chunk.vb;
   for(let i=0;i<rd.dataLength;i++){
    const p=rd.data[i],x=p.x,y=p.y,h=m.m03*x+m.m07*y+m.m15,r=h?1/h:1,o=i*rd.floatStride;
    vb[o]=(m.m00*x+m.m04*y+m.m12)*r;vb[o+1]=(m.m01*x+m.m05*y+m.m13)*r;vb[o+2]=(m.m02*x+m.m06*y+m.m14)*r;
   }
   rd.vertDirty=false;
  }
  appendGuardianIndices(rd.accessor,chunk,INDICES,mappedIndices.get(rd)!);
  chunk.meshBuffer.setDirty();
 },
};
@ccclass('GuardianSprite')
export class GuardianSprite extends Sprite {
 public onReact?:(cue:GuardianCue)=>void;
 private rig?:GuardianRig;private audio?:AudioManager;private glints:JewelReflection[]=[];private shown=true;
 private wealthCoins:WealthCoin[]=[];private wealthDetails:WealthDetail[]=[];private wealthNotBefore=0;
 private debugMotion=false;private markerElapsed=0;
 private touchStart?:{x:number;y:number};private touchMoved=false;
 public get points():Float32Array|undefined{return this.rig?.vertices;}
 protected _flushAssembler():void{
  if(this._assembler!==ASSEMBLER){this.destroyRenderData();this._assembler=ASSEMBLER;}
  if(!this._renderData){
   const rd=this._renderData=ASSEMBLER.createData!(this) as RenderData;rd.material=this.getRenderMaterial(0);
   this.markForUpdateRenderData();if(this.spriteFrame)ASSEMBLER.updateUVs!(this);this._updateColor();
  }
 }
 public setup(art:SalonArt,id:GameId,frame:SpriteFrame,width:number,height:number,reduced:boolean,audio:AudioManager,context:GuardianContext):void{
  const fit=fitGuardianSeat(id,width,height),position=this.node.position;
  this.node.setPosition(position.x,position.y+fit.offsetY,position.z);
  width=fit.width;height=fit.height;
  this.audio=audio;this.rig=new GuardianRig(id,width,height,reduced,context);
  this.sizeMode=Sprite.SizeMode.CUSTOM;this.spriteFrame=frame;
  this.node.getComponent(UITransform)!.setContentSize(width,height);
  if(!reduced){
   for(const jewel of GUARDIAN_JEWELS[this.rig.theme]){
    const size=width*jewel.diameter,n=art.light(this.node,jewel.atlas,(jewel.u-.5)*width,(.5-jewel.v)*height,size,size,0);
    n.name='Guardian anchored jewel reflection';this.glints.push({node:n,alpha:n.getComponent(UIOpacity)!,jewel,point:{x:jewel.u,y:jewel.v},tangent:{x:jewel.u+.01,y:jewel.v}});
   }
   for(let i=0;i<2;i++){
    const n=art.image(this.node,'award-coin-detail',0,0,width*.075,width*.075);n.name='Inward prosperity coin '+i;
    const alpha=n.addComponent(UIOpacity);alpha.opacity=0;
    this.wealthCoins.push({node:n,alpha,pose:emptyGuardianCoinPose(),point:{x:0,y:0}});
   }
   // Create the entire optical pool once; no emitters or transient tweens.
   for(let i=0;i<5;i++){
    const kind:GuardianDetailKind=i===4?'receive':'trail',size=width*(kind==='receive'?.16:.062);
    const n=art.light(this.node,kind==='receive'?1:3,0,0,size,size,0);n.name='Prosperity '+kind+' '+i;
    this.wealthDetails.push({node:n,alpha:n.getComponent(UIOpacity)!,pose:emptyGuardianCoinPose(),point:{x:0,y:0},kind,index:i===4?0:i});
   }
  }
  this.node.on(Node.EventType.TOUCH_START,this.onTouchStart,this);
  this.node.on(Node.EventType.TOUCH_MOVE,this.onTouchMove,this);
  this.node.on(Node.EventType.TOUCH_CANCEL,this.cancelTouch,this);
  this.node.on(Node.EventType.TOUCH_END,this.onTouchEnd,this);
  game.on(Game.EVENT_HIDE,this.hideMotion,this);game.on(Game.EVENT_SHOW,this.showMotion,this);
  this.debugMotion=typeof document!=='undefined'&&new URLSearchParams(globalThis.location?.search??'').get('debug')==='1';
  this.publishMotion();this.markForUpdateRenderData();
 }
 public react(cue:GuardianCue):boolean{
  if(!this.rig?.trigger(cue))return false;
  this.wealthNotBefore=this.rig.ambientTime;
  this.onReact?.(cue);
  if(cue==='touch'){this.audio?.playGuardian(this.rig.theme);this.audio?.vibrate(12);}
  if(!this.rig.reduced&&cue!=='spin')this.jewelResponse(cue);
  return true;
 }
 protected update(dt:number):void{
  if(!this.rig||!this.shown||this.rig.reduced)return;
  this.rig.advance(dt);
  if(this.debugMotion){this.markerElapsed+=Math.min(dt,.05);if(this.markerElapsed>=.25){this.markerElapsed=0;this.publishMotion();}}
  const alpha=this.node.getComponent(UIOpacity);if(alpha&&alpha.opacity===0)return;
  if(this.renderData)this.renderData.vertDirty=true;this.markForUpdateRenderData();
  // One preallocated point per reflection, following the same deformed mesh.
  for(const item of this.glints){
   const p=this.rig.sample(item.jewel.u,item.jewel.v,item.point);
   item.node.setPosition((p.x-.5)*this.rig.width,(.5-p.y)*this.rig.height);
   const tangent=this.rig.sample(item.jewel.u+.01,item.jewel.v,item.tangent);
   item.node.setRotationFromEuler(0,0,Math.atan2(-(tangent.y-p.y)*this.rig.height,(tangent.x-p.x)*this.rig.width)*180/Math.PI);
   if(Tween.getRunningCount(item.alpha)===0)item.alpha.opacity=Math.round(Math.pow(Math.max(0,Math.sin(this.rig.time*.72+item.jewel.phase)),10)*54);
  }
  for(let i=0;i<this.wealthCoins.length;i++){
   const item=this.wealthCoins[i],p=guardianWealthCoin(this.rig.id,this.rig.context,this.rig.ambientTime,i,this.rig.cue,this.rig.cueTime,this.rig.reduced,item.pose,this.wealthNotBefore);
   item.alpha.opacity=p.opacity;if(p.opacity===0)continue;
   const point=this.rig.sample(p.u,p.v,item.point);
   item.node.setPosition((point.x-.5)*this.rig.width,(.5-point.y)*this.rig.height);
   item.node.setScale(p.scale,p.scale,1);item.node.setRotationFromEuler(0,0,p.angle);
  }
  for(const item of this.wealthDetails){
   const p=guardianWealthDetail(this.rig.id,this.rig.context,this.rig.ambientTime,item.index,item.kind,this.rig.cue,this.rig.cueTime,this.rig.reduced,item.pose,this.wealthNotBefore);
   item.alpha.opacity=p.opacity;if(p.opacity===0)continue;
   const point=this.rig.sample(p.u,p.v,item.point);
   item.node.setPosition((point.x-.5)*this.rig.width,(.5-point.y)*this.rig.height);
   item.node.setScale(p.scale,p.scale,1);item.node.angle=p.angle;
  }
 }

 private publishMotion():void{
  if(!this.debugMotion||!this.rig)return;
  const r=this.rig,canvas=document.querySelector('#GameCanvas');if(!canvas)return;
  const proof={
   id:r.id,context:r.context,clip:GUARDIAN_CHOREOGRAPHY[r.context][r.theme].name,
   loopSeconds:GUARDIAN_CHOREOGRAPHY[r.context][r.theme].seconds,
   recoverySeconds:+(GUARDIAN_CHOREOGRAPHY[r.context][r.theme].seconds-GUARDIAN_CHOREOGRAPHY[r.context][r.theme].actionEnd).toFixed(3),
   owner:this.node.uuid,time:+r.time.toFixed(3),ambientTime:+r.ambientTime.toFixed(3),
   cue:r.cue??'idle',cueTime:+r.cueTime.toFixed(3),cueDuration:r.cueDuration,reduced:r.reduced,
   source:GUARDIAN_SOURCE[r.id],rendered:[+r.width.toFixed(3),+r.height.toFixed(3)],
   ratioError:+(r.width/r.height/(GUARDIAN_SOURCE[r.id][0]/GUARDIAN_SOURCE[r.id][1])-1).toFixed(8),
   rigidFaceAndTreasure:true,
   wealthCoins:this.wealthCoins.filter(c=>c.alpha.opacity>0).length,
   wealthEffects:{pool:this.wealthDetails.length,active:this.wealthDetails.filter(c=>c.alpha.opacity>0).length,opacity:this.wealthDetails.map(c=>c.alpha.opacity)},
   degrees:r.currentPose.angles.map(a=>+(a*180/Math.PI).toFixed(3)),
  };
  canvas.setAttribute('data-guardian-motion',JSON.stringify(proof));
  // Four lobby characters must not overwrite one another's QA evidence.
  let all:Record<string,unknown>={};try{all=JSON.parse(canvas.getAttribute('data-guardian-motions')??'{}');}catch{/* stale QA data */}
  all[r.context+':'+r.id]=proof;canvas.setAttribute('data-guardian-motions',JSON.stringify(all));
 }
 private clearMotionProof():void{
  if(!this.debugMotion||!this.rig)return;
  const canvas=document.querySelector('#GameCanvas');if(!canvas)return;
  try{
   const all=JSON.parse(canvas.getAttribute('data-guardian-motions')??'{}'),key=this.rig.context+':'+this.rig.id;
   if(all[key]?.owner===this.node.uuid){delete all[key];if(Object.keys(all).length)canvas.setAttribute('data-guardian-motions',JSON.stringify(all));else canvas.removeAttribute('data-guardian-motions');}
   if(JSON.parse(canvas.getAttribute('data-guardian-motion')??'{}').owner===this.node.uuid)canvas.removeAttribute('data-guardian-motion');
  }catch{/* diagnostic attributes are not runtime state */}
 }
 private onTouchStart(e:EventTouch):void{const p=e.getUILocation();this.touchStart={x:p.x,y:p.y};this.touchMoved=false;}
 private onTouchMove(e:EventTouch):void{const p=e.getUILocation();if(this.touchStart&&Math.hypot(p.x-this.touchStart.x,p.y-this.touchStart.y)>20)this.touchMoved=true;}
 private cancelTouch():void{this.touchStart=undefined;this.touchMoved=true;}
 private onTouchEnd(e:EventTouch):void{if(this.touchStart&&!this.touchMoved){if(this.react('touch'))e.propagationStopped=true;}this.touchStart=undefined;}
 private hideMotion():void{this.shown=false;this.cancelTouch();}
 private showMotion():void{this.shown=true;}
 private jewelResponse(cue:GuardianCue):void{
  const strength=cue==='super'?138:cue==='big'?118:cue==='touch'?91:76;
  // Reuse the three measured reflections. No new node or drifting facial sheen
  // is created when repeatedly touching the guardian or receiving an award.
  for(let i=0;i<this.glints.length;i++){
   const a=this.glints[i].alpha;Tween.stopAllByTarget(a);
   tween(a).delay(i*.16).to(.26,{opacity:strength},{easing:'sineOut'}).to(.78,{opacity:0},{easing:'sineInOut'}).start();
  }
 }
 public onDestroy():void{
  this.clearMotionProof();
  for(const item of this.glints)Tween.stopAllByTarget(item.alpha);this.glints.length=0;this.wealthCoins.length=0;this.wealthDetails.length=0;
  game.off(Game.EVENT_HIDE,this.hideMotion,this);game.off(Game.EVENT_SHOW,this.showMotion,this);
  this.node.off(Node.EventType.TOUCH_START,this.onTouchStart,this);this.node.off(Node.EventType.TOUCH_MOVE,this.onTouchMove,this);
  this.node.off(Node.EventType.TOUCH_CANCEL,this.cancelTouch,this);this.node.off(Node.EventType.TOUCH_END,this.onTouchEnd,this);
  super.onDestroy();
 }
}
