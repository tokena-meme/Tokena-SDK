import * as react_jsx_runtime from 'react/jsx-runtime';
import React from 'react';
import { JsonRpcProvider, Signer, JsonRpcSigner } from 'ethers';

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

/**
 * React context provider for the Tokena SDK.
 *
 * @example
 * ```tsx
 * import { TokenaProvider } from '@tokena/sdk/react';
 *
 * function App() {
 *   return (
 *     <TokenaProvider chainKey="sepolia">
 *       <MyTokenApp />
 *     </TokenaProvider>
 *   );
 * }
 * ```
 */
declare function TokenaProvider({ children, ...config }: TokenaConfig & {
    children: React.ReactNode;
}): react_jsx_runtime.JSX.Element;
/**
 * Access the Tokena SDK instance from context.
 * Must be used inside a TokenaProvider.
 */
declare function useTokena(): Tokena;
/** @deprecated Use TokenaProvider instead */
declare const AxolotlProvider: typeof TokenaProvider;
/** @deprecated Use useTokena instead */
declare const useAxolotl: typeof useTokena;

/**
 * React hook for managing MetaMask wallet connection.
 *
 * @param targetChain - Optional chain config to auto-switch to on connect
 *
 * @example
 * ```tsx
 * const { address, connect, disconnect, getSigner } = useTokenaWallet();
 * ```
 */
declare function useTokenaWallet(targetChain?: ChainConfig): {
    connect: () => Promise<void>;
    disconnect: () => void;
    getSigner: () => Promise<JsonRpcSigner | null>;
    /** Connected wallet address */
    address: string | null;
    /** Formatted native currency balance */
    balance: string | null;
    /** Whether a wallet is connected */
    connected: boolean;
    /** Current chain ID */
    chainId: number | null;
    /** Whether connection is in progress */
    connecting: boolean;
    /** Last error message */
    error: string | null;
};
/** @deprecated Use useTokenaWallet instead */
declare const useAxolotlWallet: typeof useTokenaWallet;

/**
 * React hook that polls the on-chain state of a bonding curve token.
 *
 * @param tokenAddress - BondingCurve contract address (null to skip)
 * @param chainKey - Optional chain key override
 * @param pollInterval - Polling interval in ms (default: 10000)
 *
 * @example
 * ```tsx
 * const { state, isLoading, error, refresh } = usePoolState('0x...');
 * if (state) console.log(`Price: ${state.currentPriceEth} ETH`);
 * ```
 */
declare function usePoolState(tokenAddress: string | null, chainKey?: string, pollInterval?: number): {
    state: TokenState | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};

/**
 * React hook for executing trades on a bonding curve.
 *
 * @param chainKey - Optional chain key override
 *
 * @example
 * ```tsx
 * const { quoteBuy, previewBuy, buy, loading, error } = useTrade();
 *
 * const preview = await previewBuy('0xToken', 0.5, 500);
 * console.log(`Impact: ${preview.priceImpactPercent}%`);
 *
 * await buy({ tokenAddress: '0xToken', ethAmount: '0.5', slippageBps: 500 }, signer);
 * ```
 */
declare function useTrade(chainKey?: string): {
    quoteBuy: (tokenAddress: string, ethAmount: number) => Promise<BuyQuote>;
    quoteSell: (tokenAddress: string, tokenAmount: number, slippageBps?: number) => Promise<SellQuote>;
    previewBuy: (tokenAddress: string, ethAmount: number, slippageBps?: number) => Promise<TradePreview>;
    previewSell: (tokenAddress: string, tokenAmount: number, slippageBps?: number) => Promise<TradePreview>;
    buy: (params: BuyParams, signer: Signer) => Promise<TradeResult | null>;
    sell: (params: SellParams, signer: Signer) => Promise<TradeResult | null>;
    loading: boolean;
    error: string | null;
};

