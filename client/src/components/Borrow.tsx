import { useState, useEffect, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useLocation } from 'react-router-dom';
import { formatUnits, parseUnits } from 'viem';
import { useMarkets } from '../hooks/useMarkets';
import { useUserAccountData, useUserBalances } from '../hooks/usePool';
import { formatPercent } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { CONTRACTS, POOL_ABI, ERC20_ABI } from '../config/contracts';
import '../styles/Borrow.css';

function Borrow() {
  const { address, isConnected } = useAccount();
  const location = useLocation();
  const selectedAsset = location.state?.asset || null;

  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [repayAmounts, setRepayAmounts] = useState<Record<string, string>>({});

  const { markets, isLoading: marketsLoading } = useMarkets();
  const { data: accountData, isLoading: accountLoading, refetch: refetchAccountData } = useUserAccountData(address);
  const { balances, isLoading: balancesLoading, refetch: refetchBalances } = useUserBalances(address);

  // Borrow contract hooks
  const { writeContract: writeBorrow, data: borrowTxHash, isPending: isBorrowPending } = useWriteContract();
  const { isLoading: isBorrowConfirming, isSuccess: isBorrowSuccess } = useWaitForTransactionReceipt({ hash: borrowTxHash });

  // Repay contract hooks
  const { writeContract: writeApprove, data: approveTxHash, isPending: isApprovePending } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash });

  const { writeContract: writeRepay, data: repayTxHash, isPending: isRepayPending } = useWriteContract();
  const { isLoading: isRepayConfirming, isSuccess: isRepaySuccess } = useWaitForTransactionReceipt({ hash: repayTxHash });

  // Refetch after successful transactions
  if (isBorrowSuccess || isRepaySuccess) {
    refetchBalances();
    refetchAccountData();
  }

  const { addToast, updateToast } = useToast();
  const borrowToastId = useRef<number | null>(null);
  const approveToastId = useRef<number | null>(null);
  const repayToastId = useRef<number | null>(null);

  // Toast: Borrow
  useEffect(() => {
    if (borrowTxHash && borrowToastId.current === null) {
      borrowToastId.current = addToast('pending', 'Borrowing...', 'Waiting for confirmation', borrowTxHash);
    }
  }, [borrowTxHash]);
  useEffect(() => {
    if (isBorrowSuccess && borrowToastId.current !== null) {
      updateToast(borrowToastId.current, { type: 'success', title: 'Borrow Successful', message: 'Assets borrowed!' });
      borrowToastId.current = null;
    }
  }, [isBorrowSuccess]);

  // Toast: Approve for Repay
  useEffect(() => {
    if (approveTxHash && approveToastId.current === null) {
      approveToastId.current = addToast('pending', 'Approving token...', 'Waiting for confirmation', approveTxHash);
    }
  }, [approveTxHash]);
  useEffect(() => {
    if (isApproveSuccess && approveToastId.current !== null) {
      updateToast(approveToastId.current, { type: 'success', title: 'Token Approved', message: 'You can now repay' });
      approveToastId.current = null;
    }
  }, [isApproveSuccess]);

  // Toast: Repay
  useEffect(() => {
    if (repayTxHash && repayToastId.current === null) {
      repayToastId.current = addToast('pending', 'Repaying...', 'Waiting for confirmation', repayTxHash);
    }
  }, [repayTxHash]);
  useEffect(() => {
    if (isRepaySuccess && repayToastId.current !== null) {
      updateToast(repayToastId.current, { type: 'success', title: 'Repay Successful', message: 'Debt repaid!' });
      repayToastId.current = null;
    }
  }, [isRepaySuccess]);

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

  // Calculate estimated new health factor after borrow
  const getNewHealthFactor = (market: typeof markets[0], borrowAmount: string) => {
    if (!accountData || !borrowAmount || parseFloat(borrowAmount) <= 0) return null;
    
    const borrowValue = parseFloat(borrowAmount) * parseFloat(market.price);
    const newTotalDebt = totalBorrowed + borrowValue;
    
    if (newTotalDebt <= 0) return '∞';

    // HF = (totalCollateral * liquidationThreshold) / totalDebt
    const liquidationThreshold = Number(accountData.currentLiquidationThreshold) / 10000;
    const newHF = (totalCollateral * liquidationThreshold) / newTotalDebt;
    return newHF.toFixed(2);
  };

  const handleAmountChange = (symbol: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmounts({ ...amounts, [symbol]: value });
    }
  };

  const handleRepayAmountChange = (symbol: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setRepayAmounts({ ...repayAmounts, [symbol]: value });
    }
  };

  const handleMaxRepay = (symbol: string) => {
    const borrowed = balances[symbol]?.borrowed || '0';
    setRepayAmounts({ ...repayAmounts, [symbol]: borrowed });
  };

  const handleBorrow = (market: typeof markets[0]) => {
    const amount = amounts[market.symbol];
    if (!amount || parseFloat(amount) <= 0 || !address) return;

    writeBorrow({
      address: CONTRACTS.POOL as `0x${string}`,
      abi: POOL_ABI,
      functionName: 'borrow',
      args: [
        market.address as `0x${string}`,
        parseUnits(amount, Number(market.decimals)),
        address,
      ],
    });
  };

  const handleApproveRepay = (market: typeof markets[0]) => {
    const amount = repayAmounts[market.symbol];
    if (!amount || parseFloat(amount) <= 0) return;

    writeApprove({
      address: market.address as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [
        CONTRACTS.POOL as `0x${string}`,
        parseUnits(amount, Number(market.decimals)),
      ],
    });
  };

  const handleRepay = (market: typeof markets[0]) => {
    const amount = repayAmounts[market.symbol];
    if (!amount || parseFloat(amount) <= 0 || !address) return;

    writeRepay({
      address: CONTRACTS.POOL as `0x${string}`,
      abi: POOL_ABI,
      functionName: 'repay',
      args: [
        market.address as `0x${string}`,
        parseUnits(amount, Number(market.decimals)),
        address,
      ],
    });
  };

  const formatBalance = (value: string, decimals: number = 2) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00';
    if (num < 0.01 && num > 0) return '<0.01';
    return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

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
                <span className="borrow-power-bar-value">{borrowingPowerUsed.toFixed(1)}%</span>
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
              const newHF = getNewHealthFactor(market, amounts[market.symbol] || '');
              const borrowAmount = parseFloat(amounts[market.symbol] || '0');
              const borrowValue = borrowAmount * parseFloat(market.price);
              const exceedsLimit = borrowValue > availableToBorrow;

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
                      <p className="borrow-apy-value">{formatPercent(parseFloat(market.borrowAPY))}</p>
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
                    <div className="borrow-liquidity-row">
                      <span className="borrow-liquidity-label">Price</span>
                      <span className="borrow-liquidity-value">${parseFloat(market.price).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div className="borrow-input-group">
                    <label className="borrow-input-label">Amount to Borrow</label>
                    <div className="borrow-input-wrapper">
                      <input
                        type="text"
                        value={amounts[market.symbol] || ''}
                        onChange={(e) => handleAmountChange(market.symbol, e.target.value)}
                        placeholder="0.00"
                        className="borrow-input"
                      />
                      <button
                        className="borrow-max-btn"
                        onClick={() => {
                          const price = parseFloat(market.price);
                          if (price > 0) {
                            const maxBorrow = availableToBorrow / price;
                            const maxLiquidity = parseFloat(liquidity);
                            const max = Math.min(maxBorrow, maxLiquidity) * 0.99;
                            const decimals = Number(market.decimals);
                            setAmounts({ ...amounts, [market.symbol]: max.toFixed(decimals > 6 ? 6 : 2) });
                          }
                        }}
                      >
                        MAX
                      </button>
                    </div>
                    {borrowAmount > 0 && (
                      <p className="borrow-input-usd">
                        ≈ ${borrowValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>

                  {/* New Health Factor Preview */}
                  {amounts[market.symbol] && parseFloat(amounts[market.symbol]) > 0 && (
                    <div className={`borrow-health-preview ${exceedsLimit ? 'borrow-health-preview--danger' : ''}`}>
                      <div className="borrow-health-preview-row">
                        <span className="borrow-health-preview-label">New Health Factor</span>
                        <span className={`borrow-health-preview-value ${newHF && parseFloat(newHF) < 1.2 ? 'borrow-health-preview-value--danger' : 'borrow-health-preview-value--safe'}`}>
                          {exceedsLimit ? '⚠️ Exceeds limit' : newHF ?? '∞'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Borrow Button */}
                  <button
                    onClick={() => handleBorrow(market)}
                    disabled={
                      !amounts[market.symbol] ||
                      parseFloat(amounts[market.symbol]) <= 0 ||
                      availableToBorrow <= 0 ||
                      exceedsLimit ||
                      isBorrowPending ||
                      isBorrowConfirming
                    }
                    className="borrow-btn"
                  >
                    {availableToBorrow <= 0
                      ? 'No Collateral'
                      : exceedsLimit
                      ? 'Exceeds Borrow Limit'
                      : isBorrowPending
                      ? 'Confirm in Wallet...'
                      : isBorrowConfirming
                      ? 'Borrowing...'
                      : `Borrow ${market.symbol}`}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Your Borrows Section */}
          <div className="borrow-section">
            <h2 className="borrow-section-title">Your Borrows</h2>
            {markets.some(m => parseFloat(balances[m.symbol]?.borrowed || '0') > 0) ? (
              <div className="borrow-positions-grid">
                {markets.map((market) => {
                  const borrowed = balances[market.symbol]?.borrowed || '0';
                  if (parseFloat(borrowed) <= 0) return null;

                  return (
                    <div key={market.symbol} className="borrow-position-card">
                      <div className="borrow-position-card-header">
                        <div className="borrow-position-asset">
                          <span className="borrow-asset-icon">{market.icon}</span>
                          <div>
                            <p className="borrow-asset-symbol">{market.symbol}</p>
                            <p className="borrow-asset-name">{market.name}</p>
                          </div>
                        </div>
                        <div className="borrow-position-badge">Borrowed</div>
                      </div>

                      <div className="borrow-position-stats">
                        <div className="borrow-position-stat">
                          <span className="borrow-position-stat-label">Balance</span>
                          <span className="borrow-position-stat-value">
                            {formatBalance(borrowed, market.decimals > 6 ? 6 : 2)} {market.symbol}
                          </span>
                        </div>
                        <div className="borrow-position-stat">
                          <span className="borrow-position-stat-label">APY</span>
                          <span className="borrow-position-stat-value borrow-position-stat-apy">
                            {formatPercent(parseFloat(market.borrowAPY))}
                          </span>
                        </div>
                      </div>

                      <div className="borrow-position-divider" />

                      <div className="borrow-input-group">
                        <label className="borrow-input-label">Amount to Repay</label>
                        <div className="borrow-input-wrapper">
                          <input
                            type="text"
                            value={repayAmounts[market.symbol] || ''}
                            onChange={(e) => handleRepayAmountChange(market.symbol, e.target.value)}
                            placeholder="0.00"
                            className="borrow-input"
                          />
                          <button onClick={() => handleMaxRepay(market.symbol)} className="borrow-max-btn">
                            MAX
                          </button>
                        </div>
                      </div>

                      {isApproveSuccess ? (
                        <button
                          onClick={() => handleRepay(market)}
                          disabled={
                            !repayAmounts[market.symbol] ||
                            parseFloat(repayAmounts[market.symbol]) <= 0 ||
                            isRepayPending ||
                            isRepayConfirming
                          }
                          className="borrow-btn borrow-btn--repay"
                        >
                          {isRepayPending ? 'Confirm in Wallet...' : isRepayConfirming ? 'Repaying...' : `Repay ${market.symbol}`}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApproveRepay(market)}
                          disabled={
                            !repayAmounts[market.symbol] ||
                            parseFloat(repayAmounts[market.symbol]) <= 0 ||
                            isApprovePending ||
                            isApproveConfirming
                          }
                          className="borrow-btn borrow-btn--approve"
                        >
                          {isApprovePending ? 'Confirm in Wallet...' : isApproveConfirming ? 'Approving...' : `Approve ${market.symbol}`}
                        </button>
                      )}
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