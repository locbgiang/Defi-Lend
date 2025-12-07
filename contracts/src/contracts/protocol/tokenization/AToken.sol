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

    // The treasury address for protocol fees
    address public immutable RESERVE_TREASURY_ADDRESS;

    modifier onlyPool() {
        require(msg.sender == POOL, "Caller must be pool");
        _;
    }

    constructor (
        address pool,
        address underlyingAsset,
        address treasury,
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) {
        require(pool != address(0), "Invalid pool address");
        require(underlyingAsset != address(0), "Invalid asset address");
        require(treasury != address(0), "Invalid treasury address");

        POOL = pool;
        UNDERLYING_ASSET = IERC20(underlyingAsset);
        RESERVE_TREASURY_ADDRESS = treasury;
    }

    function mint(address user, uint256 amount) external onlyPool returns(bool) {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than 0");

        _mint(user, amount);

        emit Mint(user, amount, balanceOf(user), totalSupply());
        return true;
    }

    function burn(address user, uint256 amount) external onlyPool {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(user) >= amount, "Insufficient balance");

        _burn(user, amount);

        emit Burn(user, amount, balanceOf(user), totalSupply());
    }

    function transferUnderlyingTo(address target, uint256 amount) external onlyPool {
        require(target != address(0), "Invalid target address");
        require(amount > 0, "Amount must be greater than 0");

        UNDERLYING_ASSET.safeTransfer(target, amount);

        emit TransferUnderlying(target, amount);
    }

    function transferOnLiquidation(
        address from,
        address to,
        uint256 value
    ) external onlyPool {
        require(from != address(0), "Invalid from address");
        require(to != address(0), "Invalid to address");

        _transfer(from, to, value);

        emit TransferOnLiquidation(from, to, value);
    }

    // events
    event Mint(
        address indexed user,
        uint256 amount,
        uint256 currentBalance,
        uint256 totalSupply
    );

    event Burn(
        address indexed user,
        uint256 amount,
        uint256 currentBalance,
        uint256 totalSupply
    );

    event TransferUnderlying(
        address indexed target,
        uint256 amount
    );

    event MintToTreasury(
        address indexed treasury,
        uint256 amount
    );

    event TransferOnLiquidation(
        address indexed from,
        address indexed to,
        uint256 value
    );
}