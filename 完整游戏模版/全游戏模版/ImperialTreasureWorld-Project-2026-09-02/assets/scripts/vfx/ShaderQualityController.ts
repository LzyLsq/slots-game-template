export interface ShaderQuality {
  particles: number;
  backgroundDistortion: boolean;
  layeredShine: boolean;
  winShine: boolean;
}
export const QUALITY_PRESETS: Readonly<Record<'low' | 'medium' | 'high', ShaderQuality>> = {
  low: { particles: 0.35, backgroundDistortion: false, layeredShine: false, winShine: true },
  medium: { particles: 0.7, backgroundDistortion: true, layeredShine: true, winShine: true },
  high: { particles: 1, backgroundDistortion: true, layeredShine: true, winShine: true },
};
