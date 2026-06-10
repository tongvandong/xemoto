/**
 * Format số tiền sang VND
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  if (amount == null) return '0 ₫';
  return amount.toLocaleString('vi-VN') + ' ₫';
}
