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

    // 5. liquidation - Todo: implement price oracle and health factor
    function liquidationCall(
        address collateralAsset,
        address debtAsset,
        address user,
        uint256 debtToCover,
        bool receiveAToken
    ) external {
        // validations
        ReserveData memory reserveCollateral = reserves[collateralAsset];
        ReserveData memory reserveDebt = reserves[debtAsset];

        require(reserveCollateral.isActive, "Collateral reserve not active");
        require(reserveDebt.isActive, "Debt reserve not active");
        require(user != address(0), "Invalid user");
        require(debtToCover > 0, "Amount must be > 0");

        // ensure the user is liquidatable
        (,,,,, uint256 healthFactor) = getUserAccountData(user);
        require(healthFactor < 1e18, "Health factor >= 1");
        
        // user's current debt (in debtAsset units)
        uint256 userDebt = VariableDebtToken(reserveDebt.variableDebtTokenAddress).balanceOf(user);
        require(userDebt > 0, "User has no debt");

        // cap the debt to cover by the user's actual debt
        uint256 actualDebtToCover = debtToCover > userDebt ? userDebt : debtToCover;

        // transfer debtAsset from liquidator to aToken contract (repay on behalf)
        IERC20(debtAsset).safeTransferFrom(msg.sender, reserveDebt.aTokenAddress, actualDebtToCover);

        // burn user's debt tokens
        VariableDebtToken(reserveDebt.variableDebtTokenAddress).burn(user, actualDebtToCover);

        // prices (18 decimals)
        uint256 priceDebt = priceOracle.getAssetPrice(debtAsset);
        uint256 priceCollateral = priceOracle.getAssetPrice(collateralAsset);

        // compute max collateral to seize
        // collateralAmount = actualDebtToCover * priceDebt * (10000 + bonus) / (10000 * priceCollateral)
        uint256 bonusFactor = 10000 + reserveCollateral.liquidationBonus;
        uint256 collateralAmount = (actualDebtToCover * priceDebt * bonusFactor) / (10000 * priceCollateral);

        // user's collateral aToken balance
        uint256 userCollateralATokens = AToken(reserveCollateral.aTokenAddress).balanceOf(user);

        // if trying to seize more than available, cap and adjus debt covered to match collateral balance
        if (collateralAmount > userCollateralATokens) {
            // cap collateral to user's balance
            collateralAmount = userCollateralATokens;

            // recompute actualDebtToCover based on capped collateral;
            // actualDebt = collateralAmount * priceCollateral * 10000 / (priceDebt * bonusFactor)
            actualDebtToCover = (collateralAmount * priceCollateral * 10000) / (priceDebt * bonusFactor);

            // note: small rounding may leave tiny residuals; it's acceptable here
        }

        // transfer seize collateral to liquidator 
        if (receiveAToken) {
            // transfer aToken shares from user to liquidator (on-liquidtion transfer)
            // AToken should expose transferOnLiquidation callable by Pool
            AToken(reserveCollateral.aTokenAddress).transferOnLiquidation(user, msg.sender, collateralAmount);
        } else {
            // burn user's aTokens and transfer underlying to liquidator
            AToken(reserveCollateral.aTokenAddress).burn(user, collateralAmount);
            AToken(reserveCollateral.aTokenAddress).transferUnderlying(msg.sender, collateralAmount);
        }

        emit LiquidationCall(
            collateralAsset,
            debtAsset,
            user,
            actualDebtToCover,
            collateralAmount,
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