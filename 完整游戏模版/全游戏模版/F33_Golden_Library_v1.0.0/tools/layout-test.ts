import assert from 'node:assert/strict';
import { CABINETS, cabinetLayout, imagePoint, reelAperture } from '../assets/scripts/ui/CabinetGeometry';
import { GAME_CONFIGS } from '../assets/scripts/math/GameConfigs';
import { SYMBOL_CROPS } from '../assets/scripts/ui/SymbolCrop';

let checked=0;
for(const [width,height] of [[320,568],[360,640],[375,667],[390,844],[430,932],[412,915],[768,1024],[820,1180]]){
  const factor=Math.min(width/1080,height/1920),w=width/factor,h=height/factor;
  for(const cfg of GAME_CONFIGS){
    const geometry=CABINETS[cfg.id],layout=cabinetLayout(w,h,geometry);
    // A full-viewport room is drawn behind the cabinet; the cabinet plane
    // preserves its artwork proportions and may be narrower than the viewport.
    assert(layout.scale>0&&Number.isFinite(layout.y),`${cfg.id}: invalid cabinet transform`);
    if(width<=430)assert(geometry.screen[2]*layout.scale>=w*.60,`${cfg.id}: reel glass too small on ${width}px phone`);
    for(const key of ['title','balance','screen','win','spin','minus','plus','auto','bet','topWin'] as const){
      const rect=geometry[key],[x,y]=imagePoint(rect);
      assert(x*layout.scale-rect[2]*layout.scale/2>=-w/2,`${cfg.id} ${key}: left clipping`);
      assert(x*layout.scale+rect[2]*layout.scale/2<=w/2,`${cfg.id} ${key}: right clipping`);
      assert(y*layout.scale+layout.y+rect[3]*layout.scale/2<=h/2-169,`${cfg.id} ${key}: overlaps toolbar`);
      assert(y*layout.scale+layout.y-rect[3]*layout.scale/2>=-h/2+157,`${cfg.id} ${key}: overlaps footer`);
    }
    const aperture=reelAperture(geometry,cfg.id);
    assert(aperture[0]>geometry.screen[0]&&aperture[1]>geometry.screen[1],`${cfg.id}: reel crosses top/left bevel`);
    assert(aperture[0]+aperture[2]<geometry.screen[0]+geometry.screen[2],`${cfg.id}: reel crosses right bevel`);
    assert(aperture[1]+aperture[3]<=geometry.screen[1]+geometry.screen[3]-16,`${cfg.id}: reel touches lower bevel`);
    // Each sprite, its elastic punch and its float stay within one cell.
    const cellW=aperture[2]/cfg.columns,cellH=aperture[3]/cfg.rows;
    const size=Math.min(cellW,cellH)*.91;
    assert(size*(1+.027+.09)*.83<cellW);
    assert(size*(1+.027+.09)*.83+Math.min(5,cellH*.027)*2<cellH);
    checked++;
  }
}
for(const [atlas,cells] of Object.entries(SYMBOL_CROPS)){
  assert.equal(cells.length,16,`${atlas}: missing cropped symbols`);
  for(const [index,[x,y,w,h]] of cells.entries()){
    assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=256&&y+h<=256,`${atlas} cell ${index}: crop crosses atlas cell`);
  }
}
console.log(`PASS ${checked} cabinet/viewport combinations: enlarged glass, essential bounds, symbol crop and breathing room.`);
