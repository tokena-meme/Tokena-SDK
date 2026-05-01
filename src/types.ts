// ─── Chain Configuration ─────────────────────────────────────

export interface ChainConfig {
  /** Numeric chain ID (e.g. 1 for Ethereum mainnet) */
  chainId: number;
  /** Human-readable chain name */
  name: string;
  /** Short abbreviation (e.g. "ETH", "BSC") */
  shortName: string;
  /** JSON-RPC endpoint URL */
  rpcUrl: string;
  /** Block explorer base URL */
  explorerUrl: string;
  /** Native currency metadata */
  nativeCurrency: { name: string; symbol: string; decimals: number };
  /** Deployed TokenFactory contract address */
  factoryAddress: string;
}

// ─── Token State ─────────────────────────────────────────────

export interface TokenState {
  /** Raw price in wei (PRECISION = 1e18) */
  currentPrice: string;
  /** Human-readable price in ETH */
  currentPriceEth: number;
  /** Contract ETH balance (total, including pending fees) */
  ethBalance: number;
  /** AMM ETH reserve only (excludes pending fees) */
  ammEthReserve: number;
  /** Tokens held by the contract (available reserve) */
  tokenReserve: number;
  /** ETH threshold required to trigger finalization */
  ethThreshold: number;
  /** Whether the threshold has been reached */
  thresholdReached: boolean;
  /** Whether Uniswap liquidity has been added (auto-migration complete) */
  finalized: boolean;
  /** Migration fee percentage (0-5) */
  migrationFeePercent: number;
  /** Uniswap pair address (or zero address if not created) */
  uniswapPair: string;
  /** Whether this is a tax token */
  isTaxToken: boolean;
  /** Total token supply */
  totalSupply: number;
  /** Token name */
  name: string;
  /** Token symbol */
  symbol: string;
  /** Token decimals */
  decimals: number;
  /** Dev wallet address */
  devWallet: string;
  /** Dev buy fee percent (0-25) */
  devBuyFeePercent: number;
  /** Dev sell fee percent (0-25) */
  devSellFeePercent: number;
  /** Marketing wallet address */
  marketingWallet: string;
  /** Marketing buy fee percent (0-25) */
  marketingBuyFeePercent: number;
  /** Marketing sell fee percent (0-25) */
  marketingSellFeePercent: number;
}

/** Enriched state with computed fields for convenience. */
export interface EnrichedTokenState extends TokenState {
  /** Bonding curve progress as percentage (0–100) */
  progress: number;
  /** Market cap in ETH */
  marketCapEth: number;
  /** ETH remaining to reach threshold */
  remainingEth: number;
  /** Sum of all tax percentages */
  totalTaxPercent: number;
}

// ─── Token Creation ──────────────────────────────────────────

export interface CreateTokenParams {
  /** Token name */
  name: string;
  /** Token ticker symbol */
  symbol: string;
  /** Total supply as a whole-number string (e.g. "1000000000") — 18 decimals are added automatically */
  totalSupply: string;
  /** ETH threshold for finalization (e.g. "5") */
  ethThreshold: string;
  /** Enable dev/marketing tax on buys and sells */
  isTaxToken: boolean;
  /** Dev wallet address (defaults to creator if empty) */
  devWallet?: string;
  /** Dev buy fee percent (0-25) */
  devBuyFeePercent?: number;
  /** Dev sell fee percent (0-25) */
  devSellFeePercent?: number;
  /** Marketing wallet address (defaults to creator if empty) */
  marketingWallet?: string;
  /** Marketing buy fee percent (0-25) */
  marketingBuyFeePercent?: number;
  /** Marketing sell fee percent (0-25) */
  marketingSellFeePercent?: number;
  /** ETH to spend on an initial buy immediately after creation (e.g. "0.1") */
  initialBuyEth?: string;
  /** Virtual ETH for initial pricing (e.g. "1"). 0 or omitted = factory default */
  initialVirtualEth?: string;
}

export interface CreateTokenResult {
  /** Deployed bonding curve token contract address */
  tokenAddress: string;
  /** Transaction hash */
  txHash: string;
}

// ─── Trading ─────────────────────────────────────────────────

export interface TxOptions {
  /** Number of confirmations to wait for (default: 1) */
  confirmations?: number;
  /** Whether to wait for the receipt (default: true). If false, returns txHash immediately. */
  waitForReceipt?: boolean;
  /** Gas limit override */
  gasLimit?: bigint;
  /** Max fee per gas (EIP-1559) */
  maxFeePerGas?: bigint;
  /** Max priority fee per gas (EIP-1559) */
  maxPriorityFeePerGas?: bigint;
}

