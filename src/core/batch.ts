import type { JsonRpcProvider } from 'ethers';
import type { TokenState } from '../types';
import { getTokenState } from './state';
import { getPendingFees } from './fees';
import { validateAddress } from './validation';
import { wrapError } from '../errors';
import { RequestCache } from './cache';

/**
 * Fetch token states for many tokens in parallel with concurrency control.
 *
 * @param tokenAddresses - Array of BondingCurve contract addresses
 * @param provider - Read-only provider
 * @param options - Concurrency limit (default: 5), optional cache
 * @returns Map of token address → TokenState
 */
export async function batchGetTokenStates(
  tokenAddresses: string[],
  provider: JsonRpcProvider,
  options: { concurrency?: number; cache?: RequestCache } = {}
): Promise<Map<string, TokenState>> {
  const concurrency = options.concurrency ?? 5;
  const cache = options.cache;
  const results = new Map<string, TokenState>();

  // Validate all addresses upfront
  for (const addr of tokenAddresses) {
    validateAddress(addr, 'tokenAddress');
  }

  // Filter out cached addresses
  const toFetch: string[] = [];
  for (const addr of tokenAddresses) {
    if (cache) {
      const cached = cache.get<TokenState>(`state:${addr}`);
      if (cached) {
        results.set(addr, cached);
        continue;
      }
    }
    toFetch.push(addr);
  }

  // Process in chunks
  for (let i = 0; i < toFetch.length; i += concurrency) {
    const chunk = toFetch.slice(i, i + concurrency);
    const chunkResults = await Promise.allSettled(
      chunk.map(async (addr) => {
        try {
          const state = await getTokenState(addr, provider);
          if (cache) cache.set(`state:${addr}`, state);
          return { addr, state };
        } catch (err) {
          throw wrapError(err, `batchGetTokenStates(${addr})`);
        }
      })
    );

    for (const result of chunkResults) {
      if (result.status === 'fulfilled') {
        results.set(result.value.addr, result.value.state);
      }
      // Silently skip failed tokens in batch mode
    }
  }

  return results;
}

/**
 * Fetch pending fees for many tokens in parallel with concurrency control.
 *
 * @param tokenAddresses - Array of BondingCurve contract addresses
 * @param walletAddress - Wallet to check fees for
 * @param provider - Read-only provider
 * @param options - Concurrency limit (default: 5)
 * @returns Map of token address → pending fees (in ETH)
 */
export async function batchGetPendingFees(
  tokenAddresses: string[],
  walletAddress: string,
  provider: JsonRpcProvider,
  options: { concurrency?: number } = {}
): Promise<Map<string, number>> {
  validateAddress(walletAddress, 'walletAddress');
  const concurrency = options.concurrency ?? 5;
  const results = new Map<string, number>();

  for (let i = 0; i < tokenAddresses.length; i += concurrency) {
    const chunk = tokenAddresses.slice(i, i + concurrency);
    const chunkResults = await Promise.allSettled(
      chunk.map(async (addr) => {
        const fees = await getPendingFees(addr, walletAddress, provider);
        return { addr, fees };
      })
    );

    for (const result of chunkResults) {
      if (result.status === 'fulfilled') {
        results.set(result.value.addr, result.value.fees);
      } else {
        // Default to 0 for failed lookups
        results.set(chunk[chunkResults.indexOf(result)], 0);
      }
    }
  }

  return results;
}
