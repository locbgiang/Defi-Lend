# 🎯 Lending Protocol MVP - Quick Reference

## Core Concept: The "Three Token" System

```
┌─────────────────────────────────────────────────────────────┐
│                    THE THREE TOKENS                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. UNDERLYING TOKEN (e.g., DAI)                            │
│     • The actual asset (ERC20)                              │
│     • What users deposit and borrow                         │
│                                                              │
│  2. aToken (e.g., aDAI)                                     │
│     • Receipt token for deposits                            │
│     • Balance GROWS automatically (interest!)               │
│     • Can be transferred                                    │
│     • Redeemable 1:1 for underlying                         │
│                                                              │
│  3. DEBT TOKEN (e.g., variableDebtDAI)                      │
│     • Tracks what you owe                                   │
│     • Balance GROWS automatically (interest!)               │
│     • NON-transferrable                                     │
│     • Must be repaid                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 5-Minute Understanding

### The Magic of Scaled Balances ✨

Instead of updating everyone's balance every second (gas nightmare), Aave uses **indexes**:

```
Your Actual Balance = Your Scaled Balance × Current Index

Example:
• Day 1: Deposit 100 DAI
  - Scaled Balance: 100
  - Liquidity Index: 1.0
  - Actual Balance: 100 × 1.0 = 100 DAI

• Day 365: (10% APY)
  - Scaled Balance: 100 (unchanged!)
  - Liquidity Index: 1.1 (grew with interest)
  - Actual Balance: 100 × 1.1 = 110 DAI 🎉

No gas spent! Your balance just "magically" grows.
```

### The 4 Core Operations

```
┌──────────────────────────────────────────────────────────────┐
│ 1. SUPPLY (Deposit)                                          │
├──────────────────────────────────────────────────────────────┤
│ Input:  100 DAI                                              │
│ Action: Transfer DAI to pool                                 │
│ Output: Receive 100 aDAI (grows with interest)               │
│ Status: You're now earning interest! 📈                      │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ 2. BORROW (Take loan)                                        │
├──────────────────────────────────────────────────────────────┤
│ Input:  Request 1000 DAI                                     │
│ Check:  Do you have collateral? (e.g., 10 ETH = $20k)       │
│ Action: Mint debt tokens, send you DAI                      │
│ Output: You receive 1000 DAI + 1000 debtDAI                 │
│ Status: You're paying interest 📉                            │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ 3. WITHDRAW (Get your money back)                            │
├──────────────────────────────────────────────────────────────┤
│ Input:  Burn 110 aDAI (your balance with interest)          │
│ Check:  Health Factor still > 1? (if you have debt)         │
│ Action: Burn aDAI, send you underlying                      │
│ Output: Receive 110 DAI (100 principal + 10 interest)       │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ 4. REPAY (Pay back loan)                                     │
├──────────────────────────────────────────────────────────────┤
│ Input:  1050 DAI (1000 principal + 50 interest)             │
│ Action: Transfer DAI to pool, burn debt tokens              │
│ Output: Debt cleared! Collateral freed up                   │
└──────────────────────────────────────────────────────────────┘
```

## Health Factor - The Most Important Number

```
┌─────────────────────────────────────────────────────────────┐
│              HEALTH FACTOR SCALE                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  > 2.0  ████████████████ VERY SAFE (Can borrow more!)      │
│                                                              │
│  1.5    ████████████     SAFE                               │
│                                                              │
│  1.2    ████████         OKAY (Watch it...)                 │
│                                                              │
│  1.05   ████             DANGER ZONE ⚠️                      │
│                                                              │
│  < 1.0  ██               LIQUIDATION! 💀                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Formula:
HF = (Collateral Value × Liquidation Threshold) / Total Debt

Example:
• Collateral: $10,000 ETH (LT = 80%)
• Debt: $5,000 DAI
• HF = (10,000 × 0.80) / 5,000 = 1.6 ✅

If ETH drops to $6,000:
• HF = (6,000 × 0.80) / 5,000 = 0.96 ❌ LIQUIDATABLE!
```

## Interest Rate Model

```
┌─────────────────────────────────────────────────────────────┐
│                  UTILIZATION RATE                            │
└─────────────────────────────────────────────────────────────┘

