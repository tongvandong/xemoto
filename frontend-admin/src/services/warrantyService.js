import api from './api';

// Lớp chuẩn hoá (normalize): BE trả DTO tiếng Anh (id, code, orderId, customerName, productSnapshot, warrantyStatus...).
// Hàm dưới map sang alias tiếng Việt (maBaoHanh, tenKhachHang, tenSanPham...) cho trang cũ dùng.
// Đây là adapter để UI cũ chạy với BE mới; muốn sạch nhất nên đọc theo tên tiếng Anh của DTO.
const mapWarranty = (item = {}) => ({
  ...item,
  maBaoHanh: item.id,
  maPhieuBaoHanh: item.code,
  maDonHang: item.orderId,
  maNguoiDung: item.customerId,
  maBienSanPham: item.skuId,
  tenKhachHang: item.customerName,
  soDienThoai: item.customerPhone,
  tenSanPham: item.productSnapshot,
  sku: item.serialNumber,
  soKhung: item.frameNumber,
  soMay: item.engineNumber,
  loiKhachBao: item.reportedIssue,
  chiPhiDuKien: item.estimatedCost,
  chiPhiThucTe: item.actualCost,
  ngayMua: item.startAt,
  hetHanBaoHanh: item.startAt ? new Date(new Date(item.startAt).setMonth(new Date(item.startAt).getMonth() + Number(item.months || 0))).toISOString() : null,
  trangThai: item.warrantyStatus,
  ghiChu: item.note,
  ngayTao: item.createdDate,
});

const mapHistory = (item = {}) => ({
  ...item,
  maLichSuBaoHanh: item.id,
  trangThaiCu: item.fromStatus,
  trangThaiMoi: item.toStatus,
  ghiChu: item.note,
  chiPhiThucTe: item.actualCost,
  maNguoiThucHien: item.changedBy,
  ngayTao: item.createdDate,
});

const mapSavePayload = (data) => ({
  orderId: data.maDonHang || null,
  skuId: data.maBienSanPham || null,
  customerId: data.maNguoiDung || null,
  productSnapshot: data.tenSanPham,
  serialNumber: data.sku || null,
  startAt: data.ngayMua || null,
  months: data.ngayMua && data.hetHanBaoHanh ? Math.max(1, Math.round((new Date(data.hetHanBaoHanh) - new Date(data.ngayMua)) / 2629800000)) : 12,
  note: data.ghiChu || null,
  customerName: data.tenKhachHang,
  customerPhone: data.soDienThoai,
  frameNumber: data.soKhung || null,
  engineNumber: data.soMay || null,
  reportedIssue: data.loiKhachBao,
  estimatedCost: data.chiPhiDuKien || null,
});

const warrantyService = {
  getAll: async (params) => {
    const res = await api.get('/warranties', { params: { keyword: params?.search, status: params?.status, page: params?.page || 1, pageSize: params?.pageSize || 100 } });
    return { ...res, data: { ...res.data, items: (res.data.items || []).map(mapWarranty) } };
  },
  getById: async (id) => {
    const res = await api.get(`/warranties/${id}`);
    return { ...res, data: { warranty: mapWarranty(res.data.warranty), histories: (res.data.histories || []).map(mapHistory) } };
  },
  create: (data) => api.post('/warranties', mapSavePayload(data)),
  update: (id, data) => api.put(`/warranties/${id}`, mapSavePayload(data)),
  updateStatus: (id, data) => api.patch(`/warranties/${id}/status`, {
    status: data.trangThai,
    note: data.ghiChu || null,
    actualCost: data.chiPhiThucTe || null,
  }),
};

export default warrantyService;
