import api from './api';

const orderService = {
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  createPos: (data) => api.post('/orders/pos', data),
  update: (id, data) => api.put(`/orders/${id}`, data),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  updateFulfillmentStatus: (id, data) => api.put(`/orders/${id}/fulfillment-status`, data),
  getAllocationSuggestion: (id) => api.get(`/orders/${id}/allocation-suggestion`),
  allocate: (id, data) => api.post(`/orders/${id}/allocate`, data),
  fulfill: (id) => api.post(`/orders/${id}/fulfill`),
  cancel: (id, data) => api.post(`/orders/${id}/cancel`, { reason: data?.reason || data?.lyDoHuyDon }),
};

export default orderService;
