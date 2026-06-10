import api from './api';

const installmentService = {
  getAll: (params) => api.get('/installment-applications', { params }),
  approve: (id, data) => api.post(`/installment-applications/${id}/approve`, data),
  reject: (id, data) => api.post(`/installment-applications/${id}/reject`, data),
};

export default installmentService;
