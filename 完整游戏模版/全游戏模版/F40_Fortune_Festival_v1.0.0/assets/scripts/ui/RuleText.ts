import {Label,Node} from 'cc';
import {SalonArt,box,bindPress,text,COLORS} from './SalonArt';
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
export function readableRuleText(parent:Node,value:string,x:number,y:number,w:number,h:number,size=38,color:string=COLORS.ink):Label{
 const label=text(parent,value,x,y,w,h,size,color,false);label.string=value;const fit=label.node.getComponent('TextFit');if(fit)fit.enabled=false;label.fontFamily='Arial';label.enableWrapText=false;label.overflow=Label.Overflow.CLAMP;label.lineHeight=size*1.28;return label;
}

// Use the commissioned enamel arrow directly; stretching the long material
// plate into this short footer slot reduced it to a thin, illegible shard.
export function readableRuleArrow(parent:Node,art:SalonArt,name:string,x:number,y:number,w:number,h:number,direction:-1|1,action:()=>void):void{
 const hit=box(parent,name,x,y,w,Math.max(116,h));
 const face=art.image(hit,'interfaces',0,0,116,116,9);
 if(direction>0)face.setRotationFromEuler(0,0,180);
 bindPress(hit,face,action,{depth:3,compression:.96,release:.18});
}
