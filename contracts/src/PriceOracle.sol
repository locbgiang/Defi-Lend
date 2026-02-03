// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {AggregatorV3Interface} from "./AggregatorV3Interface.sol";

/**
 * Simple price oracle for MVP
 * Supports both Chainlink feeds and manual prices (for testing)
 */
contract PriceOracle {
    // Errors
    error PriceNotSet(address asset);
    error StalePrice(address asset, uint256 updatedAt);
    error InvalidPrice(address asset, int256 price);
    error NotOwner();
    error ZeroAddress();

    address public owner;

    // FIX: Changed to plural "assetPriceFeeds" for consistency
    mapping(address => address) public assetPriceFeeds;

    mapping(address => uint256) public manualPrices;

    mapping(address => bool) public useChainlink;

    uint256 public constant STALENESS_THRESHOLD = 1 hours;

    uint256 public constant PRICE_DECIMALS = 18;

    // FIX: Added missing events
    event PriceFeedSet(address indexed asset, address indexed priceFeed);
    event ManualPriceSet(address indexed asset, uint256 price);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

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

    function setManualPrice(address asset, uint256 price) external onlyOwner {
        if (asset == address(0)) revert ZeroAddress();
        require(price > 0, "Price must be > 0");

        manualPrices[asset] = price;
        useChainlink[asset] = false;

        emit ManualPriceSet(asset, price);
    }

    function getAssetPrice(address asset) external view returns (uint256 price) {
        if (useChainlink[asset]) {
            return _getChainlinkPrice(asset);
        } else {
            return _getManualPrice(asset);
        }
    }

    function _getChainlinkPrice(address asset) internal view returns (uint256) {
        address priceFeed = assetPriceFeeds[asset];
        if (priceFeed == address(0)) revert PriceNotSet(asset);

        AggregatorV3Interface feed = AggregatorV3Interface(priceFeed);

        // FIX: Added missing commas
        (
            /* uint80 roundId */,
            int256 answer,
            /* uint256 startedAt */,
            uint256 updatedAt,
            /* uint80 answeredInRound */
        ) = feed.latestRoundData();

        // Check for stale price
        if (block.timestamp - updatedAt > STALENESS_THRESHOLD) {
            revert StalePrice(asset, updatedAt);
        }

        // Check for invalid price
        if (answer <= 0) {
            revert InvalidPrice(asset, answer);
        }

        // Normalize to 18 decimals
        // Chainlink feeds typically use 8 decimals
        uint8 feedDecimals = feed.decimals();
        uint256 price = uint256(answer);

        if (feedDecimals < PRICE_DECIMALS) {
            // Scale up: e.g., 8 decimals -> 18 decimals
            price = price * (10 ** (PRICE_DECIMALS - feedDecimals));
        } else if (feedDecimals > PRICE_DECIMALS) {
            // Scale down (rare case)
            price = price / (10 ** (feedDecimals - PRICE_DECIMALS));
        }

        return price;
    }

    function _getManualPrice(address asset) internal view returns (uint256) {
        uint256 price = manualPrices[asset];
        if (price == 0) revert PriceNotSet(asset);
        return price;
    }

    function hasPrice(address asset) external view returns (bool) {
        if (useChainlink[asset]) {
            return assetPriceFeeds[asset] != address(0);
        } else {
            return manualPrices[asset] > 0;
        }
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();

        address oldOwner = owner;
        owner = newOwner;

        emit OwnershipTransferred(oldOwner, newOwner);
    }
}