import type { Signer, JsonRpcProvider } from 'ethers';
import type {
  TokenaConfig,
  ChainConfig,
  TokenState,
  EnrichedTokenState,
  CreateTokenParams,
  CreateTokenResult,
  BuyParams,
  SellParams,
  TradeResult,
  BuyQuote,
  SellQuote,
  ClaimResult,
  ClaimHistoryEntry,
  FactoryConfig,
  TradePreview,
  ProjectInfo,
  TokenListOptions,
  CreatorProfile,
  TradeEvent,
  TokenEvent,
  TokenMetadata,
  LifecycleState,
  CacheOptions,
} from '../types';
import { DEFAULT_CHAINS } from '../chains';
import { getProvider, clearProviderCache } from './provider';
import { getTokenState, getTokenBalance, enrichTokenState } from './state';
import { createToken, getCreationFee, getFactoryConfig } from './factory';
import { quoteBuy, quoteSell, buy, sell } from './trading';
import { getPendingFees, claimFees, getClaimHistory } from './fees';
import { previewBuy, previewSell } from './simulation';
import { estimateBuyGas, estimateSellGas, estimateCreateGas } from './gas';
import { getAllTokens, getNewTokens, getTokenByIndex, getTokenByAddress, getTokenCount, searchTokens } from './discovery';
import { getCreatorTokens, getCreatorProfile } from './creators';
import { getTradeHistory, getTokenEvents, getCreationEvents, getHolderCount, subscribeTrades, subscribeNewTokens } from './events';
import { getLifecycleState, isFinalized, finalizeToken, getMigrationState } from './lifecycle';
import { batchGetTokenStates, batchGetPendingFees } from './batch';
import { RequestCache } from './cache';
import { TokenaError } from '../errors';

/**
 * Main Tokena SDK class.
 *
 * Provides a unified interface for interacting with Tokena bonding curve
 * smart contracts on any supported EVM chain.
 *
 * @example
 * ```typescript
 * import { Tokena } from '@tokena/sdk';
 *
 * const tokena = new Tokena({ chainKey: 'sepolia' });
 *
 * // Read token state
 * const state = await tokena.getTokenState('0x...');
 * console.log(`Price: ${state.currentPriceEth} ETH`);
 *
 * // Preview a buy
 * const preview = await tokena.previewBuy('0x...', 0.5, 500);
 * console.log(`You'll get ~${preview.expectedOutput} tokens`);
 * console.log(`Price impact: ${preview.priceImpactPercent}%`);
 *
 * // Buy tokens with auto-slippage
 * const tx = await tokena.buy({ tokenAddress: '0x...', ethAmount: '0.5', slippageBps: 500 }, signer);
 * console.log(`Bought! TX: ${tx.txHash}`);
 * ```
 */
export class Tokena {
  private readonly chains: Record<string, ChainConfig>;
  private readonly defaultChainKey: string;
  private readonly cache?: RequestCache;
  private readonly debugMode: boolean;
  public readonly config: TokenaConfig;

  constructor(config: TokenaConfig) {
    this.config = config;

    // Merge default chains with any user-provided overrides
    this.chains = { ...DEFAULT_CHAINS, ...config.chains };
    this.defaultChainKey = config.chainKey;
    this.debugMode = config.debug ?? false;

    // Allow factory address override for default chain
    if (config.factoryAddress) {
      const chain = this.chains[this.defaultChainKey];
      if (chain) {
        this.chains[this.defaultChainKey] = { ...chain, factoryAddress: config.factoryAddress };
      }
    }

    // Validate that the default chain exists
    if (!this.chains[this.defaultChainKey]) {
      throw new TokenaError(
        `Unknown chain "${this.defaultChainKey}". Available: ${Object.keys(this.chains).join(', ')}`,
        'INVALID_CHAIN'
      );
    }

    // Initialize cache if configured
    if (config.cache) {
      this.cache = new RequestCache(config.cache);
    }
  }

  private log(...args: unknown[]) {
    if (this.debugMode) {
      console.log('[tokena]', ...args);
    }
  }

  // ─── Chain Helpers ───────────────────────────────────────────

