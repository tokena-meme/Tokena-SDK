import { Contract, formatEther, type Signer, type JsonRpcProvider } from 'ethers';
import { BondingCurveABI } from '../abi/BondingCurve';
import type { LifecycleState, TokenLifecycleStage } from '../types';
import { validateAddress } from './validation';
import { TransactionFailedError, wrapError } from '../errors';

/**
 * Get the full lifecycle state of a bonding curve token.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param provider - Read-only provider
 * @returns Lifecycle state including stage, progress, and Uniswap info
 */
export async function getLifecycleState(
  tokenAddress: string,
  provider: JsonRpcProvider
): Promise<LifecycleState> {
  validateAddress(tokenAddress, 'tokenAddress');

  try {
    const token = new Contract(tokenAddress, BondingCurveABI, provider);

    const [thresholdReached, ethThreshold, isPaused, uniswapPair, uniswapRouter] =
      await Promise.all([
        token.thresholdReached(),
        token.ethThreshold(),
        token.paused().catch(() => false), // paused() may not exist on all versions
        token.uniswapPair().catch(() => '0x0000000000000000000000000000000000000000'),
        token.uniswapRouter().catch(() => '0x0000000000000000000000000000000000000000'),
      ]);

    const ethBalance = Number(formatEther(await provider.getBalance(tokenAddress)));
    const ethThresholdNum = Number(formatEther(ethThreshold));

    // Determine stage
    let stage: TokenLifecycleStage;
    const zeroAddr = '0x0000000000000000000000000000000000000000';
    const pairIsSet = uniswapPair && uniswapPair !== zeroAddr;

    if (isPaused) {
      stage = 'paused';
    } else if (pairIsSet) {
      stage = 'finalized';
    } else if (thresholdReached) {
      stage = 'threshold_reached';
    } else {
      stage = 'bonding';
    }

    const progress = ethThresholdNum > 0
      ? Math.min((ethBalance / ethThresholdNum) * 100, 100)
      : 0;

    return {
      stage,
      thresholdReached,
      isPaused,
      ethBalance,
      ethThreshold: ethThresholdNum,
      progress,
      uniswapPair: pairIsSet ? uniswapPair : null,
      uniswapRouter: uniswapRouter !== zeroAddr ? uniswapRouter : null,
    };
  } catch (err) {
    throw wrapError(err, `getLifecycleState(${tokenAddress})`);
  }
}

/**
 * Check if a token's bonding curve has been finalized (liquidity added to Uniswap).
 *
 * @param tokenAddress - BondingCurve contract address
 * @param provider - Read-only provider
 * @returns true if finalized
 */
export async function isFinalized(
  tokenAddress: string,
  provider: JsonRpcProvider
): Promise<boolean> {
  const state = await getLifecycleState(tokenAddress, provider);
  return state.stage === 'finalized';
}

/**
 * Trigger finalization of a bonding curve (add liquidity to Uniswap).
 * Can only be called when the threshold has been reached.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param signer - Signer to execute the transaction
 * @returns Transaction hash
 */
export async function finalizeToken(
  tokenAddress: string,
  signer: Signer
): Promise<{ txHash: string }> {
  validateAddress(tokenAddress, 'tokenAddress');

  try {
    const contract = new Contract(tokenAddress, BondingCurveABI, signer);
    const tx = await contract.finalize();
    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) {
      throw new TransactionFailedError('Finalization transaction failed', receipt?.hash);
    }

    return { txHash: receipt.hash };
  } catch (err) {
    throw wrapError(err, `finalizeToken(${tokenAddress})`);
  }
}

/**
 * Get the migration/finalization state including liquidity details.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param provider - Read-only provider
 * @returns Migration state
 */
export async function getMigrationState(
  tokenAddress: string,
  provider: JsonRpcProvider
): Promise<{
  isFinalized: boolean;
  uniswapPair: string | null;
  uniswapRouter: string | null;
  stage: TokenLifecycleStage;
  progress: number;
}> {
  const state = await getLifecycleState(tokenAddress, provider);
  return {
    isFinalized: state.stage === 'finalized',
    uniswapPair: state.uniswapPair,
    uniswapRouter: state.uniswapRouter,
    stage: state.stage,
    progress: state.progress,
  };
}
