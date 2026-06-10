export function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function normalizeImageUrl(url) {
  if (!url) {
    return '';
  }
  if (/^(https?:|data:|blob:)/i.test(url)) {
    return url;
  }
  if (url.startsWith('//')) {
    return `https:${url}`;
  }
  return url;
}

export function getProductPrice(product) {
  return product?.salePrice ?? product?.basePrice ?? product?.price ?? 0;
}

export function getProductDiscountPercent(product) {
  const explicitPercent = product?.discountPercent ?? product?.tyLeGiam ?? product?.TyLeGiam;

  if (Number(explicitPercent) > 0) {
    return Math.round(Number(explicitPercent));
  }

  const basePrice = Number(product?.basePrice || 0);
  const salePrice = Number(product?.salePrice ?? product?.price ?? 0);

  if (!basePrice || !salePrice || salePrice >= basePrice) {
    return null;
  }

  return Math.round(((basePrice - salePrice) * 100) / basePrice);
}

export function getProductImage(product) {
  const primaryImage = product?.images?.find((image) => image?.isPrimary)?.imageUrl;
  return normalizeImageUrl(primaryImage || product?.images?.[0]?.imageUrl || product?.mainImageUrl || product?.imageUrl || '');
}
