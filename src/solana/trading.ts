import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import BN from 'bn.js';
import { getDbcClient } from './client';
import { confirmTx } from './connection';
import { quoteBuyOffchain, quoteSellOffchain, getCachedSolPrice } from './math';

// ─── Types ───────────────────────────────────────────────────

export interface SolanaTradeParams {
  /** Meteora DBC pool address */
  poolAddress: string;
  /** Token mint address */
  mintAddress: string;
  /** Connected wallet */
  wallet: WalletContextState;
  /** Solana Connection */
  connection: Connection;
  /** Slippage tolerance in basis points (default: 100 = 1%) */
  slippageBps?: number;
  /** Priority fee in SOL for faster inclusion */
  priorityFeeSol?: number;
}

export interface SolanaBuyParams extends SolanaTradeParams {
  /** SOL amount to spend (e.g. 0.5) */
  solAmount: number;
  /** Current SOL raised (for off-chain quote). If omitted, fetched automatically. */
  currentSolRaised?: number;
}

export interface SolanaSellParams extends SolanaTradeParams {
  /** Token amount to sell (human-readable, e.g. 500000) */
  tokenAmount: number;
  /** Current SOL raised (for off-chain quote). If omitted, fetched automatically. */
  currentSolRaised?: number;
}

export interface SolanaTradeResult {
  /** Transaction signature */
  txSignature: string;
  /** Estimated output amount */
  amountOut: number;
  /** Price impact fraction (e.g. 0.02 = 2%) */
  priceImpact: number;
  /** Fee in SOL */
  feeSol: number;
  /** New SOL raised after trade */
  solRaisedAfter: number;
  /** New market cap in USD */
  mcapUsd: number;
  /** New token price in USD */
  tokenPriceUsd: number;
}

// ─── Callbacks ───────────────────────────────────────────────

export interface TradeCallbacks {
  /** Called after trade is confirmed on-chain. Use to record to your database. */
  onTradeComplete?: (result: SolanaTradeResult & {
    type: 'buy' | 'sell';
    mintAddress: string;
    walletAddress: string;
    solAmount: number;
    tokenAmount: number;
  }) => void;
}

// ─── BUY ─────────────────────────────────────────────────────

/**
 * Buy tokens on a Meteora DBC bonding curve.
 * Mirrors src/lib/meteora/trade.ts → buyTokens()
 *
 * @param params - Buy parameters
 * @param callbacks - Optional callbacks for DB recording
 */
export async function buyTokens(
  params: SolanaBuyParams,
  callbacks?: TradeCallbacks
): Promise<SolanaTradeResult> {
  const {
    poolAddress, mintAddress, wallet, connection,
    solAmount, slippageBps = 100,
  } = params;

  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Wallet not connected');
  }

  const client = getDbcClient(connection);
  const pool = new PublicKey(poolAddress);

  const solPriceUsd = await getCachedSolPrice();
  const currentRaised = params.currentSolRaised ?? 0;
  const quote = quoteBuyOffchain(solAmount, currentRaised, solPriceUsd);

  const amountIn = new BN(Math.floor(solAmount * LAMPORTS_PER_SOL));

  // Build swap transaction
  const transaction = await (client as any).pool.swap({
    owner: wallet.publicKey,
    payer: wallet.publicKey,
    pool,
    amountIn,
    minimumAmountOut: new BN(0),
    swapBaseForQuote: false,
    referralTokenAccount: null,
  });

  // Set compute unit limit
  const CU_LIMIT = 400_000;
  transaction.add(ComputeBudgetProgram.setComputeUnitLimit({ units: CU_LIMIT }));

  if (params.priorityFeeSol && params.priorityFeeSol > 0) {
    const microLamports = Math.floor(
      (params.priorityFeeSol * LAMPORTS_PER_SOL * 1_000_000) / CU_LIMIT
    );
    transaction.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports }));
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = wallet.publicKey;

  const txSignature = await wallet.sendTransaction(transaction, connection, {
    skipPreflight: true,
    maxRetries: 3,
  });

  await confirmTx(txSignature, connection);

  const solRaisedAfter = currentRaised + (solAmount - quote.feeSol);

  const result: SolanaTradeResult = {
    txSignature,
    amountOut: quote.tokensOut,
    priceImpact: quote.priceImpact,
    feeSol: quote.feeSol,
    solRaisedAfter,
    mcapUsd: quote.newMcapUsd,
    tokenPriceUsd: quote.newPriceUsd,
  };

  // Fire callback for DB recording
  callbacks?.onTradeComplete?.({
    ...result,
    type: 'buy',
    mintAddress,
    walletAddress: wallet.publicKey.toString(),
    solAmount,
    tokenAmount: quote.tokensOut,
  });

  return result;
}

// ─── SELL ────────────────────────────────────────────────────

/**
 * Sell tokens on a Meteora DBC bonding curve.
 * Mirrors src/lib/meteora/trade.ts → sellTokens()
 *
 * @param params - Sell parameters
 * @param callbacks - Optional callbacks for DB recording
 */
export async function sellTokens(
  params: SolanaSellParams,
  callbacks?: TradeCallbacks
): Promise<SolanaTradeResult> {
  const {
    poolAddress, mintAddress, wallet, connection,
    tokenAmount, slippageBps = 100,
  } = params;

  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Wallet not connected');
  }

  const client = getDbcClient(connection);
  const pool = new PublicKey(poolAddress);
  const amountIn = new BN(Math.floor(tokenAmount * 1e6)); // TOKEN_DECIMALS = 6

  const solPriceUsd = await getCachedSolPrice();
  const currentRaised = params.currentSolRaised ?? 0;
  const quote = quoteSellOffchain(tokenAmount, currentRaised, solPriceUsd);

  // Build swap transaction
  const transaction = await (client as any).pool.swap({
    owner: wallet.publicKey,
    payer: wallet.publicKey,
    pool,
    amountIn,
    minimumAmountOut: new BN(0),
    swapBaseForQuote: true,
    referralTokenAccount: null,
  });

  // Set compute unit limit
  const CU_LIMIT = 400_000;
  transaction.add(ComputeBudgetProgram.setComputeUnitLimit({ units: CU_LIMIT }));

  if (params.priorityFeeSol && params.priorityFeeSol > 0) {
    const microLamports = Math.floor(
      (params.priorityFeeSol * LAMPORTS_PER_SOL * 1_000_000) / CU_LIMIT
    );
    transaction.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports }));
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = wallet.publicKey;

  const txSignature = await wallet.sendTransaction(transaction, connection, {
    skipPreflight: true,
    maxRetries: 3,
  });

  await confirmTx(txSignature, connection);

  const rawSolFromCurve = quote.solOut + quote.feeSol;
  const solRaisedAfter = Math.max(0, currentRaised - rawSolFromCurve);

  const result: SolanaTradeResult = {
    txSignature,
    amountOut: quote.solOut,
    priceImpact: quote.priceImpact,
    feeSol: quote.feeSol,
    solRaisedAfter,
    mcapUsd: quote.newMcapUsd,
    tokenPriceUsd: quote.newPriceUsd,
  };

  // Fire callback for DB recording
  callbacks?.onTradeComplete?.({
    ...result,
    type: 'sell',
    mintAddress,
    walletAddress: wallet.publicKey.toString(),
    solAmount: quote.solOut,
    tokenAmount,
  });

  return result;
}
