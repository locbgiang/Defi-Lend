// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Test, console} from "forge-std/Test.sol";
import {DeployPool} from "../script/DeployPool.s.sol";
import {Pool} from "../src/Pool.sol";
import {PriceOracle} from "../src/PriceOracle.sol";
import {HelperConfig} from "../script/HelperConfig.s.sol";

contract DeployPoolTest is Test {
    DeployPool deployer;
    Pool pool;
    PriceOracle priceOracle;
    HelperConfig helperConfig;
    
    function setUp() public {
        deployer = new DeployPool();
        (pool, priceOracle, helperConfig) = deployer.run();
    }

    // =============================== Deployment Tests =============================

    function testPoolDeployed() public view {
        assertTrue(address(pool) != address(0), "Pool should be deployed");
    }
}