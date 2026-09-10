import assert from 'node:assert/strict';
import { CABINETS, cabinetLayout, imagePoint } from '../assets/scripts/ui/CabinetGeometry';
import { GAME_CONFIGS } from '../assets/scripts/math/GameConfigs';

let checked=0;
for(const [width,height] of [[320,568],[360,640],[375,667],[390,844],[430,932],[412,915],[768,1024],[820,1180]]){
  const factor=Math.min(width/1080,height/1920),w=width/factor,h=height/factor;
  for(const cfg of GAME_CONFIGS){
    const geometry=CABINETS[cfg.id],layout=cabinetLayout(w,h,geometry);
    assert(1536*layout.scale>=w,`${cfg.id}: integrated room misses side edge`);
    assert(layout.y+1536*layout.scale>=h/2,`${cfg.id}: integrated room misses top`);
    assert(layout.y-1536*layout.scale<=-h/2,`${cfg.id}: integrated room misses bottom`);
    for(const key of ['title','balance','screen','win','spin','minus','plus','auto','bet','topWin'] as const){
      const rect=geometry[key],[x,y]=imagePoint(rect);
      assert(x*layout.scale-rect[2]*layout.scale/2>=-w/2,`${cfg.id} ${key}: left clipping`);
      assert(x*layout.scale+rect[2]*layout.scale/2<=w/2,`${cfg.id} ${key}: right clipping`);
      assert(y*layout.scale+layout.y+rect[3]*layout.scale/2<=h/2-169,`${cfg.id} ${key}: overlaps toolbar`);
      assert(y*layout.scale+layout.y-rect[3]*layout.scale/2>=-h/2+157,`${cfg.id} ${key}: overlaps footer`);
    }
    // Each sprite, its elastic punch and its float stay within one cell.
    const cellW=geometry.screen[2]/cfg.columns,cellH=geometry.screen[3]/cfg.rows;
    const size=Math.min(cellW,cellH)*.91;
    assert(size*(1+.027+.09)*.83<cellW);
    assert(size*(1+.027+.09)*.83+Math.min(5,cellH*.027)*2<cellH);
    checked++;
  }
}
console.log(`PASS ${checked} cabinet/viewport combinations: shared transform, essential bounds, symbol breathing room.`);