export interface BuyParams {
  /** Bonding curve token contract address */
  tokenAddress: string;
  /** ETH amount to spend (human-readable, e.g. "0.5") */
  ethAmount: string;
  /** Minimum tokens to receive (slippage protection). Default: "0" */
  minTokens?: string;
  /** Slippage tolerance in basis points (e.g. 500 = 5%). If set, auto-calculates minTokens from quote. */
  slippageBps?: number;
  /** Transaction options */
  txOptions?: TxOptions;
}

export interface SellParams {
  /** Bonding curve token contract address */
  tokenAddress: string;
  /** Token amount to sell (human-readable, e.g. "1000") */
  tokenAmount: string;
  /** Minimum ETH to receive (slippage protection). Default: "0" */
  minEth?: string;
  /** Slippage tolerance in basis points (e.g. 500 = 5%). If set, auto-calculates minEth from quote. */
  slippageBps?: number;
  /** Transaction options */
  txOptions?: TxOptions;
}

export interface TradeResult {
  /** Transaction hash */
  txHash: string;
  /** Estimated amount received (tokens for buy, ETH for sell) — computed pre-trade */
  amountOut: string;
  /** Actual amount received — parsed from on-chain event log */
  actualAmountOut?: string;
  /** Gas used by the transaction */
  gasUsed?: string;
}

export interface BuyQuote {
  /** Estimated tokens the buyer would receive */
  tokensOut: number;
}

export interface SellQuote {
  /** Estimated ETH the seller would receive */
  ethOut: number;
  /** Minimum ETH after applying slippage */
  minEthOut: number;
}

// ─── Trade Preview / Simulation ──────────────────────────────

export interface TradePreview {
  /** Expected output amount (tokens for buy, ETH for sell) */
  expectedOutput: number;
  /** Price impact as a percentage */
  priceImpactPercent: number;
  /** Breakdown of fees */
  fees: {
    platformFee: number;
    devFee: number;
    marketingFee: number;
    totalFee: number;
  };
  /** Estimated price in ETH after the trade */
  priceAfterTrade: number;
  /** Output after maximum slippage tolerance */
  worstCaseOutput: number;
  /** Minimum output to pass as on-chain parameter */
  minimumOutput: number;
}

// ─── Fee Claiming ────────────────────────────────────────────

export interface ClaimResult {
  /** Transaction hash */
  txHash: string;
}

export interface ClaimHistoryEntry {
  /** Wallet that claimed */
  wallet: string;
  /** Amount claimed in ETH */
  amount: number;
  /** Block number the claim occurred in */
  blockNumber: number;
  /** Transaction hash */
  txHash: string;
}

// ─── Factory ─────────────────────────────────────────────────

export interface FactoryConfig {
  /** Company fee percentage */
  companyFeePercent: number;
  /** Token creation fee in ETH (human-readable) */
  creationFee: string;
  /** Maximum allowed fee percentage */
  maxFeePercent: number;
  /** Minimum ETH threshold in ETH (human-readable) */
  minThreshold: string;
  /** Default initial virtual ETH in ETH (human-readable) */
  defaultInitialEth: string;
  /** Total number of projects created */
  projectCount: number;
}

// ─── Discovery ───────────────────────────────────────────────

export interface ProjectInfo {
  /** Token contract address */
  tokenAddress: string;
  /** Token name */
  name: string;
  /** Token symbol */
  symbol: string;
  /** Total supply (formatted) */
  totalSupply: string;
  /** ETH threshold (formatted) */
  ethThreshold: string;
  /** Whether this is a tax token */
  isTaxToken: boolean;
  /** Dev wallet address */
  devWallet: string;
  /** Dev buy fee percent */
  devBuyFeePercent: number;
  /** Dev sell fee percent */
  devSellFeePercent: number;
  /** Marketing wallet address */
  marketingWallet: string;
  /** Marketing buy fee percent */
  marketingBuyFeePercent: number;
  /** Marketing sell fee percent */
  marketingSellFeePercent: number;
  /** Initial virtual ETH (formatted) */
  initialVirtualEth: string;
  /** Initial buy amount (formatted) */
  initialBuyAmount: string;
}

export interface TokenListOptions {
  /** Offset for pagination */
  offset?: number;
  /** Limit for pagination (default: 20) */
  limit?: number;
}

