# Tokena SDK

> Full-featured SDK for the Tokena bonding curve launchpad on EVM chains.

Create, trade, discover, and manage bonding curve tokens with a single npm package. Includes trade safety, price simulation, token discovery, creator profiles, event streaming, lifecycle management, and React hooks.

## Install

```bash
npm install @tokena/sdk
```

**Peer dependency:** `ethers ^6.0.0` (you must install it separately)

```bash
npm install ethers
```

---

## Quick Start — Node.js / Backend

```typescript
import { Tokena } from '@tokena/sdk';
import { Wallet, JsonRpcProvider } from 'ethers';

// Initialize SDK
const tokena = new Tokena({ chainKey: 'sepolia' });

// Read token state
const state = await tokena.getTokenState('0xYourToken...');
console.log(`Price: ${state.currentPriceEth} ETH`);
console.log(`Progress: ${(state.ethBalance / state.ethThreshold * 100).toFixed(1)}%`);

// Preview a buy (price impact, fees, worst case)
const preview = await tokena.previewBuy('0xYourToken...', 0.5, 500);
console.log(`You'll get ~${preview.expectedOutput} tokens`);
console.log(`Price impact: ${preview.priceImpactPercent.toFixed(2)}%`);
console.log(`Platform fee: ${preview.fees.platformFee} ETH`);

// Connect a wallet & execute
const provider = new JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
const wallet = new Wallet(process.env.PRIVATE_KEY!, provider);

const tx = await tokena.buy(
  { tokenAddress: '0xYourToken...', ethAmount: '0.5', slippageBps: 500 },
  wallet
);
console.log(`Bought! TX: ${tx.txHash}`);
console.log(`Actual tokens: ${tx.actualAmountOut}`);

// Discover tokens
const newest = await tokena.getNewTokens(10);
const results = await tokena.searchTokens('doge');

// Check lifecycle
const lifecycle = await tokena.getLifecycleState('0xYourToken...');
console.log(`Stage: ${lifecycle.stage}, Progress: ${lifecycle.progress}%`);

// Check & claim fees
const pending = await tokena.getPendingFees('0xYourToken...', wallet.address);
if (pending > 0) {
  const claim = await tokena.claimFees('0xYourToken...', wallet);
  console.log(`Claimed ${pending} ETH! TX: ${claim.txHash}`);
}
```

---

## Quick Start — React

```tsx
import { TokenaProvider, useTokenaWallet, useTokenState, useTrade, useQuoteBuy } from '@tokena/sdk/react';

function App() {
  return (
    <TokenaProvider chainKey="sepolia">
      <TradingPanel tokenAddress="0xYourToken..." />
    </TokenaProvider>
  );
}

