import { Link } from 'react-router-dom';

function Header() {
  return (
    <header>
      {/* Logo */}
      <div>
        <span>🏦</span>
        <span>Defi-Lend</span>
      </div>

      {/* Navigation */}
      <nav>
        <Link to="/dashboard">
          Dashboard
        </Link>
        <Link to="/markets">
          Markets
        </Link>
        <Link to="/supply">
          Supply
        </Link>
        <Link to="/borrow">
          Borrow
        </Link>
      </nav>

      {/* Wallet Connect Button */}
      
    </header>
  );
}

export default Header;