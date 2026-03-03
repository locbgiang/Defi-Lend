import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useLocation } from 'react-router-dom';
import { formatUnits } from 'viem';
import { useMarkets } from '../hooks/useMarkets';
import { useUserAccountData, useUserBalances } from '../hooks/usePool';
import { formatPercent } from '../utils/formatters';
import '../styles/Borrow.css';

function Borrow() {
  const { address, isConnected } = useAccount();
  const location = useLocation();
  const selectedAsset = location.state?.asset || null;

  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const { markets, isLoading: marketsLoading } = useMarkets();
  const { data: accountData, isLoading: accountLoading } = useUserAccountData(address);
  const { balances, isLoading: balancesLoading } = useUserBalances(address);

  // Format user account data from blockchain (values are in 18 decimals base currency)
  const totalCollateral = accountData ? Number(formatUnits(accountData.totalCollateralBase, 18)) : 0;
  const totalBorrowed = accountData ? Number(formatUnits(accountData.totalDebtBase, 18)) : 0;
  const availableToBorrow = accountData ? Number(formatUnits(accountData.availableBorrowsBase, 18)) : 0;
  
  // Health factor is scaled by 1e18, infinity if no debt
  const healthFactor = accountData 
    ? accountData.totalDebtBase === 0n 
      ? '∞' 
      : (Number(formatUnits(accountData.healthFactor, 18))).toFixed(2)
    : '∞';

  const borrowingPowerUsed = availableToBorrow > 0 
    ? (totalBorrowed / (totalBorrowed + availableToBorrow)) * 100 
    : 0;

  const handleAmountChange = (symbol: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmounts({ ...amounts, [symbol]: value });
    }
  };

  const formatBalance = (value: string, decimals: number = 2) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00';
    if (num < 0.01 && num > 0) return '<0.01';
    return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  // Calculate available liquidity for each market (total supply - total borrow)
  const getAvailableLiquidity = (market: typeof markets[0]) => {
    const available = market.totalSupply - market.totalBorrow;
    return available > 0n ? formatUnits(available, market.decimals) : '0';
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

  const isLoading = marketsLoading || accountLoading || balancesLoading;

  return (
    <div>
      <h1 className="borrow-title">Borrow Assets</h1>
      <p className="borrow-subtitle">
        Borrow assets against your supplied collateral. Monitor your health factor to avoid liquidation.
      </p>

      {isLoading ? (
        <div className="borrow-loading">Loading market data...</div>
      ) : (
        <>
          {/* Borrowing Power Card */}
          <div className="borrow-power-card">
            <h2 className="borrow-power-title">Your Borrowing Power</h2>
            <div className="borrow-power-stats">
              <div>
                <p className="borrow-stat-label">Total Collateral</p>
                <p className="borrow-stat-value">${totalCollateral.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="borrow-stat-label">Total Borrowed</p>
                <p className="borrow-stat-value borrow-stat-value--red">
                  ${totalBorrowed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="borrow-stat-label">Available to Borrow</p>
                <p className="borrow-stat-value borrow-stat-value--green">
                  ${availableToBorrow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="borrow-stat-label">Health Factor</p>
                <p className={`borrow-stat-value ${healthFactor === '∞' || parseFloat(healthFactor) > 1.5 ? 'borrow-stat-value--green' : 'borrow-stat-value--red'}`}>
                  {healthFactor}
                </p>
              </div>
            </div>

            {/* Borrowing Power Bar */}
            <div className="borrow-power-bar">
              <div className="borrow-power-bar-header">
                <span className="borrow-power-bar-label">Borrowing Power Used</span>
                <span className="borrow-power-bar-value">
                  {borrowingPowerUsed.toFixed(1)}%
                </span>
              </div>
              <div className="borrow-progress-track">
                <div
                  className="borrow-progress-fill"
                  style={{ width: `${Math.min(borrowingPowerUsed, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Borrow Cards */}
          <div className="borrow-cards">
            {markets.map((market) => {
              const liquidity = getAvailableLiquidity(market);
              
              return (
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
                        {formatBalance(liquidity, market.decimals > 6 ? 4 : 2)} {market.symbol}
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
                        <span className="borrow-health-preview-value">~calculating...</span>
                      </div>
                    </div>
                  )}

                  {/* Borrow Button */}
                  <button
                    disabled={!amounts[market.symbol] || parseFloat(amounts[market.symbol]) <= 0 || availableToBorrow <= 0}
                    className="borrow-btn"
                  >
                    {availableToBorrow <= 0 ? 'No Collateral' : `Borrow ${market.symbol}`}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Your Borrows Section */}
          <div className="borrow-section">
            <h2 className="borrow-section-title">Your Borrows</h2>
            {markets.some(m => parseFloat(balances[m.symbol]?.borrowed || '0') > 0) ? (
              <div className="borrow-positions">
                {markets.map((market) => {
                  const borrowed = parseFloat(balances[market.symbol]?.borrowed || '0');
                  if (borrowed <= 0) return null;
                  return (
                    <div key={market.symbol} className="borrow-position-row">
                      <div className="borrow-position-asset">
                        <span>{market.icon}</span>
                        <span>{market.symbol}</span>
                      </div>
                      <span>{formatBalance(balances[market.symbol]?.borrowed || '0', 4)} {market.symbol}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="borrow-empty-state">You haven't borrowed any assets yet</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Borrow;