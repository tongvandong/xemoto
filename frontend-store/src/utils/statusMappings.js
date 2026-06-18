// 3 trục trạng thái độc lập, không chồng chéo:
//   1. ORDER_STATUS  — AwaitingPayment | Confirmed | Cancelled  (đơn ở giai đoạn nào của giao dịch)
//   2. SHIPPING_STATUS — Preparing | Shipping | Delivered      (hàng đang ở đâu)
//   3. PAYMENT_STATUS — Unpaid | PartiallyPaid | Paid | Refunded | Cancelled  (tiền đã thu hay chưa)

export const ORDER_STATUS_MAP = {
  Preparing: 'Đang chuẩn bị hàng',
  AwaitingPayment: 'Chờ xác nhận',
  Confirmed: 'Chờ xác nhận',
  Cancelled: 'Đã hủy',
  // Legacy giá trị cũ vẫn map để hiển thị nếu còn data
  Pending: 'Chờ xác nhận',
  Checkout: 'Chờ xác nhận',
  Processing: 'Chờ xác nhận',
  Allocated: 'Đang chuẩn bị hàng',
  Shipping: 'Đang giao',
  Delivered: 'Đã giao',
  Completed: 'Đã giao',
};

export const SHIPPING_STATUS_MAP = {
  Unallocated: 'Đang chuẩn bị hàng',
  Allocated: 'Đang chuẩn bị hàng',
  Preparing: 'Đang chuẩn bị hàng',
  Shipped: 'Đang giao',
  Shipping: 'Đang giao',
  Fulfilled: 'Đã giao',
  Delivered: 'Đã giao',
};

// Hợp nhất nhãn cho cả 2 cấp:
//   - Cấp ĐƠN  (DONHANG.TrangThaiThanhToan): Unpaid / PartiallyPaid / Paid / Refunded / Cancelled
//   - Cấp GIAO DỊCH (THANHTOAN.TrangThai):   Pending / Paid / Failed / Cancelled
// Để biết nhãn contextual theo orderType (Deposit/Installment) dùng getPaymentStatusContextual.
export const PAYMENT_STATUS_MAP = {
  Unpaid: 'Chưa thanh toán',
  PendingConfirmation: 'Chờ cửa hàng xác nhận',
  PartiallyPaid: 'Đã thanh toán một phần',
  Paid: 'Đã thanh toán',
  Refunded: 'Đã hoàn tiền',
  Cancelled: 'Đã hủy',
  PendingConfirmation: 'Chờ xác nhận chuyển khoản',
  Pending: 'Chờ xác nhận',
  Failed: 'Thất bại',
};

export const PAYMENT_METHOD_MAP = {
  BankTransfer: 'Chuyển khoản ngân hàng',
  Card: 'Thẻ tín dụng/ghi nợ',
  Momo: 'Ví MoMo',
  VNPay: 'VNPay',
  COD: 'Tiền mặt (COD)',
};

export const ORDER_TYPE_MAP = {
  FullPayment: 'Thanh toán toàn bộ',
  Deposit: 'Đặt cọc trước',
  Installment: 'Trả góp',
};

export const RECEIVING_METHOD_MAP = {
  Delivery: 'Giao hàng tận nơi',
  Pickup: 'Nhận trực tiếp',
};

const ORDER_STATUS_COLOR_MAP = {
  Preparing: 'bg-amber-100 text-amber-700',
  AwaitingPayment: 'bg-zinc-100 text-zinc-700',
  Confirmed: 'bg-zinc-100 text-zinc-700',
  Cancelled: 'bg-red-100 text-red-700',
  Pending: 'bg-zinc-100 text-zinc-700',
  Checkout: 'bg-zinc-100 text-zinc-700',
  Processing: 'bg-zinc-100 text-zinc-700',
  Allocated: 'bg-amber-100 text-amber-700',
  Shipping: 'bg-blue-100 text-blue-700',
  Delivered: 'bg-green-100 text-green-700',
  Completed: 'bg-green-100 text-green-700',
};

const SHIPPING_STATUS_COLOR_MAP = {
  Unallocated: 'bg-amber-100 text-amber-700',
  Allocated: 'bg-amber-100 text-amber-700',
  Preparing: 'bg-amber-100 text-amber-700',
  Shipped: 'bg-blue-100 text-blue-700',
  Shipping: 'bg-blue-100 text-blue-700',
  Fulfilled: 'bg-green-100 text-green-700',
  Delivered: 'bg-green-100 text-green-700',
};

const PAYMENT_STATUS_COLOR_MAP = {
  Unpaid: 'bg-zinc-100 text-zinc-700',
  PendingConfirmation: 'bg-amber-100 text-amber-700',
  PartiallyPaid: 'bg-orange-100 text-orange-700',
  Paid: 'bg-green-100 text-green-700',
  Refunded: 'bg-purple-100 text-purple-700',
  Cancelled: 'bg-zinc-100 text-zinc-700',
  PendingConfirmation: 'bg-amber-100 text-amber-700',
  Pending: 'bg-amber-100 text-amber-700',
  Failed: 'bg-red-100 text-red-700',
};

