interface Entry<V> {
  value: V;
  storedAt: number;
}

/**
 * Small LRU with optional TTL for cross-request caching inside one isolate.
 * Holds resolved values only: sharing in-flight promises across requests is
 * unsafe on Workers.
 */
export class TtlLru<K, V> {
  private readonly entries = new Map<K, Entry<V>>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor({ maxEntries, ttlMs = Number.POSITIVE_INFINITY }: { maxEntries: number; ttlMs?: number }) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  get(key: K, now: number): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (now - entry.storedAt > this.ttlMs) {
      this.entries.delete(key);
      return undefined;
    }
    // Re-insert to mark as most recently used (Map keeps insertion order).
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V, now: number): void {
    this.entries.delete(key);
    this.entries.set(key, { value, storedAt: now });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value as K;
      this.entries.delete(oldest);
    }
  }
}
