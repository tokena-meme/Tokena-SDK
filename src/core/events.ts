import { Contract, formatEther, formatUnits, EventLog, type JsonRpcProvider } from 'ethers';
import { BondingCurveABI } from '../abi/BondingCurve';
import { TokenFactoryABI } from '../abi/TokenFactory';
import type { TradeEvent, TokenEvent } from '../types';
import { validateAddress } from './validation';
import { wrapError } from '../errors';

const CHUNK_SIZE = 49_000;

/**
 * Get trade history (Buy and Sell events) for a token.
 * Paginates in 49k-block chunks to respect RPC limits.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param provider - Read-only provider
 * @param options - lookbackBlocks (default: 500,000), limit (default: 100)
 * @returns Array of trade events, newest first
 */
export async function getTradeHistory(
  tokenAddress: string,
  provider: JsonRpcProvider,
  options: { lookbackBlocks?: number; limit?: number } = {}
): Promise<TradeEvent[]> {
  validateAddress(tokenAddress, 'tokenAddress');

  const lookback = options.lookbackBlocks ?? 500_000;
  const limit = options.limit ?? 100;

  try {
    const contract = new Contract(tokenAddress, BondingCurveABI, provider);
    const currentBlock = await provider.getBlockNumber();
    const startBlock = Math.max(0, currentBlock - lookback);

    const buyFilter = contract.filters.Buy();
    const sellFilter = contract.filters.Sell();

    const events: TradeEvent[] = [];

    for (let from = startBlock; from <= currentBlock; from += CHUNK_SIZE) {
      const to = Math.min(from + CHUNK_SIZE - 1, currentBlock);

      const [buyLogs, sellLogs] = await Promise.all([
        contract.queryFilter(buyFilter, from, to),
        contract.queryFilter(sellFilter, from, to),
      ]);

      for (const log of buyLogs) {
        try {
          let args: any;
          if (log instanceof EventLog && log.args) {
            args = log.args;
          } else {
            const parsed = contract.interface.parseLog({ topics: log.topics as string[], data: log.data });
            args = parsed?.args;
          }
          if (args) {
            events.push({
              type: 'buy',
              trader: args[0],
              ethAmount: Number(formatEther(args[1])),
              tokenAmount: Number(formatUnits(args[2], 18)),
              newPrice: Number(args[3]) / 1e18,
              blockNumber: log.blockNumber,
              txHash: log.transactionHash,
            });
          }
        } catch { /* skip unparseable logs */ }
      }

      for (const log of sellLogs) {
        try {
          let args: any;
          if (log instanceof EventLog && log.args) {
            args = log.args;
          } else {
            const parsed = contract.interface.parseLog({ topics: log.topics as string[], data: log.data });
            args = parsed?.args;
          }
          if (args) {
            events.push({
              type: 'sell',
              trader: args[0],
              tokenAmount: Number(formatUnits(args[1], 18)),
              ethAmount: Number(formatEther(args[2])),
              newPrice: Number(args[3]) / 1e18,
              blockNumber: log.blockNumber,
              txHash: log.transactionHash,
            });
          }
        } catch { /* skip unparseable logs */ }
      }

      if (events.length >= limit) break;
    }

    // Sort by block number descending (newest first) and limit
    return events
      .sort((a, b) => b.blockNumber - a.blockNumber)
      .slice(0, limit);
  } catch (err) {
    throw wrapError(err, `getTradeHistory(${tokenAddress})`);
  }
}

/**
 * Get all events for a token (buys, sells, fees claimed, threshold reached, etc.).
 *
 * @param tokenAddress - BondingCurve contract address
 * @param provider - Read-only provider
 * @param options - Event types to include, lookback blocks
 * @returns Array of token events
 */
