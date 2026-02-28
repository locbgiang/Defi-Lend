import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  // Format address for display (0x1234...5678)
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnected && address) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{
          padding: '8px 12px',
          backgroundColor: '#e8f5e9',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          color: '#2e7d32',
        }}>
          {formatAddress(address)}
        </span>
        <button
          onClick={() => disconnect()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#d32f2f'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f44336'}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: injected() })}
      disabled={isPending}
      style={{
        padding: '10px 24px',
        backgroundColor: isPending ? '#90caf9' : '#1976d2',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: isPending ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        transition: 'background-color 0.2s',
      }}
      onMouseOver={(e) => {
        if (!isPending) e.currentTarget.style.backgroundColor = '#1565c0';
      }}
      onMouseOut={(e) => {
        if (!isPending) e.currentTarget.style.backgroundColor = '#1976d2';
      }}
    >
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}

export default WalletButton;
