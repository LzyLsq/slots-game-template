import {Label,Node,UITransform} from 'cc';
import {text,COLORS} from './FoundryArt';
import {tr} from './Language';
// Pre-wrap before pagination; readable text never shrinks to fit an oversized paragraph.
export function ruleTextPages(value:string,linesPerPage=10,width=760,size=38):string[]{
 const localized=tr(value),canvas=typeof document!=='undefined'?document.createElement('canvas'):undefined,ctx=canvas?.getContext('2d');
 if(ctx)ctx.font=`bold ${size}px Arial`;
 const measure=(s:string)=>ctx?ctx.measureText(s).width:[...s].reduce((sum,c)=>sum+size*(/[^\u0000-\u00ff]/.test(c)?1:.63),0);
 const lines:string[]=[];let line='';
 for(const token of localized.match(/[A-Za-z0-9]+(?:[.,’'\-][A-Za-z0-9]+)*|\n|[^\S\n]+|[^\s]/gu)??[]){
  if(token==='\n'){lines.push(line.trim());line='';continue;}
  if(measure(line+token)>width&&line.trim()){lines.push(line.trim());line=token.trimStart();}else line+=token;
 }
 if(line.trim())lines.push(line.trim());
 const pages:string[]=[];for(let i=0;i<lines.length;i+=linesPerPage)pages.push(lines.slice(i,i+linesPerPage).join('\n'));
 return pages.length?pages:[''];
}
export function readableRuleText(parent:Node,value:string,x:number,y:number,w:number,h:number,size=38,color:string=COLORS.cream):Label{
 const label=text(parent,value,x,y,w,h,size,color,false);label.string=value;const fit=label.node.getComponent('TextFit');if(fit)fit.enabled=false;label.fontFamily='Arial';label.enableWrapText=false;label.overflow=Label.Overflow.CLAMP;label.lineHeight=size*1.28;return label;
}

// Rule navigation is a reading control: reserve its full inner face for text.
export function readableRuleButtons(parent:Node):void{
 const names=new Set(['Payout rules','Feature rules','Rule diagram','Previous rule page','Next rule page','Previous explanation','Next explanation','Previous rule path','Next rule path']);
 for(const button of parent.children){
  if(!names.has(button.name))continue;
  const frame=button.getComponent(UITransform);if(!frame)continue;
  for(const label of button.getComponentsInChildren(Label)){
   const fit=label.node.getComponent('TextFit');if(fit)fit.enabled=false;
   label.node.getComponent(UITransform)?.setContentSize(frame.width*.88,frame.height*.75);
   label.fontSize=36;label.lineHeight=44;label.fontFamily='Arial';label.enableWrapText=false;label.overflow=Label.Overflow.SHRINK;
  }
 }
}
