import api from './api';

// Lớp chuẩn hoá (normalize) cho sản phẩm/biến thể (SKU)/ảnh: BE trả DTO tiếng Anh
// (name, listPrice, salePrice, variantName, version, color...). Các hàm dưới map về shape cho UI
// và GIỮ THÊM alias tiếng Việt (tenBienThe, phienBan...) để trang cũ chạy.
// Sản phẩm có cấu trúc lồng (SKU + ảnh + tương thích) nên lớp này dày hơn — coi như adapter, đọc field ưu tiên tên tiếng Anh.
const buildSkuDisplayName = (version, color) =>
  [String(version || '').trim(), String(color || '').trim()].filter(Boolean).join(' - ');

const inferSkuVersion = (sku, color) => {
  const explicitVersion = sku.phienBan ?? sku.version;
  if (explicitVersion) return explicitVersion;

  const name = sku.variantName ?? sku.tenBienThe ?? '';
  const colorSuffix = color ? ` - ${color}` : '';
  if (colorSuffix && String(name).endsWith(colorSuffix)) {
    return String(name).slice(0, -colorSuffix.length).trim();
  }
  return name;
};

const normalizeSku = (sku) => {
  const color = sku.mauSac ?? sku.color ?? '';
  const version = inferSkuVersion(sku, color);
  const displayName = sku.tenBienThe ?? sku.variantName ?? buildSkuDisplayName(version, color);

  return {
    ...sku,
    sku: sku.sku ?? sku.skuCode ?? '',
    tenBienThe: displayName,
    mauSac: color,
    phienBan: version,
    giaNiemYet: sku.giaNiemYet ?? sku.listPrice ?? 0,
    giaKhuyenMai: sku.giaKhuyenMai ?? sku.salePrice ?? null,
    trangThai: sku.trangThai ?? (sku.status === 0 ? 'Inactive' : 'Available'),
  };
};

const normalizeImage = (image) => ({
  ...image,
  maAnhSanPham: image.maAnhSanPham ?? image.id,
  maBienSanPham: image.maBienSanPham ?? image.skuId ?? null,
  urlAnh: image.urlAnh ?? image.url,
  altText: image.altText ?? image.alt,
  laAnhChinh: image.laAnhChinh ?? image.isPrimary ?? false,
});

const normalizeProduct = (product) => ({
  ...product,
  maSanPham: product.maSanPham ?? product.id,
  maSanPhamKinhDoanh: product.maSanPhamKinhDoanh ?? product.code,
  tenSanPham: product.tenSanPham ?? product.name,
  maDanhMuc: product.maDanhMuc ?? product.categoryId,
  maHangXe: product.maHangXe ?? product.brandId,
  maDongXe: product.maDongXe ?? product.vehicleModelId,
  loaiSanPham: product.loaiSanPham ?? (product.kind === 2 ? 'PhuTung' : 'XeMay'),
  giaGoc: product.giaGoc ?? product.listPrice ?? 0,
  giaKhuyenMai: product.giaKhuyenMai ?? product.salePrice ?? null,
  anhChinhUrl: product.anhChinhUrl ?? product.mainImageUrl ?? null,
  maHangSanXuat: product.maHangSanXuat ?? product.manufacturerId ?? null,
  tenHangSanXuat: product.tenHangSanXuat ?? product.manufacturerName ?? '',
  trangThaiSanPham: product.trangThaiSanPham ?? (product.status === 0 ? 'Inactive' : 'Available'),
  noiBat: product.noiBat ?? product.isFeatured ?? false,
  hotDeal: product.hotDeal ?? product.isHotDeal ?? false,
  soLuongTon: product.soLuongTon ?? product.stockTotal ?? product.stock ?? 0,
});

const mapProductSearchParams = (params = {}) => ({
  page: params.page,
  pageSize: params.pageSize,
  keyword: params.keyword,
  kind: params.kind ?? (params.loaiSanPham === 'PhuTung' ? 2 : params.loaiSanPham === 'XeMay' ? 1 : undefined),
  categoryId: params.categoryId ?? params.maDanhMuc,
  brandId: params.brandId ?? params.maHangXe,
  status: (() => {
    const status = params.status ?? params.trangThaiSanPham;
    if (status === 'Available') return 1;
    if (status === 'Inactive') return 0;
    if (status === 'Discontinued') return -1;
    return status;
  })(),
  minPrice: params.minPrice,
  maxPrice: params.maxPrice,
  stockStatus: params.stockStatus,
  hasPromotion: params.hasPromotion,
});

const mapCollection = async (request, mapper) => {
  const response = await request;
  const data = response.data;
  if (Array.isArray(data)) {
    response.data = data.map(mapper);
    return response;
  }
  response.data = { ...data, items: (data?.items || data?.data || []).map(mapper) };
  return response;
};

