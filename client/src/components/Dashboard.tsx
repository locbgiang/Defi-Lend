import { useAccount, useBalance } from 'wagmi';
import '../styles/Dashboard.css';

function Dashboard() {
  const { address, isConnected, chain } = useAccount();
  const { data: balance } = useBalance({ address });

  if (!isConnected) {
    return (
      <div className="dashboard-connect-prompt">
        <span className="dashboard-connect-icon">🔗</span>
        <h1 className="dashboard-connect-title">Connect Your Wallet</h1>
        <p className="dashboard-connect-text">
          Connect your wallet to view your dashboard, supply assets, and borrow against your collateral.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="dashboard-title">Dashboard</h1>

      {/* Account Overview Cards */}
      <div className="dashboard-cards">
        {/* Wallet Info Card */}
        <div className="dashboard-card">
          <p className="dashboard-card-label">Connected Wallet</p>
          <p className="dashboard-wallet-address">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
          <p className="dashboard-card-subtitle">{chain?.name || 'Unknown Network'}</p>
        </div>

        {/* Native Balance Card */}
        <div className="dashboard-card">
          <p className="dashboard-card-label">Wallet Balance</p>
          <p className="dashboard-card-value">
            {balance ? (Number(balance.value) / 10 ** balance.decimals).toFixed(4) : '0.00'} {balance?.symbol || 'ETH'}
          </p>
        </div>

        {/* Total Supplied Card */}
        <div className="dashboard-card">
          <p className="dashboard-card-label">Total Supplied</p>
          <p className="dashboard-card-value dashboard-card-value--green">$0.00</p>
          <p className="dashboard-card-subtitle">+0.00% APY</p>
        </div>

        {/* Total Borrowed Card */}
        <div className="dashboard-card">
          <p className="dashboard-card-label">Total Borrowed</p>
          <p className="dashboard-card-value dashboard-card-value--red">$0.00</p>
          <p className="dashboard-card-subtitle">0.00% APY</p>
        </div>
      </div>

      {/* Health Factor */}
      <div className="dashboard-card">
        <div className="dashboard-health-factor">
          <div>
            <p className="dashboard-card-label">Health Factor</p>
            <p className="dashboard-card-value dashboard-card-value--large dashboard-card-value--green">∞</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="dashboard-card-label">Borrowing Power Used</p>
            <p className="dashboard-health-factor-value">0%</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="dashboard-progress-bar">
          <div className="dashboard-progress-bar-fill" style={{ width: '0%' }} />
        </div>
      </div>

      {/* Your Supplies & Borrows */}
      <div className="dashboard-two-col" style={{ marginTop: '20px' }}>
        {/* Your Supplies */}
        <div className="dashboard-card">
          <h2 className="dashboard-section-title">Your Supplies</h2>
          <p className="dashboard-empty-state">Nothing supplied yet</p>
        </div>

        {/* Your Borrows */}
        <div className="dashboard-card">
          <h2 className="dashboard-section-title">Your Borrows</h2>
          <p className="dashboard-empty-state">Nothing borrowed yet</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;