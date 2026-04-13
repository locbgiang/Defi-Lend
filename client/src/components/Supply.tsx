import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { useLocation } from 'react-router-dom';
import { parseUnits } from 'viem';
import { useMarkets } from '../hooks/useMarkets';
import { useUserBalances } from '../hooks/usePool';
import { CONTRACTS, POOL_ABI, ERC20_ABI, WETH_GATEWAY_ABI } from '../config/contracts';
import '../styles/Supply.css';

function Supply() {
  const { address, isConnected } = useAccount();
  const location = useLocation();
  const selectedAsset = location.state?.asset || null;
  const { markets, isLoading: marketsLoading } = useMarkets();
  const { balances, isLoading: balancesLoading, refetch: refetchBalances } = useUserBalances(address);
  const { data: ethBalance } = useBalance({ address });

  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [ethAmount, setEthAmount] = useState('');
  const [withdrawAmounts, setWithdrawAmounts] = useState<Record<string, string>>({});
  const [withdrawEthAmount, setWithdrawEthAmount] = useState('');

  // Approve contract hook
  const { writeContract: writeApprove, data: approveTxHash, isPending: isApprovePending } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash });

  // Supply contract hook
  const { writeContract: writeSupply, data: supplyTxHash, isPending: isSupplyPending } = useWriteContract();
  const { isLoading: isSupplyConfirming, isSuccess: isSupplySuccess } = useWaitForTransactionReceipt({ hash: supplyTxHash });

  // Deposit ETH contract hook
  const { writeContract: writeDepositETH, data: depositETHTxHash, isPending: isDepositETHPending } = useWriteContract();
  const { isLoading: isDepositETHConfirming, isSuccess: isDepositETHSuccess } = useWaitForTransactionReceipt({ hash: depositETHTxHash });

  // Withdraw contract hook
  const { writeContract: writeWithdraw, data: withdrawTxHash, isPending: isWithdrawPending } = useWriteContract();
  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } = useWaitForTransactionReceipt({ hash: withdrawTxHash });

  // aWETH approve for WETHGateway withdraw
  const { writeContract: writeAWethApprove, data: aWethApproveTxHash, isPending: isAWethApprovePending } = useWriteContract();
  const { isLoading: isAWethApproveConfirming, isSuccess: isAWethApproveSuccess } = useWaitForTransactionReceipt({ hash: aWethApproveTxHash });

  // Track which tokens are approved
  const [approvedTokens, setApprovedTokens] = useState<Record<string, boolean>>({});
  const [aWethApproved, setAWethApproved] = useState(false);

  // Refetch balances after successful transactions
  if (isSupplySuccess || isDepositETHSuccess || isWithdrawSuccess) {
    refetchBalances();
  }

  // Track approvals
  if (isApproveSuccess && !approvedTokens[Object.keys(amounts).find(k => amounts[k]) || '']) {
    const approvedSymbol = Object.keys(amounts).find(k => amounts[k]);
    if (approvedSymbol) {
      setApprovedTokens(prev => ({ ...prev, [approvedSymbol]: true }));
    }
  }

  if (isAWethApproveSuccess && !aWethApproved) {
    setAWethApproved(true);
  }

  // Handle ERC20 approve
  const handleApprove = (market: typeof markets[0]) => {
    const amount = amounts[market.symbol];
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

  // Handle ERC20 supply
  const handleSupply = (market: typeof markets[0]) => {
    const amount = amounts[market.symbol];
    if (!amount || parseFloat(amount) <= 0 || !address) return;

    writeSupply({
      address: CONTRACTS.POOL as `0x${string}`,
      abi: POOL_ABI,
      functionName: 'supply',
      args: [
        market.address as `0x${string}`,
        parseUnits(amount, Number(market.decimals)),
        address,
      ],
    });
  };

  // Handle ETH deposit via WETHGateway
  const handleDepositETH = () => {
    if (!ethAmount || parseFloat(ethAmount) <= 0 || !address) return;

    writeDepositETH({
      address: CONTRACTS.WETH_GATEWAY as `0x${string}`,
      abi: WETH_GATEWAY_ABI,
      functionName: 'depositETH',
      value: parseUnits(ethAmount, 18),
    });
  };

  // Handle ERC20 withdraw
  const handleWithdrawERC20 = (market: typeof markets[0]) => {
    const amount = withdrawAmounts[market.symbol];
    if (!amount || parseFloat(amount) <= 0 || !address) return;

    writeWithdraw({
      address: CONTRACTS.POOL as `0x${string}`,
      abi: POOL_ABI,
      functionName: 'withdraw',
      args: [
        market.address as `0x${string}`,
        parseUnits(amount, Number(market.decimals)),
        address,
      ],
    });
  };

  // Handle aWETH approve for WETHGateway
  const handleApproveAWeth = () => {
    if (!withdrawEthAmount || parseFloat(withdrawEthAmount) <= 0) return;

    writeAWethApprove({
      address: CONTRACTS.ATOKENS.aWETH as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [
        CONTRACTS.WETH_GATEWAY as `0x${string}`,
        parseUnits(withdrawEthAmount, 18),
      ],
    });
  };

  // Handle ETH withdraw via WETHGateway
  const handleWithdrawETH = () => {
    if (!withdrawEthAmount || parseFloat(withdrawEthAmount) <= 0 || !address) return;

    writeWithdraw({
      address: CONTRACTS.WETH_GATEWAY as `0x${string}`,
      abi: WETH_GATEWAY_ABI,
      functionName: 'withdrawETH',
      args: [parseUnits(withdrawEthAmount, 18)],
    });
  };

  const handleAmountChange = (symbol: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmounts({ ...amounts, [symbol]: value });
      // Reset approval state when amount changes
      setApprovedTokens(prev => ({ ...prev, [symbol]: false }));
    }
  };

  const handleEthAmountChange = (value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setEthAmount(value);
    }
  };

  const handleWithdrawAmountChange = (symbol: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setWithdrawAmounts({ ...withdrawAmounts, [symbol]: value });
    }
  };

  const handleWithdrawEthAmountChange = (value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setWithdrawEthAmount(value);
      setAWethApproved(false);
    }
  };

  const handleMaxClick = (symbol: string) => {
    const walletBalance = balances[symbol]?.wallet || '0';
    setAmounts({ ...amounts, [symbol]: walletBalance });
    setApprovedTokens(prev => ({ ...prev, [symbol]: false }));
  };

  const handleMaxEthClick = () => {
    if (ethBalance) {
      // Leave some ETH for gas
      const max = Number(ethBalance.value) / 1e18 - 0.01;
      setEthAmount(max > 0 ? max.toFixed(6) : '0');
    }
  };

  const handleMaxWithdrawClick = (symbol: string) => {
    const supplied = balances[symbol]?.supplied || '0';
    setWithdrawAmounts({ ...withdrawAmounts, [symbol]: supplied });
  };

  const handleMaxWithdrawEthClick = () => {
    const supplied = balances['WETH']?.supplied || '0';
    setWithdrawEthAmount(supplied);
    setAWethApproved(false);
  };

  const formatBalance = (value: string, decimals: number = 4) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00';
    if (num < 0.0001 && num > 0) return '<0.0001';
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: decimals });
  };

  const formatPercent = (value: string) => `${parseFloat(value).toFixed(2)}%`;

  if (!isConnected) {
    return (
      <div className="supply-connect-prompt">
        <span className="supply-connect-icon">🔗</span>
        <h1 className="supply-connect-title">Connect Your Wallet</h1>
        <p className="supply-connect-text">
          Connect your wallet to supply assets and earn interest.
        </p>
      </div>
    );
  }

  const isLoading = marketsLoading || balancesLoading;

  return (
    <div>
      <h1 className="supply-title">Supply Assets</h1>
      <p className="supply-subtitle">
        Supply assets to earn interest and use them as collateral for borrowing.
      </p>

      {isLoading ? (
        <div className="supply-loading">Loading market data...</div>
      ) : (
        <>
          {/* Supply Cards */}
          <div className="supply-section">
            <h2 className="supply-section-title">Available to Supply</h2>
            <div className="supply-cards">
              {/* ETH Card */}
              <div className="supply-card">
                <div className="supply-card-header">
                  <div className="supply-asset">
                    <span className="supply-asset-icon">⟠</span>
                    <div>
                      <p className="supply-asset-symbol">ETH</p>
                      <p className="supply-asset-name">Ether</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="supply-apy-label">Supply APY</p>
                    <p className="supply-apy-value">
                      {markets.find(m => m.symbol === 'WETH') ? formatPercent(markets.find(m => m.symbol === 'WETH')!.supplyAPY) : '0.00%'}
                    </p>
                  </div>
                </div>

                <div className="supply-balance-row">
                  <span className="supply-balance-label">Wallet Balance</span>
                  <span className="supply-balance-value">
                    {ethBalance ? (Number(ethBalance.value) / 1e18).toFixed(4) : '0.00'} ETH
                  </span>
                </div>

                <div className="supply-input-group">
                  <div className="supply-input-wrapper">
                    <input
                      type="text"
                      value={ethAmount}
                      onChange={(e) => handleEthAmountChange(e.target.value)}
                      placeholder="0.00"
                      className="supply-input"
                    />
                    <button onClick={handleMaxEthClick} className="supply-max-btn">MAX</button>
                  </div>
                </div>

                <div className="supply-collateral-row">
                  <span>Collateral</span>
                  <span className="supply-collateral-enabled">✓ Enabled</span>
                </div>

                <button
                  onClick={handleDepositETH}
                  disabled={!ethAmount || parseFloat(ethAmount) <= 0 || isDepositETHPending || isDepositETHConfirming}
                  className="supply-btn"
                >
                  {isDepositETHPending ? 'Confirm in Wallet...' : isDepositETHConfirming ? 'Depositing...' : 'Deposit ETH'}
                </button>

                <div className="supply-eth-note">
                  <span className="supply-eth-note-icon">ℹ️</span>
                  <span className="supply-eth-note-text">ETH is wrapped to WETH on deposit</span>
                </div>
              </div>

              {/* ERC20 Token Cards */}
              {markets.filter(m => m.symbol !== 'WETH').map((market) => (
                <div key={market.symbol} className={`supply-card ${selectedAsset === market.symbol ? 'supply-card--selected' : ''}`}>
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

                  <div className="supply-balance-row">
                    <span className="supply-balance-label">Wallet Balance</span>
                    <span className="supply-balance-value">
                      {formatBalance(balances[market.symbol]?.wallet || '0')} {market.symbol}
                    </span>
                  </div>

                  <div className="supply-input-group">
                    <div className="supply-input-wrapper">
                      <input
                        type="text"
                        value={amounts[market.symbol] || ''}
                        onChange={(e) => handleAmountChange(market.symbol, e.target.value)}
                        placeholder="0.00"
                        className="supply-input"
                      />
                      <button onClick={() => handleMaxClick(market.symbol)} className="supply-max-btn">MAX</button>
                    </div>
                  </div>

                  <div className="supply-collateral-row">
                    <span>Collateral</span>
                    <span className="supply-collateral-enabled">✓ Enabled</span>
                  </div>

                  {approvedTokens[market.symbol] ? (
                    <button
                      onClick={() => handleSupply(market)}
                      disabled={!amounts[market.symbol] || parseFloat(amounts[market.symbol]) <= 0 || isSupplyPending || isSupplyConfirming}
                      className="supply-btn"
                    >
                      {isSupplyPending ? 'Confirm in Wallet...' : isSupplyConfirming ? 'Supplying...' : `Supply ${market.symbol}`}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleApprove(market)}
                      disabled={!amounts[market.symbol] || parseFloat(amounts[market.symbol]) <= 0 || isApprovePending || isApproveConfirming}
                      className="supply-btn supply-btn--approve"
                    >
                      {isApprovePending ? 'Confirm in Wallet...' : isApproveConfirming ? 'Approving...' : `Approve ${market.symbol}`}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Your Supplies Section */}
          <div className="supply-section">
            <h2 className="supply-section-title">Your Supplies</h2>
            
            {(markets.some(m => parseFloat(balances[m.symbol]?.supplied || '0') > 0) || parseFloat(balances['WETH']?.supplied || '0') > 0) ? (
              <div className="supply-positions-grid">
                
                {/* WETH/ETH Position */}
                {parseFloat(balances['WETH']?.supplied || '0') > 0 && (
                  <div className="supply-position-card">
                    <div className="supply-position-card-header">
                      <div className="supply-position-asset">
                        <span className="supply-asset-icon">⟠</span>
                        <div>
                          <p className="supply-asset-symbol">ETH</p>
                          <p className="supply-asset-name">Wrapped Ether</p>
                        </div>
                      </div>
                      <div className="supply-position-badge">Supplied</div>
                    </div>

                    <div className="supply-position-stats">
                      <div className="supply-position-stat">
                        <span className="supply-position-stat-label">Balance</span>
                        <span className="supply-position-stat-value">{formatBalance(balances['WETH']?.supplied || '0', 4)} ETH</span>
                      </div>
                      <div className="supply-position-stat">
                        <span className="supply-position-stat-label">APY</span>
                        <span className="supply-position-stat-value supply-position-stat-apy">
                          {markets.find(m => m.symbol === 'WETH') ? formatPercent(markets.find(m => m.symbol === 'WETH')!.supplyAPY) : '0.00%'}
                        </span>
                      </div>
                    </div>

                    <div className="supply-position-divider" />
                    
                    <div className="supply-input-group">
                      <label className="supply-input-label">Amount to Withdraw</label>
                      <div className="supply-input-wrapper">
                        <input
                          type="text"
                          value={withdrawEthAmount}
                          onChange={(e) => handleWithdrawEthAmountChange(e.target.value)}
                          placeholder="0.00"
                          className="supply-input"
                        />
                        <button onClick={handleMaxWithdrawEthClick} className="supply-max-btn">MAX</button>
                      </div>
                    </div>
                    
                    {aWethApproved ? (
                      <button
                        onClick={handleWithdrawETH}
                        disabled={!withdrawEthAmount || parseFloat(withdrawEthAmount) <= 0 || parseFloat(withdrawEthAmount) > parseFloat(balances['WETH']?.supplied || '0') || isWithdrawPending || isWithdrawConfirming}
                        className="supply-btn supply-btn--withdraw"
                      >
                        {isWithdrawPending ? 'Confirm in Wallet...' : isWithdrawConfirming ? 'Withdrawing...' : 'Withdraw ETH'}
                      </button>
                    ) : (
                      <button
                        onClick={handleApproveAWeth}
                        disabled={!withdrawEthAmount || parseFloat(withdrawEthAmount) <= 0 || isAWethApprovePending || isAWethApproveConfirming}
                        className="supply-btn supply-btn--approve"
                      >
                        {isAWethApprovePending ? 'Confirm in Wallet...' : isAWethApproveConfirming ? 'Approving...' : 'Approve Withdrawal'}
                      </button>
                    )}
                    
                    <div className="supply-eth-note">
                      <span className="supply-eth-note-icon">ℹ️</span>
                      <span className="supply-eth-note-text">You will receive native ETH on withdrawal</span>
                    </div>
                  </div>
                )}
                
                {/* Other token positions */}
                {markets.filter(m => m.symbol !== 'WETH').map((market) => {
                  const supplied = balances[market.symbol]?.supplied || '0';
                  if (parseFloat(supplied) <= 0) return null;
                  
                  return (
                    <div key={market.symbol} className="supply-position-card">
                      <div className="supply-position-card-header">
                        <div className="supply-position-asset">
                          <span className="supply-asset-icon">{market.icon}</span>
                          <div>
                            <p className="supply-asset-symbol">{market.symbol}</p>
                            <p className="supply-asset-name">{market.name}</p>
                          </div>
                        </div>
                        <div className="supply-position-badge">Supplied</div>
                      </div>

                      <div className="supply-position-stats">
                        <div className="supply-position-stat">
                          <span className="supply-position-stat-label">Balance</span>
                          <span className="supply-position-stat-value">{formatBalance(supplied, Number(market.decimals) > 6 ? 4 : 2)} {market.symbol}</span>
                        </div>
                        <div className="supply-position-stat">
                          <span className="supply-position-stat-label">APY</span>
                          <span className="supply-position-stat-value supply-position-stat-apy">{formatPercent(market.supplyAPY)}</span>
                        </div>
                      </div>

                      <div className="supply-position-divider" />
                      
                      <div className="supply-input-group">
                        <label className="supply-input-label">Amount to Withdraw</label>
                        <div className="supply-input-wrapper">
                          <input
                            type="text"
                            value={withdrawAmounts[market.symbol] || ''}
                            onChange={(e) => handleWithdrawAmountChange(market.symbol, e.target.value)}
                            placeholder="0.00"
                            className="supply-input"
                          />
                          <button onClick={() => handleMaxWithdrawClick(market.symbol)} className="supply-max-btn">MAX</button>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleWithdrawERC20(market)}
                        disabled={!withdrawAmounts[market.symbol] || parseFloat(withdrawAmounts[market.symbol]) <= 0 || parseFloat(withdrawAmounts[market.symbol]) > parseFloat(supplied) || isWithdrawPending || isWithdrawConfirming}
                        className="supply-btn supply-btn--withdraw"
                      >
                        {isWithdrawPending ? 'Confirm in Wallet...' : isWithdrawConfirming ? 'Withdrawing...' : `Withdraw ${market.symbol}`}
                      </button>
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