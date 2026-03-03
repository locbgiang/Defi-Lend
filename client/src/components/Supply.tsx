import { useState } from 'react';
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { useLocation } from 'react-router-dom';
import { useMarkets } from '../hooks/useMarkets';
import { useUserBalances } from '../hooks/usePool';
import { formatPercent } from '../utils/formatters';
import { CONTRACTS, WETH_GATEWAY_ABI } from '../config/contracts';
import '../styles/Supply.css';

function Supply() {
  const { address, isConnected } = useAccount();
  const location = useLocation();
  const selectedAsset = location.state?.asset || null;

  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [ethAmount, setEthAmount] = useState('');
  
  const { markets, isLoading: marketsLoading } = useMarkets();
  const { balances, isLoading: balancesLoading, refetch: refetchBalances } = useUserBalances(address);
  const { data: ethBalance } = useBalance({ address });

  // Write contract hook for ETH deposit
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const handleAmountChange = (symbol: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmounts({ ...amounts, [symbol]: value });
    }
  };

  const handleEthAmountChange = (value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setEthAmount(value);
    }
  };

  const handleMaxClick = (symbol: string) => {
    const balance = balances[symbol]?.wallet || '0';
    setAmounts({ ...amounts, [symbol]: balance });
  };

  const handleMaxEthClick = () => {
    if (ethBalance) {
      // Leave some ETH for gas (0.01 ETH)
      const maxEth = Number(ethBalance.value) / 1e18 - 0.01;
      setEthAmount(maxEth > 0 ? maxEth.toFixed(6) : '0');
    }
  };

  const handleDepositETH = () => {
    if (!ethAmount || parseFloat(ethAmount) <= 0) return;
    
    writeContract({
      address: CONTRACTS.WETH_GATEWAY,
      abi: WETH_GATEWAY_ABI,
      functionName: 'depositETH',
      value: parseEther(ethAmount),
    });
  };

  // Refetch balances after successful deposit
  if (isSuccess) {
    refetchBalances();
  }

  const formatBalance = (value: string, decimals: number = 2) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00';
    if (num < 0.01 && num > 0) return '<0.01';
    return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const ethBalanceFormatted = ethBalance 
    ? (Number(ethBalance.value) / 1e18).toFixed(4) 
    : '0.0000';

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

  const isLoading = marketsLoading || balancesLoading;
  const wethMarket = markets.find(m => m.symbol === 'WETH');

  return (
    <div>
      <h1 className="supply-title">Supply Assets</h1>
      <p className="supply-subtitle">
        Supply assets to earn interest. Your supplied assets can be used as collateral.
      </p>

      {isLoading ? (
        <div className="supply-loading">Loading market data...</div>
      ) : (
        <>
          {/* Supply Cards */}
          <div className="supply-cards">
            {/* ETH Deposit Card */}
            <div className="supply-card">
              <div className="supply-card-header">
                <div className="supply-asset">
                  <span className="supply-asset-icon">⟠</span>
                  <div>
                    <p className="supply-asset-symbol">ETH</p>
                    <p className="supply-asset-name">Native Ether</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="supply-apy-label">Supply APY</p>
                  <p className="supply-apy-value">{wethMarket ? formatPercent(wethMarket.supplyAPY) : '0.00%'}</p>
                </div>
              </div>

              <div className="supply-balance-box">
                <div className="supply-balance-row">
                  <span className="supply-balance-label">Wallet Balance</span>
                  <span className="supply-balance-value">{ethBalanceFormatted} ETH</span>
                </div>
              </div>

              <div className="supply-input-group">
                <label className="supply-input-label">Amount to Supply</label>
                <div className="supply-input-wrapper">
                  <input
                    type="text"
                    value={ethAmount}
                    onChange={(e) => handleEthAmountChange(e.target.value)}
                    placeholder="0.00"
                    className="supply-input"
                  />
                  <button onClick={handleMaxEthClick} className="supply-max-btn">
                    MAX
                  </button>
                </div>
              </div>

              <div className="supply-info-row">
                <span className="supply-info-label">Collateral</span>
                <span className="supply-info-value">✓ Enabled (LTV: {wethMarket?.ltv || 75}%)</span>
              </div>

              <button
                onClick={handleDepositETH}
                disabled={!ethAmount || parseFloat(ethAmount) <= 0 || parseFloat(ethAmount) > parseFloat(ethBalanceFormatted) || isPending || isConfirming}
                className="supply-btn supply-btn--eth"
              >
                {isPending ? 'Confirm in Wallet...' : isConfirming ? 'Depositing...' : 'Deposit ETH'}
              </button>

              {/* Info note about WETH conversion */}
              <div className="supply-eth-note">
                <span className="supply-eth-note-icon">ℹ️</span>
                <span className="supply-eth-note-text">ETH is wrapped to WETH on deposit</span>
              </div>
              
              {isSuccess && (
                <p className="supply-success">✓ ETH deposited successfully!</p>
              )}
            </div>

            {markets.map((market) => {
              const userBalance = balances[market.symbol];
              const walletBalance = userBalance?.wallet || '0';
              
              return (
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
                        {formatBalance(walletBalance, market.decimals > 6 ? 4 : 2)} {market.symbol}
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
                        onClick={() => handleMaxClick(market.symbol)}
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
                    disabled={!amounts[market.symbol] || parseFloat(amounts[market.symbol]) <= 0 || parseFloat(amounts[market.symbol]) > parseFloat(walletBalance)}
                    className="supply-btn"
                  >
                    Supply {market.symbol}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Your Supplies Section */}
          <div className="supply-section">
            <h2 className="supply-section-title">Your Supplies</h2>
            {markets.some(m => parseFloat(balances[m.symbol]?.supplied || '0') > 0) ? (
              <div className="supply-positions">
                {markets.map((market) => {
                  const supplied = parseFloat(balances[market.symbol]?.supplied || '0');
                  if (supplied <= 0) return null;
                  return (
                    <div key={market.symbol} className="supply-position-row">
                      <div className="supply-position-asset">
                        <span>{market.icon}</span>
                        <span>{market.symbol}</span>
                      </div>
                      <span>{formatBalance(balances[market.symbol]?.supplied || '0', 4)} {market.symbol}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="supply-empty-state">You haven't supplied any assets yet</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Supply;