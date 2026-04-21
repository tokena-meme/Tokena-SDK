import { useEffect, useState, useCallback } from 'react';
import type { ProjectInfo, TokenListOptions } from '../types';
import { useTokena } from './AxolotlProvider';

/**
 * React hook for listing tokens from the factory.
 *
 * @param options - Pagination, chain key
 *
 * @example
 * ```tsx
 * const { tokens, total, isLoading, loadMore } = useTokenList({ limit: 10 });
 * ```
 */
export function useTokenList(
  options: TokenListOptions & { chainKey?: string } = {}
) {
  const sdk = useTokena();
  const { limit = 20, offset = 0, chainKey } = options;

  const [tokens, setTokens] = useState<ProjectInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentOffset, setCurrentOffset] = useState(offset);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [list, count] = await Promise.all([
        sdk.getAllTokens({ offset: 0, limit }, chainKey),
        sdk.getTokenCount(chainKey),
      ]);
      setTokens(list);
      setTotal(count);
      setCurrentOffset(limit);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to fetch token list');
    } finally {
      setIsLoading(false);
    }
  }, [limit, chainKey, sdk]);

  const loadMore = useCallback(async () => {
    if (currentOffset >= total) return;

    try {
      const more = await sdk.getAllTokens({ offset: currentOffset, limit }, chainKey);
      setTokens((prev) => [...prev, ...more]);
      setCurrentOffset((prev) => prev + limit);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load more tokens');
    }
  }, [currentOffset, total, limit, chainKey, sdk]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tokens, total, isLoading, error, loadMore, refresh };
}
