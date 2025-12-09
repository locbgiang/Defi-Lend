// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {Test, console} from "forge-std/Test.sol";
import {VariableDebtToken} from "../src/contracts/protocol/tokenization/VariableDebtToken.sol";

contract VariableDebtTokenTest is Test {
    VariableDebtToken public debtToken;

    address public pool = address(0x1111);
    address public underlyingAsset = address(0x2222);
    address user1 = address(0x5678);
    address user2 = address(0x9ABC);

    // Events
    event Mint(address indexed user, uint256 amount, uint256 currentBalance, uint256 totalSupply);
    event Burn(address indexed user, uint256 amount, uint256 currentBalance, uint256 totalSupply);

    function setUp() public {
        // deploy VariableDebtToken
        debtToken = new VariableDebtToken(
            pool,
            underlyingAsset,
            "Variable Debt USDC",
            "vdUSDC"
        );
    }

    function testInitialization() public view {
        assertEq(debtToken.name(), "Variable Debt USDC");
        assertEq(debtToken.symbol(), "vdUSDC");
        assertEq(debtToken.decimals(), 18);
        assertEq(debtToken.POOL(), pool);
        assertEq(debtToken.UNDERLYING_ASSET(), underlyingAsset);
        assertEq(debtToken.totalSupply(), 0);
    }

    function testMintOnlyPool() public {
        // non-pool address should fail
        vm.prank(user1);
        vm.expectRevert("Caller must be pool");
        debtToken.mint(user1, 100);

        // pool address should succeed
        vm.prank(pool);
        vm.expectEmit(true, false, false, true);
        emit Mint(user1, 100, 100, 100);
        bool success = debtToken.mint(user1, 100);

        assertTrue(success);
        assertEq(debtToken.balanceOf(user1), 100);
        assertEq(debtToken.totalSupply(), 100);
    }

    function testMintZeroAmount() public {
        vm.prank(pool);
        vm.expectRevert("Amount must be greater than 0");
        debtToken.mint(user1, 0);
    }

    function testMintZeroAddress() public {
        vm.prank(pool);
        vm.expectRevert("Invalid user address");
        debtToken.mint(address(0), 100);
    }

    function testBurnOnlyPool() public {
        // setup: mint debt tokens first
        vm.prank(pool);
        debtToken.mint(user1, 100);

        // non-pool address should fail
        vm.prank(user1);
        vm.expectRevert("Caller must be pool");
        debtToken.burn(user1, 50);

        // pool address should succeed
        vm.prank(pool);
        vm.expectEmit(true, false, false, true);
        emit Burn(user1, 50, 50, 50);
        debtToken.burn(user1, 50);

        assertEq(debtToken.balanceOf(user1), 50);
        assertEq(debtToken.totalSupply(), 50);
    }

    function testBurnZeroAmount() public {
        vm.prank(pool);
        debtToken.mint(user1, 100);

        vm.prank(pool);
        vm.expectRevert("Amount must be greater than 0");
        debtToken.burn(user1, 0);
    }

    function testBurnZeroAddress() public {
        vm.prank(pool);
        debtToken.mint(user1, 100);

        vm.prank(pool);
        vm.expectRevert("Invalid user address");
        debtToken.burn(address(0), 50);
    }

    function testBurnInsufficientBalance() public {
        vm.prank(pool);
        debtToken.mint(user1, 100);

        vm.prank(pool);
        vm.expectRevert("Insufficient balance");
        debtToken.burn(user1, 150);
    }

    function testTransferReverts() public {
        // mint some debt token
        vm.prank(pool);
        debtToken.mint(user1, 100);

        // try to transfer - should revert
        vm.prank(user1);
        vm.expectRevert("Debt tokens are non-transferable");
        debtToken.transfer(user2, 50);
    }

    function testTransferFromReverts() public {
        // mint some debt token
        vm.prank(pool);
        debtToken.mint(user1, 100);

        // try to transferFrom - should revert
        vm.prank(user1);
        vm.expectRevert("Debt tokens are non-transferable");
        debtToken.transferFrom(user1, user2, 50);
    }

    function testApproveReverts() public {
        // mint some debt tokens
        vm.prank(pool);
        debtToken.mint(user1, 100);

        // try to approve - should revert
        vm.prank(user1);
        vm.expectRevert("Debt tokens are non-transferable");
        debtToken.approve(user2, 50);
    }

    function testMultipleUserBorrow() public {
        // user1 borrows 1000
        vm.prank(pool);
        debtToken.mint(user1, 1000);
        assertEq(debtToken.balanceOf(user1), 1000);

        // user2 borrows 500
        vm.prank(pool);
        debtToken.mint(user2, 500);
        
        assertEq(debtToken.balanceOf(user1), 1000);
        assertEq(debtToken.balanceOf(user2), 500);
        assertEq(debtToken.totalSupply(), 1500);
    }

    function testBorrowAndRepayFlow() public {
        // user borrows 1000
        vm.prank(pool);
        debtToken.mint(user1, 1000);
        assertEq(debtToken.balanceOf(user1), 1000);

        // user repays 300
        vm.prank(pool);
        debtToken.burn(user1, 300);
        assertEq(debtToken.balanceOf(user1), 700);

        // user repays reamining 700
        vm.prank(pool);
        debtToken.burn(user1, 700);
        assertEq(debtToken.balanceOf(user1), 0);
        assertEq(debtToken.totalSupply(), 0);
    }

    function testMultipleBorrowSameUser() public {
        // user borrows multiple times
        vm.startPrank(pool);

        // user1 borrows 100
        debtToken.mint(user1, 100);
        assertEq(debtToken.balanceOf(user1), 100);

        // user1 borrows 200 more
        debtToken.mint(user1, 200);
        assertEq(debtToken.balanceOf(user1), 300);

        // user1 borrows 300 more
        debtToken.mint(user1, 300);
        assertEq(debtToken.balanceOf(user1), 600);

        vm.stopPrank();
    }

    function testPartialRepayments() public {
        // user borrows 1000
        vm.prank(pool);
        debtToken.mint(user1, 1000);

        // multiple partial repayments
        vm.startPrank(pool);

        // user1 pays 100
        debtToken.burn(user1, 100);
        assertEq(debtToken.balanceOf(user1), 900);

        // user1 pays 200
        debtToken.burn(user1, 200);
        assertEq(debtToken.balanceOf(user1), 700);

        // user1 pays 300
        debtToken.burn(user1, 300);
        assertEq(debtToken.balanceOf(user1), 400);

        vm.stopPrank();
    }  

    function testTotalSupplyTracking() public {
        assertEq(debtToken.totalSupply(), 0);

        // user1 borrows 1000
        vm.prank(pool); 
        debtToken.mint(user1, 1000);
        assertEq(debtToken.totalSupply(), 1000);

        // user2 borrows 500
        vm.prank(pool);
        debtToken.mint(user2, 500);
        assertEq(debtToken.totalSupply(), 1500);

        // user1 repays partially
        vm.prank(pool);
        debtToken.burn(user1, 300);
        assertEq(debtToken.totalSupply(), 1200);

        // user2 repays fully
        vm.prank(pool);
        debtToken.burn(user2, 500);
        assertEq(debtToken.totalSupply(), 700);

        // user1 repays fully
        vm.prank(pool);
        debtToken.burn(user1, 700);
        assertEq(debtToken.totalSupply(), 0);
    }
} 