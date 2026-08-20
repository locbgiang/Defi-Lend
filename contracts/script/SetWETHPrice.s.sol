// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {Script, console} from "forge-std/Script.sol";
import {PriceOracle} from "../src/PriceOracle.sol";

/**
 * @title SetWETHPrice
 * @notice Sets the WETH price in the PriceOracle
 * @dev Run: forge script script/SetWETHPrice.s.sol --rpc-url sepolia --account deployer --broadcast
 */
contract SetWETHPrice is Script {
    // Deployed PriceOracle on Sepolia
    address constant PRICE_ORACLE = 0xdF7514C51674B6aA5728bc3D0c8c6c2F7d96AaC7;
    // WETH token on Sepolia
    address constant WETH = 0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c;
    // WETH price: $2450 in 18 decimals
    uint256 constant WETH_PRICE = 2450e18;

    function run() external {
        vm.startBroadcast();

        PriceOracle oracle = PriceOracle(PRICE_ORACLE);

        // Set WETH price to $2,450
        oracle.setManualPrice(WETH, WETH_PRICE);
        console.log("WETH price set to $2,450");

        // Verify prices are set
        uint256 usdcPrice = oracle.getAssetPrice(0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238);
        uint256 daiPrice = oracle.getAssetPrice(0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357);
        uint256 wethPrice = oracle.getAssetPrice(WETH);

        console.log("\n============== PRICE SUMMARY ================");
        console.log("USDC price:", usdcPrice);
        console.log("DAI price:", daiPrice);
        console.log("WETH price:", wethPrice);
        console.log("=============================================\n");

        vm.stopBroadcast();
    }
}
