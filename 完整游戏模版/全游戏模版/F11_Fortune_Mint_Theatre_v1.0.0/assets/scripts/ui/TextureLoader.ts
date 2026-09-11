import { resources, Texture2D } from 'cc';

type Ready = (error: Error | null, texture?: Texture2D) => void;

/** Coalesce requests and retry transient image failures, never cache failures. */
export class TextureLoader {
  private static readonly pending = new Map<string, Ready[]>();

  public static load(path: string, _type: typeof Texture2D, ready: Ready): void {
    const waiting = this.pending.get(path);
    if (waiting) { waiting.push(ready); return; }
    this.pending.set(path, [ready]);
    const attempt = (remaining: number): void => {
      resources.load(path, Texture2D, (error, texture) => {
        if ((error || !texture) && remaining > 0) {
          // Network retry only; this timer never controls game/spin timing.
          setTimeout(() => attempt(remaining - 1), remaining === 2 ? 300 : 1000);
          return;
        }
        const callbacks = this.pending.get(path) ?? [];
        this.pending.delete(path);
        const failure = error ?? (!texture ? new Error(`Missing texture: ${path}`) : null);
        if (failure) console.error(`[F11 asset] ${path}`, failure);
        callbacks.forEach((callback) => callback(failure, texture));
      });
    };
    attempt(2);
  }
}
