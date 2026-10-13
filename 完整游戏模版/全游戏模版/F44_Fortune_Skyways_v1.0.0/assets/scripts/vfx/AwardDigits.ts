import {Label, Node, Sprite, UIOpacity, UITransform} from 'cc';
import {SalonArt,box,opacity} from '../ui/SalonArt';
import {awardDigitLayout,GoldGlyphSize} from './AwardDigitLayout';

/** A reusable sprite pool displays the real counter using commissioned gold
 * glyphs. The semantic Label remains available to QA and the localized fallback. */
export class AwardDigits {
  public readonly node:Node;
  private readonly slots:{node:Node;sprite:Sprite;transform:UITransform}[]=[];
  private last='';
  private readonly glyphs:GoldGlyphSize[];
  constructor(private art:SalonArt,parent:Node,private label:Label,private width:number,private height:number,private reserve=''){
    this.glyphs=Array.from({length:12},(_,i)=>{const r=art.frame('festival-gold-digits-v2',i).rect;return {width:r.width,height:r.height};});
    this.node=box(parent,'Commissioned gold payout digits',0,-20,width,height);
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
    const placements=awardDigitLayout(value,this.reserve,this.glyphs,this.width,this.height);
    this.slots.forEach((slot,i)=>{
      slot.node.active=i<placements.length;if(!slot.node.active)return;
      const glyph=placements[i];
      slot.sprite.spriteFrame=this.art.frame('festival-gold-digits-v2',glyph.index);
      slot.transform.setContentSize(glyph.width,glyph.height);
      slot.node.setPosition(glyph.x,glyph.y);
    });
  }
}
