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
}