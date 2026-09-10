import { resources, SpriteFrame, Texture2D } from 'cc';
import type { GameId } from '../math/types';

const TITLE_ART: Record<GameId, string> = {
  'bellhop-bonanza': 'granary', 'tea-vault-tumble': 'lantern',
  'ballroom-keyways': 'jade', 'penthouse-fortune-lift': 'drum',
};
export class GameTitleAtlasCache {
  private static frames = new Map<GameId, SpriteFrame>();
  private static pending = new Map<GameId, Array<() => void>>();
  public static load(gameId: GameId, ready: () => void): void {
    if (this.frames.has(gameId)) { ready(); return; }
    const waiting = this.pending.get(gameId);
    if (waiting) { waiting.push(ready); return; }
    this.pending.set(gameId, [ready]);
    resources.load(`art/f12-${TITLE_ART[gameId]}-title-v3/texture`, Texture2D, (error, texture) => {
      if (!error && texture) {
        const frame = new SpriteFrame(); frame.texture = texture; this.frames.set(gameId, frame);
      }
      const callbacks = this.pending.get(gameId) ?? []; this.pending.delete(gameId);
      callbacks.forEach((callback) => callback());
    });
  }

  public static frame(gameId: GameId): SpriteFrame | undefined {
    return this.frames.get(gameId);
  }
}
