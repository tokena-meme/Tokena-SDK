import { useEffect, useState, useCallback } from 'react';
import type { CreatorProfile } from '../types';
import { useTokena } from './AxolotlProvider';

/**
 * React hook for fetching a creator's profile.
 *
 * @param creatorAddress - Creator wallet address (null to skip)
 * @param chainKey - Optional chain key override
 *
 * @example
 * ```tsx
 * const { profile, isLoading } = useCreatorProfile('0xCreator');
 * if (profile) console.log(`Created ${profile.tokenCount} tokens`);
 * ```
 */
export function useCreatorProfile(
  creatorAddress: string | null,
  chainKey?: string
) {
  const sdk = useTokena();

  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!creatorAddress) return;

    try {
      const result = await sdk.getCreatorProfile(creatorAddress, chainKey);
      setProfile(result);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to fetch creator profile');
    }
  }, [creatorAddress, chainKey, sdk]);

  useEffect(() => {
    if (!creatorAddress) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    sdk.getCreatorProfile(creatorAddress, chainKey)
      .then((result) => {
        setProfile(result);
        setError(null);
      })
      .catch((err: any) => {
        setError(err?.message ?? 'Failed to fetch creator profile');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [creatorAddress, chainKey, sdk]);

  return { profile, isLoading, error, refresh };
}
