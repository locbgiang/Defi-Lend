# 📜 Contracts Codebase Visualization

Visual map of the Solidity contracts in `contracts/src` — how they reference each
other, their state, and their function surfaces. Frontend/client is intentionally
excluded; see `../HOW_IT_WORKS.md` for the full-stack view.

---

## 1. Contract Dependency Graph

```
                    ┌───────────────────────┐
                    │ AggregatorV3Interface │
                    │ (interface, external) │
                    │ Chainlink price feed  │
                    └───────────────────────┘
                                      │ used by
                                      ▼
                    ┌───────────────────────────────────┐
                    │ PriceOracle                       │
                    │ inherits: (none)                  │
                    │ state: assetPriceFeeds,           │
                    │        manualPrices, useChainlink │
                    │ fn:    getAssetPrice()            │
                    └───────────────────────────────────┘
                                      │ priceOracle.getAssetPrice()
                                      ▼
              ┌──────────────────────────────────────────┐
              │ Pool.sol                                 │
              │ inherits: ReentrancyGuard                │
              │ state:  reserves[asset] -> ReserveData { │
              │           aTokenAddress,                 │
              │           variableDebtTokenAddress,      │
              │           ltv, liquidationThreshold,     │
              │           liquidationBonus, isActive     │
              │         }                                │
              │ fn:     initReserve()                    │
              │ fn:     supply() / withdraw()            │
              │ fn:     borrow() / repay()               │
              │ fn:     liquidationCall()                │
              │ fn:     getUserAccountData()             │
              └──────────────────────────────────────────┘
                    │ mint/burn/                    │ mint/burn
                    │ transferUnderlying            │ (non-transferable)
                    ▼                               ▼
          ┌─────────────────────────────┐   ┌──────────────────────────────┐
          │ AToken.sol                  │   │ VariableDebtToken.sol        │
          │ inherits: ERC20 (OZ)        │   │ inherits: ERC20 (OZ)         │
          │ guard: onlyPool             │   │ guard: onlyPool              │
          │ fn: mint() / burn()         │   │ fn: mint() / burn()          │
          │ fn: transferUnderlying()    │   │ fn: transfer()     -> revert │
          │ fn: mintToTreasury()        │   │ fn: transferFrom() -> revert │
          │ fn: transferOnLiquidation() │   │ fn: approve()      -> revert │
          └─────────────────────────────┘   └──────────────────────────────┘
                │ holds & transfers
                ▼
          ┌──────────────────────────────┐
          │ Underlying ERC20             │
          │ (IERC20 / SafeERC20)         │
          │ USDC, DAI, WETH — external   │
          │ token contracts, not in repo │
          └──────────────────────────────┘
                ▲
                │ deposit()/withdraw()/approve()
                │
          ┌───────────────────────────────────┐
          │ WETHGateway.sol                   │
          │ uses: IWETH, IPool, IAToken       │
          │ fn: depositETH()                  │
          │   -> WETH.deposit()               │
          │   -> Pool.supply(WETH, ...)       │
          │ fn: withdrawETH()                 │
          │   -> aWETH.transferFrom(user,...) │
          │   -> Pool.withdraw(WETH, ...)     │
          │   -> WETH.withdraw()              │
          │   -> send ETH to user             │
          └───────────────────────────────────┘
```

---

## 2. Contract Responsibilities at a Glance

| Contract | Type | Inherits / Uses | Controlled By |
|---|---|---|---|
| `Pool.sol` | Core orchestrator | `ReentrancyGuard`, `PriceOracle`, `AToken`, `VariableDebtToken`, `SafeERC20` | `owner` (for `initReserve`) |
| `AToken.sol` | ERC20 receipt token | OpenZeppelin `ERC20`, `SafeERC20` | `onlyPool` modifier |
| `VariableDebtToken.sol` | ERC20-like debt token | OpenZeppelin `ERC20` | `onlyPool` modifier; transfer/approve disabled |
| `PriceOracle.sol` | Price feed aggregator | `AggregatorV3Interface` (Chainlink) | `onlyOwner` modifier |
| `WETHGateway.sol` | ETH convenience wrapper | `IWETH`, `IPool`, `IAToken` interfaces | permissionless (per-user) |
| `AggregatorV3Interface.sol` | External interface | — | n/a (Chainlink standard) |

---

## 3. Function Call Chains (per user action)

### Supply (ERC20 token, e.g. USDC)
```
User → Pool.supply(asset, amount, onBehalfOf)
          → IERC20(asset).safeTransferFrom(user, aToken, amount)
          → AToken.mint(onBehalfOf, amount)          [onlyPool]
          → emit Supply
```

### Supply (native ETH via gateway)
```
User → WETHGateway.depositETH{value}()
          → WETH.deposit{value}()                     (wrap ETH → WETH)
          → Pool.supply(WETH, msg.value, user)
                → AToken(aWETH).mint(user, amount)
          → emit ETHDeposited
```

