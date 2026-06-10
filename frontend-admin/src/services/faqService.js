import api from './api';

const normalizeFaq = (item = {}) => ({
  ...item,
  id: item.id,
  cauHoi: item.cauHoi ?? item.question ?? '',
  question: item.question ?? item.cauHoi ?? '',
  cauTraLoi: item.cauTraLoi ?? item.answer ?? '',
  answer: item.answer ?? item.cauTraLoi ?? '',
  danhMuc: item.danhMuc ?? item.category ?? '',
  category: item.category ?? item.danhMuc ?? '',
  thuTu: item.thuTu ?? item.sortOrder ?? 0,
  sortOrder: item.sortOrder ?? item.thuTu ?? 0,
  dangHoatDong: item.dangHoatDong ?? item.status === 1,
  status: item.status ?? (item.dangHoatDong === false ? 0 : 1),
});

const normalizeCollection = async (request) => {
  const response = await request;
  const data = response.data;
  if (Array.isArray(data)) {
    response.data = data.map(normalizeFaq);
    return response;
  }
  response.data = { ...data, items: (data?.items || data?.data || []).map(normalizeFaq) };
  return response;
};

const mapPayload = (data = {}) => ({
  question: data.question ?? data.cauHoi ?? '',
  answer: data.answer ?? data.cauTraLoi ?? '',
  category: data.category ?? data.danhMuc ?? null,
  sortOrder: Number(data.sortOrder ?? data.thuTu ?? 0),
  status: data.status ?? (data.dangHoatDong === false ? 0 : 1),
});

const faqService = {
  getAll: (params) => normalizeCollection(api.get('/content/faq', { params })),
  create: (data) => api.post('/content/faq', mapPayload(data)),
  update: (id, data) => api.put(`/content/faq/${id}`, mapPayload(data)),
  delete: (id) => api.delete(`/content/faq/${id}`),
};

export default faqService;
