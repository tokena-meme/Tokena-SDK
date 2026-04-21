// src/react/AxolotlProvider.tsx
import { createContext, useContext, useMemo } from "react";

// src/chains/index.ts
var DEFAULT_CHAINS = {
  ethereum: {
    chainId: 1,
    name: "Ethereum",
    shortName: "ETH",
    rpcUrl: "https://eth.llamarpc.com",
    explorerUrl: "https://etherscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    factoryAddress: ""
    // Set after mainnet deployment
  },
  bsc: {
    chainId: 56,
    name: "BNB Chain",
    shortName: "BSC",
    rpcUrl: "https://bsc-dataseed.binance.org",
    explorerUrl: "https://bscscan.com",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    factoryAddress: ""
    // Set after deployment
  },
  base: {
    chainId: 8453,
    name: "Base",
    shortName: "BASE",
    rpcUrl: "https://mainnet.base.org",
    explorerUrl: "https://basescan.org",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    factoryAddress: ""
    // Set after deployment
  },
  arbitrum: {
    chainId: 42161,
    name: "Arbitrum",
    shortName: "ARB",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    factoryAddress: ""
    // Set after deployment
  },
  sepolia: {
    chainId: 11155111,
    name: "Sepolia Testnet",
    shortName: "SEP",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    explorerUrl: "https://sepolia.etherscan.io",
    nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
    factoryAddress: "0x109d869521d668F8b3e93610D7BC794981d28EA4"
  }
};

// src/core/provider.ts
import { JsonRpcProvider } from "ethers";
var providerCache = /* @__PURE__ */ new Map();
function getProvider(config) {
  const cacheKey = `${config.chainId}:${config.rpcUrl}`;
  const cached = providerCache.get(cacheKey);
  if (cached) return cached;
  const provider = new JsonRpcProvider(config.rpcUrl, {
    chainId: config.chainId,
    name: config.name
  });
  providerCache.set(cacheKey, provider);
  return provider;
}
function clearProviderCache() {
  providerCache.clear();
}

// src/core/state.ts
import { Contract, formatEther, formatUnits } from "ethers";

// src/abi/BondingCurve.ts
var BondingCurveABI = [
  // ─── Read Functions ────────────────────────────────────────
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function getCurrentPrice() view returns (uint256 price)",
  "function calculateTokenAmount(uint256 ethAmount) view returns (uint256 tokenAmount)",
  "function calculateEthAmount(uint256 tokenAmount) view returns (uint256 ethAmount)",
  "function getAmmEthReserve() view returns (uint256)",
  "function ethThreshold() view returns (uint256)",
  "function thresholdReached() view returns (bool)",
  "function isTaxToken() view returns (bool)",
  "function companyWallet() view returns (address)",
  "function creatorWallet() view returns (address)",
  "function companyFeePercent() view returns (uint256)",
  "function initialVirtualEth() view returns (uint256)",
  "function pendingFees(address) view returns (uint256)",
  "function totalPendingFees() view returns (uint256)",
  "function PRECISION() view returns (uint256)",
  "function ZERO_TAX_FEE_BPS() view returns (uint256)",
  "function ZERO_TAX_CREATOR_BPS() view returns (uint256)",
  "function ZERO_TAX_COMPANY_BPS() view returns (uint256)",
  "function maxFeePercent() view returns (uint256)",
  "function minThreshold() view returns (uint256)",
  "function owner() view returns (address)",
  "function paused() view returns (bool)",
  "function uniswapRouter() view returns (address)",
  "function uniswapPair() view returns (address)",
  "function taxInfo() view returns (address devWallet, uint8 devBuyFeePercent, uint8 devSellFeePercent, address marketingWallet, uint8 marketingBuyFeePercent, uint8 marketingSellFeePercent)",
  // ─── Write Functions ───────────────────────────────────────
  "function buy(uint256 minTokens) payable",
  "function sell(uint256 tokenAmount, uint256 minEth)",
  "function claimFees()",
  "function updateFees(uint8 devBuyFee, uint8 devSellFee, uint8 marketingBuyFee, uint8 marketingSellFee)",
  "function finalize()",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  // ─── Events ────────────────────────────────────────────────
  "event Buy(address indexed buyer, uint256 ethAmount, uint256 tokenAmount, uint256 newPrice)",
  "event Sell(address indexed seller, uint256 tokenAmount, uint256 ethAmount, uint256 newPrice)",
  "event CompanyFeeTaken(uint256 amount)",
  "event FeesAccumulated(address indexed wallet, uint256 amount)",
  "event FeesClaimed(address indexed wallet, uint256 amount)",
  "event ThresholdReached(uint256 totalEth)",
  "event LiquidityAdded(uint256 tokenAmount, uint256 ethAmount)",
  "event FeesUpdated(uint8 devBuyFee, uint8 devSellFee, uint8 marketingBuyFee, uint8 marketingSellFee)"
];

// src/core/validation.ts
import { isAddress } from "ethers";

// src/errors.ts
var TokenaError = class extends Error {
  constructor(message, code, cause) {
    super(message);
    this.name = "TokenaError";
    this.code = code;
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
var InsufficientBalanceError = class extends TokenaError {
  constructor(message = "Insufficient balance for this operation", cause) {
    super(message, "INSUFFICIENT_BALANCE", cause);
    this.name = "InsufficientBalanceError";
  }
};
var SlippageExceededError = class extends TokenaError {
  constructor(message = "Trade would exceed slippage tolerance", cause) {
    super(message, "SLIPPAGE_EXCEEDED", cause);
    this.name = "SlippageExceededError";
  }
};
var TradePausedError = class extends TokenaError {
  constructor(tokenAddress, cause) {
    super(`Trading is paused on ${tokenAddress}`, "TRADE_PAUSED", cause);
    this.name = "TradePausedError";
  }
};
var ThresholdAlreadyReachedError = class extends TokenaError {
  constructor(tokenAddress, cause) {
    super(`Threshold already reached on ${tokenAddress} \u2014 token is finalized`, "THRESHOLD_REACHED", cause);
    this.name = "ThresholdAlreadyReachedError";
  }
};
var InvalidAddressError = class extends TokenaError {
  constructor(address, label = "address", cause) {
    super(`Invalid ${label}: "${address}" \u2014 must be a valid Ethereum address`, "INVALID_ADDRESS", cause);
    this.name = "InvalidAddressError";
  }
};
var InvalidAmountError = class extends TokenaError {
  constructor(amount, label = "amount", cause) {
    super(`Invalid ${label}: "${amount}" \u2014 must be a positive number`, "INVALID_AMOUNT", cause);
    this.name = "InvalidAmountError";
  }
};
var TransactionFailedError = class extends TokenaError {
  constructor(message = "Transaction failed", txHash, cause) {
    super(message, "TX_FAILED", cause);
    this.name = "TransactionFailedError";
    this.txHash = txHash;
  }
};
var ContractNotFoundError = class extends TokenaError {
  constructor(address, cause) {
    super(`Contract not found or not accessible at ${address}`, "CONTRACT_NOT_FOUND", cause);
    this.name = "ContractNotFoundError";
  }
};
var RpcError = class extends TokenaError {
  constructor(message = "RPC request failed", cause) {
    super(message, "RPC_ERROR", cause);
    this.name = "RpcError";
  }
};
function wrapError(err, context) {
  if (err instanceof TokenaError) return err;
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();
  if (lower.includes("insufficient funds") || lower.includes("exceeds balance")) {
    return new InsufficientBalanceError(context ? `${context}: ${message}` : message, err);
  }
  if (lower.includes("slippage") || lower.includes("too little received") || lower.includes("mintoken") || lower.includes("min_eth")) {
    return new SlippageExceededError(context ? `${context}: ${message}` : message, err);
  }
  if (lower.includes("execution reverted") && lower.includes("paused")) {
    return new TradePausedError(context ?? "unknown", err);
  }
  if (lower.includes("call_exception") || lower.includes("contract not deployed") || lower.includes("could not decode")) {
    return new ContractNotFoundError(context ?? "unknown", err);
  }
  if (lower.includes("network") || lower.includes("timeout") || lower.includes("econnrefused") || lower.includes("rate limit")) {
    return new RpcError(context ? `${context}: ${message}` : message, err);
  }
  return new TokenaError(
    context ? `${context}: ${message}` : message,
    "UNKNOWN_ERROR",
    err
  );
}

// src/core/validation.ts
function validateAddress(addr, label = "address") {
  if (!addr || typeof addr !== "string") {
    throw new InvalidAddressError(addr ?? "", label);
  }
  if (!isAddress(addr)) {
    throw new InvalidAddressError(addr, label);
  }
}
function validatePositiveAmount(amount, label = "amount") {
  if (amount === "" || amount === null || amount === void 0) {
    throw new InvalidAmountError(String(amount), label);
  }
  const num = typeof amount === "string" ? Number(amount) : amount;
  if (isNaN(num) || !isFinite(num) || num <= 0) {
    throw new InvalidAmountError(amount, label);
  }
}
function validateSlippageBps(bps) {
  if (typeof bps !== "number" || isNaN(bps) || bps < 0 || bps > 1e4) {
    throw new InvalidAmountError(bps, "slippageBps (must be 0\u201310000)");
  }
}

// src/core/state.ts
async function getTokenState(tokenAddress, provider) {
  validateAddress(tokenAddress, "tokenAddress");
  try {
    const token = new Contract(tokenAddress, BondingCurveABI, provider);
    const [
      name,
      symbol,
      decimals,
      totalSupply,
      currentPrice,
      ethThreshold,
      thresholdReached,
      isTaxToken,
      tokenReserve,
      taxInfo
    ] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
      token.totalSupply(),
      token.getCurrentPrice(),
      token.ethThreshold(),
      token.thresholdReached(),
      token.isTaxToken(),
      token.balanceOf(tokenAddress),
      token.taxInfo()
    ]);
    const ethBalance = await provider.getBalance(tokenAddress);
    const precision = BigInt(10) ** BigInt(18);
    return {
      currentPrice: currentPrice.toString(),
      currentPriceEth: Number(currentPrice) / Number(precision),
      ethBalance: Number(formatEther(ethBalance)),
      tokenReserve: Number(formatUnits(tokenReserve, decimals)),
      ethThreshold: Number(formatEther(ethThreshold)),
      thresholdReached,
      isTaxToken,
      totalSupply: Number(formatUnits(totalSupply, decimals)),
      name,
      symbol,
      decimals: Number(decimals),
      devWallet: taxInfo.devWallet,
      devBuyFeePercent: Number(taxInfo.devBuyFeePercent),
      devSellFeePercent: Number(taxInfo.devSellFeePercent),
      marketingWallet: taxInfo.marketingWallet,
      marketingBuyFeePercent: Number(taxInfo.marketingBuyFeePercent),
      marketingSellFeePercent: Number(taxInfo.marketingSellFeePercent)
    };
  } catch (err) {
    throw wrapError(err, `getTokenState(${tokenAddress})`);
  }
}
function enrichTokenState(state) {
  const progress = state.ethThreshold > 0 ? Math.min(state.ethBalance / state.ethThreshold * 100, 100) : 0;
  return {
    ...state,
    progress,
    marketCapEth: state.currentPriceEth * state.totalSupply,
    remainingEth: Math.max(state.ethThreshold - state.ethBalance, 0),
    totalTaxPercent: state.devBuyFeePercent + state.devSellFeePercent + state.marketingBuyFeePercent + state.marketingSellFeePercent
  };
}
async function getTokenBalance(tokenAddress, walletAddress, provider) {
  validateAddress(tokenAddress, "tokenAddress");
  validateAddress(walletAddress, "walletAddress");
  try {
    const token = new Contract(tokenAddress, BondingCurveABI, provider);
    const [balance, decimals] = await Promise.all([
      token.balanceOf(walletAddress),
      token.decimals()
    ]);
    return Number(formatUnits(balance, decimals));
  } catch (err) {
    throw wrapError(err, `getTokenBalance(${tokenAddress}, ${walletAddress})`);
  }
}

