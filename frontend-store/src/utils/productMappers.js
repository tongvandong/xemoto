// Map dữ liệu sản phẩm/danh mục/giỏ hàng từ backend xemoto (MoToSale) sang shape UI dùng.
// Backend luôn trả JSON camelCase nên ở đây đọc THẲNG đúng tên trường, không dò nhiều alias.
// Tên trường backend tham chiếu:
//   ProductListItem: id, code, name, slug, categoryId, brandId, vehicleModelId, kind,
//                    isFeatured, isHotDeal, listPrice, salePrice, mainImageUrl, stockTotal, status
//   ProductDetail:   ...id/code/name/slug/categoryId/brandId..., shortDescription, description, skus[], images[]
//   SkuDto:          id, skuCode, variantName, color, version, listPrice, salePrice, status, available
//   ProductImageDto: id, skuId, url, alt, isPrimary, sortOrder
import { normalizeImageUrl } from './formatters.js';

const toNumber = (value) => Number(value || 0);

// Một SKU (biến thể) từ backend -> shape biến thể UI dùng.
function normalizeVariant(sku) {
  if (!sku) {
    return null;
  }

  const listPrice = toNumber(sku.listPrice);
  const salePrice = sku.salePrice == null ? null : Number(sku.salePrice);
  const sellPrice = salePrice != null && salePrice > 0 ? salePrice : listPrice;

  return {
    id: sku.id,
    variantName: sku.variantName || '',
    sku: sku.skuCode || '',
    basePrice: listPrice,
    salePrice,
    sellPrice,
    stockQuantity: sku.available,
    status: sku.status,
    version: sku.version,
    color: sku.color,
    exteriorColor: sku.color,
    images: [],
    raw: sku,
  };
}

// Một ảnh sản phẩm từ backend -> shape ảnh UI dùng.
function normalizeImage(image) {
  return {
    id: image.id,
    productVariantId: image.skuId,
    imageUrl: normalizeImageUrl(image.url),
    altText: image.alt,
    isPrimary: image.isPrimary,
    sortOrder: image.sortOrder || 0,
    raw: image,
  };
}

export function normalizeProduct(raw) {
  if (!raw) {
    return null;
  }

  const images = (raw.images || []).map(normalizeImage).filter((image) => image.imageUrl);
  // Chi tiết sản phẩm trả biến thể trong "skus"; danh sách sản phẩm thì không có biến thể.
  const variants = (raw.skus || []).map(normalizeVariant).filter(Boolean);

  // ===== Tính giá & tồn cho cấp sản phẩm =====
  // - Trang danh sách: backend đã có sẵn listPrice/salePrice/stockTotal ở cấp sản phẩm.
  // - Trang chi tiết: giá/tồn nằm trong từng SKU, gom lại để hiển thị "Từ {giá thấp nhất}".
  const sellPricesFromVariants = variants
    .map((variant) => (variant.sellPrice > 0 ? variant.sellPrice : variant.basePrice))
    .filter((price) => price > 0);
  const listPricesFromVariants = variants
    .map((variant) => variant.basePrice)
    .filter((price) => price > 0);

  const topListPrice = toNumber(raw.listPrice);
  const topSellPrice = raw.salePrice != null && Number(raw.salePrice) > 0 ? Number(raw.salePrice) : topListPrice;

  const minSellPrice = sellPricesFromVariants.length ? Math.min(...sellPricesFromVariants) : topSellPrice;
  const maxSellPrice = sellPricesFromVariants.length ? Math.max(...sellPricesFromVariants) : topSellPrice;
  const baseListPrice = listPricesFromVariants.length ? Math.min(...listPricesFromVariants) : topListPrice;

  let totalStock = toNumber(raw.stockTotal);
  if (variants.length) {
    totalStock = 0;
    for (const variant of variants) {
      totalStock += toNumber(variant.stockQuantity);
    }
  }

  return {
    id: raw.id,
    productCode: raw.code,
    name: raw.name || '',
    slug: raw.slug,
    categoryId: raw.categoryId,
    categoryName: raw.categoryName,
    brandId: raw.brandId,
    brandName: raw.brandName,
    carModelId: raw.vehicleModelId,
    kind: raw.kind,
    shortDescription: raw.shortDescription,
    description: raw.description,
    isFeatured: raw.isFeatured,
    isHotDeal: raw.isHotDeal,
    // Giá tổng hợp: minPrice = giá bán thấp nhất ("Từ {minPrice}"); basePrice = giá niêm yết (gạch ngang).
    minPrice: minSellPrice,
    maxPrice: maxSellPrice,
    basePrice: baseListPrice,
    salePrice: minSellPrice > 0 ? minSellPrice : null,
    discountPercent: null,
    stockQuantity: totalStock,
    mainImageUrl: normalizeImageUrl(raw.mainImageUrl),
    status: raw.status,
    isActive: raw.status !== 0,
    averageRating: toNumber(raw.averageRating),
    totalReviews: toNumber(raw.totalReviews),
    images,
    variants,
    raw,
  };
}

