import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getDbcClient } from './client';
import { TOKENOMICS } from './constants';
import { getMcapSol } from './math';

// ─── Types ───────────────────────────────────────────────────

export interface SolanaPoolState {
  /** Token mint address */
  mintAddress: string;
  /** SOL raised (quote reserve) */
  solRaised: number;
  /** SOL threshold for migration */
  migrationThreshold: number;
  /** Migration progress 0–100% */
  migrationProgress: number;
  /** Whether the pool has migrated to DEX */
  isMigrated: boolean;
  /** Meteora pool address (if available) */
  meteoraPoolAddress: string | null;
  /** Current price in SOL per token */
  currentPrice: number;
  /** Market cap in SOL */
  marketCapSol: number;
  /** Total supply (human-readable) */
  totalSupply: number;
  /** Tokens available for purchase */
  tokensAvailable: number;
}

// ─── Validation ──────────────────────────────────────────────

function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

// ─── Pool State ──────────────────────────────────────────────

/**
 * Fetch pool state using the Meteora SDK's StateService.
 * Mirrors src/lib/meteora/pool-state.ts → getPoolState()
 *
 * @param poolAddress - Meteora DBC pool address
 * @param connection - Solana Connection
 */
export async function getPoolState(
  poolAddress: string,
  connection: Connection
): Promise<SolanaPoolState> {
  if (!isValidSolanaAddress(poolAddress)) {
    throw new Error(`Invalid pool address: ${poolAddress}`);
  }

  const client = getDbcClient(connection);
  const pool = new PublicKey(poolAddress);
  const state = await (client as any).state.getPool(pool);

  if (!state) {
    throw new Error(`Pool not found: ${poolAddress}`);
  }

  // Parse quote reserve (SOL in the bonding curve)
  const quoteReserve = state.quoteReserve
    ? Number(state.quoteReserve.toString()) / LAMPORTS_PER_SOL
    : 0;

  // Get config to read migration threshold
  let migrationThreshold = 0;
  try {
    const config = await (client as any).state.getPoolConfig(state.config);
    if (config) {
      migrationThreshold = config.migrationQuoteThreshold
        ? Number(config.migrationQuoteThreshold.toString()) / LAMPORTS_PER_SOL
        : 0;
    }
  } catch { /* Config might not be readable */ }

  const progress = migrationThreshold > 0
    ? Math.min((quoteReserve / migrationThreshold) * 100, 100)
    : 0;

  const isMigrated = migrationThreshold > 0 && quoteReserve >= migrationThreshold;

  const totalSupplyRaw = state.totalBaseSupply
    ? Number(state.totalBaseSupply.toString()) / 1e6
    : 0;

  // Derive price from sqrt price (Q64 fixed-point)
  let currentPrice = 0;
  if (state.sqrtPrice) {
    const sqrtPriceNum = Number(state.sqrtPrice.toString()) / (2 ** 64);
    currentPrice = sqrtPriceNum * sqrtPriceNum * (1e6 / LAMPORTS_PER_SOL);
  }

  return {
    mintAddress: state.baseMint?.toString() ?? '',
    solRaised: quoteReserve,
    migrationThreshold,
    migrationProgress: progress,
    isMigrated,
    meteoraPoolAddress: null,
    currentPrice,
    marketCapSol: currentPrice * totalSupplyRaw,
    totalSupply: totalSupplyRaw,
    tokensAvailable: 0,
  };
}

/**
 * Lightweight on-chain market cap fetch.
 * Uses the bonding curve formula: mcap_sol = (INITIAL_LP + solRaised)² / INITIAL_LP
 *
 * @param poolAddress - Meteora DBC pool address
 * @param connection - Solana Connection
 * @param solPriceUsd - Current SOL price in USD
 */
export async function getOnChainMcap(
  poolAddress: string,
  connection: Connection,
  solPriceUsd: number
): Promise<{ solRaised: number; marketCapSol: number; marketCapUsd: number } | null> {
  if (!isValidSolanaAddress(poolAddress)) return null;

  try {
    const client = getDbcClient(connection);
    const pool = new PublicKey(poolAddress);
    const state = await (client as any).state.getPool(pool);
    if (!state) return null;

    const solRaised = state.quoteReserve
      ? Number(state.quoteReserve.toString()) / LAMPORTS_PER_SOL
      : 0;

    const marketCapSol = getMcapSol(solRaised);
    const marketCapUsd = marketCapSol * solPriceUsd;

    return { solRaised, marketCapSol, marketCapUsd };
  } catch (err) {
    console.error('getOnChainMcap error:', err);
    return null;
  }
}

/**
 * Poll pool state every N seconds.
 * Returns an unsubscribe function.
 *
 * @param poolAddress - Meteora DBC pool address
 * @param connection - Solana Connection
 * @param onUpdate - Callback with latest pool state
 * @param intervalMs - Poll interval in milliseconds (default: 10000)
 */
export function startPoolStatePolling(
  poolAddress: string,
  connection: Connection,
  onUpdate: (state: SolanaPoolState) => void,
  intervalMs = 10000
): () => void {
  let running = true;

  const poll = async () => {
    if (!running) return;
    try {
      const state = await getPoolState(poolAddress, connection);
      if (running) onUpdate(state);
    } catch (err) {
      console.error('Pool state poll error:', err);
    }
  };

  poll(); // immediate first call
  const id = setInterval(poll, intervalMs);

  return () => {
    running = false;
    clearInterval(id);
  };
}
