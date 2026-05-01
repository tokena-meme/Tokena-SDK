/**
 * Human-readable ABI for the BondingCurve contract.
 * Covers all read/write functions and events.
 *
 * Includes auto-migration (finalized, getMigrationStatus) and legacy
 * (thresholdReached, ethThreshold) function signatures for backwards
 * compatibility with older deployed contracts.
 */
export const BondingCurveABI = [
  // ─── Read Functions ────────────────────────────────────────
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function getCurrentPrice() view returns (uint256 price)',
  'function calculateTokenAmount(uint256 ethAmount) view returns (uint256 tokenAmount)',
  'function calculateEthAmount(uint256 tokenAmount) view returns (uint256 ethAmount)',
  'function getAmmEthReserve() view returns (uint256)',
  'function ethThreshold() view returns (uint256)',
  'function thresholdReached() view returns (bool)',
  'function finalized() view returns (bool)',
  'function migrationFeePercent() view returns (uint256)',
  'function getMigrationStatus() view returns (bool thresholdReached, bool finalized, address uniswapPair, uint256 ammEthReserve, uint256 ethThreshold, uint256 migrationFeePercent)',
  'function isTaxToken() view returns (bool)',
  'function companyWallet() view returns (address)',
  'function creatorWallet() view returns (address)',
  'function companyFeePercent() view returns (uint256)',
  'function initialVirtualEth() view returns (uint256)',
  'function pendingFees(address) view returns (uint256)',
  'function totalPendingFees() view returns (uint256)',
  'function PRECISION() view returns (uint256)',
  'function ZERO_TAX_FEE_BPS() view returns (uint256)',
  'function ZERO_TAX_CREATOR_BPS() view returns (uint256)',
  'function ZERO_TAX_COMPANY_BPS() view returns (uint256)',
  'function maxFeePercent() view returns (uint256)',
  'function minThreshold() view returns (uint256)',
  'function owner() view returns (address)',
  'function paused() view returns (bool)',
  'function uniswapRouter() view returns (address)',
  'function uniswapPair() view returns (address)',
  'function taxInfo() view returns (address devWallet, uint8 devBuyFeePercent, uint8 devSellFeePercent, address marketingWallet, uint8 marketingBuyFeePercent, uint8 marketingSellFeePercent)',

  // ─── Write Functions ───────────────────────────────────────
  'function buy(uint256 minTokens) payable',
  'function sell(uint256 tokenAmount, uint256 minEth)',
  'function claimFees()',
  'function updateFees(uint8 devBuyFee, uint8 devSellFee, uint8 marketingBuyFee, uint8 marketingSellFee)',
  'function finalize()',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',

  // ─── Events ────────────────────────────────────────────────
  'event Buy(address indexed buyer, uint256 ethAmount, uint256 tokenAmount, uint256 newPrice)',
  'event Sell(address indexed seller, uint256 tokenAmount, uint256 ethAmount, uint256 newPrice)',
  'event CompanyFeeTaken(uint256 amount)',
  'event FeesAccumulated(address indexed wallet, uint256 amount)',
  'event FeesClaimed(address indexed wallet, uint256 amount)',
  'event ThresholdReached(uint256 totalEth)',
  'event LiquidityAdded(uint256 tokenAmount, uint256 ethAmount)',
  'event FeesUpdated(uint8 devBuyFee, uint8 devSellFee, uint8 marketingBuyFee, uint8 marketingSellFee)',
  'event AutoFinalized(address indexed uniswapPair, uint256 tokenAmount, uint256 ethAmount)',
  'event MigrationGasRefunded(address indexed buyer, uint256 gasRefund)',
  'event MigrationFeeTaken(uint256 feeAmount)',
] as const;
