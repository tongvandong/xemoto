// Điều kiện đánh giá sản phẩm — NGUỒN DUY NHẤT cho cả OrdersPage, OrderDetailPage và ProductReviews.
// Khớp đúng backend ReviewService.EligibleOrderIdAsync: xét TRẠNG THÁI ĐƠN (orderStatus)
// là 'Delivered' hoặc 'Completed' — KHÔNG xét shippingStatus (fulfillment dùng giá trị 'Fulfilled').
// Việc "đã đánh giá hay chưa" tra bằng reviewApi.getMine(productId) -> reviewStatusByProductId.

export function isOrderReviewable(order) {
  return order?.orderStatus === 'Delivered' || order?.orderStatus === 'Completed';
}

export function getOrderItems(order) {
  const items = order?.items || order?.Items || [];
  return Array.isArray(items) ? items : items?.$values || [];
}

export function getReviewProductId(item) {
  return item?.productId || item?.id;
}

export function isItemReviewable(item, reviewStatusByProductId = {}) {
  const productId = getReviewProductId(item);
  return Boolean(productId) && reviewStatusByProductId[String(productId)] === 'not-reviewed';
}

export function getReviewableOrderItems(order, reviewStatusByProductId = {}) {
  if (!isOrderReviewable(order)) return [];
  return getOrderItems(order).filter((item) => isItemReviewable(item, reviewStatusByProductId));
}

export function hasReviewableItems(order, reviewStatusByProductId = {}) {
  return getReviewableOrderItems(order, reviewStatusByProductId).length > 0;
}
