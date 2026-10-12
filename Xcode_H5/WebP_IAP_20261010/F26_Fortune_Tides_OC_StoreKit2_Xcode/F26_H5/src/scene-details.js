// Small, individually positioned accents: no full-screen haze or moving text.
export function sceneDetails(kind='harbor') {
  if(kind==='harbor') return `<div class="scene-details harbor-details" aria-hidden="true">
    <div class="coin-catch coin-catch-a"><img src="/art/symbol-0.webp" alt=""></div>
    <div class="coin-catch coin-catch-b"><img src="/art/symbol-0.webp" alt=""></div>
    <div class="pearl-lustre"><i></i><i></i><i></i></div>
    <div class="grotto-jewel"><img src="/art/symbol-2.webp" alt=""><i></i></div>
    <div class="lighthouse-sweep"></div>
    <div class="water-rings"><i></i><i></i><i></i></div>
    ${Array.from({length:8},(_,i)=>`<i class="pin-glint" style="--x:${[16,36,65,83,17,37,68,86][i]}%;--y:${[33,35,33,36,69,70,71,68][i]}%;--delay:${-i*.63}s"></i>`).join('')}
  </div>`;
  return `<div class="scene-details cabinet-details detail-${kind}" aria-hidden="true"><div class="bezel-reflections"><i class="bezel-top"></i><i class="bezel-side"></i><i class="bezel-bottom"></i></div><div class="treasure-shimmers"><i></i><i></i><i></i></div><div class="idle-show idle-show-${kind}"><i class="idle-aura"></i><i class="idle-beam beam-a"></i><i class="idle-beam beam-b"></i>${Array.from({length:7},(_,i)=>`<i class="idle-mote" style="--n:${i};--mx:${[22,72,35,81,16,62,47][i]}%;--my:${[23,22,17,16,18,14,25][i]}%"></i>`).join('')}<i class="idle-crest-glint"></i><i class="idle-theme idle-theme-a"></i><i class="idle-theme idle-theme-b"></i></div><i class="crown-facet"></i><i class="rim-light rim-left"></i><i class="rim-light rim-right"></i><i class="crown-pin"></i><i class="idle-lantern lantern-left"></i><i class="idle-lantern lantern-right"></i><i class="metal-sweep"></i>${Array.from({length:6},(_,i)=>`<i class="cabinet-firefly" style="--i:${i};left:${[12,86,18,80,25,73][i]}%;top:${[23,24,67,68,80,82][i]}%"></i>`).join('')}</div>`;
}
export function installInteractions() {
  const reduced=()=>document.body.classList.contains('reduced')||matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.addEventListener('pointerdown',event=>{
    const button=event.target.closest('button');
    if(!button||button.disabled||reduced()||document.hidden)return;
    document.querySelector('.touch-spark')?.remove();
    const fx=document.createElement('div');fx.className='touch-spark';fx.setAttribute('aria-hidden','true');
    fx.style.left=`${event.clientX}px`;fx.style.top=`${event.clientY}px`;
    for(let i=0;i<6;i++){const spark=document.createElement('i');const a=i*Math.PI/3;spark.style.setProperty('--dx',`${Math.cos(a)*22}px`);spark.style.setProperty('--dy',`${Math.sin(a)*18}px`);fx.append(spark);}
    document.body.append(fx);setTimeout(()=>fx.remove(),480);
  },{passive:true});
}
