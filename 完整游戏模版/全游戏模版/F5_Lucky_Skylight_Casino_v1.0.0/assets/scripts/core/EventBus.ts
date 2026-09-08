export type EventMap = Record<string, unknown>;

export class EventBus<TEvents extends EventMap> {
  private readonly listeners = new Map<keyof TEvents, Set<(value: unknown) => void>>();

  public on<TKey extends keyof TEvents>(event: TKey, listener: (value: TEvents[TKey]) => void): () => void {
    const bucket = this.listeners.get(event) ?? new Set();
    bucket.add(listener as (value: unknown) => void);
    this.listeners.set(event, bucket);
    return () => bucket.delete(listener as (value: unknown) => void);
  }

  public emit<TKey extends keyof TEvents>(event: TKey, value: TEvents[TKey]): void {
    this.listeners.get(event)?.forEach((listener) => listener(value));
  }

  public clear(): void {
    this.listeners.clear();
  }
}