function TradingPanel({ tokenAddress }: { tokenAddress: string }) {
  const { address, connect, getSigner } = useTokenaWallet();
  const { state, enriched, isLoading } = useTokenState(tokenAddress);
  const { preview } = useQuoteBuy(tokenAddress, 0.1, { slippageBps: 500 });
  const { buy, loading, error } = useTrade();

  const handleBuy = async () => {
    const signer = await getSigner();
    if (!signer) return;
    const result = await buy(
      { tokenAddress, ethAmount: '0.1', slippageBps: 500 },
      signer
    );
    if (result) alert(`Bought! TX: ${result.txHash}`);
  };

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <p>Price: {state?.currentPriceEth} ETH</p>
      <p>Progress: {enriched?.progress.toFixed(1)}%</p>
      <p>Market Cap: {enriched?.marketCapEth.toFixed(2)} ETH</p>
      {preview && <p>You'll get ~{preview.expectedOutput.toFixed(0)} tokens</p>}
      {!address ? (
        <button onClick={connect}>Connect Wallet</button>
      ) : (
        <button onClick={handleBuy} disabled={loading}>
          {loading ? 'Buying...' : 'Buy 0.1 ETH'}
        </button>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

---

## API Reference

### `new Tokena(config)`

| Option | Type | Description |
|---|---|---|
| `chainKey` | `string` | Default chain (e.g. `"sepolia"`, `"ethereum"`, `"bsc"`) |
| `chains` | `Record<string, ChainConfig>` | Custom chain configs to add or override |
| `factoryAddress` | `string` | Override factory address for the default chain |
| `cache` | `CacheOptions` | Enable request caching (`{ ttlMs, staleWhileRevalidate }`) |
| `metadataAdapter` | `MetadataAdapter` | Adapter for token metadata (logo, description, links) |
| `creatorAdapter` | `CreatorAdapter` | Adapter for social features (follow/unfollow) |
| `debug` | `boolean` | Enable debug logging |

### Core Methods

| Method | Description |
|---|---|
| `getTokenState(addr)` | Read full on-chain state (price, reserves, threshold, tax) |
| `getEnrichedTokenState(addr)` | State + computed progress, marketCap, remainingEth |
| `getTokenBalance(token, wallet)` | Get wallet's token balance |
| `createToken(params, signer)` | Deploy a new bonding curve token |
| `getCreationFee()` | Get the factory's creation fee |
| `getFactoryConfig()` | Get all factory settings (typed) |

### Trading

| Method | Description |
|---|---|
| `quoteBuy(token, ethAmount)` | Estimate tokens out for an ETH amount |
| `quoteSell(token, tokenAmount, slippage)` | Estimate ETH out for a token amount |
| `previewBuy(token, eth, slippage)` | Full preview: output, impact, fees, worst case |
| `previewSell(token, amount, slippage)` | Full preview for sells |
| `buy(params, signer)` | Buy tokens (auto-slippage, safety checks) |
| `sell(params, signer)` | Sell tokens (auto-slippage, safety checks) |
| `estimateBuyGas(params, signer)` | Estimate gas for a buy |
| `estimateSellGas(params, signer)` | Estimate gas for a sell |
| `estimateCreateGas(params, signer)` | Estimate gas for token creation |

### Discovery

| Method | Description |
|---|---|
| `getAllTokens(options?)` | Paginated list of all tokens |
| `getNewTokens(limit?)` | Most recently created tokens |
| `searchTokens(query, limit?)` | Search by name or symbol |
| `getTokenCount()` | Total tokens created |
| `getTokenByIndex(index)` | Get project by factory index |
| `getTokenByAddress(addr)` | Get project by token address |

### Creators

| Method | Description |
|---|---|
| `getCreatorTokens(address)` | All tokens by a creator |
| `getCreatorProfile(address)` | Creator profile with token list |

### Events & Indexing

| Method | Description |
|---|---|
| `getTradeHistory(token, options?)` | Historical buy/sell events |
| `getTokenEvents(token, options?)` | All events (buys, sells, claims, etc.) |
| `getCreationEvents(options?)` | Factory creation events |
| `getHolderCount(token)` | Estimated unique holders |
| `subscribeTrades(token, callback)` | Real-time trade stream (returns unsubscribe) |
| `subscribeNewTokens(callback)` | Real-time new token stream |

### Fees

| Method | Description |
|---|---|
| `getPendingFees(token, wallet)` | Check claimable fees |
| `claimFees(token, signer)` | Claim accumulated fees |
| `getClaimHistory(token, wallet)` | Scan historical claim events |

### Lifecycle

| Method | Description |
|---|---|
| `getLifecycleState(token)` | Full stage info (bonding/threshold_reached/finalized/paused) |
| `isFinalized(token)` | Whether the token is finalized |
| `finalizeToken(token, signer)` | Trigger finalization |
| `getMigrationState(token)` | Migration details (Uniswap pair, etc.) |

### Metadata

| Method | Description |
|---|---|
| `getTokenMetadata(token)` | Logo, description, twitter, telegram (via adapter) |

### Batch Operations

| Method | Description |
|---|---|
| `batchGetTokenStates(tokens)` | Fetch many token states with concurrency control |
| `batchGetPendingFees(tokens, wallet)` | Fetch fees for many tokens at once |

### React Hooks (`@tokena/sdk/react`)

| Hook | Description |
|---|---|
| `useTokenaWallet(targetChain?)` | MetaMask connection + chain switching |
| `useTokenState(tokenAddr, options?)` | Auto-polling state with enriched data |
| `usePoolState(tokenAddr)` | Simple auto-polling token state |
| `useTrade(chainKey?)` | Buy/sell/preview with loading & error |
| `useQuoteBuy(token, amount, options?)` | Auto-debounced buy preview |
| `useQuoteSell(token, amount, options?)` | Auto-debounced sell preview |
| `useCreateToken(chainKey?)` | Token creation with status tracking |
| `useTokenBalance(token, wallet)` | Polling balance hook |
| `useTokenList(options?)` | Paginated token list with loadMore |
| `useTokenSearch(query, options?)` | Debounced search |
| `useTradeHistory(token, options?)` | Trade history with auto-refresh |
| `useClaimFees(tokens, wallet)` | Multi-token fee management |
| `useCreatorProfile(address)` | Creator profile data |
| `useLifecycle(token, options?)` | Lifecycle state with polling |
| `useTokena()` | Access the raw SDK instance from context |

---

## Error Handling

The SDK throws typed errors that you can catch and handle specifically:

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

Simulate trades instantly without RPC calls using a state snapshot:

```typescript
import { simulateBuy, simulateSell } from '@tokena/sdk';

const state = await tokena.getTokenState('0x...');

const buyPreview = simulateBuy(0.5, state, 500);
console.log(`~${buyPreview.expectedOutput} tokens, ${buyPreview.priceImpactPercent}% impact`);

const sellPreview = simulateSell(1000, state, 500);
console.log(`~${sellPreview.expectedOutput} ETH`);
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

## Supported Chains

**Update (v1.0.2):** The factory smart contract has been deployed and unified to `0x3bF3A8384998B600acca63bc04fa251D617De059` across all supported EVM chains.
When a token reaches its bonding curve threshold, liquidity is automatically migrated and locked in the respective DEX router for each network:

| Chain | Key | Factory | Migration DEX Router |
|---|---|---|---|
| Ethereum | `ethereum` | `0x3bF3A8384998B600acca63bc04fa251D617De059` | `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D` (Uniswap V2) |
| BNB Chain | `bsc` | `0x3bF3A8384998B600acca63bc04fa251D617De059` | `0x10ED43C718714eb63d5aA57B78B54704E256024E` (PancakeSwap V2) |
| Base | `base` | `0x3bF3A8384998B600acca63bc04fa251D617De059` | `0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24` (Uniswap V2) |
| Arbitrum | `arbitrum` | `0x3bF3A8384998B600acca63bc04fa251D617De059` | `0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506` (SushiSwap V2) |
| Sepolia Testnet | `sepolia` | `0x3bF3A8384998B600acca63bc04fa251D617De059` | `0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008` (Uniswap V2) |

### Custom Chains

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

## Migration from Axolotl

All old names still work as deprecated aliases:

```typescript
// Old (still works)
import { Axolotl, AxolotlProvider, useAxolotl, useAxolotlWallet } from '@tokena/sdk';

// New
import { Tokena, TokenaProvider, useTokena, useTokenaWallet } from '@tokena/sdk';
```

---

## License

MIT
