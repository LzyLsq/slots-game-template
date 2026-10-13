/** Image-backed controls. Only the inset travels; the carved mounting stays fixed. */
export const CONTROL_ART = Object.freeze({
 'button-gold':{width:603,height:246,face:[.12,.30,.88,.75],slice:.30},
 'button-jade':{width:606,height:246,face:[.12,.30,.88,.75],slice:.30},
 'button-long':{width:1171,height:333,face:[.105,.30,.895,.75],slice:.30},
 'button-small':{width:1126,height:1103,face:[.19,.19,.81,.81]},
 'button-spin-tiger':{width:678,height:623,face:[.21,.245,.79,.805]},
 'button-spin-koi':{width:349,height:319,face:[.21,.245,.79,.805]},
 'button-spin-crane':{width:677,height:645,face:[.21,.245,.79,.805]},
 'button-spin-tortoise':{width:354,height:330,face:[.21,.245,.79,.805]}
});
export function controlGeometry(material,width,height){
 const art=CONTROL_ART[material];if(!art||width<=0||height<=0)return null;
 const ratio=art.width/art.height,[x0,y0,x1,y1]=art.face;
 // Three-slice plates preserve the carved caps. Only their smooth middle grows.
 const h=art.slice?Math.min(height,width/(ratio*art.slice*2+.12)):Math.min(height,width/ratio);
 const w=art.slice?width:h*ratio,cap=art.slice?h*ratio*art.slice:0;
 const inset=art.slice?h*ratio*x0:w*x0;
 return {left:(width-w)/2,top:(height-h)/2,width:w,height:h,cap,
  label:{left:(width-w)/2+inset,top:(height-h)/2+h*y0,width:w-inset*2,height:h*(y1-y0)}};
}
export function pressFrames(down=false){
 return down?[{transform:'translateY(0) scale(1)',filter:'brightness(1)'},{transform:'translateY(1.25px) scale(.982)',filter:'brightness(.93)'}]:[
  {transform:'translateY(1.25px) scale(.982)',filter:'brightness(.93)',offset:0},
  {transform:'translateY(-.2px) scale(1.003)',filter:'brightness(1.025)',offset:.60},
  {transform:'translateY(0) scale(1)',filter:'brightness(1)',offset:1}
 ];
}
export function buttonMaterial(button){
 if(button.matches('.utility,.portrait-button'))return 'button-small';
 if(button.matches('.spin-btn'))return 'button-spin-'+(button.closest('[data-game]')?.dataset.game?.split('-')[0]||'tiger');
 if(button.matches('.lobby-play,.login-actions .plate-btn'))return 'button-long';
 if(button.matches('.house-tab'))return button.classList.contains('selected')?'button-jade':null;
 if(button.matches('.bet-display'))return 'button-gold';
 if(button.matches('.plate-btn'))return button.classList.contains('green')?'button-jade':'button-gold';
 return null;
}
export class PhysicalControls{
 constructor(enabled){
  this.enabled=enabled;this.active=new Map();this.lastRelease=new WeakMap();this.reactions=new Map();this.observed=new Set();
  this.resize=new ResizeObserver(entries=>{for(const {target} of entries)this.layout(target);});
  this.mutations=new MutationObserver(entries=>{
   const dirty=new Set();for(const e of entries){const el=e.target.nodeType===1?e.target:e.target.parentElement,b=el?.closest('button.physical-control');if(!b)continue;if(b.disabled)this.cancel(b);dirty.add(b);}
   for(const b of dirty)this.layout(b);
  });
  this.button=e=>{const b=e.target.closest?.('button[data-action].physical-control');return b&&!b.disabled&&!b.closest('[inert]')?b:null;};
  document.addEventListener('pointerdown',e=>{const b=this.button(e);if(b&&e.button===0)this.press(b,'pointer:'+e.pointerId);});
  document.addEventListener('pointerup',e=>this.releaseOwner('pointer:'+e.pointerId));
  document.addEventListener('pointercancel',e=>this.releaseOwner('pointer:'+e.pointerId,false));
  document.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const b=this.button(e);if(b&&!e.repeat)this.press(b,'key:'+e.key);});
  document.addEventListener('keyup',e=>{if(e.key==='Enter'||e.key===' ')this.releaseOwner('key:'+e.key);});
  document.addEventListener('focusout',e=>{if(this.active.get(e.target)?.owner.startsWith('key:'))this.cancel(e.target);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clear();});
  window.addEventListener('blur',()=>this.clear());
 }
 decorate(root){
  // Rerendered buttons must not leave detached nodes retained by the observers.
  for(const b of this.observed)if(!b.isConnected){this.resize.unobserve(b);this.observed.delete(b);this.cancel(b);}
  const buttons=[...(root.matches?.('button[data-action]')?[root]:[]),...root.querySelectorAll('button[data-action]')];
  for(const b of buttons){
   const material=buttonMaterial(b);
   if(!material){
    this.cancel(b);this.resize.unobserve(b);this.observed.delete(b);b.classList.remove('physical-control','sliced-control');
    b.querySelector(':scope > .control-socket')?.remove();b.querySelector(':scope > .control-face')?.remove();b.querySelector(':scope > .control-reflection')?.remove();
    const old=b.querySelector(':scope > .control-label');if(old){b.append(...old.childNodes);old.remove();}delete b.dataset.material;continue;
   }
   let label=b.querySelector(':scope > .control-label');
   if(!label){label=document.createElement('span');label.className='control-label';label.append(...b.childNodes);b.append(label);}
   b.classList.add('physical-control');b.classList.toggle('sliced-control',!!CONTROL_ART[material].slice);b.dataset.material=material;
   for(const kind of ['socket','face']){
    const sliced=!!CONTROL_ART[material].slice,tag=sliced?'SPAN':'IMG';let el=b.querySelector(':scope > .control-'+kind);
    if(el&&el.tagName!==tag){el.remove();el=null;}
    if(!el){el=document.createElement(tag.toLowerCase());el.className='control-'+kind;el.setAttribute('aria-hidden','true');if(tag==='IMG')el.alt='';b.prepend(el);}
    const source='assets/art/'+material+(kind==='face'?'-face':'')+'.webp';
    if(sliced){el.style.borderImageSource=`url("${source}")`;el.style.borderImageSlice=`0 ${CONTROL_ART[material].slice*100}% fill`;}else el.src=source;
   }
   if(!b.querySelector(':scope > .control-reflection')){const gleam=document.createElement('img');gleam.className='control-reflection';gleam.src='assets/art/fx-reflection.webp';gleam.alt='';gleam.setAttribute('aria-hidden','true');b.append(gleam);}
   this.observed.add(b);this.resize.observe(b);this.layout(b);
  }
  this.mutations.disconnect();for(const b of this.observed)this.mutations.observe(b,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled']});
 }
 layout(button){
  if(!button.isConnected)return;const g=controlGeometry(button.dataset.material,button.clientWidth,button.clientHeight);if(!g)return;
  for(const kind of ['socket','face']){const el=button.querySelector(':scope > .control-'+kind);if(!el)continue;Object.assign(el.style,{left:g.left+'px',top:g.top+'px',width:g.width+'px',height:g.height+'px',borderWidth:`0 ${g.cap}px`});}
  const label=button.querySelector(':scope > .control-label');if(!label)return;
  const box=g.label;Object.assign(label.style,{left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.height+'px'});
  const gleam=button.querySelector(':scope > .control-reflection');if(gleam)Object.assign(gleam.style,{left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.height+'px'});
  const size=parseFloat(getComputedStyle(button).fontSize);label.style.fontSize=size+'px';
  // Measure the rendered glyphs, including the currently selected language/value.
  const range=document.createRange();range.selectNodeContents(label);const r=range.getBoundingClientRect();
  if(r.width>0&&r.height>0){const fit=Math.min(1,(box.width-2)/r.width,(box.height-1)/r.height);label.style.fontSize=Math.max(1,size*fit)+'px';}
 }
 label(button,text){if(!button)return;const label=button.querySelector(':scope > .control-label');(label||button).textContent=text;this.layout(button);}
 stopReactions(button){const list=this.reactions.get(button);if(list){list.forEach(a=>a.cancel());this.reactions.delete(button);}}
 press(button,owner='programmatic'){
  if(button.disabled||!button.isConnected||this.active.has(button))return;
  this.stopReactions(button);button.classList.add('is-held');const animations=[];
  if(this.enabled()){button.classList.add('is-depressed');for(const el of button.querySelectorAll(':scope > .control-face,:scope > .control-label'))animations.push(el.animate(pressFrames(true),{duration:75,easing:'cubic-bezier(.2,.65,.3,1)',fill:'forwards'}));}
  this.active.set(button,{owner,animations});
 }
 releaseOwner(owner,animate=true){for(const [b,a]of this.active)if(a.owner===owner)this.release(b,animate);}
 release(button,animate=true){
  const state=this.active.get(button);if(!state)return;state.animations.forEach(a=>a.cancel());this.active.delete(button);button.classList.remove('is-depressed','is-held');
  this.lastRelease.set(button,performance.now());if(animate&&button.isConnected&&!button.disabled&&this.enabled())this.rebound(button);
 }
 cancel(button){this.release(button,false);this.stopReactions(button);}
 rebound(button){
  this.stopReactions(button);const list=[...button.querySelectorAll(':scope > .control-face,:scope > .control-label')].map(el=>el.animate(pressFrames(),{duration:205,easing:'cubic-bezier(.18,.72,.25,1)'}));
  const reflection=button.querySelector(':scope > .control-reflection');if(reflection)list.push(reflection.animate([{opacity:0,transform:'translateX(-10%)'},{opacity:.28,offset:.32},{opacity:0,transform:'translateX(10%)'}],{duration:330,easing:'ease-out'}));
  this.reactions.set(button,list);Promise.all(list.map(a=>a.finished.catch(()=>{}))).then(()=>{if(this.reactions.get(button)===list)this.reactions.delete(button);});
 }
 commit(button){if(!this.enabled()||button.disabled||this.active.has(button)||!button.classList.contains('physical-control'))return;if(performance.now()-(this.lastRelease.get(button)??-Infinity)>350)this.rebound(button);}
 clear(){for(const b of [...this.active.keys(),...this.reactions.keys()])this.cancel(b);}
}
