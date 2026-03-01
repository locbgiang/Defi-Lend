// Format a number with commas and decimal places
export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Format currency (USD)
export function formatUSD(value: number): string {
  if (value >= 1_000_000) {
    return `$${formatNumber(value / 1_000_000, 2)}M`;
  }
  if (value >= 1_000) {
    return `$${formatNumber(value / 1_000, 2)}K`;
  }
  return `$${formatNumber(value, 2)}`;
}

// Format token amount with decimals
export function formatTokenAmount(
  value: bigint,
  decimals: number,
  displayDecimals: number = 4
): string {
  const divisor = BigInt(10 ** decimals);
  const integerPart = value / divisor;
  const fractionalPart = value % divisor;
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const displayFractional = fractionalStr.slice(0, displayDecimals);
  
  return `${integerPart.toLocaleString()}.${displayFractional}`;
}

// Format percentage
export function formatPercent(value: number, decimals: number = 2): string {
  return `${formatNumber(value, decimals)}%`;
}

// Format health factor
export function formatHealthFactor(healthFactor: bigint): string {
  // Health factor is in 1e18 format
  if (healthFactor >= BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')) {
    return '∞';
  }
  const value = Number(healthFactor) / 1e18;
  if (value > 10) return '>10';
  return value.toFixed(2);
}

// Get health factor color
export function getHealthFactorColor(healthFactor: bigint): string {
  if (healthFactor >= BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')) {
    return '#2e7d32'; // green - no debt
  }
  const value = Number(healthFactor) / 1e18;
  if (value >= 2) return '#2e7d32'; // green - safe
  if (value >= 1.5) return '#ff9800'; // orange - caution
  if (value >= 1) return '#f44336'; // red - danger
  return '#d32f2f'; // dark red - liquidatable
}

// Shorten address
export function shortenAddress(address: string, chars: number = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

// Parse token amount from string input
export function parseTokenAmount(value: string, decimals: number): bigint {
  const [integer, fraction = ''] = value.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(integer + paddedFraction);
}
