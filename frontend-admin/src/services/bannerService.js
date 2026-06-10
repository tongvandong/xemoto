import api from './api';

const normalizeBanner = (item = {}) => ({
  ...item,
  id: item.id ?? item.maBanner,
  maBanner: item.maBanner ?? item.id,
  viTri: item.viTri ?? item.position ?? 'Slider',
  position: item.position ?? item.viTri ?? 'Slider',
  tieuDe: item.tieuDe ?? item.title ?? '',
  title: item.title ?? item.tieuDe ?? '',
  urlAnh: item.urlAnh ?? item.imageUrl ?? '',
  imageUrl: item.imageUrl ?? item.urlAnh ?? '',
  lienKet: item.lienKet ?? item.link ?? '',
  link: item.link ?? item.lienKet ?? '',
  thuTu: item.thuTu ?? item.sortOrder ?? 0,
  sortOrder: item.sortOrder ?? item.thuTu ?? 0,
  dangHoatDong: item.dangHoatDong ?? item.status === 1,
  status: item.status ?? (item.dangHoatDong === false ? 0 : 1),
});

const normalizeCollection = async (request) => {
  const response = await request;
  const data = response.data;
  if (Array.isArray(data)) {
    response.data = data.map(normalizeBanner);
    return response;
  }
  response.data = { ...data, items: (data?.items || data?.data || []).map(normalizeBanner) };
  return response;
};

const mapPayload = (data = {}) => ({
  position: data.position ?? data.viTri ?? 'Slider',
  title: data.title ?? data.tieuDe ?? null,
  imageUrl: data.imageUrl ?? data.urlAnh ?? '',
  link: data.link ?? data.lienKet ?? null,
  sortOrder: Number(data.sortOrder ?? data.thuTu ?? 0),
  status: data.status ?? (data.dangHoatDong === false ? 0 : 1),
});

const bannerService = {
  getAll: () => normalizeCollection(api.get('/content/home-banners', { params: { all: true } })),
  create: (data) => api.post('/content/home-banners', mapPayload(data)),
  update: (id, data) => api.put(`/content/home-banners/${id}`, mapPayload(data)),
  delete: (id) => api.delete(`/content/home-banners/${id}`),
  uploadImage: async (formData) => {
    const response = await api.post('/content/home-banners/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    response.data = { ...response.data, urlAnh: response.data?.urlAnh ?? response.data?.url ?? response.data?.imageUrl };
    return response;
  },
};

export default bannerService;
