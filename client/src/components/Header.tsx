
function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-blue-500">🏦</span>
        <span className="text-xl font-semibold">Defi-Lend</span>
      </div>

      {/* Navigation */}
      <nav className="hidden md:flex items-center gap-6">
        <a href="#" className="hover:text-blue-400 transition-colors">
          Dashboard
        </a>
        <a href="#" className="hover:text-blue-400 transition-colors">
          Markets
        </a>
        <a href="#" className="hover:text-blue-400 transition-colors">
          Supply
        </a>
        <a href="#" className="hover:text-blue-400 transition-colors">
          Borrow
        </a>
      </nav>

      {/* Wallet Connect Button */}
      
    </header>
  );
}

export default Header;