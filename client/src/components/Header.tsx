import { Link } from 'react-router-dom';
import WalletButton from './WalletButton';
import '../styles/Header.css';

function Header() {
  return (
    <header className="header">
      {/* Logo */}
      <div className="header-logo">
        <span className="header-logo-icon">🏦</span>
        <span className="header-logo-text">Defi-Lend</span>
      </div>

      {/* Navigation */}
      <nav className="header-nav">
        <Link to="/dashboard" className="header-nav-link">Dashboard</Link>
        <Link to="/markets" className="header-nav-link">Markets</Link>
        <Link to="/supply" className="header-nav-link">Supply</Link>
        <Link to="/borrow" className="header-nav-link">Borrow</Link>
      </nav>

      {/* Wallet Connect Button */}
      <WalletButton />
    </header>
  );
}

export default Header;