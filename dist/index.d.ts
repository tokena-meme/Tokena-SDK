import { JsonRpcProvider, Signer } from 'ethers';

interface ChainConfig {
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
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    /** Deployed TokenFactory contract address */
    factoryAddress: string;
}
interface TokenState {
    /** Raw price in wei (PRECISION = 1e18) */
    currentPrice: string;
    /** Human-readable price in ETH */
    currentPriceEth: number;
    /** Contract ETH balance (total, including pending fees) */
    ethBalance: number;
    /** Tokens held by the contract (available reserve) */
    tokenReserve: number;
    /** ETH threshold required to trigger finalization */
    ethThreshold: number;
    /** Whether the threshold has been reached */
    thresholdReached: boolean;
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
interface EnrichedTokenState extends TokenState {
    /** Bonding curve progress as percentage (0–100) */
    progress: number;
    /** Market cap in ETH */
    marketCapEth: number;
    /** ETH remaining to reach threshold */
    remainingEth: number;
    /** Sum of all tax percentages */
    totalTaxPercent: number;
}
interface CreateTokenParams {
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
interface CreateTokenResult {
    /** Deployed bonding curve token contract address */
    tokenAddress: string;
    /** Transaction hash */
    txHash: string;
}
interface TxOptions {
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
interface BuyParams {
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
interface SellParams {
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
interface TradeResult {
    /** Transaction hash */
    txHash: string;
    /** Estimated amount received (tokens for buy, ETH for sell) — computed pre-trade */
    amountOut: string;
    /** Actual amount received — parsed from on-chain event log */
    actualAmountOut?: string;
    /** Gas used by the transaction */
    gasUsed?: string;
}
interface BuyQuote {
    /** Estimated tokens the buyer would receive */
    tokensOut: number;
}
interface SellQuote {
    /** Estimated ETH the seller would receive */
    ethOut: number;
    /** Minimum ETH after applying slippage */
    minEthOut: number;
}
interface TradePreview {
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
interface ClaimResult {
    /** Transaction hash */
    txHash: string;
}
interface ClaimHistoryEntry {
    /** Wallet that claimed */
    wallet: string;
    /** Amount claimed in ETH */
    amount: number;
    /** Block number the claim occurred in */
    blockNumber: number;
    /** Transaction hash */
    txHash: string;
}
interface FactoryConfig {
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
interface ProjectInfo {
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
interface TokenListOptions {
    /** Offset for pagination */
    offset?: number;
    /** Limit for pagination (default: 20) */
    limit?: number;
}
interface CreatorProfile {
    /** Creator wallet address */
    address: string;
    /** Number of tokens created */
    tokenCount: number;
    /** List of tokens created */
    tokens: ProjectInfo[];
}
interface TradeEvent {
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
interface TokenEvent {
    /** Event type */
    type: 'buy' | 'sell' | 'feeClaimed' | 'thresholdReached' | 'liquidityAdded' | 'feesUpdated';
    /** Block number */
    blockNumber: number;
    /** Transaction hash */
    txHash: string;
    /** Event-specific data */
    data: Record<string, unknown>;
}
interface TokenMetadata {
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
interface MetadataAdapter {
    getTokenMetadata(tokenAddress: string): Promise<TokenMetadata | null>;
    setTokenMetadata?(tokenAddress: string, metadata: TokenMetadata): Promise<void>;
}
/**
 * Adapter interface for social features (follow/unfollow).
 * Host apps implement this with their own database backend.
 */
interface CreatorAdapter {
    followCreator(follower: string, creator: string): Promise<void>;
    unfollowCreator(follower: string, creator: string): Promise<void>;
    getFollowers(creator: string): Promise<string[]>;
    getFollowing(wallet: string): Promise<string[]>;
    isFollowing(follower: string, creator: string): Promise<boolean>;
}
type TokenLifecycleStage = 'bonding' | 'threshold_reached' | 'finalized' | 'paused';
interface LifecycleState {
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
interface CacheOptions {
    /** Time-to-live in milliseconds (default: 10000) */
    ttlMs?: number;
    /** Whether to return stale data while revalidating (default: true) */
    staleWhileRevalidate?: boolean;
}
interface TokenaConfig {
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
/** @deprecated Use TokenaConfig instead */
type AxolotlConfig = TokenaConfig;

/**
 * Main Tokena SDK class.
 *
 * Provides a unified interface for interacting with Tokena bonding curve
 * smart contracts on any supported EVM chain.
 *
 * @example
 * ```typescript
 * import { Tokena } from '@tokena/sdk';
 *
 * const tokena = new Tokena({ chainKey: 'sepolia' });
 *
 * // Read token state
 * const state = await tokena.getTokenState('0x...');
 * console.log(`Price: ${state.currentPriceEth} ETH`);
 *
 * // Preview a buy
 * const preview = await tokena.previewBuy('0x...', 0.5, 500);
 * console.log(`You'll get ~${preview.expectedOutput} tokens`);
 * console.log(`Price impact: ${preview.priceImpactPercent}%`);
 *
 * // Buy tokens with auto-slippage
 * const tx = await tokena.buy({ tokenAddress: '0x...', ethAmount: '0.5', slippageBps: 500 }, signer);
 * console.log(`Bought! TX: ${tx.txHash}`);
 * ```
 */
declare class Tokena {
    private readonly chains;
    private readonly defaultChainKey;
    private readonly cache?;
    private readonly debugMode;
    readonly config: TokenaConfig;
    constructor(config: TokenaConfig);
    private log;
    /** Get the configuration for a chain by key. */
    getChainConfig(chainKey?: string): ChainConfig;
    /** Get a read-only provider for a chain. */
    getProvider(chainKey?: string): JsonRpcProvider;
    /** Get the factory address for a chain. */
    getFactoryAddress(chainKey?: string): string;
    /** Clear cached providers and request cache. */
    clearCache(): void;
    /** Read the full on-chain state of a bonding curve token. */
    getTokenState(tokenAddress: string, chainKey?: string): Promise<TokenState>;
    /** Get enriched token state with computed progress, market cap, etc. */
    getEnrichedTokenState(tokenAddress: string, chainKey?: string): Promise<EnrichedTokenState>;
    /** Get a wallet's token balance. */
    getTokenBalance(tokenAddress: string, walletAddress: string, chainKey?: string): Promise<number>;
    /** Create a new bonding curve token. */
    createToken(params: CreateTokenParams, signer: Signer, chainKey?: string): Promise<CreateTokenResult>;
    /** Get the creation fee required by the factory. */
    getCreationFee(chainKey?: string): Promise<string>;
    /** Get full factory configuration. */
    getFactoryConfig(chainKey?: string): Promise<FactoryConfig>;
    /** Quote a buy (estimated tokens for a given ETH amount). */
    quoteBuy(tokenAddress: string, ethAmount: number, chainKey?: string): Promise<BuyQuote>;
    /** Quote a sell (estimated ETH for a given token amount). */
    quoteSell(tokenAddress: string, tokenAmount: number, slippageBps?: number, chainKey?: string): Promise<SellQuote>;
    /** Buy tokens on a bonding curve. */
    buy(params: BuyParams, signer: Signer, chainKey?: string): Promise<TradeResult>;
    /** Sell tokens on a bonding curve. */
    sell(params: SellParams, signer: Signer, chainKey?: string): Promise<TradeResult>;
    /** Preview a buy with price impact, fees, and worst-case output. */
    previewBuy(tokenAddress: string, ethAmount: number, slippageBps?: number, chainKey?: string): Promise<TradePreview>;
    /** Preview a sell with price impact, fees, and worst-case output. */
    previewSell(tokenAddress: string, tokenAmount: number, slippageBps?: number, chainKey?: string): Promise<TradePreview>;
    /** Estimate gas for a buy transaction. */
    estimateBuyGas(params: BuyParams, signer: Signer, chainKey?: string): Promise<bigint>;
    /** Estimate gas for a sell transaction. */
    estimateSellGas(params: SellParams, signer: Signer, chainKey?: string): Promise<bigint>;
    /** Estimate gas for a token creation transaction. */
    estimateCreateGas(params: CreateTokenParams, signer: Signer, chainKey?: string): Promise<bigint>;
    /** Get pending (claimable) fees for a wallet. */
    getPendingFees(tokenAddress: string, walletAddress: string, chainKey?: string): Promise<number>;
    /** Claim accumulated fees. */
    claimFees(tokenAddress: string, signer: Signer): Promise<ClaimResult>;
    /** Get historical fee claim events for a wallet. */
    getClaimHistory(tokenAddress: string, walletAddress: string, chainKey?: string, lookbackBlocks?: number): Promise<{
        entries: ClaimHistoryEntry[];
        totalClaimed: number;
    }>;
    /** Get total number of tokens created. */
    getTokenCount(chainKey?: string): Promise<number>;
    /** Get a project by its factory index. */
    getTokenByIndex(index: number, chainKey?: string): Promise<ProjectInfo>;
    /** Get a project by its token contract address. */
    getTokenByAddress(tokenAddress: string, chainKey?: string): Promise<{
        id: number;
        project: ProjectInfo;
    }>;
    /** Get all tokens with pagination. */
    getAllTokens(options?: TokenListOptions, chainKey?: string): Promise<ProjectInfo[]>;
    /** Get the newest tokens (most recently created). */
    getNewTokens(limit?: number, chainKey?: string): Promise<ProjectInfo[]>;
    /** Search tokens by name or symbol. */
    searchTokens(query: string, limit?: number, chainKey?: string): Promise<ProjectInfo[]>;
    /** Get all tokens created by a specific wallet. */
    getCreatorTokens(creatorAddress: string, chainKey?: string): Promise<ProjectInfo[]>;
    /** Get a creator's profile. */
    getCreatorProfile(creatorAddress: string, chainKey?: string): Promise<CreatorProfile>;
    /** Get trade history for a token. */
    getTradeHistory(tokenAddress: string, options?: {
        limit?: number;
        lookbackBlocks?: number;
    }, chainKey?: string): Promise<TradeEvent[]>;
    /** Get all events for a token. */
    getTokenEvents(tokenAddress: string, options?: {
        types?: string[];
        lookbackBlocks?: number;
    }, chainKey?: string): Promise<TokenEvent[]>;
    /** Get token creation events from the factory. */
    getCreationEvents(options?: {
        lookbackBlocks?: number;
    }, chainKey?: string): Promise<{
        tokenAddress: string;
        creator: string;
        blockNumber: number;
        txHash: string;
    }[]>;
    /** Get estimated holder count for a token. */
    getHolderCount(tokenAddress: string, lookbackBlocks?: number, chainKey?: string): Promise<number>;
    /** Subscribe to real-time trade events. Returns an unsubscribe function. */
    subscribeTrades(tokenAddress: string, callback: (event: TradeEvent) => void, chainKey?: string): () => void;
    /** Subscribe to new token creation events. Returns an unsubscribe function. */
    subscribeNewTokens(callback: (event: {
        tokenAddress: string;
        name: string;
        symbol: string;
        txHash: string;
    }) => void, chainKey?: string): () => void;
    /** Get token metadata via the configured adapter. */
    getTokenMetadata(tokenAddress: string): Promise<TokenMetadata | null>;
    /** Get the lifecycle state of a bonding curve. */
    getLifecycleState(tokenAddress: string, chainKey?: string): Promise<LifecycleState>;
    /** Check if a token is finalized. */
    isFinalized(tokenAddress: string, chainKey?: string): Promise<boolean>;
    /** Finalize a bonding curve (add liquidity to Uniswap). */
    finalizeToken(tokenAddress: string, signer: Signer): Promise<{
        txHash: string;
    }>;
    /** Get migration/finalization state. */
    getMigrationState(tokenAddress: string, chainKey?: string): Promise<{
        isFinalized: boolean;
        uniswapPair: string | null;
        uniswapRouter: string | null;
        stage: TokenLifecycleStage;
        progress: number;
    }>;
    /** Fetch token states for many tokens at once. */
    batchGetTokenStates(tokenAddresses: string[], chainKey?: string): Promise<Map<string, TokenState>>;
    /** Fetch pending fees for many tokens at once. */
    batchGetPendingFees(tokenAddresses: string[], walletAddress: string, chainKey?: string): Promise<Map<string, number>>;
}
/** @deprecated Use Tokena instead */
declare const Axolotl: typeof Tokena;

/**
 * Base error class for all Tokena SDK errors.
 *
 * @example
 * ```typescript
 * import { TokenaError, SlippageExceededError } from '@tokena/sdk';
 *
 * try {
 *   await tokena.buy(params, signer);
 * } catch (e) {
 *   if (e instanceof SlippageExceededError) {
 *     console.log('Try increasing slippage');
 *   } else if (e instanceof TokenaError) {
 *     console.log(`SDK error [${e.code}]: ${e.message}`);
 *   }
 * }
 * ```
 */
declare class TokenaError extends Error {
    readonly code: string;
    readonly cause?: unknown;
    constructor(message: string, code: string, cause?: unknown);
}
/** Thrown when the wallet has insufficient ETH or token balance for the operation. */
declare class InsufficientBalanceError extends TokenaError {
    constructor(message?: string, cause?: unknown);
}
/** Thrown when the trade would exceed the allowed slippage tolerance. */
declare class SlippageExceededError extends TokenaError {
    constructor(message?: string, cause?: unknown);
}
/** Thrown when the connected chain doesn't match the expected chain. */
declare class ChainMismatchError extends TokenaError {
    constructor(expected: string, actual?: string, cause?: unknown);
}
/** Thrown when a token address is not found or isn't a valid bonding curve. */
declare class TokenNotFoundError extends TokenaError {
    constructor(address: string, cause?: unknown);
}
/** Thrown when trading is paused on a bonding curve contract. */
declare class TradePausedError extends TokenaError {
    constructor(tokenAddress: string, cause?: unknown);
}
/** Thrown when the ETH threshold has already been reached (bonding curve finalized). */
declare class ThresholdAlreadyReachedError extends TokenaError {
    constructor(tokenAddress: string, cause?: unknown);
}
/** Thrown when an Ethereum address is invalid. */
declare class InvalidAddressError extends TokenaError {
    constructor(address: string, label?: string, cause?: unknown);
}
/** Thrown when an amount value is invalid (negative, NaN, empty, etc.). */
declare class InvalidAmountError extends TokenaError {
    constructor(amount: string | number, label?: string, cause?: unknown);
}
/** Thrown when a transaction fails on-chain (reverted, out of gas, etc.). */
declare class TransactionFailedError extends TokenaError {
    readonly txHash?: string;
    constructor(message?: string, txHash?: string, cause?: unknown);
}
/** Thrown when a contract call fails (contract not deployed, wrong ABI, etc.). */
declare class ContractNotFoundError extends TokenaError {
    constructor(address: string, cause?: unknown);
}
/** Thrown when an RPC request fails (timeout, rate limit, network error). */
declare class RpcError extends TokenaError {
    constructor(message?: string, cause?: unknown);
}
/**
 * Wrap a raw ethers/RPC error into a typed TokenaError.
 * This is used internally to translate low-level errors.
 */
declare function wrapError(err: unknown, context?: string): TokenaError;

/**
 * Human-readable ABI for the BondingCurve contract.
 * Covers all read/write functions and events.
 */
declare const BondingCurveABI: readonly ["function name() view returns (string)", "function symbol() view returns (string)", "function decimals() view returns (uint8)", "function totalSupply() view returns (uint256)", "function balanceOf(address account) view returns (uint256)", "function getCurrentPrice() view returns (uint256 price)", "function calculateTokenAmount(uint256 ethAmount) view returns (uint256 tokenAmount)", "function calculateEthAmount(uint256 tokenAmount) view returns (uint256 ethAmount)", "function getAmmEthReserve() view returns (uint256)", "function ethThreshold() view returns (uint256)", "function thresholdReached() view returns (bool)", "function isTaxToken() view returns (bool)", "function companyWallet() view returns (address)", "function creatorWallet() view returns (address)", "function companyFeePercent() view returns (uint256)", "function initialVirtualEth() view returns (uint256)", "function pendingFees(address) view returns (uint256)", "function totalPendingFees() view returns (uint256)", "function PRECISION() view returns (uint256)", "function ZERO_TAX_FEE_BPS() view returns (uint256)", "function ZERO_TAX_CREATOR_BPS() view returns (uint256)", "function ZERO_TAX_COMPANY_BPS() view returns (uint256)", "function maxFeePercent() view returns (uint256)", "function minThreshold() view returns (uint256)", "function owner() view returns (address)", "function paused() view returns (bool)", "function uniswapRouter() view returns (address)", "function uniswapPair() view returns (address)", "function taxInfo() view returns (address devWallet, uint8 devBuyFeePercent, uint8 devSellFeePercent, address marketingWallet, uint8 marketingBuyFeePercent, uint8 marketingSellFeePercent)", "function buy(uint256 minTokens) payable", "function sell(uint256 tokenAmount, uint256 minEth)", "function claimFees()", "function updateFees(uint8 devBuyFee, uint8 devSellFee, uint8 marketingBuyFee, uint8 marketingSellFee)", "function finalize()", "function approve(address spender, uint256 amount) returns (bool)", "function transfer(address to, uint256 amount) returns (bool)", "event Buy(address indexed buyer, uint256 ethAmount, uint256 tokenAmount, uint256 newPrice)", "event Sell(address indexed seller, uint256 tokenAmount, uint256 ethAmount, uint256 newPrice)", "event CompanyFeeTaken(uint256 amount)", "event FeesAccumulated(address indexed wallet, uint256 amount)", "event FeesClaimed(address indexed wallet, uint256 amount)", "event ThresholdReached(uint256 totalEth)", "event LiquidityAdded(uint256 tokenAmount, uint256 ethAmount)", "event FeesUpdated(uint8 devBuyFee, uint8 devSellFee, uint8 marketingBuyFee, uint8 marketingSellFee)"];

/**
 * Human-readable ABI for the TokenFactory contract.
 * Covers all read/write functions and events.
 */
declare const TokenFactoryABI: readonly ["function owner() view returns (address)", "function companyWallet() view returns (address)", "function companyFeePercent() view returns (uint8)", "function creationFee() view returns (uint256)", "function uniswapRouter() view returns (address)", "function maxFeePercent() view returns (uint256)", "function minThreshold() view returns (uint256)", "function defaultInitialEth() view returns (uint256)", "function minVirtualEth() view returns (uint256)", "function projectCount() view returns (uint256)", "function getProjectById(uint256 pid) view returns (tuple(address token, string name, string symbol, uint256 totalSupply, uint256 ethThreshold, bool isTaxToken, address devWallet, uint8 devBuyFeePercent, uint8 devSellFeePercent, address marketingWallet, uint8 marketingBuyFeePercent, uint8 marketingSellFeePercent, uint256 initialVirtualEth, uint256 initialBuyAmount))", "function getProjectByAddress(address token) view returns (uint256 pid, tuple(address token, string name, string symbol, uint256 totalSupply, uint256 ethThreshold, bool isTaxToken, address devWallet, uint8 devBuyFeePercent, uint8 devSellFeePercent, address marketingWallet, uint8 marketingBuyFeePercent, uint8 marketingSellFeePercent, uint256 initialVirtualEth, uint256 initialBuyAmount) proj)", "function createBondingCurve(string name, string symbol, uint256 totalSupply, uint256 ethThreshold, bool isTaxToken, address devWallet, uint8 devBuyFeePercent, uint8 devSellFeePercent, address marketingWallet, uint8 marketingBuyFeePercent, uint8 marketingSellFeePercent, uint256 initialBuyAmount, uint256 initialVirtualEth) payable returns (address)", "function updateCompanyWallet(address newCompanyWallet)", "function updateCreationFee(uint256 newCreationFee)", "function updateCompanyFee(uint256 newCompanyFeePercent)", "function updateUniswapRouter(address newRouter)", "function updateDefaultInitialEth(uint256 newDefaultInitialEth)", "function updateMaxFeePercent(uint256 newMaxFeePercent)", "function updateMinThreshold(uint256 newMinThreshold)", "event BondingCurveCreated(address indexed token, string name, string symbol, uint256 totalSupply, uint256 ethThreshold, bool isTaxToken, address devWallet, uint8 devBuyFeePercent, uint8 devSellFeePercent, address marketingWallet, uint8 marketingBuyFeePercent, uint8 marketingSellFeePercent, uint256 initialVirtualEth, uint256 initialBuyAmount)", "event CompanyWalletUpdated(address indexed oldWallet, address indexed newWallet)", "event CreationFeeUpdated(uint256 oldFee, uint256 newFee)", "event CompanyFeePercentUpdated(uint256 oldPercent, uint256 newPercent)", "event UniswapRouterUpdated(address indexed oldRouter, address indexed newRouter)", "event DefaultInitialEthUpdated(uint256 oldAmount, uint256 newAmount)", "event MinThresholdUpdated(uint256 oldThreshold, uint256 newThreshold)", "event MaxFeePercentUpdated(uint256 oldFee, uint256 newFee)"];

/**
 * Pre-configured chain registry.
 * Users can extend this with custom chains via AxolotlConfig.chains.
 */
declare const DEFAULT_CHAINS: Record<string, ChainConfig>;

/**
 * Get a read-only JSON-RPC provider for a chain.
 * Providers are cached and reused.
 */
declare function getProvider(config: ChainConfig): JsonRpcProvider;
/**
 * Clear the provider cache. Useful if you change RPC URLs at runtime.
 */
declare function clearProviderCache(): void;

/**
 * Read the full on-chain state of a bonding curve token.
 *
 * @param tokenAddress - Deployed BondingCurve contract address
 * @param provider - ethers JsonRpcProvider for the target chain
 * @returns Parsed token state
 */
declare function getTokenState(tokenAddress: string, provider: JsonRpcProvider): Promise<TokenState>;
/**
 * Enrich a raw TokenState with computed convenience fields.
 */
declare function enrichTokenState(state: TokenState): EnrichedTokenState;
/**
 * Get a wallet's token balance.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param walletAddress - Wallet to check
 * @param provider - ethers JsonRpcProvider
 * @returns Human-readable token balance
 */
declare function getTokenBalance(tokenAddress: string, walletAddress: string, provider: JsonRpcProvider): Promise<number>;

/**
 * Create a new bonding curve token via the TokenFactory contract.
 *
 * @param params - Token creation parameters
 * @param factoryAddress - Deployed TokenFactory contract address
 * @param signer - ethers Signer (wallet) to sign the transaction
 * @param provider - Read-only provider for fetching the creation fee
 * @returns Token address and transaction hash
 */
declare function createToken(params: CreateTokenParams, factoryAddress: string, signer: Signer, provider: JsonRpcProvider): Promise<CreateTokenResult>;
/**
 * Get the creation fee required by the factory.
 *
 * @param factoryAddress - TokenFactory contract address
 * @param provider - Read-only provider
 * @returns Creation fee in ETH (human-readable string)
 */
declare function getCreationFee(factoryAddress: string, provider: JsonRpcProvider): Promise<string>;
/**
 * Get full factory configuration.
 *
 * @param factoryAddress - TokenFactory contract address
 * @param provider - Read-only provider
 * @returns Typed factory configuration object
 */
declare function getFactoryConfig(factoryAddress: string, provider: JsonRpcProvider): Promise<FactoryConfig>;

/**
 * Get a quote for buying tokens with ETH (no transaction, read-only).
 *
 * @param tokenAddress - BondingCurve contract address
 * @param ethAmount - ETH to spend (human-readable number)
 * @param provider - Read-only provider
 * @returns Estimated tokens out
 */
declare function quoteBuy(tokenAddress: string, ethAmount: number, provider: JsonRpcProvider): Promise<BuyQuote>;
/**
 * Get a quote for selling tokens for ETH (no transaction, read-only).
 *
 * @param tokenAddress - BondingCurve contract address
 * @param tokenAmount - Tokens to sell (human-readable number)
 * @param slippageBps - Slippage tolerance in basis points (e.g. 500 = 5%)
 * @param provider - Read-only provider
 * @returns Estimated ETH out and minimum after slippage
 */
declare function quoteSell(tokenAddress: string, tokenAmount: number, slippageBps: number, provider: JsonRpcProvider): Promise<SellQuote>;
/**
 * Buy tokens on a bonding curve.
 *
 * If `slippageBps` is provided but `minTokens` is not, the minimum tokens
 * are automatically calculated from a pre-trade quote.
 *
 * @param params - Buy parameters (token address, ETH amount, min tokens, slippage)
 * @param signer - ethers Signer to sign the transaction
 * @param provider - Read-only provider for estimating output
 * @returns Transaction hash, estimated and actual tokens received
 */
declare function buy(params: BuyParams, signer: Signer, provider: JsonRpcProvider): Promise<TradeResult>;
/**
 * Sell tokens on a bonding curve.
 *
 * If `slippageBps` is provided but `minEth` is not, the minimum ETH
 * is automatically calculated from a pre-trade quote.
 *
 * @param params - Sell parameters (token address, token amount, min ETH, slippage)
 * @param signer - ethers Signer to sign the transaction
 * @param provider - Read-only provider for estimating output
 * @returns Transaction hash, estimated and actual ETH received
 */
declare function sell(params: SellParams, signer: Signer, provider: JsonRpcProvider): Promise<TradeResult>;

/**
 * Get the pending (claimable) fees for a wallet on a specific bonding curve.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param walletAddress - Wallet to check
 * @param provider - Read-only provider
 * @returns Claimable amount in ETH
 */
declare function getPendingFees(tokenAddress: string, walletAddress: string, provider: JsonRpcProvider): Promise<number>;
/**
 * Claim accumulated fees from a bonding curve contract.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param signer - Signer for the wallet that has pending fees
 * @returns Transaction hash
 */
declare function claimFees(tokenAddress: string, signer: Signer): Promise<ClaimResult>;
/**
 * Scan historical FeesClaimed events for a wallet on a bonding curve.
 * Paginates in 49,000-block chunks to respect RPC limits.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param walletAddress - Wallet to scan for
 * @param provider - Read-only provider
 * @param lookbackBlocks - How many blocks to scan back (default: 500,000 ≈ 2 months)
 * @returns Array of claim history entries and total claimed in ETH
 */
declare function getClaimHistory(tokenAddress: string, walletAddress: string, provider: JsonRpcProvider, lookbackBlocks?: number): Promise<{
    entries: ClaimHistoryEntry[];
    totalClaimed: number;
}>;

/**
 * Preview a buy trade with full details including price impact, fees, and worst-case output.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param ethAmount - ETH to spend (human-readable)
 * @param slippageBps - Slippage tolerance in basis points (e.g. 500 = 5%)
 * @param provider - Read-only provider
 * @returns Full trade preview
 */
declare function previewBuy(tokenAddress: string, ethAmount: number, slippageBps: number, provider: JsonRpcProvider): Promise<TradePreview>;
/**
 * Preview a sell trade with full details.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param tokenAmount - Tokens to sell (human-readable)
 * @param slippageBps - Slippage tolerance in basis points
 * @param provider - Read-only provider
 * @returns Full trade preview
 */
declare function previewSell(tokenAddress: string, tokenAmount: number, slippageBps: number, provider: JsonRpcProvider): Promise<TradePreview>;

/**
 * Estimate gas for a buy transaction (without executing it).
 *
 * @param params - Buy parameters
 * @param signer - Signer (wallet)
 * @param provider - Read-only provider
 * @returns Estimated gas as bigint
 */
declare function estimateBuyGas(params: BuyParams, signer: Signer, provider: JsonRpcProvider): Promise<bigint>;
/**
 * Estimate gas for a sell transaction (without executing it).
 *
 * @param params - Sell parameters
 * @param signer - Signer (wallet)
 * @param provider - Read-only provider
 * @returns Estimated gas as bigint
 */
declare function estimateSellGas(params: SellParams, signer: Signer, provider: JsonRpcProvider): Promise<bigint>;
/**
 * Estimate gas for a token creation transaction (without executing it).
 *
 * @param params - Creation parameters
 * @param factoryAddress - Factory contract address
 * @param signer - Signer (wallet)
 * @param provider - Read-only provider
 * @returns Estimated gas as bigint
 */
declare function estimateCreateGas(params: CreateTokenParams, factoryAddress: string, signer: Signer, provider: JsonRpcProvider): Promise<bigint>;

/**
 * Offline bonding curve math utilities.
 * These functions operate on a TokenState snapshot without any RPC calls,
 * enabling instant price previews in UIs.
 *
 * NOTE: These are approximations. For exact values, use the on-chain
 * previewBuy() / previewSell() functions in simulation.ts.
 */
/**
 * Calculate the bonding curve price from reserves.
 * Uses the constant-product formula: price = ethReserve / tokenReserve
 */
declare function calculateBondingCurvePrice(ethReserve: number, tokenReserve: number): number;
/**
 * Calculate price impact as a percentage for a given trade size.
 *
 * @param tradeSize - The size of the trade in ETH (for buys) or tokens (for sells)
 * @param reserveSize - The relevant reserve (ETH reserve for sells, token reserve for buys)
 * @returns Price impact percentage (0–100)
 */
declare function calculatePriceImpact(tradeSize: number, reserveSize: number): number;
/**
 * Calculate the minimum acceptable output after slippage.
 *
 * @param amount - Expected output amount
 * @param slippageBps - Slippage tolerance in basis points (e.g. 500 = 5%)
 * @returns Minimum output as a string
 */
declare function calculateSlippageMinimum(amount: number, slippageBps: number): string;
/**
 * Simulate a buy trade against a token state snapshot (offline).
 *
 * Uses constant-product AMM math:
 *   tokensOut = (tokenReserve * ethIn) / (ethReserve + ethIn)
 *
 * @param ethAmount - ETH to spend
 * @param state - Token state snapshot
 * @param slippageBps - Slippage tolerance (default: 500 = 5%)
 * @returns Trade preview with estimated output, impact, and fees
 */
declare function simulateBuy(ethAmount: number, state: TokenState, slippageBps?: number): TradePreview;
/**
 * Simulate a sell trade against a token state snapshot (offline).
 *
 * Uses constant-product AMM math:
 *   ethOut = (ethReserve * tokensIn) / (tokenReserve + tokensIn)
 *
 * @param tokenAmount - Tokens to sell
 * @param state - Token state snapshot
 * @param slippageBps - Slippage tolerance (default: 500 = 5%)
 * @returns Trade preview with estimated output, impact, and fees
 */
declare function simulateSell(tokenAmount: number, state: TokenState, slippageBps?: number): TradePreview;
/**
 * Estimate how many tokens you'd receive for a given ETH amount.
 * Shorthand for simulateBuy().expectedOutput.
 */
declare function estimateTokensForEth(ethAmount: number, state: TokenState): number;
/**
 * Estimate how much ETH you'd receive for selling a given token amount.
 * Shorthand for simulateSell().expectedOutput.
 */
declare function estimateEthForTokens(tokenAmount: number, state: TokenState): number;

/**
 * Get the total number of tokens created via the factory.
 */
declare function getTokenCount(factoryAddress: string, provider: JsonRpcProvider): Promise<number>;
/**
 * Get a single project by its factory index (0-based).
 */
declare function getTokenByIndex(index: number, factoryAddress: string, provider: JsonRpcProvider): Promise<ProjectInfo>;
/**
 * Get a project by its token contract address.
 */
declare function getTokenByAddress(tokenAddress: string, factoryAddress: string, provider: JsonRpcProvider): Promise<{
    id: number;
    project: ProjectInfo;
}>;
/**
 * Get all tokens from the factory with pagination.
 *
 * @param factoryAddress - Factory contract address
 * @param provider - Read-only provider
 * @param options - Pagination options (offset, limit)
 * @returns Array of project info objects
 */
declare function getAllTokens(factoryAddress: string, provider: JsonRpcProvider, options?: TokenListOptions): Promise<ProjectInfo[]>;
/**
 * Get the newest tokens (most recently created).
 * Returns tokens in reverse order (newest first).
 *
 * @param factoryAddress - Factory contract address
 * @param provider - Read-only provider
 * @param limit - Maximum number of tokens to return (default: 10)
 */
declare function getNewTokens(factoryAddress: string, provider: JsonRpcProvider, limit?: number): Promise<ProjectInfo[]>;
/**
 * Search tokens by name or symbol (case-insensitive substring match).
 * Scans all tokens from the factory — best used with caching for large factories.
 *
 * @param query - Search query (matched against name and symbol)
 * @param factoryAddress - Factory contract address
 * @param provider - Read-only provider
 * @param limit - Maximum results (default: 20)
 */
declare function searchTokens(query: string, factoryAddress: string, provider: JsonRpcProvider, limit?: number): Promise<ProjectInfo[]>;

/**
 * Get all tokens created by a specific wallet address.
 *
 * Scans the factory's project list and filters by devWallet.
 * For large factories, consider using caching.
 *
 * @param creatorAddress - Creator wallet address
 * @param factoryAddress - Factory contract address
 * @param provider - Read-only provider
 * @returns Array of tokens created by this address
 */
declare function getCreatorTokens(creatorAddress: string, factoryAddress: string, provider: JsonRpcProvider): Promise<ProjectInfo[]>;
/**
 * Get a creator's profile including their token count and list.
 *
 * @param creatorAddress - Creator wallet address
 * @param factoryAddress - Factory contract address
 * @param provider - Read-only provider
 * @returns Creator profile
 */
declare function getCreatorProfile(creatorAddress: string, factoryAddress: string, provider: JsonRpcProvider): Promise<CreatorProfile>;

/**
 * Get trade history (Buy and Sell events) for a token.
 * Paginates in 49k-block chunks to respect RPC limits.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param provider - Read-only provider
 * @param options - lookbackBlocks (default: 500,000), limit (default: 100)
 * @returns Array of trade events, newest first
 */
declare function getTradeHistory(tokenAddress: string, provider: JsonRpcProvider, options?: {
    lookbackBlocks?: number;
    limit?: number;
}): Promise<TradeEvent[]>;
/**
 * Get all events for a token (buys, sells, fees claimed, threshold reached, etc.).
 *
 * @param tokenAddress - BondingCurve contract address
 * @param provider - Read-only provider
 * @param options - Event types to include, lookback blocks
 * @returns Array of token events
 */
declare function getTokenEvents(tokenAddress: string, provider: JsonRpcProvider, options?: {
    types?: string[];
    lookbackBlocks?: number;
}): Promise<TokenEvent[]>;
/**
 * Get BondingCurveCreated events from the factory.
 *
 * @param factoryAddress - Factory contract address
 * @param provider - Read-only provider
 * @param options - lookbackBlocks (default: 500,000)
 * @returns Array of creation events
 */
declare function getCreationEvents(factoryAddress: string, provider: JsonRpcProvider, options?: {
    lookbackBlocks?: number;
}): Promise<Array<{
    tokenAddress: string;
    creator: string;
    blockNumber: number;
    txHash: string;
}>>;
/**
 * Estimate the number of unique holders for a token by scanning Transfer events.
 * NOTE: This is approximate for public RPCs due to block range limits.
 *
 * @param tokenAddress - Token contract address
 * @param provider - Read-only provider
 * @param lookbackBlocks - Blocks to scan back (default: 500,000)
 * @returns Estimated unique holder count
 */
declare function getHolderCount(tokenAddress: string, provider: JsonRpcProvider, lookbackBlocks?: number): Promise<number>;
/**
 * Subscribe to real-time trade events on a bonding curve.
 * Returns an unsubscribe function.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param provider - Provider (must support event listeners)
 * @param callback - Called with each new trade event
 * @returns Unsubscribe function
 */
declare function subscribeTrades(tokenAddress: string, provider: JsonRpcProvider, callback: (event: TradeEvent) => void): () => void;
/**
 * Subscribe to new token creation events from the factory.
 * Returns an unsubscribe function.
 */
declare function subscribeNewTokens(factoryAddress: string, provider: JsonRpcProvider, callback: (event: {
    tokenAddress: string;
    name: string;
    symbol: string;
    txHash: string;
}) => void): () => void;

/**
 * Default IPFS gateway URL.
 */
declare const DEFAULT_IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs/";
/**
 * Build a full IPFS URL from a CID.
 *
 * @param cid - IPFS content identifier
 * @param gateway - IPFS gateway base URL (default: Pinata)
 * @returns Full URL
 */
declare function ipfsUrl(cid: string, gateway?: string): string;
/**
 * Load JSON metadata from IPFS.
 *
 * @param cid - IPFS content identifier
 * @param gateway - IPFS gateway base URL
 * @returns Parsed JSON metadata
 */
declare function loadFromIpfs(cid: string, gateway?: string): Promise<Record<string, unknown>>;
/**
 * Parse raw IPFS metadata into a TokenMetadata object.
 * Handles common metadata formats.
 */
declare function parseTokenMetadata(raw: Record<string, unknown>, ipfsHash?: string): TokenMetadata;
/**
 * Create a simple metadata adapter that loads metadata from IPFS.
 * The host app provides a function to resolve a token address to an IPFS CID.
 *
 * @param getCid - Function that resolves a token address to an IPFS CID (or null)
 * @param gateway - IPFS gateway URL
 * @returns MetadataAdapter implementation
 */
declare function createIpfsMetadataAdapter(getCid: (tokenAddress: string) => Promise<string | null>, gateway?: string): MetadataAdapter;

/**
 * Get the full lifecycle state of a bonding curve token.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param provider - Read-only provider
 * @returns Lifecycle state including stage, progress, and Uniswap info
 */
declare function getLifecycleState(tokenAddress: string, provider: JsonRpcProvider): Promise<LifecycleState>;
/**
 * Check if a token's bonding curve has been finalized (liquidity added to Uniswap).
 *
 * @param tokenAddress - BondingCurve contract address
 * @param provider - Read-only provider
 * @returns true if finalized
 */
declare function isFinalized(tokenAddress: string, provider: JsonRpcProvider): Promise<boolean>;
/**
 * Trigger finalization of a bonding curve (add liquidity to Uniswap).
 * Can only be called when the threshold has been reached.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param signer - Signer to execute the transaction
 * @returns Transaction hash
 */
declare function finalizeToken(tokenAddress: string, signer: Signer): Promise<{
    txHash: string;
}>;
/**
 * Get the migration/finalization state including liquidity details.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param provider - Read-only provider
 * @returns Migration state
 */
declare function getMigrationState(tokenAddress: string, provider: JsonRpcProvider): Promise<{
    isFinalized: boolean;
    uniswapPair: string | null;
    uniswapRouter: string | null;
    stage: TokenLifecycleStage;
    progress: number;
}>;

declare class RequestCache {
    private cache;
    private ttlMs;
    private staleWhileRevalidate;
    constructor(options?: CacheOptions);
    /**
     * Get a cached value by key. Returns null if not found or expired.
     */
    get<T>(key: string): T | null;
    /**
     * Check if a key exists and is fresh (not expired).
     */
    isFresh(key: string): boolean;
    /**
     * Check if a key exists (may be stale).
     */
    has(key: string): boolean;
    /**
     * Set a cached value.
     */
    set<T>(key: string, value: T): void;
    /**
     * Invalidate a specific key.
     */
    invalidate(key: string): void;
    /**
     * Clear the entire cache.
     */
    clear(): void;
    /**
     * Get the number of entries in the cache.
     */
    get size(): number;
}
/**
 * Wrap any async function with caching.
 * The wrapped function will return cached results when available.
 *
 * @param fn - The async function to cache
 * @param keyFn - Function that generates a cache key from the arguments
 * @param cache - RequestCache instance
 * @returns Cached version of the function
 *
 * @example
 * ```typescript
 * const cachedGetState = withCache(
 *   getTokenState,
 *   (addr, provider) => `state:${addr}`,
 *   new RequestCache({ ttlMs: 5000 })
 * );
 * ```
 */
declare function withCache<TArgs extends unknown[], TResult>(fn: (...args: TArgs) => Promise<TResult>, keyFn: (...args: TArgs) => string, cache: RequestCache): (...args: TArgs) => Promise<TResult>;

/**
 * Fetch token states for many tokens in parallel with concurrency control.
 *
 * @param tokenAddresses - Array of BondingCurve contract addresses
 * @param provider - Read-only provider
 * @param options - Concurrency limit (default: 5), optional cache
 * @returns Map of token address → TokenState
 */
declare function batchGetTokenStates(tokenAddresses: string[], provider: JsonRpcProvider, options?: {
    concurrency?: number;
    cache?: RequestCache;
}): Promise<Map<string, TokenState>>;
/**
 * Fetch pending fees for many tokens in parallel with concurrency control.
 *
 * @param tokenAddresses - Array of BondingCurve contract addresses
 * @param walletAddress - Wallet to check fees for
 * @param provider - Read-only provider
 * @param options - Concurrency limit (default: 5)
 * @returns Map of token address → pending fees (in ETH)
 */
declare function batchGetPendingFees(tokenAddresses: string[], walletAddress: string, provider: JsonRpcProvider, options?: {
    concurrency?: number;
}): Promise<Map<string, number>>;

/**
 * Format a token amount with commas and optional decimal places.
 *
 * @example formatTokenAmount(1234567.89) → "1,234,567.89"
 * @example formatTokenAmount(1234567.89, 0) → "1,234,568"
 */
declare function formatTokenAmount(amount: number, decimals?: number): string;
/**
 * Format an ETH amount with appropriate precision.
 *
 * @example formatEthAmount(0.004238) → "0.0042 ETH"
 * @example formatEthAmount(1.5)      → "1.50 ETH"
 */
declare function formatEthAmount(amount: number, symbol?: string): string;
/**
 * Shorten an Ethereum address for display.
 *
 * @example shortenAddress("0x1234567890abcdef1234567890abcdef12345678") → "0x1234...5678"
 */
declare function shortenAddress(addr: string, chars?: number): string;
/**
 * Build a block explorer URL for a transaction hash.
 */
declare function explorerTxUrl(txHash: string, chain: ChainConfig): string;
/**
 * Build a block explorer URL for a token address.
 */
declare function explorerTokenUrl(addr: string, chain: ChainConfig): string;
/**
 * Build a block explorer URL for a wallet address.
 */
declare function explorerAddressUrl(addr: string, chain: ChainConfig): string;
/**
 * Format a timestamp into a human-readable "time ago" string.
 *
 * @example timeAgo(Date.now() - 3600000) → "1 hour ago"
 */
declare function timeAgo(timestamp: number): string;
/**
 * Format a percentage with appropriate precision.
 *
 * @example formatPercent(45.678) → "45.68%"
 * @example formatPercent(0.001) → "<0.01%"
 */
declare function formatPercent(value: number, decimals?: number): string;

/**
 * Validate that a string is a valid Ethereum address.
 * Throws InvalidAddressError if validation fails.
 */
declare function validateAddress(addr: string, label?: string): void;
/**
 * Validate that an amount is a positive, finite number (string or number).
 * Throws InvalidAmountError if validation fails.
 */
declare function validatePositiveAmount(amount: string | number, label?: string): void;
/**
 * Validate that a slippage value is within reasonable bounds (0–10000 bps = 0–100%).
 * Throws InvalidAmountError if validation fails.
 */
declare function validateSlippageBps(bps: number): void;

export { Axolotl, type AxolotlConfig, BondingCurveABI, type BuyParams, type BuyQuote, type CacheOptions, type ChainConfig, ChainMismatchError, type ClaimHistoryEntry, type ClaimResult, ContractNotFoundError, type CreateTokenParams, type CreateTokenResult, type CreatorAdapter, type CreatorProfile, DEFAULT_CHAINS, DEFAULT_IPFS_GATEWAY, type EnrichedTokenState, type FactoryConfig, InsufficientBalanceError, InvalidAddressError, InvalidAmountError, type LifecycleState, type MetadataAdapter, type ProjectInfo, RequestCache, RpcError, type SellParams, type SellQuote, SlippageExceededError, ThresholdAlreadyReachedError, type TokenEvent, TokenFactoryABI, type TokenLifecycleStage, type TokenListOptions, type TokenMetadata, TokenNotFoundError, type TokenState, Tokena, type TokenaConfig, TokenaError, type TradeEvent, TradePausedError, type TradePreview, type TradeResult, TransactionFailedError, type TxOptions, batchGetPendingFees, batchGetTokenStates, buy, calculateBondingCurvePrice, calculatePriceImpact, calculateSlippageMinimum, claimFees, clearProviderCache, createIpfsMetadataAdapter, createToken, enrichTokenState, estimateBuyGas, estimateCreateGas, estimateEthForTokens, estimateSellGas, estimateTokensForEth, explorerAddressUrl, explorerTokenUrl, explorerTxUrl, finalizeToken, formatEthAmount, formatPercent, formatTokenAmount, getAllTokens, getClaimHistory, getCreationEvents, getCreationFee, getCreatorProfile, getCreatorTokens, getFactoryConfig, getHolderCount, getLifecycleState, getMigrationState, getNewTokens, getPendingFees, getProvider, getTokenBalance, getTokenByAddress, getTokenByIndex, getTokenCount, getTokenEvents, getTokenState, getTradeHistory, ipfsUrl, isFinalized, loadFromIpfs, parseTokenMetadata, previewBuy, previewSell, quoteBuy, quoteSell, searchTokens, sell, shortenAddress, simulateBuy, simulateSell, subscribeNewTokens, subscribeTrades, timeAgo, validateAddress, validatePositiveAmount, validateSlippageBps, withCache, wrapError };
