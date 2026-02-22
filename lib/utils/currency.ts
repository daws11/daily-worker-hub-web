/**
 * Format a number as Indonesian Rupiah (IDR)
 * @param amount - The number to format
 * @returns Formatted string with "Rp" prefix and thousand separators
 */
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
