function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function uniqueBy(items, getKey) {
  const seen = new Set();

  return items.filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getRawProduct(product) {
  return product?.raw || product || {};
}

function getRawSkus(product) {
  const raw = getRawProduct(product);
  return product?.variants || raw.skus || [];
}

function getRawImages(product) {
  const raw = getRawProduct(product);
  return product?.images || raw.images || [];
}

function normalizeVariant(sku, product) {
  const raw = sku?.raw || sku || {};
  const listPrice = raw.listPrice ?? sku?.basePrice ?? 0;
  const salePrice = raw.salePrice ?? sku?.salePrice ?? null;
  const sellPrice = salePrice != null && Number(salePrice) > 0 ? Number(salePrice) : Number(listPrice || 0);
  const version = raw.version || sku?.version || raw.variantName || sku?.variantName || product?.name || '';
  const color = raw.color || sku?.color || '';

  return {
    id: raw.id ?? sku?.id,
    productId: raw.productId ?? sku?.productId ?? product?.id,
    variantName: raw.variantName || sku?.variantName || version,
    version,
    color,
    colorSource: color ? 'api' : 'none',
    versionSource: version ? 'api' : 'none',
    exteriorColor: color,
    sku: raw.skuCode || sku?.sku || '',
    basePrice: getNumber(listPrice),
    salePrice: salePrice == null ? null : getNumber(salePrice),
    sellPrice,
    discountPercent: null,
    stockQuantity: raw.available ?? sku?.stockQuantity,
    status: raw.status ?? sku?.status,
    imageUrl: sku?.imageUrl || '',
    raw,
  };
}

function normalizeImage(image, variants = []) {
  const raw = image?.raw || image || {};
  const productVariantId = raw.skuId ?? image?.productVariantId;
  const linkedVariant = productVariantId
    ? variants.find((variant) => String(variant.id) === String(productVariantId))
    : null;

  return {
    id: raw.id ?? image?.id ?? raw.url ?? image?.imageUrl,
    productVariantId,
    imageUrl: raw.url || image?.imageUrl || '',
    altText: raw.alt || image?.altText || '',
    isPrimary: raw.isPrimary === true || image?.isPrimary === true,
    sortOrder: raw.sortOrder ?? image?.sortOrder ?? 0,
    color: linkedVariant?.color || '',
    colorSource: linkedVariant?.color ? 'api' : 'none',
    version: linkedVariant?.version || '',
    versionSource: linkedVariant?.version ? 'api' : 'none',
    raw,
  };
}

export function normalizeProductOptions(product) {
  const rawSkus = getRawSkus(product);
  const rawImages = getRawImages(product);

  const variants = uniqueBy(
    rawSkus.map((sku) => normalizeVariant(sku, product)).filter((variant) => variant.id || variant.variantName),
    (variant) => String(variant.id || `${variant.version}-${variant.color}-${variant.sku || ''}`),
  );

  const images = uniqueBy(
    rawImages
      .map((image) => normalizeImage(image, variants))
      .filter((image) => image.imageUrl)
      .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0)),
    (image) => image.imageUrl,
  );

  const variantsWithImages = variants.map((variant) => ({
    ...variant,
    imageUrl: images.find((image) => String(image.productVariantId || '') === String(variant.id || ''))?.imageUrl || '',
  }));

  const versions = uniqueBy(
    variantsWithImages.map((variant) => variant.version).filter(Boolean),
    (version) => normalizeText(version),
  );
  const colors = uniqueBy(
    variantsWithImages.map((variant) => variant.color).filter(Boolean),
    (color) => normalizeText(color),
  );

  const fallbackNotes = [];
  if (rawImages.length > 1 && !images.some((image) => image.productVariantId)) {
    fallbackNotes.push('API có nhiều ảnh nhưng chưa gắn skuId cho ảnh, nên gallery hiển thị toàn bộ ảnh.');
  }

  return {
    versions,
    colors,
    variants: variantsWithImages,
    images,
    hasVersionOptions: versions.length > 0,
    hasColorOptions: colors.length > 0,
    hasColorMapping: colors.length > 0,
    hasVariantData: variantsWithImages.length > 0,
    fallbackNotes,
    rawCapabilities: {
      hasImages: rawImages.length > 0,
      hasVariants: rawSkus.length > 0,
      hasSchemaColors: false,
      hasOptions: false,
      hasAttributes: false,
      hasProductVariants: false,
    },
  };
}
