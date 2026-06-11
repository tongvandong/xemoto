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
  if (url.startsWith('/uploads/')) {
    const assetBaseUrl = import.meta.env.VITE_API_ASSET_BASE_URL || '';
    return `${assetBaseUrl}${url}`;
  }
  return url;
}

export function getProductPrice(product) {
  // Giá hiển thị trên thẻ = giá bán thấp nhất trong các biến thể đang bán.
  const min = Number(product?.minPrice ?? 0);
  if (min > 0) {
    return min;
  }
  return product?.salePrice ?? product?.basePrice ?? product?.price ?? 0;
}

// Có nên hiển thị tiền tố "Từ" không (khi các biến thể có nhiều mức giá khác nhau).
export function isPriceFrom(product) {
  const min = Number(product?.minPrice ?? 0);
  const max = Number(product?.maxPrice ?? 0);
  return min > 0 && max > min;
}

function roundToOneDecimal(value) {
  // Preserve up to 1 decimal place (0.393 -> 0.4, 15 -> 15) instead of
  // collapsing sub-1% discounts to 0 via Math.round.
  return Math.round(value * 10) / 10;
}

export function getProductDiscountPercent(product) {
  const explicitPercent = product?.discountPercent ?? product?.tyLeGiam ?? product?.TyLeGiam;

  if (Number(explicitPercent) > 0) {
    const rounded = roundToOneDecimal(Number(explicitPercent));
    return rounded > 0 ? rounded : null;
  }

  const basePrice = Number(product?.basePrice || 0);
  const salePrice = Number(product?.salePrice ?? product?.price ?? 0);

  if (!basePrice || !salePrice || salePrice >= basePrice) {
    return null;
  }

  const rounded = roundToOneDecimal(((basePrice - salePrice) * 100) / basePrice);
  return rounded > 0 ? rounded : null;
}

// Render a discount percent without a trailing ".0" (0.4 -> "0.4", 15 -> "15").
// Values are already rounded to 1 decimal by getProductDiscountPercent, so
// String() yields "0.4" for fractional and "15" for integer values.
export function formatDiscountPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return '';
  }
  return String(num);
}

export function getProductImage(product) {
  const variantImages = (product?.variants || [])
    .flatMap((variant) => variant?.images || [])
    .map((image) => image?.imageUrl)
    .filter(Boolean);
  const linkedVariantImage = product?.images?.find((image) => image?.productVariantId && image?.imageUrl)?.imageUrl;
  const primaryImage = product?.images?.find((image) => image?.isPrimary)?.imageUrl;

  return normalizeImageUrl(
    variantImages[0] ||
      linkedVariantImage ||
      primaryImage ||
      product?.images?.[0]?.imageUrl ||
      product?.mainImageUrl ||
      product?.imageUrl ||
      '',
  );
}
