import api from './api';

const normalizeReview = (review) => ({
  ...review,
  trangThai: review.trangThai ?? review.status ?? review.reviewStatus,
  diem: review.diem ?? review.rating,
  tenSanPham: review.tenSanPham ?? review.productName,
  tenNguoiDung: review.tenNguoiDung ?? review.userName,
  createdAt: review.createdAt ?? review.createdDate,
});

const reviewService = {
  getAll: async (params) => {
    const response = await api.get('/reviews', { params });
    response.data = { ...response.data, items: (response.data?.items || []).map(normalizeReview) };
    return response;
  },
  updateStatus: (id, data) => api.patch(`/reviews/${id}/status`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
};

export default reviewService;
