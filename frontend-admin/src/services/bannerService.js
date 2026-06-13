import api from './api';

// Banner trang chủ: BE trả DTO tiếng Anh { id, position, title, imageUrl, link, sortOrder, status }.
// status: 1 = hiển thị, 0 = ẩn.

function toPayload(data) {
  return {
    position: data.position || 'Slider',
    title: data.title || null,
    imageUrl: data.imageUrl,
    link: data.link || null,
    sortOrder: Number(data.sortOrder) || 0,
    status: data.status,
  };
}

const bannerService = {
  // Admin xem cả banner đang ẩn -> all=true.
  getAll: () => api.get('/content/home-banners', { params: { all: true } }),
  create: (data) => api.post('/content/home-banners', toPayload(data)),
  update: (id, data) => api.put(`/content/home-banners/${id}`, toPayload(data)),
  delete: (id) => api.delete(`/content/home-banners/${id}`),
  // Upload ảnh banner -> BE trả { url }.
  uploadImage: (formData) => api.post('/content/home-banners/image', formData),
};

export default bannerService;
