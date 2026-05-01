/**
 * Bonding curve math utilities for Solana/Meteora tokens.
 * Mirrors src/lib/utils/marketcap.ts — the exact same formulas.
 *
 * All functions accept an optional `CurveOverrides` parameter to customize
 * the initial virtual LP, migration threshold, and total supply.
 * If omitted, the Tokena defaults are used (5 SOL LP, 25 SOL migration, 1B supply).
 */

import { TOKENOMICS, TRADING_FEE_PCT } from './constants';

const { INITIAL_LP_SOL, MIGRATION_LP_SOL, TOTAL_SUPPLY, K } = TOKENOMICS;

// ─── Curve Overrides ─────────────────────────────────────────────────────

/**
 * Optional overrides for bonding curve parameters.
 * Pass these to any math function to use custom curve settings.
 */
export interface CurveOverrides {
  /** Initial virtual LP in SOL (default: 5) — sets starting FDV */
  initialLpSol?: number;
  /** Migration threshold in SOL raised (default: 25) */
  migrationLpSol?: number;
  /** Total token supply (default: 1_000_000_000) */
  totalSupply?: number;
}

/** Resolve overrides to concrete values */
function resolve(overrides?: CurveOverrides) {
  const initialLp = overrides?.initialLpSol ?? INITIAL_LP_SOL;
  const migrationLp = overrides?.migrationLpSol ?? MIGRATION_LP_SOL;
  const supply = overrides?.totalSupply ?? TOTAL_SUPPLY;
  const k = initialLp * supply;
  return { initialLp, migrationLp, supply, k };
}

// ─── CORE FORMULA ──────────────────────────────────────────────────────────

/**
 * Market cap in SOL given how much SOL has been raised so far.
 *
 *   mcap_sol = (initial_lp + sol_raised)² / initial_lp
 *
 * @param solRaised - SOL raised so far
 * @param overrides - Optional custom curve params
 */
export function getMcapSol(solRaised: number, overrides?: CurveOverrides): number {
  const { initialLp } = resolve(overrides);
  const v = initialLp + solRaised;
  return (v * v) / initialLp;
}

/**
 * Market cap in USD.
 */
export function getMcapUsd(solRaised: number, solPriceUsd: number, overrides?: CurveOverrides): number {
  return getMcapSol(solRaised, overrides) * solPriceUsd;
}

/**
 * Price per token in USD.
 */
export function getTokenPriceUsd(solRaised: number, solPriceUsd: number, overrides?: CurveOverrides): number {
  const { supply } = resolve(overrides);
  return getMcapUsd(solRaised, solPriceUsd, overrides) / supply;
}

/**
 * Price per token in SOL.
 */
export function getTokenPriceSol(solRaised: number, overrides?: CurveOverrides): number {
  const { initialLp, k } = resolve(overrides);
  const v = initialLp + solRaised;
  return (v * v) / k;
}

// ─── MIGRATION ────────────────────────────────────────────────────────────

/**
 * Migration progress 0–100%.
 *
 * @param solRaised - SOL raised so far
 * @param overrides - Optional custom curve params (uses migrationLpSol)
 */
export function getMigrationProgress(solRaised: number, overrides?: CurveOverrides): number {
  const { migrationLp } = resolve(overrides);
  return Math.min((solRaised / migrationLp) * 100, 100);
}

// ─── REVERSE LOOKUPS ─────────────────────────────────────────────────────

/**
 * Given a USD market cap, return the implied sol_raised.
 *
 *   sol_raised = sqrt(mcap_usd / sol_price × initial_lp) - initial_lp
 */
export function getSolRaisedFromMcapUsd(
  mcapUsd: number,
  solPriceUsd: number,
  overrides?: CurveOverrides
): number {
  const { initialLp } = resolve(overrides);
  const mcapSol = mcapUsd / solPriceUsd;
  return Math.sqrt(mcapSol * initialLp) - initialLp;
}

