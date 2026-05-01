# Tokena SDK

> Multi-chain SDK for the Tokena bonding curve launchpad — EVM + Solana.

Create, trade, discover, and manage bonding curve tokens across EVM chains and Solana with a single npm package.

## Install

```bash
npm install @tokena/sdk
```

**Peer dependencies:**

```bash
# EVM
npm install ethers

# Solana (if using Solana features)
npm install @solana/web3.js @solana/wallet-adapter-react @meteora-ag/dynamic-bonding-curve-sdk bn.js
```

---

## Quick Start — EVM

```typescript
import { Tokena } from '@tokena/sdk';
import { Wallet, JsonRpcProvider } from 'ethers';

// Initialize SDK
const tokena = new Tokena({ chainKey: 'bsc' });

// Read token state (includes auto-migration fields)
const state = await tokena.getTokenState('0xYourToken...');
console.log(`Price: ${state.currentPriceEth} ETH`);
console.log(`Finalized: ${state.finalized}`);
console.log(`AMM Reserve: ${state.ammEthReserve} ETH`);

// Preview a buy (price impact, fees, worst case)
const preview = await tokena.previewBuy('0xYourToken...', 0.5, 500);
console.log(`You'll get ~${preview.expectedOutput} tokens`);
console.log(`Price impact: ${preview.priceImpactPercent.toFixed(2)}%`);

// Connect a wallet & execute
const provider = new JsonRpcProvider('https://bsc-dataseed.binance.org');
const wallet = new Wallet(process.env.PRIVATE_KEY!, provider);

const tx = await tokena.buy(
  { tokenAddress: '0xYourToken...', ethAmount: '0.5', slippageBps: 500 },
  wallet
);
console.log(`Bought! TX: ${tx.txHash}`);

// Check lifecycle (supports auto-migration)
const lifecycle = await tokena.getLifecycleState('0xYourToken...');
console.log(`Stage: ${lifecycle.stage}, Progress: ${lifecycle.progress}%`);
// Stages: bonding → threshold_reached → finalized
```

---

## Quick Start — Solana

```typescript
import { solana } from '@tokena/sdk';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

// Get Solana connection + wallet from your React context
const wallet = useWallet();
const { connection } = useConnection();

// Read pool state
const poolState = await solana.getPoolState('PoolAddress...', connection);
console.log(`SOL Raised: ${poolState.solRaised}`);
console.log(`Progress: ${poolState.migrationProgress}%`);

// Quote a buy off-chain
const quote = solana.quoteBuyOffchain(0.5, poolState.solRaised, 150);
console.log(`Tokens out: ${quote.tokensOut}`);
console.log(`Fee: ${quote.feeSol} SOL`);

// Buy tokens
const result = await solana.buyTokens({
  poolAddress: 'PoolAddress...',
  mintAddress: 'MintAddress...',
  wallet,
  connection,
  solAmount: 0.5,
  currentSolRaised: poolState.solRaised,
}, {
  onTradeComplete: (trade) => {
    // Record to your database
    console.log(`Bought ${trade.tokenAmount} tokens, TX: ${trade.txSignature}`);
  },
});

// Launch a new token (with custom thresholds)
const token = await solana.launchToken({
  name: 'My Token',
  symbol: 'MTK',
  description: 'A great token',
  imageUrl: 'https://...',
  metadataUri: 'ipfs://...',
  initialPriceSol: 0.0000015,
  migrationThresholdSol: 25,
  totalSupply: 1_000_000_000,
  creatorFeePercent: 2,
  initialBuySol: 0.1,
  initialVirtualLpSol: 5,       // Optional: custom virtual LP (default: 5)
  migrationMarketCapSol: 180,   // Optional: custom graduation FDV (default: 180)
  wallet,
  connection,
}, {
  onTokenCreated: (info) => console.log(`Created: ${info.mintAddress}`),
  onInitialBuyComplete: (buy) => console.log(`Initial buy: ${buy.tokensOut} tokens`),
});

