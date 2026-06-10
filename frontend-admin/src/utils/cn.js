export function cn(...values) {
  return values
    .flatMap((value) => {
      if (!value) return [];
      if (typeof value === 'string') return [value];
      if (Array.isArray(value)) return value;
      if (typeof value === 'object') {
        return Object.entries(value)
          .filter(([, enabled]) => Boolean(enabled))
          .map(([className]) => className);
      }
      return [];
    })
    .filter(Boolean)
    .join(' ');
}
