import { useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { CONTRACTS, DEBT_TOKENS, POOL_ABI, ERC20_ABI, PRICE_ORACLE_ABI } from '../config/contracts';

export interface MarketData {
  asset: string;
  address: string;
  symbol: string;
  name: string;
  icon: string;
  decimals: number;
  totalSupply: bigint;
  totalBorrow: bigint;
  supplyAPY: string;
  borrowAPY: string;
  price: string;
  priceRaw: bigint;
  ltv: string;
  liquidationThreshold: string;
  availableLiquidity: string;
  utilizationRate: string;
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
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    icon: '💎',
    address: CONTRACTS.TOKENS.WETH,
    aTokenAddress: CONTRACTS.ATOKENS.aWETH,
    debtTokenAddress: DEBT_TOKENS.vdWETH,
    decimals: 18,
  },
] as const;

// Reserve data from Pool.reserves():
// Matches Solidity struct: [aTokenAddress, variableDebtTokenAddress, liquidationThreshold, liquidationBonus, ltv, isActive]
interface ReserveData {
  aTokenAddress: string;
  variableDebtTokenAddress: string;
  liquidationThreshold: bigint;
  liquidationBonus: bigint;
  ltv: bigint;
  isActive: boolean;
}

function parseReserveData(raw: readonly unknown[] | undefined): ReserveData | undefined {
  if (!raw || raw.length < 6) return undefined;
  return {
    aTokenAddress: raw[0] as string,
    variableDebtTokenAddress: raw[1] as string,
    liquidationThreshold: raw[2] as bigint,
    liquidationBonus: raw[3] as bigint,
    ltv: raw[4] as bigint,
    isActive: raw[5] as boolean,
  };
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
    // Get price from PriceOracle
    {
      address: CONTRACTS.PRICE_ORACLE,
      abi: PRICE_ORACLE_ABI,
      functionName: 'getAssetPrice',
      args: [market.address],
    },
  ]);

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: contracts as any,
    query: {
      enabled: CONTRACTS.POOL !== '0x0000000000000000000000000000000000000000',
    },
  });

  const markets: MarketData[] = MARKET_CONFIG.map((market, index) => {
    const baseIndex = index * 4; // 4 calls per market now
    const rawReserve = data?.[baseIndex]?.result as readonly unknown[] | undefined;
    const reserveData = parseReserveData(rawReserve);
    const totalSupply = data?.[baseIndex + 1]?.result as bigint | undefined;
    const totalBorrow = data?.[baseIndex + 2]?.result as bigint | undefined;
    const priceRaw = data?.[baseIndex + 3]?.result as bigint | undefined;

    const supply = totalSupply ?? 0n;
    const borrow = totalBorrow ?? 0n;
    const price = priceRaw ?? 0n;

    // Price is in 18 decimals from PriceOracle
    const priceFormatted = formatUnits(price, 18);

    // Calculate utilization-based APY
    const utilization = supply > 0n ? Number((borrow * 10000n) / supply) / 100 : 0;
    const baseRate = 2;
    const borrowAPY = baseRate + utilization * 0.1;
    const supplyAPY = borrowAPY * (utilization / 100) * 0.9;

    const ltv = reserveData ? Number(reserveData.ltv) : 7500;
    const liquidationThreshold = reserveData ? Number(reserveData.liquidationThreshold) : 8000;

    return {
      asset: market.address,
      address: market.address,
      symbol: market.symbol,
      name: market.name,
      icon: market.icon,
      decimals: market.decimals,
      totalSupply: supply,
      totalBorrow: borrow,
      supplyAPY: supplyAPY.toFixed(2),
      borrowAPY: borrowAPY.toFixed(2),
      price: priceFormatted,
      priceRaw: price,
      ltv: (ltv / 100).toFixed(0),
      liquidationThreshold: (liquidationThreshold / 100).toFixed(0),
      availableLiquidity: supply > borrow ? formatUnits(supply - borrow, market.decimals) : '0',
      utilizationRate: utilization.toFixed(2),
      isActive: reserveData?.isActive ?? false,
    };
  });

  return {
    markets,
    isLoading,
    error,
    refetch,
  };
}
