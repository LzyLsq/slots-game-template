/** Image-backed controls: the carved socket remains still while its inset face travels. */
export function pressFrames(down=false){
 return down?[{transform:'translateY(0) scale(1)',filter:'brightness(1)'},{transform:'translateY(1.5px) scale(.978)',filter:'brightness(.90)'}]:[
  {transform:'translateY(1.5px) scale(.978)',filter:'brightness(.90)',offset:0},
  {transform:'translateY(-.35px) scale(1.006)',filter:'brightness(1.06)',offset:.60},
  {transform:'translateY(0) scale(1)',filter:'brightness(1)',offset:1}
 ];
}
export function buttonMaterial(button){
 if(button.matches('.utility,.portrait-button'))return 'button-small';
 if(button.matches('.spin-btn'))return 'button-spin-'+(button.closest('[data-game]')?.dataset.game?.split('-')[0]||'tiger');
 if(button.matches('.lobby-play,.login-actions .plate-btn'))return 'button-long';
 if(button.matches('.house-tab'))return button.classList.contains('selected')?'button-jade':null;
 if(button.matches('.plate-btn'))return button.classList.contains('green')?'button-jade':'button-gold';
 return null;
}
export class PhysicalControls{
 constructor(enabled){this.enabled=enabled;this.active=new Map();this.lastRelease=new WeakMap();
  this.down=e=>{const b=e.target.closest('button[data-action]');if(!b||b.disabled||!b.classList.contains('physical-control')||e.button!==0)return;this.press(b);};
  this.up=e=>{for(const b of [...this.active.keys()])this.release(b);};
  document.addEventListener('pointerdown',this.down);document.addEventListener('pointerup',this.up);document.addEventListener('pointercancel',this.up);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clear();});
 }
 decorate(root){for(const b of root.querySelectorAll('button[data-action]')){
  const material=buttonMaterial(b);if(!material){b.classList.remove('physical-control');b.querySelector(':scope > .control-face')?.remove();b.querySelector(':scope > .control-reflection')?.remove();const old=b.querySelector(':scope > .control-label');if(old){b.append(...old.childNodes);old.remove();}delete b.dataset.material;continue;}
  let label=b.querySelector(':scope > .control-label');
  if(!label){label=document.createElement('span');label.className='control-label';label.append(...b.childNodes);b.append(label);}
  b.classList.add('physical-control');b.dataset.material=material;
  let face=b.querySelector(':scope > .control-face');if(!face){face=document.createElement('img');face.className='control-face';face.alt='';face.setAttribute('aria-hidden','true');b.prepend(face);}face.src='assets/art/'+material+'-face.webp';
  if(!b.querySelector(':scope > .control-reflection')){const gleam=document.createElement('img');gleam.className='control-reflection';gleam.src='assets/art/fx-reflection.webp';gleam.alt='';gleam.setAttribute('aria-hidden','true');b.append(gleam);}
 }}
 label(button,text){if(!button)return;const label=button.querySelector(':scope > .control-label');(label||button).textContent=text;}
 press(button){if(!this.enabled()||this.active.has(button))return;button.classList.add('is-depressed');const animations=[...button.querySelectorAll(':scope > .control-face,:scope > .control-label')].map(el=>el.animate(pressFrames(true),{duration:85,easing:'cubic-bezier(.2,.65,.3,1)',fill:'forwards'}));this.active.set(button,animations);}
 release(button){const a=this.active.get(button);if(!a)return;a.forEach(n=>n.cancel());this.active.delete(button);button.classList.remove('is-depressed');this.lastRelease.set(button,performance.now());if(button.isConnected&&this.enabled())this.rebound(button);}
 rebound(button){for(const el of button.querySelectorAll(':scope > .control-face,:scope > .control-label'))el.animate(pressFrames(),{duration:240,easing:'cubic-bezier(.18,.72,.25,1)'});const reflection=button.querySelector(':scope > .control-reflection');reflection?.animate([{opacity:0,transform:'translateX(-24%) rotate(-15deg)'},{opacity:.65,offset:.32},{opacity:0,transform:'translateX(24%) rotate(12deg)'}],{duration:410,easing:'ease-out'});}
 commit(button){if(!this.enabled())return;if(performance.now()-(this.lastRelease.get(button)||-Infinity)>350)this.rebound(button);}
 clear(){for(const [b,animations]of this.active){animations.forEach(a=>a.cancel());b.classList.remove('is-depressed');}this.active.clear();}
}
