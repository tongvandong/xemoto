import api from './api';

// Backend: ManufacturerDto(Id, Name, LogoUrl, Description, Status); SaveManufacturerRequest(Name, LogoUrl, Description, Status).
// Lớp chuẩn hoá dưới đây map DTO tiếng Anh về shape cho UI và GIỮ THÊM alias tiếng Việt (ten, moTa, dangHoatDong)
// để trang cũ chạy. Khi đọc field nên ưu tiên tên tiếng Anh; alias chỉ để tương thích.
const normalizeManufacturer = (item = {}) => ({
  ...item,
  id: item.id ?? item.maHangSanXuat,
  ten: item.ten ?? item.name ?? '',
  name: item.name ?? item.ten ?? '',
  logoUrl: item.logoUrl ?? item.logo ?? '',
  moTa: item.moTa ?? item.description ?? '',
  description: item.description ?? item.moTa ?? '',
  status: item.status ?? 1,
  dangHoatDong: item.dangHoatDong ?? (item.status ?? 1) === 1,
});

const normalizeCollection = async (request) => {
  const response = await request;
  const data = response.data;
  if (Array.isArray(data)) {
    response.data = data.map(normalizeManufacturer);
    return response;
  }
  response.data = { ...data, items: (data?.items || data?.data || []).map(normalizeManufacturer) };
  return response;
};

const mapPayload = (data = {}) => ({
  name: data.name ?? data.ten,
  logoUrl: data.logoUrl || null,
  description: data.description ?? data.moTa ?? null,
  status: data.status ?? (data.dangHoatDong === false ? 0 : 1),
});

const send = (method, url, data) => {
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  return api.request({
    method,
    url,
    data,
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
};

const manufacturerService = {
  getAll: (params) => normalizeCollection(api.get('/manufacturers', { params })),
  create: (data) => api.post('/manufacturers', mapPayload(data)),
  update: (id, data) => api.put(`/manufacturers/${id}`, mapPayload(data)),
  uploadLogo: (id, formData) => send('post', `/manufacturers/${id}/logo`, formData),
  delete: (id) => api.delete(`/manufacturers/${id}`),
};

export default manufacturerService;
