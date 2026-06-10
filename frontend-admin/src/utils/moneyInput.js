export const normalizeMoneyInput = (value) => String(value || '').replace(/\D/g, '');

export const formatMoneyInput = (value) => {
  const digits = normalizeMoneyInput(value);
  return digits ? Number(digits).toLocaleString('vi-VN') : '';
};
