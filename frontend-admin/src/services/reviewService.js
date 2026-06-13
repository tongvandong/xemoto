import api from './api';

// Đánh giá: BE trả DTO tiếng Anh { id, productId, productName, userId, userName, rating, title, comment, imageUrl, reviewStatus, createdDate }.
// reviewStatus: Pending | Approved | Rejected | Hidden.

const reviewService = {
  // params: { page, pageSize, status, rating } -> PagingResponse { items, totalItems, totalPages, ... }.
  getAll: (params) => api.get('/reviews', { params }),
  updateStatus: (id, status) => api.patch(`/reviews/${id}/status`, { status }),
  delete: (id) => api.delete(`/reviews/${id}`),
};

export default reviewService;