// src/core/factory.ts
import { Contract as Contract2, parseEther, formatUnits as formatUnits2 } from "ethers";

// src/abi/TokenFactory.ts
var TokenFactoryABI = [
  // ─── Read Functions ────────────────────────────────────────
  "function owner() view returns (address)",
  "function companyWallet() view returns (address)",
  "function companyFeePercent() view returns (uint8)",
  "function creationFee() view returns (uint256)",
  "function uniswapRouter() view returns (address)",
  "function maxFeePercent() view returns (uint256)",
  "function minThreshold() view returns (uint256)",
  "function defaultInitialEth() view returns (uint256)",
  "function minVirtualEth() view returns (uint256)",
  "function projectCount() view returns (uint256)",
  "function getProjectById(uint256 pid) view returns (tuple(address token, string name, string symbol, uint256 totalSupply, uint256 ethThreshold, bool isTaxToken, address devWallet, uint8 devBuyFeePercent, uint8 devSellFeePercent, address marketingWallet, uint8 marketingBuyFeePercent, uint8 marketingSellFeePercent, uint256 initialVirtualEth, uint256 initialBuyAmount))",
  "function getProjectByAddress(address token) view returns (uint256 pid, tuple(address token, string name, string symbol, uint256 totalSupply, uint256 ethThreshold, bool isTaxToken, address devWallet, uint8 devBuyFeePercent, uint8 devSellFeePercent, address marketingWallet, uint8 marketingBuyFeePercent, uint8 marketingSellFeePercent, uint256 initialVirtualEth, uint256 initialBuyAmount) proj)",
  // ─── Write Functions ───────────────────────────────────────
  "function createBondingCurve(string name, string symbol, uint256 totalSupply, uint256 ethThreshold, bool isTaxToken, address devWallet, uint8 devBuyFeePercent, uint8 devSellFeePercent, address marketingWallet, uint8 marketingBuyFeePercent, uint8 marketingSellFeePercent, uint256 initialBuyAmount, uint256 initialVirtualEth) payable returns (address)",
  // ─── Admin Functions ───────────────────────────────────────
  "function updateCompanyWallet(address newCompanyWallet)",
  "function updateCreationFee(uint256 newCreationFee)",
  "function updateCompanyFee(uint256 newCompanyFeePercent)",
  "function updateUniswapRouter(address newRouter)",
  "function updateDefaultInitialEth(uint256 newDefaultInitialEth)",
  "function updateMaxFeePercent(uint256 newMaxFeePercent)",
  "function updateMinThreshold(uint256 newMinThreshold)",
  // ─── Events ────────────────────────────────────────────────
  "event BondingCurveCreated(address indexed token, string name, string symbol, uint256 totalSupply, uint256 ethThreshold, bool isTaxToken, address devWallet, uint8 devBuyFeePercent, uint8 devSellFeePercent, address marketingWallet, uint8 marketingBuyFeePercent, uint8 marketingSellFeePercent, uint256 initialVirtualEth, uint256 initialBuyAmount)",
  "event CompanyWalletUpdated(address indexed oldWallet, address indexed newWallet)",
  "event CreationFeeUpdated(uint256 oldFee, uint256 newFee)",
  "event CompanyFeePercentUpdated(uint256 oldPercent, uint256 newPercent)",
  "event UniswapRouterUpdated(address indexed oldRouter, address indexed newRouter)",
  "event DefaultInitialEthUpdated(uint256 oldAmount, uint256 newAmount)",
  "event MinThresholdUpdated(uint256 oldThreshold, uint256 newThreshold)",
  "event MaxFeePercentUpdated(uint256 oldFee, uint256 newFee)"
];

// src/core/factory.ts
async function createToken(params, factoryAddress, signer, provider) {
  validateAddress(factoryAddress, "factoryAddress");
  validatePositiveAmount(params.totalSupply, "totalSupply");
  validatePositiveAmount(params.ethThreshold, "ethThreshold");
  try {
    const factory = new Contract2(factoryAddress, TokenFactoryABI, provider);
    const creationFee = await factory.creationFee();
    const initialBuyWei = parseEther(params.initialBuyEth || "0");
    const totalValue = creationFee + initialBuyWei;
    const creatorAddress = await signer.getAddress();
    const factoryWrite = new Contract2(factoryAddress, TokenFactoryABI, signer);
    const totalSupplyWei = parseEther(params.totalSupply);
    const tx = await factoryWrite.createBondingCurve(
      params.name,
      params.symbol,
      totalSupplyWei,
      parseEther(params.ethThreshold),
      params.isTaxToken,
      params.devWallet || creatorAddress,
      params.devBuyFeePercent ?? 0,
      params.devSellFeePercent ?? 0,
      params.marketingWallet || creatorAddress,
      params.marketingBuyFeePercent ?? 0,
      params.marketingSellFeePercent ?? 0,
      initialBuyWei,
      parseEther(params.initialVirtualEth || "0"),
      { value: totalValue }
    );
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new TransactionFailedError("Token creation transaction reverted", receipt?.hash);
    }
    let tokenAddress = "";
    for (const log of receipt.logs) {
      try {
        const parsed = factoryWrite.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        if (parsed && parsed.name === "BondingCurveCreated") {
          tokenAddress = parsed.args.token;
          break;
        }
      } catch {
      }
    }
    if (!tokenAddress) {
      throw new TransactionFailedError(
        "Failed to parse token address from transaction receipt",
        receipt.hash
      );
    }
    return {
      tokenAddress,
      txHash: receipt.hash
    };
  } catch (err) {
    throw wrapError(err, "createToken");
  }
}
async function getCreationFee(factoryAddress, provider) {
  validateAddress(factoryAddress, "factoryAddress");
  try {
    const factory = new Contract2(factoryAddress, TokenFactoryABI, provider);
    const fee = await factory.creationFee();
    return formatUnits2(fee, 18);
  } catch (err) {
    throw wrapError(err, "getCreationFee");
  }
}
async function getFactoryConfig(factoryAddress, provider) {
  validateAddress(factoryAddress, "factoryAddress");
  try {
    const factory = new Contract2(factoryAddress, TokenFactoryABI, provider);
    const [companyFee, creationFee, maxFee, minThreshold, defaultEth, projectCount] = await Promise.all([
      factory.companyFeePercent(),
      factory.creationFee(),
      factory.maxFeePercent(),
      factory.minThreshold(),
      factory.defaultInitialEth(),
      factory.projectCount()
    ]);
    return {
      companyFeePercent: Number(companyFee),
      creationFee: formatUnits2(creationFee, 18),
      maxFeePercent: Number(maxFee),
      minThreshold: formatUnits2(minThreshold, 18),
      defaultInitialEth: formatUnits2(defaultEth, 18),
      projectCount: Number(projectCount)
    };
  } catch (err) {
    throw wrapError(err, "getFactoryConfig");
  }
}

// src/core/trading.ts
import { Contract as Contract3, parseEther as parseEther2, parseUnits, formatEther as formatEther2, formatUnits as formatUnits3, EventLog } from "ethers";
function trimDec(val) {
  const str = typeof val === "number" ? val.toLocaleString("fullwide", { useGrouping: false, maximumFractionDigits: 20 }) : val;
  const [int, dec] = str.split(".");
  return dec ? `${int}.${dec.slice(0, 18)}` : str;
}
function buildTxOverrides(txOptions, extraOverrides) {
  const overrides = { ...extraOverrides };
  if (txOptions?.gasLimit) overrides.gasLimit = txOptions.gasLimit;
  if (txOptions?.maxFeePerGas) overrides.maxFeePerGas = txOptions.maxFeePerGas;
  if (txOptions?.maxPriorityFeePerGas) overrides.maxPriorityFeePerGas = txOptions.maxPriorityFeePerGas;
  return overrides;
}
async function preTradeChecks(tokenAddress, provider) {
  const token = new Contract3(tokenAddress, BondingCurveABI, provider);
  try {
    const [paused, thresholdReached] = await Promise.all([
      token.paused(),
      token.thresholdReached()
    ]);
    if (paused) throw new TradePausedError(tokenAddress);
    if (thresholdReached) throw new ThresholdAlreadyReachedError(tokenAddress);
  } catch (err) {
    if (err instanceof TradePausedError || err instanceof ThresholdAlreadyReachedError) throw err;
  }
}
async function quoteBuy(tokenAddress, ethAmount, provider) {
  validateAddress(tokenAddress, "tokenAddress");
  validatePositiveAmount(ethAmount, "ethAmount");
  try {
    const token = new Contract3(tokenAddress, BondingCurveABI, provider);
    const ethWei = parseEther2(trimDec(ethAmount));
    const estimatedTokens = await token.calculateTokenAmount(ethWei);
    return {
      tokensOut: Number(formatUnits3(estimatedTokens, 18))
    };
  } catch (err) {
    throw wrapError(err, `quoteBuy(${tokenAddress})`);
  }
}
async function quoteSell(tokenAddress, tokenAmount, slippageBps, provider) {
  validateAddress(tokenAddress, "tokenAddress");
  validatePositiveAmount(tokenAmount, "tokenAmount");
  validateSlippageBps(slippageBps);
  try {
    const token = new Contract3(tokenAddress, BondingCurveABI, provider);
    const tokenWei = parseUnits(trimDec(tokenAmount), 18);
    const estimatedEth = await token.calculateEthAmount(tokenWei);
    const slippageMultiplier = (1e4 - slippageBps) / 1e4;
    const rawEthOut = Number(formatEther2(estimatedEth));
    return {
      ethOut: rawEthOut,
      minEthOut: rawEthOut * slippageMultiplier
    };
  } catch (err) {
    throw wrapError(err, `quoteSell(${tokenAddress})`);
  }
}
async function buy(params, signer, provider) {
  validateAddress(params.tokenAddress, "tokenAddress");
  validatePositiveAmount(params.ethAmount, "ethAmount");
  if (params.slippageBps !== void 0) validateSlippageBps(params.slippageBps);
  try {
    await preTradeChecks(params.tokenAddress, provider);
    const ethWei = parseEther2(trimDec(params.ethAmount));
    const readToken = new Contract3(params.tokenAddress, BondingCurveABI, provider);
    const estimatedTokens = await readToken.calculateTokenAmount(ethWei);
    let minTokensWei;
    if (params.minTokens) {
      minTokensWei = parseUnits(trimDec(params.minTokens), 18);
    } else if (params.slippageBps !== void 0 && params.slippageBps > 0) {
      const slippageMultiplier = BigInt(1e4 - params.slippageBps);
      minTokensWei = estimatedTokens * slippageMultiplier / BigInt(1e4);
    } else {
      minTokensWei = BigInt(0);
    }
    const token = new Contract3(params.tokenAddress, BondingCurveABI, signer);
    const overrides = buildTxOverrides(params.txOptions, { value: ethWei });
    const tx = await token.buy(minTokensWei, overrides);
    if (params.txOptions?.waitForReceipt === false) {
      return {
        txHash: tx.hash,
        amountOut: formatUnits3(estimatedTokens, 18)
      };
    }
    const receipt = await tx.wait(params.txOptions?.confirmations ?? 1);
    if (!receipt || receipt.status !== 1) {
      throw new TransactionFailedError("Buy transaction reverted", receipt?.hash);
    }
    let actualAmountOut;
    for (const log of receipt.logs) {
      try {
        if (log instanceof EventLog && log.eventName === "Buy") {
          actualAmountOut = formatUnits3(log.args[2], 18);
          break;
        }
        const parsed = token.interface.parseLog({ topics: log.topics, data: log.data });
        if (parsed && parsed.name === "Buy") {
          actualAmountOut = formatUnits3(parsed.args[2], 18);
          break;
        }
      } catch {
      }
    }
    return {
      txHash: receipt.hash,
      amountOut: formatUnits3(estimatedTokens, 18),
      actualAmountOut,
      gasUsed: receipt.gasUsed?.toString()
    };
  } catch (err) {
    throw wrapError(err, `buy(${params.tokenAddress})`);
  }
}
async function sell(params, signer, provider) {
  validateAddress(params.tokenAddress, "tokenAddress");
  validatePositiveAmount(params.tokenAmount, "tokenAmount");
  if (params.slippageBps !== void 0) validateSlippageBps(params.slippageBps);
  try {
    await preTradeChecks(params.tokenAddress, provider);
    const tokenWei = parseUnits(trimDec(params.tokenAmount), 18);
    const readToken = new Contract3(params.tokenAddress, BondingCurveABI, provider);
    const estimatedEth = await readToken.calculateEthAmount(tokenWei);
    let minEthWei;
    if (params.minEth) {
      minEthWei = parseEther2(trimDec(params.minEth));
    } else if (params.slippageBps !== void 0 && params.slippageBps > 0) {
      const slippageMultiplier = BigInt(1e4 - params.slippageBps);
      minEthWei = estimatedEth * slippageMultiplier / BigInt(1e4);
    } else {
      minEthWei = BigInt(0);
    }
    const token = new Contract3(params.tokenAddress, BondingCurveABI, signer);
    const overrides = buildTxOverrides(params.txOptions);
    const tx = await token.sell(tokenWei, minEthWei, overrides);
    if (params.txOptions?.waitForReceipt === false) {
      return {
        txHash: tx.hash,
        amountOut: formatEther2(estimatedEth)
      };
    }
    const receipt = await tx.wait(params.txOptions?.confirmations ?? 1);
    if (!receipt || receipt.status !== 1) {
      throw new TransactionFailedError("Sell transaction reverted", receipt?.hash);
    }
    let actualAmountOut;
    for (const log of receipt.logs) {
      try {
        if (log instanceof EventLog && log.eventName === "Sell") {
          actualAmountOut = formatEther2(log.args[2]);
          break;
        }
        const parsed = token.interface.parseLog({ topics: log.topics, data: log.data });
        if (parsed && parsed.name === "Sell") {
          actualAmountOut = formatEther2(parsed.args[2]);
          break;
        }
      } catch {
      }
    }
    return {
      txHash: receipt.hash,
      amountOut: formatEther2(estimatedEth),
      actualAmountOut,
      gasUsed: receipt.gasUsed?.toString()
    };
  } catch (err) {
    throw wrapError(err, `sell(${params.tokenAddress})`);
  }
}

