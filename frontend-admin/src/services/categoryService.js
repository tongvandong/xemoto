import api from './api';

const normalizeCategory = (item = {}) => ({
  ...item,
  id: item.id ?? item.maDanhMuc,
  maDanhMuc: item.maDanhMuc ?? item.id,
  parentId: item.parentId ?? item.danhMucChaId ?? item.maDanhMucCha ?? null,
  danhMucChaId: item.danhMucChaId ?? item.parentId ?? item.maDanhMucCha ?? null,
  tenDanhMuc: item.tenDanhMuc ?? item.name ?? '',
  name: item.name ?? item.tenDanhMuc ?? '',
  moTa: item.moTa ?? item.description ?? '',
  description: item.description ?? item.moTa ?? '',
  thuTu: item.thuTu ?? item.sortOrder ?? 0,
  sortOrder: item.sortOrder ?? item.thuTu ?? 0,
  kind: item.kind ?? item.loai ?? 2,
  dangHoatDong: item.dangHoatDong ?? item.status === 1,
  status: item.status ?? (item.dangHoatDong === false ? 0 : 1),
});

const normalizeCollection = async (request) => {
  const response = await request;
  const data = response.data;
  if (Array.isArray(data)) {
    response.data = data.map(normalizeCategory);
    return response;
  }
  response.data = { ...data, items: (data?.items || data?.data || []).map(normalizeCategory) };
  return response;
};

const mapPayload = (data = {}) => ({
  parentId: data.parentId ?? data.danhMucChaId ?? data.maDanhMucCha ?? null,
  name: data.name ?? data.tenDanhMuc ?? '',
  slug: data.slug || null,
  kind: Number(data.kind ?? data.loai ?? 2),
  sortOrder: Number(data.sortOrder ?? data.thuTu ?? 0),
  status: data.status ?? (data.dangHoatDong === false ? 0 : 1),
});

const categoryService = {
  getAll: (params) => normalizeCollection(api.get('/categories', { params })),
  create: (data) => api.post('/categories', mapPayload(data)),
  update: (id, data) => api.put(`/categories/${id}`, mapPayload(data)),
  delete: (id) => api.delete(`/categories/${id}`),
};

export default categoryService;
