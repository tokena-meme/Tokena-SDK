import type { ChainConfig } from '../types';

/**
 * Pre-configured chain registry.
 * Users can extend this with custom chains via AxolotlConfig.chains.
 */
export const DEFAULT_CHAINS: Record<string, ChainConfig> = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum',
    shortName: 'ETH',
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    factoryAddress: '0x153B33eee6412066f187B2146deEC10A3A4893C3', // TokenFactory on ETH
  },
  bsc: {
    chainId: 56,
    name: 'BNB Chain',
    shortName: 'BSC',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorerUrl: 'https://bscscan.com',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    factoryAddress: '0x153B33eee6412066f187B2146deEC10A3A4893C3', // TokenFactory on BSC
  },
  base: {
    chainId: 8453,
    name: 'Base',
    shortName: 'BASE',
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    factoryAddress: '0x153B33eee6412066f187B2146deEC10A3A4893C3', // TokenFactory on Base
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum',
    shortName: 'ARB',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    factoryAddress: '0x153B33eee6412066f187B2146deEC10A3A4893C3', // TokenFactory on Arbitrum
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    shortName: 'SEP',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
    factoryAddress: '0x153B33eee6412066f187B2146deEC10A3A4893C3', // TokenFactory on Sepolia
  },
};
