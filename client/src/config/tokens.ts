import type { Token } from '../types';

// Supported tokens - Sepolia testnet (Aave faucet tokens)
export const SUPPORTED_TOKENS: Token[] = [
  {
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
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
