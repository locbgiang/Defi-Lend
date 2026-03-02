import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import '../styles/WalletButton.css';

function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnected && address) {
    return (
      <div className="wallet-connected">
        <span className="wallet-address">{formatAddress(address)}</span>
        <button onClick={() => disconnect()} className="wallet-disconnect-btn">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: injected() })}
      disabled={isPending}
      className="wallet-connect-btn"
    >
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}

export default WalletButton;
