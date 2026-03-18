import { useState } from 'react';
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, parseUnits } from 'viem';
import { useLocation } from 'react-router-dom';
import { useMarkets } from '../hooks/useMarkets';
import { useUserBalances } from '../hooks/usePool';
import { formatPercent } from '../utils/formatters';
import { CONTRACTS, WETH_GATEWAY_ABI, POOL_ABI, ERC20_ABI } from '../config/contracts';
import '../styles/Supply.css';

function Supply() {
  const { address, isConnected } = useAccount();
  const location = useLocation();
  const selectedAsset = location.state?.asset || null;

  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [ethAmount, setEthAmount] = useState('');
  const [withdrawAmounts, setWithdrawAmounts] = useState<Record<string, string>>({});
  const [withdrawEthAmount, setWithdrawEthAmount] = useState('');
  
  const { markets, isLoading: marketsLoading } = useMarkets();
  const { balances, isLoading: balancesLoading, refetch: refetchBalances } = useUserBalances(address);
  const { data: ethBalance } = useBalance({ address });

  // Write contract hooks
  const { writeContract: writeDeposit, data: depositTxHash, isPending: isDepositPending } = useWriteContract();
  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({ hash: depositTxHash });

  const { writeContract: writeWithdraw, data: withdrawTxHash, isPending: isWithdrawPending } = useWriteContract();
  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } = useWaitForTransactionReceipt({ hash: withdrawTxHash });

  const { writeContract: writeApprove, data: approveTxHash, isPending: isApprovePending } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash });

  // Check aWETH allowance for WETHGateway
  const { data: aWethAllowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.ATOKENS.aWETH,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.WETH_GATEWAY] : undefined,
    query: { enabled: !!address },
  });

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

  const handleWithdrawAmountChange = (symbol: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setWithdrawAmounts({ ...withdrawAmounts, [symbol]: value });
    }
  };

  const handleWithdrawEthAmountChange = (value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setWithdrawEthAmount(value);
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

  const handleMaxWithdrawClick = (symbol: string) => {
    const supplied = balances[symbol]?.supplied || '0';
    setWithdrawAmounts({ ...withdrawAmounts, [symbol]: supplied });
  };

  const handleMaxWithdrawEthClick = () => {
    const supplied = balances['WETH']?.supplied || '0';
    setWithdrawEthAmount(supplied);
  };

  const handleDepositETH = () => {
    if (!ethAmount || parseFloat(ethAmount) <= 0) return;
    
    writeDeposit({
      address: CONTRACTS.WETH_GATEWAY,
      abi: WETH_GATEWAY_ABI,
      functionName: 'depositETH',
      value: parseEther(ethAmount),
    });
  };

  const handleWithdrawERC20 = (symbol: string, tokenAddress: `0x${string}`, decimals: number) => {
    const amount = withdrawAmounts[symbol];
    if (!amount || parseFloat(amount) <= 0 || !address) return;
    
    const amountInWei = parseUnits(amount, decimals);
    
    writeWithdraw({
      address: CONTRACTS.POOL,
      abi: POOL_ABI,
      functionName: 'withdraw',
      args: [tokenAddress, amountInWei, address],
    });
  };

  const handleApproveAWeth = () => {
    writeApprove({
      address: CONTRACTS.ATOKENS.aWETH,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACTS.WETH_GATEWAY, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')],
    });
  };

  const handleWithdrawETH = () => {
    if (!withdrawEthAmount || parseFloat(withdrawEthAmount) <= 0) return;
    
    const amountInWei = parseEther(withdrawEthAmount);
    
    writeWithdraw({
      address: CONTRACTS.WETH_GATEWAY,
      abi: WETH_GATEWAY_ABI,
      functionName: 'withdrawETH',
      args: [amountInWei],
    });
  };

  // Check if user needs to approve aWETH for WETHGateway
  const needsAWethApproval = (amount: string) => {
    if (!amount || !aWethAllowance) return true;
    try {
      const amountInWei = parseEther(amount);
      return (aWethAllowance as bigint) < amountInWei;
    } catch {
      return true;
    }
  };

  // Refetch balances after successful transactions
  if (isDepositSuccess || isWithdrawSuccess || isApproveSuccess) {
    refetchBalances();
    refetchAllowance();
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

  // Combined loading/pending states
  const isPending = isDepositPending || isWithdrawPending || isApprovePending;
  const isConfirming = isDepositConfirming || isWithdrawConfirming || isApproveConfirming;

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
                  <p className="supply-apy-value">{wethMarket ? formatPercent(parseFloat(wethMarket.supplyAPY)) : '0.00%'}</p>
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
              
              {isDepositSuccess && (
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
                      <p className="supply-apy-value">{formatPercent(parseFloat(market.supplyAPY))}</p>
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
                        <span className="supply-position-stat-value supply-position-stat-apy">{wethMarket ? formatPercent(parseFloat(wethMarket.supplyAPY)) : '0.00%'}</span>
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
                    
                    {needsAWethApproval(withdrawEthAmount) ? (
                      <button
                        onClick={handleApproveAWeth}
                        disabled={!withdrawEthAmount || parseFloat(withdrawEthAmount) <= 0 || isApprovePending || isApproveConfirming}
                        className="supply-btn supply-btn--approve"
                      >
                        {isApprovePending ? 'Confirm in Wallet...' : isApproveConfirming ? 'Approving...' : 'Approve Withdrawal'}
                      </button>
                    ) : (
                      <button
                        onClick={handleWithdrawETH}
                        disabled={!withdrawEthAmount || parseFloat(withdrawEthAmount) <= 0 || parseFloat(withdrawEthAmount) > parseFloat(balances['WETH']?.supplied || '0') || isWithdrawPending || isWithdrawConfirming}
                        className="supply-btn supply-btn--withdraw"
                      >
                        {isWithdrawPending ? 'Confirm in Wallet...' : isWithdrawConfirming ? 'Withdrawing...' : 'Withdraw ETH'}
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
                          <span className="supply-position-stat-value">{formatBalance(supplied, market.decimals > 6 ? 4 : 2)} {market.symbol}</span>
                        </div>
                        <div className="supply-position-stat">
                          <span className="supply-position-stat-label">APY</span>
                          <span className="supply-position-stat-value supply-position-stat-apy">{formatPercent(parseFloat(market.supplyAPY))}</span>
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
                        onClick={() => handleWithdrawERC20(market.symbol, market.address as `0x${string}`, market.decimals)}
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