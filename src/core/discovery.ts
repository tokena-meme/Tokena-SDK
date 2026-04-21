import { Contract, formatEther, formatUnits, type JsonRpcProvider } from 'ethers';
import { TokenFactoryABI } from '../abi/TokenFactory';
import type { ProjectInfo, TokenListOptions } from '../types';
import { validateAddress } from './validation';
import { wrapError } from '../errors';

/**
 * Parse a raw project tuple from the factory contract into a ProjectInfo object.
 */
function parseProject(projectTuple: any, tokenAddress?: string): ProjectInfo {
  return {
    tokenAddress: tokenAddress ?? projectTuple.token,
    name: projectTuple.name,
    symbol: projectTuple.symbol,
    totalSupply: formatUnits(projectTuple.totalSupply, 18),
    ethThreshold: formatEther(projectTuple.ethThreshold),
    isTaxToken: projectTuple.isTaxToken,
    devWallet: projectTuple.devWallet,
    devBuyFeePercent: Number(projectTuple.devBuyFeePercent),
    devSellFeePercent: Number(projectTuple.devSellFeePercent),
    marketingWallet: projectTuple.marketingWallet,
    marketingBuyFeePercent: Number(projectTuple.marketingBuyFeePercent),
    marketingSellFeePercent: Number(projectTuple.marketingSellFeePercent),
    initialVirtualEth: formatEther(projectTuple.initialVirtualEth),
    initialBuyAmount: formatEther(projectTuple.initialBuyAmount),
  };
}

/**
 * Get the total number of tokens created via the factory.
 */
export async function getTokenCount(
  factoryAddress: string,
  provider: JsonRpcProvider
): Promise<number> {
  validateAddress(factoryAddress, 'factoryAddress');

  try {
    const factory = new Contract(factoryAddress, TokenFactoryABI, provider);
    const count = await factory.projectCount();
    return Number(count);
  } catch (err) {
    throw wrapError(err, 'getTokenCount');
  }
}

/**
 * Get a single project by its factory index (0-based).
 */
export async function getTokenByIndex(
  index: number,
  factoryAddress: string,
  provider: JsonRpcProvider
): Promise<ProjectInfo> {
  validateAddress(factoryAddress, 'factoryAddress');

  try {
    const factory = new Contract(factoryAddress, TokenFactoryABI, provider);
    const project = await factory.getProjectById(index);
    return parseProject(project);
  } catch (err) {
    throw wrapError(err, `getTokenByIndex(${index})`);
  }
}

/**
 * Get a project by its token contract address.
 */
export async function getTokenByAddress(
  tokenAddress: string,
  factoryAddress: string,
  provider: JsonRpcProvider
): Promise<{ id: number; project: ProjectInfo }> {
  validateAddress(tokenAddress, 'tokenAddress');
  validateAddress(factoryAddress, 'factoryAddress');

  try {
    const factory = new Contract(factoryAddress, TokenFactoryABI, provider);
    const [pid, project] = await factory.getProjectByAddress(tokenAddress);
    return {
      id: Number(pid),
      project: parseProject(project, tokenAddress),
    };
  } catch (err) {
    throw wrapError(err, `getTokenByAddress(${tokenAddress})`);
  }
}

/**
 * Get all tokens from the factory with pagination.
 *
 * @param factoryAddress - Factory contract address
 * @param provider - Read-only provider
 * @param options - Pagination options (offset, limit)
 * @returns Array of project info objects
 */
export async function getAllTokens(
  factoryAddress: string,
  provider: JsonRpcProvider,
  options: TokenListOptions = {}
): Promise<ProjectInfo[]> {
  validateAddress(factoryAddress, 'factoryAddress');

  try {
    const factory = new Contract(factoryAddress, TokenFactoryABI, provider);
    const totalCount = Number(await factory.projectCount());

    const offset = options.offset ?? 0;
    const limit = options.limit ?? 20;
    const end = Math.min(offset + limit, totalCount);

    if (offset >= totalCount) return [];

    const promises: Promise<ProjectInfo>[] = [];
    for (let i = offset; i < end; i++) {
      promises.push(
        factory.getProjectById(i).then((p: any) => parseProject(p))
      );
    }

    return await Promise.all(promises);
  } catch (err) {
    throw wrapError(err, 'getAllTokens');
  }
}

/**
 * Get the newest tokens (most recently created).
 * Returns tokens in reverse order (newest first).
 *
 * @param factoryAddress - Factory contract address
 * @param provider - Read-only provider
 * @param limit - Maximum number of tokens to return (default: 10)
 */
export async function getNewTokens(
  factoryAddress: string,
  provider: JsonRpcProvider,
  limit: number = 10
): Promise<ProjectInfo[]> {
  validateAddress(factoryAddress, 'factoryAddress');

  try {
    const factory = new Contract(factoryAddress, TokenFactoryABI, provider);
    const totalCount = Number(await factory.projectCount());

    if (totalCount === 0) return [];

    const start = Math.max(0, totalCount - limit);
    const promises: Promise<ProjectInfo>[] = [];

    // Fetch in reverse order (newest first)
    for (let i = totalCount - 1; i >= start; i--) {
      promises.push(
        factory.getProjectById(i).then((p: any) => parseProject(p))
      );
    }

    return await Promise.all(promises);
  } catch (err) {
    throw wrapError(err, 'getNewTokens');
  }
}

/**
 * Search tokens by name or symbol (case-insensitive substring match).
 * Scans all tokens from the factory — best used with caching for large factories.
 *
 * @param query - Search query (matched against name and symbol)
 * @param factoryAddress - Factory contract address
 * @param provider - Read-only provider
 * @param limit - Maximum results (default: 20)
 */
export async function searchTokens(
  query: string,
  factoryAddress: string,
  provider: JsonRpcProvider,
  limit: number = 20
): Promise<ProjectInfo[]> {
  validateAddress(factoryAddress, 'factoryAddress');

  try {
    const all = await getAllTokens(factoryAddress, provider, { limit: 1000 });
    const lowerQuery = query.toLowerCase();

    return all
      .filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.symbol.toLowerCase().includes(lowerQuery)
      )
      .slice(0, limit);
  } catch (err) {
    throw wrapError(err, `searchTokens("${query}")`);
  }
}
