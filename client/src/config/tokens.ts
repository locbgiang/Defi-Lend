import type { Token } from '../types';

// Supported tokens - Sepolia testnet (Aave faucet tokens)
export const SUPPORTED_TOKENS: Token[] = [
  {
    address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    icon: '💵',
  },
  {
    address: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    icon: '🟡',
  },
  {
    address: '0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c',
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
