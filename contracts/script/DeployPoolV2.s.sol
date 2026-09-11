// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Script, console} from "forge-std/Script.sol";
import {Pool} from "../src/Pool.sol";
import {AToken} from "../src/AToken.sol";
import {VariableDebtToken} from "../src/VariableDebtToken.sol";
import {WETHGateway} from "../src/WETHGateway.sol";

contract DeployPoolV2 is Script {
    // existing infra we keep reusing
    address constant PRICE_ORACLE = 0xdF7514C51674B6aA5728bc3D0c8c6c2F7d96AaC7;
    address constant TREASURY = 0x352391E0B031D7a6E82C85fb8096fb3FCC347253; // deployer as treasury

    address constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    address constant DAI = 0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357;
    address constant WETH = 0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c;

    function run() external {
        vm.startBroadcast();

        address deployer = msg.sender;

        Pool pool = new Pool(deployer, TREASURY, PRICE_ORACLE);
        console.log("New Pool deployed at:", address(pool));

        // USDC market
        AToken aUSDC = new AToken(address(pool), USDC, TREASURY, "Aave USDC", "aUSDC");
        VariableDebtToken vdUSDC = new VariableDebtToken(address(pool), USDC, "Variable Debt USDC", "vdUSDC");
        pool.initReserve(USDC, address(aUSDC), address(vdUSDC), 7500, 8000, 500);
        console.log("aUSDC:", address(aUSDC));
        console.log("vdUSDC:", address(vdUSDC));

        // DAI market
        AToken aDAI = new AToken(address(pool), DAI, TREASURY, "Aave DAI", "aDAI");
        VariableDebtToken vdDAI = new VariableDebtToken(address(pool), DAI, "Variable Debt DAI", "vdDAI");
        pool.initReserve(DAI, address(aDAI), address(vdDAI), 7500, 8000, 500);
        console.log("aDAI:", address(aDAI));
        console.log("vdDAI:", address(vdDAI));

        // WETH market
        AToken aWETH = new AToken(address(pool), WETH, TREASURY, "Aave WETH", "aWETH");
        VariableDebtToken vdWETH = new VariableDebtToken(address(pool), WETH, "Variable Debt WETH", "vdWETH");
        pool.initReserve(WETH, address(aWETH), address(vdWETH), 8000, 8250, 500);
        console.log("aWETH:", address(aWETH));
        console.log("vdWETH:", address(vdWETH));

        // WETH Gateway
        WETHGateway gateway = new WETHGateway(WETH, address(pool), address(aWETH));
        console.log("WETHGateway:", address(gateway));

        vm.stopBroadcast();
    }
}