import { isAddress } from 'ethers';
import { InvalidAddressError, InvalidAmountError } from '../errors';

/**
 * Validate that a string is a valid Ethereum address.
 * Throws InvalidAddressError if validation fails.
 */
export function validateAddress(addr: string, label: string = 'address'): void {
  if (!addr || typeof addr !== 'string') {
    throw new InvalidAddressError(addr ?? '', label);
  }
  if (!isAddress(addr)) {
    throw new InvalidAddressError(addr, label);
  }
}

/**
 * Validate that an amount is a positive, finite number (string or number).
 * Throws InvalidAmountError if validation fails.
 */
export function validatePositiveAmount(amount: string | number, label: string = 'amount'): void {
  if (amount === '' || amount === null || amount === undefined) {
    throw new InvalidAmountError(String(amount), label);
  }

  const num = typeof amount === 'string' ? Number(amount) : amount;

  if (isNaN(num) || !isFinite(num) || num <= 0) {
    throw new InvalidAmountError(amount, label);
  }
}

/**
 * Validate that a slippage value is within reasonable bounds (0–10000 bps = 0–100%).
 * Throws InvalidAmountError if validation fails.
 */
export function validateSlippageBps(bps: number): void {
  if (typeof bps !== 'number' || isNaN(bps) || bps < 0 || bps > 10000) {
    throw new InvalidAmountError(bps, 'slippageBps (must be 0–10000)');
  }
}

/**
 * Validate that a chain key exists in the available chains.
 * Throws TokenaError if chain is not found.
 */
export function validateChainKey(key: string, available: string[]): void {
  if (!available.includes(key)) {
    throw new InvalidAmountError(key, `chain key (available: ${available.join(', ')})`);
  }
}