### Borrow
```
User → Pool.borrow(asset, amount, onBehalfOf)
          → VariableDebtToken.mint(onBehalfOf, amount) [onlyPool]
          → Pool.getUserAccountData(onBehalfOf)
                → loop reservesList
                → PriceOracle.getAssetPrice(asset)  (per reserve)
                → compute healthFactor
          → require healthFactor >= 1e18
          → AToken.transferUnderlying(user, amount)   [onlyPool]
          → emit Borrow
```

### Repay
```
User → Pool.repay(asset, amount, onBehalfOf)
          → IERC20(asset).safeTransferFrom(user, aToken, amount)
          → VariableDebtToken.burn(onBehalfOf, amount) [onlyPool]
          → emit Repay
```

### Withdraw
```
User → Pool.withdraw(asset, amount, to)
          → AToken.burn(msg.sender, amount)            [onlyPool]
          → AToken.transferUnderlying(to, amount)       [onlyPool]
          → emit Withdraw
```

### Withdraw (native ETH via gateway)
```
User → WETHGateway.withdrawETH(amount)
          → aWETH.transferFrom(user, gateway, amount)   (user must approve gateway)
          → Pool.withdraw(WETH, amount, gateway)
          → WETH.withdraw(amount)                       (unwrap WETH → ETH)
          → gateway sends ETH to user
          → emit ETHWithdrawn
```

### Liquidation
```
Liquidator → Pool.liquidationCall(collateralAsset, debtAsset, user, debtToCover, receiveAToken)
                → Pool.getUserAccountData(user) → healthFactor
                → require healthFactor < 1e18
                → VariableDebtToken(debtAsset).balanceOf(user)
                → compute maxLiquidatableDebt (50% close factor)
                → PriceOracle.getAssetPrice(debtAsset / collateralAsset)
                → VariableDebtToken.burn(user, actualDebtToCover)
                → AToken.transferOnLiquidation(user, liquidator, collateralToLiquidate)
                → emit LiquidationCall (or similar)
```

---

## 4. State Ownership Map

```
Pool.sol
 ├── reserves: mapping(address asset => ReserveData)
 ├── reservesList: address[]           (iterated for getUserAccountData)
 ├── owner, treasury
 └── priceOracle: PriceOracle

AToken.sol (one deployed instance PER asset, e.g. aUSDC, aDAI, aWETH)
 ├── UNDERLYING_ASSET (immutable)
 ├── POOL (immutable)
 └── RESERVE_TREASURY_ADDRESS (immutable)

VariableDebtToken.sol (one deployed instance PER asset, e.g. vdUSDC, vdDAI, vdWETH)
 ├── POOL (immutable)
 └── UNDERLYING_ASSET (immutable, address only — no token logic)

PriceOracle.sol
 ├── assetPriceFeeds: mapping(address => address)   (Chainlink feed per asset)
 ├── manualPrices: mapping(address => uint256)       (test/manual override)
 └── useChainlink: mapping(address => bool)

WETHGateway.sol
 ├── WETH (immutable)
 ├── POOL (immutable)
 └── aWETH (immutable)
```

---

## 5. Directory Layout

```
contracts/
├── src/
│   ├── Pool.sol                  ← orchestrator, holds all reserve state
│   ├── AToken.sol                ← per-asset receipt token
│   ├── VariableDebtToken.sol     ← per-asset debt token
│   ├── PriceOracle.sol           ← price feed abstraction
│   ├── WETHGateway.sol           ← native ETH convenience layer
│   └── AggregatorV3Interface.sol ← Chainlink interface (external dep shim)
│
├── script/                       ← Foundry deployment scripts
│   ├── HelperConfig.s.sol        (network-specific addresses/feeds)
│   ├── DeployPool.s.sol          (deploys Pool + PriceOracle + reserves)
│   ├── DeployWETHMarket.s.sol    (deploys aWETH/vdWETH + initReserve)
│   ├── DeployWETHGateway.s.sol   (deploys WETHGateway)
│   └── SetWETHPrice.s.sol        (manual price setter for testing)
│
└── test/                         ← Foundry tests (Forge)
    ├── PoolTest.t.sol
    ├── ATokenTest.t.sol
    ├── VariableDebtTokenTest.t.sol
    ├── DeployPoolTest.t.sol
    └── mocks/
```

---

## 6. Quick Reference — Access Control

| Function | Guard | Who can call |
|---|---|---|
| `Pool.initReserve` | `onlyOwner` | Deployer/owner only |
| `AToken.mint/burn/transferUnderlying/mintToTreasury/transferOnLiquidation` | `onlyPool` | Only `Pool.sol` |
| `VariableDebtToken.mint/burn` | `onlyPool` | Only `Pool.sol` |
| `VariableDebtToken.transfer/transferFrom/approve` | hardcoded revert | Nobody (non-transferable) |
| `PriceOracle.setAssetPriceFeed/setManualPrice` | `onlyOwner` | Oracle owner only |
| `Pool.supply/withdraw/borrow/repay/liquidationCall` | `nonReentrant` | Any user (permissionless) |
| `WETHGateway.depositETH/withdrawETH` | none (relies on Pool checks) | Any user (permissionless) |
