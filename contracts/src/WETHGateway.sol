// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address owner) external view returns (uint256);
}

interface IPool {
    function supply(address asset, uint256 amount, address onBehalfOf) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

interface IAToken {
    function balanceOf(address account) external view returns (uint256);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/**
 * @title WETHGateway
 * @notice Allows users to deposit/withdraw native ETH to the lending pool
 * @dev Wraps ETH to WETH and interacts with the Pool contract
 */
contract WETHGateway {
    using SafeERC20 for IERC20;

    IWETH public immutable WETH;
    IPool public immutable POOL;
    IAToken public immutable aWETH;

    event ETHDeposited(address indexed user, uint256 amount);
    event ETHWithdrawn(address indexed user, uint256 amount);

    constructor(address _weth, address _pool, address _aWETH) {
        require(_weth != address(0), "Invalid WETH address");
        require(_pool != address(0), "Invalid Pool address");
        require(_aWETH != address(0), "Invalid aWETH address");
        
        WETH = IWETH(_weth);
        POOL = IPool(_pool);
        aWETH = IAToken(_aWETH);
        
        // Approve Pool to spend WETH
        IWETH(_weth).approve(_pool, type(uint256).max);
    }

    /**
     * @notice Deposit ETH to the lending pool
     * @dev Wraps ETH to WETH and supplies to Pool on behalf of msg.sender
     */
    function depositETH() external payable {
        require(msg.value > 0, "Must send ETH");
        
        // Wrap ETH to WETH
        WETH.deposit{value: msg.value}();
        
        // Supply WETH to Pool on behalf of user
        POOL.supply(address(WETH), msg.value, msg.sender);
        
        emit ETHDeposited(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw ETH from the lending pool
     * @dev User must approve this contract to spend their aWETH first
     * @param amount Amount of WETH to withdraw (will receive ETH)
     */
    function withdrawETH(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transfer aWETH from user to this contract
        aWETH.transferFrom(msg.sender, address(this), amount);
        
        // Withdraw WETH from Pool
        POOL.withdraw(address(WETH), amount, address(this));
        
        // Unwrap WETH to ETH
        WETH.withdraw(amount);
        
        // Send ETH to user
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "ETH transfer failed");
        
        emit ETHWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Receive ETH when unwrapping WETH
     */
    receive() external payable {}
}
