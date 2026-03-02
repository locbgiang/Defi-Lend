// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {Script, console} from "forge-std/Script.sol";
import {Pool} from "../src/Pool.sol";
import {AToken} from "../src/AToken.sol";
import {VariableDebtToken} from "../src/VariableDebtToken.sol";
import {PriceOracle} from "../src/PriceOracle.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

/**
 * @title DeployWETHMarket
 * @notice Deploys aWETH and vdWETH tokens and initializes WETH reserve on existing Pool
 */
contract DeployWETHMarket is Script {
    // Existing deployed contract addresses on Sepolia
    address constant POOL_ADDRESS = 0xDA0F9F9c05D2A9B46561f628a64Eb29b656d29B3;
    address constant PRICE_ORACLE_ADDRESS = 0xdF7514C51674B6aA5728bc3D0c8c6c2F7d96AaC7;

    function run() external returns (AToken, VariableDebtToken) {
        // Get network config for WETH address
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getActiveNetworkConfig();

        console.log("Deploying WETH Market on chain ID:", block.chainid);
        console.log("WETH token address:", config.weth);

        vm.startBroadcast();

        address deployer = msg.sender;
        address treasury = deployer;
        console.log("Deployer address:", deployer);

        // Get existing contracts
        Pool pool = Pool(POOL_ADDRESS);
        PriceOracle priceOracle = PriceOracle(PRICE_ORACLE_ADDRESS);

        // =================== Deploy WETH Market ==================
        AToken aWETH = new AToken(
            POOL_ADDRESS,
            config.weth,
            treasury,
            "Aave WETH",
            "aWETH"
        );
        console.log("aWETH deployed at:", address(aWETH));

        VariableDebtToken vdWETH = new VariableDebtToken(
            POOL_ADDRESS,
            config.weth,
            "Variable Debt WETH",
            "vdWETH"
        );
        console.log("vdWETH deployed at:", address(vdWETH));

        // =============== Initialize WETH Reserve ======================
        // Parameters: ltv=7500 (75%), liquidationThreshold=8000 (80%), liquidationBonus=500 (5%)
        pool.initReserve(
            config.weth,
            address(aWETH),
            address(vdWETH),
            7500,  // LTV: 75%
            8000,  // Liquidation Threshold: 80%
            500    // Liquidation Bonus: 5%
        );
        console.log("WETH reserve initialized");

        // ============= Set WETH Price ========================
        // ETH price ~$2450 in 18 decimals
        priceOracle.setManualPrice(config.weth, 2450e18);
        console.log("WETH price set to $2450");

        vm.stopBroadcast();

        // ============= Log Summary ===============
        console.log("\n============== WETH MARKET DEPLOYMENT SUMMARY ================");
        console.log("Chain ID:", block.chainid);
        console.log("Pool:", POOL_ADDRESS);
        console.log("PriceOracle:", PRICE_ORACLE_ADDRESS);
        console.log("WETH:", config.weth);
        console.log("aWETH:", address(aWETH));
        console.log("vdWETH:", address(vdWETH));
        console.log("==============================================================\n");

        return (aWETH, vdWETH);
    }
}
