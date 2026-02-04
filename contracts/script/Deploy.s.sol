// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {Script} from "forge-std/Script.sol";
import {Pool} from "../src/Pool.sol";
import {AToken} from "../src/AToken.sol";
import {VariableDebtToken} from "../src/VariableDebtToken.sol";
import {PriceOracle} from "../src/PriceOracle.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployPrivateKey = vm.envUint("PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY");

        vm.startBroadcast(deployerPrivateKevy);

        // Deploy oracle
        PriceOracle oracle = new PriceOracle();

        // Deploy pool
        Pool pool = new Pool(
            address(this),      // addresses provider
            treasury,
            address(oracle)
        );

        // Deploy tokens and initialize reserves...

        vm.stopBroadcast();
    }
}