/** Original F38 motifs: each guardian has its own meter, harmony and orchestration. */
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
 lobby:{id:'lobby',bpm:100,eighthsPerBar:8,lead:'felt',backing:'harp',
 melody:[67,0,69,71,0,74,0,0, 72,0,71,69,0,67,0,0, 64,0,67,69,0,71,74,0, 69,0,67,0,66,0,0,0,
 71,0,74,0,76,74,0,71, 72,0,69,0,67,0,0,0, 69,0,71,74,0,71,69,0, 66,0,69,0,67,0,0,0],
 chords:[[43,50,55,59],[48,55,60,64],[45,52,57,60],[50,57,62,66]],award:[67,69,71,74,76,79,76,74],finale:[43,50,55,59,62,67],percussion:'brush'},
 'crown-club':{id:'crown-club',bpm:104,eighthsPerBar:8,lead:'brass',backing:'felt',
 melody:[63,0,67,70,0,67,0,0, 65,0,68,72,0,70,0,0, 67,0,70,75,0,72,70,0, 65,0,68,70,0,0,0,0,
 70,0,72,75,0,70,67,0, 68,0,72,0,70,0,0,0, 67,0,70,72,0,68,65,0, 62,0,65,0,63,0,0,0],
 chords:[[39,46,51,55],[44,51,56,60],[48,55,60,63],[46,53,58,62]],award:[63,67,70,72,75,79,77,75],finale:[39,46,51,55,58,63],percussion:'frame'},
 'emerald-fortune':{id:'emerald-fortune',bpm:96,eighthsPerBar:8,lead:'harp',backing:'strings',
 melody:[65,0,69,0,72,0,74,0, 72,0,69,65,0,62,0,0, 67,0,72,0,74,72,0,69, 65,0,69,0,67,0,0,0,
 74,0,77,0,74,72,0,69, 72,0,69,65,0,62,0,0, 67,0,69,72,0,74,0,72, 67,0,69,0,65,0,0,0],
 chords:[[41,48,53,57],[46,53,58,62],[43,50,55,58],[48,55,60,64]],award:[65,72,69,74,72,77,81,77],finale:[41,48,53,57,60,65],percussion:'wood'},
 'ruby-royale':{id:'ruby-royale',bpm:102,eighthsPerBar:6,lead:'felt',backing:'strings',
 melody:[70,0,74,0,77,0, 75,0,74,72,0,0, 69,0,72,0,77,74, 72,0,70,0,0,0,
 77,0,79,77,0,74, 75,0,79,0,77,0, 74,0,72,0,69,0, 72,0,74,0,70,0],
 chords:[[46,53,58,62],[51,58,63,67],[43,50,55,58],[41,48,53,57]],award:[70,74,77,74,79,82,79,82],finale:[46,53,58,62,65,70],percussion:'brush'},
 'vault-reserve':{id:'vault-reserve',bpm:108,eighthsPerBar:8,lead:'felt',backing:'harp',
 melody:[62,0,66,69,0,66,0,0, 67,0,71,0,69,0,66,0, 64,0,67,71,0,69,67,0, 61,0,64,0,66,0,0,0,
 69,0,74,0,73,71,0,69, 67,0,71,74,0,71,0,0, 66,0,69,71,0,67,64,0, 61,0,64,0,62,0,0,0],
 chords:[[38,45,50,54],[43,50,55,59],[40,47,52,55],[45,52,57,61]],award:[62,66,69,74,71,69,73,74],finale:[38,45,50,54,57,62],percussion:'metal'},
};
export function themeMusic(scene:string):ThemeMusic{return themes[scene]??themes.lobby;}
export const MUSIC_SCENES=['lobby','crown-club','emerald-fortune','ruby-royale','vault-reserve'] as const;
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
