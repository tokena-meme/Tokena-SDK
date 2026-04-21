import { Contract, parseEther, parseUnits, formatEther, formatUnits, EventLog, type Signer, type JsonRpcProvider } from 'ethers';
import { BondingCurveABI } from '../abi/BondingCurve';
import type { BuyParams, SellParams, TradeResult, BuyQuote, SellQuote, TxOptions } from '../types';
import { validateAddress, validatePositiveAmount, validateSlippageBps } from './validation';
import { TradePausedError, ThresholdAlreadyReachedError, TransactionFailedError, wrapError } from '../errors';

/**
 * Trim a decimal string to at most 18 decimal places to avoid overflow.
 */
function trimDec(val: string | number): string {
  const str = typeof val === 'number'
    ? val.toLocaleString('fullwide', { useGrouping: false, maximumFractionDigits: 20 })
    : val;
  const [int, dec] = str.split('.');
  return dec ? `${int}.${dec.slice(0, 18)}` : str;
}

/**
 * Build transaction overrides from TxOptions.
 */
function buildTxOverrides(txOptions?: TxOptions, extraOverrides?: Record<string, unknown>): Record<string, unknown> {
  const overrides: Record<string, unknown> = { ...extraOverrides };
  if (txOptions?.gasLimit) overrides.gasLimit = txOptions.gasLimit;
  if (txOptions?.maxFeePerGas) overrides.maxFeePerGas = txOptions.maxFeePerGas;
  if (txOptions?.maxPriorityFeePerGas) overrides.maxPriorityFeePerGas = txOptions.maxPriorityFeePerGas;
  return overrides;
}

/**
 * Pre-trade safety checks: ensure the contract is not paused and
 * the threshold hasn't already been reached.
 */
async function preTradeChecks(tokenAddress: string, provider: JsonRpcProvider): Promise<void> {
  const token = new Contract(tokenAddress, BondingCurveABI, provider);
  try {
    const [paused, thresholdReached] = await Promise.all([
      token.paused(),
      token.thresholdReached(),
    ]);
    if (paused) throw new TradePausedError(tokenAddress);
    if (thresholdReached) throw new ThresholdAlreadyReachedError(tokenAddress);
  } catch (err) {
    if (err instanceof TradePausedError || err instanceof ThresholdAlreadyReachedError) throw err;
    // If the contract doesn't have paused(), skip the check
  }
}

/**
 * Get a quote for buying tokens with ETH (no transaction, read-only).
 *
 * @param tokenAddress - BondingCurve contract address
 * @param ethAmount - ETH to spend (human-readable number)
 * @param provider - Read-only provider
 * @returns Estimated tokens out
 */
export async function quoteBuy(
  tokenAddress: string,
  ethAmount: number,
  provider: JsonRpcProvider
): Promise<BuyQuote> {
  validateAddress(tokenAddress, 'tokenAddress');
  validatePositiveAmount(ethAmount, 'ethAmount');

  try {
    const token = new Contract(tokenAddress, BondingCurveABI, provider);
    const ethWei = parseEther(trimDec(ethAmount));
    const estimatedTokens = await token.calculateTokenAmount(ethWei);
    return {
      tokensOut: Number(formatUnits(estimatedTokens, 18)),
    };
  } catch (err) {
    throw wrapError(err, `quoteBuy(${tokenAddress})`);
  }
}

/**
 * Get a quote for selling tokens for ETH (no transaction, read-only).
 *
 * @param tokenAddress - BondingCurve contract address
 * @param tokenAmount - Tokens to sell (human-readable number)
 * @param slippageBps - Slippage tolerance in basis points (e.g. 500 = 5%)
 * @param provider - Read-only provider
 * @returns Estimated ETH out and minimum after slippage
 */
export async function quoteSell(
  tokenAddress: string,
  tokenAmount: number,
  slippageBps: number,
  provider: JsonRpcProvider
): Promise<SellQuote> {
  validateAddress(tokenAddress, 'tokenAddress');
  validatePositiveAmount(tokenAmount, 'tokenAmount');
  validateSlippageBps(slippageBps);

  try {
    const token = new Contract(tokenAddress, BondingCurveABI, provider);
    const tokenWei = parseUnits(trimDec(tokenAmount), 18);
    const estimatedEth = await token.calculateEthAmount(tokenWei);

    const slippageMultiplier = (10000 - slippageBps) / 10000;
    const rawEthOut = Number(formatEther(estimatedEth));

    return {
      ethOut: rawEthOut,
      minEthOut: rawEthOut * slippageMultiplier,
    };
  } catch (err) {
    throw wrapError(err, `quoteSell(${tokenAddress})`);
  }
}

/**
 * Buy tokens on a bonding curve.
 *
 * If `slippageBps` is provided but `minTokens` is not, the minimum tokens
 * are automatically calculated from a pre-trade quote.
 *
 * @param params - Buy parameters (token address, ETH amount, min tokens, slippage)
 * @param signer - ethers Signer to sign the transaction
 * @param provider - Read-only provider for estimating output
 * @returns Transaction hash, estimated and actual tokens received
 */
