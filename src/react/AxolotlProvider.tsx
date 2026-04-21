import React, { createContext, useContext, useMemo } from 'react';
import { Tokena } from '../core/Axolotl';
import type { TokenaConfig } from '../types';

interface TokenaContextValue {
  sdk: Tokena;
  chainKey: string;
}

const TokenaContext = createContext<TokenaContextValue | null>(null);

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
export function TokenaProvider({
  children,
  ...config
}: TokenaConfig & { children: React.ReactNode }) {
  const sdk = useMemo(() => new Tokena(config), [config.chainKey, config.factoryAddress]);

  const value = useMemo(
    () => ({ sdk, chainKey: config.chainKey }),
    [sdk, config.chainKey]
  );

  return (
    <TokenaContext.Provider value={value}>
      {children}
    </TokenaContext.Provider>
  );
}

/**
 * Access the Tokena SDK instance from context.
 * Must be used inside a TokenaProvider.
 */
export function useTokena(): Tokena {
  const ctx = useContext(TokenaContext);
  if (!ctx) {
    throw new Error('useTokena must be used within a <TokenaProvider>');
  }
  return ctx.sdk;
}

// ─── Legacy Aliases ─────────────────────────────────────────
/** @deprecated Use TokenaProvider instead */
export const AxolotlProvider = TokenaProvider;
/** @deprecated Use useTokena instead */
export const useAxolotl = useTokena;
