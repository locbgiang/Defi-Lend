// Contract addresses - update these after deployment
// For local development with Anvil, these will be set after running deploy script
/**
Contract	    Address
Pool	        0xDA0F9F9c05D2A9B46561f628a64Eb29b656d29B3
PriceOracle	  0xdF7514C51674B6aA5728bc3D0c8c6c2F7d96AaC7
aUSDC	        0x227577477F05d71595617a08643B7db35AF71Ddd
vdUSDC	      0x130539520029341869d5236735FD31c26854218c
aDAI	        0x7916AefE5aA4B71299eaBb6241072dDb354c31D7
vdDAI	        0x8A090b7674309050A5D748aA291ba0c9EeD4911a
aWETH         0x64cDDef432871E9E376103F12c89e925936bC03d
vdWETH        0xAeBd2bA52C776B99b6631DcE70640e020a9C5e94
WETHGateway   0x6724FA47Ca81F10feeACD202e5f8Bc13D3594094
 */
export const CONTRACTS = {
  // Pool contract - main entry point (Sepolia)
  POOL: '0xDA0F9F9c05D2A9B46561f628a64Eb29b656d29B3' as `0x${string}`,
  
  // Price Oracle (Sepolia)
  PRICE_ORACLE: '0xdF7514C51674B6aA5728bc3D0c8c6c2F7d96AaC7' as `0x${string}`,
  
  // WETH Gateway for native ETH deposits (Sepolia)
  WETH_GATEWAY: '0x6724FA47Ca81F10feeACD202e5f8Bc13D3594094' as `0x${string}`,
  
  // Token addresses (Sepolia - Aave testnet tokens)
  TOKENS: {
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as `0x${string}`,
    DAI: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357' as `0x${string}`,
    WETH: '0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c' as `0x${string}`,
  },
  
  // aToken addresses (Sepolia)
  ATOKENS: {
    aUSDC: '0x227577477F05d71595617a08643B7db35AF71Ddd' as `0x${string}`,
    aDAI: '0x7916AefE5aA4B71299eaBb6241072dDb354c31D7' as `0x${string}`,
    aWETH: '0x64cDDef432871E9E376103F12c89e925936bC03d' as `0x${string}`,
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
  vdUSDC: '0x130539520029341869d5236735FD31c26854218c' as `0x${string}`,
  vdDAI: '0x8A090b7674309050A5D748aA291ba0c9EeD4911a' as `0x${string}`,
  vdWETH: '0xAeBd2bA52C776B99b6631DcE70640e020a9C5e94' as `0x${string}`,
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
