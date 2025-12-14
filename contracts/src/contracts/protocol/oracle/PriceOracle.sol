// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

/**
 * Simple price oracle for MVP
 * in production, use Chainlink
 */

contract PriceOracle {
    address public owner;

    // asset => price in USD (18 decimals)
    // example: USDC = 1e18 ($1.00), ETH = 2000e18 ($2000)
    mapping(address => uint256) public prices;

    event PriceUpdated(address indexed asset, uint256 price);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
}