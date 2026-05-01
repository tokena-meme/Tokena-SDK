/**
 * Solana / Meteora DBC constants.
 * Mirrors src/lib/meteora/constants.ts and src/lib/constants/tokenomics.ts
 */

// ─── Program / Platform ──────────────────────────────────────
export const METEORA_DBC_PROGRAM_ID = 'dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN';
export const PLATFORM_FEE_WALLET = 'feeDwGK7o1wn57VUtbMqBAnc9UBLeeywUHNvqoqGuKW';

// ─── Token Defaults ──────────────────────────────────────────
export const TOKEN_DECIMALS = 6;
export const DEFAULT_TOTAL_SUPPLY = 1_000_000_000;
export const CREATION_FEE_SOL = 0.01;

// ─── Fee Structure ───────────────────────────────────────────
/**
 * Trading fee (1%) — charged on every buy/sell by the Meteora pool.
 *   0.2% → Meteora protocol (20% of total)
 *   0.8% → feeClaimer (80% of total)
 *     of which: 0.4% creator + 0.4% platform (split at claim time)
 */
export const TRADING_FEE_PCT = 0.01;
export const PLATFORM_FEE_BPS = 40; // 0.4% platform share

// ─── Bonding Curve Tokenomics ────────────────────────────────
/**
 * Bonding curve formula constants.
 *   K = INITIAL_LP_SOL × TOTAL_SUPPLY
 *   mcap_sol = (INITIAL_LP + solRaised)² / INITIAL_LP
 */
export const TOKENOMICS = {
  TOTAL_SUPPLY: 1_000_000_000,
  TOKEN_DECIMALS: 6,
  INITIAL_LP_SOL: 5,
  MIGRATION_LP_SOL: 25,
  K: 5_000_000_000, // INITIAL_LP_SOL × TOTAL_SUPPLY
} as const;

// ─── Meteora Fee Config ──────────────────────────────────────
/**
 * Meteora takes 20% protocol cut from all trading fees.
 * Only 80% reaches the feeClaimer.
 * To get desired effective fee, inflate: desired / 0.8
 */
export const METEORA_PROTOCOL_CUT = 0.20;
export const LP_SHARE = 1 - METEORA_PROTOCOL_CUT; // 0.80
