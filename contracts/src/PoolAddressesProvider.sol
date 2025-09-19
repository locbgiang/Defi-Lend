// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title PoolAddressesProvider
 * @author Loc Giang
 * @notice A central registry/directory that acts as the single source
 * of truth for all important contract addresses in the protocol.
 * Think of it as the 'phone book' for the protocol.
 * 
 * 1. Stores addresses
 * 2. Provides getter functions
 * 3. Allows updates
 * 4. Acts as a proxy registry                       
 */
contract PoolAddressesProvider {
    function getPool() external view returns(address){
        // getpool logic
    }

    function setPoolImpl(address newPoolImpl) external {
        // set pool implementation logic
    }

    function getPoolConfigurator() external view returns(address){
        // get pool configurator logic
    }

    function getPriceOracle() external view returns(address) {
        // get price oracle logic
    }

    function getACLManager() external view returns(address) {
        // get ACL manager logic
    }
}