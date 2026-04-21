// ─── Tokena SDK Error System ─────────────────────────────────
// Every error thrown by the SDK is an instance of TokenaError
// or one of its subclasses. This allows consumers to catch and
// handle specific failure modes cleanly.

/**
 * Base error class for all Tokena SDK errors.
 *
 * @example
 * ```typescript
 * import { TokenaError, SlippageExceededError } from '@tokena/sdk';
 *
 * try {
 *   await tokena.buy(params, signer);
 * } catch (e) {
 *   if (e instanceof SlippageExceededError) {
 *     console.log('Try increasing slippage');
 *   } else if (e instanceof TokenaError) {
 *     console.log(`SDK error [${e.code}]: ${e.message}`);
 *   }
 * }
 * ```
 */
export class TokenaError extends Error {
  public readonly code: string;
  public readonly cause?: unknown;

  constructor(message: string, code: string, cause?: unknown) {
    super(message);
    this.name = 'TokenaError';
    this.code = code;
    this.cause = cause;
    // Fix prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when the wallet has insufficient ETH or token balance for the operation. */
export class InsufficientBalanceError extends TokenaError {
  constructor(message: string = 'Insufficient balance for this operation', cause?: unknown) {
    super(message, 'INSUFFICIENT_BALANCE', cause);
    this.name = 'InsufficientBalanceError';
  }
}

/** Thrown when the trade would exceed the allowed slippage tolerance. */
export class SlippageExceededError extends TokenaError {
  constructor(message: string = 'Trade would exceed slippage tolerance', cause?: unknown) {
    super(message, 'SLIPPAGE_EXCEEDED', cause);
    this.name = 'SlippageExceededError';
  }
}

/** Thrown when the connected chain doesn't match the expected chain. */
export class ChainMismatchError extends TokenaError {
  constructor(expected: string, actual?: string, cause?: unknown) {
    const msg = actual
      ? `Chain mismatch: expected "${expected}", got "${actual}"`
      : `Chain mismatch: expected "${expected}"`;
    super(msg, 'CHAIN_MISMATCH', cause);
    this.name = 'ChainMismatchError';
  }
}

/** Thrown when a token address is not found or isn't a valid bonding curve. */
export class TokenNotFoundError extends TokenaError {
  constructor(address: string, cause?: unknown) {
    super(`Token not found or not a valid bonding curve: ${address}`, 'TOKEN_NOT_FOUND', cause);
    this.name = 'TokenNotFoundError';
  }
}

/** Thrown when trading is paused on a bonding curve contract. */
export class TradePausedError extends TokenaError {
  constructor(tokenAddress: string, cause?: unknown) {
    super(`Trading is paused on ${tokenAddress}`, 'TRADE_PAUSED', cause);
    this.name = 'TradePausedError';
  }
}

/** Thrown when the ETH threshold has already been reached (bonding curve finalized). */
export class ThresholdAlreadyReachedError extends TokenaError {
  constructor(tokenAddress: string, cause?: unknown) {
    super(`Threshold already reached on ${tokenAddress} — token is finalized`, 'THRESHOLD_REACHED', cause);
    this.name = 'ThresholdAlreadyReachedError';
  }
}

/** Thrown when an Ethereum address is invalid. */
export class InvalidAddressError extends TokenaError {
  constructor(address: string, label: string = 'address', cause?: unknown) {
    super(`Invalid ${label}: "${address}" — must be a valid Ethereum address`, 'INVALID_ADDRESS', cause);
    this.name = 'InvalidAddressError';
  }
}

/** Thrown when an amount value is invalid (negative, NaN, empty, etc.). */
export class InvalidAmountError extends TokenaError {
  constructor(amount: string | number, label: string = 'amount', cause?: unknown) {
    super(`Invalid ${label}: "${amount}" — must be a positive number`, 'INVALID_AMOUNT', cause);
    this.name = 'InvalidAmountError';
  }
}

/** Thrown when a transaction fails on-chain (reverted, out of gas, etc.). */
export class TransactionFailedError extends TokenaError {
  public readonly txHash?: string;

  constructor(message: string = 'Transaction failed', txHash?: string, cause?: unknown) {
    super(message, 'TX_FAILED', cause);
    this.name = 'TransactionFailedError';
    this.txHash = txHash;
  }
}

/** Thrown when a contract call fails (contract not deployed, wrong ABI, etc.). */
export class ContractNotFoundError extends TokenaError {
  constructor(address: string, cause?: unknown) {
    super(`Contract not found or not accessible at ${address}`, 'CONTRACT_NOT_FOUND', cause);
    this.name = 'ContractNotFoundError';
  }
}

/** Thrown when an RPC request fails (timeout, rate limit, network error). */
export class RpcError extends TokenaError {
  constructor(message: string = 'RPC request failed', cause?: unknown) {
    super(message, 'RPC_ERROR', cause);
    this.name = 'RpcError';
  }
}

/**
 * Wrap a raw ethers/RPC error into a typed TokenaError.
 * This is used internally to translate low-level errors.
 */
export function wrapError(err: unknown, context?: string): TokenaError {
  if (err instanceof TokenaError) return err;

  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  // Detect specific error patterns from ethers / RPC
  if (lower.includes('insufficient funds') || lower.includes('exceeds balance')) {
    return new InsufficientBalanceError(context ? `${context}: ${message}` : message, err);
  }
  if (lower.includes('slippage') || lower.includes('too little received') || lower.includes('mintoken') || lower.includes('min_eth')) {
    return new SlippageExceededError(context ? `${context}: ${message}` : message, err);
  }
  if (lower.includes('execution reverted') && lower.includes('paused')) {
    return new TradePausedError(context ?? 'unknown', err);
  }
  if (lower.includes('call_exception') || lower.includes('contract not deployed') || lower.includes('could not decode')) {
    return new ContractNotFoundError(context ?? 'unknown', err);
  }
  if (lower.includes('network') || lower.includes('timeout') || lower.includes('econnrefused') || lower.includes('rate limit')) {
    return new RpcError(context ? `${context}: ${message}` : message, err);
  }

  return new TokenaError(
    context ? `${context}: ${message}` : message,
    'UNKNOWN_ERROR',
    err
  );
}
