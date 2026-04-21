import { Contract, parseEther, formatUnits, type Signer, type JsonRpcProvider } from 'ethers';
import { TokenFactoryABI } from '../abi/TokenFactory';
import type { CreateTokenParams, CreateTokenResult, FactoryConfig } from '../types';
import { validateAddress, validatePositiveAmount } from './validation';
import { TransactionFailedError, wrapError } from '../errors';

/**
 * Create a new bonding curve token via the TokenFactory contract.
 *
 * @param params - Token creation parameters
 * @param factoryAddress - Deployed TokenFactory contract address
 * @param signer - ethers Signer (wallet) to sign the transaction
 * @param provider - Read-only provider for fetching the creation fee
 * @returns Token address and transaction hash
 */
export async function createToken(
  params: CreateTokenParams,
  factoryAddress: string,
  signer: Signer,
  provider: JsonRpcProvider
): Promise<CreateTokenResult> {
  validateAddress(factoryAddress, 'factoryAddress');
  validatePositiveAmount(params.totalSupply, 'totalSupply');
  validatePositiveAmount(params.ethThreshold, 'ethThreshold');

  try {
    const factory = new Contract(factoryAddress, TokenFactoryABI, provider);

    // Fetch the creation fee from the factory
    const creationFee = await factory.creationFee();
    const initialBuyWei = parseEther(params.initialBuyEth || '0');
    const totalValue = creationFee + initialBuyWei;

    // Determine creator address from the signer
    const creatorAddress = await signer.getAddress();

    // Build the write contract with the signer
    const factoryWrite = new Contract(factoryAddress, TokenFactoryABI, signer);

    const totalSupplyWei = parseEther(params.totalSupply);

    const tx = await factoryWrite.createBondingCurve(
      params.name,
      params.symbol,
      totalSupplyWei,
      parseEther(params.ethThreshold),
      params.isTaxToken,
      params.devWallet || creatorAddress,
      params.devBuyFeePercent ?? 0,
      params.devSellFeePercent ?? 0,
      params.marketingWallet || creatorAddress,
      params.marketingBuyFeePercent ?? 0,
      params.marketingSellFeePercent ?? 0,
      initialBuyWei,
      parseEther(params.initialVirtualEth || '0'),
      { value: totalValue }
    );

    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) {
      throw new TransactionFailedError('Token creation transaction reverted', receipt?.hash);
    }

    // Parse the BondingCurveCreated event to extract the token address
    let tokenAddress = '';
    for (const log of receipt.logs) {
      try {
        const parsed = factoryWrite.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed && parsed.name === 'BondingCurveCreated') {
          tokenAddress = parsed.args.token;
          break;
        }
      } catch {
        // Not our event, skip
      }
    }

    if (!tokenAddress) {
      throw new TransactionFailedError(
        'Failed to parse token address from transaction receipt',
        receipt.hash
      );
    }

    return {
      tokenAddress,
      txHash: receipt.hash,
    };
  } catch (err) {
    throw wrapError(err, 'createToken');
  }
}

/**
 * Get the creation fee required by the factory.
 *
 * @param factoryAddress - TokenFactory contract address
 * @param provider - Read-only provider
 * @returns Creation fee in ETH (human-readable string)
 */
export async function getCreationFee(
  factoryAddress: string,
  provider: JsonRpcProvider
): Promise<string> {
  validateAddress(factoryAddress, 'factoryAddress');

  try {
    const factory = new Contract(factoryAddress, TokenFactoryABI, provider);
    const fee = await factory.creationFee();
    return formatUnits(fee, 18);
  } catch (err) {
    throw wrapError(err, 'getCreationFee');
  }
}

/**
 * Get full factory configuration.
 *
 * @param factoryAddress - TokenFactory contract address
 * @param provider - Read-only provider
 * @returns Typed factory configuration object
 */
export async function getFactoryConfig(
  factoryAddress: string,
  provider: JsonRpcProvider
): Promise<FactoryConfig> {
  validateAddress(factoryAddress, 'factoryAddress');

  try {
    const factory = new Contract(factoryAddress, TokenFactoryABI, provider);
    const [companyFee, creationFee, maxFee, minThreshold, defaultEth, projectCount] =
      await Promise.all([
        factory.companyFeePercent(),
        factory.creationFee(),
        factory.maxFeePercent(),
        factory.minThreshold(),
        factory.defaultInitialEth(),
        factory.projectCount(),
      ]);

    return {
      companyFeePercent: Number(companyFee),
      creationFee: formatUnits(creationFee, 18),
      maxFeePercent: Number(maxFee),
      minThreshold: formatUnits(minThreshold, 18),
      defaultInitialEth: formatUnits(defaultEth, 18),
      projectCount: Number(projectCount),
    };
  } catch (err) {
    throw wrapError(err, 'getFactoryConfig');
  }
}
