// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

/*
VariableDebtToken - tracks user debt with variable interest rates

key differences from AToken:
1. non-transferable (debt can't be transferred between users)
2. no underlying asset backing
3. only mint/burn operation
4. balances represent debt owed, not assets owned
 */

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract VariableDebtToken is ERC20 {
    address public immutable POOL;
    address public immutable UNDERLYING_ASSET;

    modifier onlyPool() {
        require(msg.sender == POOL, "Caller must be pool");
        _;
    }

    constructor(
        address pool,
        address underlyingAsset,
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) {
        require(pool != address(0), "Invalid pool address");
        require(underlyingAsset != address(0), "Invalid asset address");

        POOL = pool;
        UNDERLYING_ASSET = underlyingAsset;
    }

    // Mint debt tokens when user borrows
    function mint(
        address user,
        uint256 amount
    ) external onlyPool returns(bool) {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than 0");

        _mint(user, amount);

        emit Mint(user, amount, balanceOf(user), totalSupply());
        return true;
    }

    // burn debt tokens when user repays
    function burn(
        address user,
        uint256 amount
    ) external onlyPool {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(user) >= amount, "Insufficient balance");

        _burn(user, amount);

        emit Burn(user, amount, balanceOf(user), totalSupply());
    }

    // override transfer function to make non-transferable
    function transfer(address, uint256) public pure override returns(bool) {
        revert("Debt tokens are non-transferable");
    }

    function transferFrom(address, address, uint256) public pure override returns(bool) {
        revert("Debt tokens are none-transferable");
    } 

    function approve(address, uint256) public pure override returns(bool) {
        revert("Debt tokens are non-transferable");
    }

    // Events
    event Mint(
        address indexed user,
        uint256 amount,
        uint256 currentBalance,
        uint256 totalSupply
    )

    event Burn(
        address indexed user,
        uint256 amount,
        uint256 currentBalance,
        uint256 totalSupply
    )
}