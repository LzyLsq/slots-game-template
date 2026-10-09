/** Original F35 motifs: each guardian has its own meter, harmony and orchestration. */
export type Instrument='felt'|'harp'|'bell'|'brass'|'strings'|'bass'|'coin'|'wood';
export interface ThemeMusic {
 id:string;bpm:number;eighthsPerBar:number;lead:Instrument;backing:Instrument;
 melody:readonly number[];chords:readonly (readonly number[])[];award:readonly number[];
 finale:readonly number[];percussion:'metal'|'wood'|'brush'|'frame';
}
export const midi=(note:number):number=>440*2**((note-69)/12);
const themes:Record<string,ThemeMusic>={
 lobby:{id:'lobby',bpm:116,eighthsPerBar:8,lead:'felt',backing:'brass',
  // Bright C-major casino swing: call, brass answer, and a smiling turnaround.
  melody:[67,0,64,67,72,0,69,67, 64,67,69,0,72,69,67,0, 65,69,72,0,74,72,69,65, 67,0,71,74,72,71,67,0,
   72,0,76,74,72,69,67,0, 69,72,76,0,74,72,69,0, 65,69,72,74,76,74,72,69, 67,71,74,71,72,0,67,0],
  chords:[[48,55,60,64],[45,52,57,60],[41,48,53,57],[43,50,55,59]],award:[67,64,67,72,76,72,69,67,71,74,72,76],finale:[48,55,60,64,67,72],percussion:'metal'},
 'golden-hour':{id:'golden-hour',bpm:122,eighthsPerBar:8,lead:'brass',backing:'felt',
  // D-major gold-room horn riff: offbeat stabs and a climbing jackpot response.
  melody:[69,69,0,74,0,73,69,66, 67,0,71,74,71,0,69,67, 66,69,74,0,78,76,74,69, 64,0,69,73,76,0,73,69,
   74,0,78,76,74,69,66,69, 71,74,79,0,78,74,71,67, 66,0,69,74,78,74,69,66, 64,69,73,69,74,0,69,0],
  chords:[[50,57,62,66],[43,50,55,59],[47,54,59,62],[45,52,57,61]],award:[69,69,74,78,76,74,69,66,69,73,74,78],finale:[50,57,62,66,69,74],percussion:'metal'},
 'jade-treasury':{id:'jade-treasury',bpm:112,eighthsPerBar:8,lead:'harp',backing:'strings',
  // Festive D-major pentatonic dance, alternating plucked strings and flute.
  melody:[69,66,69,74,0,71,69,66, 64,66,69,0,71,69,66,64, 66,69,74,71,69,0,66,69, 64,0,69,66,64,62,64,66,
   74,71,74,78,0,74,71,69, 66,69,71,0,74,71,69,66, 69,74,78,74,71,69,66,64, 69,66,64,62,0,69,62,0],
  chords:[[50,57,62,66],[43,50,55,59],[47,54,59,62],[45,52,57,64]],award:[62,66,69,74,71,69,66,69,74,78,74,69],finale:[50,57,62,66,69,74],percussion:'wood'},
 'pearl-palace':{id:'pearl-palace',bpm:108,eighthsPerBar:6,lead:'bell',backing:'harp',
  // A buoyant F-major treasure regatta in 6/8, not an ambient tide pad.
  melody:[72,69,65,69,72,77, 74,70,67,70,74,79, 76,72,69,72,76,77, 74,72,67,64,67,72,
   77,76,72,69,72,77, 79,77,74,70,74,77, 76,72,69,65,69,72, 74,70,67,65,0,72],
  chords:[[41,48,53,57],[43,50,55,58],[45,52,57,60],[48,55,60,64]],award:[65,69,72,77,76,72,74,77,79,77,74,77],finale:[41,48,53,57,60,65,72],percussion:'brush'},
 'ruby-revel':{id:'ruby-revel',bpm:124,eighthsPerBar:8,lead:'strings',backing:'brass',
  // G-major phoenix carnival: crisp violin phrases and triumphant horn replies.
  melody:[67,71,74,0,79,78,74,71, 72,76,79,0,76,74,72,69, 71,74,79,78,76,74,71,67, 69,0,74,78,76,74,69,66,
   79,0,74,71,74,79,78,74, 76,79,0,76,74,72,69,72, 71,74,79,0,78,76,74,71, 69,74,78,74,79,0,67,0],
  chords:[[43,50,55,59],[48,55,60,64],[40,47,52,55],[50,57,62,66]],award:[67,71,74,79,74,71,72,76,79,78,74,79],finale:[43,50,55,59,62,67,74],percussion:'frame'},
};
export function themeMusic(scene:string):ThemeMusic{return themes[scene]??themes.lobby;}
export const MUSIC_SCENES=['lobby','golden-hour','jade-treasury','pearl-palace','ruby-revel'] as const;
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