Utilization = Total Borrowed / Total Supply

  0% ├──────────────────────────────────────────────┤ 100%
     │                                              │
     │         ┌─ Optimal (80%)                     │
     │         │                                    │
     │   Slope1│  Slope2 (steep!)                   │
     │        /│ /                                  │
 Rate│       / │/                                   │
     │      /  /                                    │
     │     /  /                                     │
     │    /  /                                      │
     │___/__/___________________________________    │
         80%

• Low utilization (0-80%): Gradual rate increase
• High utilization (80-100%): STEEP increase
  (Incentivizes repayment to free up liquidity)

Supply Rate = Borrow Rate × Utilization × (1 - Reserve Factor)
```

## Liquidation Example

```
🎭 CHARACTERS:
• Alice: Borrower (underwater)
• Bob: Liquidator (profit seeker)

📅 TIMELINE:

Day 1: Alice's Position
├─ Collateral: 10 ETH ($20,000)
├─ Borrowed: $8,000 DAI
└─ Health Factor: 2.0 ✅

Day 30: ETH Price Drops
├─ Collateral: 10 ETH ($12,000)
├─ Borrowed: $8,100 DAI (with interest)
└─ Health Factor: 0.98 ❌ (Below 1.0!)

Day 30: Bob Liquidates
├─ Bob pays: $4,000 DAI (50% of debt)
├─ Bob receives: $4,200 ETH (5% bonus!)
├─ Bob's profit: $200
└─ Alice's new HF: 1.3 ✅ (Saved from full liquidation)