// Claim creator fees (platform split is automatic)
await solana.claimCreatorFees({
  poolAddress: 'PoolAddress...',
  wallet,
  connection,
  creatorFeePercent: 2,
});
```

---

## API Reference — EVM

### `new Tokena(config)`

| Option | Type | Description |
|---|---|---|
| `chainKey` | `string` | Default chain (e.g. `"bsc"`, `"ethereum"`, `"base"`, `"arbitrum"`) |
| `chains` | `Record<string, ChainConfig>` | Custom chain configs to add or override |
| `factoryAddress` | `string` | Override factory address for the default chain |
| `cache` | `CacheOptions` | Enable request caching (`{ ttlMs, staleWhileRevalidate }`) |
| `metadataAdapter` | `MetadataAdapter` | Adapter for token metadata (logo, description, links) |
| `debug` | `boolean` | Enable debug logging |

### Core Methods

| Method | Description |
|---|---|
| `getTokenState(addr)` | Read full on-chain state (price, reserves, threshold, tax, **finalized**, **ammEthReserve**) |
| `getEnrichedTokenState(addr)` | State + computed progress, marketCap, remainingEth |
| `getTokenBalance(token, wallet)` | Get wallet's token balance |
| `createToken(params, signer)` | Deploy a new bonding curve token |
| `getCreationFee()` | Get the factory's creation fee |
| `getFactoryConfig()` | Get all factory settings (typed) |

#### `createToken` — Configurable Thresholds

| Param | Type | Description |
|---|---|---|
| `ethThreshold` | `string` | ETH required to trigger auto-migration (e.g. `"5"`) |
| `initialVirtualEth` | `string?` | Virtual ETH for initial pricing (e.g. `"1"`). Defaults to factory default. |
| `initialBuyEth` | `string?` | ETH to spend on initial buy bundled with creation |

```typescript
await tokena.createToken({
  name: 'My Token',
  symbol: 'MTK',
  totalSupply: '1000000000',
  ethThreshold: '10',        // Custom: migrate at 10 ETH raised
  initialVirtualEth: '2',    // Custom: 2 ETH virtual LP (higher starting FDV)
  isTaxToken: false,
  initialBuyEth: '0.5',
}, signer);
```

### Trading

| Method | Description |
|---|---|
| `quoteBuy(token, ethAmount)` | Estimate tokens out for an ETH amount |
| `quoteSell(token, tokenAmount, slippage)` | Estimate ETH out for a token amount |
| `previewBuy(token, eth, slippage)` | Full preview: output, impact, fees, worst case |
| `previewSell(token, amount, slippage)` | Full preview for sells |
| `buy(params, signer)` | Buy tokens (auto-slippage, safety checks) |
| `sell(params, signer)` | Sell tokens (auto-slippage, safety checks) |

### Lifecycle & Auto-Migration

| Method | Description |
|---|---|
| `getLifecycleState(token)` | Full stage info (`bonding` → `threshold_reached` → `finalized`) |
| `isFinalized(token)` | Whether auto-migration has completed |
| `getMigrationState(token)` | Migration details (Uniswap pair, progress) |
| `finalizeToken(token, signer)` | ⚠️ **Deprecated** — auto-migration handles this atomically |

> **Auto-Migration:** New contracts auto-finalize during `buy()` when the ETH threshold is reached. The SDK reads migration status via `getMigrationStatus()` with a fallback to legacy `thresholdReached()`/`ethThreshold()` for older contracts.

### Discovery

| Method | Description |
|---|---|
| `getAllTokens(options?)` | Paginated list of all tokens |
| `getNewTokens(limit?)` | Most recently created tokens |
| `searchTokens(query, limit?)` | Search by name or symbol |
| `getTokenCount()` | Total tokens created |

### Fees

| Method | Description |
|---|---|
| `getPendingFees(token, wallet)` | Check claimable fees |
| `claimFees(token, signer)` | Claim accumulated fees |
| `getClaimHistory(token, wallet)` | Scan historical claim events |

### Events

| Method | Description |
|---|---|
| `getTradeHistory(token, options?)` | Historical buy/sell events |
| `subscribeTrades(token, callback)` | Real-time trade stream |
| `subscribeNewTokens(callback)` | Real-time new token stream |

---

## API Reference — Solana

All Solana functions are available under the `solana` namespace:

```typescript
import { solana } from '@tokena/sdk';
```

### Connection & Client

| Function | Description |
|---|---|
| `getSolanaConnection(rpcUrl)` | Cached Solana Connection factory |
| `confirmTx(signature, connection)` | Confirm with timeout + retry |
| `getDbcClient(connection)` | Singleton Meteora DBC client |

### Pool State

| Function | Description |
|---|---|
| `getPoolState(poolAddr, connection)` | Full on-chain pool state (solRaised, price, migration) |
| `getOnChainMcap(poolAddr, connection, solPrice)` | Lightweight market cap |
| `startPoolStatePolling(poolAddr, connection, callback, interval?)` | Poll state (returns unsubscribe) |

### Trading

| Function | Description |
|---|---|
| `buyTokens(params, callbacks?)` | Buy tokens via DBC swap |
| `sellTokens(params, callbacks?)` | Sell tokens via DBC swap |

Both accept optional `TradeCallbacks` with `onTradeComplete` for database recording.

### Off-Chain Quotes

| Function | Description |
|---|---|
| `quoteBuyOffchain(solIn, currentRaised, solPrice, overrides?)` | Instant buy quote (no RPC) |
| `quoteSellOffchain(tokensIn, currentRaised, solPrice, overrides?)` | Instant sell quote (no RPC) |
| `getCachedSolPrice()` | SOL/USD price (CoinGecko, 60s cache) |

### Bonding Curve Math

All math functions accept an optional `CurveOverrides` parameter to customize the curve:

| Function | Description |
|---|---|
| `getMcapSol(solRaised, overrides?)` | Market cap in SOL |
| `getMcapUsd(solRaised, solPrice, overrides?)` | Market cap in USD |
| `getTokenPriceSol(solRaised, overrides?)` | Token price in SOL |
| `getTokenPriceUsd(solRaised, solPrice, overrides?)` | Token price in USD |
| `getMigrationProgress(solRaised, overrides?)` | Progress 0-100% |
| `getSolRaisedFromMcapUsd(mcapUsd, solPrice, overrides?)` | Reverse: mcap → solRaised |
| `getTokensSold(solRaised, overrides?)` | Tokens sold at a given level |

#### `CurveOverrides`

| Field | Type | Default | Description |
|---|---|---|---|
| `initialLpSol` | `number` | `5` | Virtual LP in SOL — sets starting FDV |
| `migrationLpSol` | `number` | `25` | SOL raised threshold for migration |
| `totalSupply` | `number` | `1,000,000,000` | Total token supply |

```typescript
import { solana } from '@tokena/sdk';