// src/core/fees.ts
import { Contract as Contract4, formatEther as formatEther3, EventLog as EventLog2 } from "ethers";
async function getPendingFees(tokenAddress, walletAddress, provider) {
  validateAddress(tokenAddress, "tokenAddress");
  validateAddress(walletAddress, "walletAddress");
  try {
    const contract = new Contract4(tokenAddress, BondingCurveABI, provider);
    const pendingWei = await contract.pendingFees(walletAddress);
    return Number(formatEther3(pendingWei));
  } catch (err) {
    throw wrapError(err, `getPendingFees(${tokenAddress})`);
  }
}
async function claimFees(tokenAddress, signer) {
  validateAddress(tokenAddress, "tokenAddress");
  try {
    const contract = new Contract4(tokenAddress, BondingCurveABI, signer);
    const tx = await contract.claimFees();
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new TransactionFailedError("Fee claim transaction failed", receipt?.hash);
    }
    return { txHash: receipt.hash };
  } catch (err) {
    throw wrapError(err, `claimFees(${tokenAddress})`);
  }
}
async function getClaimHistory(tokenAddress, walletAddress, provider, lookbackBlocks = 5e5) {
  validateAddress(tokenAddress, "tokenAddress");
  validateAddress(walletAddress, "walletAddress");
  try {
    const contract = new Contract4(tokenAddress, BondingCurveABI, provider);
    const currentBlock = await provider.getBlockNumber();
    const startBlock = Math.max(0, currentBlock - lookbackBlocks);
    const CHUNK_SIZE2 = 49e3;
    const filter = contract.filters.FeesClaimed(walletAddress);
    const entries = [];
    let totalClaimedWei = 0n;
    for (let from = startBlock; from <= currentBlock; from += CHUNK_SIZE2) {
      const to = Math.min(from + CHUNK_SIZE2 - 1, currentBlock);
      const logs = await contract.queryFilter(filter, from, to);
      for (const log of logs) {
        let amount = 0n;
        if (log instanceof EventLog2 && log.args) {
          amount = log.args[1];
        } else {
          const parsed = contract.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          if (parsed) {
            amount = parsed.args[1];
          }
        }
        totalClaimedWei += amount;
        entries.push({
          wallet: walletAddress,
          amount: Number(formatEther3(amount)),
          blockNumber: log.blockNumber,
          txHash: log.transactionHash
        });
      }
    }
    return {
      entries,
      totalClaimed: Number(formatEther3(totalClaimedWei))
    };
  } catch (err) {
    throw wrapError(err, `getClaimHistory(${tokenAddress})`);
  }
}

// src/core/simulation.ts
import { Contract as Contract5, parseEther as parseEther3, parseUnits as parseUnits2, formatEther as formatEther4, formatUnits as formatUnits4 } from "ethers";
async function previewBuy(tokenAddress, ethAmount, slippageBps, provider) {
  validateAddress(tokenAddress, "tokenAddress");
  validatePositiveAmount(ethAmount, "ethAmount");
  validateSlippageBps(slippageBps);
  try {
    const token = new Contract5(tokenAddress, BondingCurveABI, provider);
    const ethWei = parseEther3(ethAmount.toString());
    const [currentPrice, estimatedTokens, ethThreshold, isTaxToken, taxInfo, companyFeePercent] = await Promise.all([
      token.getCurrentPrice(),
      token.calculateTokenAmount(ethWei),
      token.ethThreshold(),
      token.isTaxToken(),
      token.taxInfo(),
      token.companyFeePercent()
    ]);
    const precision = BigInt(10) ** BigInt(18);
    const currentPriceEth = Number(currentPrice) / Number(precision);
    const tokensOut = Number(formatUnits4(estimatedTokens, 18));
    const effectivePrice = tokensOut > 0 ? ethAmount / tokensOut : 0;
    const priceImpactPercent = currentPriceEth > 0 ? (effectivePrice - currentPriceEth) / currentPriceEth * 100 : 0;
    const companyFee = Number(companyFeePercent);
    const platformFee = ethAmount * (companyFee / 100);
    let devFee = 0;
    let marketingFee = 0;
    if (isTaxToken) {
      devFee = ethAmount * (Number(taxInfo.devBuyFeePercent) / 100);
      marketingFee = ethAmount * (Number(taxInfo.marketingBuyFeePercent) / 100);
    }
    const priceAfterTrade = effectivePrice;
    const slippageMultiplier = (1e4 - slippageBps) / 1e4;
    const worstCaseOutput = tokensOut * slippageMultiplier;
    const minimumOutput = tokensOut * slippageMultiplier;
    return {
      expectedOutput: tokensOut,
      priceImpactPercent: Math.abs(priceImpactPercent),
      fees: {
        platformFee,
        devFee,
        marketingFee,
        totalFee: platformFee + devFee + marketingFee
      },
      priceAfterTrade,
      worstCaseOutput,
      minimumOutput
    };
  } catch (err) {
    throw wrapError(err, `previewBuy(${tokenAddress})`);
  }
}
async function previewSell(tokenAddress, tokenAmount, slippageBps, provider) {
  validateAddress(tokenAddress, "tokenAddress");
  validatePositiveAmount(tokenAmount, "tokenAmount");
  validateSlippageBps(slippageBps);
  try {
    const token = new Contract5(tokenAddress, BondingCurveABI, provider);
    const tokenWei = parseUnits2(tokenAmount.toString(), 18);
    const [currentPrice, estimatedEth, isTaxToken, taxInfo, companyFeePercent] = await Promise.all([
      token.getCurrentPrice(),
      token.calculateEthAmount(tokenWei),
      token.isTaxToken(),
      token.taxInfo(),
      token.companyFeePercent()
    ]);
    const precision = BigInt(10) ** BigInt(18);
    const currentPriceEth = Number(currentPrice) / Number(precision);
    const ethOut = Number(formatEther4(estimatedEth));
    const effectivePrice = tokenAmount > 0 ? ethOut / tokenAmount : 0;
    const priceImpactPercent = currentPriceEth > 0 ? (currentPriceEth - effectivePrice) / currentPriceEth * 100 : 0;
    const companyFee = Number(companyFeePercent);
    const platformFee = ethOut * (companyFee / 100);
    let devFee = 0;
    let marketingFee = 0;
    if (isTaxToken) {
      devFee = ethOut * (Number(taxInfo.devSellFeePercent) / 100);
      marketingFee = ethOut * (Number(taxInfo.marketingSellFeePercent) / 100);
    }
    const slippageMultiplier = (1e4 - slippageBps) / 1e4;
    const worstCaseOutput = ethOut * slippageMultiplier;
    return {
      expectedOutput: ethOut,
      priceImpactPercent: Math.abs(priceImpactPercent),
      fees: {
        platformFee,
        devFee,
        marketingFee,
        totalFee: platformFee + devFee + marketingFee
      },
      priceAfterTrade: effectivePrice,
      worstCaseOutput,
      minimumOutput: worstCaseOutput
    };
  } catch (err) {
    throw wrapError(err, `previewSell(${tokenAddress})`);
  }
}

