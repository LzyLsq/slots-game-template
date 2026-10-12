/** Original F37 motifs: each guardian has its own meter, harmony and orchestration. */
export type Instrument='felt'|'harp'|'bell'|'brass'|'strings'|'bass'|'coin'|'wood';
export interface ThemeMusic {
 id:string;bpm:number;eighthsPerBar:number;lead:Instrument;backing:Instrument;
 melody:readonly number[];chords:readonly (readonly number[])[];award:readonly number[];
 finale:readonly number[];percussion:'metal'|'wood'|'brush'|'frame';
}
export const midi=(note:number):number=>440*2**((note-69)/12);
// Each phrase has real breaths: one lead, a soft bass and occasional answers.
// Tempos remain lively; clarity comes from composition, not slowed playback.
// Bright major/pentatonic hooks, moderate registers and breathing phrases.
// Joy comes from clear musical cadences, not faster playback or louder percussion.
const themes:Record<string,ThemeMusic>={
 lobby:{id:'lobby',bpm:104,eighthsPerBar:8,lead:'felt',backing:'harp',
  melody:[64,0,67,69,0,67,0,0, 69,0,72,0,69,0,67,0, 64,0,67,0,69,72,0,69, 67,0,69,0,67,0,0,0,
   72,0,69,67,0,64,0,0, 69,0,72,0,74,72,0,69, 67,0,69,0,72,0,67,64, 62,0,67,0,60,0,0,0],
  chords:[[48,55,60,64],[41,48,53,57],[45,52,57,60],[43,50,55,59]],award:[60,64,67,69,72,76,74,72],finale:[48,55,60,64,67,72],percussion:'brush'},
 'caravan-gold':{id:'caravan-gold',bpm:108,eighthsPerBar:8,lead:'harp',backing:'felt',
  melody:[62,0,66,69,0,71,0,69, 67,0,71,0,74,0,71,0, 66,0,69,0,71,74,0,71, 69,0,73,0,76,0,0,0,
   74,0,71,69,0,66,0,0, 71,0,74,0,76,74,0,71, 66,0,69,0,74,0,71,66, 69,0,66,0,62,0,0,0],
  chords:[[50,57,62,66],[43,50,55,59],[47,54,59,62],[45,52,57,61]],award:[62,66,69,71,74,78,76,74],finale:[50,57,62,66,69,74],percussion:'frame'},
 'sapphire-oasis':{id:'sapphire-oasis',bpm:102,eighthsPerBar:8,lead:'harp',backing:'strings',
  melody:[69,0,73,0,76,0,73,0, 71,0,76,73,0,71,0,0, 73,0,78,0,76,73,0,69, 69,0,73,0,74,0,0,0,
   76,0,73,71,0,69,0,0, 71,0,73,0,76,73,0,71, 73,0,76,0,78,0,73,69, 71,0,73,0,69,0,0,0],
  chords:[[45,52,57,61],[52,59,64,68],[54,61,66,69],[50,57,62,66]],award:[61,64,68,69,73,76,73,69],finale:[45,52,57,61,64,69],percussion:'wood'},
 'ruby-bazaar':{id:'ruby-bazaar',bpm:98,eighthsPerBar:6,lead:'felt',backing:'harp',
  melody:[67,0,71,0,74,0, 72,0,76,0,74,0, 71,0,74,76,0,71, 69,0,74,0,0,0,
   74,0,71,69,0,67, 76,0,74,72,0,0, 71,0,74,0,76,0, 69,0,71,0,67,0],
  chords:[[43,50,55,59],[48,55,60,64],[40,47,52,55],[50,57,62,66]],award:[67,71,74,76,79,76,74,79],finale:[43,50,55,59,62,67],percussion:'brush'},
 'crown-voyage':{id:'crown-voyage',bpm:106,eighthsPerBar:6,lead:'felt',backing:'strings',
  melody:[65,0,69,72,0,0, 67,0,74,72,0,0, 69,0,74,77,0,0, 67,0,72,69,0,0,
   77,0,74,72,0,0, 74,0,72,67,0,0, 69,0,72,74,0,0, 67,0,69,65,0,0],
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
