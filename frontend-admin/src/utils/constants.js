export const ORDER_STATUS_LABELS = {
  Pending: { label: 'Chờ xác nhận', color: 'warning' },
  Checkout: { label: 'Chờ xác nhận', color: 'warning' },
  AwaitingPayment: { label: 'Chờ xác nhận', color: 'warning' },
  Confirmed: { label: 'Chờ xác nhận', color: 'warning' },
  Allocated: { label: 'Đang giao', color: 'info' },
  Shipping: { label: 'Đang giao', color: 'info' },
  Delivered: { label: 'Đã giao', color: 'success' },
  Completed: { label: 'Đã giao', color: 'success' },
  Cancelled: { label: 'Đã hủy', color: 'danger' },
};

export const ORDER_STATUS_OPTIONS = [
  { value: 'Pending', label: 'Chờ xác nhận' },
  { value: 'Shipping', label: 'Đang giao' },
  { value: 'Delivered', label: 'Đã giao' },
  { value: 'Cancelled', label: 'Đã hủy' },
];

export const ORDER_NEXT_STATUS = {
  Pending: ['Shipping', 'Delivered', 'Cancelled'],
  Checkout: ['Shipping', 'Delivered', 'Cancelled'],
  AwaitingPayment: ['Shipping', 'Delivered', 'Cancelled'],
  Confirmed: ['Shipping', 'Delivered', 'Cancelled'],
  Allocated: ['Delivered', 'Cancelled'],
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
  // alias dữ liệu cũ
  Pending: { label: 'Chờ xác nhận chuyển khoản', color: 'warning' },
  DepositPaid: { label: 'Đã đặt cọc (còn nợ)', color: 'info' },
  PartiallyPaid: { label: 'Đã thanh toán một phần', color: 'info' },
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

export const PRODUCT_STATUS = {
  Available: { label: 'Đang bán', color: 'success' },
  Inactive: { label: 'Ngừng bán', color: 'secondary' },
  OutOfStock: { label: 'Hết hàng', color: 'danger' },
  Discontinued: { label: 'Ngừng kinh doanh', color: 'dark' },
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
