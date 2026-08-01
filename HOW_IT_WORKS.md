# 🔗 How Defi-Lend Works — Frontend ↔ Smart Contracts

This document explains how every piece of this repository connects together: from the
Solidity contracts deployed on-chain, to the React/Wagmi frontend that talks to them.

---

## 1. The Big Picture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              client/  (React App)                           │
│                                                                             │
│  React Pages/Components  →  Hooks (useMarkets, usePool)  →  wagmi (viem)    │
│  Dashboard, Markets,         read/write contract calls        RPC client    │
│  Supply, Borrow,                                                            │
│  Liquidation                                                                │
└────────────────────────────────────────┬────────────────────────────────────┘
                                         │ JSON-RPC (via Sepolia / injected wallet)
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         contracts/  (Solidity / Foundry)                    │
│                                                                             │
│   Pool.sol  ── main entry point (supply/withdraw/borrow/repay/liquidate)    │
│     │                                                                       │
│     ├── AToken.sol             (interest-bearing receipt token, per asset)  │
│     ├── VariableDebtToken.sol  (tracks how much a user owes, per asset)     │
│     ├── PriceOracle.sol        (asset → USD price, via Chainlink feeds)     │
│     └── WETHGateway.sol        (wraps/unwraps ETH so users can use native   │
│                                  ETH instead of WETH directly)              │
└─────────────────────────────────────────────────────────────────────────────┘
```

The **frontend never contains business logic** for interest, health factor, or
liquidation math — it only *reads* data the contracts expose (via `getUserAccountData`,
`reserves(asset)`, token `balanceOf`, etc.) and *sends transactions* to the same
functions. All the actual lending rules live in `contracts/src/`.

---

## 2. Smart Contract Layer (`contracts/src`)

| Contract | Responsibility |
|---|---|
| `Pool.sol` | The single entry point users/frontend interact with. Holds `reserves` mapping (per-asset config: aToken address, debt token address, LTV, liquidation threshold/bonus). Implements `supply`, `withdraw`, `borrow`, `repay`, `liquidationCall`, and `getUserAccountData` (health factor calculation). |
| `AToken.sol` | ERC20 "receipt" token. Minted 1:1 when a user supplies an asset, burned on withdraw. Represents claim on the underlying asset held by the pool. |
| `VariableDebtToken.sol` | ERC20-like token minted when a user borrows, burned when they repay. Represents how much a user owes for a given asset. |
| `PriceOracle.sol` | Wraps Chainlink `AggregatorV3Interface` price feeds to convert asset amounts into a common USD base for health-factor math. |
| `WETHGateway.sol` | Convenience contract so users can supply/withdraw/borrow/repay using native ETH; it wraps/unwraps WETH under the hood and forwards calls to `Pool`. |

### Core flow inside `Pool.sol`

1. **`initReserve`** (owner-only, one-time setup per asset) — registers an asset's
   `aTokenAddress`, `variableDebtTokenAddress`, `ltv`, `liquidationThreshold`,
   `liquidationBonus`, and marks it `isActive`.
2. **`supply(asset, amount, onBehalfOf)`** — transfers the underlying token from the
   user into the `AToken` contract, then mints `AToken`s to `onBehalfOf`.
3. **`borrow(asset, amount, onBehalfOf)`** — mints `VariableDebtToken`s to record the
   debt, checks the resulting health factor is ≥ 1e18 (1.0), then transfers the
   underlying asset out of the `AToken` contract to the borrower.
4. **`repay`** — transfers underlying tokens back into the `AToken` contract and burns
   the corresponding debt tokens.
5. **`withdraw`** — burns `AToken`s and transfers the underlying asset back to the user.
6. **`getUserAccountData(user)`** — loops over every registered reserve, sums the
   user's aToken/debt balances (converted to a common USD base via `PriceOracle`), and
   computes:
   - `totalCollateralBase`, `totalDebtBase`
   - weighted `ltv`, `currentLiquidationThreshold`
   - `availableBorrowsBase`
   - `healthFactor = (collateral × liquidationThreshold) / debt`
7. **`liquidationCall`** — if a user's health factor drops below `1e18`, anyone can
   repay up to 50% of their debt (`closeFactor`) in exchange for their collateral plus
   a liquidation bonus (e.g. 5%).

These functions emit events (`Supply`, `Withdraw`, `Borrow`, `Repay`,
`ReserveInitialized`) that the frontend/indexers can listen to.

---

## 3. Frontend Layer (`client/src`)

### Configuration

- **`config/wagmi.ts`** — sets up the wagmi/viem client (chain = Sepolia, connectors
  for wallets like MetaMask/WalletConnect).
- **`config/contracts.ts`** — hardcodes deployed contract **addresses** (Pool,
  PriceOracle, WETHGateway, each token + its aToken) and the **ABIs** (`POOL_ABI`,
  `ERC20_ABI`, `PRICE_ORACLE_ABI`) needed to call them. This is the bridge that maps
  on-chain deployments to frontend calls — whenever contracts are redeployed
  (see `contracts/script/Deploy*.s.sol`), these addresses must be updated here.
- **`config/tokens.ts`** — static metadata about supported tokens (symbol, decimals,
  icon, etc.) used for display.

### Hooks — talk directly to the chain

- **`hooks/useMarkets.ts`** — for each supported asset, batches `useReadContracts`
  calls to `Pool.reserves(asset)`, token `totalSupply`, `PriceOracle.getAssetPrice`,
  etc., and derives display data (APY, utilization rate, available liquidity) used by
  the Markets page.
- **`hooks/usePool.ts`** — 
  - `useUserAccountData(userAddress)` calls `Pool.getUserAccountData` and maps the
    tuple response to a typed `UserAccountData` object (collateral, debt, health
    factor...).
  - `useUserBalances(userAddress)` batches wallet/aToken/debt-token `balanceOf` calls
    across all markets to show what a connected wallet has supplied/borrowed.
  - (further down in the file) write hooks wrap `useWriteContract` for `supply`,
    `withdraw`, `borrow`, `repay` — these are what the Supply/Borrow components call
    when a user submits a transaction.

### Components / Pages (`components/`)

| Component | Purpose |
|---|---|
| `Header.tsx` + `WalletButton.tsx` | Top nav + wallet connect/disconnect (via wagmi connectors). |
| `Dashboard.tsx` | Shows the connected user's account summary — pulls from `useUserAccountData` + `useUserBalances`. |
| `Markets.tsx` | Lists all reserves/assets and their stats — pulls from `useMarkets`. |
| `Supply.tsx` | Form to deposit an asset → calls `Pool.supply` (or `WETHGateway` for ETH). |
| `Borrow.tsx` | Form to borrow an asset against collateral → calls `Pool.borrow`. |
| `Liquidation.tsx` | Lists unhealthy positions (health factor < 1) and lets a liquidator call `Pool.liquidationCall`. |
| `ToastContainer.tsx` + `context/ToastContext.tsx` | Global toast notifications for tx pending/success/error feedback. |

### App shell

`App.tsx` wires everything together: `WagmiProvider` (blockchain connectivity) →
`QueryClientProvider` (react-query, used internally by wagmi for caching reads) →
`ToastProvider` (UI feedback) → `BrowserRouter` with routes to each page.

---

## 4. End-to-End Example: Supplying USDC

```
User clicks "Supply" in Supply.tsx
        │
        ▼
