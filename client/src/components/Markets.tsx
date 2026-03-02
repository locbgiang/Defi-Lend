import { useNavigate } from 'react-router-dom';
import { useMarkets } from '../hooks/useMarkets';
import { formatPercent } from '../utils/formatters';
import '../styles/Markets.css';

function Markets() {
  const navigate = useNavigate();
  const { markets, isLoading } = useMarkets();

  return (
    <div>
      <h1 className="markets-title">Markets</h1>
      <p className="markets-subtitle">
        Supply assets to earn interest or borrow against your collateral
      </p>

      {/* Markets Table */}
      <div className="markets-table">
        {/* Table Header */}
        <div className="markets-table-header">
          <span>Asset</span>
          <span>Total Supply</span>
          <span>Supply APY</span>
          <span>Total Borrow</span>
          <span>Borrow APY</span>
          <span>LTV</span>
          <span>Actions</span>
        </div>

        {/* Market Rows */}
        {isLoading ? (
          <div className="markets-loading">Loading market data...</div>
        ) : (
          markets.map((market) => (
            <div key={market.symbol} className="markets-row">
              {/* Asset */}
              <div className="markets-asset">
                <span className="markets-asset-icon">{market.icon}</span>
                <div>
                  <p className="markets-asset-symbol">{market.symbol}</p>
                  <p className="markets-asset-name">{market.name}</p>
                </div>
              </div>

              {/* Total Supply */}
              <span className="markets-value">{market.totalSupplyFormatted}</span>

              {/* Supply APY */}
              <span className="markets-value markets-value--green">
                {formatPercent(market.supplyAPY)}
              </span>

              {/* Total Borrow */}
              <span className="markets-value">{market.totalBorrowFormatted}</span>

              {/* Borrow APY */}
              <span className="markets-value markets-value--red">
                {formatPercent(market.borrowAPY)}
              </span>

              {/* LTV */}
              <span className="markets-value markets-value--muted">{market.ltv}%</span>

              {/* Actions */}
              <div className="markets-actions">
                <button
                  onClick={() => navigate('/supply', { state: { asset: market.symbol } })}
                  className="markets-btn markets-btn--primary"
                >
                  Supply
                </button>
                <button
                  onClick={() => navigate('/borrow', { state: { asset: market.symbol } })}
                  className="markets-btn markets-btn--outline"
                >
                  Borrow
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info Cards */}
      <div className="markets-info-cards">
        <div className="markets-info-card markets-info-card--blue">
          <h3 className="markets-info-card-title markets-info-card-title--blue">
            💡 How Supply Works
          </h3>
          <p className="markets-info-card-text markets-info-card-text--blue">
            When you supply assets, you receive aTokens that represent your deposit. 
            These aTokens earn interest continuously and can be used as collateral for borrowing.
          </p>
        </div>

        <div className="markets-info-card markets-info-card--orange">
          <h3 className="markets-info-card-title markets-info-card-title--orange">
            ⚠️ Borrowing Risk
          </h3>
          <p className="markets-info-card-text markets-info-card-text--orange">
            When borrowing, maintain a healthy collateral ratio. If your health factor drops 
            below 1, your position may be liquidated with a penalty.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Markets;