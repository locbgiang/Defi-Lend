import { useReadContract, useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { CONTRACTS, DEBT_TOKENS, POOL_ABI, ERC20_ABI } from '../config/contracts';
import type { UserAccountData } from '../types';

// Market configuration for fetching balances
const MARKET_CONFIG = [
  {
    symbol: 'USDC',
    address: CONTRACTS.TOKENS.USDC,
    aTokenAddress: CONTRACTS.ATOKENS.aUSDC,
    debtTokenAddress: DEBT_TOKENS.vdUSDC,
    decimals: 6,
  },
  {
    symbol: 'DAI',
    address: CONTRACTS.TOKENS.DAI,
    aTokenAddress: CONTRACTS.ATOKENS.aDAI,
    debtTokenAddress: DEBT_TOKENS.vdDAI,
    decimals: 18,
  },
  {
    symbol: 'WETH',
    address: CONTRACTS.TOKENS.WETH,
    aTokenAddress: CONTRACTS.ATOKENS.aWETH,
    debtTokenAddress: DEBT_TOKENS.vdWETH,
    decimals: 18,
  },
] as const;

// Get user's account data (collateral, debt, health factor, etc.)
export function useUserAccountData(userAddress: `0x${string}` | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.POOL,
    abi: POOL_ABI,
    functionName: 'getUserAccountData',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress && CONTRACTS.POOL !== '0x0000000000000000000000000000000000000000',
    },
  });

  const accountData: UserAccountData | undefined = data
    ? {
        totalCollateralBase: data[0],
        totalDebtBase: data[1],
        availableBorrowsBase: data[2],
        currentLiquidationThreshold: data[3],
        ltv: data[4],
        healthFactor: data[5],
      }
    : undefined;

  return { data: accountData, isLoading, error, refetch };
}

// Get all user balances (wallet, supplied, borrowed) for all markets
export function useUserBalances(userAddress: `0x${string}` | undefined) {
  const contracts = MARKET_CONFIG.flatMap((market) => [
    // Wallet balance
    {
      address: market.address,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: userAddress ? [userAddress] : undefined,
    },
    // aToken balance (supplied)
    {
      address: market.aTokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: userAddress ? [userAddress] : undefined,
    },
    // Debt token balance (borrowed)
    {
      address: market.debtTokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: userAddress ? [userAddress] : undefined,
    },
  ]);

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: contracts as any,
    query: {
      enabled: !!userAddress && CONTRACTS.POOL !== '0x0000000000000000000000000000000000000000',
    },
  });

  const balances: Record<string, { wallet: string; walletRaw: bigint; supplied: string; suppliedRaw: bigint; borrowed: string; borrowedRaw: bigint; decimals: number }> = {};

  MARKET_CONFIG.forEach((market, index) => {
    const baseIndex = index * 3;
    const walletBalance = data?.[baseIndex]?.result as bigint | undefined;
    const suppliedBalance = data?.[baseIndex + 1]?.result as bigint | undefined;
    const borrowedBalance = data?.[baseIndex + 2]?.result as bigint | undefined;

    const walletRaw = walletBalance ?? 0n;
    const suppliedRaw = suppliedBalance ?? 0n;
    const borrowedRaw = borrowedBalance ?? 0n;

    balances[market.symbol] = {
      wallet: formatUnits(walletRaw, market.decimals),
      walletRaw,
      supplied: formatUnits(suppliedRaw, market.decimals),
      suppliedRaw,
      borrowed: formatUnits(borrowedRaw, market.decimals),
      borrowedRaw,
      decimals: market.decimals,
    };
  });

  return { balances, isLoading, error, refetch };
}

// Get reserve data for an asset
export function useReserveData(assetAddress: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.POOL,
    abi: POOL_ABI,
    functionName: 'reserves',
    args: [assetAddress],
    query: {
      enabled: CONTRACTS.POOL !== '0x0000000000000000000000000000000000000000',
    },
  });
}

// Get user's aToken balance (supply position)
export function useATokenBalance(
  aTokenAddress: `0x${string}`,
  userAddress: `0x${string}` | undefined
) {
  return useReadContract({
    address: aTokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress && aTokenAddress !== '0x0000000000000000000000000000000000000000',
    },
  });
}

// Get user's debt token balance (borrow position)
export function useDebtTokenBalance(
  debtTokenAddress: `0x${string}`,
  userAddress: `0x${string}` | undefined
) {
  return useReadContract({
    address: debtTokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress && debtTokenAddress !== '0x0000000000000000000000000000000000000000',
    },
  });
}

// Get user's wallet balance for an underlying token
export function useTokenBalance(
  tokenAddress: `0x${string}`,
  userAddress: `0x${string}` | undefined
) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress && tokenAddress !== '0x0000000000000000000000000000000000000000',
    },
  });
}

// Get token allowance for Pool contract
export function useTokenAllowance(
  tokenAddress: `0x${string}`,
  ownerAddress: `0x${string}` | undefined
) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: ownerAddress ? [ownerAddress, CONTRACTS.POOL] : undefined,
    query: {
      enabled: !!ownerAddress && tokenAddress !== '0x0000000000000000000000000000000000000000',
    },
  });
}
