import { http, createConfig } from 'wagmi';
import { mainnet, sepolia, foundry } from 'wagmi/chains';

// Configure chains & transports
// foundry = local Anvil chain for development
// sepolia = testnet for staging
// mainnet = production (add when ready)

export const config = createConfig({
  chains: [foundry, sepolia, mainnet],
  transports: {
    [foundry.id]: http('http://127.0.0.1:8545'),
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
});

// Declare module for TypeScript support
declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
