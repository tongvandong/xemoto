// Lớp chuẩn hóa dữ liệu (backend trả nhiều kiểu key -> gom về 1 shape ổn định cho UI).
// - Mapper nghiệp vụ phía API: đơn hàng, thanh toán, voucher, yêu thích, đánh giá, địa chỉ.
// - Helper dùng chung: field (lấy theo key ưu tiên), toQuery (đổi param UI -> query backend), listOf.
// - Re-export normalizer sản phẩm/giỏ/danh mục từ productMappers.js để api.js có 1 nguồn import duy nhất.
import { normalizeImageUrl } from '../utils/formatters.js';
import {
  normalizeCart,
  normalizeCategory,
  normalizeFilters,
  normalizeProduct,
  normalizeProductList,
} from '../utils/productMappers.js';

// Lấy giá trị đầu tiên không null/undefined theo danh sách key ưu tiên.
export const field = (source, ...keys) => {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null) {
      return source[key];
    }
  }
  return undefined;
};

export const mapOrder = (raw = {}) => {
  const items = field(raw, 'items', 'Items') || [];
  const vouchers = field(raw, 'vouchers', 'Vouchers') || [];

  return {
    ...raw,
    id: field(raw, 'id', 'Id', 'maDonHang', 'MaDonHang'),
    orderCode: field(raw, 'orderCode', 'OrderCode', 'maDonHangKinhDoanh', 'MaDonHangKinhDoanh'),
    userId: field(raw, 'userId', 'UserId', 'maNguoiDung', 'MaNguoiDung'),
    cartId: field(raw, 'cartId', 'CartId', 'maGioHang', 'MaGioHang'),
    shippingFullName: field(raw, 'shippingFullName', 'ShippingFullName', 'hoTenNhanHang', 'HoTenNhanHang'),
    shippingPhoneNumber: field(raw, 'shippingPhoneNumber', 'ShippingPhoneNumber', 'soDienThoaiNhanHang', 'SoDienThoaiNhanHang'),
    shippingEmail: field(raw, 'shippingEmail', 'ShippingEmail', 'emailNhanHang', 'EmailNhanHang'),
    shippingAddressLine: field(raw, 'shippingAddressLine', 'ShippingAddressLine', 'diaChiNhanHang', 'DiaChiNhanHang'),
    subtotal: Number(field(raw, 'subtotal', 'Subtotal', 'tongTienHang', 'TongTienHang') || 0),
    discountAmount: Number(field(raw, 'discountAmount', 'DiscountAmount', 'tienGiam', 'TienGiam') || 0),
    shippingFee: Number(field(raw, 'shippingFee', 'ShippingFee', 'phiVanChuyen', 'PhiVanChuyen') || 0),
    totalAmount: Number(field(raw, 'totalAmount', 'TotalAmount', 'tongThanhToan', 'TongThanhToan') || 0),
    orderStatus: field(raw, 'orderStatus', 'OrderStatus', 'trangThaiDonHang', 'TrangThaiDonHang'),
    paymentStatus: field(raw, 'paymentStatus', 'PaymentStatus', 'trangThaiThanhToan', 'TrangThaiThanhToan'),
    shippingStatus: field(raw, 'shippingStatus', 'ShippingStatus', 'trangThaiVanChuyen', 'TrangThaiVanChuyen'),
    receivingMethod: field(raw, 'receivingMethod', 'ReceivingMethod', 'phuongThucNhanHang', 'PhuongThucNhanHang'),
    paymentMethod: field(raw, 'paymentMethod', 'PaymentMethod', 'phuongThucThanhToan', 'PhuongThucThanhToan', 'phuongThuc', 'PhuongThuc'),
    orderType: field(raw, 'orderType', 'OrderType', 'loaiDonHang', 'LoaiDonHang'),
    depositAmount: Number(field(raw, 'depositAmount', 'DepositAmount', 'tienDatCoc', 'TienDatCoc') || 0),
    remainingAmount: Number(field(raw, 'remainingAmount', 'RemainingAmount', 'soTienConLai', 'SoTienConLai') || 0),
    note: field(raw, 'note', 'Note', 'ghiChu', 'GhiChu'),
    createdAt: field(raw, 'createdAt', 'CreatedAt', 'ngayTao', 'NgayTao'),
    updatedAt: field(raw, 'updatedAt', 'UpdatedAt', 'ngayCapNhat', 'NgayCapNhat'),
    items: items.map((item) => ({
      ...item,
      id: field(item, 'id', 'Id', 'maChiTietDonHang', 'MaChiTietDonHang'),
      productId: field(item, 'productId', 'ProductId', 'maSanPham', 'MaSanPham'),
      productVariantId: field(item, 'productVariantId', 'ProductVariantId', 'maBienSanPham', 'MaBienSanPham'),
      productNameSnapshot: field(item, 'productNameSnapshot', 'ProductNameSnapshot', 'tenSanPhamSnapshot', 'TenSanPhamSnapshot'),
      skuSnapshot: field(item, 'skuSnapshot', 'SkuSnapshot', 'skuSnapshot', 'SKUSnapshot'),
      unitPrice: Number(field(item, 'unitPrice', 'UnitPrice', 'donGia', 'DonGia') || 0),
      quantity: Number(field(item, 'quantity', 'Quantity', 'soLuong', 'SoLuong') || 0),
      lineTotal: Number(field(item, 'lineTotal', 'LineTotal', 'thanhTien', 'ThanhTien') || 0),
    })),
    vouchers: vouchers.map((voucher) => ({
      ...voucher,
      voucherCodeSnapshot: field(voucher, 'voucherCodeSnapshot', 'VoucherCodeSnapshot', 'maVoucherCodeSnapshot', 'MaVoucherCodeSnapshot'),
      discountAmount: Number(field(voucher, 'discountAmount', 'DiscountAmount', 'soTienGiam', 'SoTienGiam') || 0),
      discountTypeSnapshot: field(voucher, 'discountTypeSnapshot', 'DiscountTypeSnapshot', 'loaiGiamGiaSnapshot', 'LoaiGiamGiaSnapshot'),
      discountValueSnapshot: Number(field(voucher, 'discountValueSnapshot', 'DiscountValueSnapshot', 'giaTriGiamSnapshot', 'GiaTriGiamSnapshot') || 0),
    })),
  };
};

