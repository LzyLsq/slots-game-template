import {_decorator,Component,Label,LabelOutline,UITransform} from 'cc';
import {containTextBox,fittedText,type TextBox} from './TextLayout';
const {ccclass}=_decorator;
let context:CanvasRenderingContext2D|null|undefined;
/** Fit actual translated glyphs, including unbroken CJK and changing balances. */
@ccclass('TextFit')
export class TextFit extends Component {
 /** Tight single-line meter boxes, without reducing numeral size for multiline leading. */
 public compactLine=false;
 /** The actual quiet area of the parent bitmap, independent of its alpha padding. */
 public contentBounds?:TextBox;
 private key='';private output='';private source='';private maximum=0;private applied=0;
 protected lateUpdate():void{this.fit();}
 public fit():void{
  const l=this.getComponent(Label),t=this.getComponent(UITransform);if(!l||!t)return;
  if(this.contentBounds){
   const contained=containTextBox({x:this.node.position.x,y:this.node.position.y,width:t.width,height:t.height},this.contentBounds);
   if(t.width!==contained.width||t.height!==contained.height)t.setContentSize(contained.width,contained.height);
   if(this.node.position.x!==contained.x||this.node.position.y!==contained.y)this.node.setPosition(contained.x,contained.y,this.node.position.z);
  }
  if(l.string!==this.output)this.source=l.string;
  if(!this.maximum||l.fontSize!==this.applied)this.maximum=l.fontSize;
  const outline=l.getComponent(LabelOutline),stroke=outline?.enabled?Math.max(0,outline.width):0;
  const key=[this.source,t.width,t.height,this.maximum,l.fontFamily,l.enableWrapText,l.isBold,l.isItalic,stroke,this.compactLine].join('|');if(key===this.key)return;this.key=key;
  if(context===undefined){try{context=globalThis.document?.createElement('canvas').getContext('2d')??null;}catch{context=null;}}
  const compact=this.compactLine&&!l.enableWrapText,leading=compact?1.05:1.22;
  const width=Math.max(1,t.width-8-stroke*2),height=Math.max(1,t.height-(compact?2:6)-stroke*2),max=Math.max(1,this.maximum);
  const measure=(value:string,size:number)=>{if(context){context.font=`${l.isItalic?'italic ':''}${l.isBold?'bold ':''}${size}px ${l.fontFamily||'Arial'}`;const ink=context.measureText(value);/* Centered advance must also contain italic/glyph overhang, not just advance width. */return ink.width+2*Math.max(0,ink.actualBoundingBoxLeft||0,(ink.actualBoundingBoxRight||ink.width)-ink.width);}return Array.from(value).reduce((n,ch)=>n+(ch.charCodeAt(0)>255?1:.66)*size,0);};
  const result=fittedText(this.source,{width,height,maximum:max,wrap:l.enableWrapText,leading,measure});
  this.output=result.text;l.string=this.output;l.fontSize=result.size;l.lineHeight=result.lineHeight;l.overflow=Label.Overflow.CLAMP;this.applied=result.size;
 }
}
