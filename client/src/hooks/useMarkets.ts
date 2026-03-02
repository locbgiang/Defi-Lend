import { useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { CONTRACTS, DEBT_TOKENS, POOL_ABI, ERC20_ABI } from '../config/contracts';

export interface MarketData {
  symbol: string;
  name: string;
  icon: string;
  address: `0x${string}`;
  aTokenAddress: `0x${string}`;
  debtTokenAddress: `0x${string}`;
  decimals: number;
  totalSupply: bigint;
  totalBorrow: bigint;
  totalSupplyFormatted: string;
  totalBorrowFormatted: string;
  ltv: number;
  supplyAPY: number;
  borrowAPY: number;
  isActive: boolean;
}

const MARKET_CONFIG = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    icon: '💵',
    address: CONTRACTS.TOKENS.USDC,
    aTokenAddress: CONTRACTS.ATOKENS.aUSDC,
    debtTokenAddress: DEBT_TOKENS.vdUSDC,
    decimals: 6,
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    icon: '🟡',
    address: CONTRACTS.TOKENS.DAI,
    aTokenAddress: CONTRACTS.ATOKENS.aDAI,
    debtTokenAddress: DEBT_TOKENS.vdDAI,
    decimals: 18,
  },
] as const;

function formatLargeNumber(value: bigint, decimals: number): string {
  const num = Number(formatUnits(value, decimals));
  if (num >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(2)}M`;
  } else if (num >= 1_000) {
    return `$${(num / 1_000).toFixed(2)}K`;
  } else if (num > 0) {
    return `$${num.toFixed(2)}`;
  }
  return '$0';
}

export function useMarkets() {
  const contracts = MARKET_CONFIG.flatMap((market) => [
    // Get reserve data from Pool
    {
      address: CONTRACTS.POOL,
      abi: POOL_ABI,
      functionName: 'reserves',
      args: [market.address],
    },
    // Get total supply from aToken
    {
      address: market.aTokenAddress,
      abi: ERC20_ABI,
      functionName: 'totalSupply',
    },
    // Get total borrow from debt token
    {
      address: market.debtTokenAddress,
      abi: ERC20_ABI,
      functionName: 'totalSupply',
    },
  ]);

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: contracts as any,
    query: {
      enabled: CONTRACTS.POOL !== '0x0000000000000000000000000000000000000000',
    },
  });

  const markets: MarketData[] = MARKET_CONFIG.map((market, index) => {
    const baseIndex = index * 3;
    const reserveData = data?.[baseIndex]?.result as [string, string, bigint, bigint, bigint, boolean] | undefined;
    const totalSupply = data?.[baseIndex + 1]?.result as bigint | undefined;
    const totalBorrow = data?.[baseIndex + 2]?.result as bigint | undefined;

    const ltv = reserveData ? Number(reserveData[4]) / 100 : 75; // Default 75%
    const isActive = reserveData ? reserveData[5] : false;

    const supply = totalSupply ?? 0n;
    const borrow = totalBorrow ?? 0n;

    // Calculate utilization-based APY (simplified model)
    // In a real protocol, this would come from an interest rate model contract
    const utilization = supply > 0n ? Number((borrow * 10000n) / supply) / 100 : 0;
    const baseRate = 2; // 2% base
    const borrowAPY = baseRate + utilization * 0.1; // Increases with utilization
    const supplyAPY = borrowAPY * (utilization / 100) * 0.9; // 90% of borrow interest goes to suppliers

    return {
      ...market,
      totalSupply: supply,
      totalBorrow: borrow,
      totalSupplyFormatted: formatLargeNumber(supply, market.decimals),
      totalBorrowFormatted: formatLargeNumber(borrow, market.decimals),
      ltv,
      supplyAPY: Math.max(supplyAPY, 0),
      borrowAPY,
      isActive,
    };
  });

  return {
    markets,
    isLoading,
    error,
    refetch,
  };
}
