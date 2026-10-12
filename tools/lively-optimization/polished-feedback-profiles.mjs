// Stock cue selection, not twenty exclusive commissions. Each corresponding
// award uses a different complete source cue, without stitching musical phrases.
import {themedFeedbackProfiles} from './themed-feedback-profiles.mjs';
export const polishedFeedbackRevision = 'single-complete-cue-natural-tails-20261010';
export const polishedEvidenceDirectory = 'verification/polished-feedback-20261010';
const groups = {
  HIT: [13, 15, 16, 30, 31], // Festive toy/percussive accents.
  PIZZI: [17, 20, 23, 29, 33],
  SAX: [18, 19, 24, 25, 27],
  STEEL: [14, 21, 22, 26, 28],
};
export const polishedFeedbackProfiles = themedFeedbackProfiles.map(p => {
  const [awardFamily, ids] = Object.entries(groups).find(([, ids]) => ids.includes(p.id));
  return {...p, awardFamily, motifIndex: ids.indexOf(p.id)};
});
if (polishedFeedbackProfiles.length !== 20 || new Set(Object.values(groups).flat()).size !== 20) {
  throw Error('Expected the existing twenty-game scope, excluding missing F32');
}
