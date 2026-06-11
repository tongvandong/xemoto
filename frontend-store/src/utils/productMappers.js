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
    // Giá thật nằm ở biến thể: basePrice = GiaGoc, salePrice = GiaKhuyenMai, sellPrice = GiaBan (hiệu lực).
    basePrice: Number(valueOf(raw, 'basePrice', 'BasePrice', 'listPrice', 'ListPrice', 'giaGoc', 'GiaGoc') || 0),
    salePrice: valueOf(raw, 'salePrice', 'SalePrice', 'giaKhuyenMai', 'GiaKhuyenMai') == null ? null : Number(valueOf(raw, 'salePrice', 'SalePrice', 'giaKhuyenMai', 'GiaKhuyenMai')),
    sellPrice: Number(valueOf(raw, 'sellPrice', 'SellPrice', 'listPrice', 'ListPrice', 'giaBan', 'GiaBan') || 0),
    discountPercent: valueOf(raw, 'discountPercent', 'DiscountPercent', 'tyLeGiam', 'TyLeGiam') == null ? null : Number(valueOf(raw, 'discountPercent', 'DiscountPercent', 'tyLeGiam', 'TyLeGiam')),
    stockQuantity: valueOf(raw, 'stockQuantity', 'StockQuantity', 'soLuongTon', 'SoLuongTon'),
    status: valueOf(raw, 'status', 'Status', 'trangThai', 'TrangThai'),
    version: valueOf(raw, 'version', 'Version', 'phienBan', 'PhienBan'),
    color: valueOf(raw, 'color', 'Color', 'mauSac', 'MauSac') || valueOf(raw, 'exteriorColor'),
    exteriorColor: valueOf(raw, 'exteriorColor') || valueOf(raw, 'color', 'Color', 'mauSac', 'MauSac'),
    interiorColor: valueOf(raw, 'interiorColor'),
    images: images
      .map((image) => ({
        id: valueOf(image, 'id', 'Id', 'maAnhSanPham', 'MaAnhSanPham'),
        productVariantId: valueOf(image, 'productVariantId', 'ProductVariantId', 'maBienSanPham', 'MaBienSanPham') ?? valueOf(raw, 'id', 'Id', 'maBienSanPham', 'MaBienSanPham'),
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
  const brand = valueOf(raw, 'brand');
  const category = valueOf(raw, 'category');

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
    productType: valueOf(raw, 'productType', 'ProductType', 'loaiSanPham', 'LoaiSanPham'),
    shortDescription: valueOf(raw, 'shortDescription', 'ShortDescription', 'moTaNgan', 'MoTaNgan'),
    description: valueOf(raw, 'description', 'Description', 'moTa', 'MoTa'),
    // Giá tổng hợp từ biến thể: minPrice = giá bán thấp nhất ("Từ {minPrice}"); basePrice = giá gốc tương ứng (gạch ngang).
    minPrice: Number(valueOf(raw, 'minPrice', 'MinPrice', 'listPrice', 'ListPrice', 'giaThapNhat', 'GiaThapNhat', 'giaBan', 'GiaBan') || 0),
    maxPrice: Number(valueOf(raw, 'maxPrice', 'MaxPrice', 'listPrice', 'ListPrice', 'giaCaoNhat', 'GiaCaoNhat') || 0),
    basePrice: Number(valueOf(raw, 'giaGocThapNhat', 'GiaGocThapNhat', 'minBasePrice', 'basePrice', 'BasePrice', 'listPrice', 'ListPrice', 'giaGoc', 'GiaGoc') || 0),
    salePrice: valueOf(raw, 'giaThapNhat', 'GiaThapNhat', 'salePrice', 'SalePrice', 'listPrice', 'ListPrice', 'giaKhuyenMai', 'GiaKhuyenMai', 'giaBan', 'GiaBan') == null ? null : Number(valueOf(raw, 'giaThapNhat', 'GiaThapNhat', 'salePrice', 'SalePrice', 'listPrice', 'ListPrice', 'giaKhuyenMai', 'GiaKhuyenMai', 'giaBan', 'GiaBan')),
    discountPercent: valueOf(raw, 'discountPercent', 'DiscountPercent', 'tyLeGiam', 'TyLeGiam') == null ? null : Number(valueOf(raw, 'discountPercent', 'DiscountPercent', 'tyLeGiam', 'TyLeGiam')),
    variantCount: Number(valueOf(raw, 'variantCount', 'soBienThe', 'SoBienThe') || 0),
    stockQuantity: valueOf(raw, 'stockQuantity', 'StockQuantity', 'stockTotal', 'StockTotal', 'tongTon', 'TongTon', 'soLuongTon', 'SoLuongTon'),
    mainImageUrl: normalizeImageUrl(valueOf(raw, 'mainImageUrl', 'MainImageUrl', 'anhChinhUrl', 'AnhChinhUrl')),
    status: valueOf(raw, 'status', 'Status', 'trangThaiSanPham', 'TrangThaiSanPham'),
    isActive: valueOf(raw, 'isActive', 'IsActive', 'dangHoatDong', 'DangHoatDong') !== false,
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
        productVariantId: valueOf(image, 'productVariantId', 'ProductVariantId', 'maBienSanPham', 'MaBienSanPham'),
        imageUrl: normalizeImageUrl(valueOf(image, 'imageUrl', 'ImageUrl', 'urlAnh', 'UrlAnh') || valueOf(image, 'url')),
        altText: valueOf(image, 'altText'),
        isPrimary: valueOf(image, 'isPrimary', 'IsPrimary', 'laAnhChinh', 'LaAnhChinh'),
        sortOrder: valueOf(image, 'sortOrder', 'SortOrder', 'thuTuHienThi', 'ThuTuHienThi') || 0,
        raw: image,
      }))
      .filter((image) => image.imageUrl),
    variants: variants.map(normalizeVariant).filter(Boolean),
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
    parentCategoryId: valueOf(raw, 'parentCategoryId', 'ParentCategoryId', 'maDanhMucCha', 'MaDanhMucCha'),
    description: valueOf(raw, 'description', 'Description', 'moTa', 'MoTa'),
    image: normalizeImageUrl(valueOf(raw, 'image', 'Image', 'imageUrl', 'ImageUrl', 'hinhAnhUrl', 'HinhAnhUrl', 'anhDaiDienUrl', 'AnhDaiDienUrl') || ''),
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
    const quantity = Number(valueOf(item, 'quantity', 'Quantity', 'soLuong', 'SoLuong') || 1);
    const unitPrice = Number(valueOf(item, 'unitPrice', 'UnitPrice', 'donGia', 'DonGia') || 0);
    const lineTotal = Number(valueOf(item, 'lineTotal', 'LineTotal', 'thanhTien', 'ThanhTien') || unitPrice * quantity);
    // Backend CartItemDto trả biến thể dạng phẳng (tenBienThe/SKU), không có object lồng.
    const variantName = valueOf(item, 'variantName', 'VariantName', 'tenBienThe', 'TenBienThe') || '';
    const sku = valueOf(item, 'sku', 'SKU') || '';
    const itemImageUrl = normalizeImageUrl(valueOf(
      item,
      'mainImageUrl',
      'MainImageUrl',
      'anhChinhUrl',
      'AnhChinhUrl',
      'imageUrl',
      'ImageUrl',
      'urlAnh',
      'UrlAnh',
    ));
    const normalizedProduct = normalizeProduct(valueOf(item, 'product'));
    const fallbackProduct = {
      id: valueOf(item, 'productId', 'ProductId', 'maSanPham', 'MaSanPham'),
      name: valueOf(item, 'productName', 'ProductName', 'tenSanPham', 'TenSanPham') || '',
      mainImageUrl: itemImageUrl,
      images: itemImageUrl ? [{ imageUrl: itemImageUrl, isPrimary: true }] : [],
    };
    const product = normalizedProduct
      ? {
        ...normalizedProduct,
        mainImageUrl: normalizedProduct.mainImageUrl || itemImageUrl,
        images: normalizedProduct.images?.length
          ? normalizedProduct.images
          : (itemImageUrl ? [{ imageUrl: itemImageUrl, isPrimary: true }] : []),
      }
      : fallbackProduct;

    return {
      id: valueOf(item, 'id', 'Id', 'maChiTietGioHang', 'MaChiTietGioHang'),
      cartId: valueOf(item, 'cartId', 'CartId', 'maGioHang', 'MaGioHang'),
      productId: valueOf(item, 'productId', 'ProductId', 'maSanPham', 'MaSanPham'),
      productVariantId: valueOf(item, 'productVariantId', 'ProductVariantId', 'maBienSanPham', 'MaBienSanPham'),
      quantity,
      unitPrice,
      lineTotal,
      product,
      variantName,
      sku,
      productVariant: normalizeVariant(valueOf(item, 'productVariant')) || (variantName || sku
        ? {
          id: valueOf(item, 'productVariantId', 'ProductVariantId', 'maBienSanPham', 'MaBienSanPham'),
          variantName,
          sku,
        }
        : null),
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
