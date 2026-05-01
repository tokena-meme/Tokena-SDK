import { Connection, Commitment } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

/**
 * Singleton DynamicBondingCurveClient wrapper.
 * Mirrors src/lib/meteora/client.ts
 *
 * The client exposes sub-services:
 *   client.pool     – PoolService    (createPool, swap, swapQuote, etc.)
 *   client.creator  – CreatorService (claimCreatorTradingFee, etc.)
 *   client.state    – StateService   (getPool, getPoolConfig, etc.)
 *   client.partner  – PartnerService
 *   client.migration – MigrationService
 */

let _client: DynamicBondingCurveClient | null = null;
let _lastConnectionId: string | null = null;

/**
 * Get or create a singleton DynamicBondingCurveClient.
 *
 * @param connection - Solana Connection
 * @param commitment - Transaction commitment (default: 'confirmed')
 */
export function getDbcClient(
  connection: Connection,
  commitment: Commitment = 'confirmed'
): DynamicBondingCurveClient {
  // Simple cache key — reuse if same connection endpoint
  const connId = (connection as any)._rpcEndpoint ?? 'default';
  if (_client && _lastConnectionId === connId) return _client;

  _client = new DynamicBondingCurveClient(connection, commitment);
  _lastConnectionId = connId;
  return _client;
}

/**
 * Clear the cached client.
 */
export function clearDbcClient(): void {
  _client = null;
  _lastConnectionId = null;
}
