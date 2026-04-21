import { Contract, parseEther, parseUnits, formatEther, formatUnits, type JsonRpcProvider } from 'ethers';
import { BondingCurveABI } from '../abi/BondingCurve';
import type { TradePreview, TokenState } from '../types';
import { validateAddress, validatePositiveAmount, validateSlippageBps } from './validation';
import { wrapError } from '../errors';

/**
 * Preview a buy trade with full details including price impact, fees, and worst-case output.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param ethAmount - ETH to spend (human-readable)
 * @param slippageBps - Slippage tolerance in basis points (e.g. 500 = 5%)
 * @param provider - Read-only provider
 * @returns Full trade preview
 */
export async function previewBuy(
  tokenAddress: string,
  ethAmount: number,
  slippageBps: number,
  provider: JsonRpcProvider
): Promise<TradePreview> {
  validateAddress(tokenAddress, 'tokenAddress');
  validatePositiveAmount(ethAmount, 'ethAmount');
  validateSlippageBps(slippageBps);

  try {
    const token = new Contract(tokenAddress, BondingCurveABI, provider);

    const ethWei = parseEther(ethAmount.toString());

    // Get current state and estimate
    const [currentPrice, estimatedTokens, ethThreshold, isTaxToken, taxInfo, companyFeePercent] =
      await Promise.all([
        token.getCurrentPrice(),
        token.calculateTokenAmount(ethWei),
        token.ethThreshold(),
        token.isTaxToken(),
        token.taxInfo(),
        token.companyFeePercent(),
      ]);

    const precision = BigInt(10) ** BigInt(18);
    const currentPriceEth = Number(currentPrice) / Number(precision);
    const tokensOut = Number(formatUnits(estimatedTokens, 18));

    // Calculate the effective price per token for this trade
    const effectivePrice = tokensOut > 0 ? ethAmount / tokensOut : 0;

    // Price impact: how far the effective price is from the spot price
    const priceImpactPercent = currentPriceEth > 0
      ? ((effectivePrice - currentPriceEth) / currentPriceEth) * 100
      : 0;

    // Fee calculations
    const companyFee = Number(companyFeePercent);
    const platformFee = ethAmount * (companyFee / 100);

    let devFee = 0;
    let marketingFee = 0;
    if (isTaxToken) {
      devFee = ethAmount * (Number(taxInfo.devBuyFeePercent) / 100);
      marketingFee = ethAmount * (Number(taxInfo.marketingBuyFeePercent) / 100);
    }

    // Estimate price after trade (rough: add ETH to reserve and recalculate)
    // This is an approximation since the exact curve formula is on-chain
    const priceAfterTrade = effectivePrice; // best available estimate

    // Slippage calculations
    const slippageMultiplier = (10000 - slippageBps) / 10000;
    const worstCaseOutput = tokensOut * slippageMultiplier;
    const minimumOutput = tokensOut * slippageMultiplier;

    return {
      expectedOutput: tokensOut,
      priceImpactPercent: Math.abs(priceImpactPercent),
      fees: {
        platformFee,
        devFee,
        marketingFee,
        totalFee: platformFee + devFee + marketingFee,
      },
      priceAfterTrade,
      worstCaseOutput,
      minimumOutput,
    };
  } catch (err) {
    throw wrapError(err, `previewBuy(${tokenAddress})`);
  }
}

/**
 * Preview a sell trade with full details.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param tokenAmount - Tokens to sell (human-readable)
 * @param slippageBps - Slippage tolerance in basis points
 * @param provider - Read-only provider
 * @returns Full trade preview
 */
export async function previewSell(
  tokenAddress: string,
  tokenAmount: number,
  slippageBps: number,
  provider: JsonRpcProvider
): Promise<TradePreview> {
  validateAddress(tokenAddress, 'tokenAddress');
  validatePositiveAmount(tokenAmount, 'tokenAmount');
  validateSlippageBps(slippageBps);

  try {
    const token = new Contract(tokenAddress, BondingCurveABI, provider);

    const tokenWei = parseUnits(tokenAmount.toString(), 18);

    const [currentPrice, estimatedEth, isTaxToken, taxInfo, companyFeePercent] =
      await Promise.all([
        token.getCurrentPrice(),
        token.calculateEthAmount(tokenWei),
        token.isTaxToken(),
        token.taxInfo(),
        token.companyFeePercent(),
      ]);

    const precision = BigInt(10) ** BigInt(18);
    const currentPriceEth = Number(currentPrice) / Number(precision);
    const ethOut = Number(formatEther(estimatedEth));

    // Effective price per token for this sell
    const effectivePrice = tokenAmount > 0 ? ethOut / tokenAmount : 0;

    // Price impact
    const priceImpactPercent = currentPriceEth > 0
      ? ((currentPriceEth - effectivePrice) / currentPriceEth) * 100
      : 0;

    // Fee calculations
    const companyFee = Number(companyFeePercent);
    const platformFee = ethOut * (companyFee / 100);

    let devFee = 0;
    let marketingFee = 0;
    if (isTaxToken) {
      devFee = ethOut * (Number(taxInfo.devSellFeePercent) / 100);
      marketingFee = ethOut * (Number(taxInfo.marketingSellFeePercent) / 100);
    }

    // Slippage
    const slippageMultiplier = (10000 - slippageBps) / 10000;
    const worstCaseOutput = ethOut * slippageMultiplier;

    return {
      expectedOutput: ethOut,
      priceImpactPercent: Math.abs(priceImpactPercent),
      fees: {
        platformFee,
        devFee,
        marketingFee,
        totalFee: platformFee + devFee + marketingFee,
      },
      priceAfterTrade: effectivePrice,
      worstCaseOutput,
      minimumOutput: worstCaseOutput,
    };
  } catch (err) {
    throw wrapError(err, `previewSell(${tokenAddress})`);
  }
}
