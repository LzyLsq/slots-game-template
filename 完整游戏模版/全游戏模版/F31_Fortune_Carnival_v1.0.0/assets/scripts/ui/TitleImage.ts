import {ImageAsset, SpriteFrame} from 'cc';
import {language,tr} from './Language';

export type TitleTone='gold'|'ink'|'ivory';
const cache=new Map<string,SpriteFrame>();
/** Rasterized, high-resolution gilded lettering: titles are sprites, not UI labels. */
export function titleFrame(value:string,width:number,height:number,size:number,tone:TitleTone='gold'):SpriteFrame {
  const message=tr(value).replace(/\s+/g,' ').trim();
  const key=[language(),message,width,height,size,tone].join('|');
  const known=cache.get(key);if(known)return known;
  const scale=Math.min(3,2048/Math.max(1,width),512/Math.max(1,height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(8,Math.round(width*scale));canvas.height=Math.max(8,Math.round(height*scale));
  const ctx=canvas.getContext('2d')!;
  const asian=/[\u2e80-\uffff]/.test(message);
  const family=asian?'"Songti SC","Noto Serif CJK SC","Hiragino Mincho ProN",serif':'Georgia,"Times New Roman",serif';
  let pixels=Math.min(size*scale,canvas.height*.71);ctx.font=`bold ${pixels}px ${family}`;
  const max=canvas.width*.91;
  if(ctx.measureText(message).width>max){pixels=Math.max(12,pixels*max/ctx.measureText(message).width);ctx.font=`bold ${pixels}px ${family}`;}
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
  const x=canvas.width/2,y=canvas.height/2;
  const outline=tone==='ink'?'#FBE4AB':'#4B1B19';
  const gradient=ctx.createLinearGradient(0,y-pixels*.57,0,y+pixels*.57);
  if(tone==='ink'){
    [[0,'#3D201B'],[.18,'#7A462A'],[.36,'#3B221D'],[.51,'#6B3924'],[.7,'#44251D'],[1,'#291C1B']].forEach(([at,color])=>gradient.addColorStop(at as number,color as string));
  }else if(tone==='ivory'){
    [[0,'#FFFFFF'],[.27,'#FFF9E9'],[.51,'#F6DA9B'],[.78,'#FFF9DF'],[1,'#9D5B37']].forEach(([at,color])=>gradient.addColorStop(at as number,color as string));
  }else{
    [[0,'#FFFDE7'],[.18,'#FFF0B1'],[.38,'#BA7A35'],[.49,'#FFF9CD'],[.66,'#E4AD50'],[.83,'#AF632B'],[1,'#6D3722']].forEach(([at,color])=>gradient.addColorStop(at as number,color as string));
  }
  ctx.shadowColor='rgba(37,14,15,.76)';ctx.shadowBlur=scale*5;ctx.shadowOffsetY=scale*3;
  ctx.lineWidth=scale*(tone==='ink'?3.4:4.5);ctx.strokeStyle=outline;ctx.strokeText(message,x,y,max);
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.lineWidth=scale*1.5;ctx.strokeStyle=tone==='ink'?'#C88D44':'#6C351F';ctx.strokeText(message,x,y,max);
  ctx.fillStyle=gradient;ctx.fillText(message,x,y,max);
  // A narrow photographic-metal edge catches light without replacing the letterforms.
  ctx.globalAlpha=tone==='ink'?.45:.74;ctx.strokeStyle=tone==='ink'?'#FFF0C0':'#FFF9DF';ctx.lineWidth=Math.max(.8,scale*.65);
  ctx.strokeText(message,x,y-scale*.7,max);ctx.globalAlpha=1;
  const frame=SpriteFrame.createWithImage(new ImageAsset(canvas));frame.packable=false;cache.set(key,frame);return frame;
}