const mapSkuPayload = (data, includeStatus = false) => {
  const salePrice = data.salePrice ?? data.giaKhuyenMai;
  const version = String(data.version ?? data.phienBan ?? '').trim();
  const color = String(data.color ?? data.mauSac ?? '').trim();
  const derivedName = [version, color].filter(Boolean).join(' - ');
  const variantName = String(data.variantName ?? data.tenBienThe ?? '').trim() || derivedName || null;
  const payload = {
    skuCode: data.skuCode ?? data.sku ?? null,
    variantName,
    color: color || null,
    version: version || null,
    listPrice: Number(data.listPrice ?? data.giaNiemYet ?? data.giaGhiDe) || 0,
    salePrice: salePrice === '' || salePrice == null ? null : Number(salePrice),
    barcode: data.barcode ?? null,
  };
  if (includeStatus) payload.status = data.status === 0 || data.trangThai === 'Inactive' ? 0 : 1;
  return payload;
};

const mapProductPayload = (data, includeIdentity = false) => {
  const salePrice = data.salePrice ?? data.giaKhuyenMai;
  const payload = {
    name: data.name ?? data.tenSanPham,
    slug: data.slug || null,
    categoryId: Number(data.categoryId ?? data.maDanhMuc),
    brandId: data.brandId ?? data.maHangXe ?? null,
    vehicleModelId: data.vehicleModelId ?? data.maDongXe ?? null,
    shortDescription: data.shortDescription ?? data.moTaNgan ?? null,
    description: data.description ?? data.moTa ?? null,
    isFeatured: Boolean(data.isFeatured ?? data.noiBat),
    isHotDeal: Boolean(data.isHotDeal ?? data.hotDeal),
    manufacturerId: data.manufacturerId ?? data.maHangSanXuat ?? null,
  };
  if (includeIdentity) {
    payload.code = data.code ?? data.maSanPhamKinhDoanh ?? '';
    payload.kind = data.kind ?? (data.loaiSanPham === 'PhuTung' ? 2 : 1);
    payload.listPrice = Number(data.listPrice ?? data.giaGoc) || 0;
    payload.salePrice = salePrice === '' || salePrice == null ? null : Number(salePrice);
  } else {
    payload.listPrice = Number(data.listPrice ?? data.giaGoc) || 0;
    payload.salePrice = salePrice === '' || salePrice == null ? null : Number(salePrice);
    payload.status = data.status === 0 || data.trangThaiSanPham === 'Inactive' ? 0 : 1;
  }
  return payload;
};

const normalizeImageFormData = (formData) => {
  if (formData.has('isMain') && !formData.has('isPrimary')) {
    formData.append('isPrimary', formData.get('isMain'));
  }
  if (formData.has('maBienSanPham') && !formData.has('skuId')) {
    formData.append('skuId', formData.get('maBienSanPham'));
  }
  return formData;
};

const productService = {
  getAll: (params) => mapCollection(api.get('/products', { params: mapProductSearchParams(params) }), normalizeProduct),
  getById: async (id) => {
    const response = await api.get(`/products/${id}`);
    response.data = normalizeProduct(response.data);
    return response;
  },
  create: (data) => api.post('/products', mapProductPayload(data, true)),
  update: (id, data) => api.put(`/products/${id}`, mapProductPayload(data)),
  delete: (id) => api.delete(`/products/${id}`),
  getVariants: (productId) => mapCollection(api.get(`/products/${productId}/skus`), normalizeSku),
  createVariant: (productId, data) => api.post(`/products/${productId}/skus`, mapSkuPayload(data)),
  updateVariant: (productId, variantId, data) => api.put(`/products/${productId}/skus/${variantId}`, mapSkuPayload(data, true)),
  deleteVariant: (productId, variantId) => api.delete(`/products/${productId}/skus/${variantId}`),
  getImages: (productId) => mapCollection(api.get(`/products/${productId}/images`), normalizeImage),
  uploadImage: (productId, formData) => api.post(`/products/${productId}/images`, normalizeImageFormData(formData), {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  setPrimaryImage: (productId, imageId) => api.post(`/products/${productId}/images/${imageId}/primary`),
  deleteImage: (productId, imageId) => api.delete(`/products/${productId}/images/${imageId}`),
  getCompatibilities: (productId) => api.get(`/products/${productId}/compatibilities`),
  createCompatibility: (productId, data) => api.post(`/products/${productId}/compatibilities`, data),
  updateCompatibility: (productId, compatibilityId, data) => api.put(`/products/${productId}/compatibilities/${compatibilityId}`, data),
  deleteCompatibility: (productId, compatibilityId) => api.delete(`/products/${productId}/compatibilities/${compatibilityId}`),
  getPromotions: (productId) => api.get(`/products/${productId}/promotions`),
  getRelatedItems: (productId) => api.get(`/products/${productId}/related`),
  createRelatedItem: (productId, data) => api.post(`/products/${productId}/related`, data),
  updateRelatedItem: (productId, relatedId, data) => api.put(`/products/${productId}/related/${relatedId}`, data),
  deleteRelatedItem: (productId, relatedId) => api.delete(`/products/${productId}/related/${relatedId}`),
  getInventoryAging: (productId) => api.get(`/products/${productId}/inventory-aging`),
  getBarcodes: (productId) => api.get(`/products/${productId}/barcodes`),
};

export default productService;
