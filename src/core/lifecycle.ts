import { Contract, formatEther, type Signer, type JsonRpcProvider } from 'ethers';
import { BondingCurveABI } from '../abi/BondingCurve';
import type { LifecycleState, TokenLifecycleStage } from '../types';
import { validateAddress } from './validation';
import { TransactionFailedError, wrapError } from '../errors';

/**
 * Get the full lifecycle state of a bonding curve token.
 *
 * Supports both new auto-migration contracts (getMigrationStatus) and
 * legacy contracts (individual thresholdReached/ethThreshold calls).
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
    const zeroAddr = '0x0000000000000000000000000000000000000000';

    let thresholdReached = false;
    let finalized = false;
    let uniswapPair = zeroAddr;
    let ethThreshold = BigInt(0);
    let isPaused = false;
    let uniswapRouter = zeroAddr;

    // Try getMigrationStatus() first (new auto-migration contracts)
    try {
      const migrationStatus = await token.getMigrationStatus();
      thresholdReached = migrationStatus[0];
      finalized = migrationStatus[1];
      uniswapPair = migrationStatus[2];
      ethThreshold = migrationStatus[4];
    } catch {
      // Fall back to individual calls (legacy contracts)
      thresholdReached = await token.thresholdReached().catch(() => false);
      ethThreshold = await token.ethThreshold().catch(() => BigInt(0));
      uniswapPair = await token.uniswapPair().catch(() => zeroAddr);
    }

    isPaused = await token.paused().catch(() => false);
    uniswapRouter = await token.uniswapRouter().catch(() => zeroAddr);

    const ethBalance = Number(formatEther(await provider.getBalance(tokenAddress)));
    const ethThresholdNum = Number(formatEther(ethThreshold));

    // Determine stage
    let stage: TokenLifecycleStage;
    const pairIsSet = uniswapPair && uniswapPair !== zeroAddr;

    if (isPaused) {
      stage = 'paused';
    } else if (finalized || pairIsSet) {
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
 * With auto-migration, this happens atomically during a buy() call when the threshold is hit.
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
 *
 * NOTE: With the new auto-migration model, finalization happens automatically
 * during buy() when the threshold is reached. This function is only needed
 * for legacy contracts that require manual finalization.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param signer - Signer to execute the transaction
 * @returns Transaction hash
 * @deprecated Use auto-migration contracts where buy() triggers finalization automatically.
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
