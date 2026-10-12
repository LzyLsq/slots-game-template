// Shared source for the native WKWebView injection and browser regression test.
export function installMusicHostLifecycle(){
 let inactive=false;
 const hidden=Object.getOwnPropertyDescriptor(Document.prototype,'hidden')?.get;
 Object.defineProperty(document,'hidden',{configurable:true,get:()=>inactive||(hidden?hidden.call(document):false)});
 window.__musicHostLifecycle=active=>{
  const next=!active;if(next===inactive)return;inactive=next;
  document.dispatchEvent(new Event('visibilitychange'));
  if(window.cc?.game){if(active&&cc.game.isPaused())cc.game.resume();else if(!active&&!cc.game.isPaused())cc.game.pause();}
 };
}
