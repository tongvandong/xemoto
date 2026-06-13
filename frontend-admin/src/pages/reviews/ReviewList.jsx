import React, { useState, useEffect, useCallback } from 'react';
import reviewService from '../../services/reviewService';
import { formatDate } from '../../utils/formatDate';
import { useAuth } from '../../contexts/AuthContext';

// reviewStatus của BE: Pending | Approved | Rejected | Hidden.
const REVIEW_STATUS = {
  Pending: { label: 'Chờ duyệt', color: 'warning' },
  Approved: { label: 'Đã duyệt', color: 'success' },
  Rejected: { label: 'Từ chối', color: 'danger' },
  Hidden: { label: 'Đã ẩn', color: 'secondary' },
};

const ReviewList = () => {
  const { isAdmin } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Bộ lọc
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRating, setFilterRating] = useState('');

  // Phân trang (BE trả PagingResponse)
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, pageSize };
      if (filterStatus) params.status = filterStatus;
      if (filterRating) params.rating = filterRating;
      const res = await reviewService.getAll(params);
      const data = res.data;
      setReviews(data.items || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError('Không thể tải danh sách đánh giá.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterRating]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleApprove = async (id) => {
    try {
      await reviewService.updateStatus(id, 'Approved');
      fetchReviews();
    } catch (err) {
      alert('Duyệt đánh giá thất bại!');
      console.error(err);
    }
  };

  const handleHide = async (id) => {
    try {
      await reviewService.updateStatus(id, 'Hidden');
      fetchReviews();
    } catch (err) {
      alert('Ẩn đánh giá thất bại!');
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa đánh giá này?')) return;
    try {
      await reviewService.delete(id);
      fetchReviews();
    } catch (err) {
      alert('Xóa đánh giá thất bại!');
      console.error(err);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} style={{ color: i <= rating ? '#f39c12' : '#ddd', fontSize: '14px' }}>★</span>
      );
    }
    return stars;
  };

  const getStatusBadge = (status) => {
    const info = REVIEW_STATUS[status];
    if (info) return <span className={`badge badge-${info.color}`}>{info.label}</span>;
    return <span className="badge badge-secondary">{status}</span>;
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Quản lý Đánh giá</h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Danh sách đánh giá</h3>
            </div>
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-3">
                  <select
                    className="form-control form-control-sm"
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                  >
                    <option value="">-- Tất cả trạng thái --</option>
                    {Object.entries(REVIEW_STATUS).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <select
                    className="form-control form-control-sm"
                    value={filterRating}
                    onChange={(e) => { setFilterRating(e.target.value); setPage(1); }}
                  >
                    <option value="">-- Tất cả điểm --</option>
                    <option value="5">5 sao</option>
                    <option value="4">4 sao</option>
                    <option value="3">3 sao</option>
                    <option value="2">2 sao</option>
                    <option value="1">1 sao</option>
                  </select>
                </div>
              </div>

              {error && <div className="alert alert-danger">{error}</div>}

              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Đang tải...</span>
                  </div>
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="fas fa-star fa-2x mb-2"></i>
                  <p>Chưa có đánh giá nào.</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-bordered table-striped table-sm">
                      <thead>
                        <tr>
                          <th className="table-col-text">Sản phẩm</th>
                          <th className="table-col-text">Người đánh giá</th>
                          <th className="table-col-status">Điểm</th>
                          <th className="table-col-text">Tiêu đề</th>
                          <th className="table-col-status">Trạng thái</th>
                          <th className="table-col-date">Ngày tạo</th>
                          <th className="table-col-actions">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reviews.map((r) => (
                          <tr key={r.id}>
                            <td className="table-col-text">{r.productName || '-'}</td>
                            <td className="table-col-text">{r.userName || '-'}</td>
                            <td className="table-col-status">{renderStars(r.rating || 0)}</td>
                            <td className="table-col-text">{r.title || '-'}</td>
                            <td className="table-col-status">{getStatusBadge(r.reviewStatus)}</td>
                            <td className="table-col-date">{formatDate(r.createdDate)}</td>
                            <td className="table-col-actions">
                              {r.reviewStatus !== 'Approved' && (
                                <button className="btn btn-xs btn-success mr-1" onClick={() => handleApprove(r.id)} title="Duyệt">
                                  <i className="fas fa-check"></i>
                                </button>
                              )}
                              {r.reviewStatus !== 'Hidden' && (
                                <button className="btn btn-xs btn-warning mr-1" onClick={() => handleHide(r.id)} title="Ẩn">
                                  <i className="fas fa-eye-slash"></i>
                                </button>
                              )}
                              {isAdmin() && (
                                <button className="btn btn-xs btn-danger" onClick={() => handleDelete(r.id)} title="Xóa">
                                  <i className="fas fa-trash"></i>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <nav className="mt-3">
                      <ul className="pagination pagination-sm justify-content-center">
                        <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                          <button className="page-link" onClick={() => setPage((p) => p - 1)}>«</button>
                        </li>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                          <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                          </li>
                        ))}
                        <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                          <button className="page-link" onClick={() => setPage((p) => p + 1)}>»</button>
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
    </div>
  );
};

export default ReviewList;
