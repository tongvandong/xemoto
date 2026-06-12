import api from './api';

const normalizeContactStatus = (status) => {
  if (status === 'Pending') return 'New';
  return status || 'New';
};

const normalizeContact = (item = {}) => {
  const contactStatus = normalizeContactStatus(item.contactStatus ?? item.trangThai ?? item.status);
  return {
    ...item,
    id: item.id ?? item.maLienHe,
    hoTen: item.hoTen ?? item.fullName ?? '',
    fullName: item.fullName ?? item.hoTen ?? '',
    soDienThoai: item.soDienThoai ?? item.phone ?? '',
    phone: item.phone ?? item.soDienThoai ?? '',
    email: item.email ?? '',
    tieuDe: item.tieuDe ?? item.subject ?? '',
    subject: item.subject ?? item.tieuDe ?? '',
    noiDung: item.noiDung ?? item.body ?? item.content ?? item.message ?? '',
    body: item.body ?? item.noiDung ?? item.content ?? item.message ?? '',
    content: item.content ?? item.body ?? item.noiDung ?? item.message ?? '',
    loaiYeuCau: item.loaiYeuCau ?? item.type ?? '',
    type: item.type ?? item.loaiYeuCau ?? '',
    trangThai: contactStatus,
    status: contactStatus,
    contactStatus,
    ngayTao: item.ngayTao ?? item.createdDate ?? item.createdAt ?? null,
    createdDate: item.createdDate ?? item.ngayTao ?? item.createdAt ?? null,
    createdAt: item.createdAt ?? item.createdDate ?? item.ngayTao ?? null,
    ngayXuLy: item.ngayXuLy ?? item.handledAt ?? null,
    handledAt: item.handledAt ?? item.ngayXuLy ?? null,
  };
};

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

const normalizeOne = async (request) => {
  const response = await request;
  response.data = normalizeContact(response.data);
  return response;
};

const contactService = {
  getAll: (params) => normalizeCollection(api.get('/content/contacts', { params })),
  getById: (id) => normalizeOne(api.get(`/content/contacts/${id}`)),
  markProcessed: (id) => api.patch(`/content/contacts/${id}/process`),
};

export default contactService;
