# 🏗️ Lending Protocol MVP - Architecture & Contracts

## 📊 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                             │
│                         (Web3 Frontend / CLI)                           │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         CORE PROTOCOL LAYER                             │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                         Pool.sol                                  │  │
│  │                  (Main Entry Point)                               │  │
│  │                                                                   │  │
│  │  Functions:                                                       │  │
│  │  • supply(asset, amount)      → Deposit tokens                    │  │
│  │  • withdraw(asset, amount)    → Withdraw tokens                   │  │
│  │  • borrow(asset, amount)      → Borrow against collateral         │  │
│  │  • repay(asset, amount)       → Repay borrowed tokens             │  │
│  │  • liquidate(user, debt, col) → Liquidate undercollateralized     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                 │                                       │
│                    ┌────────────┼────────────┐                          │
│                    ▼            ▼            ▼                          │
│         ┌───────────────┐ ┌─────────────┐ ┌──────────────┐              │
│         │SupplyLogic.sol│ │ BorrowLogic │ │Liquidation   │              │
│         │               │ │    .sol     │ │ Logic.sol    │              │
│         └───────────────┘ └─────────────┘ └──────────────┘              │
│                                 │                                       │
│                                 ▼                                       │
│                    ┌────────────────────────┐                           │
│                    │  ValidationLogic.sol   │                           │
│                    │  (Safety Checks)       │                           │
│                    └────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        TOKEN LAYER                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────────────┐     │
│  │   AToken.sol    │  │VariableDebt     │  │  Underlying Token     │     │
│  │                 │  │Token.sol        │  │  (USDC, DAI, etc)     │     │
│  │ Interest-bearing│  │                 │  │                       │     │
│  │ receipt token   │  │ Debt tracking   │  │  ERC20                │     │
│  │                 │  │ token           │  │                       │     │
│  └─────────────────┘  └─────────────────┘  └───────────────────────┘     │
│         ▲                      ▲                       ▲                 │
│         │ Mints/Burns          │ Mints/Burns           │ Transfer        │
│         │                      │                       │                 │
└─────────┴──────────────────────┴───────────────────────┴─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      SUPPORTING CONTRACTS                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────────┐    │
│  │InterestRate     │  │  PriceOracle    │  │  ReserveLogic.sol    │    │
│  │Strategy.sol     │  │  .sol           │  │                      │    │
│  │                 │  │                 │  │  (Interest Rate      │    │
│  │ Calculate rates │  │  Get asset      │  │   calculations)      │    │
│  │ based on        │  │  prices         │  │                      │    │
│  │ utilization     │  │                 │  │                      │    │
│  └─────────────────┘  └─────────────────┘  └──────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          DATA STORAGE                                     │
│  ┌──────────────────────────────────────────────────────────────┐        │
│  │  mapping(address => ReserveData) reserves                    │        │
│  │  mapping(address => UserConfigurationMap) userConfigs        │        │
│  │                                                              │        │
│  │  ReserveData {                                               │        │
│  │    liquidityIndex, variableBorrowIndex                       │        │
│  │    aTokenAddress, debtTokenAddress                           │        │
│  │    totalLiquidity, totalDebt                                 │        │
│  │  }                                                           │        │
│  └──────────────────────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Diagrams

### 1️⃣ SUPPLY Flow (Deposit Assets)

```
User                Pool.sol          SupplyLogic       AToken         Underlying Token
 │                     │                   │              │                  │
 │  supply(DAI, 100)   │                   │              │                  │
 ├────────────────────>│                   │              │                  │
 │                     │                   │              │                  │
 │                     │ executeSupply()   │              │                  │
 │                     ├──────────────────>│              │                  │
 │                     │                   │              │                  │
 │                     │                   │ Validate     │                  │
 │                     │                   │ (amount > 0) │                  │
 │                     │                   │              │                  │
 │                     │                   │ transferFrom(user, aToken, 100)│
 │                     │                   ├─────────────────────────────────>
 │                     │                   │              │                  │
 │                     │                   │   mint(user, 100)              │
 │                     │                   ├─────────────>│                  │
 │                     │                   │              │                  │
 │                     │                   │<─────────────┤                  │
 │                     │                   │   aDAI tokens minted            │
 │                     │                   │              │                  │
 │                     │                   │ Update interest rates           │
 │                     │                   │ Update reserves data            │
 │                     │                   │              │                  │
 │                     │<──────────────────┤              │                  │
 │<────────────────────┤                   │              │                  │
 │   Emit Supply()     │                   │              │                  │
 │   event             │                   │              │                  │
```