export function normalizeProductList(response) {
  const rawItems = Array.isArray(response) ? response : response?.items || [];
  const pageSize = response?.pageSize || rawItems.length;
  const totalCount = response?.totalItems ?? rawItems.length;

  return {
    items: rawItems.map(normalizeProduct).filter(Boolean),
    totalCount,
    page: response?.page || 1,
    pageSize,
    totalPages: response?.totalPages || Math.max(1, Math.ceil(totalCount / Math.max(pageSize, 1))),
  };
}

// CategoryDto: id, parentId, name, slug, kind, sortOrder, status
export function normalizeCategory(raw) {
  return {
    id: raw.id,
    name: raw.name || '',
    slug: raw.slug,
    parentCategoryId: raw.parentId,
    kind: raw.kind,
    image: normalizeImageUrl(raw.imageUrl || ''),
    sortOrder: raw.sortOrder || 0,
    isActive: raw.status !== 0,
  };
}

// /products/filters trả: categories[], brands[], carModels[], partCompatibleTypes[]
export function normalizeFilters(response) {
  return {
    categories: (response?.categories || []).map(normalizeCategory),
    brands: (response?.brands || []).map((brand) => ({
      id: brand.id,
      name: brand.name || '',
    })),
    carModels: response?.carModels || [],
    partCompatibleTypes: (response?.partCompatibleTypes || []).map((item) => ({
      id: item.id,
      name: item.name || '',
      brandId: item.brandId,
      brandName: item.brandName || '',
    })),
  };
}

// CartDto: id, items[], totalItems, subtotal
// CartItemDto: id, productId, skuId, skuCode, productName, qty, unitPrice, lineTotal, imageUrl
export function normalizeCart(response) {
  const rawItems = response?.items || [];
  const items = rawItems.map((item) => {
    const quantity = toNumber(item.qty);
    const unitPrice = toNumber(item.unitPrice);
    const lineTotal = item.lineTotal != null ? Number(item.lineTotal) : unitPrice * quantity;
    const imageUrl = normalizeImageUrl(item.imageUrl);

    return {
      id: item.id,
      productId: item.productId,
      productVariantId: item.skuId,
      quantity,
      unitPrice,
      lineTotal,
      sku: item.skuCode || '',
      variantName: '',
      product: {
        id: item.productId,
        name: item.productName || '',
        mainImageUrl: imageUrl,
        images: imageUrl ? [{ imageUrl, isPrimary: true }] : [],
      },
      productVariant: item.skuCode ? { id: item.skuId, sku: item.skuCode, variantName: '' } : null,
    };
  });

  return {
    id: response?.id,
    items,
    totalItems: response?.totalItems != null ? Number(response.totalItems) : items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: response?.subtotal != null ? Number(response.subtotal) : items.reduce((sum, item) => sum + item.lineTotal, 0),
  };
}
