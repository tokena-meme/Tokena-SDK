import { useState, useCallback } from 'react';
import type { Signer } from 'ethers';
import type { BuyParams, SellParams, TradeResult, BuyQuote, SellQuote, TradePreview } from '../types';
import { useTokena } from './AxolotlProvider';

/**
 * React hook for executing trades on a bonding curve.
 *
 * @param chainKey - Optional chain key override
 *
 * @example
 * ```tsx
 * const { quoteBuy, previewBuy, buy, loading, error } = useTrade();
 *
 * const preview = await previewBuy('0xToken', 0.5, 500);
 * console.log(`Impact: ${preview.priceImpactPercent}%`);
 *
 * await buy({ tokenAddress: '0xToken', ethAmount: '0.5', slippageBps: 500 }, signer);
 * ```
 */
export function useTrade(chainKey?: string) {
  const sdk = useTokena();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quoteBuy = useCallback(
    async (tokenAddress: string, ethAmount: number): Promise<BuyQuote> => {
      return sdk.quoteBuy(tokenAddress, ethAmount, chainKey);
    },
    [sdk, chainKey]
  );

  const quoteSell = useCallback(
    async (tokenAddress: string, tokenAmount: number, slippageBps: number = 500): Promise<SellQuote> => {
      return sdk.quoteSell(tokenAddress, tokenAmount, slippageBps, chainKey);
    },
    [sdk, chainKey]
  );

  const previewBuy = useCallback(
    async (tokenAddress: string, ethAmount: number, slippageBps: number = 500): Promise<TradePreview> => {
      return sdk.previewBuy(tokenAddress, ethAmount, slippageBps, chainKey);
    },
    [sdk, chainKey]
  );

  const previewSell = useCallback(
    async (tokenAddress: string, tokenAmount: number, slippageBps: number = 500): Promise<TradePreview> => {
      return sdk.previewSell(tokenAddress, tokenAmount, slippageBps, chainKey);
    },
    [sdk, chainKey]
  );

  const buy = useCallback(
    async (params: BuyParams, signer: Signer): Promise<TradeResult | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await sdk.buy(params, signer, chainKey);
        return result;
      } catch (err: any) {
        setError(err?.message ?? 'Buy failed');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [sdk, chainKey]
  );

  const sell = useCallback(
    async (params: SellParams, signer: Signer): Promise<TradeResult | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await sdk.sell(params, signer, chainKey);
        return result;
      } catch (err: any) {
        setError(err?.message ?? 'Sell failed');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [sdk, chainKey]
  );

  return { quoteBuy, quoteSell, previewBuy, previewSell, buy, sell, loading, error };
}