/**
 * React hook for managing fee claiming across multiple bonding curve tokens.
 *
 * @param tokenAddresses - Array of BondingCurve contract addresses to check
 * @param walletAddress - Wallet address to check pending fees for
 * @param chainKey - Optional chain key override
 *
 * @example
 * ```tsx
 * const { claimableMap, totalClaimable, claim, loading } = useClaimFees(
 *   ['0xToken1', '0xToken2'],
 *   '0xMyWallet'
 * );
 * ```
 */
declare function useClaimFees(tokenAddresses: string[], walletAddress: string | null | undefined, chainKey?: string): {
    claimableMap: Record<string, number>;
    totalClaimedMap: Record<string, number>;
    totalClaimable: number;
    totalClaimed: number;
    claim: (tokenAddress: string, signer: Signer) => Promise<ClaimResult | null>;
    claimingToken: string | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};

/**
 * Enhanced React hook for polling bonding curve token state.
 * Returns both raw and enriched state (with progress, marketCap, etc.).
 *
 * @param tokenAddress - BondingCurve contract address (null to skip)
 * @param options - Poll interval, whether to include enriched data
 *
 * @example
 * ```tsx
 * const { state, enriched, isLoading, error, refresh } = useTokenState('0x...');
 * console.log(`Progress: ${enriched?.progress}%`);
 * console.log(`Market Cap: ${enriched?.marketCapEth} ETH`);
 * ```
 */
declare function useTokenState(tokenAddress: string | null, options?: {
    pollInterval?: number;
    chainKey?: string;
}): {
    state: TokenState | null;
    enriched: EnrichedTokenState | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};

/**
 * Auto-debounced buy quote hook. Updates the preview as the user types.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param ethAmount - ETH amount to preview (updates trigger debounced re-quote)
 * @param options - slippage, debounce delay, chain key
 *
 * @example
 * ```tsx
 * const { preview, isLoading, error } = useQuoteBuy('0xToken', parseFloat(input), { slippageBps: 500 });
 * if (preview) console.log(`You'll get ${preview.expectedOutput} tokens`);
 * ```
 */
declare function useQuoteBuy(tokenAddress: string | null, ethAmount: number, options?: {
    slippageBps?: number;
    debounceMs?: number;
    chainKey?: string;
}): {
    preview: TradePreview | null;
    isLoading: boolean;
    error: string | null;
};

/**
 * Auto-debounced sell quote hook. Updates the preview as the user types.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param tokenAmount - Token amount to preview
 * @param options - slippage, debounce delay, chain key
 *
 * @example
 * ```tsx
 * const { preview, isLoading } = useQuoteSell('0xToken', parseFloat(input));
 * if (preview) console.log(`You'll get ${preview.expectedOutput} ETH`);
 * ```
 */
declare function useQuoteSell(tokenAddress: string | null, tokenAmount: number, options?: {
    slippageBps?: number;
    debounceMs?: number;
    chainKey?: string;
}): {
    preview: TradePreview | null;
    isLoading: boolean;
    error: string | null;
};

/**
 * React hook for fetching and displaying trade history.
 *
 * @param tokenAddress - BondingCurve contract address (null to skip)
 * @param options - limit, auto-refresh, chain key
 *
 * @example
 * ```tsx
 * const { trades, isLoading, refresh } = useTradeHistory('0xToken');
 * ```
 */
