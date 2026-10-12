/** The four direct-entry displays and their physical content seats.
 * Shared by the renderer and compact-device checks (no phantom carousel). */
export const GALA_LOBBY={
 height:1680,
 brand:{x:0,y:748,width:795,height:180},
 columns:[-249,249] as const,rows:[470,-220] as const,
 title:{x:0,y:-120,width:454,height:120},
 facts:{x:0,y:-242,width:445,height:104},
 play:{x:0,y:-390,width:440,height:180},
 guardian:{x:-65,y:37,width:262,height:306},
 collection:{x:0,y:-778,width:955,height:122},
} as const;
export function galaStageScale(width:number,height:number,top=0,bottom=0):number{
 return Math.min(1,(height-520-top-bottom)/GALA_LOBBY.height,(width-60)/1020);
}