export async function buy(
  params: BuyParams,
  signer: Signer,
  provider: JsonRpcProvider
): Promise<TradeResult> {
  validateAddress(params.tokenAddress, 'tokenAddress');
  validatePositiveAmount(params.ethAmount, 'ethAmount');
  if (params.slippageBps !== undefined) validateSlippageBps(params.slippageBps);

  try {
    // Pre-trade safety checks
    await preTradeChecks(params.tokenAddress, provider);

    const ethWei = parseEther(trimDec(params.ethAmount));

    // Estimate tokens out
    const readToken = new Contract(params.tokenAddress, BondingCurveABI, provider);
    const estimatedTokens = await readToken.calculateTokenAmount(ethWei);

    // Determine minTokens: explicit > slippage-derived > 0
    let minTokensWei: bigint;
    if (params.minTokens) {
      minTokensWei = parseUnits(trimDec(params.minTokens), 18);
    } else if (params.slippageBps !== undefined && params.slippageBps > 0) {
      const slippageMultiplier = BigInt(10000 - params.slippageBps);
      minTokensWei = (estimatedTokens * slippageMultiplier) / BigInt(10000);
    } else {
      minTokensWei = BigInt(0);
    }

    const token = new Contract(params.tokenAddress, BondingCurveABI, signer);
    const overrides = buildTxOverrides(params.txOptions, { value: ethWei });
    const tx = await token.buy(minTokensWei, overrides);

    // Fire-and-forget mode
    if (params.txOptions?.waitForReceipt === false) {
      return {
        txHash: tx.hash,
        amountOut: formatUnits(estimatedTokens, 18),
      };
    }

    const receipt = await tx.wait(params.txOptions?.confirmations ?? 1);

    if (!receipt || receipt.status !== 1) {
      throw new TransactionFailedError('Buy transaction reverted', receipt?.hash);
    }

    // Parse actual amount from Buy event
    let actualAmountOut: string | undefined;
    for (const log of receipt.logs) {
      try {
        if (log instanceof EventLog && log.eventName === 'Buy') {
          actualAmountOut = formatUnits(log.args[2], 18); // tokenAmount is arg[2]
          break;
        }
        const parsed = token.interface.parseLog({ topics: log.topics as string[], data: log.data });
        if (parsed && parsed.name === 'Buy') {
          actualAmountOut = formatUnits(parsed.args[2], 18);
          break;
        }
      } catch {
        // Not our event, skip
      }
    }

    return {
      txHash: receipt.hash,
      amountOut: formatUnits(estimatedTokens, 18),
      actualAmountOut,
      gasUsed: receipt.gasUsed?.toString(),
    };
  } catch (err) {
    throw wrapError(err, `buy(${params.tokenAddress})`);
  }
}

/**
 * Sell tokens on a bonding curve.
 *
 * If `slippageBps` is provided but `minEth` is not, the minimum ETH
 * is automatically calculated from a pre-trade quote.
 *
 * @param params - Sell parameters (token address, token amount, min ETH, slippage)
 * @param signer - ethers Signer to sign the transaction
 * @param provider - Read-only provider for estimating output
 * @returns Transaction hash, estimated and actual ETH received
 */
export async function sell(
  params: SellParams,
  signer: Signer,
  provider: JsonRpcProvider
): Promise<TradeResult> {
  validateAddress(params.tokenAddress, 'tokenAddress');
  validatePositiveAmount(params.tokenAmount, 'tokenAmount');
  if (params.slippageBps !== undefined) validateSlippageBps(params.slippageBps);

  try {
    // Pre-trade safety checks
    await preTradeChecks(params.tokenAddress, provider);

    const tokenWei = parseUnits(trimDec(params.tokenAmount), 18);

    // Estimate ETH out
    const readToken = new Contract(params.tokenAddress, BondingCurveABI, provider);
    const estimatedEth = await readToken.calculateEthAmount(tokenWei);

    // Determine minEth: explicit > slippage-derived > 0
    let minEthWei: bigint;
    if (params.minEth) {
      minEthWei = parseEther(trimDec(params.minEth));
    } else if (params.slippageBps !== undefined && params.slippageBps > 0) {
      const slippageMultiplier = BigInt(10000 - params.slippageBps);
      minEthWei = (estimatedEth * slippageMultiplier) / BigInt(10000);
    } else {
      minEthWei = BigInt(0);
    }

    const token = new Contract(params.tokenAddress, BondingCurveABI, signer);
    const overrides = buildTxOverrides(params.txOptions);
    const tx = await token.sell(tokenWei, minEthWei, overrides);

    // Fire-and-forget mode
    if (params.txOptions?.waitForReceipt === false) {
      return {
        txHash: tx.hash,
        amountOut: formatEther(estimatedEth),
      };
    }

    const receipt = await tx.wait(params.txOptions?.confirmations ?? 1);

    if (!receipt || receipt.status !== 1) {
      throw new TransactionFailedError('Sell transaction reverted', receipt?.hash);
    }

    // Parse actual amount from Sell event
    let actualAmountOut: string | undefined;
    for (const log of receipt.logs) {
      try {
        if (log instanceof EventLog && log.eventName === 'Sell') {
          actualAmountOut = formatEther(log.args[2]); // ethAmount is arg[2]
          break;
        }
        const parsed = token.interface.parseLog({ topics: log.topics as string[], data: log.data });
        if (parsed && parsed.name === 'Sell') {
          actualAmountOut = formatEther(parsed.args[2]);
          break;
        }
      } catch {
        // Not our event, skip
      }
    }

    return {
      txHash: receipt.hash,
      amountOut: formatEther(estimatedEth),
      actualAmountOut,
      gasUsed: receipt.gasUsed?.toString(),
    };
  } catch (err) {
    throw wrapError(err, `sell(${params.tokenAddress})`);
  }
}
