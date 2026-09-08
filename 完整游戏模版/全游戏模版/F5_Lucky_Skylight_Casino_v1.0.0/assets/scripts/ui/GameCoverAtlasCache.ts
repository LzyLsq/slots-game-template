import { Rect, resources, SpriteFrame, Texture2D } from 'cc';
import type { GameId } from '../math/types';

const ORDER: readonly GameId[] = ['seven-skylight', 'clover-cash-club', 'dice-drift-deluxe', 'sky-vault-cascade'];
const PATH = 'generated/common/game_cover_atlas';

export class GameCoverAtlasCache {
  private static texture?: Texture2D;
  private static readonly frames = new Map<GameId, SpriteFrame>();
  private static waiting: Array<() => void> = [];
  private static loading = false;

  public static load(ready: () => void): void {
    if (this.texture) { ready(); return; }
    this.waiting.push(ready);
    if (this.loading) return;
    this.loading = true;
    resources.load(`${PATH}/texture`, Texture2D, (error, texture) => {
      this.loading = false;
      const pending = this.waiting; this.waiting = [];
      if (error || !texture) return;
      this.texture = texture;
      pending.forEach((callback) => callback());
    });
  }

  public static frame(gameId: GameId): SpriteFrame | undefined {
    if (!this.texture) return undefined;
    const cached = this.frames.get(gameId); if (cached) return cached;
    const index = ORDER.indexOf(gameId); if (index < 0) return undefined;
    const cellWidth = Math.floor(this.texture.width / 2); const cellHeight = Math.floor(this.texture.height / 2);
    const frame = new SpriteFrame(); frame.texture = this.texture; frame.rect = new Rect((index % 2) * cellWidth, Math.floor(index / 2) * cellHeight, cellWidth, cellHeight);
    this.frames.set(gameId, frame); return frame;
  }
}