**What happens:**
1. User calls `supply()` with asset address and amount
2. Pool transfers underlying tokens from user to aToken contract
3. AToken mints receipt tokens to user (scaled by liquidity index)
4. Interest rates recalculated based on new utilization
5. Reserve data updated (total liquidity increased)

---

### 2️⃣ BORROW Flow

```
User              Pool.sol        BorrowLogic    ValidationLogic  VariableDebtToken  Underlying
 │                   │                 │                │                │              │
 │ borrow(DAI, 50)   │                 │                │                │              │
 ├──────────────────>│                 │                │                │              │
 │                   │                 │                │                │              │
 │                   │ executeBorrow() │                │                │              │
 │                   ├────────────────>│                │                │              │
 │                   │                 │                │                │              │
 │                   │                 │ validateBorrow()│                │              │
 │                   │                 ├───────────────>│                │              │
 │                   │                 │                │                │              │
 │                   │                 │ Check:         │                │              │
 │                   │                 │ • Health Factor > 1            │              │
 │                   │                 │ • Collateral sufficient        │              │
 │                   │                 │ • Amount available │           │              │
 │                   │                 │                │                │              │
 │                   │                 │<───────────────┤                │              │
 │                   │                 │ Validation OK  │                │              │
 │                   │                 │                │                │              │
 │                   │                 │ mint(user, 50 debt tokens)     │              │
 │                   │                 ├───────────────────────────────>│              │
 │                   │                 │                │                │              │
 │                   │                 │ transfer(user, 50 DAI)          │              │
 │                   │                 ├────────────────────────────────────────────────>
 │                   │                 │                │                │              │
 │                   │                 │ Update interest rates           │              │
 │                   │                 │ Update user debt                │              │
 │                   │                 │                │                │              │
 │                   │<────────────────┤                │                │              │
 │<──────────────────┤                 │                │                │              │
 │  50 DAI received  │                 │                │                │              │
```

**What happens:**
1. User calls `borrow()` specifying asset and amount
2. ValidationLogic checks:
   - User has sufficient collateral
   - Health Factor > 1.0 (not liquidatable)
   - Enough liquidity available
3. VariableDebtToken mints debt tokens to user
4. Underlying tokens transferred from aToken to user
5. Interest rates updated (utilization increased)

**Health Factor Formula:**
```
Health Factor = (Collateral Value × Liquidation Threshold) / Total Debt
```
Example: 
- Collateral: $1000 worth of ETH (LT = 80%)
- Debt: $500 DAI
- Health Factor = (1000 × 0.8) / 500 = 1.6 ✅ (Safe)

---

### 3️⃣ WITHDRAW Flow

```
User             Pool.sol      SupplyLogic    ValidationLogic    AToken      Underlying
 │                  │               │               │              │              │
 │ withdraw(DAI,50) │               │               │              │              │
 ├─────────────────>│               │               │              │              │
 │                  │               │               │              │              │
 │                  │executeWithdraw│               │              │              │
 │                  ├──────────────>│               │              │              │
 │                  │               │               │              │              │
 │                  │               │validateWithdraw()           │              │
 │                  │               ├──────────────>│              │              │
 │                  │               │               │              │              │
 │                  │               │ Check:        │              │              │
 │                  │               │ • If borrowing, HF > 1       │              │
 │                  │               │ • Enough liquidity           │              │
 │                  │               │               │              │              │
 │                  │               │<──────────────┤              │              │
 │                  │               │               │              │              │
 │                  │               │ burn(user, aToken, 50)       │              │
 │                  │               ├─────────────────────────────>│              │
 │                  │               │               │              │              │
 │                  │               │               │              │ transfer(user, 50)
 │                  │               │               │              ├──────────────>
 │                  │               │               │              │              │
 │                  │               │ Update rates & reserve data  │              │
 │                  │               │               │              │              │
 │                  │<──────────────┤               │              │              │
 │<─────────────────┤               │               │              │              │
 │  50 DAI received │               │               │              │              │
```