// Custom curve: 10 SOL virtual LP, 50 SOL migration, 500M supply
const overrides = { initialLpSol: 10, migrationLpSol: 50, totalSupply: 500_000_000 };

const mcap = solana.getMcapSol(15, overrides);       // Uses custom formula
const quote = solana.quoteBuyOffchain(1, 10, 150, overrides);
const progress = solana.getMigrationProgress(30, overrides); // 60%
```

### Fee Claiming

| Function | Description |
|---|---|
| `getClaimableFee(poolAddr, connection, creatorFeePct)` | Creator's claimable fee |
| `getClaimableFeesForPools(pools, connection, feeMap)` | Batch claimable fees |
| `claimCreatorFees(params)` | Claim with atomic platform fee split |

**Fee System:**
- 1% total trading fee → 0.2% Meteora protocol, 0.8% to feeClaimer
- Of 0.8%: 0.4% creator + 0.4% platform (split at claim time)
- Creator tax (0-5%) adds on top; platform always gets 0.4% via atomic transfer in the claim transaction

### Token Launch

| Function | Description |
|---|---|
| `launchToken(params, callbacks?)` | Full launch: config + pool + optional initial buy |

#### `launchToken` — Configurable Thresholds

| Param | Type | Default | Description |
|---|---|---|---|
| `initialVirtualLpSol` | `number?` | `5` | Virtual LP in SOL — sets starting FDV |
| `migrationMarketCapSol` | `number?` | `180` | FDV in SOL at which pool graduates to DEX |

The migration threshold (SOL raised) is derived from these values:
`migrationThreshold ≈ sqrt(migrationMarketCapSol × initialVirtualLpSol) - initialVirtualLpSol`

---

## Supported Chains

### EVM — Auto-Migration

**v1.1.1:** The factory contract now supports **auto-migration**. When a token reaches its ETH threshold during a `buy()` call, the contract atomically creates the DEX pair, adds liquidity, and locks it — all in one transaction. The `AutoFinalized` event is emitted.

| Chain | Key | Factory | Migration DEX Router |
|---|---|---|---|
| Ethereum | `ethereum` | `0x153B33eee6412066f187B2146deEC10A3A4893C3` | `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D` (Uniswap V2) |
| BNB Chain | `bsc` | `0x153B33eee6412066f187B2146deEC10A3A4893C3` | `0x10ED43C718714eb63d5aA57B78B54704E256024E` (PancakeSwap V2) |
| Base | `base` | `0x153B33eee6412066f187B2146deEC10A3A4893C3` | `0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24` (Uniswap V2) |
| Arbitrum | `arbitrum` | `0x153B33eee6412066f187B2146deEC10A3A4893C3` | `0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506` (SushiSwap V2) |
| Sepolia Testnet | `sepolia` | `0x153B33eee6412066f187B2146deEC10A3A4893C3` | `0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008` (Uniswap V2 Fork) |

### Solana — Meteora DBC

| Param | Value |
|---|---|
| Program ID | `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN` |
| Token Decimals | 6 |
| Total Supply | 1,000,000,000 |
| Initial Virtual LP | 5 SOL |
| Migration Threshold | 25 SOL raised |
| Curve Formula | `mcap_sol = (5 + solRaised)² / 5` |
| Trading Fee | 1% (0.2% Meteora + 0.4% creator + 0.4% platform) |

### Custom EVM Chains

```typescript
const tokena = new Tokena({
  chainKey: 'mychain',
  chains: {
    mychain: {
      chainId: 31337,
      name: 'My Local Chain',
      shortName: 'LOCAL',
      rpcUrl: 'http://localhost:8545',
      explorerUrl: 'http://localhost:4000',
      nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
      factoryAddress: '0x...',
    },
  },
});
```

---

## Error Handling

The SDK throws typed errors for EVM operations:

```typescript
import { Tokena, SlippageExceededError, TradePausedError, InsufficientBalanceError } from '@tokena/sdk';