  /** Get the configuration for a chain by key. */
  getChainConfig(chainKey?: string): ChainConfig {
    const key = chainKey ?? this.defaultChainKey;
    const config = this.chains[key];
    if (!config) throw new TokenaError(`Unknown chain: ${key}`, 'INVALID_CHAIN');
    return config;
  }

  /** Get a read-only provider for a chain. */
  getProvider(chainKey?: string): JsonRpcProvider {
    return getProvider(this.getChainConfig(chainKey));
  }

  /** Get the factory address for a chain. */
  getFactoryAddress(chainKey?: string): string {
    const config = this.getChainConfig(chainKey);
    if (!config.factoryAddress) {
      throw new TokenaError(`No factory deployed on ${config.name}`, 'NO_FACTORY');
    }
    return config.factoryAddress;
  }

  /** Clear cached providers and request cache. */
  clearCache() {
    clearProviderCache();
    this.cache?.clear();
  }

  // ─── Token State ─────────────────────────────────────────────

  /** Read the full on-chain state of a bonding curve token. */
  async getTokenState(tokenAddress: string, chainKey?: string): Promise<TokenState> {
    this.log('getTokenState', tokenAddress, chainKey);
    return getTokenState(tokenAddress, this.getProvider(chainKey));
  }

  /** Get enriched token state with computed progress, market cap, etc. */
  async getEnrichedTokenState(tokenAddress: string, chainKey?: string): Promise<EnrichedTokenState> {
    const state = await this.getTokenState(tokenAddress, chainKey);
    return enrichTokenState(state);
  }

  /** Get a wallet's token balance. */
  async getTokenBalance(tokenAddress: string, walletAddress: string, chainKey?: string): Promise<number> {
    this.log('getTokenBalance', tokenAddress, walletAddress);
    return getTokenBalance(tokenAddress, walletAddress, this.getProvider(chainKey));
  }

  // ─── Factory ─────────────────────────────────────────────────

  /** Create a new bonding curve token. */
  async createToken(params: CreateTokenParams, signer: Signer, chainKey?: string): Promise<CreateTokenResult> {
    this.log('createToken', params.name, params.symbol);
    const factoryAddress = this.getFactoryAddress(chainKey);
    const provider = this.getProvider(chainKey);
    return createToken(params, factoryAddress, signer, provider);
  }

  /** Get the creation fee required by the factory. */
  async getCreationFee(chainKey?: string): Promise<string> {
    return getCreationFee(this.getFactoryAddress(chainKey), this.getProvider(chainKey));
  }

  /** Get full factory configuration. */
  async getFactoryConfig(chainKey?: string): Promise<FactoryConfig> {
    return getFactoryConfig(this.getFactoryAddress(chainKey), this.getProvider(chainKey));
  }

  // ─── Trading ─────────────────────────────────────────────────

  /** Quote a buy (estimated tokens for a given ETH amount). */
  async quoteBuy(tokenAddress: string, ethAmount: number, chainKey?: string): Promise<BuyQuote> {
    this.log('quoteBuy', tokenAddress, ethAmount);
    return quoteBuy(tokenAddress, ethAmount, this.getProvider(chainKey));
  }

  /** Quote a sell (estimated ETH for a given token amount). */
  async quoteSell(tokenAddress: string, tokenAmount: number, slippageBps: number = 500, chainKey?: string): Promise<SellQuote> {
    return quoteSell(tokenAddress, tokenAmount, slippageBps, this.getProvider(chainKey));
  }

  /** Buy tokens on a bonding curve. */
  async buy(params: BuyParams, signer: Signer, chainKey?: string): Promise<TradeResult> {
    this.log('buy', params.tokenAddress, params.ethAmount);
    return buy(params, signer, this.getProvider(chainKey));
  }

  /** Sell tokens on a bonding curve. */
  async sell(params: SellParams, signer: Signer, chainKey?: string): Promise<TradeResult> {
    this.log('sell', params.tokenAddress, params.tokenAmount);
    return sell(params, signer, this.getProvider(chainKey));
  }

  // ─── Trade Preview / Simulation ──────────────────────────────

