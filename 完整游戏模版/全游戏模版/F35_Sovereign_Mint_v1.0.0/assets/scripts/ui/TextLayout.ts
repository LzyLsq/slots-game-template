/** Local text rectangles use the same centre-origin coordinates as UITransform. */
export interface TextBox { x:number;y:number;width:number;height:number }
export interface PlateSection { sourceX:number;sourceWidth:number;width:number;x:number }
export function plateSections(width:number,height:number,sourceWidth=832,sourceHeight=256):PlateSection[]{
 const scale=Math.min(height/sourceHeight,width/sourceWidth),shoulder=Math.min(width*.38,178*scale),centre=Math.max(1,width-2*shoulder);
 return [
  {sourceX:0,sourceWidth:178,width:shoulder,x:-width/2+shoulder/2},
  // Exclude BOTH shoulders. Including the right medallion in the middle
  // duplicated it underneath captions and broke the engraved material seam.
  {sourceX:178,sourceWidth:sourceWidth-356,width:centre,x:0},
  {sourceX:sourceWidth-178,sourceWidth:178,width:shoulder,x:width/2-shoulder/2},
 ];
}
/** Measured quiet enamel: source y=96..176, not the transparent PNG bounds. */
export function plateTextBox(width:number,height:number):TextBox{
 const sections=plateSections(width,height),scale=Math.min(height/256,width/832);
 return {x:0,y:-height/32,width:Math.max(1,sections[1].width-16*scale),height:height*80/256};
}
export function containTextBox(request:TextBox,bounds:TextBox):TextBox{
 const width=Math.min(Math.max(1,request.width),bounds.width),height=Math.min(Math.max(1,request.height),bounds.height);
 const clamp=(value:number,centre:number,reach:number)=>Math.max(centre-reach,Math.min(centre+reach,value));
 return {x:clamp(request.x,bounds.x,(bounds.width-width)/2),y:clamp(request.y,bounds.y,(bounds.height-height)/2),width,height};
}
/** Keep combining accents, variation selectors and joined emoji intact. */
export function textGlyphs(value:string):string[]{
 const result:string[]=[];
 for(const ch of Array.from(value)){
  const previous=result[result.length-1];
  if(previous&&(/^[\p{Mark}\uFE0E\uFE0F\u200D\u{1F3FB}-\u{1F3FF}]$/u.test(ch)||previous.endsWith('\u200D')))result[result.length-1]+=ch;
  else result.push(ch);
 }
 return result;
}
export interface TextFitOptions { width:number;height:number;maximum:number;wrap:boolean;leading:number;measure:(value:string,size:number)=>number }
export function fittedText(source:string,options:TextFitOptions):{text:string;size:number;lineHeight:number}{
 const {measure,wrap,leading}=options,width=Math.max(1,options.width),height=Math.max(1,options.height);
 const rows=(size:number):string[]=>{
  const result:string[]=[];
  for(const paragraph of source.split('\n')){
   if(!wrap){result.push(paragraph);continue;}
   let line='';
   const tokens:string[]=[];let lastKind='';
   for(const glyph of textGlyphs(paragraph)){
    const kind=/^\s/u.test(glyph)?'space':/^[\u2e80-\uffff]/u.test(glyph)?'cjk':'word';
    if(kind!=='cjk'&&kind===lastKind)tokens[tokens.length-1]+=glyph;else tokens.push(glyph);lastKind=kind;
   }
   for(const token of tokens){
    if(measure(line+token,size)<=width){line+=token;continue;}
    if(line.trim()){result.push(line.trimEnd());line='';}
    if(measure(token,size)<=width){line=token.trimStart();continue;}
    for(const glyph of textGlyphs(token)){if(line&&measure(line+glyph,size)>width){result.push(line);line='';}line+=glyph;}
   }
   result.push(line.trimEnd());
  }
  return result;
 };
 let low=0,high=Math.min(Math.max(0,options.maximum),height/leading),best=0;
 for(let i=0;i<18;i++){
  const size=(low+high)/2,lines=rows(size);
  if(lines.length*size*leading<=height&&lines.every(line=>measure(line,size)<=width)){best=size;low=size;}else high=size;
 }
 // Rounding DOWN preserves the fit; tiny boxes must not be rounded up to 1px.
 const size=Math.max(.001,Math.floor(best*1000)/1000);
 return {text:rows(size).join('\n'),size,lineHeight:size*leading};
}
