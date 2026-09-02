import { useState, useEffect, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useBalance, useReadContracts } from 'wagmi';
import { useLocation } from 'react-router-dom';
import { parseUnits } from 'viem';
import { useMarkets } from '../hooks/useMarkets';
import { useUserBalances } from '../hooks/usePool';
import { useToast } from '../context/ToastContext';
import { CONTRACTS, POOL_ABI, ERC20_ABI, WETH_GATEWAY_ABI } from '../config/contracts';
import '../styles/Supply.css';

function Supply() {
  const { address, isConnected } = useAccount();
  const location = useLocation();
  const selectedAsset = location.state?.asset || null;
  const { markets, isLoading: marketsLoading, refetch: refetchMarkets } = useMarkets();
  const { balances, isLoading: balancesLoading, refetch: refetchBalances } = useUserBalances(address);
  const { data: ethBalance, refetch: refetchEthBalance } = useBalance({ address });

  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [ethAmount, setEthAmount] = useState('');
  const [withdrawAmounts, setWithdrawAmounts] = useState<Record<string, string>>({});
  const [withdrawEthAmount, setWithdrawEthAmount] = useState('');

  // Read on-chain allowances for all market tokens (owner=user, spender=Pool).
  // This is the source of truth for whether "Approve" or "Supply" should be
  // shown — NOT a locally-tracked flag — so the button reflects reality even
  // across page reloads or if a previous approval already covers the amount.
  const allowanceContracts = markets.map((market) => ({
    address: market.address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance' as const,
    args: [address as `0x${string}`, CONTRACTS.POOL as `0x${string}`],
  }));
  const { data: allowancesData, refetch: refetchAllowances } = useReadContracts({
    contracts: allowanceContracts,
    query: { enabled: !!address && markets.length > 0 },
  });

  // Approve contract hook
  const { writeContract: writeApprove, data: approveTxHash, isPending: isApprovePending, error: approveWriteError } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess, isError: isApproveError, error: approveTxError } = useWaitForTransactionReceipt({ hash: approveTxHash });

  // Supply contract hook
  const { writeContract: writeSupply, data: supplyTxHash, isPending: isSupplyPending, error: supplyWriteError } = useWriteContract();
  const { isLoading: isSupplyConfirming, isSuccess: isSupplySuccess, isError: isSupplyError, error: supplyTxError } = useWaitForTransactionReceipt({ hash: supplyTxHash });

  // Deposit ETH contract hook
  const { writeContract: writeDepositETH, data: depositETHTxHash, isPending: isDepositETHPending, error: depositETHWriteError } = useWriteContract();
  const { isLoading: isDepositETHConfirming, isSuccess: isDepositETHSuccess, isError: isDepositETHError, error: depositETHTxError } = useWaitForTransactionReceipt({ hash: depositETHTxHash });

  // Withdraw contract hook
  const { writeContract: writeWithdraw, data: withdrawTxHash, isPending: isWithdrawPending, error: withdrawWriteError } = useWriteContract();
  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess, isError: isWithdrawError, error: withdrawTxError } = useWaitForTransactionReceipt({ hash: withdrawTxHash });

  // aWETH approve for WETHGateway withdraw
  const { writeContract: writeAWethApprove, data: aWethApproveTxHash, isPending: isAWethApprovePending, error: aWethApproveWriteError } = useWriteContract();
  const { isLoading: isAWethApproveConfirming, isSuccess: isAWethApproveSuccess, isError: isAWethApproveError, error: aWethApproveTxError } = useWaitForTransactionReceipt({ hash: aWethApproveTxHash });

  // Track which tokens are approved
  const [approvedTokens, setApprovedTokens] = useState<Record<string, boolean>>({});
  const [aWethApproved, setAWethApproved] = useState(false);

  const { addToast, updateToast } = useToast();
  const approveToastId = useRef<number | null>(null);
  const supplyToastId = useRef<number | null>(null);
  const depositETHToastId = useRef<number | null>(null);
  const withdrawToastId = useRef<number | null>(null);
  const aWethApproveToastId = useRef<number | null>(null);

  // Toast: Approve
  useEffect(() => {
    if (approveTxHash && approveToastId.current === null) {
      approveToastId.current = addToast('pending', 'Approving token...', 'Waiting for confirmation', approveTxHash);
    }
  }, [approveTxHash]);
  useEffect(() => {
    if (isApproveSuccess && approveToastId.current !== null) {
      updateToast(approveToastId.current, { type: 'success', title: 'Token Approved', message: 'You can now supply' });
      approveToastId.current = null;
    }
  }, [isApproveSuccess]);

  // Toast: Supply
  useEffect(() => {
    if (supplyTxHash && supplyToastId.current === null) {
      supplyToastId.current = addToast('pending', 'Supplying...', 'Waiting for confirmation', supplyTxHash);
    }
  }, [supplyTxHash]);
  useEffect(() => {
    if (isSupplySuccess && supplyToastId.current !== null) {
      updateToast(supplyToastId.current, { type: 'success', title: 'Supply Successful', message: 'Assets supplied!' });
      supplyToastId.current = null;
    }
  }, [isSupplySuccess]);

  // Toast: Deposit ETH
  useEffect(() => {
    if (depositETHTxHash && depositETHToastId.current === null) {
      depositETHToastId.current = addToast('pending', 'Depositing ETH...', 'Waiting for confirmation', depositETHTxHash);
    }
  }, [depositETHTxHash]);
  useEffect(() => {
    if (isDepositETHSuccess && depositETHToastId.current !== null) {
      updateToast(depositETHToastId.current, { type: 'success', title: 'ETH Deposited', message: 'ETH supplied successfully!' });
      depositETHToastId.current = null;
    }
  }, [isDepositETHSuccess]);

  // Toast: Withdraw
  useEffect(() => {
    if (withdrawTxHash && withdrawToastId.current === null) {
      withdrawToastId.current = addToast('pending', 'Withdrawing...', 'Waiting for confirmation', withdrawTxHash);
    }
  }, [withdrawTxHash]);
  useEffect(() => {
    if (isWithdrawSuccess && withdrawToastId.current !== null) {
      updateToast(withdrawToastId.current, { type: 'success', title: 'Withdrawal Successful', message: 'Assets withdrawn!' });
      withdrawToastId.current = null;
    }
  }, [isWithdrawSuccess]);

  // Toast: aWETH Approve
  useEffect(() => {
    if (aWethApproveTxHash && aWethApproveToastId.current === null) {
      aWethApproveToastId.current = addToast('pending', 'Approving aWETH...', 'Waiting for confirmation', aWethApproveTxHash);
    }
  }, [aWethApproveTxHash]);
  useEffect(() => {
    if (isAWethApproveSuccess && aWethApproveToastId.current !== null) {
      updateToast(aWethApproveToastId.current, { type: 'success', title: 'aWETH Approved', message: 'You can now withdraw ETH' });
      aWethApproveToastId.current = null;
    }
  }, [isAWethApproveSuccess]);

  // Helper: extract a short, readable message from wagmi/viem errors
  const parseError = (err: Error | null): string => {
    if (!err) return 'Transaction failed';
    const msg = err.message;
    if (msg.includes('User rejected') || msg.includes('user rejected')) return 'Transaction rejected';
    if (msg.includes('insufficient funds')) return 'Insufficient funds for gas';
    const revertMatch = msg.match(/reverted with reason string '(.+?)'/);
    if (revertMatch) return revertMatch[1];
    const customMatch = msg.match(/reverted.*?:(.*)/i);
    if (customMatch) return customMatch[1].trim().slice(0, 80);
    return msg.slice(0, 80);
  };

  // Error toasts: wallet-side rejections
  useEffect(() => {
    if (approveWriteError) addToast('error', 'Approval Failed', parseError(approveWriteError));
  }, [approveWriteError]);
  useEffect(() => {
    if (supplyWriteError) addToast('error', 'Supply Failed', parseError(supplyWriteError));
  }, [supplyWriteError]);
  useEffect(() => {
    if (depositETHWriteError) addToast('error', 'Deposit Failed', parseError(depositETHWriteError));
  }, [depositETHWriteError]);
  useEffect(() => {
    if (withdrawWriteError) addToast('error', 'Withdraw Failed', parseError(withdrawWriteError));
  }, [withdrawWriteError]);
  useEffect(() => {
    if (aWethApproveWriteError) addToast('error', 'Approval Failed', parseError(aWethApproveWriteError));
  }, [aWethApproveWriteError]);

  // Error toasts: on-chain reverts
  useEffect(() => {
    if (isApproveError) {
      if (approveToastId.current !== null) {
        updateToast(approveToastId.current, { type: 'error', title: 'Approval Reverted', message: parseError(approveTxError) });
        approveToastId.current = null;
      } else {
        addToast('error', 'Approval Reverted', parseError(approveTxError));
      }
    }
  }, [isApproveError]);
  useEffect(() => {
    if (isSupplyError) {
      if (supplyToastId.current !== null) {
        updateToast(supplyToastId.current, { type: 'error', title: 'Supply Reverted', message: parseError(supplyTxError) });
        supplyToastId.current = null;
      } else {
        addToast('error', 'Supply Reverted', parseError(supplyTxError));
      }
    }
  }, [isSupplyError]);
  useEffect(() => {
    if (isDepositETHError) {
      if (depositETHToastId.current !== null) {
        updateToast(depositETHToastId.current, { type: 'error', title: 'Deposit Reverted', message: parseError(depositETHTxError) });
        depositETHToastId.current = null;
      } else {
        addToast('error', 'Deposit Reverted', parseError(depositETHTxError));
      }
    }
  }, [isDepositETHError]);
  useEffect(() => {
    if (isWithdrawError) {
      if (withdrawToastId.current !== null) {
        updateToast(withdrawToastId.current, { type: 'error', title: 'Withdraw Reverted', message: parseError(withdrawTxError) });
        withdrawToastId.current = null;
      } else {
        addToast('error', 'Withdraw Reverted', parseError(withdrawTxError));
      }
    }
  }, [isWithdrawError]);
  useEffect(() => {
    if (isAWethApproveError) {
      if (aWethApproveToastId.current !== null) {
        updateToast(aWethApproveToastId.current, { type: 'error', title: 'Approval Reverted', message: parseError(aWethApproveTxError) });
        aWethApproveToastId.current = null;
      } else {
        addToast('error', 'Approval Reverted', parseError(aWethApproveTxError));
      }
    }
  }, [isAWethApproveError]);

  // Refetch balances, markets, and native ETH balance after successful transactions.
  // Using useEffect (instead of calling refetch during render) ensures each refetch
  // fires exactly once per success transition, and covers both the user's own
  // balances AND the market-wide stats (total supply/APY/liquidity) so the whole
  // page reflects the new on-chain state right after a deposit/withdraw confirms.
  useEffect(() => {
    if (isSupplySuccess || isDepositETHSuccess || isWithdrawSuccess) {
      refetchBalances();
      refetchMarkets();
      refetchEthBalance();
    }
  }, [isSupplySuccess, isDepositETHSuccess, isWithdrawSuccess, refetchBalances, refetchMarkets, refetchEthBalance]);

  // Refetch on-chain allowances after a successful approve, so the button
  // flips from "Approve" to "Supply" using real chain data.
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowances();
    }
  }, [isApproveSuccess, refetchAllowances]);

  // Sync on-chain allowances → approvedTokens whenever allowance data or
  // entered amounts change. This replaces the old approach of guessing which
  // token was just approved from local state, which could point at the wrong
  // symbol (e.g. if `amounts` had another key inserted earlier) and would
  // also reset to "Approve" on every page reload even if a sufficient
  // allowance already existed on-chain.
  useEffect(() => {
    if (!allowancesData || markets.length === 0) return;
    const updated: Record<string, boolean> = {};
    markets.forEach((market, i) => {
      const raw = allowancesData[i]?.result as bigint | undefined;
      const amount = amounts[market.symbol];
      if (raw !== undefined && amount && parseFloat(amount) > 0) {
        const needed = parseUnits(amount, Number(market.decimals));
        updated[market.symbol] = raw >= needed;
      } else {
        updated[market.symbol] = false;
      }
    });
    setApprovedTokens(updated);
  }, [allowancesData, amounts, markets]);

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

  const Spinner = () => <span className="supply-spinner" />;

  const btnClass = (base: string, isLoading: boolean) =>
    `${base}${isLoading ? ' supply-btn--loading' : ''}`;

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
                  className={btnClass('supply-btn', isDepositETHPending || isDepositETHConfirming)}
                >
                  {(isDepositETHPending || isDepositETHConfirming) && <Spinner />}
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
                      className={btnClass('supply-btn', isSupplyPending || isSupplyConfirming)}
                    >
                      {(isSupplyPending || isSupplyConfirming) && <Spinner />}
                      {isSupplyPending ? 'Confirm in Wallet...' : isSupplyConfirming ? 'Supplying...' : `Supply ${market.symbol}`}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleApprove(market)}
                      disabled={!amounts[market.symbol] || parseFloat(amounts[market.symbol]) <= 0 || isApprovePending || isApproveConfirming}
                      className={btnClass('supply-btn supply-btn--approve', isApprovePending || isApproveConfirming)}
                    >
                      {(isApprovePending || isApproveConfirming) && <Spinner />}
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
                        className={btnClass('supply-btn supply-btn--withdraw', isWithdrawPending || isWithdrawConfirming)}
                      >
                        {(isWithdrawPending || isWithdrawConfirming) && <Spinner />}
                        {isWithdrawPending ? 'Confirm in Wallet...' : isWithdrawConfirming ? 'Withdrawing...' : 'Withdraw ETH'}
                      </button>
                    ) : (
                      <button
                        onClick={handleApproveAWeth}
                        disabled={!withdrawEthAmount || parseFloat(withdrawEthAmount) <= 0 || isAWethApprovePending || isAWethApproveConfirming}
                        className={btnClass('supply-btn supply-btn--approve', isAWethApprovePending || isAWethApproveConfirming)}
                      >
                        {(isAWethApprovePending || isAWethApproveConfirming) && <Spinner />}
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
                        className={btnClass('supply-btn supply-btn--withdraw', isWithdrawPending || isWithdrawConfirming)}
                      >
                        {(isWithdrawPending || isWithdrawConfirming) && <Spinner />}
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