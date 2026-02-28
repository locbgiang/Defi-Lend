import { useAccount, useBalance } from 'wagmi';

function Dashboard() {
  const { address, isConnected, chain } = useAccount();
  const { data: balance } = useBalance({ address });

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
          Connect your wallet to view your dashboard, supply assets, and borrow against your collateral.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: '28px', color: '#1a1a2e', marginBottom: '24px' }}>
        Dashboard
      </h1>

      {/* Account Overview Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '32px',
      }}>
        {/* Wallet Info Card */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
            Connected Wallet
          </p>
          <p style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            color: '#1a1a2e',
            fontFamily: 'monospace',
          }}>
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
          <p style={{ color: '#888', fontSize: '12px', marginTop: '8px' }}>
            {chain?.name || 'Unknown Network'}
          </p>
        </div>

        {/* Native Balance Card */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
            Wallet Balance
          </p>
          <p style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a2e' }}>
            {balance ? (Number(balance.value) / 10 ** balance.decimals).toFixed(4) : '0.00'} {balance?.symbol || 'ETH'}
          </p>
        </div>

        {/* Total Supplied Card */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
            Total Supplied
          </p>
          <p style={{ fontSize: '24px', fontWeight: '700', color: '#2e7d32' }}>
            $0.00
          </p>
          <p style={{ color: '#888', fontSize: '12px', marginTop: '8px' }}>
            +0.00% APY
          </p>
        </div>

        {/* Total Borrowed Card */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
            Total Borrowed
          </p>
          <p style={{ fontSize: '24px', fontWeight: '700', color: '#d32f2f' }}>
            $0.00
          </p>
          <p style={{ color: '#888', fontSize: '12px', marginTop: '8px' }}>
            0.00% APY
          </p>
        </div>
      </div>

      {/* Health Factor */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        marginBottom: '32px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
              Health Factor
            </p>
            <p style={{ fontSize: '32px', fontWeight: '700', color: '#2e7d32' }}>
              ∞
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
              Borrowing Power Used
            </p>
            <p style={{ fontSize: '24px', fontWeight: '600', color: '#1a1a2e' }}>
              0%
            </p>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{
          marginTop: '16px',
          height: '8px',
          backgroundColor: '#e0e0e0',
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: '0%',
            height: '100%',
            backgroundColor: '#2e7d32',
            borderRadius: '4px',
          }} />
        </div>
      </div>

      {/* Your Supplies & Borrows */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px',
      }}>
        {/* Your Supplies */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}>
          <h2 style={{ fontSize: '18px', color: '#1a1a2e', marginBottom: '16px' }}>
            Your Supplies
          </h2>
          <p style={{ color: '#888', textAlign: 'center', padding: '32px' }}>
            Nothing supplied yet
          </p>
        </div>

        {/* Your Borrows */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}>
          <h2 style={{ fontSize: '18px', color: '#1a1a2e', marginBottom: '16px' }}>
            Your Borrows
          </h2>
          <p style={{ color: '#888', textAlign: 'center', padding: '32px' }}>
            Nothing borrowed yet
          </p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;