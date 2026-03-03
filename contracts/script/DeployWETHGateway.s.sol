// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {Script, console} from "forge-std/Script.sol";
import {WETHGateway} from "../src/WETHGateway.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

/**
 * @title DeployWETHGateway
 * @notice Deploys the WETHGateway contract for native ETH deposits/withdrawals
 */
contract DeployWETHGateway is Script {
    // Existing deployed contract addresses on Sepolia
    address constant POOL_ADDRESS = 0xDA0F9F9c05D2A9B46561f628a64Eb29b656d29B3;
    address constant aWETH_ADDRESS = 0x64cDDef432871E9E376103F12c89e925936bC03d;

    function run() external returns (WETHGateway) {
        // Get network config for WETH address
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getActiveNetworkConfig();

        console.log("Deploying WETHGateway on chain ID:", block.chainid);
        console.log("WETH address:", config.weth);
        console.log("Pool address:", POOL_ADDRESS);
        console.log("aWETH address:", aWETH_ADDRESS);

        vm.startBroadcast();

        WETHGateway gateway = new WETHGateway(
            config.weth,
            POOL_ADDRESS,
            aWETH_ADDRESS
        );
        console.log("WETHGateway deployed at:", address(gateway));

        vm.stopBroadcast();

        // Log Summary
        console.log("\n============== WETH GATEWAY DEPLOYMENT SUMMARY ================");
        console.log("Chain ID:", block.chainid);
        console.log("WETHGateway:", address(gateway));
        console.log("WETH:", config.weth);
        console.log("Pool:", POOL_ADDRESS);
        console.log("aWETH:", aWETH_ADDRESS);
        console.log("===============================================================\n");

        return gateway;
    }
}
