import api from './api';

// Liên hệ: BE trả DTO tiếng Anh { id, fullName, phone, email, subject, body, type, productId, contactStatus, createdDate, handledAt }.
// contactStatus: 'New' = chờ xử lý, 'Processed' = đã xử lý.

const contactService = {
  // params: { page, pageSize, status, type } -> BE trả PagingResponse { items, totalItems, totalPages, ... }.
  getAll: (params) => api.get('/content/contacts', { params }),
  getById: (id) => api.get(`/content/contacts/${id}`),
  markProcessed: (id) => api.patch(`/content/contacts/${id}/process`),
};

export default contactService;