  /** Preview a buy with price impact, fees, and worst-case output. */
  async previewBuy(tokenAddress: string, ethAmount: number, slippageBps: number = 500, chainKey?: string): Promise<TradePreview> {
    this.log('previewBuy', tokenAddress, ethAmount, slippageBps);
    return previewBuy(tokenAddress, ethAmount, slippageBps, this.getProvider(chainKey));
  }

  /** Preview a sell with price impact, fees, and worst-case output. */
  async previewSell(tokenAddress: string, tokenAmount: number, slippageBps: number = 500, chainKey?: string): Promise<TradePreview> {
    return previewSell(tokenAddress, tokenAmount, slippageBps, this.getProvider(chainKey));
  }

  // ─── Gas Estimation ──────────────────────────────────────────

  /** Estimate gas for a buy transaction. */
  async estimateBuyGas(params: BuyParams, signer: Signer, chainKey?: string): Promise<bigint> {
    return estimateBuyGas(params, signer, this.getProvider(chainKey));
  }

  /** Estimate gas for a sell transaction. */
  async estimateSellGas(params: SellParams, signer: Signer, chainKey?: string): Promise<bigint> {
    return estimateSellGas(params, signer, this.getProvider(chainKey));
  }

  /** Estimate gas for a token creation transaction. */
  async estimateCreateGas(params: CreateTokenParams, signer: Signer, chainKey?: string): Promise<bigint> {
    return estimateCreateGas(params, this.getFactoryAddress(chainKey), signer, this.getProvider(chainKey));
  }

  // ─── Fees ────────────────────────────────────────────────────

  /** Get pending (claimable) fees for a wallet. */
  async getPendingFees(tokenAddress: string, walletAddress: string, chainKey?: string): Promise<number> {
    return getPendingFees(tokenAddress, walletAddress, this.getProvider(chainKey));
  }

  /** Claim accumulated fees. */
  async claimFees(tokenAddress: string, signer: Signer): Promise<ClaimResult> {
    this.log('claimFees', tokenAddress);
    return claimFees(tokenAddress, signer);
  }

  /** Get historical fee claim events for a wallet. */
  async getClaimHistory(tokenAddress: string, walletAddress: string, chainKey?: string, lookbackBlocks?: number): Promise<{ entries: ClaimHistoryEntry[]; totalClaimed: number }> {
    return getClaimHistory(tokenAddress, walletAddress, this.getProvider(chainKey), lookbackBlocks);
  }

  // ─── Discovery ───────────────────────────────────────────────

  /** Get total number of tokens created. */
  async getTokenCount(chainKey?: string): Promise<number> {
    return getTokenCount(this.getFactoryAddress(chainKey), this.getProvider(chainKey));
  }

  /** Get a project by its factory index. */
  async getTokenByIndex(index: number, chainKey?: string): Promise<ProjectInfo> {
    return getTokenByIndex(index, this.getFactoryAddress(chainKey), this.getProvider(chainKey));
  }

  /** Get a project by its token contract address. */
  async getTokenByAddress(tokenAddress: string, chainKey?: string) {
    return getTokenByAddress(tokenAddress, this.getFactoryAddress(chainKey), this.getProvider(chainKey));
  }

  /** Get all tokens with pagination. */
  async getAllTokens(options?: TokenListOptions, chainKey?: string): Promise<ProjectInfo[]> {
    return getAllTokens(this.getFactoryAddress(chainKey), this.getProvider(chainKey), options);
  }

  /** Get the newest tokens (most recently created). */
  async getNewTokens(limit?: number, chainKey?: string): Promise<ProjectInfo[]> {
    return getNewTokens(this.getFactoryAddress(chainKey), this.getProvider(chainKey), limit);
  }

  /** Search tokens by name or symbol. */
  async searchTokens(query: string, limit?: number, chainKey?: string): Promise<ProjectInfo[]> {
    return searchTokens(query, this.getFactoryAddress(chainKey), this.getProvider(chainKey), limit);
  }

  // ─── Creators ────────────────────────────────────────────────

  /** Get all tokens created by a specific wallet. */
  async getCreatorTokens(creatorAddress: string, chainKey?: string): Promise<ProjectInfo[]> {
    return getCreatorTokens(creatorAddress, this.getFactoryAddress(chainKey), this.getProvider(chainKey));
  }