export async function getTokenEvents(
  tokenAddress: string,
  provider: JsonRpcProvider,
  options: { types?: string[]; lookbackBlocks?: number } = {}
): Promise<TokenEvent[]> {
  validateAddress(tokenAddress, 'tokenAddress');

  const lookback = options.lookbackBlocks ?? 200_000;
  const allowedTypes = options.types ?? ['buy', 'sell', 'feeClaimed', 'thresholdReached', 'liquidityAdded', 'feesUpdated'];

  try {
    const contract = new Contract(tokenAddress, BondingCurveABI, provider);
    const currentBlock = await provider.getBlockNumber();
    const startBlock = Math.max(0, currentBlock - lookback);

    const events: TokenEvent[] = [];

    // Map event names to types
    const eventMap: Record<string, string> = {
      Buy: 'buy',
      Sell: 'sell',
      FeesClaimed: 'feeClaimed',
      ThresholdReached: 'thresholdReached',
      LiquidityAdded: 'liquidityAdded',
      FeesUpdated: 'feesUpdated',
    };

    for (let from = startBlock; from <= currentBlock; from += CHUNK_SIZE) {
      const to = Math.min(from + CHUNK_SIZE - 1, currentBlock);

      // Query all events from the contract
      const logs = await contract.queryFilter('*' as any, from, to);

      for (const log of logs) {
        try {
          let parsed: any;
          if (log instanceof EventLog) {
            parsed = { name: log.eventName, args: log.args };
          } else {
            parsed = contract.interface.parseLog({ topics: log.topics as string[], data: log.data });
          }

          if (parsed) {
            const type = eventMap[parsed.name];
            if (type && allowedTypes.includes(type)) {
              const data: Record<string, unknown> = {};
              // Convert args to a plain object
              for (let i = 0; i < parsed.args.length; i++) {
                data[`arg${i}`] = parsed.args[i]?.toString();
              }

              events.push({
                type: type as TokenEvent['type'],
                blockNumber: log.blockNumber,
                txHash: log.transactionHash,
                data,
              });
            }
          }
        } catch { /* skip */ }
      }
    }

    return events.sort((a, b) => b.blockNumber - a.blockNumber);
  } catch (err) {
    throw wrapError(err, `getTokenEvents(${tokenAddress})`);
  }
}

/**
 * Get BondingCurveCreated events from the factory.
 *
 * @param factoryAddress - Factory contract address
 * @param provider - Read-only provider
 * @param options - lookbackBlocks (default: 500,000)
 * @returns Array of creation events
 */
export async function getCreationEvents(
  factoryAddress: string,
  provider: JsonRpcProvider,
  options: { lookbackBlocks?: number } = {}
): Promise<Array<{ tokenAddress: string; creator: string; blockNumber: number; txHash: string }>> {
  validateAddress(factoryAddress, 'factoryAddress');

  const lookback = options.lookbackBlocks ?? 500_000;

  try {
    const factory = new Contract(factoryAddress, TokenFactoryABI, provider);
    const currentBlock = await provider.getBlockNumber();
    const startBlock = Math.max(0, currentBlock - lookback);
    const filter = factory.filters.BondingCurveCreated();

    const results: Array<{ tokenAddress: string; creator: string; blockNumber: number; txHash: string }> = [];

    for (let from = startBlock; from <= currentBlock; from += CHUNK_SIZE) {
      const to = Math.min(from + CHUNK_SIZE - 1, currentBlock);
      const logs = await factory.queryFilter(filter, from, to);

      for (const log of logs) {
        try {
          let args: any;
          if (log instanceof EventLog && log.args) {
            args = log.args;
          } else {
            const parsed = factory.interface.parseLog({ topics: log.topics as string[], data: log.data });
            args = parsed?.args;
          }
          if (args) {
            results.push({
              tokenAddress: args.token ?? args[0],
              creator: args.devWallet ?? args[6] ?? '',
              blockNumber: log.blockNumber,
              txHash: log.transactionHash,
            });
          }
        } catch { /* skip */ }
      }
    }

    return results.sort((a, b) => b.blockNumber - a.blockNumber);
  } catch (err) {
    throw wrapError(err, 'getCreationEvents');
  }
}

/**
 * Estimate the number of unique holders for a token by scanning Transfer events.
 * NOTE: This is approximate for public RPCs due to block range limits.
 *
 * @param tokenAddress - Token contract address
 * @param provider - Read-only provider
 * @param lookbackBlocks - Blocks to scan back (default: 500,000)
 * @returns Estimated unique holder count
 */
