import { Rect, resources, SpriteFrame, Texture2D } from 'cc';

export type MachineControlIcon =
  | 'home'
  | 'sound'
  | 'rules'
  | 'minus'
  | 'spin'
  | 'plus'
  | 'turbo'
  | 'auto'
  | 'paytable';

const CONTROL_ATLAS_PATH = 'generated/common/control_atlas_v01';
const CONTROL_ORDER: readonly MachineControlIcon[] = [
  'home', 'sound', 'rules',
  'minus', 'spin', 'plus',
  'turbo', 'auto', 'paytable',
];

/**
 * Runtime slices for the CC Switch generated 3x3 physical-control atlas.
 * SpriteFrames are cached once so every cabinet shares one texture and the
 * controls remain batch-friendly on mobile GPUs.
 */
export class MachineControlAtlasCache {
  private static texture?: Texture2D;
  private static readonly frames = new Map<MachineControlIcon, SpriteFrame>();
  private static waiting?: Array<() => void>;

  public static preload(ready?: () => void): void {
    if (this.texture) { ready?.(); return; }
    if (this.waiting) { if (ready) this.waiting.push(ready); return; }
    this.waiting = ready ? [ready] : [];
    resources.load(`${CONTROL_ATLAS_PATH}/texture`, Texture2D, (error, texture) => {
      const pending = this.waiting ?? [];
      this.waiting = undefined;
      if (error || !texture) return;
      this.texture = texture;
      pending.forEach((callback) => callback());
    });
  }

  public static frame(icon: MachineControlIcon): SpriteFrame | undefined {
    if (!this.texture) return undefined;
    const cached = this.frames.get(icon); if (cached) return cached;
    const index = CONTROL_ORDER.indexOf(icon); if (index < 0) return undefined;
    const cellWidth = Math.floor(this.texture.width / 3);
    const cellHeight = Math.floor(this.texture.height / 3);
    const frame = new SpriteFrame();
    frame.texture = this.texture;
    frame.rect = new Rect((index % 3) * cellWidth, Math.floor(index / 3) * cellHeight, cellWidth, cellHeight);
    this.frames.set(icon, frame);
    return frame;
  }
}
