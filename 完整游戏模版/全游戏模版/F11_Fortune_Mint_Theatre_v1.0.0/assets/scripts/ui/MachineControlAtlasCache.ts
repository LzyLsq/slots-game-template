import { Rect, resources, SpriteFrame, Texture2D } from 'cc';
import type { GameId } from '../math/types';
import { TextureLoader } from './TextureLoader';

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

const CONTROL_ATLAS_PATHS: Readonly<Record<GameId, string>> = {
  'mint-mosaic': 'generated/common/machine_controls_f11',
  'ribbon-routes': 'generated/common/machine_controls_f11',
  'vault-elevator': 'generated/common/machine_controls_f11',
  'fortune-orbit': 'generated/common/machine_controls_f11',
};
const CONTROL_ORDER: readonly MachineControlIcon[] = [
  'home', 'sound', 'rules',
  'minus', 'spin', 'plus',
  'turbo', 'auto', 'paytable',
];

/**
 * Runtime slices for the four CC Switch generated 3x3 physical-control
 * atlases. Each cabinet deliberately owns a different hardware language;
 * frames still stay cached per texture so a cabinet remains batch-friendly.
 */
export class MachineControlAtlasCache {
  private static readonly textures = new Map<GameId, Texture2D>();
  private static readonly frames = new Map<string, SpriteFrame>();
  private static readonly waiting = new Map<GameId, Array<() => void>>();

  public static preload(gameId: GameId, ready?: () => void): void {
    const atlasPath = CONTROL_ATLAS_PATHS[gameId];
    if (!atlasPath) { ready?.(); return; }
    if (this.textures.has(gameId)) { ready?.(); return; }
    const queued = this.waiting.get(gameId);
    if (queued) { if (ready) queued.push(ready); return; }
    this.waiting.set(gameId, ready ? [ready] : []);
    TextureLoader.load(`${atlasPath}/texture`, Texture2D, (error, texture) => {
      const pending = this.waiting.get(gameId) ?? [];
      this.waiting.delete(gameId);
      if (error || !texture) return;
      this.textures.set(gameId, texture);
      pending.forEach((callback) => callback());
    });
  }

  public static frame(gameId: GameId, icon: MachineControlIcon): SpriteFrame | undefined {
    const texture = this.textures.get(gameId); if (!texture) return undefined;
    const key = `${gameId}:${icon}`;
    const cached = this.frames.get(key); if (cached) return cached;
    const index = CONTROL_ORDER.indexOf(icon); if (index < 0) return undefined;
    const cellWidth = Math.floor(texture.width / 3);
    const cellHeight = Math.floor(texture.height / 3);
    const frame = new SpriteFrame();
    frame.texture = texture;
    frame.rect = new Rect((index % 3) * cellWidth, Math.floor(index / 3) * cellHeight, cellWidth, cellHeight);
    this.frames.set(key, frame);
    return frame;
  }
}
