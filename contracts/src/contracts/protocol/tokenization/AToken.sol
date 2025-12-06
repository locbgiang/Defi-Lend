// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

/*
Key Features for MVP:

1. Inherits ERC20 - Gets standard token functions (transfer, approve, balanceOf, etc.)
2. Immutable references - Pool, underlying asset, and treasury addresses
3. mint() - Creates aTokens when users supply assets
4. burn() - Destroys aTokens when users withdraw
5. onlyPool modifier - Only the pool can mint/burn tokens
6. transferUnderlyingTo() - Moves actual assets (USDC, ETH) to users
7. mintToTreasury() - Creates protocol fee revenue
8. transferOnLiquidation() - Handles liquidation flows
*/

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract AToken is ERC20 {

    // The underlying asset (e.g., USDC, DAI, WETH)
    IERC20 public immutable UNDERLYING_ASSET;
    
    // The pool contract that controls minting/burning
    address public immutable POOL;


}