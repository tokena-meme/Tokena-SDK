import type { JsonRpcProvider } from 'ethers';
import type { CreatorProfile, ProjectInfo } from '../types';
import { validateAddress } from './validation';
import { getAllTokens } from './discovery';
import { wrapError } from '../errors';

/**
 * Get all tokens created by a specific wallet address.
 *
 * Scans the factory's project list and filters by devWallet.
 * For large factories, consider using caching.
 *
 * @param creatorAddress - Creator wallet address
 * @param factoryAddress - Factory contract address
 * @param provider - Read-only provider
 * @returns Array of tokens created by this address
 */
export async function getCreatorTokens(
  creatorAddress: string,
  factoryAddress: string,
  provider: JsonRpcProvider
): Promise<ProjectInfo[]> {
  validateAddress(creatorAddress, 'creatorAddress');
  validateAddress(factoryAddress, 'factoryAddress');

  try {
    const all = await getAllTokens(factoryAddress, provider, { limit: 10000 });
    const lowerCreator = creatorAddress.toLowerCase();

    return all.filter(
      (p) => p.devWallet.toLowerCase() === lowerCreator
    );
  } catch (err) {
    throw wrapError(err, `getCreatorTokens(${creatorAddress})`);
  }
}

/**
 * Get a creator's profile including their token count and list.
 *
 * @param creatorAddress - Creator wallet address
 * @param factoryAddress - Factory contract address
 * @param provider - Read-only provider
 * @returns Creator profile
 */
export async function getCreatorProfile(
  creatorAddress: string,
  factoryAddress: string,
  provider: JsonRpcProvider
): Promise<CreatorProfile> {
  validateAddress(creatorAddress, 'creatorAddress');
  validateAddress(factoryAddress, 'factoryAddress');

  try {
    const tokens = await getCreatorTokens(creatorAddress, factoryAddress, provider);

    return {
      address: creatorAddress,
      tokenCount: tokens.length,
      tokens,
    };
  } catch (err) {
    throw wrapError(err, `getCreatorProfile(${creatorAddress})`);
  }
}
