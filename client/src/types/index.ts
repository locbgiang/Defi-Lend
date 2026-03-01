// Token/Asset types
export interface Token {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  icon?: string;
}

// Reserve data from Pool contract
export interface ReserveData {
  aTokenAddress: `0x${string}`;
  variableDebtTokenAddress: `0x${string}`;
  liquidationThreshold: bigint;
  liquidationBonus: bigint;
  ltv: bigint;
  isActive: boolean;
}

// Market data for display
export interface Market {
  asset: Token;
  reserve: ReserveData;
  totalSupply: bigint;
  totalBorrow: bigint;
  supplyAPY: number;
  borrowAPY: number;
  price: bigint;
}

// User account data from Pool.getUserAccountData
export interface UserAccountData {
  totalCollateralBase: bigint;
  totalDebtBase: bigint;
  availableBorrowsBase: bigint;
  currentLiquidationThreshold: bigint;
  ltv: bigint;
  healthFactor: bigint;
}

// User position for a specific asset
export interface UserPosition {
  asset: Token;
  supplied: bigint;
  borrowed: bigint;
  suppliedUSD: number;
  borrowedUSD: number;
}
