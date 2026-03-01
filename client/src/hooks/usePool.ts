import { useReadContract } from 'wagmi';
import { CONTRACTS, POOL_ABI, ERC20_ABI } from '../config/contracts';
import type { UserAccountData } from '../types';

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
