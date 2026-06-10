import React, { useState, useEffect } from 'react';
import paymentService from '../../services/paymentService';
import { PAYMENT_STATUS, PAYMENT_METHODS } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

const PaymentList = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelId, setCancelId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const pageSize = 10;

  const fetchPayments = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, pageSize };
      if (statusFilter) params.status = statusFilter;
      if (methodFilter) params.method = methodFilter;
      const res = await paymentService.getAll(params);
      const data = res.data;
      setPayments(data.items || data.data || data || []);
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / pageSize) || 1);
    } catch (err) {
      setError('Không thể tải danh sách thanh toán. Vui lòng thử lại.');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, statusFilter, methodFilter]);

  const openCancelModal = (paymentId) => {
    setCancelId(paymentId);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      alert('Vui lòng nhập lý do hủy thanh toán.');
      return;
    }
    setProcessing(true);
    try {
      await paymentService.cancel(cancelId, { reason: cancelReason });
      setShowCancelModal(false);
      setCancelId(null);
      setCancelReason('');
      fetchPayments();
    } catch (err) {
      alert('Hủy thanh toán thất bại. Vui lòng thử lại.');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = PAYMENT_STATUS[status];
    if (!s) return <span className="badge badge-secondary">{status}</span>;
    return <span className={`badge badge-${s.color}`}>{s.label}</span>;
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Quản lý Thanh toán</h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Danh sách thanh toán</h3>
            </div>
            <div className="card-body">
              <div className="alert alert-info">
                Không có giao dịch tự động. Xác nhận thanh toán thủ công thực hiện trong chi tiết đơn hàng.
              </div>
              {/* Filters */}
              <div className="row mb-3">
                <div className="col-md-3">
                  <select
                    className="form-control"
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  >
                    <option value="">-- Trạng thái --</option>
                    {Object.entries(PAYMENT_STATUS).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <select
                    className="form-control"
                    value={methodFilter}
                    onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}
                  >
                    <option value="">-- Phương thức --</option>
                    {Object.entries(PAYMENT_METHODS).map(([key, val]) => (
                      <option key={key} value={key}>{val}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="alert alert-danger">{error}</div>
              )}

              {/* Loading */}
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Đang tải...</span>
                  </div>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                  <p className="text-muted">Không có thanh toán nào.</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-bordered table-striped">
                      <thead>
                        <tr>
                          <th className="table-col-code">Mã TT</th>
                          <th className="table-col-code">Mã đơn hàng</th>
                          <th className="table-col-money">Số tiền</th>
                          <th>Phương thức</th>
                          <th className="table-col-status">Trạng thái</th>
                          <th className="table-col-date">Ngày tạo</th>
                          <th className="table-col-actions">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((payment) => (
                          <tr key={payment.id || payment.maThanhToan}>
                            <td className="table-col-code"><strong>{payment.maThanhToan || payment.paymentCode || payment.id}</strong></td>
                            <td className="table-col-code">{payment.maDonHang || payment.orderCode || '—'}</td>
                            <td className="table-col-money">{formatCurrency(payment.soTien || payment.amount || 0)}</td>
                            <td>{PAYMENT_METHODS[payment.phuongThuc || payment.method] || payment.phuongThuc || payment.method || '—'}</td>
                            <td className="table-col-status">{getStatusBadge(payment.trangThai || payment.status)}</td>
                            <td className="table-col-date">{formatDate(payment.ngayTao || payment.createdAt)}</td>
                            <td className="table-col-actions">
                              {(payment.trangThai || payment.status) !== 'Cancelled' ? (
                                <button className="btn btn-danger btn-sm" onClick={() => openCancelModal(payment.id || payment.maThanhToan)} disabled={processing}>
                                  <i className="fas fa-times"></i> Hủy
                                </button>
                              ) : <span className="text-muted">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <nav className="mt-3">
                      <ul className="pagination justify-content-center">
                        <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                          <button className="page-link" onClick={() => setPage(page - 1)}>«</button>
                        </li>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                          <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                          </li>
                        ))}
                        <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                          <button className="page-link" onClick={() => setPage(page + 1)}>»</button>
                        </li>
                      </ul>
                    </nav>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Cancel Payment Modal */}
      {showCancelModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog" style={{ maxHeight: '90vh' }}>
            <div className="modal-content" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-header">
                <h5 className="modal-title">Hủy thanh toán</h5>
                <button type="button" className="close" onClick={() => setShowCancelModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
                <div className="form-group">
                  <label>Lý do hủy <span className="text-danger">*</span></label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Nhập lý do hủy thanh toán..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-default" onClick={() => setShowCancelModal(false)}>Đóng</button>
                <button className="btn btn-danger" onClick={handleCancel} disabled={processing}>
                  {processing ? 'Đang xử lý...' : 'Xác nhận hủy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentList;
