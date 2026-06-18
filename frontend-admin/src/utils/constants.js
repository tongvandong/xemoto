export const ORDER_STATUS_LABELS = {
  Preparing: { label: 'Đang chuẩn bị hàng', color: 'warning' },
  Pending: { label: 'Chờ xác nhận', color: 'secondary' },
  Checkout: { label: 'Chờ xác nhận', color: 'secondary' },
  AwaitingPayment: { label: 'Chờ xác nhận', color: 'secondary' },
  Confirmed: { label: 'Chờ xác nhận', color: 'secondary' },
  Allocated: { label: 'Đang chuẩn bị hàng', color: 'warning' },
  Shipping: { label: 'Đang giao', color: 'info' },
  Delivered: { label: 'Đã giao', color: 'success' },
  Completed: { label: 'Đã giao', color: 'success' },
  Cancelled: { label: 'Đã hủy', color: 'danger' },
};

export const ORDER_STATUS_OPTIONS = [
  { value: 'Pending', label: 'Chờ xác nhận' },
  { value: 'Preparing', label: 'Đang chuẩn bị hàng' },
  { value: 'Shipping', label: 'Đang giao' },
  { value: 'Delivered', label: 'Đã giao' },
];

export const ORDER_NEXT_STATUS = {
  Preparing: ['Shipping', 'Delivered', 'Cancelled'],
  Pending: ['Preparing', 'Shipping', 'Delivered', 'Cancelled'],
  Checkout: ['Preparing', 'Shipping', 'Delivered', 'Cancelled'],
  AwaitingPayment: ['Preparing', 'Shipping', 'Delivered', 'Cancelled'],
  Confirmed: ['Preparing', 'Shipping', 'Delivered', 'Cancelled'],
  Allocated: ['Shipping', 'Delivered', 'Cancelled'],
  Shipping: ['Delivered', 'Cancelled'],
  Delivered: [],
  Completed: [],
  Cancelled: [],
};

export const normalizeOrderStatus = (status) => String(status || '');

export const getOrderStatusMeta = (status) => (
  ORDER_STATUS_LABELS[normalizeOrderStatus(status)] || { label: status || 'Khác', color: 'secondary' }
);

export const PAYMENT_STATUS = {
  Unpaid: { label: 'Chờ thanh toán', color: 'secondary' },
  PendingConfirmation: { label: 'Chờ xác nhận chuyển khoản', color: 'warning' },
  Paid: { label: 'Đã thanh toán', color: 'success' },
  Refunded: { label: 'Đã hoàn tiền', color: 'dark' },
  Failed: { label: 'Thanh toán thất bại', color: 'danger' },
  // Trạng thái phiếu thanh toán (PaymentRecordStatus) hiển thị ở danh sách/giao dịch thanh toán.
  Pending: { label: 'Chờ xác nhận chuyển khoản', color: 'warning' },
  Cancelled: { label: 'Đã hủy thanh toán', color: 'secondary' },
};

export const PAYMENT_STATUS_OPTIONS = [
  { value: 'Unpaid', label: 'Chờ thanh toán' },
  { value: 'PendingConfirmation', label: 'Chờ xác nhận chuyển khoản' },
  { value: 'Paid', label: 'Đã thanh toán' },
  { value: 'Refunded', label: 'Đã hoàn tiền' },
  { value: 'Failed', label: 'Thanh toán thất bại' },
];

export const SHIPPING_STATUS = {
  Unallocated: { label: 'Chưa soạn hàng', color: 'secondary' },
  Allocated: { label: 'Đã soạn hàng', color: 'warning' },
  Shipped: { label: 'Đang giao', color: 'info' },
  Fulfilled: { label: 'Đã giao', color: 'success' },
};

export const SHIPPING_STATUS_OPTIONS = Object.entries(SHIPPING_STATUS)
  .map(([value, meta]) => ({ value, label: meta.label }));

export const DELIVERY_SHIPPING_STATUS_OPTIONS = SHIPPING_STATUS_OPTIONS;
export const PICKUP_SHIPPING_STATUS_OPTIONS = SHIPPING_STATUS_OPTIONS;

export const getPaymentStatusMeta = (status) => (
  PAYMENT_STATUS[status] || { label: status || 'Khác', color: 'secondary' }
);

export const getShippingStatusMeta = (status) => (
  SHIPPING_STATUS[status] || { label: status || 'Khác', color: 'secondary' }
);

export const PAYMENT_METHODS = {
  Cash: 'Tiền mặt',
  COD: 'Tiền mặt (COD)',
  BankTransfer: 'Chuyển khoản',
  Card: 'Thẻ',
  Momo: 'Momo',
  VNPay: 'VNPay',
};

// Chỉ 2 trạng thái sản phẩm do người quản lý đặt qua form: Đang bán / Ngừng bán.
// - "Hết hàng" là tình trạng TỒN KHO (đã có ô lọc "Tình trạng tồn" riêng), không phải trạng thái sản phẩm.
// - "Ngừng kinh doanh" = đã bấm Xóa (xóa mềm) -> ẩn hẳn, không cần hiện/cho lọc nữa.
export const PRODUCT_STATUS = {
  Available: { label: 'Đang bán', color: 'success' },
  Inactive: { label: 'Ngừng bán', color: 'secondary' },
};

export const USER_STATUS = {
  Active: { label: 'Hoạt động', color: 'success' },
  Inactive: { label: 'Khóa', color: 'danger' },
};

export const ROLES = {
  Admin: 'Quản trị viên',
  Staff: 'Nhân viên',
  Customer: 'Khách hàng',
};
