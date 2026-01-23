// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {AToken} from "../tokenization/AToken.sol";
import {VariableDebtToken} from "../tokenization/VariableDebtToken.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {PriceOracle} from "../oracle/PriceOracle.sol";

/*
Functions:
    1. supply
    2. withdraww
    3. borrow
    4. repay
    5. liquidationCall
*/

contract Pool {
    using SafeERC20 for IERC20;

    struct ReserveData{
        address aTokenAddress;
        address variableDebtTokenAddress;
        uint256 liquidationThreshold;       // 8000 = 80%
        uint256 liquidationBonus;           // 500 = 5%
        uint256 ltv;                        // 7500 = 75%
        bool isActive;
    }

    mapping(address => ReserveData) public reserves;
    address[] public reservesList;
    address public immutable ADDRESSES_PROVIDER;
    address public treasury;
    address public owner;
    PriceOracle public priceOracle;

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not owner");
        _;
    }

    constructor(address addressesProvider, address _treasury, address _priceOracle) {
        require(addressesProvider != address(0), "Invalid addresses provider");
        require(_treasury != address(0), "Invalid treasury");
        require(_priceOracle != address(0), "Invalid price oracle");

        ADDRESSES_PROVIDER = addressesProvider;
        treasury = _treasury;
        priceOracle = PriceOracle(_priceOracle);
        owner = msg.sender;
    }

    /**
     * before users can supply/borrow an asset (like USDC, DAI, WETH), 
     * the pool needs to know:
     * 1. which aToken contract represents deposits of that asset
     * 2. which debt token contract tracks borrowing
     * 3. risk parameters for that asset
     * without initReserve() the pool has no idea what to do when someone tries to 
     * deposit USDC
     */
    function initReserve(
        address asset,
        address aTokenAddress,
        address variableDebtTokenAddress,
        uint256 ltv,
        uint256 liquidationThreshold,
        uint256 liquidationBonus
    ) external onlyOwner {
        // ensures asset address is not zero
        require(asset != address(0), "Invalid asset");

        // ensures aToken was deployed and has valid address
        require(aTokenAddress != address(0), "Invalid aToken");

        // ensures debt token was deployed
        require(variableDebtTokenAddress != address(0), "Invalid debt token");

        // prevent re-initializing and existing reserve
        require(!reserves[asset].isActive, "Reserve already initialized");

        // stores all the configuration for this asset in the mapping
        reserves[asset] = ReserveData({
            // store the aToken address
            aTokenAddress: aTokenAddress,

            // the debt token contract address
            variableDebtTokenAddress: variableDebtTokenAddress,

            // the liqidationThreshold is for when position can be liquidated
            liquidationThreshold: liquidationThreshold,

            // liquidation bonus is the reward for liquidator 
            // i.e. liquidator gets a 5% discount when buying collateral
            liquidationBonus: liquidationBonus,

            // loan-to-value: max you can borrow (e.g., 7500 = 75%)
            // with $100 usd, can borrow max $75 of other assets
            ltv: ltv,

            // isActive: true
            isActive: true
        });

        reservesList.push(asset);

        // emit event so frontend/indexers know reserve is ready
        emit ReserveInitialized(
            asset,
            aTokenAddress,
            variableDebtTokenAddress,
            ltv,
            liquidationThreshold,
            liquidationBonus
        );
    }

    /**
     * 
     * @param asset the token being deposited (e.g., USDC address)
     * @param amount how much to deposit (e.g., 1000 USDC)
     * @param onBehalfOf who receives the aTokens (usually msg.sender, but can be different)
     */
    function supply(address asset, uint256 amount, address onBehalfOf) external {
        // Load RESERVE DATA from storage into memory
        // looks up the configuration for this asset in the reserves mapping 
        // example: reserves[USDC] - gets aUSDC address, debt token, LTV, ect.
        // "memory" = temporary copy (cheaper gas than reading storage multiple times)
        ReserveData memory reserve = reserves[asset];

        // VALIDATION: check if this asset has been initialized
        // if initReserve() was never called for this asset, isActive = false - revert
        // prevents user from depositing random/unsupported tokens
        require(reserve.isActive, "Reserve not active");

        // VALIDATION: prevent depositing 0 tokens
        // would waste gas and create useless transactions
        require(amount > 0, "Amount must be greater than 0");

        // VALIDATION: ensures aTokens won't be minted to zero address (black hole)
        // if onBehalfOf = 0x0000...aTokens would be lost forever
        require(onBehalfOf != address(0), "Invalid onBehalfOf address");

        // transfer tokens from user to aToken contract
        // TRANSFER ASSETS:
        // 1. msg.sender = the person calling supply() (depositor)
        // 2. reserve.aTokenAddress = where assets are stored (aToken contract)
        // 3. amount = how much to transfer
        IERC20(asset).safeTransferFrom(msg.sender, reserve.aTokenAddress, amount);

        AToken(reserve.aTokenAddress).mint(onBehalfOf, amount);

        // EMIT EVENT:
        // logs this deposit on the blockchain
        // frontends/indexers can track who deposited what
        emit Supply(asset, msg.sender, onBehalfOf, amount);
    }

    /**
     * @param asset token to withdraw (e.g. USDC address)
     * @param amount how much to withdraw (e.g. 1000 USDC)
     * @param to where to send withdrawn tokens (can be different from msg.sender)
     */
    function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
        // Load reserves configuration for this asset
        // gets aUSDC address, debt token address, ect.
        ReserveData memory reserve = reserves[asset];

        // ensures reserve was initialized
        require(reserve.isActive, "Reserve not active");

        // cant withdraw 0 tokens
        require(amount > 0, "Amount must be greater than 0");

        // cannot send token to a black hole
        require(to != address(0), "Invalid to address");

        // burn aTokens from msg.msg.sender
        AToken(reserve.aTokenAddress).burn(msg.sender, amount);

        // transfer underlying tokens to user
        AToken(reserve.aTokenAddress).transferUnderlying(to, amount);

        // emit event for tracking
        emit Withdraw(asset, msg.sender, to, amount);

        // return the withdrawing amount
        return amount;
    }

    /**
     * @param asset token to borrow (e.g. USDC address)
     * @param amount how much to borrow (e.g. 500 USDC)
     * @param onBehalfOf who gets the debt token (usually msg.sender but can be different)
     */
    function borrow(address asset, uint256 amount, address onBehalfOf) external {
        ReserveData memory reserve = reserves[asset];
        require(reserve.isActive, "Reserve not active");
        require(amount > 0, "Amount must be greater than 0");
        require(onBehalfOf != address(0), "Invalid onBehalfOf address");

        // mint debt tokens (reflects new debt)
        VariableDebtToken(reserve.variableDebtTokenAddress).mint(onBehalfOf, amount);

        // require health factor >= 1 after new debt
        ( , , , , , uint256 healthFactor) = getUserAccountData(onBehalfOf);
        require(healthFactor >= 1e18, "Health factor too low");

        // transfer borrowed tokens to caller (liquidity comes from aToken holdings)
        AToken(reserve.aTokenAddress).transferUnderlying(msg.sender, amount);

        emit Borrow(asset, msg.sender, onBehalfOf, amount);
    }

    function getUserAccountData(address user) public view returns (
        uint256 totalCollateralBase,
        uint256 totalDebtBase,
        uint256 availableBorrowsBase,
        uint256 currentLiquidationThreshold,
        uint256 ltv,
        uint256 healthFactor
    ) {
        totalCollateralBase = 0;
        totalDebtBase = 0;
        uint256 avgLtvWeighted = 0;
        uint256 avgLiquidationThresholdWeighted = 0;

        for (uint256 i = 0; i < reservesList.length; i++) {
            address asset = reservesList[i];
            ReserveData memory reserve = reserves[asset];
            if (!reserve.isActive) continue;

            uint256 aTokenBalance = AToken(reserve.aTokenAddress).balanceOf(user);
            uint256 debtBalance = VariableDebtToken(reserve.variableDebtTokenAddress).balanceOf(user);
            if (aTokenBalance == 0 && debtBalance == 0) continue;

            uint256 assetPrice = priceOracle.getAssetPrice(asset); // 18 decimals

            if (aTokenBalance > 0) {
                uint256 collateralValue = (aTokenBalance * assetPrice) / 1e18;
                totalCollateralBase += collateralValue;
                avgLtvWeighted += collateralValue * reserve.ltv;
                avgLiquidationThresholdWeighted += collateralValue * reserve.liquidationThreshold;
            }

            if (debtBalance > 0) {
                uint256 debtValue = (debtBalance * assetPrice) / 1e18;
                totalDebtBase += debtValue;
            }
        }

        if (totalCollateralBase > 0) {
            ltv = avgLtvWeighted / totalCollateralBase;
            currentLiquidationThreshold = avgLiquidationThresholdWeighted / totalCollateralBase;
        } else {
            ltv = 0;
            currentLiquidationThreshold = 0;
        }

        uint256 maxBorrowBase = (totalCollateralBase * ltv) / 10000;
        availableBorrowsBase = maxBorrowBase > totalDebtBase ? maxBorrowBase - totalDebtBase : 0;

        healthFactor = _calculateHealthFactor(totalCollateralBase, totalDebtBase, currentLiquidationThreshold);
    }

    function _calculateHealthFactor(
        uint256 totalCollateralBase,
        uint256 totalDebtBase,
        uint256 liquidationThreshold
    ) internal pure returns (uint256) {
        if (totalDebtBase == 0) return type(uint256).max;
        return (totalCollateralBase * liquidationThreshold * 1e18) / (totalDebtBase * 10000);
    }

    /**
     * @param asset token being repaid (e.g. USDC address)
     * @param amount how much to repay (e.g. 500 USDC)
     * @param onBehalfOf whose debt to repay (usually msg.sender, but can pay someone else's debt)
     */
    function repay(address asset, uint256 amount, address onBehalfOf) external returns(uint256) {
        // load reserve configuration for this asset
        // gets aUSDC address, vdUSDC debt token address, etc.
        // memory = temporary copy (gas opimization)
        ReserveData memory reserve = reserves[asset];

        // validation: ensures this asset has een initialized
        // cant repay an asset that hasnt been set up with initReserve()
        // prevents repaying unsupported/random tokens
        require(reserve.isActive, "Reserve not active");

        // validation: cant repay 0 tokens
        // prevents useless transactions that waste gas
        require(amount > 0, "Amount must be greater than 0");

        // return borrowed assets:
        // msg.sender = person making the repayment (payer)
        // reserve.aTokenAddress = where assets go back (aToken contract)
        // amount = how much you pay
        IERC20(asset).safeTransferFrom(msg.sender, reserve.aTokenAddress, amount);

        // reduce debt:
        // burn debt tokens to reduce the loan obligation
        // example: user had 500 vdUSDC debt tokens
        // burns 500 vdUSDC - user now has 0 vdUSDC
        // debt is fully paid off
        // onBehalfOf = whose debt to reduce (can pay for someone else)
        VariableDebtToken(reserve.variableDebtTokenAddress).burn(onBehalfOf, amount);

        // emit event:
        // log this repayment on the blockchain
        // frontends/indexers can track who repaid what
        emit Repay(asset, msg.sender, onBehalfOf, amount);

        // return the amount repaid
        return amount;
    }

    // liquidation - Todo: implement price oracle and health factor
    /**
     * 1. trigger: a user's health factor drops bellow 1 (undercollateralized)
     * 2. liquidator action: repays up to 50% of the borrower's debt
     * 3. reward: liquidator receieves collateral worth 105% of debt repaid (5% bonus)
     * 4. result: borrower's position becomes healthier liquidator profits
     */
    function liquidationCall(
        address collateralAsset,
        address debtAsset,
        address user,
        uint256 debtToCover,
        bool receiveAToken
    ) external {
        // use to access the collateral asset's configuration
        ReserveData memory collateralReserve = reserves[collateralAsset];
        // use to access the debt asset's configurations
        ReserveData memory debtReserve = reserves[debtAsset];

        // check to see if the collateral reserve is active
        // if someone tries to liquidate using a random token address that was never set up
        require(collateralReserve.isActive, "Collateral reserve not active");

        // check the debt asset (the token user borrowed)was properly initialized
        require(debtReserve.isActive, "Debt reserve not active");

        // this line validates that the liquidator is actually trying to repay some debt
        require(debtToCover > 0, "Debt to cover must be greater than 0");

        // this prevents user from liquidating their own positions
        require(user != msg.sender, "Cannot liquidate yourself");
        
        // getting the user's account data
        (
            uint256 totalCollateralBase,
            uint256 totalDebtBase,
            ,
            uint256 currentLiquidationThreshold,
            ,
            uint256 healthFactor
        ) = getUserAccountData(user);

        // to liquidate the user's health factor must be bellow the threshold
        require(healthFactor < 1e18, "Health factor not below threshold");

        // this line fetch the user's debt balance for the specific debt asset
        uint256 userDebt = VariableDebtToken(debtReserve.variableDebtTokenAddress).balanceOf(user);

        // this line validates that the user being liquidated actually has debt in the specified debt asset
        require(userDebt > 0, "User has no debt for this asset");

        // this line calculates the maximum amount of debt a liquidator can repay in one transaction.
        uint256 maxLiquidatableDebt = (userDebt * 5000) / 10000;
        
        // this line determines the actual amount of debt the liquidator will repay
        // capping it at the maximum allowed
        uint256 actualDebtToCover = debtToCover > maxLiquidatableDebt ? maxLiquidatableDebt : debtToCover;

        // this line is a second safety cap to ensure the liquidator never repays more than the user's total debt
        actualDebtToCover = actualDebtToCover > userDebt ? userDebt : actualDebtToCover;

        // this line fetches the current price of the debt asset (USDC) from the price oracle
        uint256 debtAssetPrice = priceOracle.getAssetPrice(debtAsset);
        // this line fetches the current price of the collateral asset (WETH) from the price oracle 
        uint256 collateralAssetPrice = priceOracle.getAssetPrice(collateralAsset);

        // this line converts the debt token amount into it's USD value (base currency)
        // incase the user borrowed non-stablecoin like WETH or WBTC
        uint256 debtAmountInBase = (actualDebtToCover * debtAssetPrice) / 1e18;
        
        // this line calculates the USD value of collateral the liquidator will receive
        // including the liquidation bonus (reward for liquidating)
        uint256 collateralAmountWithBonus = (debtAmountInBase * (10000 + collateralReserve.liquidationBonus)) / 10000;

        // this line converts the USD value of collateral back into actual collateral tokens
        uint256 collateralToLiquidate = (collateralAmountWithBonus * 1e18) / collateralAssetPrice;

        // this line fetches how much collateral the user has for the specific collateral asset
        uint256 userCollateral = AToken(collateralReserve.aTokenAddress).balanceOf(user);

        // this line validates that the user being liquidated actually has collateral in the specified
        // collateral asset
        require(userCollateral > 0, "User has no collateral for this asset");

        // this section handles the edge case where the user doesn't have enough collateral
        // to cover the calculated liquidation amount
        if (collateralToLiquidate > userCollateral) {
            collateralToLiquidate = userCollateral;
            uint256 collateralValueInBase = (collateralToLiquidate * collateralAssetPrice) / 1e18;
            uint256 debtValueCovered = (collateralValueInBase * 10000) / (10000 + collateralReserve.liquidationBonus);
            actualDebtToCover = (debtValueCovered * 1e18) / debtAssetPrice;
        }

        // execute liquidation:
        // this line transfers the debt repayment from the liquidator to the pool
        IERC20(debtAsset).safeTransferFrom(msg.sender, debtReserve.aTokenAddress, actualDebtToCover);

        // this line reduces the borrower's debt by burning their debt tokens
        VariableDebtToken(debtReserve.variableDebtTokenAddress).burn(user, actualDebtToCover);

        // this section transfers the collateral reward to the liquidator
        // with two options for how to receive it
        if (receiveAToken) {
            // option 1: receiveAToken = true
            // liquidator receives aTokens (e.g., aWETH)
            AToken(collateralReserve.aTokenAddress).transferOnLiquidation(user, msg.sender, collateralToLiquidate);
        } else {
            // option 2: rceiveAToken = false
            // liquidator receives underlying tokens (e.g., WETH)
            AToken(collateralReserve.aTokenAddress).burn(user, collateralToLiquidate);
            AToken(collateralReserve.aTokenAddress).transferUnderlying(msg.sender, collateralToLiquidate);
        }
        // this flexibility allows liquidators to choose based on their strategy 
        // stay in the protocol earning yield or exit immediately with underlying assets

        // emit the event
        emit LiquidationCall (
            collateralAsset,
            debtAsset,
            user,
            actualDebtToCover,
            collateralToLiquidate,
            msg.sender,
            receiveAToken
        );
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