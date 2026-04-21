import { Contract, formatEther, EventLog, type Signer, type JsonRpcProvider } from 'ethers';
import { BondingCurveABI } from '../abi/BondingCurve';
import type { ClaimResult, ClaimHistoryEntry } from '../types';
import { validateAddress } from './validation';
import { TransactionFailedError, wrapError } from '../errors';

/**
 * Get the pending (claimable) fees for a wallet on a specific bonding curve.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param walletAddress - Wallet to check
 * @param provider - Read-only provider
 * @returns Claimable amount in ETH
 */
export async function getPendingFees(
  tokenAddress: string,
  walletAddress: string,
  provider: JsonRpcProvider
): Promise<number> {
  validateAddress(tokenAddress, 'tokenAddress');
  validateAddress(walletAddress, 'walletAddress');

  try {
    const contract = new Contract(tokenAddress, BondingCurveABI, provider);
    const pendingWei = await contract.pendingFees(walletAddress);
    return Number(formatEther(pendingWei));
  } catch (err) {
    throw wrapError(err, `getPendingFees(${tokenAddress})`);
  }
}

/**
 * Claim accumulated fees from a bonding curve contract.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param signer - Signer for the wallet that has pending fees
 * @returns Transaction hash
 */
export async function claimFees(
  tokenAddress: string,
  signer: Signer
): Promise<ClaimResult> {
  validateAddress(tokenAddress, 'tokenAddress');

  try {
    const contract = new Contract(tokenAddress, BondingCurveABI, signer);
    const tx = await contract.claimFees();
    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) {
      throw new TransactionFailedError('Fee claim transaction failed', receipt?.hash);
    }

    return { txHash: receipt.hash };
  } catch (err) {
    throw wrapError(err, `claimFees(${tokenAddress})`);
  }
}

/**
 * Scan historical FeesClaimed events for a wallet on a bonding curve.
 * Paginates in 49,000-block chunks to respect RPC limits.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param walletAddress - Wallet to scan for
 * @param provider - Read-only provider
 * @param lookbackBlocks - How many blocks to scan back (default: 500,000 ≈ 2 months)
 * @returns Array of claim history entries and total claimed in ETH
 */
export async function getClaimHistory(
  tokenAddress: string,
  walletAddress: string,
  provider: JsonRpcProvider,
  lookbackBlocks: number = 500_000
): Promise<{ entries: ClaimHistoryEntry[]; totalClaimed: number }> {
  validateAddress(tokenAddress, 'tokenAddress');
  validateAddress(walletAddress, 'walletAddress');

  try {
    const contract = new Contract(tokenAddress, BondingCurveABI, provider);
    const currentBlock = await provider.getBlockNumber();
    const startBlock = Math.max(0, currentBlock - lookbackBlocks);
    const CHUNK_SIZE = 49_000;
    const filter = contract.filters.FeesClaimed(walletAddress);

    const entries: ClaimHistoryEntry[] = [];
    let totalClaimedWei = 0n;

    for (let from = startBlock; from <= currentBlock; from += CHUNK_SIZE) {
      const to = Math.min(from + CHUNK_SIZE - 1, currentBlock);
      const logs = await contract.queryFilter(filter, from, to);

      for (const log of logs) {
        let amount = 0n;

        if (log instanceof EventLog && log.args) {
          amount = log.args[1];
        } else {
          const parsed = contract.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
          if (parsed) {
            amount = parsed.args[1];
          }
        }

        totalClaimedWei += amount;
        entries.push({
          wallet: walletAddress,
          amount: Number(formatEther(amount)),
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
        });
      }
    }

    return {
      entries,
      totalClaimed: Number(formatEther(totalClaimedWei)),
    };
  } catch (err) {
    throw wrapError(err, `getClaimHistory(${tokenAddress})`);
  }
}
