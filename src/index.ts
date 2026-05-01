// ─── Core SDK ────────────────────────────────────────────────
export { Tokena, Axolotl } from './core/Axolotl';

// ─── Errors ──────────────────────────────────────────────────
export {
  TokenaError,
  InsufficientBalanceError,
  SlippageExceededError,
  ChainMismatchError,
  TokenNotFoundError,
  TradePausedError,
  ThresholdAlreadyReachedError,
  InvalidAddressError,
  InvalidAmountError,
  TransactionFailedError,
  ContractNotFoundError,
  RpcError,
  wrapError,
} from './errors';

// ─── Types ───────────────────────────────────────────────────
export type {
  TokenaConfig,
  AxolotlConfig,
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
  TradePreview,
  TxOptions,
  ClaimResult,
  ClaimHistoryEntry,
  FactoryConfig,
  ProjectInfo,
  TokenListOptions,
  CreatorProfile,
  TradeEvent,
  TokenEvent,
  TokenMetadata,
  MetadataAdapter,
  CreatorAdapter,
  TokenLifecycleStage,
  LifecycleState,
  CacheOptions,
} from './types';

// ─── ABIs (for advanced usage) ───────────────────────────────
export { BondingCurveABI } from './abi/BondingCurve';
export { TokenFactoryABI } from './abi/TokenFactory';

// ─── Chain Configs ───────────────────────────────────────────
export { DEFAULT_CHAINS } from './chains';

// ─── Standalone Core Functions (for tree-shaking) ────────────
export { getProvider, clearProviderCache } from './core/provider';
export { getTokenState, getTokenBalance, enrichTokenState } from './core/state';
export { createToken, getCreationFee, getFactoryConfig } from './core/factory';
export { quoteBuy, quoteSell, buy, sell } from './core/trading';
export { getPendingFees, claimFees, getClaimHistory } from './core/fees';

// ─── Simulation & Math ──────────────────────────────────────
export { previewBuy, previewSell } from './core/simulation';
export { estimateBuyGas, estimateSellGas, estimateCreateGas } from './core/gas';
export {
  simulateBuy,
  simulateSell,
  calculateBondingCurvePrice,
  calculatePriceImpact,
  calculateSlippageMinimum,
  estimateTokensForEth,
  estimateEthForTokens,
} from './utils/math';

// ─── Discovery ───────────────────────────────────────────────
export { getAllTokens, getNewTokens, getTokenByIndex, getTokenByAddress, getTokenCount, searchTokens } from './core/discovery';
export { getCreatorTokens, getCreatorProfile } from './core/creators';

// ─── Events ──────────────────────────────────────────────────
export { getTradeHistory, getTokenEvents, getCreationEvents, getHolderCount, subscribeTrades, subscribeNewTokens } from './core/events';

// ─── Metadata & IPFS ─────────────────────────────────────────
export { loadFromIpfs, ipfsUrl, parseTokenMetadata, createIpfsMetadataAdapter, DEFAULT_IPFS_GATEWAY } from './core/metadata';

// ─── Lifecycle ───────────────────────────────────────────────
export { getLifecycleState, isFinalized, finalizeToken, getMigrationState } from './core/lifecycle';

// ─── Batch & Cache ───────────────────────────────────────────
export { batchGetTokenStates, batchGetPendingFees } from './core/batch';
export { RequestCache, withCache } from './core/cache';

// ─── Format Utilities ────────────────────────────────────────
export {
  formatTokenAmount,
  formatEthAmount,
  shortenAddress,
  explorerTxUrl,
  explorerTokenUrl,
  explorerAddressUrl,
  timeAgo,
  formatPercent,
} from './utils/format';

// ─── Validation ──────────────────────────────────────────────
export { validateAddress, validatePositiveAmount, validateSlippageBps } from './core/validation';

// ─── Solana / Meteora DBC ────────────────────────────────────
// Re-export the full Solana module as a namespace
export * as solana from './solana';
