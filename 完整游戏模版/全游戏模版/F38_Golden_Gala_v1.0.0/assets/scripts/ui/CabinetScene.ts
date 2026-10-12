import {CABINET_ROOM_WIDTH as W,CABINET_ROOM_HEIGHT as H,type Box} from './CabinetGeometry';

export interface SceneTile {
  name:string;texture:'room'|'scenery';source:Box;destination:Box;flipX:boolean;flipY:boolean;
}
export interface SceneTransform {scale:number;y:number;}
// The outpainted sides have 1024 world pixels each, packed at half resolution.
// Crops retain the camera's uniform scale; narrow edge pixels are NEVER stretched.
export const SCENE_SIDE_SAMPLE=1024,SCENE_FLOOR_SAMPLE=240;
export const SCENERY_TEXTURE_WIDTH=1024,SCENERY_TEXTURE_HEIGHT=1152;
interface Segment {distance:number;source:number;size:number;flip:boolean;}
function mirroredBands(extent:number,band:number):Segment[]{
  const segments:Segment[]=[];
  for(let distance=0,i=0;distance<extent-.001;i++){
    const size=Math.min(band,extent-distance),flip=i%2===1;
    segments.push({distance,source:flip?band-size:0,size,flip});distance+=size;
  }
  return segments;
}
/** Perimeter crops in the SAME camera coordinates as the authored cabinet.
 * The centre stays pixel-identical; sides contain only new architecture and
 * treasure. Outside even the wide scene, reflection repeats scenery, never
 * a cabinet, register or guardian. Every crop has uniform—not strip—scaling. */
export function cabinetSceneTiles(width:number,height:number,transform:SceneTransform):readonly SceneTile[]{
  const {scale,y}=transform;
  if(!(scale>0&&width>0&&height>0)||![width,height,scale,y].every(Number.isFinite))throw new Error('Invalid cabinet scene viewport');
  const side=Math.max(0,width/(2*scale)-W/2);
  const top=Math.max(0,(height/2-y)/scale-H/2);
  const bottom=Math.max(0,(height/2+y)/scale-H/2);
  const xs=[
    ...mirroredBands(side,SCENE_SIDE_SAMPLE).map((b,i)=>({name:`left-${i}`,texture:'scenery' as const,source:(SCENE_SIDE_SAMPLE-b.source-b.size)/2,size:b.size/2,dest:-b.distance-b.size,extent:b.size,flip:b.flip})),
    {name:'centre',texture:'room' as const,source:0,size:W,dest:0,extent:W,flip:false},
    ...mirroredBands(side,SCENE_SIDE_SAMPLE).map((b,i)=>({name:`right-${i}`,texture:'scenery' as const,source:(SCENE_SIDE_SAMPLE+b.source)/2,size:b.size/2,dest:W+b.distance,extent:b.size,flip:b.flip})),
  ];
  const ys=[
    ...mirroredBands(top,SCENE_FLOOR_SAMPLE).map((b,i)=>({name:`top-${i}`,source:b.source,size:b.size,dest:-b.distance-b.size,extent:b.size,flip:!b.flip})),
    {name:'centre',source:0,size:H,dest:0,extent:H,flip:false},
    ...mirroredBands(bottom,SCENE_FLOOR_SAMPLE).map((b,i)=>({name:`bottom-${i}`,source:H-b.source-b.size,size:b.size,dest:H+b.distance,extent:b.size,flip:!b.flip})),
  ];
  const tiles:SceneTile[]=[];
  for(const x of xs)for(const row of ys){
    if(x.name==='centre'&&row.name==='centre')continue;
    const ratio=x.texture==='scenery'?.5:1;
    tiles.push({name:`${row.name}-${x.name}`,texture:x.texture,source:[x.source,row.source*ratio,x.size,row.size*ratio],
      destination:[x.dest,row.dest,x.extent,row.extent],flipX:x.flip,flipY:row.flip});
  }
  return tiles;
}
