// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Test, console} from "forge-std/Test.sol";
import {DeployPool} from "../script/DeployPool.s.sol";
import {Pool} from "../src/Pool.sol";
import {PriceOracle} from "../src/PriceOracle.sol";
import {HelperConfig} from "../script/HelperConfig.s.sol";

import {AToken} from "../src/AToken.sol";
import {VariableDebtToken} from "../src/VariableDebtToken.sol";

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

    // ============================== Price Tests ====================================

    function testUsdcPriceSet () public view {
        HelperConfig.NetworkConfig memory config = helperConfig.getActiveNetworkConfig();
        uint256 price = priceOracle.getAssetPrice(config.usdc);
        assertEq(price, 1e18, "USDC price should be $1");
    }

    function testDaiPriceSet () public view {
        HelperConfig.NetworkConfig memory config = helperConfig.getActiveNetworkConfig();
        uint256 price = priceOracle.getAssetPrice(config.dai);
        assertEq(price, 1e18, "DAI price should be $1");
    }

    // ============================= AToken Tests ====================================

    function testATokenPoolAddress () public view {
        HelperConfig.NetworkConfig memory config = helperConfig.getActiveNetworkConfig();

        (address aTokenAddress, , , , , ) = pool.reserves(config.usdc);
        AToken aToken = AToken(aTokenAddress);

        assertEq(aToken.POOL(), address(pool), "AToken should point to Pool"); 
    }

    function testATokenUnderlyingAsset () public view {
        HelperConfig.NetworkConfig memory config = helperConfig.getActiveNetworkConfig();

        (, address aTokenAddress, , , , ) = pool.reserves(config.usdc);
        VariableDebtToken aToken = VariableDebtToken(aTokenAddress);

        assertEq(address(aToken.UNDERLYING_ASSET()), config.usdc, "AToken underlying should be USDC");
    }

    // =============================== DebtToken Tests =================================

    function testDebtTokenPoolAddress () public view {
        HelperConfig.NetworkConfig memory config = helperConfig.getActiveNetworkConfig();

        (, address vdTokenAddress, , , ,) = pool.reserves(config.usdc);
        VariableDebtToken vdToken = VariableDebtToken(vdTokenAddress);

        assertEq(vdToken.POOL(), address(pool), "DebtToken should point to Pool");
    }

    function testDebtTokenUnderlyingAsset () public view {
        HelperConfig.NetworkConfig memory config = helperConfig.getActiveNetworkConfig();

        (, address vdTokenAddress, , , , ) = pool.reserves(config.usdc);
        VariableDebtToken vdToken = VariableDebtToken(vdTokenAddress);

        assertEq(address(vdToken.UNDERLYING_ASSET()), config.usdc, "DebtToken underlying should be USDC");
    }

    // ============================= Integration Test ==================================

    function testFullDeploymentIntegration() public {
        HelperConfig.NetworkConfig memory config = helperConfig.getActiveNetworkConfig();

        // Get USDC reserve
        (
            address aUsdcAddress,
            address vdUsdcAddress,
            ,,,
            bool usdcActive
        ) = pool.reserves(config.usdc);

        // Get DAI reserve
        (
            address aDaiAddress,
            address vdDaiAddress,
            ,,,
            bool daiActive
        ) = pool.reserves(config.dai);

        // verify all contracts are deployed and connected
        assertTrue(usdcActive && daiActive, "Both reserves should be active");

        // verify ATokens point to correct pool
        assertEq(AToken(aUsdcAddress).POOL(), address(pool));
        assertEq(AToken(aDaiAddress).POOL(), address(pool));

        // verify DebtTokens point to correct pool
        assertEq(VariableDebtToken(vdUsdcAddress).POOL(), address(pool));
        assertEq(VariableDebtToken(vdDaiAddress).POOL(), address(pool));

        // verify prices are set
        assertEq(priceOracle.getAssetPrice(config.usdc), 1e18);
        assertEq(priceOracle.getAssetPrice(config.dai), 1e18);

        console.log("Full deployment integration test passed");
    }
}