/** Cosmetic animation only; no relationship to the outcome RNG or wallet settlement. */
const TIERS={normal:{count:10,duration:1100},big:{count:30,duration:2200},super:{count:44,duration:2800},mega:{count:58,duration:3400}};
export function particlePlan(tier='normal',width=390,height=620,reduced=false){
 const spec=TIERS[tier]||TIERS.normal,count=reduced?3:spec.count;
 return Array.from({length:count},(_,i)=>{const side=i%2?-1:1,a=i*2.399963,spread=width*(.20+(i%6)*.047);return {asset:i%11===0?'ingot':'coin',size:15+i%5*4,startX:width*.5+side*width*.07,startY:height*.62,crestX:width*.5+Math.cos(a)*spread,crestY:height*(.10+(i%5)*.055),endX:width*.5+side*width*(.19+(i%7)*.047),endY:height*(.91+(i%3)*.05),delay:reduced?0:(i%16)*48+Math.floor(i/16)*300,duration:reduced?380:spec.duration+i%4*110,turn:side*(125+i%5*45)};});
}
export class WealthEffects{
 constructor(enabled){this.enabled=enabled;this.groups=new Set();this.animations=new Set();this.hidden=()=>{for(const a of this.animations){if(document.hidden)a.pause();else a.play();}};document.addEventListener('visibilitychange',this.hidden);}
 burst(parent,tier='normal'){
  if(!parent)return;const glass=parent.classList.contains('cabinet-stage'),r=parent.getBoundingClientRect();
  const holder=document.createElement('div');holder.className='wealth-flight'+(glass?' reel-flight':'');holder.setAttribute('aria-hidden','true');parent.append(holder);const rect=holder.getBoundingClientRect();const width=rect.width||r.width,height=rect.height||r.height;
  this.groups.add(holder);let alive=0;
  for(const p of particlePlan(tier,width,height,!this.enabled())){const coin=document.createElement('img');coin.src='assets/art/'+p.asset+'.webp';coin.alt='';coin.style.width=p.size+'px';holder.append(coin);alive++;
   const keyframes=[{transform:`translate3d(${p.startX}px,${p.startY}px,0) rotate(0deg) rotateY(0deg) scale(.4)`,opacity:0,offset:0},{transform:`translate3d(${p.crestX}px,${p.crestY}px,0) rotate(${p.turn*.45}deg) rotateY(55deg) scale(1)`,opacity:1,offset:.38},{transform:`translate3d(${p.endX}px,${p.endY}px,0) rotate(${p.turn}deg) rotateY(-45deg) scale(.7)`,opacity:0,offset:1}];
   const a=coin.animate(keyframes,{duration:p.duration,delay:p.delay,easing:'cubic-bezier(.15,.64,.53,1)',fill:'both'});this.animations.add(a);if(document.hidden)a.pause();a.finished.catch(()=>{}).finally(()=>{this.animations.delete(a);coin.remove();if(!--alive){holder.remove();this.groups.delete(holder);}});
  }
 }
 finish(root,tier){if(!root?.isConnected)return;root.classList.add('complete');if(this.enabled()&&tier!=='big')this.burst(root.querySelector('.award-world'),tier==='mega'?'big':'normal');}
 clear(){for(const a of this.animations)a.cancel();this.animations.clear();for(const g of this.groups)g.remove();this.groups.clear();}
}
export function wealthGlints(context='cabinet'){
 const points=context==='cabinet'?[[15,29],[88,25],[11,48],[87,63],[51,81]]:[[20,26],[78,24],[17,76],[84,69],[45,21],[60,84]];
 return `<div class="wealth-glints ${context}-glints" aria-hidden="true">${context==='award'?'<img class="wealth-dust" src="assets/art/fx-dust.webp" alt="">':''}${points.map(([x,y],i)=>`<img src="assets/art/fx-glint.webp" alt="" style="left:${x}%;top:${y}%;--phase:${-i*1.7}s;--cycle:${7+i*.7}s">`).join('')}</div>`;
}
