import { normalizeImageUrl } from './formatters.js';

function valueOf(source, camelKey, pascalKey = camelKey[0].toUpperCase() + camelKey.slice(1), ...aliases) {
  for (const key of [camelKey, pascalKey, ...aliases]) {
    if (source?.[key] !== undefined && source?.[key] !== null) {
      return source[key];
    }
  }

  return undefined;
}

function normalizeVariant(raw) {
  if (!raw) {
    return null;
  }

  const images = valueOf(raw, 'images') || [];

  return {
    id: valueOf(raw, 'id', 'Id', 'maBienSanPham', 'MaBienSanPham'),
    productId: valueOf(raw, 'productId', 'ProductId', 'maSanPham', 'MaSanPham'),
    variantName: valueOf(raw, 'variantName', 'VariantName', 'tenBienThe', 'TenBienThe') || '',
    sku: valueOf(raw, 'sku', 'SKU') || '',
    listPrice: valueOf(raw, 'listPrice', 'ListPrice') == null ? null : Number(valueOf(raw, 'listPrice', 'ListPrice')),
    salePrice: valueOf(raw, 'salePrice', 'SalePrice') == null ? null : Number(valueOf(raw, 'salePrice', 'SalePrice')),
    priceOverride: valueOf(raw, 'priceOverride', 'PriceOverride', 'giaGhiDe', 'GiaGhiDe') == null ? null : Number(valueOf(raw, 'priceOverride', 'PriceOverride', 'giaGhiDe', 'GiaGhiDe')),
    stockQuantity: valueOf(raw, 'stockQuantity', 'StockQuantity', 'soLuongTon', 'SoLuongTon'),
    status: valueOf(raw, 'status', 'Status', 'trangThai', 'TrangThai'),
    version: valueOf(raw, 'version', 'Version', 'phienBan', 'PhienBan'),
    color: valueOf(raw, 'color', 'Color', 'mauSac', 'MauSac') || valueOf(raw, 'exteriorColor'),
    exteriorColor: valueOf(raw, 'exteriorColor') || valueOf(raw, 'color', 'Color', 'mauSac', 'MauSac'),
    interiorColor: valueOf(raw, 'interiorColor'),
    images: images
      .map((image) => ({
        id: valueOf(image, 'id', 'Id', 'maAnhSanPham', 'MaAnhSanPham'),
        productVariantId: valueOf(image, 'productVariantId', 'ProductVariantId', 'skuId', 'SkuId', 'maBienSanPham', 'MaBienSanPham') ?? valueOf(raw, 'id', 'Id', 'maBienSanPham', 'MaBienSanPham'),
        imageUrl: normalizeImageUrl(valueOf(image, 'imageUrl', 'ImageUrl', 'urlAnh', 'UrlAnh') || valueOf(image, 'url')),
        altText: valueOf(image, 'altText'),
        isPrimary: valueOf(image, 'isPrimary', 'IsPrimary', 'laAnhChinh', 'LaAnhChinh'),
        sortOrder: valueOf(image, 'sortOrder', 'SortOrder', 'thuTuHienThi', 'ThuTuHienThi') || 0,
        raw: image,
      }))
      .filter((image) => image.imageUrl),
    raw,
  };
}

