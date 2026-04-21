import { useEffect, useState, useCallback } from 'react';
import type { LifecycleState } from '../types';
import { useTokena } from './AxolotlProvider';

/**
 * React hook for tracking a bonding curve's lifecycle stage.
 *
 * @param tokenAddress - BondingCurve contract address (null to skip)
 * @param options - Poll interval, chain key
 *
 * @example
 * ```tsx
 * const { lifecycle, isLoading } = useLifecycle('0xToken');
 * if (lifecycle) {
 *   console.log(`Stage: ${lifecycle.stage}`);
 *   console.log(`Progress: ${lifecycle.progress}%`);
 * }
 * ```
 */
export function useLifecycle(
  tokenAddress: string | null,
  options: { pollInterval?: number; chainKey?: string } = {}
) {
  const sdk = useTokena();
  const { pollInterval = 15000, chainKey } = options;

  const [lifecycle, setLifecycle] = useState<LifecycleState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tokenAddress) return;

    try {
      const state = await sdk.getLifecycleState(tokenAddress, chainKey);
      setLifecycle(state);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to fetch lifecycle state');
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
        const state = await sdk.getLifecycleState(tokenAddress as string, chainKey);
        if (isMounted) {
          setLifecycle(state);
          setIsLoading(false);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message ?? 'Failed to fetch lifecycle state');
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
  }, [tokenAddress, pollInterval, chainKey, sdk]);

  return { lifecycle, isLoading, error, refresh };
}
