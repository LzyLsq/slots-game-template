import {_decorator,Component,Label,LabelOutline,UITransform} from 'cc';
const {ccclass}=_decorator;
let context:CanvasRenderingContext2D|null|undefined;
/** Fit actual translated glyphs, including unbroken CJK and changing balances. */
@ccclass('TextFit')
export class TextFit extends Component {
 private key='';private output='';private source='';private maximum=0;private applied=0;
 protected lateUpdate():void{this.fit();}
 public fit():void{
  const l=this.getComponent(Label),t=this.getComponent(UITransform);if(!l||!t)return;
  if(l.string!==this.output)this.source=l.string;
  if(!this.maximum||l.fontSize!==this.applied)this.maximum=l.fontSize;
  const outline=l.getComponent(LabelOutline),stroke=outline?.enabled?Math.max(0,outline.width):0;
  const key=[this.source,t.width,t.height,this.maximum,l.fontFamily,l.enableWrapText,l.isBold,l.isItalic,stroke].join('|');if(key===this.key)return;this.key=key;
  if(context===undefined){try{context=globalThis.document?.createElement('canvas').getContext('2d')??null;}catch{context=null;}}
  const width=Math.max(1,t.width-8-stroke*2),height=Math.max(1,t.height-6-stroke*2),max=Math.max(1,this.maximum);
  const measure=(value:string,size:number)=>{if(context){context.font=`${l.isItalic?'italic ':''}${l.isBold?'bold ':''}${size}px ${l.fontFamily||'Arial'}`;const ink=context.measureText(value);/* Centered advance must also contain italic/glyph overhang, not just advance width. */return ink.width+2*Math.max(0,ink.actualBoundingBoxLeft||0,(ink.actualBoundingBoxRight||ink.width)-ink.width);}return Array.from(value).reduce((n,ch)=>n+(ch.charCodeAt(0)>255?1:.66)*size,0);};
  const lines=(size:number):string[]=>{
   const result:string[]=[];for(const paragraph of this.source.split('\n')){
    if(!l.enableWrapText){result.push(paragraph);continue;}
    let line='';const tokens=paragraph.match(/[\u2e80-\uffff]|[^\S\n]+|[^\s\u2e80-\uffff]+/gu)??[''];
    for(const token of tokens){if(measure(line+token,size)<=width){line+=token;continue;}if(line.trim()){result.push(line.trimEnd());line='';}
     if(measure(token,size)<=width){line=token.trimStart();continue;}
     for(const ch of Array.from(token)){if(line&&measure(line+ch,size)>width){result.push(line);line='';}line+=ch;}
    }result.push(line.trimEnd());
   }return result;
  };
  let lo=1,hi=Math.min(max,height/1.22),best=1;
  for(let i=0;i<12;i++){const mid=(lo+hi)/2,rows=lines(mid);if(rows.length*mid*1.22<=height&&rows.every(s=>measure(s,mid)<=width+.1)){best=mid;lo=mid;}else hi=mid;}
  const size=Math.floor(best*10)/10;this.output=lines(size).join('\n');l.string=this.output;l.fontSize=size;l.lineHeight=size*1.22;l.overflow=Label.Overflow.CLAMP;this.applied=size;
 }
}
