// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {Script, console} from "forge-std/Script.sol";
import {Pool} from "../src/contracts/protocol/pool/Pool.sol";
import {AToken} from "../src/contracts/protocol/tokenization/AToken.sol";
import {VariableDebtToken} from "../src/contracts/protocol/tokenization/VariableDebtToken.sol";
import {PriceOracle} from "../src/contracts/protocol/oracle/PriceOracle.sol";

contract DeployPool is Script {
    function run() external {
        // Load deployer prive key from environment 
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying with address:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // ==================== 1. Deploy Price Oracle ======================
        PriceOracle priceOracle = new PriceOracle();
        console.log("PriceOracle deployed at:", address(priceOracle));

        // =================== 2. Deploy Pool ========================
        address addressesProvider = deployer;   // Simplified for MVP
        address treasury = deployer;            // Treasury receives fees

        Pool pool = new Pool(addressesProvider, treasury, address(priceOracle));
        console.log("Pool deployed at:", address(pool));

        // =================== 3. Deploy USDC Market ==================
        // For testnet, you'll use mock tokens or testnet USDC
        // Replace with actual USDC address on mainnet 
        address usdcAddress = vm.envAddress("USDC_ADDRESS");

        AToken aUSDC = new AToken(
            address(pool),
            usdcAddress,
            treasury,
            "Aave UDSC",
            "aUSDC"
        );
        console.log("aUSDC deployed at:", address(aUSDC));

        VariableDebtToken vdUSDC = new VariableDebtToken(
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
        // USDC: 75% LTV, 80% liquidation threshold, 5% bonus
        pool.initReserve(
            usdcAddress,
            address(aUSDC),
            address(vdUSDC),
            7500,               // ltv: 75%
            8000,               // liquidationThreshold: 80%
            500                 // liquidationBonus: 5%
        );
        console.log("USDC reserve initialized");

        // DAI: 75% LTV, 80% liquidation threshold, 5% bonus
        pool.initReserve(
            daiAddress,
            address(aDAI),
            address(vdDAI),
            7500,               // ltv: 75%
            8000,               // liquidationThreshold: 80%
            500                 // liquidationBonus: 5%
        );
        console.log("DAI reserve initialized");

        //============= 6. Set Prices ========================
        priceOracle.setManualPrice(usdcAddress, 1e18);      // $1.00
        priceOracle.setManualPrice(daiAddress, 1e18);       // $1.00
        console.log("Prices set");

        vm.stopBroadcast();

        //============= Log Summary ===============
        console.log("\n============== DEPLOYMENT SUMMARY ================");
        console.log("PriceOracle", address(priceOracle));
        console.log("Pool:", address(pool));
        console.log("aUSDC:", address(aUSDC));
        console.log("vdUSDC:", address(vdUSDC));
        console.log("aDAI:", address(aDAI));
        console.log("vdDAI:", address(vdDAI));
        console.log("==================================================\n");
    }
}