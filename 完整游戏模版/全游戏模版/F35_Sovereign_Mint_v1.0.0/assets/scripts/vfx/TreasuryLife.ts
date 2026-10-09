import {_decorator,Color,Component,Game,game,Node,Sprite,UIOpacity} from 'cc';
import {SalonArt,opacity} from '../ui/SalonArt';
import {TreasuryClock,LIFE_MAX_PARTICLES,lifeSeed,lifePose,emptyLifePose,type LifeZone,type LifeSeed,type LifePose} from './TreasuryMotion';
const {ccclass}=_decorator;
interface Item {node:Node;alpha:UIOpacity;seed:LifeSeed;pose:LifePose;}
/** Pooled bitmap details, layered behind hit surfaces and all readable content.
 * Deliberately no particles in reel apertures, counters, captions or buttons. */
@ccclass('TreasuryLife')
export class TreasuryLife extends Component {
 private items:Item[]=[];private clock=new TreasuryClock();private shown=true;private focus=-1;private sceneName='';private nextProof=0;private owner='';private frames=0;private blessings=0;private drawTotal=0;private drawPeak=0;private debug=false;
 public energy=0;public quiet=false;public reducedMotion=false;
 public setup(art:SalonArt,zones:LifeZone[],name:string,reduced=false):void{
  this.sceneName=name;this.reducedMotion=reduced;this.debug=typeof location!=='undefined'&&['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).get('debug')==='1';this.owner=name+'-'+Date.now()+'-'+Math.random();
  game.on(Game.EVENT_HIDE,this.hide,this);game.on(Game.EVENT_SHOW,this.show,this);
  if(!reduced)for(const z of zones)for(let i=0;i<z.count&&this.items.length<LIFE_MAX_PARTICLES;i++){
   const seed=lifeSeed(z,i),n=z.kind==='coin'?art.image(this.node,'award-coin-detail',0,0,seed.size,seed.size):art.light(this.node,z.kind==='glow'?1:3,0,0,seed.size,seed.size,0);
   n.name='Living '+z.name+' '+i;
   // Coins retain their authored gold shading; optics pick up the room enamel.
   if(z.kind!=='coin')n.getComponent(Sprite)!.color=new Color(z.tint);
   this.items.push({node:n,alpha:opacity(n,0),seed,pose:emptyLifePose()});
  }
  this.paint();this.proof();
 }
 public bless(focus=-1):void{if(this.reducedMotion||this.quiet)return;if(this.clock.trigger()){this.focus=focus;this.blessings++;this.paint();this.proof();}}
 private hide():void{this.shown=false;}
 private show():void{this.shown=true;}
 protected update(dt:number):void{
  if(!this.clock.advance(dt,!this.shown,this.reducedMotion))return;
  const start=this.debug?performance.now():0;this.paint();this.frames++;if(this.debug){const ms=performance.now()-start;this.drawTotal+=ms;this.drawPeak=Math.max(this.drawPeak,ms);}
  if(this.clock.time>=this.nextProof){this.nextProof=this.clock.time+.7;this.proof();}
 }
 private paint():void{
  const energy=this.quiet?0:this.energy,quiet=this.quiet?.28:1;
  for(const item of this.items){
   const impact=this.focus<0||item.seed.zone.focus===this.focus?this.clock.impulse:0;
   const p=lifePose(item.seed,this.clock.time,energy,impact,item.pose);
   item.alpha.opacity=p.alpha*quiet;item.node.setPosition(p.x,p.y);item.node.setScale(p.scaleX,p.scaleY,1);item.node.angle=p.angle;
  }
 }
 private proof():void{
  if(!this.debug||typeof document==='undefined'||!document.body)return;
  document.body.dataset.f35Life=JSON.stringify({owner:this.owner,scene:this.sceneName,particles:this.items.length,blessings:this.blessings,paintMs:this.frames?+(this.drawTotal/this.frames).toFixed(3):0,peakPaintMs:+this.drawPeak.toFixed(3),time:+this.clock.time.toFixed(2),frames:this.frames,visible:this.shown,reduced:this.reducedMotion,energy:this.energy,quiet:this.quiet,impulse:+this.clock.impulse.toFixed(2),zones:Array.from(new Set(this.items.map(i=>i.seed.zone.name))),first:this.items[0]?{x:+this.items[0].pose.x.toFixed(1),y:+this.items[0].pose.y.toFixed(1)}:null});
 }
 protected onDestroy():void{
  game.off(Game.EVENT_HIDE,this.hide,this);game.off(Game.EVENT_SHOW,this.show,this);this.items.length=0;
  if(typeof document!=='undefined'&&document.body?.dataset.f35Life?.includes(this.owner))delete document.body.dataset.f35Life;
 }
}
