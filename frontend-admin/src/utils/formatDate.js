const hasTimeZone = (value) => /(?:z|[+-]\d{2}:?\d{2})$/i.test(value);

const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const raw = String(value);
  const normalized = raw.includes('T') && !hasTimeZone(raw) ? `${raw}Z` : raw;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Format datetime string sang dd/MM/yyyy HH:mm
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Format datetime string sang dd/MM/yyyy
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDateShort(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
