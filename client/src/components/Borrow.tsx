import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useLocation } from 'react-router-dom';
import { MOCK_MARKETS } from '../config/tokens';
import { formatPercent } from '../utils/formatters';
import '../styles/Borrow.css';

function Borrow() {
  const { isConnected } = useAccount();
  const location = useLocation();
  const selectedAsset = location.state?.asset || null;

  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const mockUserData = {
    totalCollateral: 5000,
    totalBorrowed: 0,
    availableToBorrow: 3750,
    healthFactor: '∞',
  };

  const mockLiquidity: Record<string, string> = {
    'USDC': '700,000.00',
    'DAI': '400,000.00',
    'WETH': '1,500.00',
  };

  const handleAmountChange = (symbol: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmounts({ ...amounts, [symbol]: value });
    }
  };

  if (!isConnected) {
    return (
      <div className="borrow-connect-prompt">
        <span className="borrow-connect-icon">🔗</span>
        <h1 className="borrow-connect-title">Connect Your Wallet</h1>
        <p className="borrow-connect-text">
          Connect your wallet to borrow assets against your collateral.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="borrow-title">Borrow Assets</h1>
      <p className="borrow-subtitle">
        Borrow assets against your supplied collateral. Monitor your health factor to avoid liquidation.
      </p>

      {/* Borrowing Power Card */}
      <div className="borrow-power-card">
        <h2 className="borrow-power-title">Your Borrowing Power</h2>
        <div className="borrow-power-stats">
          <div>
            <p className="borrow-stat-label">Total Collateral</p>
            <p className="borrow-stat-value">${mockUserData.totalCollateral.toLocaleString()}</p>
          </div>
          <div>
            <p className="borrow-stat-label">Total Borrowed</p>
            <p className="borrow-stat-value borrow-stat-value--red">
              ${mockUserData.totalBorrowed.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="borrow-stat-label">Available to Borrow</p>
            <p className="borrow-stat-value borrow-stat-value--green">
              ${mockUserData.availableToBorrow.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="borrow-stat-label">Health Factor</p>
            <p className="borrow-stat-value borrow-stat-value--green">{mockUserData.healthFactor}</p>
          </div>
        </div>

        {/* Borrowing Power Bar */}
        <div className="borrow-power-bar">
          <div className="borrow-power-bar-header">
            <span className="borrow-power-bar-label">Borrowing Power Used</span>
            <span className="borrow-power-bar-value">
              {mockUserData.totalCollateral > 0
                ? `${((mockUserData.totalBorrowed / mockUserData.availableToBorrow) * 100).toFixed(1)}%`
                : '0%'}
            </span>
          </div>
          <div className="borrow-progress-track">
            <div
              className="borrow-progress-fill"
              style={{ width: `${(mockUserData.totalBorrowed / mockUserData.availableToBorrow) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Borrow Cards */}
      <div className="borrow-cards">
        {MOCK_MARKETS.map((market) => (
          <div
            key={market.symbol}
            className={`borrow-card ${selectedAsset === market.symbol ? 'borrow-card--selected' : ''}`}
          >
            {/* Asset Header */}
            <div className="borrow-card-header">
              <div className="borrow-asset">
                <span className="borrow-asset-icon">{market.icon}</span>
                <div>
                  <p className="borrow-asset-symbol">{market.symbol}</p>
                  <p className="borrow-asset-name">{market.name}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="borrow-apy-label">Borrow APY</p>
                <p className="borrow-apy-value">{formatPercent(market.borrowAPY)}</p>
              </div>
            </div>

            {/* Available Liquidity */}
            <div className="borrow-liquidity-box">
              <div className="borrow-liquidity-row">
                <span className="borrow-liquidity-label">Available Liquidity</span>
                <span className="borrow-liquidity-value">
                  {mockLiquidity[market.symbol]} {market.symbol}
                </span>
              </div>
            </div>

            {/* Amount Input */}
            <div className="borrow-input-group">
              <label className="borrow-input-label">Amount to Borrow</label>
              <input
                type="text"
                value={amounts[market.symbol] || ''}
                onChange={(e) => handleAmountChange(market.symbol, e.target.value)}
                placeholder="0.00"
                className="borrow-input"
              />
            </div>

            {/* New Health Factor Preview */}
            {amounts[market.symbol] && parseFloat(amounts[market.symbol]) > 0 && (
              <div className="borrow-health-preview">
                <div className="borrow-health-preview-row">
                  <span className="borrow-health-preview-label">New Health Factor</span>
                  <span className="borrow-health-preview-value">~2.45</span>
                </div>
              </div>
            )}

            {/* Borrow Button */}
            <button
              disabled={!amounts[market.symbol] || parseFloat(amounts[market.symbol]) <= 0 || mockUserData.availableToBorrow <= 0}
              className="borrow-btn"
            >
              {mockUserData.availableToBorrow <= 0 ? 'No Collateral' : `Borrow ${market.symbol}`}
            </button>
          </div>
        ))}
      </div>

      {/* Your Borrows Section */}
      <div className="borrow-section">
        <h2 className="borrow-section-title">Your Borrows</h2>
        <p className="borrow-empty-state">You haven't borrowed any assets yet</p>
      </div>
    </div>
  );
}

export default Borrow;