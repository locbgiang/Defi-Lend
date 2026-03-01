import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useLocation } from 'react-router-dom';
import { MOCK_MARKETS } from '../config/tokens';
import { formatPercent } from '../utils/formatters';

function Borrow() {
  const { isConnected } = useAccount();
  const location = useLocation();
  const selectedAsset = location.state?.asset || null;

  const [amounts, setAmounts] = useState<Record<string, string>>({});

  // Mock user data (replace with real data from useUserAccountData hook)
  const mockUserData = {
    totalCollateral: 5000, // USD
    totalBorrowed: 0,
    availableToBorrow: 3750, // 75% of collateral
    healthFactor: '∞',
  };

  // Mock available liquidity per asset
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
          Connect your wallet to borrow assets against your collateral.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: '28px', color: '#1a1a2e', marginBottom: '8px' }}>
        Borrow Assets
      </h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        Borrow assets against your supplied collateral. Monitor your health factor to avoid liquidation.
      </p>

      {/* Borrowing Power Card */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        marginBottom: '24px',
      }}>
        <h2 style={{ fontSize: '18px', color: '#1a1a2e', marginBottom: '20px' }}>
          Your Borrowing Power
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
        }}>
          <div>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>Total Collateral</p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a2e' }}>
              ${mockUserData.totalCollateral.toLocaleString()}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>Total Borrowed</p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: '#d32f2f' }}>
              ${mockUserData.totalBorrowed.toLocaleString()}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>Available to Borrow</p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: '#2e7d32' }}>
              ${mockUserData.availableToBorrow.toLocaleString()}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>Health Factor</p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: '#2e7d32' }}>
              {mockUserData.healthFactor}
            </p>
          </div>
        </div>

        {/* Borrowing Power Bar */}
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>Borrowing Power Used</span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>
              {mockUserData.totalCollateral > 0 
                ? `${((mockUserData.totalBorrowed / mockUserData.availableToBorrow) * 100).toFixed(1)}%`
                : '0%'
              }
            </span>
          </div>
          <div style={{
            height: '8px',
            backgroundColor: '#e0e0e0',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${(mockUserData.totalBorrowed / mockUserData.availableToBorrow) * 100}%`,
              height: '100%',
              backgroundColor: '#2e7d32',
              borderRadius: '4px',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      </div>

      {/* Borrow Cards */}
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
                <p style={{ fontSize: '12px', color: '#666' }}>Borrow APY</p>
                <p style={{ fontSize: '20px', fontWeight: '700', color: '#d32f2f' }}>
                  {formatPercent(market.borrowAPY)}
                </p>
              </div>
            </div>

            {/* Available Liquidity */}
            <div style={{
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#666' }}>Available Liquidity</span>
                <span style={{ fontWeight: '600', color: '#1a1a2e' }}>
                  {mockLiquidity[market.symbol]} {market.symbol}
                </span>
              </div>
            </div>

            {/* Amount Input */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'block' }}>
                Amount to Borrow
              </label>
              <input
                type="text"
                value={amounts[market.symbol] || ''}
                onChange={(e) => handleAmountChange(market.symbol, e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '18px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* New Health Factor Preview */}
            {amounts[market.symbol] && parseFloat(amounts[market.symbol]) > 0 && (
              <div style={{
                backgroundColor: '#fff3e0',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
                border: '1px solid #ffcc80',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: '#ef6c00' }}>New Health Factor</span>
                  <span style={{ fontWeight: '600', color: '#ef6c00' }}>
                    ~2.45
                  </span>
                </div>
              </div>
            )}

            {/* Borrow Button */}
            <button
              disabled={!amounts[market.symbol] || parseFloat(amounts[market.symbol]) <= 0 || mockUserData.availableToBorrow <= 0}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: amounts[market.symbol] && parseFloat(amounts[market.symbol]) > 0 && mockUserData.availableToBorrow > 0
                  ? '#d32f2f'
                  : '#e0e0e0',
                color: amounts[market.symbol] && parseFloat(amounts[market.symbol]) > 0 && mockUserData.availableToBorrow > 0
                  ? 'white'
                  : '#999',
                border: 'none',
                borderRadius: '8px',
                cursor: amounts[market.symbol] && parseFloat(amounts[market.symbol]) > 0 && mockUserData.availableToBorrow > 0
                  ? 'pointer'
                  : 'not-allowed',
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              {mockUserData.availableToBorrow <= 0 
                ? 'No Collateral' 
                : `Borrow ${market.symbol}`
              }
            </button>
          </div>
        ))}
      </div>

      {/* Your Borrows Section */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        marginTop: '32px',
      }}>
        <h2 style={{ fontSize: '20px', color: '#1a1a2e', marginBottom: '16px' }}>
          Your Borrows
        </h2>
        <p style={{ color: '#888', textAlign: 'center', padding: '32px' }}>
          You haven't borrowed any assets yet
        </p>
      </div>
    </div>
  );
}

export default Borrow;