import { NavLink } from 'react-router-dom';
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
        <NavLink to="/dashboard" className={({ isActive }) => `header-nav-link ${isActive ? 'header-nav-link--active' : ''}`}>Dashboard</NavLink>
        <NavLink to="/markets" className={({ isActive }) => `header-nav-link ${isActive ? 'header-nav-link--active' : ''}`}>Markets</NavLink>
        <NavLink to="/supply" className={({ isActive }) => `header-nav-link ${isActive ? 'header-nav-link--active' : ''}`}>Supply</NavLink>
        <NavLink to="/borrow" className={({ isActive }) => `header-nav-link ${isActive ? 'header-nav-link--active' : ''}`}>Borrow</NavLink>
        <NavLink to="/liquidation" className={({ isActive }) => `header-nav-link header-nav-link--liquidation ${isActive ? 'header-nav-link--active' : ''}`}>⚡ Liquidate</NavLink>
      </nav>

      {/* Wallet Connect Button */}
      <WalletButton />
    </header>
  );
}

export default Header;