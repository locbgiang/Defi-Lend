import { useState, useEffect, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { formatUnits, parseUnits, isAddress } from 'viem';
import { useMarkets } from '../hooks/useMarkets';
import { useToast } from '../context/ToastContext';
import { CONTRACTS, POOL_ABI, ERC20_ABI } from '../config/contracts';
import '../styles/Liquidation.css';

function Liquidation() {
  const { address, isConnected } = useAccount();
  const { markets } = useMarkets();
  const { addToast, updateToast } = useToast();

  // --- User lookup ---
  const [targetAddress, setTargetAddress] = useState('');
  const [lookedUpAddress, setLookedUpAddress] = useState<`0x${string}` | null>(null);

  // --- Form state ---
  const [collateralAsset, setCollateralAsset] = useState('');
  const [debtAsset, setDebtAsset] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [receiveAToken, setReceiveAToken] = useState(false);
  const [approvedDebt, setApprovedDebt] = useState(false);

  // --- Fetch target user's account data ---
  const { data: accountData, isLoading: accountLoading } = useReadContract({
    address: CONTRACTS.POOL as `0x${string}`,
    abi: POOL_ABI,
    functionName: 'getUserAccountData',
    args: lookedUpAddress ? [lookedUpAddress] : undefined,
    query: { enabled: !!lookedUpAddress },
  });

  const totalCollateral = accountData ? Number(formatUnits(accountData[0], 18)) : 0;
  const totalDebt = accountData ? Number(formatUnits(accountData[1], 18)) : 0;
  const liquidationThresholdRaw = accountData ? Number(accountData[3]) : 0;
  const healthFactor = accountData
    ? accountData[1] === 0n
      ? '∞'
      : Number(formatUnits(accountData[5], 18)).toFixed(3)
    : null;
  const isLiquidatable = healthFactor !== null && healthFactor !== '∞' && parseFloat(healthFactor) < 1;

  // --- Fetch liquidator's allowance for the chosen debt asset ---
  const debtMarket = markets.find(m => m.symbol === debtAsset);
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: debtMarket?.address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && debtMarket ? [address, CONTRACTS.POOL as `0x${string}`] : undefined,
    query: { enabled: !!address && !!debtMarket },
  });

  // Sync approval state
  useEffect(() => {
    if (allowanceData === undefined || !debtMarket || !debtAmount || parseFloat(debtAmount) <= 0) {
      setApprovedDebt(false);
      return;
    }
    const needed = parseUnits(debtAmount, Number(debtMarket.decimals));
    setApprovedDebt((allowanceData as bigint) >= needed);
  }, [allowanceData, debtAmount, debtMarket]);

  // Reset approval when amount changes
  const handleDebtAmountChange = (val: string) => {
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setDebtAmount(val);
      setApprovedDebt(false);
    }
  };

  // Max = 50% of user's debt for this asset (close factor)
  const handleMaxClick = () => {
    if (!lookedUpAddress || !debtMarket) return;
    // 50% close factor enforced by contract — pre-fill full amount, contract caps it
    const debtValue = totalDebt; // USD value; convert to token amount
    const price = parseFloat(debtMarket.price);
    if (price > 0) {
      const max = (debtValue * 0.5) / price;
      setDebtAmount(max.toFixed(Number(debtMarket.decimals) > 6 ? 6 : 2));
    }
  };

  // --- Approve write ---
  const { writeContract: writeApprove, data: approveTxHash, isPending: isApprovePending, error: approveWriteError } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess, isError: isApproveError, error: approveTxError } = useWaitForTransactionReceipt({ hash: approveTxHash });

  // --- Liquidate write ---
  const { writeContract: writeLiquidate, data: liquidateTxHash, isPending: isLiquidatePending, error: liquidateWriteError } = useWriteContract();
  const { isLoading: isLiquidateConfirming, isSuccess: isLiquidateSuccess, isError: isLiquidateError, error: liquidateTxError } = useWaitForTransactionReceipt({ hash: liquidateTxHash });

  // --- Toast refs ---
  const approveToastId = useRef<number | null>(null);
  const liquidateToastId = useRef<number | null>(null);

  const parseError = (err: Error | null) => {
    if (!err) return 'Transaction failed';
    const msg = err.message;
    if (msg.includes('User rejected') || msg.includes('user rejected')) return 'Transaction rejected';
    if (msg.includes('insufficient funds')) return 'Insufficient funds for gas';
    const revertMatch = msg.match(/reverted with reason string '(.+?)'/);
    if (revertMatch) return revertMatch[1];
    return msg.slice(0, 80);
  };

  useEffect(() => {
    if (approveTxHash && approveToastId.current === null)
      approveToastId.current = addToast('pending', 'Approving...', 'Waiting for confirmation', approveTxHash);
  }, [approveTxHash]);

  useEffect(() => {
    if (isApproveSuccess && approveToastId.current !== null) {
      updateToast(approveToastId.current, { type: 'success', title: 'Approved', message: 'Ready to liquidate' });
      approveToastId.current = null;
      refetchAllowance();
    }
  }, [isApproveSuccess]);

  useEffect(() => {
    if (isApproveError) {
      if (approveToastId.current !== null) {
        updateToast(approveToastId.current, { type: 'error', title: 'Approval Failed', message: parseError(approveTxError) });
        approveToastId.current = null;
      } else {
        addToast('error', 'Approval Failed', parseError(approveTxError));
      }
    }
  }, [isApproveError]);

  useEffect(() => {
    if (approveWriteError) addToast('error', 'Approval Failed', parseError(approveWriteError));
  }, [approveWriteError]);

  useEffect(() => {
    if (liquidateTxHash && liquidateToastId.current === null)
      liquidateToastId.current = addToast('pending', 'Liquidating...', 'Waiting for confirmation', liquidateTxHash);
  }, [liquidateTxHash]);

  useEffect(() => {
    if (isLiquidateSuccess && liquidateToastId.current !== null) {
      updateToast(liquidateToastId.current, { type: 'success', title: 'Liquidation Successful!', message: 'Collateral received' });
      liquidateToastId.current = null;
      setDebtAmount('');
      setApprovedDebt(false);
      refetchAllowance();
    }
  }, [isLiquidateSuccess]);

  useEffect(() => {
    if (isLiquidateError) {
      if (liquidateToastId.current !== null) {
        updateToast(liquidateToastId.current, { type: 'error', title: 'Liquidation Failed', message: parseError(liquidateTxError) });
        liquidateToastId.current = null;
      } else {
        addToast('error', 'Liquidation Failed', parseError(liquidateTxError));
      }
    }
  }, [isLiquidateError]);

  useEffect(() => {
    if (liquidateWriteError) addToast('error', 'Liquidation Failed', parseError(liquidateWriteError));
  }, [liquidateWriteError]);

  // --- Handlers ---
  const handleLookup = () => {
    if (isAddress(targetAddress)) {
      setLookedUpAddress(targetAddress as `0x${string}`);
      setDebtAmount('');
      setApprovedDebt(false);
    } else {
      addToast('error', 'Invalid Address', 'Please enter a valid Ethereum address');
    }
  };

  const handleApprove = () => {
    if (!debtMarket || !debtAmount || parseFloat(debtAmount) <= 0) return;
    writeApprove({
      address: debtMarket.address as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACTS.POOL as `0x${string}`, parseUnits(debtAmount, Number(debtMarket.decimals))],
    });
  };

  const handleLiquidate = () => {
    if (!lookedUpAddress || !collateralAsset || !debtAsset || !debtAmount || !debtMarket) return;
    const collateralMarket = markets.find(m => m.symbol === collateralAsset);
    if (!collateralMarket) return;

    writeLiquidate({
      address: CONTRACTS.POOL as `0x${string}`,
      abi: POOL_ABI,
      functionName: 'liquidationCall',
      args: [
        collateralMarket.address as `0x${string}`,
        debtMarket.address as `0x${string}`,
        lookedUpAddress,
        parseUnits(debtAmount, Number(debtMarket.decimals)),
        receiveAToken,
      ],
    });
  };

  // --- Preview calculation ---
  const previewCollateral = () => {
    if (!debtMarket || !debtAmount || parseFloat(debtAmount) <= 0) return null;
    const collateralMarket = markets.find(m => m.symbol === collateralAsset);
    if (!collateralMarket) return null;
    const debtPrice = parseFloat(debtMarket.price);
    const collateralPrice = parseFloat(collateralMarket.price);
    const collateralBonus = collateralMarket.ltv ? 500 : 500; // 5% bonus from contract config
    if (debtPrice <= 0 || collateralPrice <= 0) return null;

    const debtValue = parseFloat(debtAmount) * debtPrice;
    const collateralWithBonus = debtValue * (1 + collateralBonus / 10000);
    const collateralTokens = collateralWithBonus / collateralPrice;
    return { debtValue, collateralWithBonus, collateralTokens };
  };

  const preview = previewCollateral();

  // --- Spinner / button helper ---
  const Spinner = () => <span className="liquidation-spinner" />;
  const btnClass = (base: string, loading: boolean) => `${base}${loading ? ' liquidation-btn--loading' : ''}`;

  if (!isConnected) {
    return (
      <div className="liquidation-connect-prompt">
        <span className="liquidation-connect-icon">⚡</span>
        <h1 className="liquidation-connect-title">Connect Your Wallet</h1>
        <p className="liquidation-connect-text">Connect your wallet to liquidate undercollateralized positions.</p>
      </div>
    );
  }

  const canExecute = !!lookedUpAddress && isLiquidatable && !!collateralAsset && !!debtAsset && collateralAsset !== debtAsset && !!debtAmount && parseFloat(debtAmount) > 0;
  const isApproveLoading = isApprovePending || isApproveConfirming;
  const isLiquidateLoading = isLiquidatePending || isLiquidateConfirming;

  return (
    <div>
      <h1 className="liquidation-title">Liquidations</h1>
      <p className="liquidation-subtitle">
        Repay debt for undercollateralized positions and receive collateral at a 5% bonus.
      </p>

      <div className="liquidation-warning">
        <span className="liquidation-warning-icon">⚠️</span>
        <span className="liquidation-warning-text">
          Liquidation only applies when a position's health factor drops below 1.0. You can repay up to 50% of the debt (close factor) and receive collateral at a 5% bonus. You must hold enough of the debt asset to repay.
        </span>
      </div>

      {/* Address Lookup */}
      <div className="liquidation-lookup-card">
        <h2 className="liquidation-lookup-title">Look Up Position</h2>
        <div className="liquidation-lookup-row">
          <div className="liquidation-lookup-input-group">
            <label className="liquidation-lookup-label">Borrower Address</label>
            <input
              type="text"
              value={targetAddress}
              onChange={e => setTargetAddress(e.target.value)}
              placeholder="0x..."
              className="liquidation-lookup-input"
              onKeyDown={e => e.key === 'Enter' && handleLookup()}
            />
          </div>
          <button
            onClick={handleLookup}
            disabled={!targetAddress}
            className="liquidation-lookup-btn"
          >
            Look Up
          </button>
        </div>
      </div>

      {/* Position Info */}
      {lookedUpAddress && (
        accountLoading ? (
          <div className="liquidation-empty">Loading position data...</div>
        ) : (
          <div className="liquidation-position-card">
            <div className="liquidation-position-header">
              <span className="liquidation-position-title">
                {lookedUpAddress.slice(0, 6)}...{lookedUpAddress.slice(-4)}
              </span>
              <span className={`liquidation-hf-badge ${isLiquidatable ? 'liquidation-hf-badge--danger' : 'liquidation-hf-badge--safe'}`}>
                HF: {healthFactor}
              </span>
            </div>

            <div className="liquidation-position-stats">
              <div className="liquidation-position-stat">
                <div className="liquidation-position-stat-label">Total Collateral</div>
                <div className="liquidation-position-stat-value">
                  ${totalCollateral.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="liquidation-position-stat">
                <div className="liquidation-position-stat-label">Total Debt</div>
                <div className="liquidation-position-stat-value liquidation-position-stat-value--red">
                  ${totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="liquidation-position-stat">
                <div className="liquidation-position-stat-label">Liq. Threshold</div>
                <div className="liquidation-position-stat-value">{(liquidationThresholdRaw / 100).toFixed(0)}%</div>
              </div>
              <div className="liquidation-position-stat">
                <div className="liquidation-position-stat-label">Health Factor</div>
                <div className={`liquidation-position-stat-value ${isLiquidatable ? 'liquidation-position-stat-value--red' : ''}`}>
                  {healthFactor}
                </div>
              </div>
            </div>

            {!isLiquidatable && (
              <div className="liquidation-safe-msg">
                ✅ This position is healthy and cannot be liquidated.
              </div>
            )}
          </div>
        )
      )}

      {/* Execute Form — only show when position is liquidatable */}
      {lookedUpAddress && isLiquidatable && (
        <div className="liquidation-execute-card">
          <h2 className="liquidation-execute-title">Execute Liquidation</h2>

          <div className="liquidation-form-grid">
            {/* Collateral to receive */}
            <div className="liquidation-field">
              <label className="liquidation-field-label">Collateral to Receive</label>
              <select
                value={collateralAsset}
                onChange={e => setCollateralAsset(e.target.value)}
                className="liquidation-select"
              >
                <option value="">Select asset...</option>
                {markets.map(m => (
                  <option key={m.symbol} value={m.symbol}>{m.symbol} — {m.name}</option>
                ))}
              </select>
            </div>

            {/* Debt asset to repay */}
            <div className="liquidation-field">
              <label className="liquidation-field-label">Debt Asset to Repay</label>
              <select
                value={debtAsset}
                onChange={e => { setDebtAsset(e.target.value); setDebtAmount(''); setApprovedDebt(false); }}
                className="liquidation-select"
              >
                <option value="">Select asset...</option>
                {markets.filter(m => m.symbol !== collateralAsset).map(m => (
                  <option key={m.symbol} value={m.symbol}>{m.symbol} — {m.name}</option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div className="liquidation-field" style={{ gridColumn: '1 / -1' }}>
              <label className="liquidation-field-label">
                Amount to Repay {debtMarket ? `(${debtMarket.symbol})` : ''}
                {debtMarket && <span style={{ color: '#888', fontWeight: 400 }}> — max 50% close factor</span>}
              </label>
              <div className="liquidation-input-wrapper">
                <input
                  type="text"
                  value={debtAmount}
                  onChange={e => handleDebtAmountChange(e.target.value)}
                  placeholder="0.00"
                  className="liquidation-amount-input"
                />
                <button onClick={handleMaxClick} className="liquidation-max-btn">MAX</button>
              </div>
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div className="liquidation-preview">
              <div className="liquidation-preview-title">Preview</div>
              <div className="liquidation-preview-row">
                <span>Debt repaid value</span>
                <span>${preview.debtValue.toFixed(4)}</span>
              </div>
              <div className="liquidation-preview-row">
                <span>Collateral value (with 5% bonus)</span>
                <span>${preview.collateralWithBonus.toFixed(4)}</span>
              </div>
              <div className="liquidation-preview-row">
                <span>You receive</span>
                <span>≈ {preview.collateralTokens.toFixed(6)} {collateralAsset}</span>
              </div>
            </div>
          )}

          {/* Receive aToken toggle */}
          <div className="liquidation-receive-toggle">
            <input
              type="checkbox"
              id="receiveAToken"
              checked={receiveAToken}
              onChange={e => setReceiveAToken(e.target.checked)}
            />
            <label htmlFor="receiveAToken">
              Receive a{collateralAsset || 'Token'} instead of {collateralAsset || 'underlying token'}
            </label>
          </div>

          {/* Approve + Execute */}
          <div className="liquidation-actions">
            {!approvedDebt ? (
              <button
                onClick={handleApprove}
                disabled={!canExecute || isApproveLoading}
                className={btnClass('liquidation-btn liquidation-btn--approve', isApproveLoading)}
              >
                {isApproveLoading && <Spinner />}
                {isApprovePending ? 'Confirm in Wallet...' : isApproveConfirming ? 'Approving...' : `Approve ${debtAsset || 'Token'}`}
              </button>
            ) : (
              <button
                onClick={handleLiquidate}
                disabled={!canExecute || isLiquidateLoading}
                className={btnClass('liquidation-btn liquidation-btn--execute', isLiquidateLoading)}
              >
                {isLiquidateLoading && <Spinner />}
                {isLiquidatePending ? 'Confirm in Wallet...' : isLiquidateConfirming ? 'Liquidating...' : '⚡ Liquidate'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Liquidation;
