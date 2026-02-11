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

    function testPoolDeployed () public view {
        assertTrue(address(pool) != address(0), "Pool should be deployed");
    }

    function testOracleDeployed() public view {
        assertTrue(address(priceOracle) != address(0), "Oracle should be deployed");
    }

    function testHelperConfigDeployed() public view {
        assertTrue(address(helperConfig) != address(0), "HelperConfig should be deployed");
    }

    // ============================= Reserve Tests =================================

    function testUsdcReserveInitialized () public view {
        HelperConfig.NetworkConfig memory config = helperConfig.getActiveNetworkConfig();

        (
            address aTokenAddress,
            address variableDebtTokenAddress,
            uint256 liquidationThreshold,
            uint256 liquidationBonus,
            uint256 ltv,
            bool isActive
        ) = pool.reserves(config.usdc);

        assertTrue(isActive, "DAI reserve should be active");
        assertTrue(aTokenAddress != address(0), "aDAI should be deployed");
        assertTrue(variableDebtTokenAddress != address(0), "vdDAI should be deployed");
        assertEq(ltv, 7500, "LTV should be 75%");
        assertEq(liquidationThreshold, 8000, "Liquidation threshold should be 80%");
        assertEq(liquidationBonus, 500, "Liquidation bonus should be 5%");
    }
}