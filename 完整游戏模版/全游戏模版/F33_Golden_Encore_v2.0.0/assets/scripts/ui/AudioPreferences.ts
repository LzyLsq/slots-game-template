/** Keep the legacy master switch; absent new fields leave existing accounts audible. */
export type AudioPreferences = { musicEnabled: boolean; bgmEnabled: boolean; effectsEnabled: boolean };
export function restoreAudioPreferences(raw: Partial<AudioPreferences> | null | undefined): AudioPreferences {
  return { musicEnabled: raw?.musicEnabled !== false, bgmEnabled: raw?.bgmEnabled !== false, effectsEnabled: raw?.effectsEnabled !== false };
}
export function audibleAudio(preferences: AudioPreferences, unlocked: boolean, suspended: boolean) {
  const master = preferences.musicEnabled && unlocked && !suspended;
  return { music: master && preferences.bgmEnabled, effects: master && preferences.effectsEnabled };
}
