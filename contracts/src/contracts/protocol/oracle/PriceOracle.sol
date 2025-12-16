// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

/**
 * Simple price oracle for MVP
 * in production, use Chainlink
 */

contract PriceOracle {
    // errors
    error PriceNotSet(address asset);
    error StalePrice(address asset, uint256 updateAt);
    error InvalidPrice(address asset, int256 price);
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

        (
            /* uint80 roundId */
            int256 answer,
            /* uint256 startedAt*/
            uint256 updateAt,
            /* uint80 answeredInRound */
        ) = feed.latestRoundData();

        // check for state price
        if (block.timestamp - updatedAt > STALENESS_THRESHOLD) {
            revert StalePrice(asset, updatedAt);
        }

        // check for invalid price
        if (answer <= 0) {
            revert InvalidPrice(asset, answer);
        }

        // normalize to 18 decimals
        // chainlink feeds typically use 8 decimals
        uint8 feedDecimals = feed.decimals();
        uint256 price = uint256(answer);

        if (feedDecimals < PRICE_DECIMALS) {
            // scale up: e.g., 8 decimals -> 18 decimals
            price = price * (10 ** (PRICE_DECIMALS - feedDecimals));
        } else if (feedDecimals > PRICE_DECIMALS) {
            // scale down (rare case)
            price = price / (10 ** (feedDecimals - PRICE_DECIMALS));
        }

        return price;
    }
}