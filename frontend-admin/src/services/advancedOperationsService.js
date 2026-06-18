import api from './api';

const advancedOperationsService = {
  getReturns: (params) => api.get('/advanced-operations/returns', { params }),
  createReturn: (data) => api.post('/advanced-operations/returns', data),
  updateReturn: (id, data) => api.put(`/advanced-operations/returns/${id}`, data),
  approveReturn: (id, data) => api.post(`/advanced-operations/returns/${id}/approve`, data),
  rejectReturn: (id, data) => api.post(`/advanced-operations/returns/${id}/reject`, data),
  getRefunds: (params) => api.get('/advanced-operations/refunds', { params }),
  getReceivables: () => api.get('/advanced-operations/receivables'),
};

export default advancedOperationsService;
