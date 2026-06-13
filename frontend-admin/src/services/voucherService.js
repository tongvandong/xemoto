import api from './api';

// Lớp chuẩn hoá (normalize): BE trả DTO tiếng Anh (code, discountType, discountValue, startAt/endAt, status số...).
// Hàm dưới map về shape ổn định cho UI và GIỮ THÊM alias tiếng Việt + tên cũ (giaTriGiam, startDate...) để trang cũ chạy.
// status: BE dùng số (1/0); UI ở đây quy về chuỗi Active/Inactive cho dễ hiển thị.
const statusToNumber = (status) => {
  if (typeof status === 'number') return status;
  return status === 'Inactive' || status === 'Expired' ? 0 : 1;
};

const numberToStatus = (status) => {
  if (typeof status === 'string') return status;
  return status === 1 ? 'Active' : 'Inactive';
};

const normalizeVoucher = (item = {}) => ({
  ...item,
  id: item.id ?? item.maVoucher,
  code: item.code ?? item.maVoucherCode ?? '',
  discountType: item.discountType ?? item.loaiGiamGia ?? 'Percent',
  discountValue: item.discountValue ?? item.giaTriGiam ?? 0,
  maxDiscountValue: item.maxDiscountValue ?? item.maxDiscount ?? item.giaTriGiamToiDa ?? '',
  maxDiscount: item.maxDiscount ?? item.maxDiscountValue ?? item.giaTriGiamToiDa ?? null,
  minOrderValue: item.minOrderValue ?? item.giaTriDonToiThieu ?? 0,
  usageLimit: item.usageLimit ?? item.gioiHanSuDung ?? '',
  perUserLimit: item.perUserLimit ?? item.gioiHanMoiNguoi ?? null,
  usedCount: item.usedCount ?? item.daDung ?? 0,
  startDate: item.startDate ?? item.startAt ?? item.startsAt ?? item.ngayBatDau ?? '',
  startAt: item.startAt ?? item.startDate ?? item.startsAt ?? item.ngayBatDau ?? null,
  endDate: item.endDate ?? item.endAt ?? item.endsAt ?? item.ngayKetThuc ?? '',
  endAt: item.endAt ?? item.endDate ?? item.endsAt ?? item.ngayKetThuc ?? null,
  status: numberToStatus(item.status ?? item.trangThai ?? 1),
});

const normalizeCollection = async (request) => {
  const response = await request;
  const data = response.data;
  if (Array.isArray(data)) {
    response.data = data.map(normalizeVoucher);
    return response;
  }
  response.data = { ...data, items: (data?.items || data?.data || []).map(normalizeVoucher) };
  return response;
};

const normalizeOne = async (request) => {
  const response = await request;
  response.data = normalizeVoucher(response.data);
  return response;
};

const mapPayload = (data = {}) => ({
  code: data.code ?? data.maVoucherCode ?? '',
  description: data.description ?? data.moTa ?? null,
  discountType: data.discountType === 'FreeShipping' ? 'Amount' : (data.discountType || 'Percent'),
  discountValue: data.discountType === 'FreeShipping' ? 1 : Number(data.discountValue ?? data.giaTriGiam ?? 0),
  maxDiscount: data.maxDiscount ?? data.maxDiscountValue ?? data.giaTriGiamToiDa ?? null,
  minOrderValue: Number(data.minOrderValue ?? data.giaTriDonToiThieu ?? 0),
  usageLimit: data.usageLimit ? Number(data.usageLimit) : null,
  perUserLimit: data.perUserLimit ? Number(data.perUserLimit) : null,
  startAt: data.startAt ?? data.startDate ?? null,
  endAt: data.endAt ?? data.endDate ?? null,
  status: statusToNumber(data.status ?? data.trangThai ?? 1),
});

const voucherService = {
  getAll: (params) => normalizeCollection(api.get('/vouchers', { params })),
  getById: (id) => normalizeOne(api.get(`/vouchers/${id}`)),
  create: (data) => api.post('/vouchers', mapPayload(data)),
  update: (id, data) => api.put(`/vouchers/${id}`, mapPayload(data)),
  delete: (id) => api.delete(`/vouchers/${id}`),
};

export default voucherService;
