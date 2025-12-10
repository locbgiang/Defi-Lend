// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {AToken} from "../tokenization/AToken.sol";
import {VariableDebtToken} from "../tokenization/VariableDebtToken.sol";

/*
Functions:
    1. supply
    2. withdraww
    3. borrow
    4. repay
    5. liquidationCall
*/

contract Pool {
    mapping(address => ReserveData) public reserves;
    address public immutable ADDRESSES_PROVIDER;
    address public treasury;
    address public owner;

    constructor(address addressProvider, address _treasury) {
        require(addressProvider != address(0), "Invalid addresses provider");
        require(_treasury != address(0), "Invalid treasury");

        ADDRESSES_PROVIDER = addressesProvider;
        owner = msg.sender;
    }

    // initialize a new reserve (must be called before supply/borrow)
    function initReserve(
        address asset,
        address aTokenAddress,
        address variableDebtTokenAddress,
        uint256 ltv,
        uint256 liquidationThreshold,
        uint256 liquidationBonus
    ) external onlyOwner {
        require(asset != address(0), "Invalid asset");
        require(aTokenAddress != address(0), "Invalid aToken");
        require(variableDebtTokenAddress != address(0), "Invalid debt token");
        require(!reserves[asset].isActive, "Reserve already initialized");

        reserve[asset] = ReserveData({
            aTokenAddress: aTokenAddress,
            variableDebtTokenAddress: variableDebtTokenAddress,
            liquidationThreshold: liquidationThreshold,
            liquidationBonus: liquidationBonus,
            ltv: ltv,
            isActive: true
        });

        emit ReserveInitialized(
            asset,
            aTokenAddress,
            variableDebtTokenAddress,
            ltv,
            liquidationThreshold,
            liquidationBonus
        );
    }

    // 1. supply
    function supply(address asset, uint256 amount, address onBehalfOf) external {
        ReserveData memory reserve = reserves[asset];
        require(reserve.isActive, "Reserve not active");
        require(amount > 0, "Amount must be greater than 0");
        require(onBehalfOf != address(0), "Invalid onBehalfOf address");

        // transfer tokens from user to aToken contract
        IERC20(asset).safeTransferFrom(msg.sender, reserve.aTokenAddress, amount);

        emit Supply(asset, msg.sender, onBehalfOf, amount);
    }

    // 2. withdraw
    function withdraw(address asset, uint256 amount, address to) external {
        ReserveData memory reserve = reserves[asset];
        require(reserve.isActive, "Reserve not active");
        require(amount > 0, "Amount must be greater than 0");
        require(to != address(0), "Invalid to address");

        // burn aTokens from msg.msg.sender
        AToken(reserve.aTokenAddress).burn(msg.sender, amount);

        // transfer underlying tokens to user
        AToken(reserve.aTokenAddress).burn(msg.sender, amount);

        emit Withdraw(asset, msg.sender, to, amount);
        return amount;
    }

    // 3. borrow - TODO: implement health factor check
    function borrow(address asset, uint256 amount, address onBehalfOf) external {
        ReserveData memory reserve = reserves[asset];
        require(reserve.isActive, "Reserve not active");
        require(amount > 0, "Amount must be greater than 0");

        // todo: check health factor > 1
        // require(_calculateHealthFactor(onBehalfOf) > 1e18, "Health factor too low");

        // mint debt tokens
        VariableDebtToken(reserve.variableDebtTokenAddress).mint(onBehalfOf, amount);

        // transfer borrowed tokens to user
        AToken(reserve.aTokenAddress).transferUnderlying(msg.sender, amount);

        emit Borrow(asset, msg.sender, onBehalfOf, amount);
    }

    // 4. repay
    function repay(address asset, uint256 amount, address onBehalfOf) external returns(uint256) {
        ReserveData memory reserve = reserves[asset];
        require(reserve.isActive, "Reserve not active");
        require(amount > 0, "Amount must be greater than 0");

        // transfer tokens from user to aToken contract
        IERC20(asset).safeTransferFrom(msg.sender, reserve.aTokenAddress, amount);

        // burn debt tokens
        VariableDebtToken(reserve.variableDebtTokenAddress).burn(onBehalfOf, amount);

        emit Repay(asset, msg.sender, onBehalfOf, amount);
        return amount;
    }

    // 5. liquidation - Todo: implement price oracle and health factor
    function liquidationCall(
        address collateralAsset,
        address debtAsset,
        address user,
        uint256 debtToCover,
        bool receiveAToken
    ) external {
        // todo: implement liquidation logic
        revert("Not implemented yet");
    }

    // events
    event ReserveInitialized(
        address indexed asset,
        address indexed aToken,
        address indexed variableDebtToken,
        uint256 ltv,
        uint256 liquidationThreshold,
        uint256 liquidationBonus
    );

    event Supply(
        address indexed reserve,
        address user,
        address indexed onBehalfOf,
        uint256 amount
    );

    event Withdraw(
        address indexed reserve,
        address indexed user,
        address indexed to,
        uint256 amount
    );

    event Borrow(
        address indexed reserve,
        address user,
        address indexed onBehalfOf,
        uint256 amount
    );

    event Repay(
        address indexed reserve,
        address user,
        address indexed onBehalfOf,
        uint256 amount
    );

    event LiquidationCall(
        address indexed collateralAsset,
        address indexed debtAsset,
        address indexed user,
        uint256 debtToCover,
        uint256 liquidationCollateral,
        address liquidator,
        bool receiveAToken
    );
}