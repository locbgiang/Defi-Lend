// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {Test} from "forge-std/Test.sol";
import {Pool} from "../src/contracts/protocol/pool/Pool.sol";
import {AToken} from "../src/contracts/protocol/tokenization/AToken.sol";
import {VariableDebtToken} from "../src/contracts/protocol/tokenization/VariableDebtToken.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {PriceOracle} from "../src/contracts/protocol/oracle/PriceOracle.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract PoolTest is Test {
    Pool public pool;
    MockERC20 public usdc;
    MockERC20 public dai;
    AToken public aUSDC;
    AToken public aDAI;
    VariableDebtToken public vdUSDC;
    VariableDebtToken public vdDAI;

    address public addressesProvider = address(0x1);
    address public treasury = address(0x2);
    address public user1 = address(0x3);
    address public user2 = address(0x4);

    // events (copy from Pool.sol)
    event ReserveInitialized(
        address indexed asset,
        address indexed aToken,
        address indexed variableDebtToken,
        uint256 ltv,
        uint256 liquidationThreshold,
        uint256 liquidationBonus
    );
    event Supply(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount);
    event Withdraw(address indexed reserve, address indexed user, address indexed to, uint256 amount);
    event Borrow(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount);
    event Repay(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount);

    event LiquidationCall(
        address indexed collateralAsset,
        address indexed debtAsset,
        address indexed user,
        uint256 debtToCover,
        uint256 liquidatedCollateralAmount,
        address liquidator,
        bool receiveAToken
    );

    // store oracle reference for price manipulation
    PriceOracle public priceOracle;

    function setUp() public {
        // deploy mock tokens FIRST (was after pool/oracle before)
        usdc = new MockERC20("USD Coin", "USDC");
        dai  = new MockERC20("Dai Stablecoin", "DAI");

        // deploy price oracle and set stablecoin prices
        priceOracle = new PriceOracle();
        priceOracle.setManualPrice(address(usdc), 1e18);
        priceOracle.setManualPrice(address(dai), 1e18);

        // deploy pool with oracle address
        pool = new Pool(addressesProvider, treasury, address(priceOracle));

        // deploy aTokens
        aUSDC = new AToken(
            address(pool),
            address(usdc),
            treasury,
            "Aave USDC",
            "aUSDC"
        );

        aDAI = new AToken(
            address(pool),
            address(dai),
            treasury,
            "Aave DAI",
            "aDAI"
        );

        // deploy debt tokens
        vdUSDC = new VariableDebtToken(
            address(pool),
            address(usdc),
            "Variable Debt USDC",
            "vdUSDC"
        );

        vdDAI = new VariableDebtToken(
            address(pool),
            address(dai),
            "Variable Debt DAI",
            "vdDAI"
        );

        // initialize reserves
        pool.initReserve(
            address(usdc),
            address(aUSDC),
            address(vdUSDC),
            7500,   // 75% LTV
            8000,   // 80% liquidation threshold
            500     // 5% liquidation bonus
        );

        pool.initReserve(
            address(dai),
            address(aDAI),
            address(vdDAI),
            7500,
            8000,
            500
        );

        // mint tokens to users
        usdc.mint(user1, 10000e18);
        usdc.mint(user2, 10000e18);
        dai.mint(user1, 10000e18);
        dai.mint(user2, 10000e18);
    }

    // ================= constructor tests =========================

    function testConstructor() public view {
        assertEq(pool.ADDRESSES_PROVIDER(), addressesProvider);
        assertEq(pool.treasury(), treasury);
        assertEq(pool.owner(), address(this));
    }

    function testConstructorRevertsZeroAddressProvider() public {
        vm.expectRevert("Invalid addresses provider");
        new Pool(address(0), treasury, address(0x1)); // pass dummy oracle address
    }

    function testConstructorRevertsZeroTreasury() public {
        vm.expectRevert("Invalid treasury");
        new Pool(addressesProvider, address(0), address(0x1)); // pass dummy oracle address
    }

    // ================== initReserves Tests ===========================

    function testIniReserve() public {
        MockERC20 weth = new MockERC20("Wrapped Ether", "WETH");
        AToken aWETH = new AToken(address(pool), address(weth), treasury, "Aave WETH", "aWETH");
        VariableDebtToken vdWETH = new VariableDebtToken(address(pool), address(weth), "Variable Debt WETH", "vdWETH");

        vm.expectEmit(true, true, true, true);
        emit ReserveInitialized(address(weth), address(aWETH), address(vdWETH), 7500, 8000, 500);

        pool.initReserve(
            address(weth),
            address(aWETH),
            address(vdWETH),
            7500,
            8000,
            500
        );

        (
            address aTokenAddress,
            address debtTokenAddress,
            uint256 liquidationThreshold,
            uint256 liquidationBonus,
            uint256 ltv,
            bool isActive
        ) = pool.reserves(address(weth));

        assertEq(aTokenAddress, address(aWETH));
        assertEq(debtTokenAddress, address(vdWETH));
        assertEq(liquidationThreshold, 8000);
        assertEq(liquidationBonus, 500);
        assertEq(ltv, 7500);
        assertTrue(isActive);
    }

    function tesInitReserveOnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert("Caller is not owner");
        pool.initReserve(address(0x999), address(0x888), address(0x777), 7500, 8000, 500);
    }

    function testInitReserveRevertsAlreadyInitialized() public {
        vm.expectRevert("Reserve already initialized");
        pool.initReserve(
            address(usdc),
            address(aUSDC),
            address(vdUSDC),
            7500,
            8000,
            500
        );
    }

    // ================ supply tests ========================

    function testSupply() public {
        uint256 supplyAmount = 1000e18;
        
        vm.startPrank(user1);
        usdc.approve(address(pool), supplyAmount);

        vm.expectEmit(true, true, true, true);
        emit Supply(address(usdc), user1, user1, supplyAmount);

        pool.supply(address(usdc), supplyAmount, user1);
        vm.stopPrank();

        assertEq(aUSDC.balanceOf(user1), supplyAmount);
        assertEq(usdc.balanceOf(user1), 10000e18 - supplyAmount);
        assertEq(usdc.balanceOf(address(aUSDC)), supplyAmount);
    }

    function testSupplyOnBehalfOf() public {
        uint256 supplyAmount = 500e18;

        vm.startPrank(user1);
        usdc.approve(address(pool), supplyAmount);
        pool.supply(address(usdc), supplyAmount, user2);
        vm.stopPrank();

        // user1 paid, user2 received aTokens
        assertEq(usdc.balanceOf(user1), 10000e18 - supplyAmount);
        assertEq(aUSDC.balanceOf(user1), 0);
        assertEq(aUSDC.balanceOf(user2), supplyAmount);
    }

    function testSupplyRevertsZeroAmount() public {
        vm.prank(user1);
        vm.expectRevert("Amount must be greater than 0");
        pool.supply(address(usdc), 0, user1);
    }

    function testSupplyRevertsInactiveReserve() public {
        vm.prank(user1);
        vm.expectRevert("Reserve not active");
        pool.supply(address(0x999), 100, user1);
    }

    function testSupplyRevertsZeroOnBehalfOf() public {
        vm.startPrank(user1);
        usdc.approve(address(pool), 100);
        vm.expectRevert("Invalid onBehalfOf address");
        pool.supply(address(usdc), 100, address(0));
        vm.stopPrank();
    }

    // ===================== Withdraw Tests ============================

    function testWithdraw() public {
        uint256 supplyAmount = 1000e18;
        uint256 withdrawAmount = 500e18;

        // supply first
        vm.startPrank(user1);
        usdc.approve(address(pool), supplyAmount);
        pool.supply(address(usdc), supplyAmount, user1);

        // withdraw
        vm.expectEmit(true, true, true, true);
        emit Withdraw(address(usdc), user1, user1, withdrawAmount);

        pool.withdraw(address(usdc), withdrawAmount, user1);
        vm.stopPrank();

        assertEq(aUSDC.balanceOf(user1), supplyAmount - withdrawAmount);
        assertEq(usdc.balanceOf(user1), 10000e18 - supplyAmount + withdrawAmount);
        assertEq(usdc.balanceOf(address(aUSDC)), supplyAmount - withdrawAmount);
    }

    function testWithdrawToAddress() public {
        uint256 supplyAmount = 1000e18;
        uint256 withdrawAmount = 300e18;

        // user1 supplies
        vm.startPrank(user1);
        usdc.approve(address(pool), supplyAmount);
        pool.supply(address(usdc), supplyAmount, user1);

        // user1 withdraws to user2
        pool.withdraw(address(usdc), withdrawAmount, user2);
        vm.stopPrank();

        // user1 loses aTokens, user2 gets underlying
        assertEq(aUSDC.balanceOf(user1), supplyAmount - withdrawAmount);
        assertEq(usdc.balanceOf(user1), 10000e18 - supplyAmount);
        assertEq(usdc.balanceOf(user2), 10000e18 + withdrawAmount);
    }

    function testWithdrawRevertsZeroAmount() public {
        vm.prank(user1);
        vm.expectRevert("Amount must be greater than 0");
        pool.withdraw(address(usdc), 0, user1);
    }

    function testWithdrawRevertsInactiveReserve() public {
        vm.prank(user1);
        vm.expectRevert("Reserve not active");
        pool.withdraw(address(0x999), 100, user1);
    }

    function testWithdrawRevertsZeroToAddress() public {
        vm.prank(user1);
        vm.expectRevert("Invalid to address");
        pool.withdraw(address(usdc), 100, address(0));
    }

    function testWithdrawRevertsInsufficientBalance() public {
        vm.startPrank(user1);
        usdc.approve(address(pool), 100e18);
        pool.supply(address(usdc), 100e18, user1);

        // try to withdraw more than supplied
        vm.expectRevert("Insufficient balance");
        pool.withdraw(address(usdc), 200e18, user1);
        vm.stopPrank();
    }

    // ======================== Borrow Tests ============================
    
    function testBorrow() public {
        uint256 supplyAmount = 1000e18;
        uint256 borrowAmount = 300e18;

        // user1 supplies USDC as collateral
        vm.startPrank(user1);
        usdc.approve(address(pool), supplyAmount);
        pool.supply(address(usdc), supplyAmount, user1);
        vm.stopPrank();

        // user2 supplies DAI (for liquidity)
        vm.startPrank(user2);
        dai.approve(address(pool), 2000e18);
        pool.supply(address(dai), 2000e18, user2);

        // user1 borrow DAI
        vm.startPrank(user1);
        vm.expectEmit(true, true, true, true);
        emit Borrow(address(dai), user1, user1, borrowAmount);

        pool.borrow(address(dai), borrowAmount, user1);
        vm.stopPrank();

        assertEq(vdDAI.balanceOf(user1), borrowAmount);
        assertEq(dai.balanceOf(user1), 10000e18 + borrowAmount);
    }

    function testBorrowOnBehalfOf() public {
        uint256 supplyAmount = 1000e18;
        uint256 borrowAmount = 200e18;

        // user1 supplies USDC as collateral
        vm.startPrank(user1);
        usdc.approve(address(pool), supplyAmount);
        pool.supply(address(usdc), supplyAmount, user1);
        vm.stopPrank();

        // user2 supplies DAI (for liquidity)
        vm.startPrank(user2);
        dai.approve(address(pool), 2000e18);
        pool.supply(address(dai), 2000e18, user2);
        vm.stopPrank();

        // user2 borrows on behalf of user1
        vm.startPrank(user2);
        pool.borrow(address(dai), borrowAmount, user1);
        vm.stopPrank();

        // user1 gets the debt, user2 gets the borrowed tokens
        assertEq(vdDAI.balanceOf(user1), borrowAmount); // user1 has debt
        assertEq(vdDAI.balanceOf(user2), 0); // user2 has no debt
        assertEq(dai.balanceOf(user2), 10000e18 - 2000e18 + borrowAmount); // user2 gets DAI
    }

    function testBorrowRevertsZeroAmount() public {
        vm.prank(user1);
        vm.expectRevert("Amount must be greater than 0");
        pool.borrow(address(dai), 0, user1);
    }

    function testBorrowRevertsInactiveReserve() public {
        vm.prank(user1);
        vm.expectRevert("Reserve not active");
        pool.borrow(address(0x999), 100, user1);
    }

    function testBorrowRevertsInsufficientLiquidity() public {
        uint256 supplyAmount = 1000e18;
        uint256 borrowAmount = 500e18;

        // user1 supplies USDC
        vm.startPrank(user1);
        usdc.approve(address(pool), supplyAmount);
        pool.supply(address(usdc), supplyAmount, user1);
        vm.stopPrank();

        // try to borrow DAI when no DAI liquidity exists
        vm.startPrank(user1);
        vm.expectRevert();      // will fail in transferUnderlying due to insufficient balance
        pool.borrow(address(dai), borrowAmount, user1);
        vm.stopPrank();
    }

    // ============================= Repay Tests ========================
    
    function testRepay() public {
        uint256 supplyAmount = 1000e18;
        uint256 borrowAmount = 300e18;
        uint256 repayAmount = 150e18;

        // Setup: supply and borrow
        vm.startPrank(user1);
        usdc.approve(address(pool), supplyAmount);
        pool.supply(address(usdc), supplyAmount, user1);
        vm.stopPrank();

        vm.startPrank(user2);
        dai.approve(address(pool), 2000e18);
        pool.supply(address(dai), 2000e18, user2);
        vm.stopPrank();

        vm.startPrank(user1);
        pool.borrow(address(dai), borrowAmount, user1);

        // Repay partial debt
        dai.approve(address(pool), repayAmount);

        vm.expectEmit(true, true, true, true);
        emit Repay(address(dai), user1, user1, repayAmount);
        
        uint256 repaidAmount = pool.repay(address(dai), repayAmount, user1);
        vm.stopPrank();

        assertEq(repaidAmount, repayAmount);
        assertEq(vdDAI.balanceOf(user1), borrowAmount - repayAmount);
        assertEq(dai.balanceOf(user1), 10000e18 + borrowAmount - repayAmount);
    }

    function testRepayOnBehalfOf() public {
        uint256 supplyAmount = 1000e18;
        uint256 borrowAmount = 300e18;
        uint256 repayAmount = 100e18;

        // setup: user1 supplies and borrows
        vm.startPrank(user1);
        usdc.approve(address(pool), supplyAmount);
        pool.supply(address(usdc), supplyAmount, user1);
        vm.stopPrank();

        vm.startPrank(user2);
        dai.approve(address(pool), 2000e18);
        pool.supply(address(dai), 2000e18, user2);
        vm.stopPrank();

        vm.startPrank(user1);
        pool.borrow(address(dai), borrowAmount, user1);
        vm.stopPrank();

        // user2 repays user1's debt
        vm.startPrank(user2);
        dai.approve(address(pool), repayAmount);
        pool.repay(address(dai), repayAmount, user1);
        vm.stopPrank();

        // user1's debt is reduced, user2 paid
        assertEq(vdDAI.balanceOf(user1), borrowAmount - repayAmount);
        assertEq(dai.balanceOf(user2), 10000e18 - 2000e18 - repayAmount);
    }

    function testRepayRevertsZeroAmount() public {
        vm.prank(user1);
        vm.expectRevert("Amount must be greater than 0");
        pool.repay(address(dai), 0, user1);
    }

    function testRepayRevertsInactiveReserve() public {
        vm.prank(user1);
        vm.expectRevert("Reserve not active");
        pool.repay(address(0x999), 100, user1);
    }

    function testRepayRevertsInsufficientDebt() public {
        // user1 has no debt
        vm.startPrank(user1);
        dai.approve(address(pool), 100e18);
        vm.expectRevert("Insufficient balance");
        pool.repay(address(dai), 100e18, user1);
        vm.stopPrank();
    }

    function testRepayFullDebt() public {
        uint256 supplyAmount = 1000e18;
        uint256 borrowAmount = 300e18;

        // setup: supply and borrow
        vm.startPrank(user1);
        usdc.approve(address(pool), supplyAmount);
        pool.supply(address(usdc), supplyAmount, user1);
        vm.stopPrank();

        vm.startPrank(user2);
        dai.approve(address(pool), 2000e18);
        pool.supply(address(dai), 2000e18, user2);
        vm.stopPrank();

        vm.startPrank(user1);
        pool.borrow(address(dai), borrowAmount, user1);

        // repay full debt
        dai.approve(address(pool), borrowAmount);
        pool.repay(address(dai), borrowAmount, user1);
        vm.stopPrank();

        // all debt should be cleared
        assertEq(vdDAI.balanceOf(user1), 0);
        assertEq(dai.balanceOf(user1), 10000e18); // back to original balance
    }

    // ============================ Integration Tests ==========================

    function testSupplyBorrowRepayWithdrawFlow() public {
        uint256 supplyAmount = 1000e18;
        uint256 borrowAmount = 500e18;

        // 1. user1 supplies USDC
        vm.startPrank(user1);
        usdc.approve(address(pool), supplyAmount);
        pool.supply(address(usdc), supplyAmount, user1);
        assertEq(aUSDC.balanceOf(user1), supplyAmount);
        vm.stopPrank();

        // 2.user2 supplies DAI (liquidity)
        vm.startPrank(user2);
        dai.approve(address(pool), 2000e18);
        pool.supply(address(dai), 2000e18, user2);
        assertEq(aDAI.balanceOf(user2), 2000e18);
        vm.stopPrank();

        // 3. user1 borrows DAI
        vm.startPrank(user1);
        pool.borrow(address(dai), borrowAmount, user1);
        assertEq(vdDAI.balanceOf(user1), borrowAmount);
        assertEq(dai.balanceOf(user1), 10000e18 + borrowAmount);
        vm.stopPrank();

        // 4. user1 repays DAI debt
        vm.startPrank(user1);
        dai.approve(address(pool), borrowAmount);
        pool.repay(address(dai), borrowAmount, user1);
        assertEq(vdDAI.balanceOf(user1), 0);
        vm.stopPrank();

        // 5. user1 withdraws USDC collateral
        vm.startPrank(user1);
        pool.withdraw(address(usdc), supplyAmount, user1);
        assertEq(aUSDC.balanceOf(user1), 0);
        assertEq(usdc.balanceOf(user1), 10000e18); // back to the original 
        vm.stopPrank();
    }

    function testMultipleUsersMultipleAssets() public {
        // user1: supplies USDC, borrows DAI
        // user2: supplies DAI, borrows USDC

        vm.startPrank(user1);
        usdc.approve(address(pool), 1000e18);
        pool.supply(address(usdc), 1000e18, user1);
        vm.stopPrank();

        vm.startPrank(user2);
        dai.approve(address(pool), 1000e18);
        pool.supply(address(dai), 1000e18, user2);
        vm.stopPrank();

        // cross borrowing
        vm.startPrank(user1);
        pool.borrow(address(dai), 400e18, user1);
        vm.stopPrank();

        vm.startPrank(user2);
        pool.borrow(address(usdc), 400e18, user2);
        vm.stopPrank();

        // check balances
        assertEq(aUSDC.balanceOf(user1), 1000e18);
        assertEq(aDAI.balanceOf(user2), 1000e18);
        assertEq(vdDAI.balanceOf(user1), 400e18);
        assertEq(vdUSDC.balanceOf(user2), 400e18);
        assertEq(dai.balanceOf(user1), 10000e18 + 400e18);
        assertEq(usdc.balanceOf(user2), 10000e18 + 400e18);
    }

    // ============================= Error Cases ================================

    function testCannotBorrowWithoutCollateral() public {
        // user2 supplies DAI liquidity 
        vm.startPrank(user2);
        dai.approve(address(pool), 1000e18);
        pool.supply(address(dai), 1000e18, user2);
        vm.stopPrank();

        // user1 tries to borrow without collateral -> should revert due to health factor
        vm.startPrank(user1);
        vm.expectRevert("Health factor too low");
        pool.borrow(address(dai), 100e18, user1);
        vm.stopPrank();
    }

    function testCannotWithdrawMoreThanSupplied() public {
        vm.startPrank(user1);
        usdc.approve(address(pool), 100e18);
        pool.supply(address(usdc), 100e18, user1);

        vm.expectRevert("Insufficient balance");
        pool.withdraw(address(usdc), 200e18, user1);
        vm.stopPrank();
    }

    function testCannotRepayMoreThanDebt() public {
        uint256 supplyAmount = 1000e18;
        uint256 borrowAmount = 300e18;

        // setup
        vm.startPrank(user1);
        usdc.approve(address(pool), supplyAmount);
        pool.supply(address(usdc), supplyAmount, user1);
        vm.stopPrank();

        vm.startPrank(user2);
        dai.approve(address(pool), 2000e18);
        pool.supply(address(dai), 2000e18, user2);
        vm.stopPrank();

        vm.startPrank(user1);
        pool.borrow(address(dai), borrowAmount, user1);

        // try to repay more than borrowed
        dai.approve(address(pool), borrowAmount + 100e18);
        vm.expectRevert("Insufficient balance");
        pool.repay(address(dai), borrowAmount + 100e18, user1);
        vm.stopPrank();
    }
    
    // ============================== Liquidation Test ===================================

    function testLiquidationSuccess() public {
        // setup: user1 supplies USDC as collateral
        vm.startPrank(user1);
        usdc.approve(address(pool), 1000e18);
        pool.supply(address(usdc), 1000e18, user1);
        vm.stopPrank();

        // user2 supplies DAI (liquidity for borrowing)
        vm.startPrank(user2);
        dai.approve(address(pool), 2000e18);
        pool.supply(address(dai), 2000e18, user2);
        vm.stopPrank();

        // user1 borrows DAI at near max capacity (75% LTV)
        vm.startPrank(user1);
        pool.borrow(address(dai), 700e18, user1); // 70% of collateral
        vm.stopPrank();

        // verify initial state
        assertEq(vdDAI.balanceOf(user1), 700e18);
        assertEq(aUSDC.balanceOf(user1), 1000e18);

        // simulate price drop - USDC drops to $0.80
        priceOracle.setManualPrice(address(usdc), 0.8e18);

        // check health factor is below 1
        (,,,,, uint256 healthFactor) = pool.getUserAccountData(user1);
        assertLt(healthFactor, 1e18, "Health factor should be below 1");

        // Liquidator (user2) liquidates user1
        vm.startPrank(user2);
        dai.approve(address(pool), 350e18); // cover up to 50% of debt

        pool.liquidationCall(
            address(usdc),
            address(dai),
            user1,
            350e18,
            false
        );
        vm.stopPrank();

        // verify debt was reduced
        uint256 remainingDebt = vdDAI.balanceOf(user1);
        assertEq(remainingDebt, 350e18, "Debt should be reduced by 350");

        // verify collateral was taken (with 5% bonus)
        uint256 remainingCollateral = aUSDC.balanceOf(user1);
        assertLt(remainingCollateral, 1000e18, "collateral should be reduced");
    }

    function testLiquidationReceiveAToken() public {
        // setup: user1 supplies and borrows
        vm.startPrank(user1);
        usdc.approve(address(pool), 1000e18);
        pool.supply(address(usdc), 1000e18, user1);
        vm.stopPrank();

        vm.startPrank(user2);
        dai.approve(address(pool), 2000e18);
        pool.supply(address(dai), 2000e18, user2);
        vm.stopPrank();

        vm.startPrank(user1);
        pool.borrow(address(dai), 700e18, user1);
        vm.stopPrank();

        // price drop makes position unhealthy
        priceOracle.setManualPrice(address(usdc), 0.8e18);

        // record user2's aUSDC balance before
        uint256 user2ATokenBefore = aUSDC.balanceOf(user2);

        // liquidator receives aTokens instead of underlying
        vm.startPrank(user2);
        dai.approve(address(pool), 350e18);
        pool.liquidationCall(
            address(usdc),
            address(dai),
            user1,
            350e18,
            true
        );
        vm.stopPrank();

        // verify liquidator received aTokens
        uint256 user2ATokenAfter = aUSDC.balanceOf(user2);
        assertGt(user2ATokenAfter, user2ATokenBefore, "Liquidator should receive aTokens");
    }

    function testCannotLiquidateHealthyPosition() public {
        // setup: user1 supplies collateral, borrows small amount
        vm.startPrank(user1);
        usdc.approve(address(pool), 1000e18);
        pool.supply(address(usdc), 1000e18, user1);
        vm.stopPrank();

        vm.startPrank(user2);
        dai.approve(address(pool), 2000e18);
        pool.supply(address(dai), 2000e18, user2);
        vm.stopPrank();

        vm.startPrank(user1);
        pool.borrow(address(dai), 100e18, user1); // only 10% - very healthy
        vm.stopPrank();

        // check health factor is above 1
        (,,,,, uint256 healthFactor) = pool.getUserAccountData(user1);
        assertGt(healthFactor, 1e18, "Health factor should be above 1");

        // try to liquidate - should fail
        vm.startPrank(user2);
        dai.approve(address(pool), 50e18);
        vm.expectRevert("Health factor not below threshold");
        pool.liquidationCall(
            address(usdc),
            address(dai),
            user1,
            50e18,
            false
        );
        vm.stopPrank();
    }

    function testCannotLiquidateSelf() public {
        // setup
        vm.startPrank(user1);
        usdc.approve(address(pool), 1000e18);
        pool.supply(address(usdc), 1000e18, user1);
        vm.stopPrank();

        vm.startPrank(user2);
        dai.approve(address(pool), 2000e18);
        pool.supply(address(dai), 2000e18, user2);
        vm.stopPrank();

        vm.startPrank(user1);
        pool.borrow(address(dai), 700e18, user1);
        vm.stopPrank();

        // price drops
        priceOracle.setManualPrice(address(usdc), 0.8e18);

        // try self-liquidation - should fail
        vm.startPrank(user1);
        dai.approve(address(pool), 350e18);
        vm.expectRevert("Cannot liquidate yourself");
        pool.liquidationCall(
            address(usdc),
            address(dai),
            user1,
            350e18,
            false
        );
        vm.stopPrank();
    }

    function testCannotLiquidateZeroDebt() public {
        // setup unhealthy position

        // give user1 pool 1000 usdc
        vm.startPrank(user1);
        usdc.approve(address(pool), 1000e18);
        pool.supply(address(usdc), 1000e18, user1);
        vm.stopPrank();

        // give user2's pool 2000 dai
        vm.startPrank(user2);
        dai.approve(address(pool), 2000e18);
        pool.supply(address(dai), 2000e18, user2);
        vm.stopPrank();

        // user1 borrows 700 dai - user1 now has DEBT
        vm.startPrank(user1);
        pool.borrow(address(dai), 700e18, user1); 
        vm.stopPrank();

        // price drops - position becomes unhealthy
        priceOracle.setManualPrice(address(usdc), 0.8e18);

        // try to liquidate with debtToCover = 0
        vm.startPrank(user2);
        vm.expectRevert("Debt to cover must be greater than 0");
        pool.liquidationCall(
            address(usdc),
            address(dai),
            user1,
            0,              // this is the problem: debtToCover = 0
            false
        );
        vm.stopPrank();
    }

    function testCannotLiquidateWrongDebtAsset() public {
        // setup 
        // user1 deposits 1000 usdc
        vm.startPrank(user1);
        usdc.approve(address(pool), 1000e18);
        pool.supply(address(usdc), 1000e18, user1);
        vm.stopPrank();

        // user2 deposits 2000 dai
        vm.startPrank(user2);
        dai.approve(address(pool), 2000e18);
        pool.supply(address(dai), 2000e18, user2);
        vm.stopPrank();

        // user1 borrows 700 dai from pool
        vm.startPrank(user1);
        pool.borrow(address(dai), 700e18, user1); // borrowed DAI
        vm.stopPrank();

        priceOracle.setManualPrice(address(usdc), 0.8e18);

        // user2 liquidate user1
        vm.startPrank(user2);
        usdc.approve(address(pool), 350e18);
        vm.expectRevert("User has no debt for this asset");
        pool.liquidationCall(
            address(usdc),   // collateral
            address(usdc),  // wrong debt asset
            user1,
            350e18,
            false
        );
        vm.stopPrank();
    }

    function testCannotLiquidateWrongCollateralAsset() public {
        // setup user1 has USDC collateral, not DAI
        vm.startPrank(user1);
        usdc.approve(address(pool), 1000e18);
        pool.supply(address(usdc), 1000e18, user1);
        vm.stopPrank();

        // user2 deposits 2000 DAI into pool
        vm.startPrank(user2);
        dai.approve(address(pool), 2000e18);
        pool.supply(address(dai), 2000e18, user2);
        vm.stopPrank();

        // user1 borrows 700 DAI
        vm.startPrank(user1);
        pool.borrow(address(dai), 700e18, user1);
        vm.stopPrank();

        // usdc price drops to 0.8 dollars
        priceOracle.setManualPrice(address(usdc), 0.8e18);

        // try to liquidate DAI collateral (user has USDC, not DAI)
        vm.startPrank(user2);
        dai.approve(address(pool), 350e18);
        vm.expectRevert("User has no collateral for this asset");
        pool.liquidationCall(
            address(dai),   // collateral asset (wrong, DAI is not the collateral)
            address(dai),   // debt asset (user1 owes DAI)
            user1,
            350e18,
            false
        );
        vm.stopPrank();
    }

    function testLiquidationCloseFactor50Percent() public {
        // setup
        // user1 deposits 1000 usdc to pool
        vm.startPrank(user1);
        usdc.approve(address(pool), 1000e18);
        pool.supply(address(usdc), 1000e18, user1);
        vm.stopPrank();

        // user2 deposits 2000 DAI into pool
        vm.startPrank(user2);
        dai.approve(address(pool), 2000e18);
        pool.supply(address(dai), 2000e18, user2);
        vm.stopPrank();

        // user1 borrows 700 
        vm.startPrank(user1);
        pool.borrow(address(dai),700e18, user1);
        vm.stopPrank();

        // USDC price drops from 1 to 0.8
        priceOracle.setManualPrice(address(usdc), 0.8e18);

        // saves debtBefore
        // this is the 700 dai that the user1 owe
        uint256 debtBefore = vdDAI.balanceOf(user1);

        // try to liquidate 100% of debt - should only cover 50%
        vm.startPrank(user2);
        dai.approve(address(pool), 700e18); // full debt amount
        pool.liquidationCall(
            address(usdc),
            address(dai),
            user1,
            700e18, // request full debt
            false
        );
        vm.stopPrank();

        uint256 debtAfter = vdDAI.balanceOf(user1);
        uint256 debtCovered = debtBefore - debtAfter;

        // should only cover 50% (350) due to close factor
        assertEq(debtCovered, 350e18, "Should only liquidate 50% of debt");
    }

    function testLiquidationBonus() public {
        // setup
        vm.startPrank(user1);
        usdc.approve(address(pool), 1000e18);
        pool.supply(address(usdc), 1000e18, user1);
        vm.stopPrank();

        vm.startPrank(user2);
        dai.approve(address(pool), 2000e18);
        pool.supply(address(dai), 2000e18, user2);
        vm.stopPrank();

        vm.startPrank(user1);
        pool.borrow(address(dai), 700e18, user1);
        vm.stopPrank();

        // price drop to exactly $1 for easy calculation
        priceOracle.setManualPrice(address(usdc), 0.8e18);

        uint256 user1CollateralBefore = aUSDC.balanceOf(user1);
        uint256 user2USDCBefore = usdc.balanceOf(user2);

        // liquidate 350 DAI (50% of 700)
        vm.startPrank(user2);
        dai.approve(address(pool), 350e18);
        pool.liquidationCall(
            address(usdc),
            address(dai),
            user1,
            350e18,
            false   // receive underlying
        );
        vm.stopPrank();

        uint256 user1CollateralAfter = aUSDC.balanceOf(user1);
        uint256 user2USDCAfter = usdc.balanceOf(user2);

        uint256 collateralTaken = user1CollateralBefore - user1CollateralAfter;
        uint256 usdcReceived = user2USDCAfter - user2USDCBefore;

        // verify liquidator received collateral
        assertGt(usdcReceived, 0, "Liquidator should receive USDC");
        assertEq(collateralTaken, usdcReceived, "Collateral taken should equal USDC received");

        // collateral should be > debt due to 5% bonus
        // debt: 350 DAI = $350
        // with 5% bonus: $350 * 1.05 = $367.50
        // at $0.80 per USDC: $367.50 / $0.80 = 459.375 USDC
        assertGt(collateralTaken, 350e18, "Collateral should include 5% bonus");
    }
}