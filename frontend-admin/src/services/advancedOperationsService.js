import api from './api';

const advancedOperationsService = {
  getReturns: (params) => api.get('/advanced-operations/returns', { params }),
  createReturn: (data) => api.post('/advanced-operations/returns', data),
  updateReturn: (id, data) => api.put(`/advanced-operations/returns/${id}`, data),
  approveReturn: (id, data) => api.post(`/advanced-operations/returns/${id}/approve`, data),
  rejectReturn: (id, data) => api.post(`/advanced-operations/returns/${id}/reject`, data),
  getRefunds: (params) => api.get('/advanced-operations/refunds', { params }),
  getReceivables: () => api.get('/advanced-operations/receivables'),
  getShifts: (params) => api.get('/advanced-operations/shifts', { params }),
  createShift: (data) => api.post('/advanced-operations/shifts', data),
  updateShift: (id, data) => api.put(`/advanced-operations/shifts/${id}`, data),
  deleteShift: (id) => api.delete(`/advanced-operations/shifts/${id}`),
};

export default advancedOperationsService;
