import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, formatEther, type JsonRpcSigner } from 'ethers';
import type { ChainConfig } from '../types';

interface WalletState {
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
}

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
export function useTokenaWallet(targetChain?: ChainConfig) {
  const [state, setState] = useState<WalletState>({
    address: null,
    balance: null,
    connected: false,
    chainId: null,
    connecting: false,
    error: null,
  });

  const getEthereum = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return (window as any).ethereum ?? null;
  }, []);

  const fetchBalance = useCallback(async (provider: BrowserProvider, addr: string) => {
    try {
      const bal = await provider.getBalance(addr);
      return formatEther(bal);
    } catch {
      return null;
    }
  }, []);

  // Check existing connection on mount
  useEffect(() => {
    const ethereum = getEthereum();
    if (!ethereum) return;

    async function checkConnection() {
      try {
        const accounts = await ethereum.request({ method: 'eth_accounts' });
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
            error: null,
          });
        }
      } catch (err) {
        console.error('Wallet check failed:', err);
      }
    }

    checkConnection();

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setState({ address: null, balance: null, connected: false, chainId: null, connecting: false, error: null });
      } else {
        setState((prev) => ({ ...prev, address: accounts[0], connected: true }));
      }
    };

    const handleChainChanged = () => checkConnection();

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [getEthereum, fetchBalance]);

  const connect = useCallback(async () => {
    const ethereum = getEthereum();
    if (!ethereum) {
      setState((prev) => ({ ...prev, error: 'MetaMask not installed' }));
      return;
    }

    setState((prev) => ({ ...prev, connecting: true, error: null }));

    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });

      // Switch to target chain if specified
      if (targetChain) {
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x' + targetChain.chainId.toString(16) }],
          });
        } catch (switchErr: any) {
          if (switchErr.code === 4902) {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x' + targetChain.chainId.toString(16),
                chainName: targetChain.name,
                rpcUrls: [targetChain.rpcUrl],
                blockExplorerUrls: [targetChain.explorerUrl],
                nativeCurrency: targetChain.nativeCurrency,
              }],
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
        error: null,
      });
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        connecting: false,
        error: err?.message ?? 'Connection failed',
      }));
    }
  }, [getEthereum, targetChain, fetchBalance]);

  const disconnect = useCallback(() => {
    setState({ address: null, balance: null, connected: false, chainId: null, connecting: false, error: null });
  }, []);

  const getSigner = useCallback(async (): Promise<JsonRpcSigner | null> => {
    const ethereum = getEthereum();
    if (!ethereum) return null;
    const provider = new BrowserProvider(ethereum);
    return provider.getSigner();
  }, [getEthereum]);

  return {
    ...state,
    connect,
    disconnect,
    getSigner,
  };
}

// ─── Legacy Alias ────────────────────────────────────────────
/** @deprecated Use useTokenaWallet instead */
export const useAxolotlWallet = useTokenaWallet;
