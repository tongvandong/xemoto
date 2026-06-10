import api from './api';

const auditLogService = {
  getAll: (params) => api.get('/audit-logs', { params }),
};

export default auditLogService;
