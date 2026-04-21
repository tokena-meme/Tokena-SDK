import { JsonRpcProvider } from 'ethers';
import type { ChainConfig } from '../types';

/**
 * Provider cache to avoid creating duplicate connections.
 */
const providerCache = new Map<string, JsonRpcProvider>();

/**
 * Get a read-only JSON-RPC provider for a chain.
 * Providers are cached and reused.
 */
export function getProvider(config: ChainConfig): JsonRpcProvider {
  const cacheKey = `${config.chainId}:${config.rpcUrl}`;
  const cached = providerCache.get(cacheKey);
  if (cached) return cached;

  const provider = new JsonRpcProvider(config.rpcUrl, {
    chainId: config.chainId,
    name: config.name,
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