  /** Get a creator's profile. */
  async getCreatorProfile(creatorAddress: string, chainKey?: string): Promise<CreatorProfile> {
    return getCreatorProfile(creatorAddress, this.getFactoryAddress(chainKey), this.getProvider(chainKey));
  }

  // ─── Events / Indexing ───────────────────────────────────────

  /** Get trade history for a token. */
  async getTradeHistory(tokenAddress: string, options?: { limit?: number; lookbackBlocks?: number }, chainKey?: string): Promise<TradeEvent[]> {
    return getTradeHistory(tokenAddress, this.getProvider(chainKey), options);
  }

  /** Get all events for a token. */
  async getTokenEvents(tokenAddress: string, options?: { types?: string[]; lookbackBlocks?: number }, chainKey?: string): Promise<TokenEvent[]> {
    return getTokenEvents(tokenAddress, this.getProvider(chainKey), options);
  }

  /** Get token creation events from the factory. */
  async getCreationEvents(options?: { lookbackBlocks?: number }, chainKey?: string) {
    return getCreationEvents(this.getFactoryAddress(chainKey), this.getProvider(chainKey), options);
  }

  /** Get estimated holder count for a token. */
  async getHolderCount(tokenAddress: string, lookbackBlocks?: number, chainKey?: string): Promise<number> {
    return getHolderCount(tokenAddress, this.getProvider(chainKey), lookbackBlocks);
  }

  /** Subscribe to real-time trade events. Returns an unsubscribe function. */
  subscribeTrades(tokenAddress: string, callback: (event: TradeEvent) => void, chainKey?: string): () => void {
    return subscribeTrades(tokenAddress, this.getProvider(chainKey), callback);
  }

  /** Subscribe to new token creation events. Returns an unsubscribe function. */
  subscribeNewTokens(callback: (event: { tokenAddress: string; name: string; symbol: string; txHash: string }) => void, chainKey?: string): () => void {
    return subscribeNewTokens(this.getFactoryAddress(chainKey), this.getProvider(chainKey), callback);
  }

  // ─── Metadata ────────────────────────────────────────────────

  /** Get token metadata via the configured adapter. */
  async getTokenMetadata(tokenAddress: string): Promise<TokenMetadata | null> {
    if (!this.config.metadataAdapter) return null;
    return this.config.metadataAdapter.getTokenMetadata(tokenAddress);
  }

  // ─── Lifecycle ───────────────────────────────────────────────

  /** Get the lifecycle state of a bonding curve. */
  async getLifecycleState(tokenAddress: string, chainKey?: string): Promise<LifecycleState> {
    return getLifecycleState(tokenAddress, this.getProvider(chainKey));
  }

  /** Check if a token is finalized. */
  async isFinalized(tokenAddress: string, chainKey?: string): Promise<boolean> {
    return isFinalized(tokenAddress, this.getProvider(chainKey));
  }

  /** Finalize a bonding curve (add liquidity to Uniswap). */
  async finalizeToken(tokenAddress: string, signer: Signer): Promise<{ txHash: string }> {
    this.log('finalizeToken', tokenAddress);
    return finalizeToken(tokenAddress, signer);
  }

  /** Get migration/finalization state. */
  async getMigrationState(tokenAddress: string, chainKey?: string) {
    return getMigrationState(tokenAddress, this.getProvider(chainKey));
  }

  // ─── Batch Operations ────────────────────────────────────────

  /** Fetch token states for many tokens at once. */
  async batchGetTokenStates(tokenAddresses: string[], chainKey?: string) {
    return batchGetTokenStates(tokenAddresses, this.getProvider(chainKey), { cache: this.cache });
  }

  /** Fetch pending fees for many tokens at once. */
  async batchGetPendingFees(tokenAddresses: string[], walletAddress: string, chainKey?: string) {
    return batchGetPendingFees(tokenAddresses, walletAddress, this.getProvider(chainKey));
  }
}

// ─── Legacy Alias ────────────────────────────────────────────
/** @deprecated Use Tokena instead */
export const Axolotl = Tokena;
