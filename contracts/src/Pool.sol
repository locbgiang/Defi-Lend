// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// core lending/borrowing functions
contract Pool {
    function supply(address asset, uint256 amount, address onBehalfOf) external {
        // deposit logic
    }

    function withdraw(address asset, uint256 amount, address to) external {
        // withdraw logic
    }

    function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 refferalCode, address onBehalfOf) external {
        // borrow logic
    }

    function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) external returns (uint256) {
        // repay logic
    }

    function liquidationCall(address collateralAsset, address debtAsset, address user, uint256 debtToCover, bool receiveAToken) external {
        // liquidation logic
    }
}