import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sceneLayout} from '../src/scene-layout.mjs';
const scene={width:3072,height:2560,cabinet:[0,256,1024,1536]};
for(const [width,height,landscape] of [[320,568,false],[390,844,false],[430,932,false],[490,800,false],[660,390,true],[844,390,true],[1024,480,true]]){
 test(`Continuous scene/cabinet transform ${width}×${height}`,()=>{
  const layout=sceneLayout({width,height,landscape,top:64,bottom:height-116},scene),{stage,scale}=layout;
  assert.ok(Math.abs(stage.width/stage.height-2/3)<1e-9,'Never stretch cabinet');
  assert.ok(Math.abs(stage.left-(layout.left+scene.cabinet[0]*scale))<1e-9);
  assert.ok(Math.abs(stage.top-(layout.top+scene.cabinet[1]*scale))<1e-9);
  assert.ok(stage.left>=-.01&&stage.left+stage.width<=width+.01,'No clipped outer rims');
  if(landscape)assert.ok(layout.left<=.01&&layout.left+layout.width>=width-.01,'One panorama covers full landscape width');
  assert.ok(layout.top<=.01&&layout.top+layout.height>=height-.01,'Outpaint covers viewport without a second backdrop');
  assert.ok(stage.top+1152*scale<=(landscape?height:height-108),'Deck remains above footer');
 });
}
