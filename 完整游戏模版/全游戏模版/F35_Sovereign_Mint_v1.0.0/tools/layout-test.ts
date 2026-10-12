import assert from 'node:assert/strict';
import { screenLayout } from '../assets/scripts/ui/ScreenLayoutPolicy';
import { CABINETS, CABINET_BUTTON_SEATS, cabinetLayout, guardianMotionBounds, CABINET_SAFE_TOP, CABINET_SAFE_BOTTOM, CABINET_SAFE_SIDE, imagePoint, reelAperture, responsiveCabinet, cabinetRoomStrips, registerContent } from '../assets/scripts/ui/CabinetGeometry';
import { GAME_CONFIGS } from '../assets/scripts/math/GameConfigs';
import { SYMBOL_CROPS } from '../assets/scripts/ui/SymbolCrop';

let checked=0;
for(const [width,height] of [[320,480],[320,568],[360,640],[375,667],[375,812],[390,844],[430,932],[412,915],[768,1024],[820,1180],[1024,1366]]){
  const factor=Math.min(width/1080,height/1920),w=width/factor,h=height/factor;
  const notchTop=height<640?20:47,notchBottom=height<640?20:34;
  for(const insets of [[0,0,0,0],[notchTop/factor,notchBottom/factor,0,0],[20/factor,20/factor,8/factor,16/factor]]){
    const [safeTop,safeBottom,safeLeft,safeRight]=insets;
    for(const cfg of GAME_CONFIGS){
      const geometry=responsiveCabinet(cfg.id,w,h,safeTop,safeBottom,safeLeft,safeRight),layout=cabinetLayout(w,h,geometry,safeTop,safeBottom,safeLeft,safeRight);
      const original=CABINETS[cfg.id],originalLayout=cabinetLayout(w,h,original,safeTop,safeBottom,safeLeft,safeRight);
      assert(geometry.screen[3]*layout.scale>original.screen[3]*originalLayout.scale*1.20,`${cfg.id}: glass height did not materially increase on ${width}×${height}`);
      assert(geometry.screen[2]*layout.scale>=original.screen[2]*originalLayout.scale*.90-1e-6,`${cfg.id}: enlarged glass made the cabinet too narrow`);
      assert.equal(geometry.guardian,original.guardian,'guardian proportions and planted seat remain authored');
      assert.deepEqual(geometry.title,original.title,'no title/carving stretch');
      for(const key of ['balance','win','spin','minus','plus','auto','bet','topWin','status'] as const){
        assert.equal(geometry[key][1],original[key][1]+geometry.screenExtension,'control remains aligned with moved console artwork');
        assert.equal(geometry[key][2],original[key][2]);assert.equal(geometry[key][3],original[key][3]);
      }
      const strips=cabinetRoomStrips(original,geometry.screenExtension);
      for(const [i,strip] of strips.entries()){
        assert(strip.sourceHeight>0&&strip.destHeight>=strip.sourceHeight);
        if(i>0){assert.equal(strip.sourceY,strips[i-1].sourceY+strips[i-1].sourceHeight);assert.equal(strip.destY,strips[i-1].destY+strips[i-1].destHeight);}
        if(i!==1&&i!==3)assert.equal(strip.sourceHeight,strip.destHeight,'original relief and console cannot be stretched');
      }
      assert.equal(strips.at(-1)!.destY+strips.at(-1)!.destHeight,2304+geometry.screenExtension);
      // A full-viewport room is drawn behind the cabinet; the cabinet plane
      // preserves its artwork proportions and may be narrower than the viewport.
      assert(layout.scale>0&&Number.isFinite(layout.y),`${cfg.id}: invalid cabinet transform`);
      if(width<=430)assert(geometry.screen[2]*layout.scale>=w*.60,`${cfg.id}: reel glass too small on ${width}px phone`);
      for(const key of ['title','balance','screen','win','spin','minus','plus','auto','bet','topWin','status'] as const){
        const rect=geometry[key],[x,y]=imagePoint(rect);
        assert(x*layout.scale-rect[2]*layout.scale/2>=-w/2+safeLeft,`${cfg.id} ${key}: left clipping`);
        assert(x*layout.scale+rect[2]*layout.scale/2<=w/2-safeRight,`${cfg.id} ${key}: right clipping`);
        assert(y*layout.scale+layout.y+rect[3]*layout.scale/2<=h/2-safeTop-CABINET_SAFE_TOP+1e-7,`${cfg.id} ${key}: overlaps toolbar`);
        assert(y*layout.scale+layout.y-rect[3]*layout.scale/2>=-h/2+safeBottom+CABINET_SAFE_BOTTOM-1e-7,`${cfg.id} ${key}: overlaps footer`);
      }
      for(const key of ['balance','bet','win'] as const){
        const glass=geometry[key],content=registerContent(glass);
        for(const line of Object.values(content)){
          assert(line[0]>=glass[0]+3&&line[1]>=glass[1]+3,`${cfg.id} ${key}: label crosses upper/left glass edge`);
          assert(line[0]+line[2]<=glass[0]+glass[2]-3+1e-7&&line[1]+line[3]<=glass[1]+glass[3]-3+1e-7,`${cfg.id} ${key}: digits cross lower/right glass edge`);
        }
        assert(content.caption[1]+content.caption[3]<content.value[1],`${cfg.id} ${key}: heading overlaps amount`);
      }
      const controls=['spin','plus','minus','auto'] as const;
      for(const [i,key] of controls.entries()){
        const [x,y]=imagePoint(geometry[key]),[dx,dy]=CABINET_BUTTON_SEATS[cfg.id][i];
        const hitW=Math.max(108,geometry[key][2]),hitH=Math.max(110,geometry[key][3]);
        assert((x+dx-hitW/2)*layout.scale>=-w/2+safeLeft&&
          (x+dx+hitW/2)*layout.scale<=w/2-safeRight,`${cfg.id} ${key}: seated control clipped horizontally`);
        assert((y+dy-hitH/2)*layout.scale+layout.y>=-h/2+safeBottom+188&&
          (y+dy+hitH/2)*layout.scale+layout.y<=h/2-safeTop-141,`${cfg.id} ${key}: seated control clipped vertically`);
      }
      // The runtime consumes this exact transform; no untested fixed offset.
      const envelope=guardianMotionBounds(geometry.guardian),[gx,gy]=imagePoint(envelope);
      const epsilon=1e-6;
      assert((gx-envelope[2]/2)*layout.scale>=-w/2+safeLeft+CABINET_SAFE_SIDE-epsilon,`${cfg.id}: guardian left sweep clipped`);
      assert((gx+envelope[2]/2)*layout.scale<=w/2-safeRight-CABINET_SAFE_SIDE+epsilon,`${cfg.id}: guardian right sweep clipped`);
      assert((gy+envelope[3]/2)*layout.scale+layout.y<=h/2-safeTop-CABINET_SAFE_TOP+epsilon,`${cfg.id}: guardian behind toolbar`);
      assert((gy-envelope[3]/2)*layout.scale+layout.y>=-h/2+safeBottom+CABINET_SAFE_BOTTOM-epsilon,`${cfg.id}: guardian behind footer`);
      const aperture=reelAperture(geometry,cfg.id);
      assert(aperture[0]>geometry.screen[0]&&aperture[1]>geometry.screen[1],`${cfg.id}: reel crosses top/left bevel`);
      assert(aperture[0]+aperture[2]<geometry.screen[0]+geometry.screen[2],`${cfg.id}: reel crosses right bevel`);
      assert(aperture[1]+aperture[3]<=geometry.screen[1]+geometry.screen[3]-16,`${cfg.id}: reel touches lower bevel`);
      // Each sprite, its elastic punch and its float stay within one cell.
      const cellW=aperture[2]/cfg.columns,cellH=aperture[3]/cfg.rows;
      const size=Math.min(cellW,cellH)*.91;
      const originalAperture=reelAperture(original),oldSize=Math.min(originalAperture[2]/cfg.columns,originalAperture[3]/cfg.rows)*.91;
      assert(size*layout.scale>oldSize*originalLayout.scale*1.20,`${cfg.id}: symbols still too small`);
      if(width===390&&height===844&&cfg.id==='ruby-revel')assert(size*layout.scale*factor>=37,'five-row Ruby symbols need readable physical pixels');
      const silhouette=size*(208/256),turn=6*Math.PI/180;
      const animatedBounds=silhouette*1.09*(Math.cos(turn)+Math.sin(turn));
      assert(animatedBounds+cellW*.035*2<cellW,`${cfg.id}: animated coin crosses column`);
      assert(animatedBounds+Math.max(cellH*.038,Math.min(5,cellH*.027))*2<cellH,`${cfg.id}: animated coin crosses row`);
      checked++;
    }
  }
}
for(const [atlas,cells] of Object.entries(SYMBOL_CROPS)){
  assert.equal(cells.length,16,`${atlas}: missing cropped symbols`);
  for(const [index,[x,y,w,h]] of cells.entries()){
    assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=256&&y+h<=256,`${atlas} cell ${index}: crop crosses atlas cell`);
  }
}
console.log(`PASS ${checked} cabinet/viewport combinations: safe insets, full guardian animation sweep, toolbar/footer clearance, reels and controls.`);

// Desktop letterboxing must not alter phone orientation or portrait safe-area geometry.
for(const [w,h] of [[1280,720],[1920,1080],[844,390]]){
  assert.deepEqual(screenLayout(w,h,true),{policy:'show-all',rotate:false});
  assert.deepEqual(screenLayout(w,h,false),{policy:'fixed-height',rotate:true});
}
for(const [w,h] of [[320,568],[390,844],[768,1024]]){
  assert.deepEqual(screenLayout(w,h,true),screenLayout(w,h,false),'portrait layout is device-independent');
  assert.equal(screenLayout(w,h,false).rotate,false);
}
console.log('PASS desktop portrait framing; phone landscape guard and portrait geometry unchanged.');