export function normalizeProduct(raw) {
  if (!raw) {
    return null;
  }

  const images = valueOf(raw, 'images') || valueOf(raw, 'productImages') || valueOf(raw, 'anh', 'Anh') || [];
  const variants = valueOf(raw, 'variants') || valueOf(raw, 'productVariants') || valueOf(raw, 'bienThe', 'BienThe') || [];
  const skus = valueOf(raw, 'skus', 'Skus') || [];
  const brand = valueOf(raw, 'brand');
  const category = valueOf(raw, 'category');

  // ----- Giá: BE v2 trả ListPrice/SalePrice (danh sách) hoặc giá nằm trong Skus[] (chi tiết) -----
  const skuPrices = skus
    .map((s) => ({
      list: Number(valueOf(s, 'listPrice', 'ListPrice') || 0),
      sale: valueOf(s, 'salePrice', 'SalePrice') == null ? null : Number(valueOf(s, 'salePrice', 'SalePrice')),
    }))
    .filter((x) => x.list > 0 || (x.sale != null && x.sale > 0));

  let basePrice = Number(valueOf(raw, 'basePrice', 'BasePrice', 'giaGoc', 'GiaGoc', 'listPrice', 'ListPrice') || 0);
  if (!basePrice && skuPrices.length) {
    const lists = skuPrices.map((x) => x.list).filter((p) => p > 0);
    if (lists.length) basePrice = Math.min(...lists);
  }

  let salePrice = valueOf(raw, 'salePrice', 'SalePrice', 'giaKhuyenMai', 'GiaKhuyenMai') == null
    ? null
    : Number(valueOf(raw, 'salePrice', 'SalePrice', 'giaKhuyenMai', 'GiaKhuyenMai'));
  if (salePrice == null && skuPrices.length) {
    const sales = skuPrices.map((x) => x.sale).filter((p) => p != null && p > 0);
    if (sales.length) salePrice = Math.min(...sales);
  }
  if (salePrice != null && basePrice > 0 && salePrice >= basePrice) salePrice = null; // KM không thấp hơn giá gốc => coi như không có KM

  // Biến thể: nếu BE trả Skus[] (chi tiết) thì dựng variants từ đó để chọn màu/phiên bản + giá theo SKU
  let variantList = (variants || []).map(normalizeVariant).filter(Boolean);
  if (variantList.length === 0 && skus.length) {
    variantList = skus.map((s) => {
      const sList = Number(valueOf(s, 'listPrice', 'ListPrice') || 0);
      const sSale = valueOf(s, 'salePrice', 'SalePrice') == null ? null : Number(valueOf(s, 'salePrice', 'SalePrice'));
      const effective = sSale != null && sSale > 0 ? sSale : sList;
      return {
        id: valueOf(s, 'id', 'Id'),
        variantName: valueOf(s, 'variantName', 'VariantName')
          || [valueOf(s, 'color', 'Color'), valueOf(s, 'version', 'Version')].filter(Boolean).join(' - ')
          || valueOf(s, 'skuCode', 'SkuCode') || '',
        sku: valueOf(s, 'skuCode', 'SkuCode') || '',
        color: valueOf(s, 'color', 'Color'),
        version: valueOf(s, 'version', 'Version'),
        listPrice: sList > 0 ? sList : null,
        salePrice: sSale != null && sSale > 0 ? sSale : null,
        priceOverride: effective > 0 ? effective : null,
        stockQuantity: valueOf(s, 'available', 'Available', 'stockQuantity', 'StockQuantity', 'soLuongTon', 'SoLuongTon'),
        status: valueOf(s, 'status', 'Status'),
        images: [],
        raw: s,
      };
    });
  }

  return {
    id: valueOf(raw, 'id', 'Id', 'maSanPham', 'MaSanPham'),
    productCode: valueOf(raw, 'productCode', 'ProductCode', 'maSanPhamKinhDoanh', 'MaSanPhamKinhDoanh'),
    name: valueOf(raw, 'name', 'Name', 'tenSanPham', 'TenSanPham') || '',
    slug: valueOf(raw, 'slug'),
    categoryId: valueOf(raw, 'categoryId', 'CategoryId', 'maDanhMuc', 'MaDanhMuc'),
    categoryName: category?.name || category?.Name || valueOf(raw, 'categoryName', 'CategoryName', 'tenDanhMuc', 'TenDanhMuc'),
    brandId: valueOf(raw, 'brandId', 'BrandId', 'maHangXe', 'MaHangXe'),
    brandName: brand?.name || brand?.Name || valueOf(raw, 'brandName', 'BrandName', 'tenHang', 'TenHang'),
    carModelId: valueOf(raw, 'carModelId', 'CarModelId', 'maDongXe', 'MaDongXe'),
    carModelName: valueOf(raw, 'carModelName', 'CarModelName', 'tenDongXe', 'TenDongXe') || valueOf(valueOf(raw, 'carModel'), 'name'),
    showroomId: valueOf(raw, 'showroomId', 'ShowroomId', 'maShowroom', 'MaShowroom'),
    showroomName: valueOf(raw, 'showroomName', 'ShowroomName', 'tenShowroom', 'TenShowroom') || valueOf(valueOf(raw, 'showroom'), 'name'),
    kind: valueOf(raw, 'kind', 'Kind'),
    productType: valueOf(raw, 'productType', 'ProductType', 'kind', 'Kind', 'loaiSanPham', 'LoaiSanPham'),
    shortDescription: valueOf(raw, 'shortDescription', 'ShortDescription', 'moTaNgan', 'MoTaNgan'),
    description: valueOf(raw, 'description', 'Description', 'moTa', 'MoTa'),
    basePrice,
    salePrice,
    discountPercent: valueOf(raw, 'discountPercent', 'DiscountPercent', 'tyLeGiam', 'TyLeGiam') == null ? null : Number(valueOf(raw, 'discountPercent', 'DiscountPercent', 'tyLeGiam', 'TyLeGiam')),
    stockQuantity: valueOf(raw, 'stockQuantity', 'StockQuantity', 'soLuongTon', 'SoLuongTon', 'stockTotal', 'StockTotal'),
    mainImageUrl: normalizeImageUrl(valueOf(raw, 'mainImageUrl', 'MainImageUrl', 'anhChinhUrl', 'AnhChinhUrl')),
    status: valueOf(raw, 'status', 'Status', 'trangThaiSanPham', 'TrangThaiSanPham'),
    isActive: valueOf(raw, 'isActive', 'IsActive', 'dangHoatDong', 'DangHoatDong') !== false,
    isFeatured: valueOf(raw, 'isFeatured', 'IsFeatured', 'noiBat', 'NoiBat') === true,
    isHotDeal: valueOf(raw, 'isHotDeal', 'IsHotDeal', 'hotDeal', 'HotDeal') === true,
    averageRating: Number(valueOf(raw, 'averageRating', 'AverageRating', 'diemTrungBinh', 'DiemTrungBinh') || 0),
    totalReviews: Number(valueOf(raw, 'totalReviews', 'TotalReviews', 'tongDanhGia', 'TongDanhGia') || 0),
    mainColor: valueOf(raw, 'mainColor'),
    motorcycleType: valueOf(raw, 'motorcycleType'),
    engineCapacity: valueOf(raw, 'engineCapacity'),
    power: valueOf(raw, 'power'),
    torque: valueOf(raw, 'torque'),
    fuelTankCapacity: valueOf(raw, 'fuelTankCapacity'),
    frontBrake: valueOf(raw, 'frontBrake'),
    rearBrake: valueOf(raw, 'rearBrake'),
    hasAbs: valueOf(raw, 'hasAbs'),
    weight: valueOf(raw, 'weight'),
    seatHeight: valueOf(raw, 'seatHeight'),
    origin: valueOf(raw, 'origin'),
    warrantyMonths: valueOf(raw, 'warrantyMonths'),
    condition: valueOf(raw, 'condition'),
    year: valueOf(raw, 'year'),
    mileage: valueOf(raw, 'mileage'),
    exteriorColor: valueOf(raw, 'exteriorColor'),
    transmission: valueOf(raw, 'transmission'),
    fuelType: valueOf(raw, 'fuelType'),
    engine: valueOf(raw, 'engine'),
    interiorColor: valueOf(raw, 'interiorColor'),
    seats: valueOf(raw, 'seats'),
    driveType: valueOf(raw, 'driveType'),
    vin: valueOf(raw, 'vin'),
    licensePlate: valueOf(raw, 'licensePlate'),
    images: images
      .map((image) => ({
        id: valueOf(image, 'id', 'Id', 'maAnhSanPham', 'MaAnhSanPham'),
        productVariantId: valueOf(image, 'productVariantId', 'ProductVariantId', 'skuId', 'SkuId', 'maBienSanPham', 'MaBienSanPham'),
        imageUrl: normalizeImageUrl(valueOf(image, 'imageUrl', 'ImageUrl', 'urlAnh', 'UrlAnh') || valueOf(image, 'url')),
        altText: valueOf(image, 'altText'),
        isPrimary: valueOf(image, 'isPrimary', 'IsPrimary', 'laAnhChinh', 'LaAnhChinh'),
        sortOrder: valueOf(image, 'sortOrder', 'SortOrder', 'thuTuHienThi', 'ThuTuHienThi') || 0,
        raw: image,
      }))
      .filter((image) => image.imageUrl),
    variants: variantList,
    raw,
  };
}