export const mapPayment = (raw = {}) => ({
  ...raw,
  id: field(raw, 'id', 'Id', 'maThanhToan', 'MaThanhToan'),
  paymentCode: field(raw, 'paymentCode', 'PaymentCode', 'maThanhToanKinhDoanh', 'MaThanhToanKinhDoanh'),
  orderId: field(raw, 'orderId', 'OrderId', 'maDonHang', 'MaDonHang'),
  orderCode: field(raw, 'orderCode', 'OrderCode', 'maDonHangKinhDoanh', 'MaDonHangKinhDoanh'),
  amount: Number(field(raw, 'amount', 'Amount', 'soTien', 'SoTien') || 0),
  paymentMethod: field(raw, 'paymentMethod', 'PaymentMethod', 'phuongThuc', 'PhuongThuc'),
  paymentStatus: field(raw, 'paymentStatus', 'PaymentStatus', 'trangThai', 'TrangThai'),
  transactionRef: field(raw, 'transactionRef', 'TransactionRef', 'maGiaoDich', 'MaGiaoDich'),
  paidAt: field(raw, 'paidAt', 'PaidAt', 'daThanhToanLuc', 'DaThanhToanLuc'),
  createdAt: field(raw, 'createdAt', 'CreatedAt', 'ngayTao', 'NgayTao'),
});

export const mapVoucher = (raw = {}) => ({
  ...raw,
  id: field(raw, 'id', 'Id', 'maVoucher', 'MaVoucher'),
  code: field(raw, 'code', 'Code', 'maVoucherCode', 'MaVoucherCode'),
  description: field(raw, 'description', 'Description', 'moTa', 'MoTa'),
  discountType: field(raw, 'discountType', 'DiscountType', 'loaiGiamGia', 'LoaiGiamGia'),
  discountValue: Number(field(raw, 'discountValue', 'DiscountValue', 'giaTriGiam', 'GiaTriGiam') || 0),
  maxDiscountValue: field(raw, 'maxDiscountValue', 'MaxDiscountValue', 'giaTriGiamToiDa', 'GiaTriGiamToiDa'),
  minOrderValue: Number(field(raw, 'minOrderValue', 'MinOrderValue', 'giaTriDonToiThieu', 'GiaTriDonToiThieu') || 0),
});

export const mapFavorite = (raw = {}) => {
  const product = normalizeProduct(field(raw, 'product', 'Product') || raw);
  return {
    ...raw,
    userId: field(raw, 'userId', 'UserId', 'maNguoiDung', 'MaNguoiDung'),
    productId: field(raw, 'productId', 'ProductId', 'maSanPham', 'MaSanPham') || product?.id,
    createdAt: field(raw, 'createdAt', 'CreatedAt', 'ngayTao', 'NgayTao'),
    product,
  };
};

