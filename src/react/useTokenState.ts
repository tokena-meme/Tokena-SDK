import { useEffect, useState, useCallback } from 'react';
import type { TokenState, EnrichedTokenState } from '../types';
import { enrichTokenState } from '../core/state';
import { useTokena } from './AxolotlProvider';

/**
 * Enhanced React hook for polling bonding curve token state.
 * Returns both raw and enriched state (with progress, marketCap, etc.).
 *
 * @param tokenAddress - BondingCurve contract address (null to skip)
 * @param options - Poll interval, whether to include enriched data
 *
 * @example
 * ```tsx
 * const { state, enriched, isLoading, error, refresh } = useTokenState('0x...');
 * console.log(`Progress: ${enriched?.progress}%`);
 * console.log(`Market Cap: ${enriched?.marketCapEth} ETH`);
 * ```
 */
export function useTokenState(
  tokenAddress: string | null,
  options: {
    pollInterval?: number;
    chainKey?: string;
  } = {}
) {
  const sdk = useTokena();
  const { pollInterval = 10000, chainKey } = options;

  const [state, setState] = useState<TokenState | null>(null);
  const [enriched, setEnriched] = useState<EnrichedTokenState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tokenAddress) return;

    try {
      const newState = await sdk.getTokenState(tokenAddress, chainKey);
      setState(newState);
      setEnriched(enrichTokenState(newState));
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to fetch token state');
    }
  }, [tokenAddress, chainKey, sdk]);

  useEffect(() => {
    if (!tokenAddress) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const newState = await sdk.getTokenState(tokenAddress as string, chainKey);
        if (isMounted) {
          setState(newState);
          setEnriched(enrichTokenState(newState));
          setIsLoading(false);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message ?? 'Failed to fetch token state');
          setIsLoading(false);
        }
      }

      if (isMounted) {
        timer = setTimeout(poll, pollInterval);
      }
    }

    setIsLoading(true);
    poll();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [tokenAddress, chainKey, pollInterval, sdk]);

  return { state, enriched, isLoading, error, refresh };
}
