/**
 * Solana / Meteora DBC module for the Tokena SDK.
 *
 * Provides the same bonding curve functionality as the EVM module,
 * but built on Solana using Meteora's Dynamic Bonding Curve SDK.
 */

// ─── Constants ───────────────────────────────────────────────
export {
  METEORA_DBC_PROGRAM_ID,
  PLATFORM_FEE_WALLET,
  TOKEN_DECIMALS,
  DEFAULT_TOTAL_SUPPLY,
  CREATION_FEE_SOL,
  TRADING_FEE_PCT,
  PLATFORM_FEE_BPS,
  TOKENOMICS,
  METEORA_PROTOCOL_CUT,
  LP_SHARE,
} from './constants';

// ─── Connection ──────────────────────────────────────────────
export { getSolanaConnection, confirmTx, clearSolanaConnection } from './connection';

// ─── Client ──────────────────────────────────────────────────
export { getDbcClient, clearDbcClient } from './client';

// ─── Math / Bonding Curve ────────────────────────────────────
export type { CurveOverrides } from './math';
export {
  getMcapSol,
  getMcapUsd,
  getTokenPriceUsd,
  getTokenPriceSol,
  getMigrationProgress,
  getSolRaisedFromMcapUsd,
  getTokensSold,
  quoteBuyOffchain,
  quoteSellOffchain,
  getCachedSolPrice,
} from './math';

// ─── Pool State ──────────────────────────────────────────────
export type { SolanaPoolState } from './pool-state';
export { getPoolState, getOnChainMcap, startPoolStatePolling } from './pool-state';

// ─── Trading ─────────────────────────────────────────────────
export type {
  SolanaTradeParams,
  SolanaBuyParams,
  SolanaSellParams,
  SolanaTradeResult,
  TradeCallbacks,
} from './trading';
export { buyTokens, sellTokens } from './trading';

// ─── Fee Claiming ────────────────────────────────────────────
export type { ClaimFeesParams, ClaimFeesResult, ClaimableInfo } from './fees';
export { getClaimableFee, getClaimableFeesForPools, claimCreatorFees } from './fees';

// ─── Token Launch ────────────────────────────────────────────
export type { LaunchTokenParams, LaunchTokenResult, LaunchCallbacks } from './launch';
export { launchToken } from './launch';
