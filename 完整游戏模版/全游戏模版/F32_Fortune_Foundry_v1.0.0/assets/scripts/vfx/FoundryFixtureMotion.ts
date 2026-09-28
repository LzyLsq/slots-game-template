import { _decorator, Component, Node, UIOpacity } from 'cc';
import { FoundryArt } from '../ui/FoundryArt';
const { ccclass } = _decorator;

type Fixture = 'hall'|'entry'|'shop'|'reward'|'medal'|'passport';
interface Light { node:Node; alpha:UIOpacity; x:number; y:number; phase:number; side:number; }
interface FlowLight { node:Node; alpha:UIOpacity; side:number; lane:number; phase:number; }

/** Image-only, fixed-pool motion on the illustrated mint's physical fixtures.
 * Rendered below controls and live text; no new shapes or labels are painted. */
@ccclass('FoundryFixtureMotion')
export class FoundryFixtureMotion extends Component {
  private time=0;private fixture:Fixture='hall';private railTop=0;private railBottom=0;private runners:Light[]=[];private glints:Light[]=[];private currentSheens:FlowLight[]=[];private seals:Light[]=[];private reflections:Light[]=[];private bowls:Light[]=[];
  public setup(art:FoundryArt,fixture:Fixture,reduced:boolean):void{
    this.fixture=fixture;
    if(reduced)return;
    if(fixture==='hall'){
      // Keep the generated coin waterfall intact: separate symbol sprites read
      // as objects pasted in front of its photographic depth. Only the light
      // on the existing gold stream moves, and the stone bowls stay still.
      for(let i=0;i<12;i++){
        const side=i%2?1:-1,lane=Math.floor(i/2)%3;
        const node=art.light(this.node,2,0,0,lane===2?138:104,54,0);
        node.name='Warm light carried within the illustrated gold current';
        this.currentSheens.push({node,alpha:node.getComponent(UIOpacity)!,side,lane,phase:Math.floor(i/6)*.5+lane*.17+side*.06});
      }
      for(const [x,y,w,h,phase] of [[0,390,175,92,0],[0,237,370,88,1.1],[0,80,360,72,2.2]] as const){
        const node=art.light(this.node,2,x,y,w,h,0);
        node.name='Light reflected by a fixed fountain bowl';
        node.setScale(w/h,1,1);
        this.bowls.push({node,alpha:node.getComponent(UIOpacity)!,x,y,phase,side:0});
      }
      for(let i=0;i<3;i++){
        const y=[238,4,-445][i],node=art.light(this.node,2,0,y,[335,595,440][i],[124,126,105][i],0);
        node.name='Reflected mint glow in generated stone floor';
        if(y<0)node.setScale(440/105,1,1);
        this.reflections.push({node,alpha:node.getComponent(UIOpacity)!,x:0,y,phase:i*.53,side:i?1:-1});
      }
      for(const [x,y,size] of [[0,396,141],[-212,208,79],[212,208,79],[-332,26,111],[332,26,111]] as const)
        this.glint(art,x,y,(x+370)*.003,size,Math.sign(x));
      return;
    }
    // These are the measured, blank metal/pipe corridors in each generated
    // machine plate, not arbitrary page-edge confetti.
    const rails:Record<Exclude<Fixture,'hall'>,{x:number;top:number;bottom:number;count:number}>={
      entry:{x:336,top:390,bottom:-655,count:4},
      shop:{x:229,top:415,bottom:-385,count:4},
      reward:{x:335,top:442,bottom:-434,count:4},
      medal:{x:344,top:430,bottom:-414,count:4},
      passport:{x:438,top:426,bottom:-417,count:4}
    };
    const rail=rails[fixture];this.railTop=rail.top;this.railBottom=rail.bottom;
    for(const side of [-1,1])for(let i=0;i<rail.count;i++){
      const node=art.light(this.node,4,side*rail.x,0,105,105,0);
      node.name='Travelling generated pipe lamp';
      this.runners.push({node,alpha:node.getComponent(UIOpacity)!,x:side*rail.x,y:0,phase:i/rail.count+side*.13,side});
    }
    const spots:Record<Exclude<Fixture,'hall'>,[number,number,number][]>={
      entry:[[0,415,104],[-352,-595,76],[352,-595,76],[-355,223,66],[355,223,66]],
      shop:[[0,453,96],[-263,357,68],[263,357,68],[-263,127,68],[263,127,68],[-263,-103,68],[263,-103,68]],
      reward:[[0,477,92],[-261,110,63],[261,110,63],[-270,-287,75],[270,-287,75]],
      medal:[[0,455,104],[-220,-34,75],[220,-34,75],[0,-326,82]],
      passport:[[0,450,105],[-337,280,64],[337,280,64],[-335,-185,70],[335,-185,70]]
    };
    spots[fixture].forEach(([x,y,size],i)=>this.glint(art,x,y,i*.71,size,Math.sign(x)));
  }
  public attachHallSeal(art:FoundryArt,parent:Node,index:number):void{
    if(this.fixture!=='hall'||this.currentSheens.length===0)return;
    // This is drawn above the minted portrait, within its real brass rim.
    const node=art.light(parent,0,0,16,254,254,0);node.name='Lit engraved game entrance';
    this.seals.push({node,alpha:node.getComponent(UIOpacity)!,x:0,y:16,phase:index,side:0});
  }
  private glint(art:FoundryArt,x:number,y:number,phase:number,size:number,side:number):void{
    const node=art.light(this.node,3,x,y,size,size,0);node.name='Generated metal-jewel glint';
    this.glints.push({node,alpha:node.getComponent(UIOpacity)!,x,y,phase,side});
  }
  private positionInStream(node:Node,side:number,lane:number,p:number):void{
    if(lane===0)node.setPosition(side*(25+79*p+12*Math.sin(p*Math.PI)),392-165*p);
    else if(lane===1)node.setPosition(side*(116+92*p+15*Math.sin(p*Math.PI)),370-165*p);
    else node.setPosition(side*(153+187*p+16*Math.sin(p*Math.PI)),261-242*p);
  }
  protected update(dt:number):void{
    this.time+=Math.min(dt,.08);
    if(this.fixture==='hall'){
      for(const wave of this.currentSheens){
        const p=(this.time*.30+wave.phase+10)%1;
        this.positionInStream(wave.node,wave.side,wave.lane,p);
        wave.node.angle=wave.lane===2?wave.side*24:wave.side*15;
        wave.alpha.opacity=Math.round(175*Math.min(1,p*8,(1-p)*8));
        wave.node.setScale(.88+.10*Math.sin(p*Math.PI),.9,1);
      }
      for(const bowl of this.bowls){
        const warmth=.5+.5*Math.sin(this.time*1.7-bowl.phase);
        bowl.alpha.opacity=Math.round(25+warmth*75);
      }
      for(const seal of this.seals){
        const glow=Math.pow(Math.max(0,Math.sin(this.time*1.85-seal.phase*1.45)),2);
        seal.alpha.opacity=Math.round(12+glow*165);
        seal.node.setScale(.93+glow*.1,.93+glow*.1,1);
      }
      for(const reflection of this.reflections){
        const t=this.time*.75+reflection.phase*6;
        reflection.node.setPosition(reflection.x+Math.sin(t)*(reflection.y<0?32:22),reflection.y);
        reflection.alpha.opacity=Math.round((reflection.y<0?35:46)+(reflection.y<0?75:105)*(.5+.5*Math.sin(t*1.35)));
      }
    }else{
      for(const lamp of this.runners){
        const p=(this.time*.24+lamp.phase+10)%1;
        const flow=Math.pow(Math.max(0,Math.sin(p*Math.PI)),.8);
        lamp.node.setPosition(lamp.x+lamp.side*Math.sin(p*Math.PI*2)*4,this.railTop+(this.railBottom-this.railTop)*p);
        lamp.node.setScale(.62+flow*.45,.62+flow*.45,1);
        lamp.alpha.opacity=Math.round(180*flow*Math.min(1,p*10,(1-p)*10));
      }
    }
    for(const glint of this.glints){
      const t=this.time*1.65+glint.phase,flash=Math.pow(Math.max(0,Math.sin(t)),6);
      glint.alpha.opacity=Math.round(flash*215);
      glint.node.setPosition(glint.x+glint.side*Math.sin(t*.5)*5,glint.y);
      glint.node.setScale(.65+flash*.5,.65+flash*.5,1);
    }
  }
}
