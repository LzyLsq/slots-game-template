import {Label, Node, Sprite, UIOpacity, UITransform} from 'cc';
import {SalonArt,box,opacity} from '../ui/SalonArt';

/** A reusable sprite pool displays the real counter using commissioned gold
 * glyphs. The semantic Label remains available to QA and the localized fallback. */
export class AwardDigits {
  public readonly node:Node;
  private readonly slots:{node:Node;sprite:Sprite;transform:UITransform}[]=[];
  private last='';
  constructor(private art:SalonArt,parent:Node,private label:Label,private width:number,private height:number){
    this.node=box(parent,'Commissioned gold payout digits',0,-15,width,height);
    for(let i=0;i<18;i++){
      const node=art.image(this.node,'festival-gold-digits-v2',0,0,100,140,0);node.active=false;
      this.slots.push({node,sprite:node.getComponent(Sprite)!,transform:node.getComponent(UITransform)!});
    }
    this.set(label.string);
  }
  public set(value:string):void{
    this.label.string=value;if(value===this.last)return;this.last=value;
    // Creator's loose array-spread transform treats a string as one item.
    // Split explicitly so multi-digit counters keep using the bitmap atlas.
    const alphabet='0123456789,.',indices=value.split('').map(c=>alphabet.indexOf(c));
    const fallback=indices.length>this.slots.length||indices.some(i=>i<0);
    this.node.active=!fallback;opacity(this.label.node,fallback?255:0);
    if(fallback)return;
    const frames=indices.map(i=>this.art.frame('festival-gold-digits-v2',i));
    const gap=4,total=frames.reduce((sum,f)=>sum+f.rect.width,0)+Math.max(0,frames.length-1)*gap;
    const scale=Math.min(this.height/196,this.width/Math.max(1,total));
    let x=-total*scale/2;
    this.slots.forEach((slot,i)=>{
      slot.node.active=i<frames.length;if(!slot.node.active)return;
      const frame=frames[i],w=frame.rect.width*scale,h=frame.rect.height*scale;
      slot.sprite.spriteFrame=frame;slot.transform.setContentSize(w,h);
      // Commas and decimal points share the numerals' baseline, never their cap height.
      slot.node.setPosition(x+w/2,indices[i]>=10?-(196-frame.rect.height)*scale/2:0);
      x+=w+gap*scale;
    });
  }
}
