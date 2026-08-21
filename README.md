# 🏦 DeFi-Lend

A decentralized lending protocol built on Ethereum, inspired by Aave. Supply assets to earn interest, or borrow against your collateral.

![Solidity](https://img.shields.io/badge/Solidity-0.8.10-blue)
![Foundry](https://img.shields.io/badge/Foundry-Framework-orange)
![React](https://img.shields.io/badge/React-18-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)
![License](https://img.shields.io/badge/License-MIT-green)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Deployed Contracts (Sepolia)](#deployed-contracts-sepolia)
- [Getting Started](#getting-started)
- [Smart Contracts](#smart-contracts)
- [Frontend](#frontend)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## 🌟 Overview

DeFi-Lend is a permissionless lending protocol that enables users to:

- **Supply** assets to earn passive yield
- **Borrow** against deposited collateral
- **Liquidate** undercollateralized positions for profit

The protocol uses an overcollateralized lending model with dynamic interest rates based on utilization.

## ✨ Features

- 🔐 **Non-custodial**: Users maintain full control of their assets
- 💰 **Earn Interest**: Suppliers earn yield from borrowers
- 📊 **Multiple Markets**: Support for USDC, DAI, and WETH
- ⚡ **Health Factor Monitoring**: Real-time position health tracking
- 🔄 **Liquidations**: Automated liquidation mechanism for protocol safety
- 🎨 **Modern UI**: Clean React frontend with wallet integration

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React + Vite)                 │
│                     Wagmi + TanStack Query + Viem               │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Pool.sol                               │
│              (Main Entry Point - Supply/Borrow/Repay)           │
└──────────┬──────────────────┬──────────────────┬────────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │  AToken.sol │    │VariableDebt │    │ PriceOracle │
    │  (Deposits) │    │ Token.sol   │    │    .sol     │
    └─────────────┘    └─────────────┘    └─────────────┘
```

## 📜 Deployed Contracts (Sepolia)

| Contract | Address |
|----------|---------|
| Pool | `0xDA0F9F9c05D2A9B46561f628a64Eb29b656d29B3` |
| PriceOracle | `0xdF7514C51674B6aA5728bc3D0c8c6c2F7d96AaC7` |
| WETHGateway | `0x6724FA47Ca81F10feeACD202e5f8Bc13D3594094` |
| **USDC Market** | |
| USDC Token | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |
| aUSDC | `0x227577477F05d71595617a08643B7db35AF71Ddd` |
| vdUSDC | `0x130539520029341869d5236735FD31c26854218c` |
| **DAI Market** | |
| DAI Token | `0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357` |
| aDAI | `0x7916AefE5aA4B71299eaBb6241072dDb354c31D7` |
| vdDAI | `0x8A090b7674309050A5D748aA291ba0c9EeD4911a` |
| **WETH Market** | |
| WETH Token | `0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c` |
| aWETH | `0x64cDDef432871E9E376103F12c89e925936bC03d` |
| vdWETH | `0xAeBd2bA52C776B99b6631DcE70640e020a9C5e94` |

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- [Git](https://git-scm.com/)

### Clone the Repository

```bash
git clone https://github.com/locbgiang/Defi-Lend.git
cd Defi-Lend
```

### Smart Contracts Setup

```bash
cd contracts

# Install dependencies
forge install

# Build contracts
forge build

# Run tests
forge test

# Run tests with verbosity
forge test -vvv
```

### Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Environment Variables

Create a `.env` file in the `contracts` directory:

```env
SEPOLIA_RPC_URL=your_sepolia_rpc_url
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## 📝 Smart Contracts

### Pool.sol
The main entry point for all protocol interactions:
- `supply(asset, amount, onBehalfOf)` - Deposit assets to earn interest
- `withdraw(asset, amount, to)` - Withdraw supplied assets
- `borrow(asset, amount, onBehalfOf)` - Borrow against collateral
- `repay(asset, amount, onBehalfOf)` - Repay borrowed assets
- `liquidationCall(collateral, debt, user, debtToCover)` - Liquidate unhealthy positions

### AToken.sol
Interest-bearing token representing deposits:
- Automatically accrues interest
- 1:1 redeemable for underlying asset
- Serves as collateral for borrowing

### VariableDebtToken.sol
Non-transferable token tracking user debt:
- Represents borrowed amount
- Interest accrues continuously
- Burned upon repayment

### PriceOracle.sol
Price feed for asset valuations:
- Supports Chainlink price feeds
- Manual price setting for testing
- Used for health factor calculations

## 🎨 Frontend

Built with modern React stack:
- **React 18** - UI framework
- **Vite** - Build tool
- **TypeScript** - Type safety
- **Wagmi v2** - Ethereum hooks
- **Viem** - Ethereum utilities
- **TanStack Query** - Data fetching
- **React Router** - Navigation

### Pages
- `/dashboard` - User positions overview
- `/markets` - Available lending markets
- `/supply` - Supply assets
- `/borrow` - Borrow assets

## 🧪 Testing

```bash
cd contracts

# Run all tests
forge test

# Run specific test file
forge test --match-path test/PoolTest.t.sol

# Run with gas reporting
forge test --gas-report

# Run with coverage
forge coverage
```

## 📁 Project Structure

```
Defi-Lend/
├── contracts/                # Smart contracts (Foundry)
│   ├── src/
│   │   ├── Pool.sol         # Main lending pool
│   │   ├── AToken.sol       # Interest-bearing token
│   │   ├── VariableDebtToken.sol
│   │   └── PriceOracle.sol
│   ├── script/              # Deployment scripts
│   ├── test/                # Contract tests
│   └── lib/                 # Dependencies
│
├── client/                  # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── config/          # Contract configs
│   │   ├── hooks/           # Custom hooks
│   │   ├── styles/          # CSS styles
│   │   └── types/           # TypeScript types
│   └── public/
│
└── README.md
```

## 🔮 Roadmap

- [ ] Flash loans
- [ ] Stable rate borrowing
- [ ] Governance token
- [ ] Multi-chain deployment
- [ ] Interest rate optimization
- [ ] Advanced liquidation strategies

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This protocol is for educational purposes and is deployed on testnet only. Do not use with real funds without proper security audits.

## 🙏 Acknowledgments

- [Aave Protocol](https://aave.com/) - Inspiration and architecture patterns
- [OpenZeppelin](https://openzeppelin.com/) - Secure contract libraries
- [Foundry](https://book.getfoundry.sh/) - Development framework
- [Chainlink](https://chain.link/) - Price oracles

---

Built with ❤️ by [Loc Giang](https://github.com/locbgiang)