import type { TokenState, TradePreview } from '../types';

/**
 * Offline bonding curve math utilities.
 * These functions operate on a TokenState snapshot without any RPC calls,
 * enabling instant price previews in UIs.
 *
 * NOTE: These are approximations. For exact values, use the on-chain
 * previewBuy() / previewSell() functions in simulation.ts.
 */

/**
 * Calculate the bonding curve price from reserves.
 * Uses the constant-product formula: price = ethReserve / tokenReserve
 */
export function calculateBondingCurvePrice(ethReserve: number, tokenReserve: number): number {
  if (tokenReserve <= 0) return 0;
  return ethReserve / tokenReserve;
}

/**
 * Calculate price impact as a percentage for a given trade size.
 *
 * @param tradeSize - The size of the trade in ETH (for buys) or tokens (for sells)
 * @param reserveSize - The relevant reserve (ETH reserve for sells, token reserve for buys)
 * @returns Price impact percentage (0–100)
 */
export function calculatePriceImpact(tradeSize: number, reserveSize: number): number {
  if (reserveSize <= 0) return 100;
  // Approximate price impact using the constant product formula
  return (tradeSize / (reserveSize + tradeSize)) * 100;
}

/**
 * Calculate the minimum acceptable output after slippage.
 *
 * @param amount - Expected output amount
 * @param slippageBps - Slippage tolerance in basis points (e.g. 500 = 5%)
 * @returns Minimum output as a string
 */
export function calculateSlippageMinimum(amount: number, slippageBps: number): string {
  const multiplier = (10000 - slippageBps) / 10000;
  return (amount * multiplier).toString();
}

/**
 * Simulate a buy trade against a token state snapshot (offline).
 *
 * Uses constant-product AMM math:
 *   tokensOut = (tokenReserve * ethIn) / (ethReserve + ethIn)
 *
 * @param ethAmount - ETH to spend
 * @param state - Token state snapshot
 * @param slippageBps - Slippage tolerance (default: 500 = 5%)
 * @returns Trade preview with estimated output, impact, and fees
 */
export function simulateBuy(
  ethAmount: number,
  state: TokenState,
  slippageBps: number = 500
): TradePreview {
  const ethReserve = state.ethBalance;
  const tokenReserve = state.tokenReserve;

  // Constant-product: tokensOut = (tokenReserve * ethIn) / (ethReserve + ethIn)
  const tokensOut = tokenReserve > 0
    ? (tokenReserve * ethAmount) / (ethReserve + ethAmount)
    : 0;

  // Price impact
  const priceImpactPercent = calculatePriceImpact(ethAmount, ethReserve);

  // New reserves after trade
  const newEthReserve = ethReserve + ethAmount;
  const newTokenReserve = tokenReserve - tokensOut;
  const priceAfterTrade = calculateBondingCurvePrice(newEthReserve, newTokenReserve);

  // Fees (approximate)
  const platformFee = 0; // Platform fee is taken on-chain, hard to estimate offline
  let devFee = 0;
  let marketingFee = 0;
  if (state.isTaxToken) {
    devFee = ethAmount * (state.devBuyFeePercent / 100);
    marketingFee = ethAmount * (state.marketingBuyFeePercent / 100);
  }

  const slippageMultiplier = (10000 - slippageBps) / 10000;

  return {
    expectedOutput: tokensOut,
    priceImpactPercent,
    fees: {
      platformFee,
      devFee,
      marketingFee,
      totalFee: platformFee + devFee + marketingFee,
    },
    priceAfterTrade,
    worstCaseOutput: tokensOut * slippageMultiplier,
    minimumOutput: tokensOut * slippageMultiplier,
  };
}

/**
 * Simulate a sell trade against a token state snapshot (offline).
 *
 * Uses constant-product AMM math:
 *   ethOut = (ethReserve * tokensIn) / (tokenReserve + tokensIn)
 *
 * @param tokenAmount - Tokens to sell
 * @param state - Token state snapshot
 * @param slippageBps - Slippage tolerance (default: 500 = 5%)
 * @returns Trade preview with estimated output, impact, and fees
 */
export function simulateSell(
  tokenAmount: number,
  state: TokenState,
  slippageBps: number = 500
): TradePreview {
  const ethReserve = state.ethBalance;
  const tokenReserve = state.tokenReserve;

  // Constant-product: ethOut = (ethReserve * tokensIn) / (tokenReserve + tokensIn)
  const ethOut = ethReserve > 0
    ? (ethReserve * tokenAmount) / (tokenReserve + tokenAmount)
    : 0;

  // Price impact
  const priceImpactPercent = calculatePriceImpact(tokenAmount, tokenReserve);

  // New reserves
  const newEthReserve = ethReserve - ethOut;
  const newTokenReserve = tokenReserve + tokenAmount;
  const priceAfterTrade = calculateBondingCurvePrice(newEthReserve, newTokenReserve);

  // Fees
  const platformFee = 0;
  let devFee = 0;
  let marketingFee = 0;
  if (state.isTaxToken) {
    devFee = ethOut * (state.devSellFeePercent / 100);
    marketingFee = ethOut * (state.marketingSellFeePercent / 100);
  }

  const slippageMultiplier = (10000 - slippageBps) / 10000;

  return {
    expectedOutput: ethOut,
    priceImpactPercent,
    fees: {
      platformFee,
      devFee,
      marketingFee,
      totalFee: platformFee + devFee + marketingFee,
    },
    priceAfterTrade,
    worstCaseOutput: ethOut * slippageMultiplier,
    minimumOutput: ethOut * slippageMultiplier,
  };
}

/**
 * Estimate how many tokens you'd receive for a given ETH amount.
 * Shorthand for simulateBuy().expectedOutput.
 */
export function estimateTokensForEth(ethAmount: number, state: TokenState): number {
  return simulateBuy(ethAmount, state).expectedOutput;
}

/**
 * Estimate how much ETH you'd receive for selling a given token amount.
 * Shorthand for simulateSell().expectedOutput.
 */
export function estimateEthForTokens(tokenAmount: number, state: TokenState): number {
  return simulateSell(tokenAmount, state).expectedOutput;
}
