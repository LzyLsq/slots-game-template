import { Rect, resources, SpriteFrame, Texture2D } from 'cc';
import type { GameConfig, GameId } from '../math/types';

export interface SymbolAtlasSpec {
  readonly path: string;
  readonly columns: number;
  readonly rows: number;
  readonly order: readonly string[];
}

const ATLAS_FOLDERS: Readonly<Record<GameId, string>> = {
  'astral-vault': 'game01',
  'golden-dynasty': 'game02',
  'neon-classic': 'game03',
  'cosmic-coins': 'game04',
};

// Every cabinet uses one cohesive Kemet temple atlas. Place
// feature symbols in the same premium cells while keeping legacy math IDs.
const ATLAS_LAYOUT_BY_GAME: Readonly<Record<GameId, readonly string[]>> = {
  'astral-vault': ['sapphire', 'ruby', 'emerald', 'amethyst', 'sun', 'crown', 'ankh', 'eye', 'scarab', 'necklace', 'wild', 'gate'],
  'golden-dynasty': ['sapphire', 'ruby', 'emerald', 'amethyst', 'chalice', 'orrery', 'eye', 'scarab', 'necklace', 'wild', 'moon', '__pylon'],
  'neon-classic': ['amethyst', 'sapphire', 'emerald', 'ruby', 'sun', 'crown', 'scarab', 'wild', '__pylon', '__obelisk', '__uraeus', '__bennu'],
  'cosmic-coins': ['sapphire', 'ruby', 'emerald', 'amethyst', 'wand', 'chalice', 'ankh', 'eye', 'necklace', 'suncoin', 'wild', 'star'],
};

export function symbolAtlasForGame(config: GameConfig): SymbolAtlasSpec {
  return {
    path: `generated/${ATLAS_FOLDERS[config.id]}/symbol_atlas_cutout_v02`,
    columns: 3,
    rows: 4,
    order: ATLAS_LAYOUT_BY_GAME[config.id],
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
    resources.load(`${spec.path}/texture`, Texture2D, (error, texture) => {
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
