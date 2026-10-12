// Purely visual: balances are committed by the store, never by this animation.
let current;
export function cancelCollection(){current?.abort();current=null;}
export function collectCoins(source,target,{reduced=false,onCollect}={}){
 cancelCollection();
 if(document.hidden||!source||!target)return;
 if(reduced||matchMedia('(prefers-reduced-motion: reduce)').matches){onCollect?.();return;}
 const a=source.getBoundingClientRect(),b=target.getBoundingClientRect();
 if(!a.width||!b.width)return;
 const controller=new AbortController();current=controller;
 const layer=document.createElement('div');layer.className='collection-flight';layer.setAttribute('aria-hidden','true');document.body.append(layer);
 const animations=[];let finished=0;
 const clean=()=>{animations.forEach(x=>x.cancel());layer.remove();target.classList.remove('wallet-collected');if(current===controller)current=null;};
 controller.signal.addEventListener('abort',clean,{once:true});
 const sx=a.left+a.width/2,sy=a.top+a.height/2,tx=b.left+b.width/2,ty=b.top+b.height/2;
 for(let i=0;i<7;i++){
  const coin=document.createElement('img');coin.src='/art/symbol-0.png';coin.alt='';layer.append(coin);
  const offset=(i-3)*9;
  // Sample a single quadratic arc; continuous tangent avoids cornered flight paths.
  const frames=Array.from({length:33},(_,step)=>{
   const u=step/32,v=1-u,cx=sx+offset*3+(tx-sx)*.12,cy=Math.min(sy,ty)-48;
   const x=v*v*(sx+offset)+2*v*u*cx+u*u*tx;
   const y=v*v*sy+2*v*u*cy+u*u*ty;
   const scale=.45+.6*Math.sin(u*Math.PI)-.15*u;
   return {offset:u,transform:`translate(${x-13}px,${y-13}px) rotate(${u*260+offset}deg) scale(${scale})`,opacity:Math.min(1,u*8,(1-u)*8)};
  });
  const motion=coin.animate(frames,{duration:920,delay:i*58,easing:'cubic-bezier(.22,.08,.35,1)',fill:'both'});
  animations.push(motion);motion.onfinish=()=>{if(controller.signal.aborted)return;target.classList.add('wallet-collected');if(++finished===7){onCollect?.();const pulse=target.animate([{filter:'brightness(1)'},{filter:'brightness(1.18)',offset:.35},{filter:'brightness(1)'}],{duration:360});animations.push(pulse);pulse.onfinish=clean;}};
 }
}

document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelCollection();});
