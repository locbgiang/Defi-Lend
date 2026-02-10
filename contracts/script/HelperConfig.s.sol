// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {MockV3Aggregator} from "../test/mocks/MockV3Aggregator.sol";
import {Script, console} from "forge-std/Script.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";

/**
 * @title HelperConfig
 * @author Loc Giang
 * @notice This script is to help decide which chain we are working on.
 */
contract HelperConfig is Script {
    //=====================Network Config Struct=========================
    struct NetworkConfig {
        address usdc;           // USDC token address
        address dai;            // DAI token address
        address wethUsdPriceFeed;
        address wbtcUsdPriceFeed;
        address weth;           // WETH token address
        address wbtc;            // WBTC token address
        uint256 deployerKey;    // Deployer private key
    }

    //====================State Variable===========================
    NetworkConfig public activeNetworkConfig;

    uint8 public constant DECIMALS = 8;
    int256 public constant ETH_USD_PRICE = 2000e8;
    int256 public constant BTC_USD_PRICE = 60000e8;

    // Chain ID
    uint256 public constant SEPOLIA_CHAIN_ID = 11155111;
    uint256 public constant MAINNET_CHAIN_ID = 1;
    uint256 public constant ANVIL_CHAIN_ID = 31337;

    // Default Anvil private key (DO NOT use in production)
    uint256 public constant DEFAULT_ANVIL_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

    // ====================== Constructor ==================================
    constructor() {
        if (block.chainid == SEPOLIA_CHAIN_ID) {
            activeNetworkConfig = getSepoliaConfig();
        } else if (block.chainid == MAINNET_CHAIN_ID) {
            activeNetworkConfig = getMainnetConfig();
        } else {
            activeNetworkConfig = getOrCreateAnvilConfig();
        }
    }

    // ==================== Network Configs ===================================

    /**
     * @notice Returns Sepolia testnet configuration
     * @dev uses existing testnet token addresses or deploy mocks
     */
    function getSepoliaConfig() public view returns (NetworkConfig memory) {
        return NetworkConfig({
            usdc: 0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8, // Aave USDC on Sepolia
            dai: 0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357,  // Aave DAI on Sepolia
            wethUsdPriceFeed: 0x694AA1769357215DE4FAC081bf1f309aDC325306,   // ETH / USD price on chainlink
            wbtcUsdPriceFeed: 0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43,   // BTC/ USD price on chainlink
            weth: 0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c, // WETH on Sepolia
            wbtc: 0x4131600fd78Eb697413cA806A8f748edB959ddcd,
            deployerKey: vm.envUint("PRIVATE_KEY")
        });
    }

    /**
     * @notice Returns Mainnet configuration
     * @dev Uses real mainnet token addresses
     */
    function getMainnetConfig() public view returns (NetworkConfig memory) {
        return NetworkConfig({
            usdc: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48, // USDC on Mainnet
            dai: 0x6B175474E89094C44Da98b954EedeAC495271d0F,  // DAI on Mainnet (fixed)
            wethUsdPriceFeed: 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419,
            wbtcUsdPriceFeed: 0xCCAD412903320E940579B703D5776570B12D5887,
            weth: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, // WETH on Mainnet
            wbtc: 0x2260fac5e5542a773aa44fbcfedf7c193bc2c599,
            deployerKey: vm.envUint("PRIVATE_KEY")
        });
    }

    /**
     * @notice Creates or returns Anvil (local) configuration
     * @dev Deploys mock tokens if needed
     */
    function getOrCreateAnvilConfig() public returns (NetworkConfig memory) {
        // If already configured, return existing
        if (activeNetworkConfig.usdc != address(0)) {
            return activeNetworkConfig;
        }

        console.log("Deploying mock tokens for Anvil...");

        vm.startBroadcast(DEFAULT_ANVIL_KEY);

        // deploy mock price feeds
        MockV3Aggregator ethUsdPriceFeed = new MockV3Aggregator(DECIMALS, ETH_USD_PRICE);
        console.log("ETH/USD Price Feed deployed at:", address(ethUsdPriceFeed));

        MockV3Aggregator btcUsdPriceFeed = new MockV3Aggregator(DECIMALS, BTC_USD_PRICE);
        console.log("ETH/USD Price Feed deployed at:", address(btcUsdPriceFeed));


        // Deploy mock USDC
        ERC20Mock mockUsdc = new ERC20Mock();
        console.log("Mock USDC deployed at:", address(mockUsdc));

        // Deploy mock DAI
        ERC20Mock mockDai = new ERC20Mock();
        console.log("Mock DAI deployed at:", address(mockDai));

        // Deploy mock WETH
        ERC20Mock mockWeth = new ERC20Mock();
        console.log("Mock WETH deployed at:", address(mockWeth));

        // Deploy mock BTC
        ERC20Mock mockBtc = new ERC20Mock();
        console.log("Mock WBTC deployed at:", address(mockWbtc));

        vm.stopBroadcast();

        return NetworkConfig({
            usdc: address(mockUsdc),
            dai: address(mockDai),
            wethUsdPriceFeed: address(ethUsdPriceFeed),
            wbtcUsdPriceFeed: address(btcUsdPriceFeed),
            weth: address(mockWeth),
            wbtc: address(mockWbtc),
            deployerKey: DEFAULT_ANVIL_KEY
        });
    }

    // ======================== Getters ==================================
    
    function getActiveNetworkConfig() public view returns (NetworkConfig memory) {
        return activeNetworkConfig;
    }

    function getUsdcAddress() public view returns (address) {
        return activeNetworkConfig.usdc;
    }

    function getDaiAddress() public view returns (address) {
        return activeNetworkConfig.dai;
    }

    function getWethAddress() public view returns (address) {
        return activeNetworkConfig.weth;
    }

    function getWbtcAddress() public view returns (address) {
        return activeNetworkConfig.wbtc;
    }

    function getEthUsdPriceFeed() public view returns (address) {
        return activeNetworkConfig.wethUsdPriceFeed;
    }

    function getBtcUsdPriceFeed() public view returns (address) {
        return activeNetworkConfig.wbtcUsdPriceFeed;
    }

    function getDeployerKey() public view returns (uint256) {
        return activeNetworkConfig.deployerKey;
    }
}