**What happens:**
1. User calls `withdraw()` with asset and amount
2. Validation checks if withdrawal would break health factor
3. AToken burns user's aTokens
4. Underlying tokens transferred from aToken to user
5. Rates and reserves updated

---

### 4️⃣ LIQUIDATION Flow (When Health Factor < 1)

```
Liquidator      Pool.sol    LiquidationLogic  ValidationLogic  User (Underwater)
 │                 │               │                  │              │
 │ liquidate()     │               │                  │              │
 │ (user, DAI,     │               │                  │              │
 │  ETH, 100)      │               │                  │              │
 ├────────────────>│               │                  │              │
 │                 │               │                  │              │
 │                 │executeLiquidation()             │              │
 │                 ├──────────────>│                  │              │
 │                 │               │                  │              │
 │                 │               │validateLiquidation()           │
 │                 │               ├─────────────────>│              │
 │                 │               │                  │              │
 │                 │               │ Check:           │              │
 │                 │               │ • User HF < 1    │              │
 │                 │               │ • Amount valid   │              │
 │                 │               │                  │              │
 │                 │               │<─────────────────┤              │
 │                 │               │                  │              │
 │                 │               │ Calculate liquidation bonus     │
 │                 │               │ (e.g., 5% extra collateral)     │
 │                 │               │                  │              │
 │                 │               │ Repay 100 DAI debt for user     │
 │                 │               │ (from liquidator)               │
 │                 │               │                  │              │
 │                 │               │ Transfer 105 DAI worth of ETH   │
 │                 │               │ from user to liquidator         │
 │                 │               │                  │              │
 │                 │<──────────────┤                  │              │
 │<────────────────┤               │                  │              │
 │ Received bonus  │               │                  │              │
 │ collateral      │               │                  │              │
```

**What happens:**
1. Anyone can liquidate an underwater position (HF < 1)
2. Liquidator repays portion of user's debt
3. Liquidator receives user's collateral + bonus (e.g., 5%)
4. User's health factor improved
5. Protocol stays solvent

**Example:**
- User has: $1000 ETH collateral, $900 DAI debt (HF < 1)
- Liquidator repays: $500 DAI
- Liquidator receives: $525 worth of ETH (5% bonus)
- User now has: $475 ETH, $400 DAI debt (HF improved)

---

## 📦 Required Contracts for MVP

### **TIER 1: Core Contracts (Must Have)**

#### 1. **Pool.sol**
**Purpose:** Main entry point for all user interactions
**Functions:**
```solidity
function supply(address asset, uint256 amount, address onBehalfOf) external
function withdraw(address asset, uint256 amount, address to) external  
function borrow(address asset, uint256 amount, address onBehalfOf) external
function repay(address asset, uint256 amount, address onBehalfOf) external
function liquidationCall(address collateral, address debt, address user, uint256 debtToCover) external
```
**Storage:**
```solidity
mapping(address => ReserveData) internal _reserves;  // asset => reserve data
mapping(address => UserConfigurationMap) internal _usersConfig;  // user => config
mapping(uint256 => address) internal _reservesList;  // id => asset address
```

#### 2. **AToken.sol**
**Purpose:** Interest-bearing receipt token (like aUSDC, aDAI)
**Key Features:**
- ERC20 token that auto-compounds interest
- Uses "scaled balance" (balance / liquidityIndex)
- When you check balance, it calculates: scaledBalance × currentLiquidityIndex
```solidity
function mint(address user, uint256 amount, uint256 index) external returns (bool)
function burn(address user, uint256 amount, uint256 index) external returns (bool)
function scaledBalanceOf(address user) external view returns (uint256)
function balanceOf(address user) external view returns (uint256)  // auto-compounds!
```

#### 3. **VariableDebtToken.sol**
**Purpose:** Tracks borrowing debt (grows over time with interest)
**Key Features:**
- Non-transferrable ERC20
- Debt auto-compounds
- Uses scaled balance like AToken
```solidity
function mint(address user, uint256 amount, uint256 index) external returns (uint256)
function burn(address user, uint256 amount, uint256 index) external returns (uint256)
```

