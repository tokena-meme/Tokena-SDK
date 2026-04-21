import { useState, useCallback } from 'react';
import type { Signer } from 'ethers';
import type { CreateTokenParams, CreateTokenResult } from '../types';
import { useTokena } from './AxolotlProvider';

/**
 * React hook for creating new bonding curve tokens.
 *
 * @param chainKey - Optional chain key override
 *
 * @example
 * ```tsx
 * const { createToken, loading, error, result, reset } = useCreateToken();
 *
 * const handleCreate = async () => {
 *   const signer = await getSigner();
 *   await createToken({
 *     name: 'MyToken',
 *     symbol: 'MTK',
 *     totalSupply: '1000000000',
 *     ethThreshold: '5',
 *     isTaxToken: false,
 *   }, signer);
 * };
 * ```
 */
export function useCreateToken(chainKey?: string) {
  const sdk = useTokena();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateTokenResult | null>(null);

  const createToken = useCallback(
    async (params: CreateTokenParams, signer: Signer): Promise<CreateTokenResult | null> => {
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const res = await sdk.createToken(params, signer, chainKey);
        setResult(res);
        return res;
      } catch (err: any) {
        setError(err?.message ?? 'Token creation failed');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [sdk, chainKey]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setResult(null);
  }, []);

  return { createToken, loading, error, result, reset };
}
