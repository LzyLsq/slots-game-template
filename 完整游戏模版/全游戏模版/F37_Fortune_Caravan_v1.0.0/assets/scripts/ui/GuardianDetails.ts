import type {GameId} from '../math/types';
/** Measured on the original cutouts: u right, v down, diameter in source-width units.
 * Reflections belong to metal/jewels, never to eyes, faces or floating rectangles. */
export interface GuardianJewel {atlas:number;u:number;v:number;diameter:number;phase:number;}
export const GUARDIAN_JEWELS:readonly (readonly GuardianJewel[])[]=[
 [
  {atlas:3,u:.581,v:.102,diameter:.059,phase:.2}, // turban ruby
  {atlas:0,u:.589,v:.442,diameter:.048,phase:2.0}, // pendant
  {atlas:3,u:.599,v:.543,diameter:.062,phase:4.1}, // turquoise sash clasp
 ],
 [
  {atlas:3,u:.466,v:.082,diameter:.066,phase:1.1}, // crown sapphire
  {atlas:0,u:.584,v:.596,diameter:.065,phase:3.5}, // belt sapphire
  {atlas:3,u:.847,v:.424,diameter:.092,phase:5.4}, // held ingot, not trunk
 ],
 [
  {atlas:3,u:.485,v:.076,diameter:.053,phase:1.8}, // crest ruby
  {atlas:0,u:.649,v:.393,diameter:.053,phase:4.0}, // necklace ruby
  {atlas:3,u:.863,v:.463,diameter:.063,phase:5.8}, // treasure-box lock
 ],
 [
  {atlas:3,u:.635,v:.079,diameter:.075,phase:2.5}, // compass hat badge
  {atlas:0,u:.617,v:.433,diameter:.049,phase:4.5}, // chest buckle
  {atlas:3,u:.866,v:.374,diameter:.068,phase:6.3}, // held compass upper rim
 ],
];

/** Actual PNG dimensions, including the eight-pixel transparent gutter.
 * A shared portrait box must not make an elephant slender or a peacock wide. */
export const GUARDIAN_SOURCE:Record<GameId,readonly [number,number]>={
 'caravan-gold':[436,614],'sapphire-oasis':[508,602],
 'ruby-bazaar':[431,620],'crown-voyage':[507,612],
};
export function fitGuardianSeat(id:GameId,seatWidth:number,seatHeight:number):{width:number;height:number;offsetY:number}{
 const [sw,sh]=GUARDIAN_SOURCE[id],scale=Math.min(seatWidth/sw,seatHeight/sh);
 const width=sw*scale,height=sh*scale;
 // Keep the original ledge/floor contact. Never recenter the smaller figure vertically.
 return {width,height,offsetY:(height-seatHeight)/2};
}
export interface GuardianRigidDetail {
 readonly joint:0|2;readonly area:readonly [number,number,number,number];readonly soft:number;
}
/** Measured face/held-treasure cores on the original cutouts. Outside the soft
 * boundaries, sleeves, necks, ears and free hands keep their authored skinning.
 * Inside, both eyes and treasure engraving share one affine transform. */
export const GUARDIAN_RIGID_DETAILS:readonly (readonly GuardianRigidDetail[])[]=[
 [{joint:0,area:[.40,.17,.69,.29],soft:.025},{joint:2,area:[.74,.37,.98,.61],soft:.035}],
 [{joint:0,area:[.34,.16,.62,.26],soft:.022},{joint:2,area:[.72,.38,.99,.50],soft:.026}],
 [{joint:0,area:[.38,.13,.65,.25],soft:.025},{joint:2,area:[.72,.38,.96,.54],soft:.028}],
 [{joint:0,area:[.43,.15,.69,.31],soft:.027},{joint:2,area:[.76,.35,.98,.52],soft:.029}],
];