export const mapReview = (raw = {}) => ({
  ...raw,
  id: field(raw, 'id', 'Id', 'maDanhGia', 'MaDanhGia'),
  productId: field(raw, 'productId', 'ProductId', 'maSanPham', 'MaSanPham'),
  userId: field(raw, 'userId', 'UserId', 'maNguoiDung', 'MaNguoiDung'),
  userName: field(raw, 'userName', 'UserName', 'tenNguoiDung', 'TenNguoiDung'),
  orderId: field(raw, 'orderId', 'OrderId', 'maDonHang', 'MaDonHang'),
  rating: Number(field(raw, 'rating', 'Rating', 'diem', 'Diem') || 0),
  title: field(raw, 'title', 'Title', 'tieuDe', 'TieuDe'),
  comment: field(raw, 'comment', 'Comment', 'noiDung', 'NoiDung'),
  imageUrl: normalizeImageUrl(field(raw, 'imageUrl', 'ImageUrl', 'hinhAnhUrl', 'HinhAnhUrl')),
  status: field(raw, 'status', 'Status', 'trangThai', 'TrangThai'),
  createdAt: field(raw, 'createdAt', 'CreatedAt', 'ngayTao', 'NgayTao'),
  updatedAt: field(raw, 'updatedAt', 'UpdatedAt', 'ngayCapNhat', 'NgayCapNhat'),
});

// Đóng gói payload đánh giá thành multipart/form-data theo đúng tên field backend.
export const buildReviewForm = (payload = {}) => {
  const form = new FormData();
  form.append('Diem', payload.rating ?? payload.diem);
  form.append('NoiDung', payload.comment ?? payload.noiDung ?? '');
  if (payload.productId ?? payload.maSanPham) form.append('MaSanPham', payload.productId ?? payload.maSanPham);
  if (payload.orderId ?? payload.maDonHang) form.append('MaDonHang', payload.orderId ?? payload.maDonHang);
  if (payload.title ?? payload.tieuDe) form.append('TieuDe', payload.title ?? payload.tieuDe);
  if (payload.image) form.append('Image', payload.image);
  return form;
};

// Chuyển param UI (sortBy, categoryId...) sang tên query backend (MaDanhMuc, SortBy...).
export const toQuery = (params = {}) => {
  const sortMap = {
    'price-asc': { SortBy: 'price', SortDescending: false },
    'price-desc': { SortBy: 'price', SortDescending: true },
    'name-asc': { SortBy: 'name', SortDescending: false },
    'name-desc': { SortBy: 'name', SortDescending: true },
    'year-asc': { SortBy: 'created', SortDescending: false },
    'year-desc': { SortBy: 'created', SortDescending: true },
    price_asc: { SortBy: 'price', SortDescending: false },
    price_desc: { SortBy: 'price', SortDescending: true },
    name_asc: { SortBy: 'name', SortDescending: false },
    name_desc: { SortBy: 'name', SortDescending: true },
    year_asc: { SortBy: 'created', SortDescending: false },
    year_desc: { SortBy: 'created', SortDescending: true },
  };

  const paramMap = {
    categoryId: 'CategoryId',
    brandId: 'BrandId',
    carModelId: 'VehicleModelId',
    compatibleCarModelId: 'CompatibleVehicleModelId',
    showroomId: 'ShowroomId',
    productType: 'Kind',
    status: 'Status',
    minPrice: 'MinPrice',
    maxPrice: 'MaxPrice',
  };

  const source = { ...params };
  if (sortMap[params.sortBy]) {
    delete source.sortBy;
    Object.assign(source, sortMap[params.sortBy]);
  }

  const mapped = Object.entries(source).reduce((acc, [key, value]) => {
    acc[paramMap[key] || key] = value;
    return acc;
  }, {});

  return Object.fromEntries(
    Object.entries(mapped).filter(([, value]) => value !== '' && value !== undefined && value !== null),
  );
};

// Lấy mảng items từ response (backend có thể trả mảng trực tiếp hoặc bọc trong items/Items).
export const listOf = (data) => (Array.isArray(data) ? data : data?.items || data?.Items || []);

// Đóng gói payload địa chỉ nhận hàng theo đúng tên field backend.
export const mapAddressBody = (data) => ({
  recipientName: data.fullName,
  phone: data.phoneNumber,
  line: data.addressLine,
  ward: data.ward,
  district: data.district,
  province: data.province,
  note: data.note,
});

// Re-export normalizer sản phẩm/giỏ/danh mục để api.js dùng 1 nguồn import duy nhất.
export {
  normalizeCart,
  normalizeCategory,
  normalizeFilters,
  normalizeProduct,
  normalizeProductList,
};
