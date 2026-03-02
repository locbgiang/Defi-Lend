import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useLocation } from 'react-router-dom';
import { MOCK_MARKETS } from '../config/tokens';
import { formatPercent } from '../utils/formatters';
import '../styles/Supply.css';

function Supply() {
  const { isConnected } = useAccount();
  const location = useLocation();
  const selectedAsset = location.state?.asset || null;

  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const mockBalances: Record<string, string> = {
    'USDC': '5,000.00',
    'DAI': '2,500.00',
    'WETH': '1.5000',
  };

  const handleAmountChange = (symbol: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmounts({ ...amounts, [symbol]: value });
    }
  };

  const handleMaxClick = (symbol: string, balance: string) => {
    setAmounts({ ...amounts, [symbol]: balance.replace(/,/g, '') });
  };

  if (!isConnected) {
    return (
      <div className="supply-connect-prompt">
        <span className="supply-connect-icon">🔗</span>
        <h1 className="supply-connect-title">Connect Your Wallet</h1>
        <p className="supply-connect-text">
          Connect your wallet to supply assets and start earning interest.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="supply-title">Supply Assets</h1>
      <p className="supply-subtitle">
        Supply assets to earn interest. Your supplied assets can be used as collateral.
      </p>

      {/* Supply Cards */}
      <div className="supply-cards">
        {MOCK_MARKETS.map((market) => (
          <div
            key={market.symbol}
            className={`supply-card ${selectedAsset === market.symbol ? 'supply-card--selected' : ''}`}
          >
            {/* Asset Header */}
            <div className="supply-card-header">
              <div className="supply-asset">
                <span className="supply-asset-icon">{market.icon}</span>
                <div>
                  <p className="supply-asset-symbol">{market.symbol}</p>
                  <p className="supply-asset-name">{market.name}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="supply-apy-label">Supply APY</p>
                <p className="supply-apy-value">{formatPercent(market.supplyAPY)}</p>
              </div>
            </div>

            {/* Wallet Balance */}
            <div className="supply-balance-box">
              <div className="supply-balance-row">
                <span className="supply-balance-label">Wallet Balance</span>
                <span className="supply-balance-value">
                  {mockBalances[market.symbol]} {market.symbol}
                </span>
              </div>
            </div>

            {/* Amount Input */}
            <div className="supply-input-group">
              <label className="supply-input-label">Amount to Supply</label>
              <div className="supply-input-wrapper">
                <input
                  type="text"
                  value={amounts[market.symbol] || ''}
                  onChange={(e) => handleAmountChange(market.symbol, e.target.value)}
                  placeholder="0.00"
                  className="supply-input"
                />
                <button
                  onClick={() => handleMaxClick(market.symbol, mockBalances[market.symbol])}
                  className="supply-max-btn"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Info Row */}
            <div className="supply-info-row">
              <span className="supply-info-label">Collateral</span>
              <span className="supply-info-value">✓ Enabled (LTV: {market.ltv}%)</span>
            </div>

            {/* Supply Button */}
            <button
              disabled={!amounts[market.symbol] || parseFloat(amounts[market.symbol]) <= 0}
              className="supply-btn"
            >
              Supply {market.symbol}
            </button>
          </div>
        ))}
      </div>

      {/* Your Supplies Section */}
      <div className="supply-section">
        <h2 className="supply-section-title">Your Supplies</h2>
        <p className="supply-empty-state">You haven't supplied any assets yet</p>
      </div>
    </div>
  );
}

export default Supply;