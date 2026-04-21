import { Contract, parseEther, parseUnits, type Signer, type JsonRpcProvider } from 'ethers';
import { BondingCurveABI } from '../abi/BondingCurve';
import { TokenFactoryABI } from '../abi/TokenFactory';
import type { BuyParams, SellParams, CreateTokenParams } from '../types';
import { validateAddress, validatePositiveAmount } from './validation';
import { wrapError } from '../errors';

/**
 * Trim a decimal string to at most 18 decimal places.
 */
function trimDec(val: string | number): string {
  const str = typeof val === 'number'
    ? val.toLocaleString('fullwide', { useGrouping: false, maximumFractionDigits: 20 })
    : val;
  const [int, dec] = str.split('.');
  return dec ? `${int}.${dec.slice(0, 18)}` : str;
}

/**
 * Estimate gas for a buy transaction (without executing it).
 *
 * @param params - Buy parameters
 * @param signer - Signer (wallet)
 * @param provider - Read-only provider
 * @returns Estimated gas as bigint
 */
export async function estimateBuyGas(
  params: BuyParams,
  signer: Signer,
  provider: JsonRpcProvider
): Promise<bigint> {
  validateAddress(params.tokenAddress, 'tokenAddress');
  validatePositiveAmount(params.ethAmount, 'ethAmount');

  try {
    const token = new Contract(params.tokenAddress, BondingCurveABI, signer);
    const ethWei = parseEther(trimDec(params.ethAmount));
    const minTokensWei = params.minTokens
      ? parseUnits(trimDec(params.minTokens), 18)
      : BigInt(0);

    return await token.buy.estimateGas(minTokensWei, { value: ethWei });
  } catch (err) {
    throw wrapError(err, `estimateBuyGas(${params.tokenAddress})`);
  }
}

/**
 * Estimate gas for a sell transaction (without executing it).
 *
 * @param params - Sell parameters
 * @param signer - Signer (wallet)
 * @param provider - Read-only provider
 * @returns Estimated gas as bigint
 */
export async function estimateSellGas(
  params: SellParams,
  signer: Signer,
  provider: JsonRpcProvider
): Promise<bigint> {
  validateAddress(params.tokenAddress, 'tokenAddress');
  validatePositiveAmount(params.tokenAmount, 'tokenAmount');

  try {
    const token = new Contract(params.tokenAddress, BondingCurveABI, signer);
    const tokenWei = parseUnits(trimDec(params.tokenAmount), 18);
    const minEthWei = params.minEth
      ? parseEther(trimDec(params.minEth))
      : BigInt(0);

    return await token.sell.estimateGas(tokenWei, minEthWei);
  } catch (err) {
    throw wrapError(err, `estimateSellGas(${params.tokenAddress})`);
  }
}

/**
 * Estimate gas for a token creation transaction (without executing it).
 *
 * @param params - Creation parameters
 * @param factoryAddress - Factory contract address
 * @param signer - Signer (wallet)
 * @param provider - Read-only provider
 * @returns Estimated gas as bigint
 */
export async function estimateCreateGas(
  params: CreateTokenParams,
  factoryAddress: string,
  signer: Signer,
  provider: JsonRpcProvider
): Promise<bigint> {
  validateAddress(factoryAddress, 'factoryAddress');

  try {
    const factory = new Contract(factoryAddress, TokenFactoryABI, provider);
    const creationFee = await factory.creationFee();
    const initialBuyWei = parseEther(params.initialBuyEth || '0');
    const totalValue = creationFee + initialBuyWei;
    const creatorAddress = await signer.getAddress();

    const factoryWrite = new Contract(factoryAddress, TokenFactoryABI, signer);

    return await factoryWrite.createBondingCurve.estimateGas(
      params.name,
      params.symbol,
      parseEther(params.totalSupply),
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
  } catch (err) {
    throw wrapError(err, 'estimateCreateGas');
  }
}
