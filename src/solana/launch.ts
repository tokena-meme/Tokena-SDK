import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import BN from 'bn.js';
import {
  buildCurveWithMarketCap,
  MigrationOption,
  MigrationFeeOption,
  ActivationType,
  TokenType,
  CollectFeeMode,
  BaseFeeMode,
  TokenUpdateAuthorityOption,
} from '@meteora-ag/dynamic-bonding-curve-sdk';
import { getDbcClient } from './client';
import { confirmTx } from './connection';
import {
  PLATFORM_FEE_WALLET,
  TOKEN_DECIMALS,
  CREATION_FEE_SOL,
  METEORA_PROTOCOL_CUT,
  LP_SHARE,
} from './constants';
import { quoteBuyOffchain, getCachedSolPrice } from './math';

// ─── Types ───────────────────────────────────────────────────

export interface LaunchTokenParams {
  /** Token name */
  name: string;
  /** Token ticker symbol */
  symbol: string;
  /** Token description */
  description: string;
  /** Image URL (already uploaded) */
  imageUrl: string;
  /** Metadata URI (IPFS or other) */
  metadataUri: string;
  /** Twitter handle */
  twitter?: string;
  /** Telegram group URL */
  telegram?: string;
  /** Website URL */
  website?: string;
  /** Initial price in SOL (e.g. 0.000001) */
  initialPriceSol: number;
  /** SOL threshold for migration (e.g. 85) */
  migrationThresholdSol: number;
  /** Total supply (e.g. 1_000_000_000) */
  totalSupply: number;
  /** Creator fee percent 0–5% (default: 0) */
  creatorFeePercent?: number;
  /** Initial virtual LP in SOL — sets starting FDV (default: 5 SOL) */
  initialVirtualLpSol?: number;
  /**
   * Migration market cap in SOL — sets the FDV at which the pool graduates.
   * Default: 180 SOL FDV (~25 SOL raised with 5 SOL virtual LP).
   * Formula: migrationThreshold ≈ sqrt(migrationMarketCapSol × initialVirtualLpSol) - initialVirtualLpSol
   */
  migrationMarketCapSol?: number;
  /** Optional initial buy amount in SOL */
  initialBuySol?: number;
  /** Connected wallet */
  wallet: WalletContextState;
  /** Solana Connection */
  connection: Connection;
}

export interface LaunchTokenResult {
  /** Token mint address */
  mintAddress: string;
  /** Pool address */
  poolAddress: string;
  /** Creation transaction signature */
  txSignature: string;
  /** Metadata URI */
  metadataUri: string;
  /** Initial buy transaction signature (if initial buy was done) */
  buyTxSignature?: string;
}

export interface LaunchCallbacks {
  /** Called after token is created (before initial buy) */
  onTokenCreated?: (result: {
    mintAddress: string;
    poolAddress: string;
    txSignature: string;
  }) => void;
  /** Called after initial buy is confirmed */
  onInitialBuyComplete?: (result: {
    mintAddress: string;
    txSignature: string;
    solAmount: number;
    tokensOut: number;
    feeSol: number;
  }) => void;
}

// ─── Launch ──────────────────────────────────────────────────

/**
 * Full token launch flow on Solana via Meteora DBC.
 * Mirrors src/lib/meteora/pool.ts → launchToken()
 *
 * 1. Build curve config via buildCurveWithMarketCap
 * 2. Create config + pool on-chain
 * 3. Optional initial buy in separate transaction
 *
 * @param params - Launch parameters
 * @param callbacks - Optional callbacks for DB recording
 */
