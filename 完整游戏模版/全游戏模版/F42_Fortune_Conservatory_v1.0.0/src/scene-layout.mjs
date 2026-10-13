/** One camera transform for room, cabinet, guardian, reels and engraved deck.
 * The original 1024×1536 artwork occupies [0,256,1024,1536] in its 3072×2560 outpaint.
 * Never size the background independently or stretch the cabinet's aspect. */
export function sceneLayout({width,height,top=64,bottom=height-100,landscape=false,deckBottom=1152},scene={width:3072,height:2560,cabinet:[0,256,1024,1536]}) {
 const [x,y,w,h]=scene.cabinet;
 let scale,stageTop;
 if(landscape){
  scale=Math.max(width/scene.width,Math.min(width*.55/w,(height-18)/deckBottom));
  stageTop=6;
 }else{
  scale=Math.min(width/w,Math.max(1,bottom-top)/deckBottom);
  const spare=bottom-top-deckBottom*scale;
  stageTop=Math.min(top+Math.max(0,Math.min(20,spare/8)),y*scale);
 }
 const stageLeft=landscape?0:(width-w*scale)/2;
 return {scale,left:stageLeft-x*scale,top:stageTop-y*scale,width:scene.width*scale,height:scene.height*scale,stage:{left:stageLeft,top:stageTop,width:w*scale,height:h*scale}};
}
