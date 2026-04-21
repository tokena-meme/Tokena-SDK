import { useEffect, useState, useCallback } from 'react';
import { useTokena } from './AxolotlProvider';

/**
 * React hook for polling a wallet's token balance.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param walletAddress - Wallet to check (null to skip)
 * @param options - Poll interval, chain key
 *
 * @example
 * ```tsx
 * const { balance, isLoading, refresh } = useTokenBalance('0xToken', walletAddress);
 * ```
 */
export function useTokenBalance(
  tokenAddress: string | null,
  walletAddress: string | null,
  options: { pollInterval?: number; chainKey?: string } = {}
) {
  const sdk = useTokena();
  const { pollInterval = 15000, chainKey } = options;

  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tokenAddress || !walletAddress) return;

    try {
      const bal = await sdk.getTokenBalance(tokenAddress, walletAddress, chainKey);
      setBalance(bal);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to fetch balance');
    }
  }, [tokenAddress, walletAddress, chainKey, sdk]);

  useEffect(() => {
    if (!tokenAddress || !walletAddress) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const bal = await sdk.getTokenBalance(tokenAddress as string, walletAddress as string, chainKey);
        if (isMounted) {
          setBalance(bal);
          setIsLoading(false);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message ?? 'Failed to fetch balance');
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
  }, [tokenAddress, walletAddress, pollInterval, chainKey, sdk]);

  return { balance, isLoading, error, refresh };
}
