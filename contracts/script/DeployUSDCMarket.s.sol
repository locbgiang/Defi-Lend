// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {Script, console} from "forge-std/Script.sol";
import {Pool} from "../src/Pool.sol";
import {AToken} from "../src/AToken.sol";
import {VariableDebtToken} from "../src/VariableDebtToken.sol";
import {PriceOracle} from "../src/PriceOracle.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

/**
 * @title DeployUSDCMarket
 * @notice Deploys new aUSDC/vdUSDC tokens for the faucet-backed USDC
 *         (0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238) and initializes
 *         the reserve on the already-deployed Pool.
 * @dev The Pool's existing reserve for the OLD USDC address
 *      (0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8) is left untouched —
 *      reserves are keyed per-asset, so this simply adds a new, separate
 *      reserve entry for the new USDC token. Old aUSDC/vdUSDC/reserve
 *      remain valid for anyone still holding the old token.
 */
contract DeployUSDCMarket is Script {
    // Existing deployed contract addresses on Sepolia
    address constant POOL_ADDRESS = 0xDA0F9F9c05D2A9B46561f628a64Eb29b656d29B3;
    address constant PRICE_ORACLE_ADDRESS = 0xdF7514C51674B6aA5728bc3D0c8c6c2F7d96AaC7;

    // The faucet-backed USDC token address
    address constant NEW_USDC_ADDRESS = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;

    function run() external returns (AToken, VariableDebtToken) {
        console.log("Deploying USDC Market on chain ID:", block.chainid);
        console.log("USDC token address:", NEW_USDC_ADDRESS);

        vm.startBroadcast();

        address deployer = msg.sender;
        address treasury = deployer;
        console.log("Deployer address:", deployer);

        // Get existing contracts
        Pool pool = Pool(POOL_ADDRESS);
        PriceOracle priceOracle = PriceOracle(PRICE_ORACLE_ADDRESS);

        // =================== Deploy USDC Market ==================
        AToken aUSDC = new AToken(
            POOL_ADDRESS,
            NEW_USDC_ADDRESS,
            treasury,
            "Aave USDC",
            "aUSDC"
        );
        console.log("aUSDC deployed at:", address(aUSDC));

        VariableDebtToken vdUSDC = new VariableDebtToken(
            POOL_ADDRESS,
            NEW_USDC_ADDRESS,
            "Variable Debt USDC",
            "vdUSDC"
        );
        console.log("vdUSDC deployed at:", address(vdUSDC));

        // =============== Initialize USDC Reserve ======================
        // Parameters: ltv=7500 (75%), liquidationThreshold=8000 (80%), liquidationBonus=500 (5%)
        pool.initReserve(
            NEW_USDC_ADDRESS,
            address(aUSDC),
            address(vdUSDC),
            7500,  // LTV: 75%
            8000,  // Liquidation Threshold: 80%
            500    // Liquidation Bonus: 5%
        );
        console.log("USDC reserve initialized");

        // ============= Set USDC Price ========================
        // USDC price = $1.00 in 18 decimals
        priceOracle.setManualPrice(NEW_USDC_ADDRESS, 1e18);
        console.log("USDC price set to $1.00");

        vm.stopBroadcast();

        // ============= Log Summary ===============
        console.log("\n============== USDC MARKET DEPLOYMENT SUMMARY ================");
        console.log("Chain ID:", block.chainid);
        console.log("Pool:", POOL_ADDRESS);
        console.log("PriceOracle:", PRICE_ORACLE_ADDRESS);
        console.log("USDC:", NEW_USDC_ADDRESS);
        console.log("aUSDC:", address(aUSDC));
        console.log("vdUSDC:", address(vdUSDC));
        console.log("==============================================================\n");

        return (aUSDC, vdUSDC);
    }
}