usePool's write hook calls useWriteContract({
   address: CONTRACTS.POOL,
   abi: POOL_ABI,
   functionName: 'supply',
   args: [USDC_ADDRESS, amount, userAddress]
})
        │
        ▼  (wallet prompts user to sign & broadcast tx)
Pool.sol#supply()
   1. Checks reserves[USDC].isActive
   2. IERC20(USDC).safeTransferFrom(user, aUSDC contract, amount)
   3. AToken(aUSDC).mint(user, amount)
   4. emit Supply(...)
        │
        ▼
Frontend refetches (react-query invalidation / refetch())
useUserBalances + useUserAccountData re-run → Dashboard updates
with new aUSDC balance and updated health factor.
```

The same request/response pattern applies to `withdraw`, `borrow`, `repay`, and
`liquidationCall` — UI form → wagmi write → `Pool.sol` function → state change +
event → UI refetches read hooks to reflect the new state.

---

## 5. Deployment Glue (`contracts/script`)

- `HelperConfig.s.sol` — picks network-specific config (e.g., Sepolia Chainlink feed
  addresses).
- `DeployPool.s.sol` — deploys `Pool`, `PriceOracle`, and per-asset `AToken`/
  `VariableDebtToken` pairs, then calls `initReserve` for each market.
- `DeployWETHGateway.s.sol` / `DeployWETHMarket.s.sol` — deploy/configure the WETH
  convenience path.
- `SetWETHPrice.s.sol` — pushes a manual price for testing when a live feed isn't
  available.

After running these scripts, the resulting addresses are copied into
`client/src/config/contracts.ts` so the frontend knows where to send transactions —
this is the critical link between the two halves of the repo.

---

## 6. Summary

- **Contracts** (`contracts/src`) define *what* lending/borrowing/liquidation rules
  exist and store all state on-chain.
- **Frontend** (`client/src`) is a thin, stateless UI: it reads contract state via
  `wagmi` hooks and submits transactions to the same contracts — no business logic is
  duplicated client-side.
- **`config/contracts.ts`** is the single source of truth linking deployed addresses/
  ABIs to the UI; it must be kept in sync with whatever `contracts/script` deploys.
