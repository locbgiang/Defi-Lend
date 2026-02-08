// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {Script, console} from "forge-std/Script.sol";
import {Pool} from "../src/Pool.sol";
import {AToken} from "../src/AToken.sol";
import {VariableDebtToken} from "../src/VariableDebtToken.sol";
import {PriceOracle} from "../src/PriceOracle.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

contract DeployPool is Script {
    function run() external {
        // Get network config
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getActiveNetworkConfig();

        address deployer = vm.addr(config.deployerKey);
        address treasury = deployer;

        console.log("Deploying on chain ID:", block.chainid);
        console.log("Deployer address:", deployer);

        vm.startBroadcast(config.deployerKey);

        // ==================== 1. Deploy Price Oracle ======================
        PriceOracle priceOracle = new PriceOracle();
        console.log("PriceOracle deployed at:", address(priceOracle));

        // =================== 2. Deploy Pool ========================
        Pool pool = new Pool(addressesProvider, treasury, address(priceOracle));
        console.log("Pool deployed at:", address(pool));

        // =================== 3. Deploy USDC Market ==================
        address usdcAddress = vm.envAddress("USDC_ADDRESS");

        AToken aUSDC = new AToken(
            address(pool),
            usdcAddress,
            treasury,
            "Aave USDC",
            "aUSDC"
        );
        console.log("aUSDC deployed at:", address(aUSDC));

        VariableDebtToken vdUSDC = new VariableDebtToken(
            address(pool),
            usdcAddress,
            "Variable Debt USDC",
            "vdUSDC"
        );
        console.log("vdUSDC deployed at:", address(vdUSDC));

        // =================== 4. Deploy DAI Market ==================
        address daiAddress = vm.envAddress("DAI_ADDRESS");

        AToken aDAI = new AToken(
            address(pool),
            daiAddress,
            treasury,
            "Aave DAI",
            "aDAI"
        );
        console.log("aDAI deployed at:", address(aDAI));

        VariableDebtToken vdDAI = new VariableDebtToken(
            address(pool),
            daiAddress,
            "Variable Debt DAI",
            "vdDAI"
        );
        console.log("vdDAI deployed at:", address(vdDAI));

        //=============== 5. Initialize Reserves ======================
        pool.initReserve(
            usdcAddress,
            address(aUSDC),
            address(vdUSDC),
            7500,
            8000,
            500
        );
        console.log("USDC reserve initialized");

        pool.initReserve(
            daiAddress,
            address(aDAI),
            address(vdDAI),
            7500,
            8000,
            500
        );
        console.log("DAI reserve initialized");

        //============= 6. Set Prices ========================
        priceOracle.setManualPrice(usdcAddress, 1e18);
        priceOracle.setManualPrice(daiAddress, 1e18);
        console.log("Prices set");

        vm.stopBroadcast();

        //============= Log Summary ===============
        console.log("\n============== DEPLOYMENT SUMMARY ================");
        console.log("Chain ID:", block.chainid);
        console.log("PriceOracle:", address(priceOracle));
        console.log("Pool:", address(pool));
        console.log("USDC", config.usdc);
        console.log("DAI", config.dai);
        console.log("aUSDC:", address(aUSDC));
        console.log("vdUSDC:", address(vdUSDC));
        console.log("aDAI:", address(aDAI));
        console.log("vdDAI:", address(vdDAI));
        console.log("==================================================\n");

        return (pool, priceOracle, helperConfig);
    }
}