// src/core/gas.ts
import { Contract as Contract6, parseEther as parseEther4, parseUnits as parseUnits3 } from "ethers";
function trimDec2(val) {
  const str = typeof val === "number" ? val.toLocaleString("fullwide", { useGrouping: false, maximumFractionDigits: 20 }) : val;
  const [int, dec] = str.split(".");
  return dec ? `${int}.${dec.slice(0, 18)}` : str;
}
async function estimateBuyGas(params, signer, provider) {
  validateAddress(params.tokenAddress, "tokenAddress");
  validatePositiveAmount(params.ethAmount, "ethAmount");
  try {
    const token = new Contract6(params.tokenAddress, BondingCurveABI, signer);
    const ethWei = parseEther4(trimDec2(params.ethAmount));
    const minTokensWei = params.minTokens ? parseUnits3(trimDec2(params.minTokens), 18) : BigInt(0);
    return await token.buy.estimateGas(minTokensWei, { value: ethWei });
  } catch (err) {
    throw wrapError(err, `estimateBuyGas(${params.tokenAddress})`);
  }
}
async function estimateSellGas(params, signer, provider) {
  validateAddress(params.tokenAddress, "tokenAddress");
  validatePositiveAmount(params.tokenAmount, "tokenAmount");
  try {
    const token = new Contract6(params.tokenAddress, BondingCurveABI, signer);
    const tokenWei = parseUnits3(trimDec2(params.tokenAmount), 18);
    const minEthWei = params.minEth ? parseEther4(trimDec2(params.minEth)) : BigInt(0);
    return await token.sell.estimateGas(tokenWei, minEthWei);
  } catch (err) {
    throw wrapError(err, `estimateSellGas(${params.tokenAddress})`);
  }
}
async function estimateCreateGas(params, factoryAddress, signer, provider) {
  validateAddress(factoryAddress, "factoryAddress");
  try {
    const factory = new Contract6(factoryAddress, TokenFactoryABI, provider);
    const creationFee = await factory.creationFee();
    const initialBuyWei = parseEther4(params.initialBuyEth || "0");
    const totalValue = creationFee + initialBuyWei;
    const creatorAddress = await signer.getAddress();
    const factoryWrite = new Contract6(factoryAddress, TokenFactoryABI, signer);
    return await factoryWrite.createBondingCurve.estimateGas(
      params.name,
      params.symbol,
      parseEther4(params.totalSupply),
      parseEther4(params.ethThreshold),
      params.isTaxToken,
      params.devWallet || creatorAddress,
      params.devBuyFeePercent ?? 0,
      params.devSellFeePercent ?? 0,
      params.marketingWallet || creatorAddress,
      params.marketingBuyFeePercent ?? 0,
      params.marketingSellFeePercent ?? 0,
      initialBuyWei,
      parseEther4(params.initialVirtualEth || "0"),
      { value: totalValue }
    );
  } catch (err) {
    throw wrapError(err, "estimateCreateGas");
  }
}

// src/core/discovery.ts
import { Contract as Contract7, formatEther as formatEther5, formatUnits as formatUnits5 } from "ethers";
function parseProject(projectTuple, tokenAddress) {
  return {
    tokenAddress: tokenAddress ?? projectTuple.token,
    name: projectTuple.name,
    symbol: projectTuple.symbol,
    totalSupply: formatUnits5(projectTuple.totalSupply, 18),
    ethThreshold: formatEther5(projectTuple.ethThreshold),
    isTaxToken: projectTuple.isTaxToken,
    devWallet: projectTuple.devWallet,
    devBuyFeePercent: Number(projectTuple.devBuyFeePercent),
    devSellFeePercent: Number(projectTuple.devSellFeePercent),
    marketingWallet: projectTuple.marketingWallet,
    marketingBuyFeePercent: Number(projectTuple.marketingBuyFeePercent),
    marketingSellFeePercent: Number(projectTuple.marketingSellFeePercent),
    initialVirtualEth: formatEther5(projectTuple.initialVirtualEth),
    initialBuyAmount: formatEther5(projectTuple.initialBuyAmount)
  };
}
async function getTokenCount(factoryAddress, provider) {
  validateAddress(factoryAddress, "factoryAddress");
  try {
    const factory = new Contract7(factoryAddress, TokenFactoryABI, provider);
    const count = await factory.projectCount();
    return Number(count);
  } catch (err) {
    throw wrapError(err, "getTokenCount");
  }
}
async function getTokenByIndex(index, factoryAddress, provider) {
  validateAddress(factoryAddress, "factoryAddress");
  try {
    const factory = new Contract7(factoryAddress, TokenFactoryABI, provider);
    const project = await factory.getProjectById(index);
    return parseProject(project);
  } catch (err) {
    throw wrapError(err, `getTokenByIndex(${index})`);
  }
}
async function getTokenByAddress(tokenAddress, factoryAddress, provider) {
  validateAddress(tokenAddress, "tokenAddress");
  validateAddress(factoryAddress, "factoryAddress");
  try {
    const factory = new Contract7(factoryAddress, TokenFactoryABI, provider);
    const [pid, project] = await factory.getProjectByAddress(tokenAddress);
    return {
      id: Number(pid),
      project: parseProject(project, tokenAddress)
    };
  } catch (err) {
    throw wrapError(err, `getTokenByAddress(${tokenAddress})`);
  }
}
async function getAllTokens(factoryAddress, provider, options = {}) {
  validateAddress(factoryAddress, "factoryAddress");
  try {
    const factory = new Contract7(factoryAddress, TokenFactoryABI, provider);
    const totalCount = Number(await factory.projectCount());
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 20;
    const end = Math.min(offset + limit, totalCount);
    if (offset >= totalCount) return [];
    const promises = [];
    for (let i = offset; i < end; i++) {
      promises.push(
        factory.getProjectById(i).then((p) => parseProject(p))
      );
    }
    return await Promise.all(promises);
  } catch (err) {
    throw wrapError(err, "getAllTokens");
  }
}
async function getNewTokens(factoryAddress, provider, limit = 10) {
  validateAddress(factoryAddress, "factoryAddress");
  try {
    const factory = new Contract7(factoryAddress, TokenFactoryABI, provider);
    const totalCount = Number(await factory.projectCount());
    if (totalCount === 0) return [];
    const start = Math.max(0, totalCount - limit);
    const promises = [];
    for (let i = totalCount - 1; i >= start; i--) {
      promises.push(
        factory.getProjectById(i).then((p) => parseProject(p))
      );
    }
    return await Promise.all(promises);
  } catch (err) {
    throw wrapError(err, "getNewTokens");
  }
}
async function searchTokens(query, factoryAddress, provider, limit = 20) {
  validateAddress(factoryAddress, "factoryAddress");
  try {
    const all = await getAllTokens(factoryAddress, provider, { limit: 1e3 });
    const lowerQuery = query.toLowerCase();
    return all.filter(
      (p) => p.name.toLowerCase().includes(lowerQuery) || p.symbol.toLowerCase().includes(lowerQuery)
    ).slice(0, limit);
  } catch (err) {
    throw wrapError(err, `searchTokens("${query}")`);
  }
}

// src/core/creators.ts
async function getCreatorTokens(creatorAddress, factoryAddress, provider) {
  validateAddress(creatorAddress, "creatorAddress");
  validateAddress(factoryAddress, "factoryAddress");
  try {
    const all = await getAllTokens(factoryAddress, provider, { limit: 1e4 });
    const lowerCreator = creatorAddress.toLowerCase();
    return all.filter(
      (p) => p.devWallet.toLowerCase() === lowerCreator
    );
  } catch (err) {
    throw wrapError(err, `getCreatorTokens(${creatorAddress})`);
  }
}
async function getCreatorProfile(creatorAddress, factoryAddress, provider) {
  validateAddress(creatorAddress, "creatorAddress");
  validateAddress(factoryAddress, "factoryAddress");
  try {
    const tokens = await getCreatorTokens(creatorAddress, factoryAddress, provider);
    return {
      address: creatorAddress,
      tokenCount: tokens.length,
      tokens
    };
  } catch (err) {
    throw wrapError(err, `getCreatorProfile(${creatorAddress})`);
  }
}

