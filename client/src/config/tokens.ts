import type { Token } from '../types';

// Supported tokens - update addresses after deployment
export const SUPPORTED_TOKENS: Token[] = [
  {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    icon: '💵',
  },
  {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    icon: '🟡',
  },
  {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    icon: '💎',
  },
];

// Mock market data for development (until contracts are deployed)
export const MOCK_MARKETS = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    icon: '💵',
    totalSupply: '$2.5M',
    totalBorrow: '$1.8M',
    supplyAPY: 3.24,
    borrowAPY: 5.12,
    ltv: 80,
    price: 1.00,
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    icon: '🟡',
    totalSupply: '$1.2M',
    totalBorrow: '$800K',
    supplyAPY: 2.85,
    borrowAPY: 4.75,
    ltv: 75,
    price: 1.00,
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    icon: '💎',
    totalSupply: '$5.8M',
    totalBorrow: '$2.1M',
    supplyAPY: 1.52,
    borrowAPY: 3.28,
    ltv: 75,
    price: 2450.00,
  },
];
