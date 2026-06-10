import api from './api';

const normalizePost = (item = {}) => ({
  ...item,
  id: item.id ?? item.maBaiViet,
  tieuDe: item.tieuDe ?? item.title ?? '',
  title: item.title ?? item.tieuDe ?? '',
  tomTat: item.tomTat ?? item.summary ?? '',
  summary: item.summary ?? item.tomTat ?? '',
  noiDung: item.noiDung ?? item.body ?? item.content ?? '',
  body: item.body ?? item.noiDung ?? item.content ?? '',
  anhDaiDienUrl: item.anhDaiDienUrl ?? item.coverUrl ?? item.thumbnail ?? '',
  coverUrl: item.coverUrl ?? item.anhDaiDienUrl ?? item.thumbnail ?? '',
  danhMuc: item.danhMuc ?? item.category ?? '',
  category: item.category ?? item.danhMuc ?? '',
  trangThai: item.trangThai ?? item.postStatus ?? item.status ?? 'Draft',
  postStatus: item.postStatus ?? item.trangThai ?? item.status ?? 'Draft',
  xuatBanLuc: item.xuatBanLuc ?? item.publishedAt ?? null,
  publishedAt: item.publishedAt ?? item.xuatBanLuc ?? null,
});

const normalizeCollection = async (request) => {
  const response = await request;
  const data = response.data;
  if (Array.isArray(data)) {
    response.data = data.map(normalizePost);
    return response;
  }
  response.data = { ...data, items: (data?.items || data?.data || []).map(normalizePost) };
  return response;
};

const normalizeOne = async (request) => {
  const response = await request;
  response.data = normalizePost(response.data);
  return response;
};

const mapPayload = (data = {}) => ({
  title: data.title ?? data.tieuDe ?? '',
  slug: data.slug || null,
  summary: data.summary ?? data.tomTat ?? null,
  body: data.body ?? data.noiDung ?? '',
  coverUrl: data.coverUrl ?? data.anhDaiDienUrl ?? null,
  category: data.category ?? data.danhMuc ?? null,
  postStatus: data.postStatus ?? data.trangThai ?? 'Draft',
  publishedAt: data.publishedAt ?? data.xuatBanLuc ?? null,
});

const postService = {
  getAll: (params) => normalizeCollection(api.get('/content/posts', { params })),
  getById: (id) => normalizeOne(api.get(`/content/posts/${id}`)),
  create: (data) => api.post('/content/posts', mapPayload(data)),
  update: (id, data) => api.put(`/content/posts/${id}`, mapPayload(data)),
  uploadImage: (_id, formData) => api.post('/content/posts/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id) => api.delete(`/content/posts/${id}`),
};

export default postService;
