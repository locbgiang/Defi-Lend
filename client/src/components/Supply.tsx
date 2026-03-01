import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useLocation } from 'react-router-dom';
import { MOCK_MARKETS } from '../config/tokens';
import { formatPercent } from '../utils/formatters';

function Supply() {
  const { isConnected } = useAccount();
  const location = useLocation();
  const selectedAsset = location.state?.asset || null;

  const [amounts, setAmounts] = useState<Record<string, string>>({});

  // Mock wallet balances (replace with real balances from useTokenBalance hook)
  const mockBalances: Record<string, string> = {
    'USDC': '5,000.00',
    'DAI': '2,500.00',
    'WETH': '1.5000',
  };

  const handleAmountChange = (symbol: string, value: string) => {
    // Only allow numbers and decimals
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmounts({ ...amounts, [symbol]: value });
    }
  };

  const handleMaxClick = (symbol: string, balance: string) => {
    setAmounts({ ...amounts, [symbol]: balance.replace(/,/g, '') });
  };

  if (!isConnected) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px',
        textAlign: 'center',
      }}>
        <span style={{ fontSize: '64px', marginBottom: '24px' }}>🔗</span>
        <h1 style={{ fontSize: '28px', color: '#1a1a2e', marginBottom: '12px' }}>
          Connect Your Wallet
        </h1>
        <p style={{ color: '#666', fontSize: '16px', maxWidth: '400px' }}>
          Connect your wallet to supply assets and start earning interest.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: '28px', color: '#1a1a2e', marginBottom: '8px' }}>
        Supply Assets
      </h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        Supply assets to earn interest. Your supplied assets can be used as collateral.
      </p>

      {/* Supply Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '20px',
      }}>
        {MOCK_MARKETS.map((market) => (
          <div
            key={market.symbol}
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: selectedAsset === market.symbol ? '2px solid #1976d2' : '2px solid transparent',
            }}
          >
            {/* Asset Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '32px' }}>{market.icon}</span>
                <div>
                  <p style={{ fontWeight: '600', fontSize: '18px', color: '#1a1a2e' }}>{market.symbol}</p>
                  <p style={{ fontSize: '12px', color: '#888' }}>{market.name}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '12px', color: '#666' }}>Supply APY</p>
                <p style={{ fontSize: '20px', fontWeight: '700', color: '#2e7d32' }}>
                  {formatPercent(market.supplyAPY)}
                </p>
              </div>
            </div>

            {/* Wallet Balance */}
            <div style={{
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#666' }}>Wallet Balance</span>
                <span style={{ fontWeight: '600', color: '#1a1a2e' }}>
                  {mockBalances[market.symbol]} {market.symbol}
                </span>
              </div>
            </div>

            {/* Amount Input */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'block' }}>
                Amount to Supply
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={amounts[market.symbol] || ''}
                  onChange={(e) => handleAmountChange(market.symbol, e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '14px 70px 14px 16px',
                    fontSize: '18px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={() => handleMaxClick(market.symbol, mockBalances[market.symbol])}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    padding: '6px 12px',
                    backgroundColor: '#e3f2fd',
                    color: '#1976d2',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Info Row */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderTop: '1px solid #f0f0f0',
              marginBottom: '16px',
            }}>
              <span style={{ fontSize: '14px', color: '#666' }}>Collateral</span>
              <span style={{ fontSize: '14px', color: '#2e7d32', fontWeight: '500' }}>
                ✓ Enabled (LTV: {market.ltv}%)
              </span>
            </div>

            {/* Supply Button */}
            <button
              disabled={!amounts[market.symbol] || parseFloat(amounts[market.symbol]) <= 0}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: amounts[market.symbol] && parseFloat(amounts[market.symbol]) > 0 
                  ? '#1976d2' 
                  : '#e0e0e0',
                color: amounts[market.symbol] && parseFloat(amounts[market.symbol]) > 0 
                  ? 'white' 
                  : '#999',
                border: 'none',
                borderRadius: '8px',
                cursor: amounts[market.symbol] && parseFloat(amounts[market.symbol]) > 0 
                  ? 'pointer' 
                  : 'not-allowed',
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              Supply {market.symbol}
            </button>
          </div>
        ))}
      </div>

      {/* Your Supplies Section */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        marginTop: '32px',
      }}>
        <h2 style={{ fontSize: '20px', color: '#1a1a2e', marginBottom: '16px' }}>
          Your Supplies
        </h2>
        <p style={{ color: '#888', textAlign: 'center', padding: '32px' }}>
          You haven't supplied any assets yet
        </p>
      </div>
    </div>
  );
}

export default Supply;