try {
  await tokena.buy(params, signer);
} catch (e) {
  if (e instanceof SlippageExceededError) {
    console.log('Increase slippage tolerance');
  } else if (e instanceof TradePausedError) {
    console.log('Trading is paused on this token');
  } else if (e instanceof InsufficientBalanceError) {
    console.log('Not enough ETH');
  }
}
```

Error types: `TokenaError`, `InsufficientBalanceError`, `SlippageExceededError`, `ChainMismatchError`, `TokenNotFoundError`, `TradePausedError`, `ThresholdAlreadyReachedError`, `InvalidAddressError`, `InvalidAmountError`, `TransactionFailedError`, `ContractNotFoundError`, `RpcError`

---

## Offline Simulation

Simulate EVM trades instantly without RPC calls:

```typescript
import { simulateBuy, simulateSell } from '@tokena/sdk';

const state = await tokena.getTokenState('0x...');
const buyPreview = simulateBuy(0.5, state, 500);
console.log(`~${buyPreview.expectedOutput} tokens, ${buyPreview.priceImpactPercent}% impact`);
```

For Solana, use the off-chain quote functions:

```typescript
import { solana } from '@tokena/sdk';

const quote = solana.quoteBuyOffchain(0.5, currentSolRaised, solPriceUsd);
console.log(`~${quote.tokensOut} tokens, fee: ${quote.feeSol} SOL`);
```

---

## Utilities

```typescript
import { formatTokenAmount, formatEthAmount, shortenAddress, explorerTxUrl } from '@tokena/sdk';

formatTokenAmount(1234567.89);    // "1,234,567.89"
formatEthAmount(0.004238);        // "0.0042 ETH"
shortenAddress('0x1234...5678');   // "0x1234...5678"
explorerTxUrl(txHash, chain);     // "https://etherscan.io/tx/0x..."
```

---

## Migration from Axolotl

All old names still work as deprecated aliases:

```typescript
// Old (still works)
import { Axolotl } from '@tokena/sdk';

// New
import { Tokena, solana } from '@tokena/sdk';
```

---

## License

MIT
