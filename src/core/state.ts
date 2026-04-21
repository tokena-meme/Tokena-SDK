import { Contract, formatEther, formatUnits } from 'ethers';
import type { JsonRpcProvider } from 'ethers';
import { BondingCurveABI } from '../abi/BondingCurve';
import type { TokenState, EnrichedTokenState } from '../types';
import { validateAddress } from './validation';
import { wrapError } from '../errors';

/**
 * Read the full on-chain state of a bonding curve token.
 *
 * @param tokenAddress - Deployed BondingCurve contract address
 * @param provider - ethers JsonRpcProvider for the target chain
 * @returns Parsed token state
 */
export async function getTokenState(
  tokenAddress: string,
  provider: JsonRpcProvider
): Promise<TokenState> {
  validateAddress(tokenAddress, 'tokenAddress');

  try {
    const token = new Contract(tokenAddress, BondingCurveABI, provider);

    const [
      name,
      symbol,
      decimals,
      totalSupply,
      currentPrice,
      ethThreshold,
      thresholdReached,
      isTaxToken,
      tokenReserve,
      taxInfo,
    ] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
      token.totalSupply(),
      token.getCurrentPrice(),
      token.ethThreshold(),
      token.thresholdReached(),
      token.isTaxToken(),
      token.balanceOf(tokenAddress),
      token.taxInfo(),
    ]);

    const ethBalance = await provider.getBalance(tokenAddress);
    const precision = BigInt(10) ** BigInt(18);

    return {
      currentPrice: currentPrice.toString(),
      currentPriceEth: Number(currentPrice) / Number(precision),
      ethBalance: Number(formatEther(ethBalance)),
      tokenReserve: Number(formatUnits(tokenReserve, decimals)),
      ethThreshold: Number(formatEther(ethThreshold)),
      thresholdReached,
      isTaxToken,
      totalSupply: Number(formatUnits(totalSupply, decimals)),
      name,
      symbol,
      decimals: Number(decimals),
      devWallet: taxInfo.devWallet,
      devBuyFeePercent: Number(taxInfo.devBuyFeePercent),
      devSellFeePercent: Number(taxInfo.devSellFeePercent),
      marketingWallet: taxInfo.marketingWallet,
      marketingBuyFeePercent: Number(taxInfo.marketingBuyFeePercent),
      marketingSellFeePercent: Number(taxInfo.marketingSellFeePercent),
    };
  } catch (err) {
    throw wrapError(err, `getTokenState(${tokenAddress})`);
  }
}

/**
 * Enrich a raw TokenState with computed convenience fields.
 */
export function enrichTokenState(state: TokenState): EnrichedTokenState {
  const progress = state.ethThreshold > 0
    ? Math.min((state.ethBalance / state.ethThreshold) * 100, 100)
    : 0;

  return {
    ...state,
    progress,
    marketCapEth: state.currentPriceEth * state.totalSupply,
    remainingEth: Math.max(state.ethThreshold - state.ethBalance, 0),
    totalTaxPercent:
      state.devBuyFeePercent +
      state.devSellFeePercent +
      state.marketingBuyFeePercent +
      state.marketingSellFeePercent,
  };
}

/**
 * Get a wallet's token balance.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param walletAddress - Wallet to check
 * @param provider - ethers JsonRpcProvider
 * @returns Human-readable token balance
 */
export async function getTokenBalance(
  tokenAddress: string,
  walletAddress: string,
  provider: JsonRpcProvider
): Promise<number> {
  validateAddress(tokenAddress, 'tokenAddress');
  validateAddress(walletAddress, 'walletAddress');

  try {
    const token = new Contract(tokenAddress, BondingCurveABI, provider);
    const [balance, decimals] = await Promise.all([
      token.balanceOf(walletAddress),
      token.decimals(),
    ]);
    return Number(formatUnits(balance, decimals));
  } catch (err) {
    throw wrapError(err, `getTokenBalance(${tokenAddress}, ${walletAddress})`);
  }
}