/**
 * Tokens sold at a given sol_raised level.
 *
 *   tokens_sold = total_supply - (k / virtual_sol)
 */
export function getTokensSold(solRaised: number, overrides?: CurveOverrides): number {
  const { initialLp, supply, k } = resolve(overrides);
  const virtualSol = initialLp + solRaised;
  return supply - k / virtualSol;
}

// ─── OFF-CHAIN QUOTES ────────────────────────────────────────────────────

/**
 * Off-chain buy quote.
 * Returns tokens out, new mcap USD, price impact.
 *
 * @param solIn - SOL amount to spend
 * @param currentSolRaised - Current SOL raised in the pool
 * @param solPriceUsd - Current SOL/USD price
 * @param overrides - Optional custom curve params
 */
export function quoteBuyOffchain(
  solIn: number,
  currentSolRaised: number,
  solPriceUsd: number,
  overrides?: CurveOverrides
): {
  tokensOut: number;
  newMcapUsd: number;
  newPriceUsd: number;
  priceImpact: number;
  feeSol: number;
} {
  const { initialLp, k } = resolve(overrides);

  const feeSol = solIn * TRADING_FEE_PCT;
  const solInNet = solIn - feeSol;

  const vSol = initialLp + currentSolRaised;
  const vTokens = k / vSol;

  const newVSol = vSol + solInNet;
  const newVTokens = k / newVSol;
  const tokensOut = vTokens - newVTokens;

  const oldMcap = getMcapUsd(currentSolRaised, solPriceUsd, overrides);
  const newSolRaised = currentSolRaised + solInNet;
  const newMcapUsd = getMcapUsd(newSolRaised, solPriceUsd, overrides);
  const priceImpact = (newMcapUsd - oldMcap) / oldMcap;

  return {
    tokensOut,
    newMcapUsd,
    newPriceUsd: getTokenPriceUsd(newSolRaised, solPriceUsd, overrides),
    priceImpact,
    feeSol,
  };
}

/**
 * Off-chain sell quote.
 *
 * @param tokensIn - Token amount to sell
 * @param currentSolRaised - Current SOL raised in the pool
 * @param solPriceUsd - Current SOL/USD price
 * @param overrides - Optional custom curve params
 */
export function quoteSellOffchain(
  tokensIn: number,
  currentSolRaised: number,
  solPriceUsd: number,
  overrides?: CurveOverrides
): {
  solOut: number;
  newMcapUsd: number;
  newPriceUsd: number;
  priceImpact: number;
  feeSol: number;
} {
  const { initialLp, k } = resolve(overrides);

  const vSol = initialLp + currentSolRaised;
  const vTokens = k / vSol;

  const newVTokens = vTokens + tokensIn;
  const newVSol = k / newVTokens;
  const rawSolOut = vSol - newVSol;

  const feeSol = rawSolOut * TRADING_FEE_PCT;
  const solOut = rawSolOut - feeSol;

  const newSolRaised = Math.max(0, currentSolRaised - rawSolOut);
  const oldMcap = getMcapUsd(currentSolRaised, solPriceUsd, overrides);
  const newMcapUsd = getMcapUsd(newSolRaised, solPriceUsd, overrides);
  const priceImpact = (oldMcap - newMcapUsd) / oldMcap;

  return {
    solOut,
    newMcapUsd,
    newPriceUsd: getTokenPriceUsd(newSolRaised, solPriceUsd, overrides),
    priceImpact,
    feeSol,
  };
}

// ─── SOL PRICE FETCHING ──────────────────────────────────────────────────

let _price = 150;
let _fetchedAt = 0;
const TTL = 60_000;

/**
 * Cached SOL price from CoinGecko. Refreshes every 60s.
 */
export async function getCachedSolPrice(): Promise<number> {
  if (Date.now() - _fetchedAt < TTL) return _price;
  try {
    const r = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
    );
    const d = await r.json();
    _price = d.solana.usd;
    _fetchedAt = Date.now();
  } catch { /* keep stale */ }
  return _price;
}