#### 4. **ReserveLogic.sol**
**Purpose:** Library for interest rate calculations and reserve updates
**Key Functions:**
```solidity
function updateState(ReserveData storage reserve) internal
function updateInterestRates(ReserveData storage reserve, address asset, uint256 liquidityAdded, uint256 liquidityTaken) internal
function getNormalizedIncome(ReserveData storage reserve) internal view returns (uint256)
function getNormalizedDebt(ReserveData storage reserve) internal view returns (uint256)
```

---

### **TIER 2: Logic Libraries (Must Have)**

#### 5. **SupplyLogic.sol**
```solidity
function executeSupply(
    mapping(address => ReserveData) storage reservesData,
    DataTypes.ExecuteSupplyParams memory params
) external
function executeWithdraw(...) external
```

#### 6. **BorrowLogic.sol**
```solidity
function executeBorrow(
    mapping(address => ReserveData) storage reservesData,
    DataTypes.ExecuteBorrowParams memory params
) external
function executeRepay(...) external
```

#### 7. **ValidationLogic.sol**
**Purpose:** All safety checks
```solidity
function validateSupply(...) internal view
function validateBorrow(...) internal view  
function validateWithdraw(...) internal view
function validateLiquidationCall(...) internal view
function validateHealthFactor(uint256 healthFactor) internal pure
```

#### 8. **LiquidationLogic.sol**
```solidity
function executeLiquidationCall(
    mapping(address => ReserveData) storage reservesData,
    DataTypes.ExecuteLiquidationCallParams memory params
) external
```

---

### **TIER 3: Supporting Contracts**

#### 9. **InterestRateStrategy.sol**
**Purpose:** Calculate borrow and supply rates based on utilization
```solidity
function calculateInterestRates(
    uint256 totalDebt,
    uint256 totalLiquidity,
    uint256 reserveFactor
) external view returns (uint256 liquidityRate, uint256 borrowRate)
```

**Formula (Simplified):**
```
Utilization Rate = Total Debt / (Total Liquidity + Total Debt)

If Utilization < Optimal (e.g., 80%):
  Borrow Rate = Base Rate + (Utilization / Optimal) × Slope1

If Utilization > Optimal:
  Borrow Rate = Base Rate + Slope1 + ((Utilization - Optimal) / (1 - Optimal)) × Slope2

Supply Rate = Borrow Rate × Utilization × (1 - Reserve Factor)
```

#### 10. **PriceOracle.sol** (Can use mock for MVP)
**Purpose:** Get asset prices for health factor calculations
```solidity
function getAssetPrice(address asset) external view returns (uint256)
```
For MVP, can hardcode: 1 ETH = $2000, 1 DAI = $1

#### 11. **DataTypes.sol**
**Purpose:** Struct definitions
```solidity
struct ReserveData {
    ReserveConfigurationMap configuration;
    uint128 liquidityIndex;
    uint128 currentLiquidityRate;
    uint128 variableBorrowIndex;
    uint128 currentVariableBorrowRate;
    uint40 lastUpdateTimestamp;
    address aTokenAddress;
    address variableDebtTokenAddress;
    // ... more fields
}

struct UserConfigurationMap {
    uint256 data;  // bitmap of collateral/borrowing
}
```

---

## 🔢 Key Mathematical Concepts

### Interest Accrual (Compound Interest)

**Liquidity Index (for suppliers):**
```
newLiquidityIndex = oldLiquidityIndex × (1 + liquidityRate × timeDelta)
```

**Borrow Index (for borrowers):**
```
newBorrowIndex = oldBorrowIndex × (1 + borrowRate × timeDelta)
```

**User's Actual Balance:**
```
actualBalance = scaledBalance × currentIndex / RAY
```
Where RAY = 10^27 (27 decimal precision)

### Health Factor Calculation

```solidity
struct UserAccountData {
    uint256 totalCollateralInBaseCurrency;
    uint256 totalDebtInBaseCurrency;
    uint256 availableBorrowsInBaseCurrency;
    uint256 currentLiquidationThreshold;
    uint256 ltv;
    uint256 healthFactor;
}

healthFactor = (totalCollateral × liquidationThreshold / 100) / totalDebt

// Example:
// Collateral: $1000 ETH (LT = 80%)
// Debt: $500 DAI
// HF = (1000 × 80) / 500 / 100 = 1.6

// If HF < 1.0 → User can be liquidated
// If HF < 1.05 → Close to liquidation
// If HF > 2.0 → Very safe
```

