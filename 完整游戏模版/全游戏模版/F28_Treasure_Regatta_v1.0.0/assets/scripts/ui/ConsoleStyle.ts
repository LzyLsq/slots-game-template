import type { ModeId } from '../core/Model';
import type { ControlFace } from './Surface';

export const CONSOLE_ROLES = ['spin', 'bet', 'auto', 'turbo', 'back', 'menu', 'rules', 'max'] as const;
export type ConsoleRole = typeof CONSOLE_ROLES[number];
const MATERIAL: Record<ModeId, NonNullable<ControlFace['touchMaterial']>> = {
  captain: 'brass', pearl: 'nacre', cargo: 'jade', reef: 'water',
};

type FaceProfile = Pick<ControlFace, 'feel' | 'sliced' | 'contain' | 'labelX' | 'labelY' | 'labelWidth' | 'fontSize' | 'hitHeight' | 'lightLabel'>;

/** Role-specific hardware geometry. Values are normalized in consoleFace. */
const PROFILES: Record<ModeId, Record<ConsoleRole, Omit<FaceProfile, 'labelX' | 'labelY' | 'labelWidth' | 'hitHeight'> & {
  labelX: number; labelY: number; labelWidth: number; hitHeight: number;
}>> = {
  captain: {
    spin: { feel:'helm', sliced:true, contain:false, labelX:.18, labelY:-.01, labelWidth:.52, fontSize:43, hitHeight:1 },
    bet: { feel:'step', sliced:false, contain:true, labelX:0, labelY:0, labelWidth:.50, fontSize:50, hitHeight:1 },
    auto: { feel:'winder', sliced:true, contain:false, labelX:.23, labelY:-.01, labelWidth:.44, fontSize:38, hitHeight:1 },
    turbo: { feel:'rocker', sliced:true, contain:false, labelX:.23, labelY:-.14, labelWidth:.52, fontSize:29, hitHeight:1 },
    back: { feel:'press', sliced:true, contain:false, labelX:.19, labelY:-.01, labelWidth:.50, fontSize:38, hitHeight:1 },
    menu: { feel:'press', sliced:true, contain:false, labelX:.19, labelY:-.01, labelWidth:.50, fontSize:38, hitHeight:1 },
    // The bottom plaques are optically centred by their nine-slice frame. Keep
    // the captions in that shared centre rather than inheriting the offset used
    // by the asymmetric back/menu controls.
    rules: { feel:'press', sliced:true, contain:false, labelX:0, labelY:0, labelWidth:.68, fontSize:39, hitHeight:1 },
    max: { feel:'press', sliced:true, contain:false, labelX:0, labelY:0, labelWidth:.68, fontSize:39, hitHeight:1 },
  },
  pearl: {
    spin: { feel:'helm', sliced:false, contain:true, labelX:0, labelY:-.02, labelWidth:.62, fontSize:38, hitHeight:1 },
    bet: { feel:'step', sliced:false, contain:true, labelX:0, labelY:0, labelWidth:.56, fontSize:48, hitHeight:1 },
    auto: { feel:'winder', sliced:false, contain:true, labelX:0, labelY:-.02, labelWidth:.62, fontSize:35, hitHeight:1 },
    turbo: { feel:'rocker', sliced:false, contain:true, labelX:0, labelY:-.25, labelWidth:.68, fontSize:27, hitHeight:1 },
    back: { feel:'press', sliced:false, contain:true, labelX:0, labelY:-.02, labelWidth:.58, fontSize:30, hitHeight:1 },
    menu: { feel:'press', sliced:false, contain:true, labelX:0, labelY:-.02, labelWidth:.58, fontSize:30, hitHeight:1 },
    rules: { feel:'press', sliced:true, contain:false, labelX:0, labelY:0, labelWidth:.78, fontSize:38, hitHeight:1 },
    max: { feel:'press', sliced:true, contain:false, labelX:0, labelY:0, labelWidth:.78, fontSize:38, hitHeight:1 },
  },
  cargo: {
    spin: { feel:'helm', sliced:false, contain:true, labelX:0, labelY:-.01, labelWidth:.58, fontSize:38, hitHeight:1 },
    bet: { feel:'step', sliced:false, contain:true, labelX:0, labelY:0, labelWidth:.52, fontSize:48, hitHeight:1 },
    auto: { feel:'winder', sliced:false, contain:true, labelX:.13, labelY:0, labelWidth:.50, fontSize:31, hitHeight:1, lightLabel:true },
    // The caption belongs on the lever's circular jade/brass boss, not on the
    // timber below the control artwork.
    turbo: { feel:'rocker', sliced:false, contain:true, labelX:.03, labelY:-.08, labelWidth:.72, fontSize:25, hitHeight:1, lightLabel:true },
    back: { feel:'press', sliced:false, contain:true, labelX:0, labelY:-.01, labelWidth:.58, fontSize:30, hitHeight:1 },
    menu: { feel:'press', sliced:false, contain:true, labelX:0, labelY:-.01, labelWidth:.58, fontSize:30, hitHeight:1 },
    // Cargo's source artwork has a latch on the left and a matching endcap on
    // the right. The label belongs in the flat centre of the whole plaque; the
    // old positive X offset pushed “Rules” into the right-hand half.
    rules: { feel:'press', sliced:true, contain:false, labelX:0, labelY:0, labelWidth:.72, fontSize:37, hitHeight:1 },
    max: { feel:'press', sliced:true, contain:false, labelX:0, labelY:0, labelWidth:.80, fontSize:38, hitHeight:1 },
  },
  reef: {
    spin: { feel:'helm', sliced:false, contain:true, labelX:0, labelY:-.02, labelWidth:.60, fontSize:38, hitHeight:1 },
    bet: { feel:'step', sliced:false, contain:true, labelX:0, labelY:0, labelWidth:.54, fontSize:48, hitHeight:1 },
    // Keep both captions on the turquoise enamel/water inserts. The original
    // low offsets placed the lettering on the coral and timber beneath them.
    auto: { feel:'winder', sliced:false, contain:true, labelX:.11, labelY:.04, labelWidth:.50, fontSize:32, hitHeight:1, lightLabel:true },
    turbo: { feel:'rocker', sliced:false, contain:true, labelX:0, labelY:-.09, labelWidth:.72, fontSize:26, hitHeight:1, lightLabel:true },
    back: { feel:'press', sliced:false, contain:true, labelX:0, labelY:-.01, labelWidth:.58, fontSize:30, hitHeight:1 },
    menu: { feel:'press', sliced:false, contain:true, labelX:0, labelY:-.01, labelWidth:.58, fontSize:30, hitHeight:1 },
    rules: { feel:'press', sliced:true, contain:false, labelX:0, labelY:0, labelWidth:.78, fontSize:38, hitHeight:1 },
    max: { feel:'press', sliced:true, contain:false, labelX:0, labelY:0, labelWidth:.78, fontSize:38, hitHeight:1 },
  },
};

/** Same readable actions, genuinely different hardware and material responses. */
export function consoleFace(mode: ModeId, role: ConsoleRole, width: number, height: number): ControlFace {
  const profile = PROFILES[mode][role];
  return {
    touchMaterial: MATERIAL[mode],
    ...profile,
    labelX: width * profile.labelX,
    labelY: height * profile.labelY,
    labelWidth: width * profile.labelWidth,
    // Preserve a generous target without overlapping the central SPIN target.
    hitHeight: Math.max(role === 'back' || role === 'menu' ? 112 : 96, height * profile.hitHeight),
  };
}
