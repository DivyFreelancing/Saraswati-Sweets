/**
 * Indian digit grouping currency formatter (e.g. ₹1,250, ₹10,500, ₹1,50,000)
 */
export function formatINR(amount: number, showDecimals: boolean = false): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '₹0';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: showDecimals ? 2 : 0,
    minimumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);
}

/**
 * Format weight in grams into human readable text (e.g. 250g, 500g, 1 kg)
 */
export function formatWeight(grams: number): string {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return `${kg % 1 === 0 ? kg : kg.toFixed(1)} kg`;
  }
  return `${grams}g`;
}
