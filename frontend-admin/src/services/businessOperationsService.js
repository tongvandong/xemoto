import api from './api';
const root = '/business-operations';
export default {
  getLookups: () => api.get(`${root}/lookups`), getSummary: () => api.get(`${root}/summary`),
  getSuppliers: () => api.get(`${root}/suppliers`), createSupplier: (data) => api.post(`${root}/suppliers`, data), updateSupplier: (id, data) => api.put(`${root}/suppliers/${id}`, data),
  getPurchases: () => api.get(`${root}/purchases`), createPurchase: (data) => api.post(`${root}/purchases`, data), approvePurchase: (id) => api.post(`${root}/purchases/${id}/approve`), cancelPurchase: (id) => api.post(`${root}/purchases/${id}/cancel`), receivePurchase: (id, data) => api.post(`${root}/purchases/${id}/receive`, data), payPurchase: (id, data) => api.post(`${root}/purchases/${id}/pay`, data),
  getCash: () => api.get(`${root}/cash`), createCash: (data) => api.post(`${root}/cash`, data), reverseCash: (id) => api.post(`${root}/cash/${id}/reverse`),
  getRepairs: () => api.get(`${root}/repairs`), createRepair: (data) => api.post(`${root}/repairs`, data), updateRepair: (id, data) => api.put(`${root}/repairs/${id}`, data), updateRepairStatus: (id, data) => api.put(`${root}/repairs/${id}/status`, data),
  getInteractions: () => api.get(`${root}/interactions`), createInteraction: (data) => api.post(`${root}/interactions`, data), updateInteraction: (id, data) => api.put(`${root}/interactions/${id}`, data), completeInteraction: (id) => api.post(`${root}/interactions/${id}/complete`), cancelInteraction: (id) => api.post(`${root}/interactions/${id}/cancel`),
  getAttendance: () => api.get(`${root}/attendance`), checkIn: (data) => api.post(`${root}/attendance/check-in`, data), checkOut: (id) => api.post(`${root}/attendance/${id}/check-out`),
};