export async function launchToken(
  params: LaunchTokenParams,
  callbacks?: LaunchCallbacks
): Promise<LaunchTokenResult> {
  const {
    name, symbol, metadataUri,
    totalSupply, creatorFeePercent = 0,
    wallet, connection,
  } = params;

  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  // Generate keypairs for mint and config
  const baseMintKeypair = Keypair.generate();
  const configKeypair = Keypair.generate();

  const client = getDbcClient(connection);

  // Market cap values — configurable, defaults match frontend
  const initialMarketCap = params.initialVirtualLpSol ?? 5;
  const migrationMarketCap = params.migrationMarketCapSol ?? 180;

  // ─── Fee Calculation ─────────────────────────────────────
  // Meteora takes 20% protocol cut.
  // Base fee: 0.8% to feeClaimer (0.4% creator + 0.4% platform)
  // Creator tax adds on top.
  const basePlatformPct = 0.8;
  const desiredTotalPct = creatorFeePercent + basePlatformPct;
  const inflatedPct = desiredTotalPct / LP_SHARE;
  const totalFeeBps = Math.round(inflatedPct * 100);
  const creatorFeeShare = 100; // 100% of LP fee goes to feeClaimer

  const curveConfig = buildCurveWithMarketCap({
    token: {
      tokenType: TokenType.SPL,
      tokenBaseDecimal: TOKEN_DECIMALS,
      tokenQuoteDecimal: 9, // SOL has 9 decimals
      tokenUpdateAuthority: TokenUpdateAuthorityOption.Immutable,
      totalTokenSupply: totalSupply,
      leftover: 0,
    },
    fee: {
      baseFeeParams: {
        baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
        feeSchedulerParam: {
          startingFeeBps: totalFeeBps,
          endingFeeBps: totalFeeBps,
          numberOfPeriod: 0,
          totalDuration: 0,
        },
      },
      dynamicFeeEnabled: false,
      collectFeeMode: CollectFeeMode.QuoteToken,
      creatorTradingFeePercentage: creatorFeeShare,
      poolCreationFee: 0,
      enableFirstSwapWithMinFee: false,
    },
    migration: {
      migrationOption: MigrationOption.MET_DAMM_V2,
      migrationFeeOption: MigrationFeeOption.FixedBps100,
      migrationFee: {
        feePercentage: 1,
        creatorFeePercentage: 0,
      },
      migratedPoolFee: {
        collectFeeMode: 0,
        dynamicFee: 0,
        poolFeeBps: 0,
      },
    },
    liquidityDistribution: {
      partnerPermanentLockedLiquidityPercentage: 100,
      partnerLiquidityPercentage: 0,
      creatorPermanentLockedLiquidityPercentage: 0,
      creatorLiquidityPercentage: 0,
    },
    lockedVesting: {
      totalLockedVestingAmount: 0,
      numberOfVestingPeriod: 0,
      cliffUnlockAmount: 0,
      totalVestingDuration: 0,
      cliffDurationFromMigrationTime: 0,
    },
    activationType: ActivationType.Slot,
    initialMarketCap,
    migrationMarketCap,
  });

  // ─── Create Config + Pool ────────────────────────────────
  const quoteMint = new PublicKey('So11111111111111111111111111111111111111112');

  const transaction = await (client as any).pool.createConfigAndPool({
    ...curveConfig,
    tokenSupply: null,
    config: configKeypair.publicKey,
    feeClaimer: wallet.publicKey,
    leftoverReceiver: wallet.publicKey,
    quoteMint,
    payer: wallet.publicKey,
    tokenType: TokenType.SPL,
    preCreatePoolParam: {
      name,
      symbol,
      uri: metadataUri,
      baseMint: baseMintKeypair.publicKey,
      payer: wallet.publicKey,
      poolCreator: wallet.publicKey,
      config: configKeypair.publicKey,
    },
  });

  // Assemble transaction
  let txToSign: Transaction;
  if (transaction instanceof Transaction) {
    txToSign = transaction;
  } else {
    txToSign = new Transaction();
    if (transaction.createConfigTx) txToSign.add(transaction.createConfigTx);
    if (transaction.createPoolWithFirstBuyTx) txToSign.add(transaction.createPoolWithFirstBuyTx);
  }

  // Add platform deployment fee (0.01 SOL)
  const feePubkey = new PublicKey(PLATFORM_FEE_WALLET);
  txToSign.add(SystemProgram.transfer({
    fromPubkey: wallet.publicKey,
    toPubkey: feePubkey,
    lamports: CREATION_FEE_SOL * 1e9,
  }));

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  txToSign.recentBlockhash = blockhash;
  txToSign.lastValidBlockHeight = lastValidBlockHeight;
  txToSign.feePayer = wallet.publicKey;

  // TX1: Create config + pool + deployment fee
  const txSignature = await wallet.sendTransaction(txToSign, connection, {
    signers: [configKeypair, baseMintKeypair],
    skipPreflight: true,
    maxRetries: 3,
  });

  await confirmTx(txSignature, connection);

  // Derive pool address
  const { deriveDbcPoolAddress } = await import('@meteora-ag/dynamic-bonding-curve-sdk');
  const poolAddress = deriveDbcPoolAddress(quoteMint, baseMintKeypair.publicKey, configKeypair.publicKey);

  const mintAddress = baseMintKeypair.publicKey.toString();
  const poolAddressStr = poolAddress.toString();

  // Fire token created callback
  callbacks?.onTokenCreated?.({
    mintAddress,
    poolAddress: poolAddressStr,
    txSignature,
  });

  // ─── TX2: Initial Buy ────────────────────────────────────
  const initialBuySol = params.initialBuySol ?? 0;
  let buyTxSignature: string | undefined;

  if (initialBuySol > 0 && wallet.publicKey && wallet.sendTransaction) {
    try {
      const buyAmountLamports = new BN(Math.floor(initialBuySol * LAMPORTS_PER_SOL));

      const swapTx = await (client as any).pool.swap({
        owner: wallet.publicKey,
        payer: wallet.publicKey,
        pool: poolAddress,
        amountIn: buyAmountLamports,
        minimumAmountOut: new BN(0),
        swapBaseForQuote: false,
        referralTokenAccount: null,
      });

      const { blockhash: bh2, lastValidBlockHeight: lvbh2 } =
        await connection.getLatestBlockhash('confirmed');
      swapTx.recentBlockhash = bh2;
      swapTx.lastValidBlockHeight = lvbh2;
      swapTx.feePayer = wallet.publicKey;

      buyTxSignature = await wallet.sendTransaction(swapTx, connection, {
        skipPreflight: true,
        maxRetries: 3,
      });

      await confirmTx(buyTxSignature, connection);

      // Fire initial buy callback
      const solPriceUsd = await getCachedSolPrice();
      const quote = quoteBuyOffchain(initialBuySol, 0, solPriceUsd);

      callbacks?.onInitialBuyComplete?.({
        mintAddress,
        txSignature: buyTxSignature,
        solAmount: initialBuySol,
        tokensOut: quote.tokensOut,
        feeSol: quote.feeSol,
      });
    } catch (err) {
      console.warn('Initial buy failed (pool was created successfully):', err);
    }
  }

  return {
    mintAddress,
    poolAddress: poolAddressStr,
    txSignature,
    metadataUri,
    buyTxSignature,
  };
}
