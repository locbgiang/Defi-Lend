import { useNavigate } from 'react-router-dom';
import { MOCK_MARKETS } from '../config/tokens';
import { formatPercent } from '../utils/formatters';

function Markets() {
  const navigate = useNavigate();

  return (
    <div>
      <h1 style={{ fontSize: '28px', color: '#1a1a2e', marginBottom: '8px' }}>
        Markets
      </h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        Supply assets to earn interest or borrow against your collateral
      </p>

      {/* Markets Table */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 150px',
          padding: '16px 24px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #e0e0e0',
          fontWeight: '600',
          fontSize: '14px',
          color: '#666',
        }}>
          <span>Asset</span>
          <span style={{ textAlign: 'right' }}>Total Supply</span>
          <span style={{ textAlign: 'right' }}>Supply APY</span>
          <span style={{ textAlign: 'right' }}>Total Borrow</span>
          <span style={{ textAlign: 'right' }}>Borrow APY</span>
          <span style={{ textAlign: 'right' }}>LTV</span>
          <span style={{ textAlign: 'center' }}>Actions</span>
        </div>

        {/* Market Rows */}
        {MOCK_MARKETS.map((market) => (
          <div
            key={market.symbol}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 150px',
              padding: '20px 24px',
              borderBottom: '1px solid #f0f0f0',
              alignItems: 'center',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {/* Asset */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '28px' }}>{market.icon}</span>
              <div>
                <p style={{ fontWeight: '600', color: '#1a1a2e' }}>{market.symbol}</p>
                <p style={{ fontSize: '12px', color: '#888' }}>{market.name}</p>
              </div>
            </div>

            {/* Total Supply */}
            <span style={{ textAlign: 'right', fontWeight: '500', color: '#1a1a2e' }}>
              {market.totalSupply}
            </span>

            {/* Supply APY */}
            <span style={{ textAlign: 'right', fontWeight: '600', color: '#2e7d32' }}>
              {formatPercent(market.supplyAPY)}
            </span>

            {/* Total Borrow */}
            <span style={{ textAlign: 'right', fontWeight: '500', color: '#1a1a2e' }}>
              {market.totalBorrow}
            </span>

            {/* Borrow APY */}
            <span style={{ textAlign: 'right', fontWeight: '600', color: '#d32f2f' }}>
              {formatPercent(market.borrowAPY)}
            </span>

            {/* LTV */}
            <span style={{ textAlign: 'right', fontWeight: '500', color: '#666' }}>
              {market.ltv}%
            </span>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                onClick={() => navigate('/supply', { state: { asset: market.symbol } })}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                Supply
              </button>
              <button
                onClick={() => navigate('/borrow', { state: { asset: market.symbol } })}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: '#1976d2',
                  border: '1px solid #1976d2',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                Borrow
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginTop: '32px',
      }}>
        <div style={{
          backgroundColor: '#e3f2fd',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #90caf9',
        }}>
          <h3 style={{ color: '#1565c0', marginBottom: '8px' }}>💡 How Supply Works</h3>
          <p style={{ color: '#1976d2', fontSize: '14px', lineHeight: '1.6' }}>
            When you supply assets, you receive aTokens that represent your deposit. 
            These aTokens earn interest continuously and can be used as collateral for borrowing.
          </p>
        </div>

        <div style={{
          backgroundColor: '#fff3e0',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #ffcc80',
        }}>
          <h3 style={{ color: '#ef6c00', marginBottom: '8px' }}>⚠️ Borrowing Risk</h3>
          <p style={{ color: '#f57c00', fontSize: '14px', lineHeight: '1.6' }}>
            When borrowing, maintain a healthy collateral ratio. If your health factor drops 
            below 1, your position may be liquidated with a penalty.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Markets;