import type { ChainConfig } from '../types';

/**
 * Format a token amount with commas and optional decimal places.
 *
 * @example formatTokenAmount(1234567.89) → "1,234,567.89"
 * @example formatTokenAmount(1234567.89, 0) → "1,234,568"
 */
export function formatTokenAmount(amount: number, decimals: number = 2): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format an ETH amount with appropriate precision.
 *
 * @example formatEthAmount(0.004238) → "0.0042 ETH"
 * @example formatEthAmount(1.5)      → "1.50 ETH"
 */
export function formatEthAmount(amount: number, symbol: string = 'ETH'): string {
  let formatted: string;
  if (amount === 0) {
    formatted = '0';
  } else if (amount < 0.0001) {
    formatted = amount.toExponential(2);
  } else if (amount < 1) {
    formatted = amount.toFixed(4);
  } else {
    formatted = amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }
  return `${formatted} ${symbol}`;
}

/**
 * Shorten an Ethereum address for display.
 *
 * @example shortenAddress("0x1234567890abcdef1234567890abcdef12345678") → "0x1234...5678"
 */
export function shortenAddress(addr: string, chars: number = 4): string {
  if (!addr || addr.length < chars * 2 + 2) return addr;
  return `${addr.slice(0, chars + 2)}...${addr.slice(-chars)}`;
}

/**
 * Build a block explorer URL for a transaction hash.
 */
export function explorerTxUrl(txHash: string, chain: ChainConfig): string {
  return `${chain.explorerUrl}/tx/${txHash}`;
}

/**
 * Build a block explorer URL for a token address.
 */
export function explorerTokenUrl(addr: string, chain: ChainConfig): string {
  return `${chain.explorerUrl}/token/${addr}`;
}

/**
 * Build a block explorer URL for a wallet address.
 */
export function explorerAddressUrl(addr: string, chain: ChainConfig): string {
  return `${chain.explorerUrl}/address/${addr}`;
}

/**
 * Format a timestamp into a human-readable "time ago" string.
 *
 * @example timeAgo(Date.now() - 3600000) → "1 hour ago"
 */
export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 2592000)}mo ago`;
}

/**
 * Format a percentage with appropriate precision.
 *
 * @example formatPercent(45.678) → "45.68%"
 * @example formatPercent(0.001) → "<0.01%"
 */
export function formatPercent(value: number, decimals: number = 2): string {
  if (value > 0 && value < Math.pow(10, -decimals)) {
    return `<${Math.pow(10, -decimals).toFixed(decimals)}%`;
  }
  return `${value.toFixed(decimals)}%`;
}
