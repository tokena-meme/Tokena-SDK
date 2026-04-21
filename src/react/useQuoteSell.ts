import { useEffect, useState, useRef } from 'react';
import type { TradePreview } from '../types';
import { useTokena } from './AxolotlProvider';

/**
 * Auto-debounced sell quote hook. Updates the preview as the user types.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param tokenAmount - Token amount to preview
 * @param options - slippage, debounce delay, chain key
 *
 * @example
 * ```tsx
 * const { preview, isLoading } = useQuoteSell('0xToken', parseFloat(input));
 * if (preview) console.log(`You'll get ${preview.expectedOutput} ETH`);
 * ```
 */
export function useQuoteSell(
  tokenAddress: string | null,
  tokenAmount: number,
  options: {
    slippageBps?: number;
    debounceMs?: number;
    chainKey?: string;
  } = {}
) {
  const sdk = useTokena();
  const { slippageBps = 500, debounceMs = 300, chainKey } = options;

  const [preview, setPreview] = useState<TradePreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!tokenAddress || !tokenAmount || tokenAmount <= 0) {
      setPreview(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        const result = await sdk.previewSell(tokenAddress, tokenAmount, slippageBps, chainKey);
        setPreview(result);
        setError(null);
      } catch (err: any) {
        setError(err?.message ?? 'Quote failed');
        setPreview(null);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [tokenAddress, tokenAmount, slippageBps, debounceMs, chainKey, sdk]);

  return { preview, isLoading, error };
}
