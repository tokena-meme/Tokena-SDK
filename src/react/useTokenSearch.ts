import { useEffect, useState, useRef } from 'react';
import type { ProjectInfo } from '../types';
import { useTokena } from './AxolotlProvider';

/**
 * React hook for searching tokens by name or symbol.
 * Debounces search input automatically.
 *
 * @param query - Search query string
 * @param options - Debounce delay, chain key
 *
 * @example
 * ```tsx
 * const { results, isLoading } = useTokenSearch(searchInput, { debounceMs: 300 });
 * ```
 */
export function useTokenSearch(
  query: string,
  options: { debounceMs?: number; limit?: number; chainKey?: string } = {}
) {
  const sdk = useTokena();
  const { debounceMs = 300, limit = 20, chainKey } = options;

  const [results, setResults] = useState<ProjectInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        const found = await sdk.searchTokens(query.trim(), limit, chainKey);
        setResults(found);
        setError(null);
      } catch (err: any) {
        setError(err?.message ?? 'Search failed');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, debounceMs, limit, chainKey, sdk]);

  return { results, isLoading, error };
}
