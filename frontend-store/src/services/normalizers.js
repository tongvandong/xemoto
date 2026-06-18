// Map dữ liệu nghiệp vụ (đơn hàng, thanh toán, voucher, yêu thích, đánh giá) từ backend xemoto sang shape UI.
// Backend luôn trả JSON camelCase nên đọc THẲNG đúng tên trường backend, không dò nhiều alias.
// Re-export normalizer sản phẩm/giỏ/danh mục từ productMappers.js để api.js chỉ import 1 nguồn.
import { normalizeImageUrl } from '../utils/formatters.js';
import {
  normalizeCart,
  normalizeCategory,
  normalizeFilters,
  normalizeProduct,
  normalizeProductList,
} from '../utils/productMappers.js';

const toNumber = (value) => Number(value || 0);

const mapShippingStatus = (status) => {
  if (status === 'Unallocated' || status === 'Allocated' || status === 'Preparing' || status === 'Pending') {
    return 'Preparing';
  }
  if (status === 'Shipped' || status === 'Shipping') {
    return 'Shipping';
  }
  if (status === 'Fulfilled' || status === 'Delivered' || status === 'Completed') {
    return 'Delivered';
  }
  return status;
};

// Lấy mảng items từ response (backend bọc danh sách trong { items: [...] } hoặc trả thẳng mảng).
export const listOf = (data) => (Array.isArray(data) ? data : data?.items || []);

// ===== Đơn hàng =====
// Backend OrderDetail/OrderListItem: code, orderStatus, paymentStatus, fulfillmentStatus, grandTotal,
//   discountTotal, shippingRecipient/Phone/Email/Address, lines[], histories[], payments[]...
// OrderLineDto/OrderLineSummaryDto: skuId, productId, productName, skuCode, unitPrice, qty, lineTotal.
const mapOrderLine = (line) => ({
  id: line.id,
  productId: line.productId,
  productVariantId: line.skuId,
  productNameSnapshot: line.productName,
  skuSnapshot: line.skuCode,
  unitPrice: toNumber(line.unitPrice),
  quantity: toNumber(line.qty),
  lineTotal: toNumber(line.lineTotal),
});

export const mapOrder = (raw = {}) => {
  const lines = raw.lines || [];
  const payments = raw.payments || [];

  return {
    id: raw.id,
    orderCode: raw.code,
    userId: raw.userId,
    customerName: raw.customerName,
    shippingFullName: raw.shippingRecipient,
    shippingPhoneNumber: raw.shippingPhone,
    shippingEmail: raw.shippingEmail,
    shippingAddressLine: raw.shippingAddress,
    receivingMethod: raw.receivingMethod,
    paymentMethod: raw.paymentMethod,
    orderType: raw.orderType,
    subtotal: toNumber(raw.subtotal),
    discountAmount: toNumber(raw.discountTotal),
    shippingFee: toNumber(raw.shippingFee),
    totalAmount: toNumber(raw.grandTotal),
    depositAmount: toNumber(raw.depositAmount),
    remainingAmount: toNumber(raw.remainingAmount),
    orderStatus: raw.orderStatus,
    paymentStatus: raw.paymentStatus,
    shippingStatus: mapShippingStatus(raw.fulfillmentStatus || raw.orderStatus),
    note: raw.note,
    fulfillmentNote: raw.fulfillmentNote,
    pickupAppointmentAt: raw.pickupAppointmentAt,
    createdAt: raw.placedAt,
    items: lines.map(mapOrderLine),
    payments: payments.map(mapPayment),
    histories: raw.histories || [],
    vouchers: [],
  };
};

// ===== Thanh toán =====
// PaymentDto/OrderPaymentDto: id, code, orderId, paymentType, amount, method, status, transactionRef, paidAt
export const mapPayment = (raw = {}) => ({
  id: raw.id,
  paymentCode: raw.code,
  orderId: raw.orderId,
  paymentType: raw.paymentType,
  amount: toNumber(raw.amount),
  paymentMethod: raw.method,
  paymentStatus: raw.status,
  transactionRef: raw.transactionRef,
  paidAt: raw.paidAt,
  // Backend chỉ trả paidAt (thời điểm xác nhận thu tiền); UI hiển thị chung qua createdAt.
  createdAt: raw.paidAt,
});

// ===== Voucher =====
// VoucherDto: id, code, description, discountType, discountValue, maxDiscount, minOrderValue,
//   usageLimit, perUserLimit, usedCount, startAt, endAt, status
export const mapVoucher = (raw = {}) => ({
  id: raw.id,
  code: raw.code,
  description: raw.description,
  discountType: raw.discountType,
  discountValue: toNumber(raw.discountValue),
  maxDiscountValue: raw.maxDiscount,
  minOrderValue: toNumber(raw.minOrderValue),
  usageLimit: raw.usageLimit,
  perUserLimit: raw.perUserLimit,
  usedCount: raw.usedCount,
  startAt: raw.startAt,
  endAt: raw.endAt,
  status: raw.status,
});

// ===== Yêu thích =====
// FavoriteDto: id, userId, productId, createdDate, product (ProductDetail/null)
export const mapFavorite = (raw = {}) => ({
  id: raw.id,
  userId: raw.userId,
  productId: raw.productId,
  createdAt: raw.createdDate,
  product: raw.product ? normalizeProduct(raw.product) : null,
});

// ===== Đánh giá =====
// ProductReviewItem: id, rating, title, comment, userName, createdDate, reviewStatus, imageUrl
export const mapReview = (raw = {}) => ({
  id: raw.id,
  rating: toNumber(raw.rating),
  title: raw.title,
  comment: raw.comment,
  userName: raw.userName,
  status: raw.reviewStatus,
  imageUrl: normalizeImageUrl(raw.imageUrl),
  createdAt: raw.createdDate,
});

// Payload tạo/sửa đánh giá: backend nhận JSON CreateReviewRequest { rating, title, comment, orderId }.
export const buildReviewPayload = (payload = {}) => ({
  rating: payload.rating,
  title: payload.title ?? null,
  comment: payload.comment ?? '',
  orderId: payload.orderId ?? null,
});

// ===== Địa chỉ nhận hàng =====
// Đóng gói payload địa chỉ theo tên trường backend mong đợi.
export const mapAddressBody = (data) => ({
  recipientName: data.fullName,
  phone: data.phoneNumber,
  line: data.addressLine,
  ward: data.ward,
  district: data.district,
  province: data.province,
  note: data.note,
});

// Chuyển param UI (sortBy, categoryId...) sang tên query backend (CategoryId, SortBy...).
export const toQuery = (params = {}) => {
  const sortMap = {
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

export {
  normalizeCart,
  normalizeCategory,
  normalizeFilters,
  normalizeProduct,
  normalizeProductList,
};
