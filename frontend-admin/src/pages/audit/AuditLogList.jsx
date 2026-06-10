import React, { useCallback, useEffect, useState } from 'react';
import auditLogService from '../../services/auditLogService';
import { formatDate } from '../../utils/formatDate';

const entityLabels = {
  Product: 'Sản phẩm',
  ProductVariant: 'Biến thể',
  Sku: 'Biến thể',
  ProductImage: 'Ảnh sản phẩm',
  PartCompatibility: 'Tương thích phụ tùng',
  Category: 'Danh mục',
  Brand: 'Hãng xe',
  VehicleModel: 'Dòng xe',
  Inventory: 'Tồn kho',
  InventoryItem: 'Tồn kho',
  InventoryThreshold: 'Ngưỡng tồn',
  Post: 'Bài viết',
  Faq: 'FAQ',
  ContactRequest: 'Liên hệ',
  ProductReview: 'Đánh giá',
  Review: 'Đánh giá',
  Order: 'Đơn hàng',
  OrderStatusHistory: 'Lịch sử đơn',
  Payment: 'Thanh toán',
  StockMovement: 'Biến động kho',
  Voucher: 'Voucher',
  User: 'Người dùng',
};

const actionLabels = {
  Create: 'Tạo mới',
  Update: 'Cập nhật',
  Delete: 'Xóa',
  Deactivate: 'Ngừng hoạt động',
  UpdateStatus: 'Đổi trạng thái',
  UpdateImage: 'Cập nhật ảnh',
  UpdateLogo: 'Cập nhật logo',
  SetMain: 'Đặt ảnh chính',
  Adjust: 'Điều chỉnh tồn',
  Sync: 'Đồng bộ',
  Cancel: 'Hủy',
  Process: 'Đánh dấu xử lý',
  Added: 'Tạo mới',
  Modified: 'Cập nhật',
  Deleted: 'Xóa',
};

const pageSize = 20;

const getApiMessage = (err, fallback) => err?.response?.data?.message || fallback;
const labelOf = (map, value) => map[value] || value || '-';
const previewOf = (value) => {
  if (!value) return '-';
  const text = String(value);
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
};

const formatLogTime = (value) => {
  if (!value) return '-';
  return formatDate(value);
};

const AuditLogList = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    entityType: '',
    action: '',
    actorUserId: '',
    keyword: '',
    from: '',
    to: '',
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, pageSize };
      if (filters.entityType) params.entity = filters.entityType;
      if (filters.action) params.action = filters.action;
      if (filters.actorUserId) params.actorId = filters.actorUserId;
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;

      const res = await auditLogService.getAll(params);
      const data = res.data;
      setLogs(data.items || data.data || []);
      setTotalPages(data.totalPages || Math.ceil((data.totalItems || data.total || 0) / pageSize) || 1);
    } catch (err) {
      setError(getApiMessage(err, 'Không thể tải nhật ký hệ thống.'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleReset = () => {
    setFilters({ entityType: '', action: '', actorUserId: '', keyword: '', from: '', to: '' });
    setPage(1);
  };

  return (
    <div className="container-fluid">
      <div className="row mb-3">
        <div className="col-sm-6">
          <h1 className="m-0">Nhật ký hệ thống</h1>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card mb-3">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-3">
                <div className="form-group">
                  <label>Đối tượng</label>
                  <select className="form-control" name="entityType" value={filters.entityType} onChange={handleFilterChange}>
                    <option value="">Tất cả</option>
                    {Object.entries(entityLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="col-md-3">
                <div className="form-group">
                  <label>Hành động</label>
                  <select className="form-control" name="action" value={filters.action} onChange={handleFilterChange}>
                    <option value="">Tất cả</option>
                    {Object.entries(actionLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="col-md-2">
                <div className="form-group">
                  <label>Mã người thực hiện</label>
                  <input className="form-control" name="actorUserId" value={filters.actorUserId} onChange={handleFilterChange} />
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group">
                  <label>Từ khóa</label>
                  <input className="form-control" name="keyword" value={filters.keyword} onChange={handleFilterChange} placeholder="Mã đối tượng, người thực hiện, ghi chú..." />
                </div>
              </div>
              <div className="col-md-3">
                <div className="form-group">
                  <label>Từ ngày</label>
                  <input className="form-control" type="date" name="from" value={filters.from} onChange={handleFilterChange} />
                </div>
              </div>
              <div className="col-md-3">
                <div className="form-group">
                  <label>Đến ngày</label>
                  <input className="form-control" type="date" name="to" value={filters.to} onChange={handleFilterChange} />
                </div>
              </div>
              <div className="col-md-6 d-flex align-items-end justify-content-end">
                <button className="btn btn-secondary mr-2" type="button" onClick={handleReset}>
                  <i className="fas fa-undo mr-1"></i>
                  Đặt lại
                </button>
                <button className="btn btn-primary" type="submit">
                  <i className="fas fa-search mr-1"></i>
                  Lọc nhật ký
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body table-responsive p-0">
          <table className="table table-hover table-striped mb-0">
            <thead>
              <tr>
                <th className="text-center" style={{ width: 90 }}>Mã</th>
                <th>Thời gian</th>
                <th>Đối tượng</th>
                <th className="text-center">Mã đối tượng</th>
                <th>Hành động</th>
                <th>Người thực hiện</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-4">
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Đang tải nhật ký...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center text-muted py-4">Chưa có nhật ký phù hợp.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.maNhatKy || log.id}>
                    <td className="text-center">{log.maNhatKy || log.id}</td>
                    <td>{formatLogTime(log.at || log.thoiGian || log.createdAt)}</td>
                    <td>{labelOf(entityLabels, log.doiTuong || log.loaiDoiTuong || log.entity || log.entityType)}</td>
                    <td className="text-center">{log.maDoiTuong || log.entityId}</td>
                    <td>
                      <span className="badge badge-info">{labelOf(actionLabels, log.hanhDong || log.action)}</span>
                    </td>
                    <td>
                      {log.tenNguoiThucHien || log.actorName || '-'}
                      {(log.maNguoiThucHien || log.actorUserId || log.actorId) && (
                        <span className="text-muted ml-1">#{log.maNguoiThucHien || log.actorUserId || log.actorId}</span>
                      )}
                    </td>
                    <td className="text-break" title={log.ghiChu || log.note || log.newValue || ''}>
                      {previewOf(log.ghiChu || log.note || log.newValue)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="card-footer d-flex justify-content-between align-items-center">
          <span>Trang {page}/{totalPages}</span>
          <div>
            <button className="btn btn-sm btn-outline-secondary mr-2" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Trước
            </button>
            <button className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogList;