// src/core/events.ts
import { Contract as Contract8, formatEther as formatEther6, formatUnits as formatUnits6, EventLog as EventLog3 } from "ethers";
var CHUNK_SIZE = 49e3;
async function getTradeHistory(tokenAddress, provider, options = {}) {
  validateAddress(tokenAddress, "tokenAddress");
  const lookback = options.lookbackBlocks ?? 5e5;
  const limit = options.limit ?? 100;
  try {
    const contract = new Contract8(tokenAddress, BondingCurveABI, provider);
    const currentBlock = await provider.getBlockNumber();
    const startBlock = Math.max(0, currentBlock - lookback);
    const buyFilter = contract.filters.Buy();
    const sellFilter = contract.filters.Sell();
    const events = [];
    for (let from = startBlock; from <= currentBlock; from += CHUNK_SIZE) {
      const to = Math.min(from + CHUNK_SIZE - 1, currentBlock);
      const [buyLogs, sellLogs] = await Promise.all([
        contract.queryFilter(buyFilter, from, to),
        contract.queryFilter(sellFilter, from, to)
      ]);
      for (const log of buyLogs) {
        try {
          let args;
          if (log instanceof EventLog3 && log.args) {
            args = log.args;
          } else {
            const parsed = contract.interface.parseLog({ topics: log.topics, data: log.data });
            args = parsed?.args;
          }
          if (args) {
            events.push({
              type: "buy",
              trader: args[0],
              ethAmount: Number(formatEther6(args[1])),
              tokenAmount: Number(formatUnits6(args[2], 18)),
              newPrice: Number(args[3]) / 1e18,
              blockNumber: log.blockNumber,
              txHash: log.transactionHash
            });
          }
        } catch {
        }
      }
      for (const log of sellLogs) {
        try {
          let args;
          if (log instanceof EventLog3 && log.args) {
            args = log.args;
          } else {
            const parsed = contract.interface.parseLog({ topics: log.topics, data: log.data });
            args = parsed?.args;
          }
          if (args) {
            events.push({
              type: "sell",
              trader: args[0],
              tokenAmount: Number(formatUnits6(args[1], 18)),
              ethAmount: Number(formatEther6(args[2])),
              newPrice: Number(args[3]) / 1e18,
              blockNumber: log.blockNumber,
              txHash: log.transactionHash
            });
          }
        } catch {
        }
      }
      if (events.length >= limit) break;
    }
    return events.sort((a, b) => b.blockNumber - a.blockNumber).slice(0, limit);
  } catch (err) {
    throw wrapError(err, `getTradeHistory(${tokenAddress})`);
  }
}
async function getTokenEvents(tokenAddress, provider, options = {}) {
  validateAddress(tokenAddress, "tokenAddress");
  const lookback = options.lookbackBlocks ?? 2e5;
  const allowedTypes = options.types ?? ["buy", "sell", "feeClaimed", "thresholdReached", "liquidityAdded", "feesUpdated"];
  try {
    const contract = new Contract8(tokenAddress, BondingCurveABI, provider);
    const currentBlock = await provider.getBlockNumber();
    const startBlock = Math.max(0, currentBlock - lookback);
    const events = [];
    const eventMap = {
      Buy: "buy",
      Sell: "sell",
      FeesClaimed: "feeClaimed",
      ThresholdReached: "thresholdReached",
      LiquidityAdded: "liquidityAdded",
      FeesUpdated: "feesUpdated"
    };
    for (let from = startBlock; from <= currentBlock; from += CHUNK_SIZE) {
      const to = Math.min(from + CHUNK_SIZE - 1, currentBlock);
      const logs = await contract.queryFilter("*", from, to);
      for (const log of logs) {
        try {
          let parsed;
          if (log instanceof EventLog3) {
            parsed = { name: log.eventName, args: log.args };
          } else {
            parsed = contract.interface.parseLog({ topics: log.topics, data: log.data });
          }
          if (parsed) {
            const type = eventMap[parsed.name];
            if (type && allowedTypes.includes(type)) {
              const data = {};
              for (let i = 0; i < parsed.args.length; i++) {
                data[`arg${i}`] = parsed.args[i]?.toString();
              }
              events.push({
                type,
                blockNumber: log.blockNumber,
                txHash: log.transactionHash,
                data
              });
            }
          }
        } catch {
        }
      }
    }
    return events.sort((a, b) => b.blockNumber - a.blockNumber);
  } catch (err) {
    throw wrapError(err, `getTokenEvents(${tokenAddress})`);
  }
}
async function getCreationEvents(factoryAddress, provider, options = {}) {
  validateAddress(factoryAddress, "factoryAddress");
  const lookback = options.lookbackBlocks ?? 5e5;
  try {
    const factory = new Contract8(factoryAddress, TokenFactoryABI, provider);
    const currentBlock = await provider.getBlockNumber();
    const startBlock = Math.max(0, currentBlock - lookback);
    const filter = factory.filters.BondingCurveCreated();
    const results = [];
    for (let from = startBlock; from <= currentBlock; from += CHUNK_SIZE) {
      const to = Math.min(from + CHUNK_SIZE - 1, currentBlock);
      const logs = await factory.queryFilter(filter, from, to);
      for (const log of logs) {
        try {
          let args;
          if (log instanceof EventLog3 && log.args) {
            args = log.args;
          } else {
            const parsed = factory.interface.parseLog({ topics: log.topics, data: log.data });
            args = parsed?.args;
          }
          if (args) {
            results.push({
              tokenAddress: args.token ?? args[0],
              creator: args.devWallet ?? args[6] ?? "",
              blockNumber: log.blockNumber,
              txHash: log.transactionHash
            });
          }
        } catch {
        }
      }
    }
    return results.sort((a, b) => b.blockNumber - a.blockNumber);
  } catch (err) {
    throw wrapError(err, "getCreationEvents");
  }
}
async function getHolderCount(tokenAddress, provider, lookbackBlocks = 5e5) {
  validateAddress(tokenAddress, "tokenAddress");
  try {
    const contract = new Contract8(tokenAddress, BondingCurveABI, provider);
    const currentBlock = await provider.getBlockNumber();
    const startBlock = Math.max(0, currentBlock - lookbackBlocks);
    const transferFilter = contract.filters.Transfer();
    const holders = /* @__PURE__ */ new Set();
    for (let from = startBlock; from <= currentBlock; from += CHUNK_SIZE) {
      const to = Math.min(from + CHUNK_SIZE - 1, currentBlock);
      try {
        const logs = await contract.queryFilter(transferFilter, from, to);
        for (const log of logs) {
          try {
            let toAddr;
            if (log instanceof EventLog3 && log.args) {
              toAddr = log.args[1];
            } else {
              const parsed = contract.interface.parseLog({ topics: log.topics, data: log.data });
              toAddr = parsed?.args[1] ?? "";
            }
            if (toAddr && toAddr !== "0x0000000000000000000000000000000000000000") {
              holders.add(toAddr.toLowerCase());
            }
          } catch {
          }
        }
      } catch {
      }
    }
    return holders.size;
  } catch (err) {
    throw wrapError(err, `getHolderCount(${tokenAddress})`);
  }
}
function subscribeTrades(tokenAddress, provider, callback) {
  validateAddress(tokenAddress, "tokenAddress");
  const contract = new Contract8(tokenAddress, BondingCurveABI, provider);
  const handleBuy = (buyer, ethAmount, tokenAmount, newPrice, event) => {
    callback({
      type: "buy",
      trader: buyer,
      ethAmount: Number(formatEther6(ethAmount)),
      tokenAmount: Number(formatUnits6(tokenAmount, 18)),
      newPrice: Number(newPrice) / 1e18,
      blockNumber: event?.log?.blockNumber ?? 0,
      txHash: event?.log?.transactionHash ?? ""
    });
  };
  const handleSell = (seller, tokenAmount, ethAmount, newPrice, event) => {
    callback({
      type: "sell",
      trader: seller,
      ethAmount: Number(formatEther6(ethAmount)),
      tokenAmount: Number(formatUnits6(tokenAmount, 18)),
      newPrice: Number(newPrice) / 1e18,
      blockNumber: event?.log?.blockNumber ?? 0,
      txHash: event?.log?.transactionHash ?? ""
    });
  };
  contract.on("Buy", handleBuy);
  contract.on("Sell", handleSell);
  return () => {
    contract.off("Buy", handleBuy);
    contract.off("Sell", handleSell);
  };
}
function subscribeNewTokens(factoryAddress, provider, callback) {
  validateAddress(factoryAddress, "factoryAddress");
  const factory = new Contract8(factoryAddress, TokenFactoryABI, provider);
  const handler = (token, name, symbol, ...rest) => {
    const event = rest[rest.length - 1];
    callback({
      tokenAddress: token,
      name,
      symbol,
      txHash: event?.log?.transactionHash ?? ""
    });
  };
  factory.on("BondingCurveCreated", handler);
  return () => {
    factory.off("BondingCurveCreated", handler);
  };
}

// src/core/lifecycle.ts
import { Contract as Contract9, formatEther as formatEther7 } from "ethers";
async function getLifecycleState(tokenAddress, provider) {
  validateAddress(tokenAddress, "tokenAddress");
  try {
    const token = new Contract9(tokenAddress, BondingCurveABI, provider);
    const [thresholdReached, ethThreshold, isPaused, uniswapPair, uniswapRouter] = await Promise.all([
      token.thresholdReached(),
      token.ethThreshold(),
      token.paused().catch(() => false),
      // paused() may not exist on all versions
      token.uniswapPair().catch(() => "0x0000000000000000000000000000000000000000"),
      token.uniswapRouter().catch(() => "0x0000000000000000000000000000000000000000")
    ]);
    const ethBalance = Number(formatEther7(await provider.getBalance(tokenAddress)));
    const ethThresholdNum = Number(formatEther7(ethThreshold));
    let stage;
    const zeroAddr = "0x0000000000000000000000000000000000000000";
    const pairIsSet = uniswapPair && uniswapPair !== zeroAddr;
    if (isPaused) {
      stage = "paused";
    } else if (pairIsSet) {
      stage = "finalized";
    } else if (thresholdReached) {
      stage = "threshold_reached";
    } else {
      stage = "bonding";
    }
    const progress = ethThresholdNum > 0 ? Math.min(ethBalance / ethThresholdNum * 100, 100) : 0;
    return {
      stage,
      thresholdReached,
      isPaused,
      ethBalance,
      ethThreshold: ethThresholdNum,
      progress,
      uniswapPair: pairIsSet ? uniswapPair : null,
      uniswapRouter: uniswapRouter !== zeroAddr ? uniswapRouter : null
    };
  } catch (err) {
    throw wrapError(err, `getLifecycleState(${tokenAddress})`);
  }
}
async function isFinalized(tokenAddress, provider) {
  const state = await getLifecycleState(tokenAddress, provider);
  return state.stage === "finalized";
}
async function finalizeToken(tokenAddress, signer) {
  validateAddress(tokenAddress, "tokenAddress");
  try {
    const contract = new Contract9(tokenAddress, BondingCurveABI, signer);
    const tx = await contract.finalize();
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new TransactionFailedError("Finalization transaction failed", receipt?.hash);
    }
    return { txHash: receipt.hash };
  } catch (err) {
    throw wrapError(err, `finalizeToken(${tokenAddress})`);
  }
}
async function getMigrationState(tokenAddress, provider) {
  const state = await getLifecycleState(tokenAddress, provider);
  return {
    isFinalized: state.stage === "finalized",
    uniswapPair: state.uniswapPair,
    uniswapRouter: state.uniswapRouter,
    stage: state.stage,
    progress: state.progress
  };
}

// src/core/batch.ts
async function batchGetTokenStates(tokenAddresses, provider, options = {}) {
  const concurrency = options.concurrency ?? 5;
  const cache = options.cache;
  const results = /* @__PURE__ */ new Map();
  for (const addr of tokenAddresses) {
    validateAddress(addr, "tokenAddress");
  }
  const toFetch = [];
  for (const addr of tokenAddresses) {
    if (cache) {
      const cached = cache.get(`state:${addr}`);
      if (cached) {
        results.set(addr, cached);
        continue;
      }
    }
    toFetch.push(addr);
  }
  for (let i = 0; i < toFetch.length; i += concurrency) {
    const chunk = toFetch.slice(i, i + concurrency);
    const chunkResults = await Promise.allSettled(
      chunk.map(async (addr) => {
        try {
          const state = await getTokenState(addr, provider);
          if (cache) cache.set(`state:${addr}`, state);
          return { addr, state };
        } catch (err) {
          throw wrapError(err, `batchGetTokenStates(${addr})`);
        }
      })
    );
    for (const result of chunkResults) {
      if (result.status === "fulfilled") {
        results.set(result.value.addr, result.value.state);
      }
    }
  }
  return results;
}
async function batchGetPendingFees(tokenAddresses, walletAddress, provider, options = {}) {
  validateAddress(walletAddress, "walletAddress");
  const concurrency = options.concurrency ?? 5;
  const results = /* @__PURE__ */ new Map();
  for (let i = 0; i < tokenAddresses.length; i += concurrency) {
    const chunk = tokenAddresses.slice(i, i + concurrency);
    const chunkResults = await Promise.allSettled(
      chunk.map(async (addr) => {
        const fees = await getPendingFees(addr, walletAddress, provider);
        return { addr, fees };
      })
    );
    for (const result of chunkResults) {
      if (result.status === "fulfilled") {
        results.set(result.value.addr, result.value.fees);
      } else {
        results.set(chunk[chunkResults.indexOf(result)], 0);
      }
    }
  }
  return results;
}

// src/core/cache.ts
var RequestCache = class {
  constructor(options = {}) {
    this.cache = /* @__PURE__ */ new Map();
    this.ttlMs = options.ttlMs ?? 1e4;
    this.staleWhileRevalidate = options.staleWhileRevalidate ?? true;
  }
  /**
   * Get a cached value by key. Returns null if not found or expired.
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    const age = Date.now() - entry.timestamp;
    if (age > this.ttlMs) {
      if (!this.staleWhileRevalidate) {
        this.cache.delete(key);
        return null;
      }
    }
    return entry.value;
  }
  /**
   * Check if a key exists and is fresh (not expired).
   */
  isFresh(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    return Date.now() - entry.timestamp <= this.ttlMs;
  }
  /**
   * Check if a key exists (may be stale).
   */
  has(key) {
    return this.cache.has(key);
  }
  /**
   * Set a cached value.
   */
  set(key, value) {
    this.cache.set(key, { value, timestamp: Date.now() });
  }
  /**
   * Invalidate a specific key.
   */
  invalidate(key) {
    this.cache.delete(key);
  }
  /**
   * Clear the entire cache.
   */
  clear() {
    this.cache.clear();
  }
  /**
   * Get the number of entries in the cache.
   */
  get size() {
    return this.cache.size;
  }
};

