import { useEffect, useState, useCallback } from 'react';
import type { TokenState } from '../types';
import { useTokena } from './AxolotlProvider';

/**
 * React hook that polls the on-chain state of a bonding curve token.
 *
 * @param tokenAddress - BondingCurve contract address (null to skip)
 * @param chainKey - Optional chain key override
 * @param pollInterval - Polling interval in ms (default: 10000)
 *
 * @example
 * ```tsx
 * const { state, isLoading, error, refresh } = usePoolState('0x...');
 * if (state) console.log(`Price: ${state.currentPriceEth} ETH`);
 * ```
 */
export function usePoolState(
  tokenAddress: string | null,
  chainKey?: string,
  pollInterval: number = 10000
) {
  const sdk = useTokena();
  const [state, setState] = useState<TokenState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tokenAddress) return;

    try {
      const newState = await sdk.getTokenState(tokenAddress, chainKey);
      setState(newState);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to fetch token state');
      console.error('[tokena] Pool state polling error:', err);
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
          setIsLoading(false);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message ?? 'Failed to fetch token state');
          setIsLoading(false);
        }
        console.error('[tokena] Pool state polling error:', err);
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

  return { state, isLoading, error, refresh };
}