export function normalizeProductList(response) {
  const rawItems = Array.isArray(response) ? response : response?.items || response?.Items || [];
  const pageSize = response?.pageSize || response?.PageSize || rawItems.length;
  const totalCount = response?.totalCount || response?.TotalCount || response?.totalItems || response?.TotalItems || rawItems.length;

  return {
    items: rawItems.map(normalizeProduct).filter(Boolean),
    totalCount,
    page: response?.page || response?.Page || 1,
    pageSize,
    totalPages: response?.totalPages || response?.TotalPages || Math.max(1, Math.ceil(totalCount / Math.max(pageSize, 1))),
  };
}

export function normalizeCategory(raw) {
  return {
    id: valueOf(raw, 'id', 'Id', 'maDanhMuc', 'MaDanhMuc'),
    name: valueOf(raw, 'name', 'Name', 'tenDanhMuc', 'TenDanhMuc') || '',
    slug: valueOf(raw, 'slug'),
    parentCategoryId: valueOf(raw, 'parentCategoryId', 'ParentCategoryId', 'parentId', 'ParentId', 'maDanhMucCha', 'MaDanhMucCha'),
    description: valueOf(raw, 'description', 'Description', 'moTa', 'MoTa'),
    kind: valueOf(raw, 'kind', 'Kind'),
    status: valueOf(raw, 'status', 'Status'),
    sortOrder: valueOf(raw, 'sortOrder', 'SortOrder', 'thuTuHienThi', 'ThuTuHienThi') || 0,
    isActive: valueOf(raw, 'isActive', 'IsActive', 'dangHoatDong', 'DangHoatDong') !== false,
  };
}