// src/core/Axolotl.ts
var Tokena = class {
  constructor(config) {
    this.config = config;
    this.chains = { ...DEFAULT_CHAINS, ...config.chains };
    this.defaultChainKey = config.chainKey;
    this.debugMode = config.debug ?? false;
    if (config.factoryAddress) {
      const chain = this.chains[this.defaultChainKey];
      if (chain) {
        this.chains[this.defaultChainKey] = { ...chain, factoryAddress: config.factoryAddress };
      }
    }
    if (!this.chains[this.defaultChainKey]) {
      throw new TokenaError(
        `Unknown chain "${this.defaultChainKey}". Available: ${Object.keys(this.chains).join(", ")}`,
        "INVALID_CHAIN"
      );
    }
    if (config.cache) {
      this.cache = new RequestCache(config.cache);
    }
  }
  log(...args) {
    if (this.debugMode) {
      console.log("[tokena]", ...args);
    }
  }
  // ─── Chain Helpers ───────────────────────────────────────────
  /** Get the configuration for a chain by key. */
  getChainConfig(chainKey) {
    const key = chainKey ?? this.defaultChainKey;
    const config = this.chains[key];
    if (!config) throw new TokenaError(`Unknown chain: ${key}`, "INVALID_CHAIN");
    return config;
  }
  /** Get a read-only provider for a chain. */
  getProvider(chainKey) {
    return getProvider(this.getChainConfig(chainKey));
  }
  /** Get the factory address for a chain. */
  getFactoryAddress(chainKey) {
    const config = this.getChainConfig(chainKey);
    if (!config.factoryAddress) {
      throw new TokenaError(`No factory deployed on ${config.name}`, "NO_FACTORY");
    }
    return config.factoryAddress;
  }
  /** Clear cached providers and request cache. */
  clearCache() {
    clearProviderCache();
    this.cache?.clear();
  }
  // ─── Token State ─────────────────────────────────────────────
  /** Read the full on-chain state of a bonding curve token. */
  async getTokenState(tokenAddress, chainKey) {
    this.log("getTokenState", tokenAddress, chainKey);
    return getTokenState(tokenAddress, this.getProvider(chainKey));
  }
  /** Get enriched token state with computed progress, market cap, etc. */
  async getEnrichedTokenState(tokenAddress, chainKey) {
    const state = await this.getTokenState(tokenAddress, chainKey);
    return enrichTokenState(state);
  }
  /** Get a wallet's token balance. */
  async getTokenBalance(tokenAddress, walletAddress, chainKey) {
    this.log("getTokenBalance", tokenAddress, walletAddress);
    return getTokenBalance(tokenAddress, walletAddress, this.getProvider(chainKey));
  }
  // ─── Factory ─────────────────────────────────────────────────
  /** Create a new bonding curve token. */
  async createToken(params, signer, chainKey) {
    this.log("createToken", params.name, params.symbol);
    const factoryAddress = this.getFactoryAddress(chainKey);
    const provider = this.getProvider(chainKey);
    return createToken(params, factoryAddress, signer, provider);
  }
  /** Get the creation fee required by the factory. */
  async getCreationFee(chainKey) {
    return getCreationFee(this.getFactoryAddress(chainKey), this.getProvider(chainKey));
  }
  /** Get full factory configuration. */
  async getFactoryConfig(chainKey) {
    return getFactoryConfig(this.getFactoryAddress(chainKey), this.getProvider(chainKey));
  }
  // ─── Trading ─────────────────────────────────────────────────
  /** Quote a buy (estimated tokens for a given ETH amount). */
  async quoteBuy(tokenAddress, ethAmount, chainKey) {
    this.log("quoteBuy", tokenAddress, ethAmount);
    return quoteBuy(tokenAddress, ethAmount, this.getProvider(chainKey));
  }
  /** Quote a sell (estimated ETH for a given token amount). */
  async quoteSell(tokenAddress, tokenAmount, slippageBps = 500, chainKey) {
    return quoteSell(tokenAddress, tokenAmount, slippageBps, this.getProvider(chainKey));
  }
  /** Buy tokens on a bonding curve. */
  async buy(params, signer, chainKey) {
    this.log("buy", params.tokenAddress, params.ethAmount);
    return buy(params, signer, this.getProvider(chainKey));
  }
  /** Sell tokens on a bonding curve. */
  async sell(params, signer, chainKey) {
    this.log("sell", params.tokenAddress, params.tokenAmount);
    return sell(params, signer, this.getProvider(chainKey));
  }
  // ─── Trade Preview / Simulation ──────────────────────────────
  /** Preview a buy with price impact, fees, and worst-case output. */
  async previewBuy(tokenAddress, ethAmount, slippageBps = 500, chainKey) {
    this.log("previewBuy", tokenAddress, ethAmount, slippageBps);
    return previewBuy(tokenAddress, ethAmount, slippageBps, this.getProvider(chainKey));
  }
  /** Preview a sell with price impact, fees, and worst-case output. */
  async previewSell(tokenAddress, tokenAmount, slippageBps = 500, chainKey) {
    return previewSell(tokenAddress, tokenAmount, slippageBps, this.getProvider(chainKey));
  }
  // ─── Gas Estimation ──────────────────────────────────────────
  /** Estimate gas for a buy transaction. */
  async estimateBuyGas(params, signer, chainKey) {
    return estimateBuyGas(params, signer, this.getProvider(chainKey));
  }
  /** Estimate gas for a sell transaction. */
  async estimateSellGas(params, signer, chainKey) {
    return estimateSellGas(params, signer, this.getProvider(chainKey));
  }
  /** Estimate gas for a token creation transaction. */
  async estimateCreateGas(params, signer, chainKey) {
    return estimateCreateGas(params, this.getFactoryAddress(chainKey), signer, this.getProvider(chainKey));
  }
  // ─── Fees ────────────────────────────────────────────────────
  /** Get pending (claimable) fees for a wallet. */
  async getPendingFees(tokenAddress, walletAddress, chainKey) {
    return getPendingFees(tokenAddress, walletAddress, this.getProvider(chainKey));
  }
  /** Claim accumulated fees. */
  async claimFees(tokenAddress, signer) {
    this.log("claimFees", tokenAddress);
    return claimFees(tokenAddress, signer);
  }
  /** Get historical fee claim events for a wallet. */
  async getClaimHistory(tokenAddress, walletAddress, chainKey, lookbackBlocks) {
    return getClaimHistory(tokenAddress, walletAddress, this.getProvider(chainKey), lookbackBlocks);
  }
  // ─── Discovery ───────────────────────────────────────────────
  /** Get total number of tokens created. */
  async getTokenCount(chainKey) {
    return getTokenCount(this.getFactoryAddress(chainKey), this.getProvider(chainKey));
  }
  /** Get a project by its factory index. */
  async getTokenByIndex(index, chainKey) {
    return getTokenByIndex(index, this.getFactoryAddress(chainKey), this.getProvider(chainKey));
  }
  /** Get a project by its token contract address. */
  async getTokenByAddress(tokenAddress, chainKey) {
    return getTokenByAddress(tokenAddress, this.getFactoryAddress(chainKey), this.getProvider(chainKey));
  }
  /** Get all tokens with pagination. */
  async getAllTokens(options, chainKey) {
    return getAllTokens(this.getFactoryAddress(chainKey), this.getProvider(chainKey), options);
  }
  /** Get the newest tokens (most recently created). */
  async getNewTokens(limit, chainKey) {
    return getNewTokens(this.getFactoryAddress(chainKey), this.getProvider(chainKey), limit);
  }
  /** Search tokens by name or symbol. */
  async searchTokens(query, limit, chainKey) {
    return searchTokens(query, this.getFactoryAddress(chainKey), this.getProvider(chainKey), limit);
  }
  // ─── Creators ────────────────────────────────────────────────
  /** Get all tokens created by a specific wallet. */
  async getCreatorTokens(creatorAddress, chainKey) {
    return getCreatorTokens(creatorAddress, this.getFactoryAddress(chainKey), this.getProvider(chainKey));
  }
  /** Get a creator's profile. */
  async getCreatorProfile(creatorAddress, chainKey) {
    return getCreatorProfile(creatorAddress, this.getFactoryAddress(chainKey), this.getProvider(chainKey));
  }
  // ─── Events / Indexing ───────────────────────────────────────
  /** Get trade history for a token. */
  async getTradeHistory(tokenAddress, options, chainKey) {
    return getTradeHistory(tokenAddress, this.getProvider(chainKey), options);
  }
  /** Get all events for a token. */
  async getTokenEvents(tokenAddress, options, chainKey) {
    return getTokenEvents(tokenAddress, this.getProvider(chainKey), options);
  }
  /** Get token creation events from the factory. */
  async getCreationEvents(options, chainKey) {
    return getCreationEvents(this.getFactoryAddress(chainKey), this.getProvider(chainKey), options);
  }
  /** Get estimated holder count for a token. */
  async getHolderCount(tokenAddress, lookbackBlocks, chainKey) {
    return getHolderCount(tokenAddress, this.getProvider(chainKey), lookbackBlocks);
  }
  /** Subscribe to real-time trade events. Returns an unsubscribe function. */
  subscribeTrades(tokenAddress, callback, chainKey) {
    return subscribeTrades(tokenAddress, this.getProvider(chainKey), callback);
  }
  /** Subscribe to new token creation events. Returns an unsubscribe function. */
  subscribeNewTokens(callback, chainKey) {
    return subscribeNewTokens(this.getFactoryAddress(chainKey), this.getProvider(chainKey), callback);
  }
  // ─── Metadata ────────────────────────────────────────────────
  /** Get token metadata via the configured adapter. */
  async getTokenMetadata(tokenAddress) {
    if (!this.config.metadataAdapter) return null;
    return this.config.metadataAdapter.getTokenMetadata(tokenAddress);
  }
  // ─── Lifecycle ───────────────────────────────────────────────
  /** Get the lifecycle state of a bonding curve. */
  async getLifecycleState(tokenAddress, chainKey) {
    return getLifecycleState(tokenAddress, this.getProvider(chainKey));
  }
  /** Check if a token is finalized. */
  async isFinalized(tokenAddress, chainKey) {
    return isFinalized(tokenAddress, this.getProvider(chainKey));
  }
  /** Finalize a bonding curve (add liquidity to Uniswap). */
  async finalizeToken(tokenAddress, signer) {
    this.log("finalizeToken", tokenAddress);
    return finalizeToken(tokenAddress, signer);
  }
  /** Get migration/finalization state. */
  async getMigrationState(tokenAddress, chainKey) {
    return getMigrationState(tokenAddress, this.getProvider(chainKey));
  }
  // ─── Batch Operations ────────────────────────────────────────
  /** Fetch token states for many tokens at once. */
  async batchGetTokenStates(tokenAddresses, chainKey) {
    return batchGetTokenStates(tokenAddresses, this.getProvider(chainKey), { cache: this.cache });
  }
  /** Fetch pending fees for many tokens at once. */
  async batchGetPendingFees(tokenAddresses, walletAddress, chainKey) {
    return batchGetPendingFees(tokenAddresses, walletAddress, this.getProvider(chainKey));
  }
};

