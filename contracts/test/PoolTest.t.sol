// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {Test} from "forge-std/Test.sol";
import {Pool} from "../src/contracts/protocol/pool/Pool.sol";
import {AToken} from "../src/contracts/protocol/tokenization/AToken.sol";
import {VariableDebtToken} from "../src/contracts/protocol/tokenization/VariableDebtToken.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

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

    function setUp() public {
        // deploy pool
        pool = new Pool(addressesProvider, treasury);

        // deploy mock tokens
        usdc = new MockERC20("USD Coin", "USDC");
        dai = new MockERC20("Dai Stablecoin", "DAI");

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
        new Pool(address(0), treasury);
    }

    function testConstructorRevertsZeroTreasury() public {
        vm.expectRevert("Invalid treasury");
        new Pool(addressesProvider, address(0));
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
}