export function getOrderStatusLabel(status) {
  return ORDER_STATUS_MAP[status] || status || 'Không xác định';
}

export function getShippingStatusLabel(status) {
  return SHIPPING_STATUS_MAP[status] || status || 'Không xác định';
}

export function getPaymentStatusLabel(status) {
  return PAYMENT_STATUS_MAP[status] || status || 'Không xác định';
}

/**
 * Cùng paymentStatus 'PartiallyPaid' có nghĩa khác nhau tùy LoaiDonHang:
 *   - Deposit: "Đã đặt cọc, chờ thanh toán phần còn lại"
 *   - Installment: "Đã trả trước" (phần còn lại do đối tác tài chính xử lý)
 * Helper này trả về nhãn phù hợp ngữ cảnh để hiển thị cho khách/admin.
 */
export function getPaymentStatusContextual(paymentStatus, orderType) {
  if (orderType === 'Installment') {
    if (paymentStatus === 'Paid') return 'Đã trả trước';
    if (paymentStatus === 'Unpaid') return 'Chờ xác nhận trả trước';
  }

  if (paymentStatus === 'PartiallyPaid') {
    if (orderType === 'Deposit') return 'Đã đặt cọc';
    if (orderType === 'Installment') return 'Đã trả trước';
    return 'Đã thanh toán một phần';
  }
  if (paymentStatus === 'Paid') {
    return 'Đã thanh toán đủ';
  }
  return getPaymentStatusLabel(paymentStatus);
}

export function getPaymentMethodLabel(method) {
  return PAYMENT_METHOD_MAP[method] || method || 'Không xác định';
}

export function getOrderTypeLabel(type) {
  return ORDER_TYPE_MAP[type] || type || 'Không xác định';
}

export function getReceivingMethodLabel(method) {
  return RECEIVING_METHOD_MAP[method] || method || 'Không xác định';
}

export function getOrderStatusColor(status) {
  return ORDER_STATUS_COLOR_MAP[status] || 'bg-zinc-100 text-zinc-700';
}

export function getShippingStatusColor(status) {
  return SHIPPING_STATUS_COLOR_MAP[status] || 'bg-zinc-100 text-zinc-700';
}

export function getPaymentStatusColor(status) {
  return PAYMENT_STATUS_COLOR_MAP[status] || 'bg-zinc-100 text-zinc-700';
}

// ===== Predicate trạng thái dùng chung =====
// Gom về một nơi để Payment/OrderDetail không tự định nghĩa tập trạng thái lệch nhau.
const PAID_PAYMENT_STATUSES = ['Paid', 'PartiallyPaid'];
const REFUND_BLOCKED_ORDER_STATUSES = ['Shipping', 'Delivered', 'Completed', 'Cancelled'];

// Đã thu tiền (đủ hoặc một phần) — dùng cho điều kiện hoàn tiền và rời màn chờ thanh toán.
export function isOrderPaid(paymentStatus) {
  return PAID_PAYMENT_STATUSES.includes(paymentStatus);
}

// Đơn còn được phép hủy — khớp đúng điều kiện backend OrderService.CancelOrderAsync:
// chưa hủy, chưa giao xong (orderStatus Delivered / fulfillment Fulfilled).
export function canCancelOrder(order) {
  return order?.orderType !== 'Installment'
    && order?.orderStatus !== 'Cancelled'
    && order?.orderStatus !== 'Delivered'
    && order?.orderStatus !== 'Completed'
    && order?.shippingStatus !== 'Fulfilled';
}

// Đơn còn được phép yêu cầu hoàn tiền: đã thu tiền, chưa sang giao/hoàn tất/hủy, và chưa có yêu cầu đang xử lý / đã hoàn.
export function canRequestRefund(order, { hasPendingRefund = false, hasCompletedRefund = false } = {}) {
  return isOrderPaid(order?.paymentStatus)
    && !REFUND_BLOCKED_ORDER_STATUSES.includes(order?.orderStatus)
    && !hasPendingRefund
    && !hasCompletedRefund;
}

// ===== Yêu cầu hoàn tiền =====
export const REFUND_STATUS_MAP = {
  Pending: 'Đang xử lý',
  Completed: 'Đã hoàn tiền',
  Rejected: 'Từ chối',
};

const REFUND_STATUS_COLOR_MAP = {
  Pending: 'bg-amber-100 text-amber-700',
  Completed: 'bg-green-100 text-green-700',
  Rejected: 'bg-zinc-200 text-zinc-600',
};

export function getRefundStatusLabel(status) {
  return REFUND_STATUS_MAP[status] || status || 'Đang xử lý';
}

export function getRefundStatusColor(status) {
  return REFUND_STATUS_COLOR_MAP[status] || 'bg-amber-100 text-amber-700';
}
