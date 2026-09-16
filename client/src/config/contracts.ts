// Contract addresses - update these after deployment
// For local development with Anvil, these will be set after running deploy script
/**
Contract            Address
Pool            0x19213d7C7CBE804abfa8580ec3D64B0c9D5B1511
PriceOracle       0xdF7514C51674B6aA5728bc3D0c8c6c2F7d96AaC7
aUSDC           0xaeaA17b89d23B4AbD0386b55c84197c51C358D49
vdUSDC        0x786eaBEF3e156690dC802B3Eb2C1D7c9947890bF
aDAI            0x9db437C97F2DCd1E05d417F064E6d571E1f1B476
vdDAI           0x8f9FE68Bd70a27317fc4dD1F7949EA287F43a3B7
aWETH         0x830a56f66C2d9EF3f8d05119177a275D8bf73470
vdWETH        0x117FDCb1b12EeD71F9440A5A50a17DdEdDaC5097
WETHGateway   0x8013E1Ee4c96A51c517F7d43E9799Da1f755AC5f
 */
export const CONTRACTS = {
  // Pool contract - main entry point (Sepolia)
  POOL: '0x19213d7C7CBE804abfa8580ec3D64B0c9D5B1511' as `0x${string}`,
  
  // Price Oracle (Sepolia)
  PRICE_ORACLE: '0xdF7514C51674B6aA5728bc3D0c8c6c2F7d96AaC7' as `0x${string}`,
  
  // WETH Gateway for native ETH deposits (Sepolia)
  WETH_GATEWAY: '0x8013E1Ee4c96A51c517F7d43E9799Da1f755AC5f' as `0x${string}`,
  
  // Token addresses (Sepolia - Aave testnet tokens)
  TOKENS: {
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as `0x${string}`,
    DAI: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357' as `0x${string}`,
    WETH: '0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c' as `0x${string}`,
  },
  
  // aToken addresses (Sepolia)
  ATOKENS: {
    aUSDC: '0xaeaA17b89d23B4AbD0386b55c84197c51C358D49' as `0x${string}`,
    aDAI: '0x9db437C97F2DCd1E05d417F064E6d571E1f1B476' as `0x${string}`,
    aWETH: '0x830a56f66C2d9EF3f8d05119177a275D8bf73470' as `0x${string}`,
  },
} as const;

// Pool ABI - add functions as needed
export const POOL_ABI = [
  {
    name: 'supply',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'onBehalfOf', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'to', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'borrow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'onBehalfOf', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'repay',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'onBehalfOf', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'reserves',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      { name: 'aTokenAddress', type: 'address' },
      { name: 'variableDebtTokenAddress', type: 'address' },
      { name: 'liquidationThreshold', type: 'uint256' },
      { name: 'liquidationBonus', type: 'uint256' },
      { name: 'ltv', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
    ],
  },
  {
    name: 'getUserAccountData',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'totalCollateralBase', type: 'uint256' },
      { name: 'totalDebtBase', type: 'uint256' },
      { name: 'availableBorrowsBase', type: 'uint256' },
      { name: 'currentLiquidationThreshold', type: 'uint256' },
      { name: 'ltv', type: 'uint256' },
      { name: 'healthFactor', type: 'uint256' },
    ],
  },
  {
    name: 'liquidationCall',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'collateralAsset', type: 'address' },
      { name: 'debtAsset', type: 'address' },
      { name: 'user', type: 'address' },
      { name: 'debtToCover', type: 'uint256' },
      { name: 'receiveAToken', type: 'bool' },
    ],
    outputs: [],
  },
] as const;

// ERC20 ABI for token interactions
export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// Debt token addresses (Sepolia)
export const DEBT_TOKENS = {
  vdUSDC: '0x786eaBEF3e156690dC802B3Eb2C1D7c9947890bF' as `0x${string}`,
  vdDAI: '0x8f9FE68Bd70a27317fc4dD1F7949EA287F43a3B7' as `0x${string}`,
  vdWETH: '0x117FDCb1b12EeD71F9440A5A50a17DdEdDaC5097' as `0x${string}`,
} as const;

// WETHGateway ABI for native ETH deposits
export const WETH_GATEWAY_ABI = [
  {
    name: 'depositETH',
    type: 'function',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'withdrawETH',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
] as const;

// PriceOracle ABI
export const PRICE_ORACLE_ABI = [
  {
    name: 'getAssetPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [{ name: 'price', type: 'uint256' }],
  },
  {
    name: 'hasPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;