// src/react/AxolotlProvider.tsx
import { jsx } from "react/jsx-runtime";
var TokenaContext = createContext(null);
function TokenaProvider({
  children,
  ...config
}) {
  const sdk = useMemo(() => new Tokena(config), [config.chainKey, config.factoryAddress]);
  const value = useMemo(
    () => ({ sdk, chainKey: config.chainKey }),
    [sdk, config.chainKey]
  );
  return /* @__PURE__ */ jsx(TokenaContext.Provider, { value, children });
}
function useTokena() {
  const ctx = useContext(TokenaContext);
  if (!ctx) {
    throw new Error("useTokena must be used within a <TokenaProvider>");
  }
  return ctx.sdk;
}
var AxolotlProvider = TokenaProvider;
var useAxolotl = useTokena;

// src/react/useWallet.ts
import { useState, useEffect, useCallback } from "react";
import { BrowserProvider, formatEther as formatEther8 } from "ethers";
function useTokenaWallet(targetChain) {
  const [state, setState] = useState({
    address: null,
    balance: null,
    connected: false,
    chainId: null,
    connecting: false,
    error: null
  });
  const getEthereum = useCallback(() => {
    if (typeof window === "undefined") return null;
    return window.ethereum ?? null;
  }, []);
  const fetchBalance = useCallback(async (provider, addr) => {
    try {
      const bal = await provider.getBalance(addr);
      return formatEther8(bal);
    } catch {
      return null;
    }
  }, []);
  useEffect(() => {
    const ethereum = getEthereum();
    if (!ethereum) return;
    async function checkConnection() {
      try {
        const accounts = await ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) {
          const provider = new BrowserProvider(ethereum);
          const network = await provider.getNetwork();
          const bal = await fetchBalance(provider, accounts[0]);
          setState({
            address: accounts[0],
            balance: bal,
            connected: true,
            chainId: Number(network.chainId),
            connecting: false,
            error: null
          });
        }
      } catch (err) {
        console.error("Wallet check failed:", err);
      }
    }
    checkConnection();
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setState({ address: null, balance: null, connected: false, chainId: null, connecting: false, error: null });
      } else {
        setState((prev) => ({ ...prev, address: accounts[0], connected: true }));
      }
    };
    const handleChainChanged = () => checkConnection();
    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);
    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
      ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [getEthereum, fetchBalance]);
  const connect = useCallback(async () => {
    const ethereum = getEthereum();
    if (!ethereum) {
      setState((prev) => ({ ...prev, error: "MetaMask not installed" }));
      return;
    }
    setState((prev) => ({ ...prev, connecting: true, error: null }));
    try {
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      if (targetChain) {
        try {
          await ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x" + targetChain.chainId.toString(16) }]
          });
        } catch (switchErr) {
          if (switchErr.code === 4902) {
            await ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: "0x" + targetChain.chainId.toString(16),
                chainName: targetChain.name,
                rpcUrls: [targetChain.rpcUrl],
                blockExplorerUrls: [targetChain.explorerUrl],
                nativeCurrency: targetChain.nativeCurrency
              }]
            });
          }
        }
      }
      const provider = new BrowserProvider(ethereum);
      const network = await provider.getNetwork();
      const bal = await fetchBalance(provider, accounts[0]);
      setState({
        address: accounts[0],
        balance: bal,
        connected: true,
        chainId: Number(network.chainId),
        connecting: false,
        error: null
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        connecting: false,
        error: err?.message ?? "Connection failed"
      }));
    }
  }, [getEthereum, targetChain, fetchBalance]);
  const disconnect = useCallback(() => {
    setState({ address: null, balance: null, connected: false, chainId: null, connecting: false, error: null });
  }, []);
  const getSigner = useCallback(async () => {
    const ethereum = getEthereum();
    if (!ethereum) return null;
    const provider = new BrowserProvider(ethereum);
    return provider.getSigner();
  }, [getEthereum]);
  return {
    ...state,
    connect,
    disconnect,
    getSigner
  };
}
var useAxolotlWallet = useTokenaWallet;

// src/react/usePoolState.ts
import { useEffect as useEffect2, useState as useState2, useCallback as useCallback2 } from "react";
function usePoolState(tokenAddress, chainKey, pollInterval = 1e4) {
  const sdk = useTokena();
  const [state, setState] = useState2(null);
  const [isLoading, setIsLoading] = useState2(true);
  const [error, setError] = useState2(null);
  const refresh = useCallback2(async () => {
    if (!tokenAddress) return;
    try {
      const newState = await sdk.getTokenState(tokenAddress, chainKey);
      setState(newState);
      setError(null);
    } catch (err) {
      setError(err?.message ?? "Failed to fetch token state");
      console.error("[tokena] Pool state polling error:", err);
    }
  }, [tokenAddress, chainKey, sdk]);
  useEffect2(() => {
    if (!tokenAddress) {
      setIsLoading(false);
      return;
    }
    let isMounted = true;
    let timer;
    async function poll() {
      try {
        const newState = await sdk.getTokenState(tokenAddress, chainKey);
        if (isMounted) {
          setState(newState);
          setIsLoading(false);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message ?? "Failed to fetch token state");
          setIsLoading(false);
        }
        console.error("[tokena] Pool state polling error:", err);
      }
      if (isMounted) {
        timer = setTimeout(poll, pollInterval);
      }
    }
    setIsLoading(true);
    poll();
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [tokenAddress, chainKey, pollInterval, sdk]);
  return { state, isLoading, error, refresh };
}

