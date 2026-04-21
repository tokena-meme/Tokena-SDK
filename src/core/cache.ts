import type { CacheOptions } from '../types';

/**
 * Simple in-memory request cache with TTL and stale-while-revalidate support.
 * Used internally by the SDK to avoid redundant RPC calls.
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  /** Promise for an in-flight revalidation (stale-while-revalidate) */
  revalidating?: Promise<T>;
}

export class RequestCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private ttlMs: number;
  private staleWhileRevalidate: boolean;

  constructor(options: CacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? 10_000;
    this.staleWhileRevalidate = options.staleWhileRevalidate ?? true;
  }

  /**
   * Get a cached value by key. Returns null if not found or expired.
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.ttlMs) {
      if (!this.staleWhileRevalidate) {
        this.cache.delete(key);
        return null;
      }
      // Stale but can still be used while revalidating
    }

    return entry.value as T;
  }

  /**
   * Check if a key exists and is fresh (not expired).
   */
  isFresh(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    return (Date.now() - entry.timestamp) <= this.ttlMs;
  }

  /**
   * Check if a key exists (may be stale).
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Set a cached value.
   */
  set<T>(key: string, value: T): void {
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  /**
   * Invalidate a specific key.
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the number of entries in the cache.
   */
  get size(): number {
    return this.cache.size;
  }
}

/**
 * Wrap any async function with caching.
 * The wrapped function will return cached results when available.
 *
 * @param fn - The async function to cache
 * @param keyFn - Function that generates a cache key from the arguments
 * @param cache - RequestCache instance
 * @returns Cached version of the function
 *
 * @example
 * ```typescript
 * const cachedGetState = withCache(
 *   getTokenState,
 *   (addr, provider) => `state:${addr}`,
 *   new RequestCache({ ttlMs: 5000 })
 * );
 * ```
 */
export function withCache<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyFn: (...args: TArgs) => string,
  cache: RequestCache
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const key = keyFn(...args);
    const cached = cache.get<TResult>(key);

    if (cached !== null && cache.isFresh(key)) {
      return cached;
    }

    // If stale data exists, return it and revalidate in background
    if (cached !== null) {
      fn(...args).then((result) => cache.set(key, result)).catch(() => {});
      return cached;
    }

    // No cached data — fetch fresh
    const result = await fn(...args);
    cache.set(key, result);
    return result;
  };
}