declare function useTradeHistory(tokenAddress: string | null, options?: {
    limit?: number;
    autoRefresh?: boolean;
    refreshInterval?: number;
    chainKey?: string;
}): {
    trades: TradeEvent[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};

/**
 * React hook for creating new bonding curve tokens.
 *
 * @param chainKey - Optional chain key override
 *
 * @example
 * ```tsx
 * const { createToken, loading, error, result, reset } = useCreateToken();
 *
 * const handleCreate = async () => {
 *   const signer = await getSigner();
 *   await createToken({
 *     name: 'MyToken',
 *     symbol: 'MTK',
 *     totalSupply: '1000000000',
 *     ethThreshold: '5',
 *     isTaxToken: false,
 *   }, signer);
 * };
 * ```
 */
declare function useCreateToken(chainKey?: string): {
    createToken: (params: CreateTokenParams, signer: Signer) => Promise<CreateTokenResult | null>;
    loading: boolean;
    error: string | null;
    result: CreateTokenResult | null;
    reset: () => void;
};

/**
 * React hook for polling a wallet's token balance.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param walletAddress - Wallet to check (null to skip)
 * @param options - Poll interval, chain key
 *
 * @example
 * ```tsx
 * const { balance, isLoading, refresh } = useTokenBalance('0xToken', walletAddress);
 * ```
 */
declare function useTokenBalance(tokenAddress: string | null, walletAddress: string | null, options?: {
    pollInterval?: number;
    chainKey?: string;
}): {
    balance: number | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};

/**
 * React hook for listing tokens from the factory.
 *
 * @param options - Pagination, chain key
 *
 * @example
 * ```tsx
 * const { tokens, total, isLoading, loadMore } = useTokenList({ limit: 10 });
 * ```
 */
declare function useTokenList(options?: TokenListOptions & {
    chainKey?: string;
}): {
    tokens: ProjectInfo[];
    total: number;
    isLoading: boolean;
    error: string | null;
    loadMore: () => Promise<void>;
    refresh: () => Promise<void>;
};

/**
 * React hook for searching tokens by name or symbol.
 * Debounces search input automatically.
 *
 * @param query - Search query string
 * @param options - Debounce delay, chain key
 *
 * @example
 * ```tsx
 * const { results, isLoading } = useTokenSearch(searchInput, { debounceMs: 300 });
 * ```
 */
declare function useTokenSearch(query: string, options?: {
    debounceMs?: number;
    limit?: number;
    chainKey?: string;
}): {
    results: ProjectInfo[];
    isLoading: boolean;
    error: string | null;
};

/**
 * React hook for fetching a creator's profile.
 *
 * @param creatorAddress - Creator wallet address (null to skip)
 * @param chainKey - Optional chain key override
 *
 * @example
 * ```tsx
 * const { profile, isLoading } = useCreatorProfile('0xCreator');
 * if (profile) console.log(`Created ${profile.tokenCount} tokens`);
 * ```
 */
declare function useCreatorProfile(creatorAddress: string | null, chainKey?: string): {
    profile: CreatorProfile | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};

/**
 * React hook for tracking a bonding curve's lifecycle stage.
 *
 * @param tokenAddress - BondingCurve contract address (null to skip)
 * @param options - Poll interval, chain key
 *
 * @example
 * ```tsx
 * const { lifecycle, isLoading } = useLifecycle('0xToken');
 * if (lifecycle) {
 *   console.log(`Stage: ${lifecycle.stage}`);
 *   console.log(`Progress: ${lifecycle.progress}%`);
 * }
 * ```
 */
declare function useLifecycle(tokenAddress: string | null, options?: {
    pollInterval?: number;
    chainKey?: string;
}): {
    lifecycle: LifecycleState | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};

export { type AxolotlConfig, AxolotlProvider, type BuyParams, type BuyQuote, type ChainConfig, type ClaimHistoryEntry, type ClaimResult, type CreateTokenParams, type CreateTokenResult, type CreatorProfile, type EnrichedTokenState, type FactoryConfig, type LifecycleState, type ProjectInfo, type SellParams, type SellQuote, type TokenEvent, type TokenListOptions, type TokenMetadata, type TokenState, type TokenaConfig, TokenaProvider, type TradeEvent, type TradePreview, type TradeResult, type TxOptions, useAxolotl, useAxolotlWallet, useClaimFees, useCreateToken, useCreatorProfile, useLifecycle, usePoolState, useQuoteBuy, useQuoteSell, useTokenBalance, useTokenList, useTokenSearch, useTokenState, useTokena, useTokenaWallet, useTrade, useTradeHistory };
