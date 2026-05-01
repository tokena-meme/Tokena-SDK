import { Contract, formatEther, formatUnits } from 'ethers';
import type { JsonRpcProvider } from 'ethers';
import { BondingCurveABI } from '../abi/BondingCurve';
import type { TokenState, EnrichedTokenState } from '../types';
import { validateAddress } from './validation';
import { wrapError } from '../errors';

/**
 * Read the full on-chain state of a bonding curve token.
 *
 * Uses sequential RPC calls to avoid burst rate limits on free public RPCs.
 * Supports both new contracts (with getMigrationStatus) and legacy contracts
 * (with individual thresholdReached/ethThreshold calls).
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

    // Sequential calls to avoid burst rate limits on free RPCs
    const name = await token.name();
    const symbol = await token.symbol();
    const decimals = await token.decimals();
    const totalSupply = await token.totalSupply();
    const currentPrice = await token.getCurrentPrice();
    const isTaxToken = await token.isTaxToken();
    const tokenReserve = await token.balanceOf(tokenAddress);
    const taxInfo = await token.taxInfo();
    const ethBalance = await provider.getBalance(tokenAddress);
    const precision = BigInt(10) ** BigInt(18);

    // Try getMigrationStatus() (new contracts), fall back to individual calls (old contracts)
    let thresholdReached = false;
    let finalized = false;
    let uniswapPair = '0x0000000000000000000000000000000000000000';
    let ammReserve = ethBalance;
    let ethThreshold = BigInt(0);
    let migrationFeePercent = BigInt(0);

    try {
      const migrationStatus = await token.getMigrationStatus();
      [thresholdReached, finalized, uniswapPair, ammReserve, ethThreshold, migrationFeePercent] = migrationStatus;
    } catch {
      // Old contract — fall back to individual calls
      try {
        thresholdReached = await token.thresholdReached();
        ethThreshold = await token.ethThreshold();
        ammReserve = ethBalance;
        finalized = false;
      } catch (err) {
        // Very old contract, skip threshold fields
      }
    }

    return {
      currentPrice: currentPrice.toString(),
      currentPriceEth: Number(currentPrice) / Number(precision),
      ethBalance: Number(formatEther(ethBalance)),
      ammEthReserve: Number(formatEther(ammReserve)),
      tokenReserve: Number(formatUnits(tokenReserve, decimals)),
      ethThreshold: Number(formatEther(ethThreshold)),
      thresholdReached,
      finalized,
      migrationFeePercent: Number(migrationFeePercent),
      uniswapPair,
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
    ? Math.min((state.ammEthReserve / state.ethThreshold) * 100, 100)
    : 0;

  return {
    ...state,
    progress,
    marketCapEth: state.currentPriceEth * state.totalSupply,
    remainingEth: Math.max(state.ethThreshold - state.ammEthReserve, 0),
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
    const balance = await token.balanceOf(walletAddress);
    const decimals = await token.decimals();
    return Number(formatUnits(balance, decimals));
  } catch (err) {
    throw wrapError(err, `getTokenBalance(${tokenAddress}, ${walletAddress})`);
  }
}
