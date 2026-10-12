// Bounded, decorative DOM only. No state, hit areas, timers or per-frame allocation.
export function mountFestivity(app,page){
 const host=app.querySelector(page==='game'?'.cabinet':page==='home'?'.harbor-world':':not(*)');
 if(!host)return;
 const fx=document.createElement('div');fx.className=`tidal-festivity ${page==='game'?'tidal-rim':'tidal-harbor'}`;fx.setAttribute('aria-hidden','true');
 fx.innerHTML=Array.from({length:page==='game'?16:22},(_,i)=>`<i class="tidal-${i<6?'glint':'pearl'}" style="--i:${i};--side:${i%2};--delay:${-i*.73}s;--y:${15+i*19%69}%"></i>`).join('');host.append(fx);
}
