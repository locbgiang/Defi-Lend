// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract PoolConfigurator {
    function initReserves(ConfiguratorInputTypes.InitReserveInput[] calldata input) external;
    function configureReserveAsCollateral(address asset, uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus) external;
    function setReserveBorrowing(address asset, bool enabled) external;
}