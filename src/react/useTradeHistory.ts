import { useEffect, useState, useCallback } from 'react';
import type { TradeEvent } from '../types';
import { useTokena } from './AxolotlProvider';

/**
 * React hook for fetching and displaying trade history.
 *
 * @param tokenAddress - BondingCurve contract address (null to skip)
 * @param options - limit, auto-refresh, chain key
 *
 * @example
 * ```tsx
 * const { trades, isLoading, refresh } = useTradeHistory('0xToken');
 * ```
 */
export function useTradeHistory(
  tokenAddress: string | null,
  options: {
    limit?: number;
    autoRefresh?: boolean;
    refreshInterval?: number;
    chainKey?: string;
  } = {}
) {
  const sdk = useTokena();
  const { limit = 50, autoRefresh = false, refreshInterval = 30000, chainKey } = options;

  const [trades, setTrades] = useState<TradeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tokenAddress) return;

    try {
      const result = await sdk.getTradeHistory(tokenAddress, { limit }, chainKey);
      setTrades(result);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to fetch trade history');
    }
  }, [tokenAddress, limit, chainKey, sdk]);

  useEffect(() => {
    if (!tokenAddress) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    let timer: ReturnType<typeof setTimeout>;

    async function fetch() {
      try {
        const result = await sdk.getTradeHistory(tokenAddress as string, { limit }, chainKey);
        if (isMounted) {
          setTrades(result);
          setIsLoading(false);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message ?? 'Failed to fetch trade history');
          setIsLoading(false);
        }
      }

      if (isMounted && autoRefresh) {
        timer = setTimeout(fetch, refreshInterval);
      }
    }

    setIsLoading(true);
    fetch();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [tokenAddress, limit, autoRefresh, refreshInterval, chainKey, sdk]);

  return { trades, isLoading, error, refresh };
}
