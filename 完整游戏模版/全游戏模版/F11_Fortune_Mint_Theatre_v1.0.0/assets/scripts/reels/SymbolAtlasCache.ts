import { Rect, resources, SpriteFrame, Texture2D } from 'cc';
import type { GameConfig, GameId } from '../math/types';
import { TextureLoader } from '../ui/TextureLoader';

export interface SymbolAtlasSpec {
  readonly path: string;
  readonly columns: number;
  readonly rows: number;
  readonly order: readonly string[];
}

const ATLAS_PATHS: Readonly<Record<GameId, string>> = {
  'mint-mosaic': 'generated/game01/symbol_atlas_f11',
  'ribbon-routes': 'generated/game02/symbol_atlas_f11',
  'vault-elevator': 'generated/game03/symbol_atlas_f11',
  'fortune-orbit': 'generated/game04/symbol_atlas_f11',
};

export function symbolAtlasForGame(config: GameConfig): SymbolAtlasSpec {
  return {
    path: ATLAS_PATHS[config.id],
    columns: 3,
    rows: 4,
    order: config.symbols.map((symbol) => symbol.id),
  };
}

export class SymbolAtlasCache {
  private static readonly textures = new Map<string, Texture2D>();
  private static readonly frames = new Map<string, SpriteFrame>();
  private static readonly waiting = new Map<string, Array<() => void>>();

  public static load(spec: SymbolAtlasSpec, ready: () => void): void {
    if (this.textures.has(spec.path)) { ready(); return; }
    const callbacks = this.waiting.get(spec.path);
    if (callbacks) { callbacks.push(ready); return; }
    this.waiting.set(spec.path, [ready]);
    TextureLoader.load(`${spec.path}/texture`, Texture2D, (error, texture) => {
      const pending = this.waiting.get(spec.path) ?? [];
      this.waiting.delete(spec.path);
      if (error || !texture) return;
      this.textures.set(spec.path, texture);
      pending.forEach((callback) => callback());
    });
  }

  public static frame(spec: SymbolAtlasSpec, symbolId: string): SpriteFrame | undefined {
    const texture = this.textures.get(spec.path); if (!texture) return undefined;
    const index = spec.order.indexOf(symbolId); if (index < 0) return undefined;
    const key = `${spec.path}:${symbolId}`; const cached = this.frames.get(key); if (cached) return cached;
    const cellWidth = Math.floor(texture.width / spec.columns); const cellHeight = Math.floor(texture.height / spec.rows);
    const column = index % spec.columns; const row = Math.floor(index / spec.columns);
    const frame = new SpriteFrame(); frame.texture = texture; frame.rect = new Rect(column * cellWidth, row * cellHeight, cellWidth, cellHeight);
    this.frames.set(key, frame); return frame;
  }
}
