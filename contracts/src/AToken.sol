// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

/*
Key Features for MVP:

1. Inherits ERC20 - Gets standard token functions (transfer, approve, balanceOf, etc.)
2. Immutable references - Pool, underlying asset, and treasury addresses
3. mint() - Creates aTokens when users supply assets
4. burn() - Destroys aTokens when users withdraw
5. onlyPool modifier - Only the pool can mint/burn tokens
6. transferUnderlying() - Moves actual assets (USDC, ETH) to users
7. mintToTreasury() - Creates protocol fee revenue
8. transferOnLiquidation() - Handles liquidation flows
*/

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title AToken
 * @author Loc Giang
 * @notice AToken is a receipt token that represents a user's deposit in the lending pool.
 * When you deposit USDC, you receive aUSDC. It's proof that you have funds in the protocol.
 */
contract AToken is ERC20 {
    using SafeERC20 for IERC20;

    // The underlying asset (e.g., USDC, DAI, WETH, WBTC)
    IERC20 public immutable UNDERLYING_ASSET;
    
    // The pool contract that controls minting/burning
    address public immutable POOL;

    // The treasury address for protocol fees
    address public immutable RESERVE_TREASURY_ADDRESS;

    // Access control
    // only the pool contract can call critical functions. This prevents unauthorized minting/burning
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

    /**
     * @param user mint to this address
     * @param amount amount mint
     * user deposits underlying asset 
     * What it does: Creates new aTokens for the user
     */
    function mint(address user, uint256 amount) external onlyPool returns(bool) {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than 0");

        _mint(user, amount);

        emit Mint(user, amount, balanceOf(user), totalSupply());
        return true;
    }

    /**
     * @param user burn from this address
     * @param amount amount burn 
     * user withdraws underlying asset
     * What it does: Destroys aTokens from user's balance
     */
    function burn(address user, uint256 amount) external onlyPool {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(user) >= amount, "Insufficient balance");

        _burn(user, amount);

        emit Burn(user, amount, balanceOf(user), totalSupply());
    }

    /**
     * @param target address of the target
     * @param amount amount being sent
     * When called: Withdrawals, borrows, liquidations 
     * What it does: Sends actual USDC/DAI/WETH to the user
     */
    function transferUnderlying(address target, uint256 amount) external onlyPool {
        require(target != address(0), "Invalid target address");
        require(amount > 0, "Amount must be greater than 0");

        UNDERLYING_ASSET.safeTransfer(target, amount);

        emit TransferUnderlying(target, amount);
    }

    /**
     * @param amount amount being mint
     * When called: interest accrual (future feature) 
     * what it does: mints aTokens to treasury as protocol fees
     */
    function mintToTreasury(uint256 amount) external onlyPool {
        require(amount > 0, "Amount must be greater than 0");

        // this mints aTokens, not underlying!
        // the underlying assets ALREADY exist in the contract
        // from borrower interest payments
        _mint(RESERVE_TREASURY_ADDRESS, amount);
        
        emit MintToTreasury(RESERVE_TREASURY_ADDRESS, amount);
    }

    /**
     * @param from the address to transfer from 
     * @param to the address to transfr to
     * @param value the amount to transfer
     */
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