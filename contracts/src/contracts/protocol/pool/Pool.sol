// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {IPoolAddressesProvider} from "../../interfaces/IPoolAddressesProvider.sol";
import {IReserveInterestRateStrategy} from "../../interfaces/IReserveInterestRateStrategy.sol";

abstract contract Pool {

    IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;
    address public immutable RESERVE_INTEREST_RATE_STRATEGY;

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Functions //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @param provider an interface to the protocol addresses (pool, configurator, price oracle, ACL manager, etc.)
     * @param interestRateStrategy an interface to the contract that calculates borrow and supply interest rates
     */
    constructor(IPoolAddressesProvider provider, IReserveInterestRateStrategy interestRateStrategy) {
        // stores the addresses provider
        // saves the provider reference so the Pool can look up other protocol addresses dynamically
        ADDRESS_PROVIDER = provider;
        
        // validates the interest rate strategy address
        // ensures the interest rate strategy isn't the zero address
        // prevents deployment with an invalid/missing strategy
        require(address(interestRateStrategy) != address(0), Errors.ZeroAddressNotValid());

        // stores the interest rate strategy address
        // saves the strategy address for calculating interest rates on the borrows/deposits
        RESERVE_INTEREST_RATE_STRATEGY = address(interestRateStrategy);
    }

    // deposit collateral
    function supplyWithPermit(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode,
        uint256 deadline,
        uint8 permitV,
        bytes32 permitR,
        bytes32 permitS
    ) public virtual ovveride {
        try {

        } catch {
            SupplyLogic.executeSupply(
                _reserves,
                _reservesList,
                _userConfig[onBehalfOf],
                DataTypes.ExecuteSupplyParams({
                    user: _msgSender(),
                    asset: asset,
                    interestRateStrategyAddress: RESERVE_INTEREST_RATE_STRATEGY,
                    amount: amount,
                    onBehalfOf: onBehalfOf,
                    refferalCode: refferalcode
                })
            )
        }
    }

    // withdrawl collateral
    // borrow against collateral
    // repay borrowed tokens
    // liquidate
}