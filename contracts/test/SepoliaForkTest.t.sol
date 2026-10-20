// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Test} from "forge-std/Test.sol";
import {Pool} from "../src/Pool.sol";
import {AToken} from "../src/AToken.sol";
import {VariableDebtToken} from "../src/VariableDebtToken.sol";
import {WETHGateway} from "../src/WETHGateway.sol";
import {PriceOracle} from "../src/PriceOracle.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * Runs the full lending flow on a local fork of Sepolia: real USDC/DAI/WETH tokens and
 * real Chainlink feeds, with freshly deployed protocol contracts. Nothing touches the live chain.
 * Skipped when SEPOLIA_RPC_URL is not set.
 */
contract SepoliaForkTest is Test {
    address constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    address constant DAI = 0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357;
    address constant WETH = 0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c;

    address constant ETH_USD_FEED = 0x694AA1769357215DE4FAC081bf1f309aDC325306;
    address constant USDC_USD_FEED = 0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E;
    address constant DAI_USD_FEED = 0x14866185B1962B63C3Ea9E03Bc1da838bab34C19;

    Pool pool;
    PriceOracle oracle;
    WETHGateway gateway;
    AToken aWETH;
    VariableDebtToken vdDAI;
    VariableDebtToken vdUSDC;

    address lp = address(0xA11CE);
    address borrower = address(0xB0B);
    address liquidator = address(0x11C);
    address treasury = address(0x2);

    function setUp() public {
        string memory rpc = vm.envOr("SEPOLIA_RPC_URL", string(""));
        if (bytes(rpc).length == 0) vm.skip(true);
        vm.createSelectFork(rpc);

        oracle = new PriceOracle();
        oracle.setAssetPriceFeed(WETH, ETH_USD_FEED);
        oracle.setAssetPriceFeed(USDC, USDC_USD_FEED);
        oracle.setAssetPriceFeed(DAI, DAI_USD_FEED);
        _refreshFeed(ETH_USD_FEED, 0);
        _refreshFeed(USDC_USD_FEED, 0);
        _refreshFeed(DAI_USD_FEED, 0);

        pool = new Pool(address(this), treasury, address(oracle));

        AToken aUSDC = new AToken(address(pool), USDC, treasury, "Aave USDC", "aUSDC");
        vdUSDC = new VariableDebtToken(address(pool), USDC, "Variable Debt USDC", "vdUSDC");
        pool.initReserve(USDC, address(aUSDC), address(vdUSDC), 7500, 8000, 500);

        AToken aDAI = new AToken(address(pool), DAI, treasury, "Aave DAI", "aDAI");
        vdDAI = new VariableDebtToken(address(pool), DAI, "Variable Debt DAI", "vdDAI");
        pool.initReserve(DAI, address(aDAI), address(vdDAI), 7500, 8000, 500);

        aWETH = new AToken(address(pool), WETH, treasury, "Aave WETH", "aWETH");
        VariableDebtToken vdWETH = new VariableDebtToken(address(pool), WETH, "Variable Debt WETH", "vdWETH");
        pool.initReserve(WETH, address(aWETH), address(vdWETH), 8000, 8250, 500);

        gateway = new WETHGateway(WETH, address(pool), address(aWETH));

        // LP provides borrowable liquidity
        deal(DAI, lp, 10_000e18);
        deal(USDC, lp, 5_000e6);
        vm.startPrank(lp);
        IERC20(DAI).approve(address(pool), type(uint256).max);
        IERC20(USDC).approve(address(pool), type(uint256).max);
        pool.supply(DAI, 10_000e18, lp);
        pool.supply(USDC, 5_000e6, lp);
        vm.stopPrank();

        // borrower deposits 1 ETH and borrows 1000 DAI + 500 USDC
        vm.deal(borrower, 10 ether);
        vm.startPrank(borrower);
        gateway.depositETH{value: 1 ether}();
        pool.borrow(DAI, 1_000e18, borrower);
        pool.borrow(USDC, 500e6, borrower);
        vm.stopPrank();
    }

    // Keeps the real Chainlink answer but makes it fresh (stablecoin feeds update ~daily).
    // answerOverride == 0 keeps the real answer.
    function _refreshFeed(address feed, int256 answerOverride) internal {
        (bool ok, bytes memory data) = feed.staticcall(abi.encodeWithSignature("latestRoundData()"));
        require(ok, "feed call failed");
        (uint80 roundId, int256 answer,,,) = abi.decode(data, (uint80, int256, uint256, uint256, uint80));
        if (answerOverride != 0) answer = answerOverride;
        vm.mockCall(
            feed,
            abi.encodeWithSignature("latestRoundData()"),
            abi.encode(roundId, answer, block.timestamp, block.timestamp, roundId)
        );
    }

    function testRealTokenDecimalsAndPrices() public view {
        assertEq(IERC20Decimals(USDC).decimals(), 6);
        assertEq(IERC20Decimals(DAI).decimals(), 18);
        assertGt(oracle.getAssetPrice(WETH), 100e18, "ETH should be priced in 18 decimals");
        assertApproxEqRel(oracle.getAssetPrice(USDC), 1e18, 0.05e18);
        assertApproxEqRel(oracle.getAssetPrice(DAI), 1e18, 0.05e18);
    }

    function testBorrowedPositionIsHealthy() public view {
        (uint256 collateral, uint256 debt,,,, uint256 hf) = pool.getUserAccountData(borrower);
        assertGt(collateral, 0);
        assertApproxEqRel(debt, 1_500e18, 0.05e18);
        assertGt(hf, 1e18);
        assertEq(IERC20(USDC).balanceOf(borrower), 500e6);
        assertEq(IERC20(DAI).balanceOf(borrower), 1_000e18);
    }

    function testRepayReducesDebt() public {
        vm.startPrank(borrower);
        IERC20(USDC).approve(address(pool), type(uint256).max);
        pool.repay(USDC, 200e6, borrower);
        vm.stopPrank();

        assertEq(vdUSDC.balanceOf(borrower), 300e6);
    }

    function testWithdrawETHThroughGatewayWhenHealthy() public {
        uint256 ethBefore = borrower.balance;
        vm.startPrank(borrower);
        aWETH.approve(address(gateway), type(uint256).max);
        gateway.withdrawETH(0.1 ether);
        vm.stopPrank();

        assertEq(borrower.balance - ethBefore, 0.1 ether);
    }

    function testWithdrawETHRevertsWhenItWouldMakePositionUnhealthy() public {
        vm.startPrank(borrower);
        aWETH.approve(address(gateway), type(uint256).max);
        vm.expectRevert("Health factor too low");
        gateway.withdrawETH(0.7 ether);
        vm.stopPrank();
    }

    function testATransferGuardOnRealDeployment() public {
        vm.startPrank(borrower);
        vm.expectRevert("Health factor too low");
        aWETH.transfer(lp, 0.7 ether);

        aWETH.transfer(lp, 0.05 ether);
        vm.stopPrank();

        assertEq(aWETH.balanceOf(lp), 0.05 ether);
    }

    function testLiquidationAfterEthPriceDrop() public {
        // ETH falls from ~$2450 to $1000
        _refreshFeed(ETH_USD_FEED, 1000e8);

        (,,,,, uint256 hf) = pool.getUserAccountData(borrower);
        assertLt(hf, 1e18, "borrower should be liquidatable");

        deal(DAI, liquidator, 1_000e18);
        vm.startPrank(liquidator);
        IERC20(DAI).approve(address(pool), type(uint256).max);
        pool.liquidationCall(WETH, DAI, borrower, 500e18, false);
        vm.stopPrank();

        assertLt(vdDAI.balanceOf(borrower), 1_000e18, "debt should shrink");
        assertLt(aWETH.balanceOf(borrower), 1 ether, "collateral should be seized");
        assertGt(IERC20(WETH).balanceOf(liquidator), 0, "liquidator receives WETH");
    }
}

interface IERC20Decimals {
    function decimals() external view returns (uint8);
}
