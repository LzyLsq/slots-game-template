import { resources, SpriteFrame, Texture2D } from 'cc';
import type { GameId } from '../math/types';

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
  'bellhop-bonanza': 'art/f12-granary',
  'tea-vault-tumble': 'art/f12-lantern',
  'ballroom-keyways': 'art/f12-jade',
  'penthouse-fortune-lift': 'art/f12-drum',
};

/**
 * Individually generated and alpha-trimmed hardware for each cabinet.
 * No shared sheet cropping: every silhouette belongs to its own theme.
 */
export class MachineControlAtlasCache {
  private static readonly frames = new Map<string, SpriteFrame>();
  private static readonly waiting = new Map<GameId, Array<() => void>>();

  public static resourcePath(gameId: GameId, kind: 'primary' | 'key'): string {
    return `${CONTROL_ATLAS_PATHS[gameId]}-carved-${kind}-v2`;
  }

  public static preload(gameId: GameId, ready?: () => void): void {
    if (this.frames.has(`${gameId}:primary`) && this.frames.has(`${gameId}:key`)) { ready?.(); return; }
    const queued = this.waiting.get(gameId);
    if (queued) { if (ready) queued.push(ready); return; }
    this.waiting.set(gameId, ready ? [ready] : []);
    let remaining = 2;
    (['primary', 'key'] as const).forEach((kind) => {
      resources.load(`${this.resourcePath(gameId, kind)}/texture`, Texture2D, (error, texture) => {
        if (!error && texture) {
          const frame = new SpriteFrame(); frame.texture = texture;
          this.frames.set(`${gameId}:${kind}`, frame);
        }
        if (--remaining !== 0) return;
        const pending = this.waiting.get(gameId) ?? []; this.waiting.delete(gameId);
        pending.forEach((callback) => callback());
      });
    });
  }

  public static frame(gameId: GameId, icon: MachineControlIcon): SpriteFrame | undefined {
    return this.frames.get(`${gameId}:${icon === 'spin' ? 'primary' : 'key'}`);
  }
}
