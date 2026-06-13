import api from './api';

// Lớp chuẩn hoá (normalize): BE trả DTO tiếng Anh (fullName, email, phoneNumber, role, status số...).
// Các hàm dưới map về shape cho UI; status: BE dùng số (1/0) <-> UI dùng chuỗi Active/Inactive.
// Có giữ một số alias để tương thích trang cũ — đọc field nên ưu tiên tên tiếng Anh.
const normalizeParams = (params = {}) => {
  const normalized = { ...params };
  if (normalized.search && !normalized.keyword) normalized.keyword = normalized.search;
  delete normalized.search;
  return normalized;
};

const toStatusNumber = (value, fallback = 1) => {
  if (value === 'Active') return 1;
  if (value === 'Inactive') return 0;
  if (value === 'Deleted' || value === 'Locked') return -1;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const normalizeInternalPayload = (data = {}) => ({
  fullName: data.fullName ?? data.hoTen ?? '',
  email: data.email ?? '',
  phoneNumber: data.phoneNumber ?? data.soDienThoai ?? null,
  password: data.password ?? data.matKhau ?? '',
  role: data.role ?? data.vaiTro ?? 'Staff',
  status: toStatusNumber(data.status ?? data.trangThai, 1),
});

const normalizeCustomerPayload = (data = {}) => ({
  fullName: data.fullName ?? data.hoTen ?? data.name ?? '',
  email: data.email || null,
  phoneNumber: data.phoneNumber ?? data.soDienThoai ?? data.phone ?? null,
  status: toStatusNumber(data.status ?? data.trangThai, 1),
  careNote: data.careNote ?? data.ghiChuChamSoc ?? null,
});

const userService = {
  getAll: (params) => api.get('/users/all', { params: normalizeParams(params) }),
  getCustomers: (params) => api.get('/users/customers', { params: normalizeParams(params) }),
  getCustomerProfile: (id) => api.get(`/customers/${id}/profile`),
  createCustomer: (data) => api.post('/users/customers', normalizeCustomerPayload(data)),
  updateCustomer: (id, data) => api.put(`/users/customers/${id}`, normalizeCustomerPayload(data)),
  updateCustomerCareNote: (id, data) => api.patch(`/users/customers/${id}/care-note`, {
    careNote: data?.careNote ?? data?.ghiChuChamSoc ?? null,
  }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', normalizeInternalPayload(data)),
  update: (id, data) => api.put(`/users/${id}`, normalizeInternalPayload(data)),
  updateStatus: (id, data) => api.patch(`/users/${id}/status`, {
    status: toStatusNumber(data?.status ?? data?.trangThai, 1),
  }),
  delete: (id) => api.delete(`/users/${id}`),
};

export default userService;
