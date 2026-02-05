// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// import {MockV3Aggregator} from "../test/mocks/MockV3Aggregator.sol";
import {Script} from "forge-std/Script.sol";
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
        address weth;           // WETH token address (optional)
        uint256 deployerKey;    // Deployer private key
    }

    //====================State Variable===========================
    NetworkConfig public activeNetworkConfig;

    // Chain ID
    uint256 public constant SEPOLIA_CHAIN_ID = 11155111;
    uint256 public constant MAINNET_CHAIN_ID = 1;
    uint256 public constant ANVIL_CHAIN_ID = 31337;

    // Default Anvil private key (DO NOT use in production)
    uint256 public constant DEFAULT_ANVIL_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

    // ====================== Constructor ==================================
    constructor() {
        if (block.chainid = SEPOLIA_CHAIN_ID) {
            activeNetworkConfig = getSepoliaConfig();
        } else if (block.chainid = MAINNET_CHAIN_ID) {
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
            weth: 0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c, // WETH on Sepolia
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
            dai: 0x6B175474E89094C44Da98b954EescdeCB5f8F3b16,  // DAI on Mainnet
            weth: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, // WETH on Mainnet
            deployerKey: vm.envUint("PRIVATE_KEY")
        });
    }
}