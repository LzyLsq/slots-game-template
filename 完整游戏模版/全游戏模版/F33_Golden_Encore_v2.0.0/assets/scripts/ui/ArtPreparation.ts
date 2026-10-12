/** One in-flight operation per generated texture/derived atlas. Rejections are
 * evicted, so returning to a room can retry instead of caching a failed load.
 * Disposal prevents late callbacks from creating frames for a destroyed app;
 * it never releases textures shared by Cocos or an already mounted view. */
export class ArtPreparation {
  private pending = new Map<string, Promise<void>>();
  private disposed = false;

  assertActive(): void {
    if (this.disposed) throw new Error('Artwork owner was destroyed');
  }
  run(key: string, prepare: () => Promise<void>): Promise<void> {
    if (this.disposed) return Promise.reject(new Error('Artwork owner was destroyed'));
    const existing = this.pending.get(key);
    if (existing) return existing;
    const work = Promise.resolve().then(() => { this.assertActive(); return prepare(); });
    this.pending.set(key, work);
    const clear = () => { if (this.pending.get(key) === work) this.pending.delete(key); };
    // Both paths consume the cleanup promise, without hiding caller failures.
    void work.then(clear, clear);
    return work;
  }
  dispose(): void { this.disposed = true; this.pending.clear(); }
}
