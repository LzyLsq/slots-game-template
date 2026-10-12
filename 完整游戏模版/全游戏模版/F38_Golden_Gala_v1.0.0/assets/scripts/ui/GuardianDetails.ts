import type {GameId} from '../math/types';
/** Restored 40 native-alpha rows above the original bull cutout. Map authored
 * contacts instead of stretching the taller silhouette or moving its feet. */
export const VAULT_CUTOUT={top:40,previousHeight:623,height:663} as const;
export function guardianCutoutV(id:GameId,v:number):number{
 return id==='vault-reserve'?(VAULT_CUTOUT.top+VAULT_CUTOUT.previousHeight*v)/VAULT_CUTOUT.height:v;
}
export function guardianCutoutArea(id:GameId,area:readonly [number,number,number,number]):readonly [number,number,number,number]{
 return [area[0],guardianCutoutV(id,area[1]),area[2],guardianCutoutV(id,area[3])];
}
export function guardianCutoutSoftY(id:GameId,soft:number):number{
 return id==='vault-reserve'?soft*VAULT_CUTOUT.previousHeight/VAULT_CUTOUT.height:soft;
}
/** Measured on the original cutouts: u right, v down, diameter in source-width units.
 * Reflections belong to metal/jewels, never to eyes, faces or floating rectangles. */
export interface GuardianJewel {atlas:number;u:number;v:number;diameter:number;phase:number;}
export const GUARDIAN_JEWELS:readonly (readonly GuardianJewel[])[]=[
 [{atlas:3,u:.558,v:.481,diameter:.054,phase:.2},{atlas:0,u:.39,v:.455,diameter:.032,phase:2},{atlas:3,u:.83,v:.475,diameter:.061,phase:4.1}],
 [{atlas:3,u:.48,v:.06,diameter:.041,phase:1.1},{atlas:0,u:.402,v:.445,diameter:.054,phase:3.5},{atlas:3,u:.813,v:.088,diameter:.057,phase:5.4}],
 [{atlas:3,u:.461,v:.073,diameter:.043,phase:1.8},{atlas:0,u:.514,v:.425,diameter:.040,phase:4},{atlas:3,u:.79,v:.448,diameter:.047,phase:5.8}],
 [{atlas:3,u:.526,v:.063,diameter:.054,phase:2.5},{atlas:0,u:.578,v:.535,diameter:.058,phase:4.5},{atlas:3,u:.83,v:.269,diameter:.055,phase:6.3}].map(j=>({...j,v:guardianCutoutV('vault-reserve',j.v)})),
];

/** Actual PNG dimensions, including the ten-pixel transparent gutter.
 * A shared portrait box must not make an elephant slender or a fox wide. */
export const GUARDIAN_SOURCE:Record<GameId,readonly [number,number]>={
 'crown-club':[463,580],'emerald-fortune':[542,579],
 'ruby-royale':[721,1040],'vault-reserve':[477,663],
};
export function fitGuardianSeat(id:GameId,seatWidth:number,seatHeight:number):{width:number;height:number;offsetY:number}{
 const [sw,sh]=GUARDIAN_SOURCE[id],scale=Math.min(seatWidth/sw,seatHeight/sh);
 const width=sw*scale,height=sh*scale;
 // Keep the original ledge/floor contact. Never recenter the smaller figure vertically.
 return {width,height,offsetY:(height-seatHeight)/2};
}
export interface GuardianRigidDetail {
 readonly joint:0|2|4|6;readonly area:readonly [number,number,number,number];readonly soft:number;readonly softY?:number;
}
/** Measured face/held-treasure cores on the original cutouts. Outside the soft
 * boundaries, sleeves, necks, ears and free hands keep their authored skinning.
 * Inside, eyes, carried engravings and the inviting palm/hoof share their own affine transforms.
 * The elephant coin belongs to the trunk tip, never a disconnected stationary patch. */
export const GUARDIAN_RIGID_DETAILS:readonly (readonly GuardianRigidDetail[])[]=[
 [{joint:0,area:[.38,.12,.66,.29],soft:.025},{joint:2,area:[.735,.406,.973,.56],soft:.025},{joint:6,area:[.12,.185,.267,.278],soft:.015}],
 [{joint:0,area:[.33,.13,.68,.29],soft:.045},{joint:6,area:[.75,.025,.925,.17],soft:.035}],
 [{joint:0,area:[.29,.123,.585,.258],soft:.03},{joint:2,area:[.615,.30,1.02,.505],soft:.032},{joint:6,area:[.105,.25,.252,.325],soft:.019}],
 ([{joint:0,area:[.395,.135,.645,.30],soft:.045},{joint:2,area:[.77,.213,.975,.548],soft:.025},{joint:6,area:[.12,.085,.245,.19],soft:.025}] as const).map(d=>({...d,area:guardianCutoutArea('vault-reserve',d.area),softY:guardianCutoutSoftY('vault-reserve',d.soft)})),
];