export async function getHolderCount(
  tokenAddress: string,
  provider: JsonRpcProvider,
  lookbackBlocks: number = 500_000
): Promise<number> {
  validateAddress(tokenAddress, 'tokenAddress');

  try {
    const contract = new Contract(tokenAddress, BondingCurveABI, provider);
    const currentBlock = await provider.getBlockNumber();
    const startBlock = Math.max(0, currentBlock - lookbackBlocks);

    // Transfer event: Transfer(address indexed from, address indexed to, uint256 value)
    const transferFilter = contract.filters.Transfer();
    const holders = new Set<string>();

    for (let from = startBlock; from <= currentBlock; from += CHUNK_SIZE) {
      const to = Math.min(from + CHUNK_SIZE - 1, currentBlock);

      try {
        const logs = await contract.queryFilter(transferFilter, from, to);

        for (const log of logs) {
          try {
            let toAddr: string;
            if (log instanceof EventLog && log.args) {
              toAddr = log.args[1];
            } else {
              const parsed = contract.interface.parseLog({ topics: log.topics as string[], data: log.data });
              toAddr = parsed?.args[1] ?? '';
            }
            if (toAddr && toAddr !== '0x0000000000000000000000000000000000000000') {
              holders.add(toAddr.toLowerCase());
            }
          } catch { /* skip */ }
        }
      } catch { /* skip chunk on RPC error */ }
    }

    return holders.size;
  } catch (err) {
    throw wrapError(err, `getHolderCount(${tokenAddress})`);
  }
}

/**
 * Subscribe to real-time trade events on a bonding curve.
 * Returns an unsubscribe function.
 *
 * @param tokenAddress - BondingCurve contract address
 * @param provider - Provider (must support event listeners)
 * @param callback - Called with each new trade event
 * @returns Unsubscribe function
 */
export function subscribeTrades(
  tokenAddress: string,
  provider: JsonRpcProvider,
  callback: (event: TradeEvent) => void
): () => void {
  validateAddress(tokenAddress, 'tokenAddress');

  const contract = new Contract(tokenAddress, BondingCurveABI, provider);

  const handleBuy = (buyer: string, ethAmount: bigint, tokenAmount: bigint, newPrice: bigint, event: any) => {
    callback({
      type: 'buy',
      trader: buyer,
      ethAmount: Number(formatEther(ethAmount)),
      tokenAmount: Number(formatUnits(tokenAmount, 18)),
      newPrice: Number(newPrice) / 1e18,
      blockNumber: event?.log?.blockNumber ?? 0,
      txHash: event?.log?.transactionHash ?? '',
    });
  };

  const handleSell = (seller: string, tokenAmount: bigint, ethAmount: bigint, newPrice: bigint, event: any) => {
    callback({
      type: 'sell',
      trader: seller,
      ethAmount: Number(formatEther(ethAmount)),
      tokenAmount: Number(formatUnits(tokenAmount, 18)),
      newPrice: Number(newPrice) / 1e18,
      blockNumber: event?.log?.blockNumber ?? 0,
      txHash: event?.log?.transactionHash ?? '',
    });
  };

  contract.on('Buy', handleBuy);
  contract.on('Sell', handleSell);

  return () => {
    contract.off('Buy', handleBuy);
    contract.off('Sell', handleSell);
  };
}

/**
 * Subscribe to new token creation events from the factory.
 * Returns an unsubscribe function.
 */
export function subscribeNewTokens(
  factoryAddress: string,
  provider: JsonRpcProvider,
  callback: (event: { tokenAddress: string; name: string; symbol: string; txHash: string }) => void
): () => void {
  validateAddress(factoryAddress, 'factoryAddress');

  const factory = new Contract(factoryAddress, TokenFactoryABI, provider);

  const handler = (token: string, name: string, symbol: string, ...rest: any[]) => {
    const event = rest[rest.length - 1];
    callback({
      tokenAddress: token,
      name,
      symbol,
      txHash: event?.log?.transactionHash ?? '',
    });
  };

  factory.on('BondingCurveCreated', handler);

  return () => {
    factory.off('BondingCurveCreated', handler);
  };
}