export function normalizeFilters(response) {
  return {
    categories: (response?.categories || response?.Categories || []).map(normalizeCategory),
    brands: (response?.brands || response?.Brands || []).map((brand) => ({
      id: valueOf(brand, 'id', 'Id', 'maHangXe', 'MaHangXe'),
      name: valueOf(brand, 'name', 'Name', 'tenHang', 'TenHang') || '',
    })),
    carModels: response?.carModels || response?.CarModels || [],
    showrooms: response?.showrooms || response?.Showrooms || [],
    partCompatibleTypes: (response?.partCompatibleTypes || response?.PartCompatibleTypes || []).map((item) => ({
      id: valueOf(item, 'id', 'Id', 'maDongXe', 'MaDongXe'),
      name: valueOf(item, 'name', 'Name', 'tenDongXe', 'TenDongXe') || '',
      brandId: valueOf(item, 'brandId', 'BrandId', 'maHangXe', 'MaHangXe'),
      brandName: valueOf(item, 'brandName', 'BrandName', 'tenHang', 'TenHang') || '',
    })),
  };
}

export function normalizeCart(response) {
  const items = response?.items || response?.Items || [];
  const normalizedItems = items.map((item) => {
    const quantity = Number(valueOf(item, 'quantity', 'Quantity', 'qty', 'Qty', 'soLuong', 'SoLuong') || 1);
    const unitPrice = Number(valueOf(item, 'unitPrice', 'UnitPrice', 'donGia', 'DonGia') || 0);
    const lineTotal = Number(valueOf(item, 'lineTotal', 'LineTotal', 'thanhTien', 'ThanhTien') || unitPrice * quantity);
    const productId = valueOf(item, 'productId', 'ProductId', 'maSanPham', 'MaSanPham');
    const skuCode = valueOf(item, 'skuCode', 'SkuCode', 'skuSnapshot', 'SkuSnapshot', 'maSku', 'MaSku');
    const imageUrl = normalizeImageUrl(valueOf(item, 'imageUrl', 'ImageUrl', 'mainImageUrl', 'MainImageUrl', 'anhChinhUrl', 'AnhChinhUrl'));
    const rawVariant = valueOf(item, 'productVariant');

    return {
      id: valueOf(item, 'id', 'Id', 'maChiTietGioHang', 'MaChiTietGioHang'),
      cartId: valueOf(item, 'cartId', 'CartId', 'maGioHang', 'MaGioHang'),
      productId,
      skuCode,
      productVariantId: valueOf(item, 'productVariantId', 'ProductVariantId', 'skuId', 'SkuId', 'maBienSanPham', 'MaBienSanPham'),
      quantity,
      unitPrice,
      lineTotal,
      imageUrl,
      product: normalizeProduct(valueOf(item, 'product')) || {
        id: productId,
        name: valueOf(item, 'productName', 'ProductName', 'tenSanPham', 'TenSanPham') || '',
        mainImageUrl: imageUrl,
      },
      productVariant: normalizeVariant(rawVariant) || rawVariant || {
        id: valueOf(item, 'skuId', 'SkuId', 'productVariantId', 'ProductVariantId'),
        sku: skuCode,
        variantName: skuCode,
      },
    };
  });

  return {
    ...response,
    id: valueOf(response, 'id', 'Id', 'maGioHang', 'MaGioHang'),
    userId: valueOf(response, 'userId', 'UserId', 'maNguoiDung', 'MaNguoiDung'),
    status: valueOf(response, 'status', 'Status', 'trangThai', 'TrangThai'),
    items: normalizedItems,
    totalItems: Number(valueOf(response, 'totalItems', 'TotalItems', 'tongSoLuong', 'TongSoLuong') ?? normalizedItems.reduce((sum, item) => sum + item.quantity, 0)),
    subtotal: Number(valueOf(response, 'subtotal', 'Subtotal', 'tongTienHang', 'TongTienHang') ?? normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0)),
  };
}
