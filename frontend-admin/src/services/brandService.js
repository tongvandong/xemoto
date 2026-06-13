import api from './api';

// Lớp chuẩn hoá (normalize): BE trả DTO tiếng Anh (id, name, logoUrl, brandId, status...).
// Hàm dưới map về shape ổn định cho UI và GIỮ THÊM alias tiếng Việt (tenHang, tenDongXe, hangXeId...) cho trang cũ.
// Khi đọc field nên ưu tiên tên tiếng Anh; alias chỉ để tương thích.
const normalizeBrand = (brand = {}) => ({
  ...brand,
  id: brand.id ?? brand.maHangXe,
  tenHang: brand.tenHang ?? brand.name ?? '',
  name: brand.name ?? brand.tenHang ?? '',
  logoUrl: brand.logoUrl ?? brand.logo ?? '',
  dangHoatDong: brand.dangHoatDong ?? brand.status === 1,
});

const normalizeModel = (model = {}) => ({
  ...model,
  id: model.id ?? model.maDongXe,
  maHangXe: model.maHangXe ?? model.brandId,
  hangXeId: model.hangXeId ?? model.brandId ?? model.maHangXe,
  tenDongXe: model.tenDongXe ?? model.name ?? '',
  name: model.name ?? model.tenDongXe ?? '',
  dangHoatDong: model.dangHoatDong ?? model.status === 1,
});

const normalizeCollection = async (request, mapper) => {
  const response = await request;
  const data = response.data;
  if (Array.isArray(data)) {
    response.data = data.map(mapper);
    return response;
  }
  response.data = { ...data, items: (data?.items || data?.data || []).map(mapper) };
  return response;
};

const mapBrandPayload = (data = {}) => ({
  name: data.name ?? data.tenHang,
  slug: data.slug || null,
  logoUrl: data.logoUrl || null,
  status: data.status ?? (data.dangHoatDong === false ? 0 : 1),
});

const mapModelPayload = (data = {}) => ({
  brandId: Number(data.brandId ?? data.maHangXe ?? data.hangXeId),
  name: data.name ?? data.tenDongXe,
  slug: data.slug || null,
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

const brandService = {
  getAll: (params) => normalizeCollection(api.get('/brands', { params }), normalizeBrand),
  create: (data) => api.post('/brands', mapBrandPayload(data)),
  update: (id, data) => api.put(`/brands/${id}`, mapBrandPayload(data)),
  uploadLogo: (id, formData) => send('post', `/brands/${id}/logo`, formData),
  delete: (id) => api.delete(`/brands/${id}`),
  // Vehicle Models
  getModels: (brandId) => normalizeCollection(api.get('/models', { params: { brandId } }), normalizeModel),
  getAllModels: (params) => normalizeCollection(api.get('/models', { params }), normalizeModel),
  createModel: (data) => api.post('/models', mapModelPayload(data)),
  updateModel: (id, data) => api.put(`/models/${id}`, mapModelPayload(data)),
  deleteModel: (id) => api.delete(`/models/${id}`),
};

export default brandService;
