const crafted={back:'/art/craft31-ui/icon-back.webp',rules:'/art/craft31-ui/icon-rules.webp',sound:'/art/craft31-ui/icon-sound.webp',history:'/art/craft31-ui/icon-history.webp'};
export function fitting(name){return `<img class="control-icon" aria-hidden="true" alt="" src="${crafted[name]||`/art/premium/${name}.webp`}">`;}
export function finishControls(root){
 for(const b of root.querySelectorAll('button')){
  if(b.querySelector('img,svg'))continue;
  const a=b.dataset.action;let name={rules:'rules',close:'close',history:'history',rename:'rename',daily:'daily','claim-mail':'daily',spin:'spin'}[a];
  if(a==='close' && b.classList.contains('primary'))name='forward';
  if(b.dataset.page==='home')name=b.classList.contains('round-btn')?'back':'home';
  if(b.type==='submit' && b.closest('form'))name='check';
  if(!name)continue;
  const mark=b.querySelector('.spin-mark,.history-mark');
  if(mark)mark.innerHTML=fitting(name);
  else if(b.classList.contains('round-btn'))b.innerHTML=fitting(name);
  else {b.insertAdjacentHTML('afterbegin',fitting(name));b.classList.add('has-fitting');}
 }
}