🎯 Result:
• Protocol stays solvent ✅
• Alice keeps some collateral ✅  
• Bob makes profit ✅
• Everybody wins (except Alice's pride)
```

## Minimal Contract Set (7 Files)

```
src/
├── Pool.sol                    # Main contract (entry point)
├── AToken.sol                  # Interest-bearing receipt token
├── VariableDebtToken.sol       # Debt tracking token
├── InterestRateStrategy.sol    # Calculate rates
└── libraries/
    ├── SupplyLogic.sol         # Supply/withdraw logic
    ├── BorrowLogic.sol         # Borrow/repay logic
    ├── ValidationLogic.sol     # All safety checks
    └── ReserveLogic.sol        # Interest calculations
```

## Test Scenario (Copy-Paste Ready)

```solidity
// 1. Setup: Deploy pool with ETH and DAI
// ETH: $2000, LTV=80%, Liquidation Threshold=85%
// DAI: $1, LTV=75%

// 2. Alice supplies 10 ETH collateral
pool.supply(ETH, 10 ether, alice);
// Alice gets: 10 aETH
// Pool liquidity: 10 ETH

// 3. Bob supplies 5000 DAI (to provide borrow liquidity)
pool.supply(DAI, 5000 ether, bob);
// Bob gets: 5000 aDAI
// Pool liquidity: 10 ETH + 5000 DAI

// 4. Alice borrows 1000 DAI (against her ETH)
pool.borrow(DAI, 1000 ether, alice);
// Alice gets: 1000 DAI
// Alice's debt: 1000 debtDAI
// Alice's HF: (20000 × 0.85) / 1000 = 17.0 ✅

// 5. Time passes... interest accrues
vm.warp(block.timestamp + 365 days);

// 6. Check Alice's new balances (AUTO-COMPOUNDED!)
assertGt(aETH.balanceOf(alice), 10 ether);  // Earned interest!
assertGt(debtDAI.balanceOf(alice), 1000 ether);  // Debt grew!

// 7. Alice repays (must repay current debt, not original)
uint256 debt = debtDAI.balanceOf(alice);  // e.g., 1050 DAI
pool.repay(DAI, debt, alice);
// Alice's debt: 0

// 8. Alice withdraws all (original + interest)
pool.withdraw(ETH, type(uint256).max, alice);
// Alice receives: ~10.05 ETH (earned ~0.05 ETH interest)
```

## Common Gotchas for Beginners

### 1. Scaled vs Actual Balances
```solidity
❌ Wrong:
uint256 balance = aToken.scaledBalanceOf(user);  // This doesn't grow!

✅ Correct:
uint256 balance = aToken.balanceOf(user);  // This auto-compounds!
```

### 2. Interest Accrues on Every Action
```solidity
// Before any operation, MUST update state:
reserve.updateState();  // Recalculates indexes
// THEN do your logic
```

### 3. Health Factor Check Timing
```solidity
// After withdraw or borrow:
require(healthFactor >= 1e18, "Undercollateralized");
// Health factor uses 18 decimals (1e18 = 1.0)
```

### 4. Ray Math (27 Decimals!)
```solidity
uint256 constant RAY = 1e27;

// Multiply:
result = (a * b) / RAY;

// Divide:
result = (a * RAY) / b;
```

## Key Parameters to Configure

```solidity
struct ReserveConfig {
    uint16 ltv;                    // 8000 = 80%
    uint16 liquidationThreshold;   // 8500 = 85%
    uint16 liquidationBonus;       // 10500 = 105% (5% bonus)
    uint256 reserveFactor;         // 1000 = 10%
    bool usageAsCollateralEnabled; // true
    bool borrowingEnabled;         // true
    bool isActive;                 // true
}
```

## Security Checklist ✅

- [ ] Reentrancy guards on external calls
- [ ] Check for zero addresses
- [ ] Validate amounts > 0
- [ ] Update state before external calls (CEI pattern)
- [ ] Health factor check after borrows/withdraws
- [ ] Only Pool can mint/burn aTokens and debt tokens
- [ ] Debt tokens are non-transferrable
- [ ] Liquidation bonus is reasonable (<10%)
- [ ] Interest rate caps prevent manipulation
- [ ] Price oracle has staleness check

## Debugging Tips

```solidity
// Add these view functions to your Pool:

function debugUserPosition(address user) external view returns (
    uint256 totalCollateral,
    uint256 totalDebt,
    uint256 healthFactor,
    uint256 ltv
) {
    // Calculate and return all important metrics
}

function debugReserve(address asset) external view returns (
    uint256 availableLiquidity,
    uint256 totalDebt,
    uint256 liquidityRate,
    uint256 borrowRate,
    uint256 utilizationRate
) {
    // Return current reserve state
}
```

## When Something Goes Wrong

```
Error: "Health factor too low"
→ User doesn't have enough collateral
→ Check: collateral value vs debt value
→ Fix: Supply more collateral OR repay debt

Error: "Not enough liquidity"
→ Pool doesn't have underlying tokens
→ Check: aToken's underlying balance
→ Fix: Wait for repayments OR add more liquidity

Error: "Reserve not active"
→ Asset not initialized in pool
→ Fix: Call initReserve() first

Error: "Index overflow"
→ Interest accumulated too long without update
→ Fix: Call updateState() periodically
```

## Resources

**Read these Aave files in order:**
1. `/src/contracts/protocol/libraries/types/DataTypes.sol` - Structs
2. `/src/contracts/interfaces/IPool.sol` - Main interface
3. `/src/contracts/protocol/tokenization/AToken.sol` - Receipt tokens
4. `/src/contracts/protocol/libraries/logic/ReserveLogic.sol` - Math
5. `/src/contracts/protocol/pool/Pool.sol` - Orchestration

**Math Reference:**
- 1e18 = WAD (18 decimals) - for token amounts
- 1e27 = RAY (27 decimals) - for rates and indexes
- 1e4 = Percentage base (10000 = 100%)

**Good test patterns:**
```solidity
// Test interest accrual
skip(365 days);
assertGt(balanceAfter, balanceBefore);

// Test liquidation
_setPrice(ETH, lowPrice);
vm.prank(liquidator);
pool.liquidationCall(...);

// Test health factor
uint256 hf = pool.getUserHealthFactor(user);
assertGt(hf, 1e18);  // Must be > 1.0
```

---

## 🚀 Start Building!

1. Read `MVP_ARCHITECTURE.md` for detailed diagrams
2. Start with `AToken.sol` (simpler than Pool)
3. Test each component in isolation
4. Wire them together in `Pool.sol`
5. Write integration tests
6. Deploy to testnet
7. Find a security researcher
8. **Never deploy without audit**

Good luck! 🎉
