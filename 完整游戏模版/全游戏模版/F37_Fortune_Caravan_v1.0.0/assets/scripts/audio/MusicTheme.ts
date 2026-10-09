/** Original F37 motifs: each guardian has its own meter, harmony and orchestration. */
export type Instrument='felt'|'harp'|'bell'|'brass'|'strings'|'bass'|'coin'|'wood';
export interface ThemeMusic {
 id:string;bpm:number;eighthsPerBar:number;lead:Instrument;backing:Instrument;
 melody:readonly number[];chords:readonly (readonly number[])[];award:readonly number[];
 finale:readonly number[];percussion:'metal'|'wood'|'brush'|'frame';
}
export const midi=(note:number):number=>440*2**((note-69)/12);
// Newly composed, restrained merchant-festival motifs. Zero denotes a breath.
const themes:Record<string,ThemeMusic>={
 lobby:{id:'lobby',bpm:104,eighthsPerBar:8,lead:'felt',backing:'harp',
  melody:[64,67,69,0,67,64,62,60, 65,69,72,0,69,65,64,62, 64,67,72,74,72,69,67,0, 62,65,67,71,72,0,67,0,
   76,74,72,0,69,72,67,64, 77,76,72,69,65,0,69,72, 76,72,69,67,64,67,69,0, 71,69,67,65,64,62,60,0],
  chords:[[48,55,60,64],[41,48,53,57],[45,52,57,60],[43,50,55,59]],award:[60,64,67,69,72,76,74,72],finale:[48,55,60,64,67,72],percussion:'brush'},
 'caravan-gold':{id:'caravan-gold',bpm:110,eighthsPerBar:8,lead:'harp',backing:'felt',
  melody:[69,70,73,0,74,73,70,69, 67,69,70,0,73,70,69,67, 65,69,74,76,74,73,70,0, 64,67,69,70,73,0,69,0,
   77,76,74,73,70,69,70,73, 74,0,77,76,74,73,70,0, 69,70,73,74,76,74,73,70, 69,67,65,64,62,0,69,0],
  chords:[[50,57,62,65],[46,53,58,62],[43,50,55,58],[45,52,57,61]],award:[62,65,69,70,73,74,77,74],finale:[50,57,62,65,69,74],percussion:'frame'},
 'sapphire-oasis':{id:'sapphire-oasis',bpm:100,eighthsPerBar:8,lead:'harp',backing:'strings',
  melody:[66,69,73,0,76,73,69,66, 64,68,71,0,73,71,68,64, 66,69,71,73,76,73,71,0, 64,66,68,71,73,0,68,0,
   78,76,73,69,66,0,69,73, 76,73,71,68,64,0,68,71, 73,76,78,76,73,71,69,66, 68,71,73,71,68,66,64,0],
  chords:[[45,52,57,61],[52,59,64,68],[54,61,66,69],[50,57,62,66]],award:[61,64,68,69,73,76,73,69],finale:[45,52,57,61,64,69],percussion:'wood'},
 'ruby-bazaar':{id:'ruby-bazaar',bpm:96,eighthsPerBar:6,lead:'felt',backing:'harp',
  melody:[67,71,74,76,74,71, 69,72,76,79,76,72, 67,71,74,79,78,74, 66,69,74,72,69,66,
   79,76,74,71,74,76, 81,79,76,72,76,79, 78,76,74,71,67,71, 69,66,62,67,0,74],
  chords:[[43,50,55,59],[48,55,60,64],[40,47,52,55],[50,57,62,66]],award:[67,71,74,76,79,76,74,79],finale:[43,50,55,59,62,67],percussion:'brush'},
 'crown-voyage':{id:'crown-voyage',bpm:108,eighthsPerBar:6,lead:'strings',backing:'brass',
  melody:[65,69,72,77,76,72, 67,70,74,79,77,74, 69,72,77,81,79,77, 64,67,72,76,74,72,
   77,81,79,77,72,69, 79,82,81,79,74,70, 81,79,77,72,69,65, 67,72,76,74,72,65],
  chords:[[41,48,53,57],[46,53,58,62],[45,52,57,60],[48,55,60,64]],award:[65,69,72,77,79,81,77,72],finale:[41,48,53,57,60,65,72],percussion:'frame'},
};
export function themeMusic(scene:string):ThemeMusic{return themes[scene]??themes.lobby;}
export const MUSIC_SCENES=['lobby','caravan-gold','sapphire-oasis','ruby-bazaar','crown-voyage'] as const;
export interface VoiceShape{harmonics:readonly number[];attack:number;sustain:number;cutoff:number;tailCutoff:number}
/** Sparse harmonic spectra avoid the harsh raw-saw / arcade-beep palette. */
export const VOICE_SHAPES:Record<Instrument,VoiceShape>={
 felt:{harmonics:[1,.31,.14,.065,.025,.009],attack:.008,sustain:.36,cutoff:2400,tailCutoff:850},
 harp:{harmonics:[1,.34,.16,.055,.02,.009],attack:.008,sustain:.19,cutoff:2800,tailCutoff:950},
 bell:{harmonics:[1,.05,.16,.02,.065,.008,.018],attack:.012,sustain:.20,cutoff:3000,tailCutoff:1500},
 brass:{harmonics:[1,.47,.23,.12,.065,.035,.012],attack:.047,sustain:.72,cutoff:1950,tailCutoff:1200},
 strings:{harmonics:[1,.32,.20,.10,.058,.02,.012],attack:.070,sustain:.77,cutoff:2300,tailCutoff:1500},
 bass:{harmonics:[1,.18,.07,.018],attack:.018,sustain:.45,cutoff:700,tailCutoff:380},
 coin:{harmonics:[1,.06,.15,.025,.065,.01,.018],attack:.010,sustain:.12,cutoff:3000,tailCutoff:1400},
 wood:{harmonics:[1,.25,.08,.025],attack:.003,sustain:.09,cutoff:1200,tailCutoff:480},
};
