/**
 * Human-readable ABI for the TokenFactory contract.
 * Covers all read/write functions and events.
 */
export const TokenFactoryABI = [
  // ─── Read Functions ────────────────────────────────────────
  'function owner() view returns (address)',
  'function companyWallet() view returns (address)',
  'function companyFeePercent() view returns (uint8)',
  'function creationFee() view returns (uint256)',
  'function uniswapRouter() view returns (address)',
  'function maxFeePercent() view returns (uint256)',
  'function minThreshold() view returns (uint256)',
  'function defaultInitialEth() view returns (uint256)',
  'function minVirtualEth() view returns (uint256)',
  'function projectCount() view returns (uint256)',
  'function getProjectById(uint256 pid) view returns (tuple(address token, string name, string symbol, uint256 totalSupply, uint256 ethThreshold, bool isTaxToken, address devWallet, uint8 devBuyFeePercent, uint8 devSellFeePercent, address marketingWallet, uint8 marketingBuyFeePercent, uint8 marketingSellFeePercent, uint256 initialVirtualEth, uint256 initialBuyAmount))',
  'function getProjectByAddress(address token) view returns (uint256 pid, tuple(address token, string name, string symbol, uint256 totalSupply, uint256 ethThreshold, bool isTaxToken, address devWallet, uint8 devBuyFeePercent, uint8 devSellFeePercent, address marketingWallet, uint8 marketingBuyFeePercent, uint8 marketingSellFeePercent, uint256 initialVirtualEth, uint256 initialBuyAmount) proj)',

  // ─── Write Functions ───────────────────────────────────────
  'function createBondingCurve(string name, string symbol, uint256 totalSupply, uint256 ethThreshold, bool isTaxToken, address devWallet, uint8 devBuyFeePercent, uint8 devSellFeePercent, address marketingWallet, uint8 marketingBuyFeePercent, uint8 marketingSellFeePercent, uint256 initialBuyAmount, uint256 initialVirtualEth) payable returns (address)',

  // ─── Admin Functions ───────────────────────────────────────
  'function updateCompanyWallet(address newCompanyWallet)',
  'function updateCreationFee(uint256 newCreationFee)',
  'function updateCompanyFee(uint256 newCompanyFeePercent)',
  'function updateUniswapRouter(address newRouter)',
  'function updateDefaultInitialEth(uint256 newDefaultInitialEth)',
  'function updateMaxFeePercent(uint256 newMaxFeePercent)',
  'function updateMinThreshold(uint256 newMinThreshold)',

  // ─── Events ────────────────────────────────────────────────
  'event BondingCurveCreated(address indexed token, string name, string symbol, uint256 totalSupply, uint256 ethThreshold, bool isTaxToken, address devWallet, uint8 devBuyFeePercent, uint8 devSellFeePercent, address marketingWallet, uint8 marketingBuyFeePercent, uint8 marketingSellFeePercent, uint256 initialVirtualEth, uint256 initialBuyAmount)',
  'event CompanyWalletUpdated(address indexed oldWallet, address indexed newWallet)',
  'event CreationFeeUpdated(uint256 oldFee, uint256 newFee)',
  'event CompanyFeePercentUpdated(uint256 oldPercent, uint256 newPercent)',
  'event UniswapRouterUpdated(address indexed oldRouter, address indexed newRouter)',
  'event DefaultInitialEthUpdated(uint256 oldAmount, uint256 newAmount)',
  'event MinThresholdUpdated(uint256 oldThreshold, uint256 newThreshold)',
  'event MaxFeePercentUpdated(uint256 oldFee, uint256 newFee)',
] as const;
