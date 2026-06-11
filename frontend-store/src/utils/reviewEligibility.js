// Điều kiện đánh giá sản phẩm — NGUỒN DUY NHẤT cho cả OrdersPage, OrderDetailPage và ProductReviews.
// Khớp đúng với backend (CatalogService/ReviewsController.GetEligibleOrderIdAsync):
// một đơn cho phép đánh giá khi đã 'Completed' HOẶC đã giao ('Delivered').
// Việc "đã đánh giá hay chưa" tra bằng reviewApi.getMine(productId) -> reviewStatusByProductId.

export function isOrderReviewable(order) {
  return order?.orderStatus === 'Completed' || order?.shippingStatus === 'Delivered';
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
