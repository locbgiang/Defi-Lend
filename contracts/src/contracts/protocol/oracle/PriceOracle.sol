// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

/**
 * Simple price oracle for MVP
 * in production, use Chainlink
 */

contract PriceOracle {
    // errors
    error PriceNotSet();
    error StalePrice();
    error InvalidPrice();
    error NotOwner();
    error ZeroAddress();

    address public owner;

    mapping(address => address)  public assetPriceFeed;

    mapping(address => uint256) public manualPrices;

    mapping(address => bool) public useChainlink;

    uint256 public constant STALENESS_THRESHOLD = 1 hours;

    uint256 public constant PRICE_DECIMALS = 18;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setAssetPriceFeed(address asset, address priceFeed) external onlyOwner {
        if (asset == address(0)) revert ZeroAddress();
        if (priceFeed == address(0)) revert ZeroAddress();

        assetPriceFeeds[asset] = priceFeed;
        useChainlink[asset] = true;

        emit PriceFeedSet(asset, priceFeed);
    }
}