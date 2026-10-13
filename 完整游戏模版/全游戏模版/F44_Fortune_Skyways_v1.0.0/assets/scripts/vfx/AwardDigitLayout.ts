/** Bitmap numerals keep their authored aspect and use tabular advances.
 * Punctuation is scaled independently: these new art cells have full-height
 * commas/dots, so atlas height alone cannot define readable typography. */
export interface GoldGlyphSize { width:number; height:number; }
export interface GoldGlyphPlacement { index:number; x:number; y:number; width:number; height:number; }
export function awardDigitLayout(value:string,reserve:string,glyphs:readonly GoldGlyphSize[],width:number,height:number):GoldGlyphPlacement[]{
  const alphabet='0123456789,.';
  const indices=value.split('').map(c=>alphabet.indexOf(c));
  if(indices.some(i=>i<0))return [];
  const cap=Math.max(...glyphs.slice(0,10).map(g=>g.height));
  const numeralWidth=Math.max(...glyphs.slice(0,10).map(g=>g.width));
  const size=(index:number):GoldGlyphSize=>{
    const source=glyphs[index];
    const h=index<10?source.height:cap*(index===10?.28:.16);
    return {width:source.width*h/source.height,height:h};
  };
  const gap=4,advance=(index:number)=>index<10?numeralWidth:size(index).width;
  const span=(list:readonly number[])=>list.reduce((n,i)=>n+advance(i),0)+Math.max(0,list.length-1)*gap;
  const reserved=reserve.split('').map(c=>alphabet.indexOf(c)).filter(i=>i>=0);
  const scale=Math.min(height/cap,width/Math.max(1,span(indices),span(reserved)));
  let x=-span(indices)*scale/2;
  return indices.map(index=>{
    const glyph=size(index),cell=advance(index)*scale,w=glyph.width*scale,h=glyph.height*scale;
    const result={index,x:x+cell/2,y:index<10?0:(h-cap*scale)/2,width:w,height:h};
    x+=cell+gap*scale;return result;
  });
}
