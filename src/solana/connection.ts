import { Connection, Commitment } from '@solana/web3.js';

/**
 * Solana connection factory with singleton caching.
 * Mirrors src/lib/solana/connection.ts
 */

let _connection: Connection | null = null;
let _lastUrl: string | null = null;

/**
 * Get or create a Solana Connection.
 * Reuses existing connection if the URL hasn't changed.
 *
 * @param rpcUrl - Solana JSON-RPC endpoint
 * @param commitment - Transaction commitment level (default: 'confirmed')
 */
export function getSolanaConnection(
  rpcUrl: string,
  commitment: Commitment = 'confirmed'
): Connection {
  if (_connection && _lastUrl === rpcUrl) return _connection;

  _connection = new Connection(rpcUrl, {
    commitment,
    wsEndpoint: rpcUrl.replace('https', 'wss').replace('http', 'ws'),
    confirmTransactionInitialTimeout: 60000,
    disableRetryOnRateLimit: false,
  });
  _lastUrl = rpcUrl;
  return _connection;
}

/**
 * Confirm a transaction with timeout + retry.
 *
 * @param signature - Transaction signature
 * @param connection - Solana Connection
 * @param maxRetries - Max retry attempts (default: 5)
 */
export async function confirmTx(
  signature: string,
  connection: Connection,
  maxRetries = 5
): Promise<boolean> {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const result = await connection.confirmTransaction(signature, 'confirmed');
      if (result.value.err) {
        throw new Error(`Transaction failed on-chain: ${JSON.stringify(result.value.err)}`);
      }
      return true;
    } catch {
      retries++;
      await new Promise((r) => setTimeout(r, 2000 * retries));
    }
  }
  throw new Error(`Could not confirm tx after ${maxRetries} retries: ${signature}`);
}

/**
 * Clear the cached connection.
 */
export function clearSolanaConnection(): void {
  _connection = null;
  _lastUrl = null;
}