// ─── Creator Profile ─────────────────────────────────────────

export interface CreatorProfile {
  /** Creator wallet address */
  address: string;
  /** Number of tokens created */
  tokenCount: number;
  /** List of tokens created */
  tokens: ProjectInfo[];
}

// ─── Events / Indexing ───────────────────────────────────────

export interface TradeEvent {
  /** Whether this was a buy or sell */
  type: 'buy' | 'sell';
  /** Trader wallet address */
  trader: string;
  /** ETH amount involved */
  ethAmount: number;
  /** Token amount involved */
  tokenAmount: number;
  /** New price after the trade */
  newPrice: number;
  /** Block number */
  blockNumber: number;
  /** Transaction hash */
  txHash: string;
  /** Block timestamp (if available) */
  timestamp?: number;
}

export interface TokenEvent {
  /** Event type */
  type: 'buy' | 'sell' | 'feeClaimed' | 'thresholdReached' | 'liquidityAdded' | 'feesUpdated';
  /** Block number */
  blockNumber: number;
  /** Transaction hash */
  txHash: string;
  /** Event-specific data */
  data: Record<string, unknown>;
}

// ─── Metadata ────────────────────────────────────────────────

export interface TokenMetadata {
  /** Logo URL or IPFS CID */
  logo?: string;
  /** Token description */
  description?: string;
  /** Website URL */
  website?: string;
  /** X / Twitter URL */
  twitter?: string;
  /** Telegram URL */
  telegram?: string;
  /** Discord URL */
  discord?: string;
  /** IPFS hash if metadata is stored on IPFS */
  ipfsHash?: string;
  /** Raw metadata object */
  rawMetadata?: Record<string, unknown>;
}

/**
 * Adapter interface for metadata storage.
 * Host apps implement this to plug in their own metadata backend (Supabase, API, etc.)
 */
export interface MetadataAdapter {
  getTokenMetadata(tokenAddress: string): Promise<TokenMetadata | null>;
  setTokenMetadata?(tokenAddress: string, metadata: TokenMetadata): Promise<void>;
}

// ─── Creator Social Adapter ─────────────────────────────────

/**
 * Adapter interface for social features (follow/unfollow).
 * Host apps implement this with their own database backend.
 */
export interface CreatorAdapter {
  followCreator(follower: string, creator: string): Promise<void>;
  unfollowCreator(follower: string, creator: string): Promise<void>;
  getFollowers(creator: string): Promise<string[]>;
  getFollowing(wallet: string): Promise<string[]>;
  isFollowing(follower: string, creator: string): Promise<boolean>;
}

// ─── Lifecycle ───────────────────────────────────────────────

export type TokenLifecycleStage = 'bonding' | 'threshold_reached' | 'finalized' | 'paused';

export interface LifecycleState {
  /** Current stage of the bonding curve */
  stage: TokenLifecycleStage;
  /** Whether the ETH threshold has been reached */
  thresholdReached: boolean;
  /** Whether trading is paused */
  isPaused: boolean;
  /** Current ETH balance */
  ethBalance: number;
  /** ETH threshold required */
  ethThreshold: number;
  /** Progress as percentage (0–100) */
  progress: number;
  /** Uniswap pair address (set after finalization) */
  uniswapPair: string | null;
  /** Uniswap router address */
  uniswapRouter: string | null;
}

// ─── Cache ───────────────────────────────────────────────────

export interface CacheOptions {
  /** Time-to-live in milliseconds (default: 10000) */
  ttlMs?: number;
  /** Whether to return stale data while revalidating (default: true) */
  staleWhileRevalidate?: boolean;
}

// ─── SDK Config ──────────────────────────────────────────────

export interface TokenaConfig {
  /** Default chain key to use (e.g. "sepolia", "ethereum", "bsc") */
  chainKey: string;
  /** Override or add custom chain configurations */
  chains?: Record<string, ChainConfig>;
  /** Override the factory address for the default chain */
  factoryAddress?: string;
  /** Cache options for RPC requests */
  cache?: CacheOptions;
  /** Metadata adapter for token presentation data */
  metadataAdapter?: MetadataAdapter;
  /** Creator social adapter for follow/unfollow */
  creatorAdapter?: CreatorAdapter;
  /** Enable debug logging */
  debug?: boolean;
}

// ─── Legacy Alias ────────────────────────────────────────────
/** @deprecated Use TokenaConfig instead */
export type AxolotlConfig = TokenaConfig;
