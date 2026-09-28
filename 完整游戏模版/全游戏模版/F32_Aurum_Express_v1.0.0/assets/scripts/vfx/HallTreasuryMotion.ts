import { _decorator, Component, Node, UIOpacity } from 'cc';
import { SalonArt, box, opacity } from '../ui/SalonArt';
import { goldTreasureMote } from './SalonAtmosphere';
const { ccclass } = _decorator;

type Gleam = {node:Node; alpha:UIOpacity; phase:number; strength:number};
type Coin = {node:Node; alpha:UIOpacity; x:number; y:number; phase:number; pace:number};

/** Small, scene-anchored treasury reflections. No screen-space overlays or free-floating cards. */
@ccclass('HallTreasuryMotion')
export class HallTreasuryMotion extends Component {
  private time=0;
  private reduced=false;
  private glints:Gleam[]=[];
  private rim:Gleam[]=[];
  private coins:Coin[]=[];

  public setup(art:SalonArt,portal:Node,reduced:boolean):void {
    this.reduced=reduced;
    if(reduced)return;
    const scenery=box(this.node,'Treasury architecture reflections',0,0,1024,1792);
    // The hall photo remains the opaque bottom layer; these glints sit on its actual goldwork.
    scenery.setSiblingIndex(1);
    const sockets:[number,number,number,number,number][]=[
      [-444,-648,82,0,110],[440,-648,82,1.4,110],
      [-433,-465,54,2.5,105],[433,-465,54,3.7,105],
      [-420,427,49,.8,85],[414,425,49,3.2,85],
      [-390,310,38,4.3,70],[391,308,38,2.1,70],
    ];
    for(const [x,y,size,phase,strength] of sockets){
      const node=art.light(scenery,3,x,y,size,size,0);
      node.name='Photographed goldwork glint';
      this.glints.push({node,alpha:node.getComponent(UIOpacity)!,phase,strength});
    }
    // Coins rise just above the treasure heaps at the left/right plinths.
    // Keep them in the same visual depth as the scene, behind portals and controls.
    for(let i=0;i<6;i++){
      const side=i%2?-1:1,x=side*(443+(i%3)*11),y=-649-(i%3)*14;
      const node=goldTreasureMote(art,scenery,x,y,39+(i%3)*7,i);
      const alpha=opacity(node,0);
      this.coins.push({node,alpha,x,y,phase:(i/6)*6.4,pace:5.6+(i%3)*.45});
    }
    // Light runs *on* the fixed metal bezel. The photograph beneath it never moves.
    for(let i=0;i<3;i++){
      const node=art.light(portal,3,0,0,58,58,0);
      node.name='Portal gold bezel travelling reflection';
      this.rim.push({node,alpha:node.getComponent(UIOpacity)!,phase:i*Math.PI*2/3,strength:155});
    }
  }

  protected update(dt:number):void {
    if(this.reduced)return;
    this.time+=Math.min(dt,.05);
    for(const glint of this.glints){
      const pulse=Math.max(0,Math.sin(this.time*1.2+glint.phase));
      glint.alpha.opacity=Math.round(12+Math.pow(pulse,6)*glint.strength);
      glint.node.setScale(.72+pulse*.34,.72+pulse*.34,1);
    }
    for(const coin of this.coins){
      const p=((this.time+coin.phase)/coin.pace)%1;
      coin.node.setPosition(coin.x+Math.sin(p*Math.PI*2+coin.phase)*9,coin.y+p*177);
      coin.node.angle=(p-.5)*19;
      const fade=Math.min(1,p*6,(1-p)*4);
      coin.alpha.opacity=Math.round(Math.max(0,fade)*165);
      coin.node.setScale(.75+p*.18,.75+p*.18,1);
    }
    for(const glint of this.rim){
      const angle=this.time*.45+glint.phase,r=334;
      glint.node.setPosition(Math.cos(angle)*r,Math.sin(angle)*r);
      const pulse=Math.pow(Math.max(0,Math.sin(this.time*1.35+glint.phase)),2);
      glint.alpha.opacity=Math.round(24+pulse*glint.strength);
      glint.node.setScale(.72+pulse*.36,.72+pulse*.36,1);
    }
  }
}
