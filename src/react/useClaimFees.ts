import { useState, useEffect, useCallback } from 'react';
import type { Signer } from 'ethers';
import type { ClaimResult } from '../types';
import { useTokena } from './AxolotlProvider';

/**
 * React hook for managing fee claiming across multiple bonding curve tokens.
 *
 * @param tokenAddresses - Array of BondingCurve contract addresses to check
 * @param walletAddress - Wallet address to check pending fees for
 * @param chainKey - Optional chain key override
 *
 * @example
 * ```tsx
 * const { claimableMap, totalClaimable, claim, loading } = useClaimFees(
 *   ['0xToken1', '0xToken2'],
 *   '0xMyWallet'
 * );
 * ```
 */
export function useClaimFees(
  tokenAddresses: string[],
  walletAddress: string | null | undefined,
  chainKey?: string
) {
  const sdk = useTokena();
  const [claimableMap, setClaimableMap] = useState<Record<string, number>>({});
  const [totalClaimedMap, setTotalClaimedMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [claimingToken, setClaimingToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Stable serialization key for memoization
  const addressKey = tokenAddresses.join(',');

  const refresh = useCallback(async () => {
    if (!tokenAddresses.length || !walletAddress) {
      setLoading(false);
      setClaimableMap({});
      setTotalClaimedMap({});
      return;
    }

    setLoading(true);
    try {
      const cMap: Record<string, number> = {};
      const tMap: Record<string, number> = {};

      // Process in batches of 3 to avoid RPC flooding
      const BATCH_SIZE = 3;
      for (let i = 0; i < tokenAddresses.length; i += BATCH_SIZE) {
        const batch = tokenAddresses.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (addr) => {
            try {
              const pending = await sdk.getPendingFees(addr, walletAddress, chainKey);
              cMap[addr] = pending;

              const history = await sdk.getClaimHistory(addr, walletAddress, chainKey);
              tMap[addr] = history.totalClaimed;
            } catch (err) {
              console.warn(`[tokena] Failed to fetch fees for ${addr}:`, err);
              cMap[addr] = 0;
              tMap[addr] = 0;
            }
          })
        );
      }

      setClaimableMap(cMap);
      setTotalClaimedMap(tMap);
    } catch (err) {
      console.warn('[tokena] Fee fetch error:', err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressKey, walletAddress, chainKey, sdk]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const claim = useCallback(
    async (tokenAddress: string, signer: Signer): Promise<ClaimResult | null> => {
      setClaimingToken(tokenAddress);
      setError(null);
      try {
        const result = await sdk.claimFees(tokenAddress, signer);
        const claimedAmount = claimableMap[tokenAddress] ?? 0;

        // Optimistically update local state
        setClaimableMap((prev) => ({ ...prev, [tokenAddress]: 0 }));
        setTotalClaimedMap((prev) => ({
          ...prev,
          [tokenAddress]: (prev[tokenAddress] ?? 0) + claimedAmount,
        }));

        return result;
      } catch (err: any) {
        setError(err?.message ?? 'Claim failed');
        return null;
      } finally {
        setClaimingToken(null);
      }
    },
    [sdk, claimableMap]
  );

  const totalClaimable = Object.values(claimableMap).reduce((s, v) => s + v, 0);
  const totalClaimed = Object.values(totalClaimedMap).reduce((s, v) => s + v, 0);

  return {
    claimableMap,
    totalClaimedMap,
    totalClaimable,
    totalClaimed,
    claim,
    claimingToken,
    loading,
    error,
    refresh,
  };
}
