import { JsonRpcProvider, Network } from 'ethers';
import type { ChainConfig } from '../types';

/**
 * Provider cache to avoid creating duplicate connections.
 */
const providerCache = new Map<string, JsonRpcProvider>();

/**
 * Get a read-only JSON-RPC provider for a chain.
 * Providers are cached and reused.
 *
 * Uses `new Network()` (bare constructor) instead of `Network.from()` to avoid
 * ethers.js's built-in Infura/Alchemy plugins, which redirect requests away
 * from your configured RPC URL.
 */
export function getProvider(config: ChainConfig): JsonRpcProvider {
  const cacheKey = `${config.chainId}:${config.rpcUrl}`;
  const cached = providerCache.get(cacheKey);
  if (cached) return cached;

  // Create a bare Network — do NOT use Network.from() which loads built-in Infura plugins
  const network = new Network(config.name, config.chainId);

  const provider = new JsonRpcProvider(config.rpcUrl, network, {
    batchMaxCount: 1,       // No batching — prevents one failed call from poisoning others
    staticNetwork: network, // Prevents _detectNetwork which redirects to built-in Infura endpoints
    pollingInterval: 30000, // 30s polling to avoid rate limits on free RPCs
  });

  providerCache.set(cacheKey, provider);
  return provider;
}

/**
 * Clear the provider cache. Useful if you change RPC URLs at runtime.
 */
export function clearProviderCache(): void {
  providerCache.clear();
}
