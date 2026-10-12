import {CABINET_ROOM_WIDTH as W,CABINET_ROOM_HEIGHT as H,type Box} from './CabinetGeometry';

export interface SceneTile {
  name:string;source:Box;destination:Box;flipX:boolean;flipY:boolean;
}
export interface SceneTransform {scale:number;y:number;}
// Only the outer architectural scenery/floor may extend. Never sample a
// second reel glass, console, register or guardian into the phone margins.
export const SCENE_SIDE_SAMPLE=128,SCENE_FLOOR_SAMPLE=240;
/** The visible viewport expressed in the SAME source coordinates as the
 * cabinet. Interior art is always 1:1; only uncovered scenery is added. */
export function cabinetSceneTiles(width:number,height:number,transform:SceneTransform):readonly SceneTile[]{
  const {scale,y}=transform;
  if(!(scale>0&&width>0&&height>0)||![width,height,scale,y].every(Number.isFinite))throw new Error('Invalid cabinet scene viewport');
  const left=Math.max(0,width/(2*scale)-W/2),right=left;
  const top=Math.max(0,(height/2-y)/scale-H/2);
  const bottom=Math.max(0,(height/2+y)/scale-H/2);
  const xs=[
    {name:'left',source:0,size:Math.min(left,SCENE_SIDE_SAMPLE),dest:-left,extent:left,flip:true},
    {name:'centre',source:0,size:W,dest:0,extent:W,flip:false},
    {name:'right',source:W-Math.min(right,SCENE_SIDE_SAMPLE),size:Math.min(right,SCENE_SIDE_SAMPLE),dest:W,extent:right,flip:true},
  ];
  const ys=[
    {name:'top',source:0,size:Math.min(top,SCENE_FLOOR_SAMPLE),dest:-top,extent:top,flip:true},
    {name:'centre',source:0,size:H,dest:0,extent:H,flip:false},
    {name:'bottom',source:H-Math.min(bottom,SCENE_FLOOR_SAMPLE),size:Math.min(bottom,SCENE_FLOOR_SAMPLE),dest:H,extent:bottom,flip:true},
  ];
  const tiles:SceneTile[]=[];
  for(const x of xs)for(const row of ys){
    if(x.name==='centre'&&row.name==='centre'||x.extent<.01||row.extent<.01)continue;
    tiles.push({name:`${row.name}-${x.name}`,source:[x.source,row.source,x.size,row.size],
      destination:[x.dest,row.dest,x.extent,row.extent],flipX:x.flip,flipY:row.flip});
  }
  return tiles;
}
