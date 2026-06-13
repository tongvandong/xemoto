import api from './api';

// FAQ: BE trả về DTO tiếng Anh { id, question, answer, category, sortOrder, status }.
// status: 1 = đang hiển thị, 0 = ẩn. Không cần map nhiều tên — dùng thẳng field tiếng Anh.

function toPayload(data) {
  return {
    question: data.question,
    answer: data.answer,
    category: data.category || null,
    sortOrder: Number(data.sortOrder) || 0,
    status: data.status,
  };
}

const faqService = {
  // Admin xem cả FAQ đang ẩn -> truyền all=true.
  getAll: () => api.get('/content/faq', { params: { all: true } }),
  create: (data) => api.post('/content/faq', toPayload(data)),
  update: (id, data) => api.put(`/content/faq/${id}`, toPayload(data)),
  delete: (id) => api.delete(`/content/faq/${id}`),
};

export default faqService;
