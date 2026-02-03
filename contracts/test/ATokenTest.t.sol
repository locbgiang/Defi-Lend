// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {Test, console} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AToken} from "../src/AToken.sol";


// Mock underlying ERC20 token
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "Mock") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract ATokenTest is Test {
    AToken public aToken;    
    MockERC20 public underlying;

    address public pool = address(0x1111);
    address public treasury = address(0x1234);
    address public user1 = address(0x5678);
    address public user2 = address(0x9ABC);

    event Mint(address indexed user, uint256 amount, uint256 currentBalance, uint256 totalSupply);
    event Burn(address indexed user, uint256 amount, uint256 currentBalance, uint256 totalSupply);
    event TransferUnderlying(address indexed target, uint256 amount);
    event MintToTreasury(address indexed treasury, uint256 amount);
    event TransferOnLiquidation(address indexed from, address indexed to, uint256 value);

    function setUp() public {
        // deploy mock contracts
        underlying = new MockERC20();

        // deploy AToken
        aToken = new AToken(
            pool,
            address(underlying),
            treasury,
            "Aave Mock Token",
            "aMOCK"
        );
    }

    function testInitialization() public view {
        assertEq(aToken.name(), "Aave Mock Token");
        assertEq(aToken.symbol(), "aMOCK");
        assertEq(aToken.decimals(), 18);
        assertEq(address(aToken.UNDERLYING_ASSET()), address(underlying));
        assertEq(aToken.POOL(), pool);
        assertEq(aToken.RESERVE_TREASURY_ADDRESS(), treasury);
    }

    function testMintOnlyPool() public {
        // Non-pool address should fail
        vm.prank(user1);
        vm.expectRevert("Caller must be pool");
        aToken.mint(user1, 100);

        // Pool address should succeed
        vm.prank(pool);
        vm.expectEmit(true, false, false, true);
        emit Mint(user1, 100, 100, 100);
        bool success = aToken.mint(user1, 100);
        assertTrue(success);
        assertEq(aToken.balanceOf(user1), 100);
    }

    function testMintZeroAmount() public {
        vm.prank(pool);
        vm.expectRevert("Amount must be greater than 0");
        aToken.mint(user1, 0);
    }

    function testMintZeroAddress() public {
        vm.prank(pool);
        vm.expectRevert("Invalid user address");
        aToken.mint(address(0), 100);
    }

    function testBurnOnlyPool() public {
        // setup: mint tokens first
        vm.prank(pool);
        aToken.mint(user1, 100);

        // non-pool address should fail
        vm.prank(user1);
        vm.expectRevert("Caller must be pool");
        aToken.burn(user1, 50);

        // pool address should succeed
        vm.prank(pool);
        vm.expectEmit(true, false, false, true);
        emit Burn(user1, 50, 50, 50);
        aToken.burn(user1, 50);
        assertEq(aToken.balanceOf(user1), 50);
    }

    function testBurnInsufficientBalance() public {
        vm.prank(pool);
        aToken.mint(user1, 100);

        vm.prank(pool);
        vm.expectRevert("Insufficient balance");
        aToken.burn(user1, 150);
    }

    function testTransferUnderlying() public {
        // mint underlying to aToken contract
        underlying.mint(address(aToken), 500);

        // only pool can transfer
        vm.prank(user1);
        vm.expectRevert("Caller must be pool");
        aToken.transferUnderlying(user1, 100);

        // pool transfers successfuly
        vm.prank(pool);
        vm.expectEmit(true, false, false, true);
        emit TransferUnderlying(user1, 100);
        aToken.transferUnderlying(user1, 100);
        assertEq(underlying.balanceOf(user1), 100);
    }

    function testMintToTreasury() public {
        // test 1: Only Pool can mint to treasury
        vm.prank(user1);
        vm.expectRevert("Caller must be pool");
        aToken.mintToTreasury(100);

        // test 2: cannot mint zero amount
        vm.prank(pool);
        vm.expectRevert("Amount must be greater than 0");
        aToken.mintToTreasury(0);

        // test 3: successful mint to treasury with even emission
        vm.prank(pool);
        vm.expectEmit(true, false, false, true);
        emit MintToTreasury(treasury, 100);
        aToken.mintToTreasury(100);
        
        assertEq(aToken.balanceOf(treasury), 100);
        assertEq(aToken.totalSupply(), 100);

        // test 4: multiple mints accumulate
        vm.prank(pool);
        aToken.mintToTreasury(50);

        assertEq(aToken.balanceOf(treasury), 150);
        assertEq(aToken.totalSupply(), 150);
    }

    function testTransferOnLiquidation() public {
        // mint tokens to user1
        vm.prank(pool);
        aToken.mint(user1, 100);

        // only pool can call
        vm.prank(user1);
        vm.expectRevert("Caller must be pool");
        aToken.transferOnLiquidation(user1, user2, 50);

        // pool transfers successfully
        vm.prank(pool);
        vm.expectEmit(true, true, false, true);
        emit TransferOnLiquidation(user1, user2, 50);
        aToken.transferOnLiquidation(user1, user2, 50);

        assertEq(aToken.balanceOf(user1), 50);
        assertEq(aToken.balanceOf(user2), 50);
    }

    function testFuzzMintBurn(uint96 amount) public {
        vm.assume(amount > 0);

        // mint
        vm.prank(pool);
        aToken.mint(user1, amount);
        assertEq(aToken.balanceOf(user1), amount);

        // burn all
        vm.prank(pool);
        aToken.burn(user1, amount);
        assertEq(aToken.balanceOf(user1), 0);
    }
}
