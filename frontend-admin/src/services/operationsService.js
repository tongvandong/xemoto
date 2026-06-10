import api from './api';

const operationsService = {
  getSettings: () => api.get('/operations/settings'),
  saveSettings: (items) => api.put('/operations/settings', { items }),
};

export default operationsService;
