// Three independent order axes:
//   1. ORDER_STATUS: current business stage of the order
//   2. SHIPPING_STATUS: fulfillment progress
//   3. PAYMENT_STATUS: payment collection state

export const ORDER_STATUS_MAP = {
  AwaitingPayment: 'Chờ thanh toán',
  Confirmed: 'Đã xác nhận',
  Cancelled: 'Đã hủy',
  Pending: 'Chờ thanh toán',
  Checkout: 'Chờ thanh toán',
  Processing: 'Đã xác nhận',
  Shipping: 'Đã xác nhận',
  Delivered: 'Đã xác nhận',
  Completed: 'Đã xác nhận',
};

export const SHIPPING_STATUS_MAP = {
  Preparing: 'Đang chuẩn bị hàng',
  Shipping: 'Đang giao',
  Delivered: 'Đã giao',
};

export const PAYMENT_STATUS_MAP = {
  Unpaid: 'Chưa thanh toán',
  PartiallyPaid: 'Đã thanh toán một phần',
  Paid: 'Đã thanh toán',
  Refunded: 'Đã hoàn tiền',
  Cancelled: 'Đã hủy',
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
  AwaitingPayment: 'bg-amber-100 text-amber-700',
  Confirmed: 'bg-blue-100 text-blue-700',
  Cancelled: 'bg-red-100 text-red-700',
  Pending: 'bg-amber-100 text-amber-700',
  Checkout: 'bg-amber-100 text-amber-700',
  Processing: 'bg-blue-100 text-blue-700',
  Shipping: 'bg-blue-100 text-blue-700',
  Delivered: 'bg-blue-100 text-blue-700',
  Completed: 'bg-blue-100 text-blue-700',
};

const SHIPPING_STATUS_COLOR_MAP = {
  Preparing: 'bg-amber-100 text-amber-700',
  Shipping: 'bg-blue-100 text-blue-700',
  Delivered: 'bg-green-100 text-green-700',
};

const PAYMENT_STATUS_COLOR_MAP = {
  Unpaid: 'bg-zinc-100 text-zinc-700',
  PartiallyPaid: 'bg-orange-100 text-orange-700',
  Paid: 'bg-green-100 text-green-700',
  Refunded: 'bg-purple-100 text-purple-700',
  Cancelled: 'bg-zinc-100 text-zinc-700',
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

export function getPaymentStatusContextual(paymentStatus, orderType) {
  if (paymentStatus === 'PartiallyPaid') {
    if (orderType === 'Deposit') return 'Đã đặt cọc';
    if (orderType === 'Installment') return 'Đang trả góp';
    return 'Đã thanh toán một phần';
  }
  if (paymentStatus === 'Paid') {
    if (orderType === 'Installment') return 'Đã trả góp xong';
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
