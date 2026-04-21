import { useEffect, useState, useRef } from 'react';
import type { TradePreview } from '../types';
import { useTokena } from './AxolotlProvider';

/**
 * Auto-debounced buy quote hook. Updates the preview as the user types.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param ethAmount - ETH amount to preview (updates trigger debounced re-quote)
 * @param options - slippage, debounce delay, chain key
 *
 * @example
 * ```tsx
 * const { preview, isLoading, error } = useQuoteBuy('0xToken', parseFloat(input), { slippageBps: 500 });
 * if (preview) console.log(`You'll get ${preview.expectedOutput} tokens`);
 * ```
 */
export function useQuoteBuy(
  tokenAddress: string | null,
  ethAmount: number,
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
    if (!tokenAddress || !ethAmount || ethAmount <= 0) {
      setPreview(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);

    // Clear previous debounce
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        const result = await sdk.previewBuy(tokenAddress, ethAmount, slippageBps, chainKey);
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
  }, [tokenAddress, ethAmount, slippageBps, debounceMs, chainKey, sdk]);

  return { preview, isLoading, error };
}
