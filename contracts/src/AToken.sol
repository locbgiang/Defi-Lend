// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract AToken {
    function mint(address caller, address onBehalfOf, uint256 amount, uint256 index) external {
        // mint logic
    }

    function burn(address from, address to, uint256 amount, uint256 index) external {
        // burn logic
    }

    function mintToTreasury(uint256 amount, uint256 index) external {
        // mint to treasury logic
    }
}