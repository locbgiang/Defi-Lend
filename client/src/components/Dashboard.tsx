import { useAccount, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { useUserAccountData, useUserBalances } from '../hooks/usePool';
import { useMarkets } from '../hooks/useMarkets';
import '../styles/Dashboard.css';

function Dashboard() {
  const { address, isConnected, chain } = useAccount();
  const { data: balance } = useBalance({ address });
  const { data: accountData, isLoading: accountLoading } = useUserAccountData(address);
  const { balances, isLoading: balancesLoading } = useUserBalances(address);
  const { markets, isLoading: marketsLoading } = useMarkets();

  // Format user account data from blockchain (values are in 18 decimals base currency)
  const totalCollateral = accountData ? Number(formatUnits(accountData.totalCollateralBase, 18)) : 0;
  const totalDebt = accountData ? Number(formatUnits(accountData.totalDebtBase, 18)) : 0;
  const availableToBorrow = accountData ? Number(formatUnits(accountData.availableBorrowsBase, 18)) : 0;
  const healthFactor = accountData
    ? accountData.totalDebtBase === 0n
      ? '∞'
      : Number(formatUnits(accountData.healthFactor, 18)).toFixed(2)
    : '∞';

  const borrowingPowerUsed = availableToBorrow > 0 
    ? (totalDebt / (totalDebt + availableToBorrow)) * 100 
    : 0;

  // Calculate weighted average APY for supplies
  const calculateSupplyAPY = () => {
    let totalValue = 0;
    let weightedAPY = 0;
    markets.forEach(market => {
      const supplied = parseFloat(balances[market.symbol]?.supplied || '0');
      if (supplied > 0) {
        const price = parseFloat(market.price) || 1;
        const value = supplied * price;
        totalValue += value;
        weightedAPY += value * Number(market.supplyAPY);
      }
    });
    return totalValue > 0 ? weightedAPY / totalValue : 0;
  };

  // Calculate weighted average APY for borrows
  const calculateBorrowAPY = () => {
    let totalValue = 0;
    let weightedAPY = 0;
    markets.forEach(market => {
      const borrowed = parseFloat(balances[market.symbol]?.borrowed || '0');
      if (borrowed > 0) {
        const price = parseFloat(market.price) || 1;
        const value = borrowed * price;
        totalValue += value;
        weightedAPY += value * Number(market.borrowAPY);
      }
    });
    return totalValue > 0 ? weightedAPY / totalValue : 0;
  };

  const formatBalance = (value: string, decimals: number = 4) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00';
    if (num < 0.0001 && num > 0) return '<0.0001';
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: decimals });
  };

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

  const isLoading = accountLoading || balancesLoading || marketsLoading;
  const supplyAPY = calculateSupplyAPY();
  const borrowAPY = calculateBorrowAPY();

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
          <p className="dashboard-card-value dashboard-card-value--green">
            ${isLoading ? '...' : totalCollateral.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="dashboard-card-subtitle">+{supplyAPY.toFixed(2)}% APY</p>
        </div>

        {/* Total Borrowed Card */}
        <div className="dashboard-card">
          <p className="dashboard-card-label">Total Borrowed</p>
          <p className="dashboard-card-value dashboard-card-value--red">
            ${isLoading ? '...' : totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="dashboard-card-subtitle">{borrowAPY.toFixed(2)}% APY</p>
        </div>
      </div>

      {/* Health Factor */}
      <div className="dashboard-card">
        <div className="dashboard-health-factor">
          <div>
            <p className="dashboard-card-label">Health Factor</p>
            <p className={`dashboard-card-value dashboard-card-value--large ${healthFactor === '∞' || parseFloat(healthFactor) > 1.5 ? 'dashboard-card-value--green' : 'dashboard-card-value--red'}`}>
              {isLoading ? '...' : healthFactor}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="dashboard-card-label">Borrowing Power Used</p>
            <p className="dashboard-health-factor-value">{isLoading ? '...' : `${borrowingPowerUsed.toFixed(1)}%`}</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="dashboard-progress-bar">
          <div className="dashboard-progress-bar-fill" style={{ width: `${Math.min(borrowingPowerUsed, 100)}%` }} />
        </div>
      </div>

      {/* Your Supplies & Borrows */}
      <div className="dashboard-two-col" style={{ marginTop: '20px' }}>
        {/* Your Supplies */}
        <div className="dashboard-card">
          <h2 className="dashboard-section-title">Your Supplies</h2>
          {isLoading ? (
            <p className="dashboard-empty-state">Loading...</p>
          ) : markets.some(m => parseFloat(balances[m.symbol]?.supplied || '0') > 0) ? (
            <div className="dashboard-positions">
              {markets.map((market) => {
                const supplied = parseFloat(balances[market.symbol]?.supplied || '0');
                if (supplied <= 0) return null;
                const price = parseFloat(market.price) || 1;
                return (
                  <div key={market.symbol} className="dashboard-position-row">
                    <div className="dashboard-position-asset">
                      <span className="dashboard-position-icon">{market.icon}</span>
                      <div>
                        <p className="dashboard-position-symbol">{market.symbol}</p>
                        <p className="dashboard-position-apy">+{Number(market.supplyAPY).toFixed(2)}% APY</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p className="dashboard-position-amount">{formatBalance(balances[market.symbol]?.supplied || '0')}</p>
                      <p className="dashboard-position-value">
                        ${(supplied * price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="dashboard-empty-state">Nothing supplied yet</p>
          )}
        </div>

        {/* Your Borrows */}
        <div className="dashboard-card">
          <h2 className="dashboard-section-title">Your Borrows</h2>
          {isLoading ? (
            <p className="dashboard-empty-state">Loading...</p>
          ) : markets.some(m => parseFloat(balances[m.symbol]?.borrowed || '0') > 0) ? (
            <div className="dashboard-positions">
              {markets.map((market) => {
                const borrowed = parseFloat(balances[market.symbol]?.borrowed || '0');
                if (borrowed <= 0) return null;
                const price = parseFloat(market.price) || 1;
                return (
                  <div key={market.symbol} className="dashboard-position-row">
                    <div className="dashboard-position-asset">
                      <span className="dashboard-position-icon">{market.icon}</span>
                      <div>
                        <p className="dashboard-position-symbol">{market.symbol}</p>
                        <p className="dashboard-position-apy dashboard-position-apy--red">{Number(market.borrowAPY).toFixed(2)}% APY</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p className="dashboard-position-amount">{formatBalance(balances[market.symbol]?.borrowed || '0')}</p>
                      <p className="dashboard-position-value">
                        ${(borrowed * price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="dashboard-empty-state">Nothing borrowed yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;