---

## 🎯 MVP Implementation Checklist

### Phase 1: Basic Structure (Day 1-2)
- [ ] Create DataTypes.sol with core structs
- [ ] Create ReserveConfiguration library (bitmap operations)
- [ ] Create UserConfiguration library
- [ ] Create simple Math libraries (WadRayMath)

### Phase 2: Core Contracts (Day 3-5)
- [ ] Implement AToken.sol (scaled balances)
- [ ] Implement VariableDebtToken.sol
- [ ] Implement ReserveLogic.sol (interest calculations)
- [ ] Create mock PriceOracle

### Phase 3: Logic Libraries (Day 6-8)
- [ ] Implement ValidationLogic.sol
- [ ] Implement SupplyLogic.sol
- [ ] Implement BorrowLogic.sol
- [ ] Implement LiquidationLogic.sol

### Phase 4: Main Pool (Day 9-10)
- [ ] Implement Pool.sol
- [ ] Wire all libraries together
- [ ] Implement InterestRateStrategy

### Phase 5: Testing (Day 11-14)
- [ ] Test supply/withdraw flows
- [ ] Test borrow/repay flows
- [ ] Test liquidation scenarios
- [ ] Test interest accrual over time

---

## 🚀 Simplifications for MVP

**Remove these Aave features initially:**
1. ❌ Flash Loans
2. ❌ Isolation Mode  
3. ❌ eMode (Efficiency Mode)
4. ❌ Virtual Accounting (add in v2)
5. ❌ Credit Delegation
6. ❌ Multi-collateral (start with just 2 assets: ETH + DAI)
7. ❌ Stable rate borrowing (deprecated anyway)
8. ❌ L2 specific features
9. ❌ Permit functions
10. ❌ Governance/upgradeability (make immutable first)

**Keep it simple:**
- Only variable rate borrowing
- Only 2 assets (ETH as collateral, DAI as borrowing)
- Fixed liquidation bonus (5%)
- Fixed reserve factor (10%)
- Simple linear interest rate model

---

## 📖 Code Reading Order for MVP

1. **DataTypes.sol** - Understand data structures
2. **ReserveLogic.sol** - Understand interest calculations  
3. **ValidationLogic.sol** - Understand safety checks
4. **AToken.sol** - Understand scaled balances
5. **SupplyLogic.sol** - Understand supply flow
6. **BorrowLogic.sol** - Understand borrow flow
7. **Pool.sol** - See how it all connects
8. **InterestRateStrategy.sol** - Understand rate model

---

## 💻 Starter Test Scenario

```solidity
// 1. Alice supplies 10 ETH
pool.supply(ETH, 10 ether, alice);
// Alice receives 10 aETH

// 2. Bob supplies 5000 DAI  
pool.supply(DAI, 5000 ether, bob);
// Bob receives 5000 aDAI

// 3. Alice borrows 1000 DAI (collateral: 10 ETH = $20,000)
// Max borrow at 80% LTV = $16,000 DAI
pool.borrow(DAI, 1000 ether, alice);
// Alice's HF = (20000 × 0.8) / 1000 = 16.0 (very safe)

// 4. Wait 1 year...
// Alice's aETH grows with supply interest
// Alice's debt grows with borrow interest

// 5. ETH price drops to $1000
// Alice's collateral now $10,000
// Alice's HF = (10000 × 0.8) / 1000 = 8.0 (still safe)

// 6. ETH drops to $1200
// Alice's HF = (12000 × 0.8) / 1000 = 0.96 (< 1.0!)
// Charlie can liquidate Alice
pool.liquidationCall(ETH, DAI, alice, 500 ether);
// Charlie repays 500 DAI, gets 525 DAI worth of ETH (5% bonus)
```

---

## 🎓 Next Steps After MVP

Once your MVP works:
1. Add flash loans
2. Add multi-asset support
3. Add virtual accounting (security)
4. Add sophisticated interest rate model
5. Add governance
6. Add upgradeability
7. Professional audit

Would you like me to create actual Solidity starter contracts for any of these components?
