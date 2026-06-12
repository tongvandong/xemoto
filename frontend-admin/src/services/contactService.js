import api from './api';

const normalizeContact = (item = {}) => ({
  ...item,
  id: item.id,
  hoTen: item.hoTen ?? item.fullName ?? '',
  fullName: item.fullName ?? item.hoTen ?? '',
  soDienThoai: item.soDienThoai ?? item.phone ?? '',
  phone: item.phone ?? item.soDienThoai ?? '',
  loaiYeuCau: item.loaiYeuCau ?? item.type ?? '',
  type: item.type ?? item.loaiYeuCau ?? '',
  trangThai: item.trangThai ?? item.contactStatus ?? item.status ?? 'New',
  status: item.status ?? item.contactStatus ?? item.trangThai ?? 'New',
  ngayTao: item.ngayTao ?? item.createdDate ?? item.createdAt,
  createdAt: item.createdAt ?? item.createdDate ?? item.ngayTao,
  noiDung: item.noiDung ?? item.body ?? item.content ?? item.message ?? '',
  content: item.content ?? item.body ?? item.noiDung ?? item.message ?? '',
});

const normalizeCollection = async (request) => {
  const response = await request;
  const data = response.data;
  if (Array.isArray(data)) {
    response.data = data.map(normalizeContact);
    return response;
  }

  response.data = {
    ...data,
    items: (data?.items || data?.data || []).map(normalizeContact),
  };
  return response;
};

const contactService = {
  getAll: (params) => normalizeCollection(api.get('/content/contacts', { params })),
  getById: async (id) => {
    const response = await api.get(`/content/contacts/${id}`);
    response.data = normalizeContact(response.data);
    return response;
  },
  markProcessed: (id) => api.patch(`/content/contacts/${id}/process`),
};

export default contactService;
