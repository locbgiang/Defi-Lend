import { Link } from 'react-router-dom';
import WalletButton from './WalletButton';

function Header() {
  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 32px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e0e0e0',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '28px' }}>🏦</span>
        <span style={{ 
          fontSize: '20px', 
          fontWeight: '700',
          color: '#1a1a2e',
        }}>
          Defi-Lend
        </span>
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', gap: '8px' }}>
        <Link 
          to="/dashboard"
          style={{
            padding: '10px 16px',
            textDecoration: 'none',
            color: '#424242',
            fontWeight: '500',
            borderRadius: '8px',
            transition: 'background-color 0.2s',
          }}
        >
          Dashboard
        </Link>
        <Link 
          to="/markets"
          style={{
            padding: '10px 16px',
            textDecoration: 'none',
            color: '#424242',
            fontWeight: '500',
            borderRadius: '8px',
            transition: 'background-color 0.2s',
          }}
        >
          Markets
        </Link>
        <Link 
          to="/supply"
          style={{
            padding: '10px 16px',
            textDecoration: 'none',
            color: '#424242',
            fontWeight: '500',
            borderRadius: '8px',
            transition: 'background-color 0.2s',
          }}
        >
          Supply
        </Link>
        <Link 
          to="/borrow"
          style={{
            padding: '10px 16px',
            textDecoration: 'none',
            color: '#424242',
            fontWeight: '500',
            borderRadius: '8px',
            transition: 'background-color 0.2s',
          }}
        >
          Borrow
        </Link>
      </nav>

      {/* Wallet Connect Button */}
      <WalletButton />
    </header>
  );
}

export default Header;