// src/react/useTrade.ts
import { useState as useState3, useCallback as useCallback3 } from "react";
function useTrade(chainKey) {
  const sdk = useTokena();
  const [loading, setLoading] = useState3(false);
  const [error, setError] = useState3(null);
  const quoteBuy2 = useCallback3(
    async (tokenAddress, ethAmount) => {
      return sdk.quoteBuy(tokenAddress, ethAmount, chainKey);
    },
    [sdk, chainKey]
  );
  const quoteSell2 = useCallback3(
    async (tokenAddress, tokenAmount, slippageBps = 500) => {
      return sdk.quoteSell(tokenAddress, tokenAmount, slippageBps, chainKey);
    },
    [sdk, chainKey]
  );
  const previewBuy2 = useCallback3(
    async (tokenAddress, ethAmount, slippageBps = 500) => {
      return sdk.previewBuy(tokenAddress, ethAmount, slippageBps, chainKey);
    },
    [sdk, chainKey]
  );
  const previewSell2 = useCallback3(
    async (tokenAddress, tokenAmount, slippageBps = 500) => {
      return sdk.previewSell(tokenAddress, tokenAmount, slippageBps, chainKey);
    },
    [sdk, chainKey]
  );
  const buy2 = useCallback3(
    async (params, signer) => {
      setLoading(true);
      setError(null);
      try {
        const result = await sdk.buy(params, signer, chainKey);
        return result;
      } catch (err) {
        setError(err?.message ?? "Buy failed");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [sdk, chainKey]
  );
  const sell2 = useCallback3(
    async (params, signer) => {
      setLoading(true);
      setError(null);
      try {
        const result = await sdk.sell(params, signer, chainKey);
        return result;
      } catch (err) {
        setError(err?.message ?? "Sell failed");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [sdk, chainKey]
  );
  return { quoteBuy: quoteBuy2, quoteSell: quoteSell2, previewBuy: previewBuy2, previewSell: previewSell2, buy: buy2, sell: sell2, loading, error };
}

// src/react/useClaimFees.ts
import { useState as useState4, useEffect as useEffect3, useCallback as useCallback4 } from "react";
function useClaimFees(tokenAddresses, walletAddress, chainKey) {
  const sdk = useTokena();
  const [claimableMap, setClaimableMap] = useState4({});
  const [totalClaimedMap, setTotalClaimedMap] = useState4({});
  const [loading, setLoading] = useState4(true);
  const [claimingToken, setClaimingToken] = useState4(null);
  const [error, setError] = useState4(null);
  const addressKey = tokenAddresses.join(",");
  const refresh = useCallback4(async () => {
    if (!tokenAddresses.length || !walletAddress) {
      setLoading(false);
      setClaimableMap({});
      setTotalClaimedMap({});
      return;
    }
    setLoading(true);
    try {
      const cMap = {};
      const tMap = {};
      const BATCH_SIZE = 3;
      for (let i = 0; i < tokenAddresses.length; i += BATCH_SIZE) {
        const batch = tokenAddresses.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (addr) => {
            try {
              const pending = await sdk.getPendingFees(addr, walletAddress, chainKey);
              cMap[addr] = pending;
              const history = await sdk.getClaimHistory(addr, walletAddress, chainKey);
              tMap[addr] = history.totalClaimed;
            } catch (err) {
              console.warn(`[tokena] Failed to fetch fees for ${addr}:`, err);
              cMap[addr] = 0;
              tMap[addr] = 0;
            }
          })
        );
      }
      setClaimableMap(cMap);
      setTotalClaimedMap(tMap);
    } catch (err) {
      console.warn("[tokena] Fee fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [addressKey, walletAddress, chainKey, sdk]);
  useEffect3(() => {
    refresh();
  }, [refresh]);
  const claim = useCallback4(
    async (tokenAddress, signer) => {
      setClaimingToken(tokenAddress);
      setError(null);
      try {
        const result = await sdk.claimFees(tokenAddress, signer);
        const claimedAmount = claimableMap[tokenAddress] ?? 0;
        setClaimableMap((prev) => ({ ...prev, [tokenAddress]: 0 }));
        setTotalClaimedMap((prev) => ({
          ...prev,
          [tokenAddress]: (prev[tokenAddress] ?? 0) + claimedAmount
        }));
        return result;
      } catch (err) {
        setError(err?.message ?? "Claim failed");
        return null;
      } finally {
        setClaimingToken(null);
      }
    },
    [sdk, claimableMap]
  );
  const totalClaimable = Object.values(claimableMap).reduce((s, v) => s + v, 0);
  const totalClaimed = Object.values(totalClaimedMap).reduce((s, v) => s + v, 0);
  return {
    claimableMap,
    totalClaimedMap,
    totalClaimable,
    totalClaimed,
    claim,
    claimingToken,
    loading,
    error,
    refresh
  };
}

// src/react/useTokenState.ts
import { useEffect as useEffect4, useState as useState5, useCallback as useCallback5 } from "react";
function useTokenState(tokenAddress, options = {}) {
  const sdk = useTokena();
  const { pollInterval = 1e4, chainKey } = options;
  const [state, setState] = useState5(null);
  const [enriched, setEnriched] = useState5(null);
  const [isLoading, setIsLoading] = useState5(true);
  const [error, setError] = useState5(null);
  const refresh = useCallback5(async () => {
    if (!tokenAddress) return;
    try {
      const newState = await sdk.getTokenState(tokenAddress, chainKey);
      setState(newState);
      setEnriched(enrichTokenState(newState));
      setError(null);
    } catch (err) {
      setError(err?.message ?? "Failed to fetch token state");
    }
  }, [tokenAddress, chainKey, sdk]);
  useEffect4(() => {
    if (!tokenAddress) {
      setIsLoading(false);
      return;
    }
    let isMounted = true;
    let timer;
    async function poll() {
      try {
        const newState = await sdk.getTokenState(tokenAddress, chainKey);
        if (isMounted) {
          setState(newState);
          setEnriched(enrichTokenState(newState));
          setIsLoading(false);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message ?? "Failed to fetch token state");
          setIsLoading(false);
        }
      }
      if (isMounted) {
        timer = setTimeout(poll, pollInterval);
      }
    }
    setIsLoading(true);
    poll();
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [tokenAddress, chainKey, pollInterval, sdk]);
  return { state, enriched, isLoading, error, refresh };
}

// src/react/useQuoteBuy.ts
import { useEffect as useEffect5, useState as useState6, useRef } from "react";
function useQuoteBuy(tokenAddress, ethAmount, options = {}) {
  const sdk = useTokena();
  const { slippageBps = 500, debounceMs = 300, chainKey } = options;
  const [preview, setPreview] = useState6(null);
  const [isLoading, setIsLoading] = useState6(false);
  const [error, setError] = useState6(null);
  const timerRef = useRef();
  useEffect5(() => {
    if (!tokenAddress || !ethAmount || ethAmount <= 0) {
      setPreview(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const result = await sdk.previewBuy(tokenAddress, ethAmount, slippageBps, chainKey);
        setPreview(result);
        setError(null);
      } catch (err) {
        setError(err?.message ?? "Quote failed");
        setPreview(null);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [tokenAddress, ethAmount, slippageBps, debounceMs, chainKey, sdk]);
  return { preview, isLoading, error };
}

// src/react/useQuoteSell.ts
import { useEffect as useEffect6, useState as useState7, useRef as useRef2 } from "react";
function useQuoteSell(tokenAddress, tokenAmount, options = {}) {
  const sdk = useTokena();
  const { slippageBps = 500, debounceMs = 300, chainKey } = options;
  const [preview, setPreview] = useState7(null);
  const [isLoading, setIsLoading] = useState7(false);
  const [error, setError] = useState7(null);
  const timerRef = useRef2();
  useEffect6(() => {
    if (!tokenAddress || !tokenAmount || tokenAmount <= 0) {
      setPreview(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const result = await sdk.previewSell(tokenAddress, tokenAmount, slippageBps, chainKey);
        setPreview(result);
        setError(null);
      } catch (err) {
        setError(err?.message ?? "Quote failed");
        setPreview(null);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [tokenAddress, tokenAmount, slippageBps, debounceMs, chainKey, sdk]);
  return { preview, isLoading, error };
}

// src/react/useTradeHistory.ts
import { useEffect as useEffect7, useState as useState8, useCallback as useCallback6 } from "react";
function useTradeHistory(tokenAddress, options = {}) {
  const sdk = useTokena();
  const { limit = 50, autoRefresh = false, refreshInterval = 3e4, chainKey } = options;
  const [trades, setTrades] = useState8([]);
  const [isLoading, setIsLoading] = useState8(true);
  const [error, setError] = useState8(null);
  const refresh = useCallback6(async () => {
    if (!tokenAddress) return;
    try {
      const result = await sdk.getTradeHistory(tokenAddress, { limit }, chainKey);
      setTrades(result);
      setError(null);
    } catch (err) {
      setError(err?.message ?? "Failed to fetch trade history");
    }
  }, [tokenAddress, limit, chainKey, sdk]);
  useEffect7(() => {
    if (!tokenAddress) {
      setIsLoading(false);
      return;
    }
    let isMounted = true;
    let timer;
    async function fetch() {
      try {
        const result = await sdk.getTradeHistory(tokenAddress, { limit }, chainKey);
        if (isMounted) {
          setTrades(result);
          setIsLoading(false);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message ?? "Failed to fetch trade history");
          setIsLoading(false);
        }
      }
      if (isMounted && autoRefresh) {
        timer = setTimeout(fetch, refreshInterval);
      }
    }
    setIsLoading(true);
    fetch();
    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [tokenAddress, limit, autoRefresh, refreshInterval, chainKey, sdk]);
  return { trades, isLoading, error, refresh };
}

// src/react/useCreateToken.ts
import { useState as useState9, useCallback as useCallback7 } from "react";
function useCreateToken(chainKey) {
  const sdk = useTokena();
  const [loading, setLoading] = useState9(false);
  const [error, setError] = useState9(null);
  const [result, setResult] = useState9(null);
  const createToken2 = useCallback7(
    async (params, signer) => {
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const res = await sdk.createToken(params, signer, chainKey);
        setResult(res);
        return res;
      } catch (err) {
        setError(err?.message ?? "Token creation failed");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [sdk, chainKey]
  );
  const reset = useCallback7(() => {
    setLoading(false);
    setError(null);
    setResult(null);
  }, []);
  return { createToken: createToken2, loading, error, result, reset };
}

// src/react/useTokenBalance.ts
import { useEffect as useEffect8, useState as useState10, useCallback as useCallback8 } from "react";
function useTokenBalance(tokenAddress, walletAddress, options = {}) {
  const sdk = useTokena();
  const { pollInterval = 15e3, chainKey } = options;
  const [balance, setBalance] = useState10(null);
  const [isLoading, setIsLoading] = useState10(true);
  const [error, setError] = useState10(null);
  const refresh = useCallback8(async () => {
    if (!tokenAddress || !walletAddress) return;
    try {
      const bal = await sdk.getTokenBalance(tokenAddress, walletAddress, chainKey);
      setBalance(bal);
      setError(null);
    } catch (err) {
      setError(err?.message ?? "Failed to fetch balance");
    }
  }, [tokenAddress, walletAddress, chainKey, sdk]);
  useEffect8(() => {
    if (!tokenAddress || !walletAddress) {
      setIsLoading(false);
      return;
    }
    let isMounted = true;
    let timer;
    async function poll() {
      try {
        const bal = await sdk.getTokenBalance(tokenAddress, walletAddress, chainKey);
        if (isMounted) {
          setBalance(bal);
          setIsLoading(false);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message ?? "Failed to fetch balance");
          setIsLoading(false);
        }
      }
      if (isMounted) {
        timer = setTimeout(poll, pollInterval);
      }
    }
    setIsLoading(true);
    poll();
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [tokenAddress, walletAddress, pollInterval, chainKey, sdk]);
  return { balance, isLoading, error, refresh };
}

// src/react/useTokenList.ts
import { useEffect as useEffect9, useState as useState11, useCallback as useCallback9 } from "react";
function useTokenList(options = {}) {
  const sdk = useTokena();
  const { limit = 20, offset = 0, chainKey } = options;
  const [tokens, setTokens] = useState11([]);
  const [total, setTotal] = useState11(0);
  const [isLoading, setIsLoading] = useState11(true);
  const [error, setError] = useState11(null);
  const [currentOffset, setCurrentOffset] = useState11(offset);
  const refresh = useCallback9(async () => {
    setIsLoading(true);
    try {
      const [list, count] = await Promise.all([
        sdk.getAllTokens({ offset: 0, limit }, chainKey),
        sdk.getTokenCount(chainKey)
      ]);
      setTokens(list);
      setTotal(count);
      setCurrentOffset(limit);
      setError(null);
    } catch (err) {
      setError(err?.message ?? "Failed to fetch token list");
    } finally {
      setIsLoading(false);
    }
  }, [limit, chainKey, sdk]);
  const loadMore = useCallback9(async () => {
    if (currentOffset >= total) return;
    try {
      const more = await sdk.getAllTokens({ offset: currentOffset, limit }, chainKey);
      setTokens((prev) => [...prev, ...more]);
      setCurrentOffset((prev) => prev + limit);
    } catch (err) {
      setError(err?.message ?? "Failed to load more tokens");
    }
  }, [currentOffset, total, limit, chainKey, sdk]);
  useEffect9(() => {
    refresh();
  }, [refresh]);
  return { tokens, total, isLoading, error, loadMore, refresh };
}

// src/react/useTokenSearch.ts
import { useEffect as useEffect10, useState as useState12, useRef as useRef3 } from "react";
function useTokenSearch(query, options = {}) {
  const sdk = useTokena();
  const { debounceMs = 300, limit = 20, chainKey } = options;
  const [results, setResults] = useState12([]);
  const [isLoading, setIsLoading] = useState12(false);
  const [error, setError] = useState12(null);
  const timerRef = useRef3();
  useEffect10(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const found = await sdk.searchTokens(query.trim(), limit, chainKey);
        setResults(found);
        setError(null);
      } catch (err) {
        setError(err?.message ?? "Search failed");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, debounceMs, limit, chainKey, sdk]);
  return { results, isLoading, error };
}

// src/react/useCreatorProfile.ts
import { useEffect as useEffect11, useState as useState13, useCallback as useCallback10 } from "react";
function useCreatorProfile(creatorAddress, chainKey) {
  const sdk = useTokena();
  const [profile, setProfile] = useState13(null);
  const [isLoading, setIsLoading] = useState13(true);
  const [error, setError] = useState13(null);
  const refresh = useCallback10(async () => {
    if (!creatorAddress) return;
    try {
      const result = await sdk.getCreatorProfile(creatorAddress, chainKey);
      setProfile(result);
      setError(null);
    } catch (err) {
      setError(err?.message ?? "Failed to fetch creator profile");
    }
  }, [creatorAddress, chainKey, sdk]);
  useEffect11(() => {
    if (!creatorAddress) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    sdk.getCreatorProfile(creatorAddress, chainKey).then((result) => {
      setProfile(result);
      setError(null);
    }).catch((err) => {
      setError(err?.message ?? "Failed to fetch creator profile");
    }).finally(() => {
      setIsLoading(false);
    });
  }, [creatorAddress, chainKey, sdk]);
  return { profile, isLoading, error, refresh };
}

// src/react/useLifecycle.ts
import { useEffect as useEffect12, useState as useState14, useCallback as useCallback11 } from "react";
function useLifecycle(tokenAddress, options = {}) {
  const sdk = useTokena();
  const { pollInterval = 15e3, chainKey } = options;
  const [lifecycle, setLifecycle] = useState14(null);
  const [isLoading, setIsLoading] = useState14(true);
  const [error, setError] = useState14(null);
  const refresh = useCallback11(async () => {
    if (!tokenAddress) return;
    try {
      const state = await sdk.getLifecycleState(tokenAddress, chainKey);
      setLifecycle(state);
      setError(null);
    } catch (err) {
      setError(err?.message ?? "Failed to fetch lifecycle state");
    }
  }, [tokenAddress, chainKey, sdk]);
  useEffect12(() => {
    if (!tokenAddress) {
      setIsLoading(false);
      return;
    }
    let isMounted = true;
    let timer;
    async function poll() {
      try {
        const state = await sdk.getLifecycleState(tokenAddress, chainKey);
        if (isMounted) {
          setLifecycle(state);
          setIsLoading(false);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message ?? "Failed to fetch lifecycle state");
          setIsLoading(false);
        }
      }
      if (isMounted) {
        timer = setTimeout(poll, pollInterval);
      }
    }
    setIsLoading(true);
    poll();
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [tokenAddress, pollInterval, chainKey, sdk]);
  return { lifecycle, isLoading, error, refresh };
}
export {
  AxolotlProvider,
  TokenaProvider,
  useAxolotl,
  useAxolotlWallet,
  useClaimFees,
  useCreateToken,
  useCreatorProfile,
  useLifecycle,
  usePoolState,
  useQuoteBuy,
  useQuoteSell,
  useTokenBalance,
  useTokenList,
  useTokenSearch,
  useTokenState,
  useTokena,
  useTokenaWallet,
  useTrade,
  useTradeHistory
};
//# sourceMappingURL=react.mjs.map