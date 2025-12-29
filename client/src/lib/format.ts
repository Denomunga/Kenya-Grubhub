/**
 * Format a number with comma separators
 * @param value - The number to format
 * @returns Formatted string with commas (e.g., 25000 -> "25,000")
 */
export function formatNumber(value: number): string {
  if (isNaN(value) || value === null || value === undefined) {
    return '0';
  }
  
  return value.toLocaleString('en-US');
}

/**
 * Format a price with KSH currency and comma separators
 * @param price - The price to format
 * @returns Formatted string with KSH prefix and commas (e.g., 25000 -> "KSH 25,000")
 */
export function formatPrice(price: number): string {
  return `KSH ${formatNumber(price)}`;
}

/**
 * Format a price with KSHS suffix and comma separators (for backward compatibility)
 * @param price - The price to format
 * @returns Formatted string with KSHS suffix and commas (e.g., 25000 -> "25,000 KSHS")
 */
export function formatPriceKSHS(price: number): string {
  return `${formatNumber(price)} KSHS`;
}
