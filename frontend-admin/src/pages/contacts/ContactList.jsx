import React, { useState, useEffect, useCallback } from 'react';
import contactService from '../../services/contactService';
import { formatDate } from '../../utils/formatDate';

// contactStatus của BE: 'New' (chờ xử lý) | 'Processed' (đã xử lý).
const CONTACT_STATUS = {
  New: { label: 'Chờ xử lý', color: 'warning' },
  Processed: { label: 'Đã xử lý', color: 'success' },
};

const ContactList = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Bộ lọc
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  // Phân trang (BE trả PagingResponse)
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  // Modal chi tiết
  const [showDetail, setShowDetail] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, pageSize };
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.type = filterType;
      const res = await contactService.getAll(params);
      const data = res.data;
      setContacts(data.items || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError('Không thể tải danh sách liên hệ.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterType]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleViewDetail = async (item) => {
    setDetailItem(item);
    setShowDetail(true);

    try {
      const response = await contactService.getById(item.id);
      setDetailItem(response.data);
    } catch {
      // Giữ dữ liệu dòng nếu endpoint chi tiết lỗi.
    }
  };

  const handleMarkProcessed = async (id) => {
    try {
      await contactService.markProcessed(id);
      fetchContacts();
      if (detailItem && detailItem.id === id) {
        setDetailItem((prev) => ({ ...prev, contactStatus: 'Processed' }));
      }
    } catch (err) {
      alert('Đánh dấu đã xử lý thất bại!');
      console.error(err);
    }
  };

  const getStatusBadge = (status) => {
    const info = CONTACT_STATUS[status];
    if (info) return <span className={`badge badge-${info.color}`}>{info.label}</span>;
    return <span className="badge badge-secondary">{status}</span>;
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Quản lý Liên hệ</h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Danh sách yêu cầu liên hệ</h3>
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
                    {Object.entries(CONTACT_STATUS).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Lọc theo loại yêu cầu..."
                    value={filterType}
                    onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                  />
                </div>
              </div>

              {error && <div className="alert alert-danger">{error}</div>}

              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Đang tải...</span>
                  </div>
                </div>
              ) : contacts.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="fas fa-envelope fa-2x mb-2"></i>
                  <p>Chưa có yêu cầu liên hệ nào.</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-bordered table-striped table-sm">
                      <thead>
                        <tr>
                          <th className="table-col-text">Họ tên</th>
                          <th className="table-col-code">SĐT</th>
                          <th className="table-col-text">Email</th>
                          <th className="table-col-status">Loại yêu cầu</th>
                          <th className="table-col-status">Trạng thái</th>
                          <th className="table-col-date">Ngày tạo</th>
                          <th className="table-col-actions">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contacts.map((c) => (
                          <tr key={c.id}>
                            <td className="table-col-text">{c.fullName || '-'}</td>
                            <td className="table-col-code">{c.phone || '-'}</td>
                            <td className="table-col-text">{c.email || '-'}</td>
                            <td className="table-col-status">{c.type || '-'}</td>
                            <td className="table-col-status">{getStatusBadge(c.contactStatus)}</td>
                            <td className="table-col-date">{formatDate(c.createdDate)}</td>
                            <td className="table-col-actions">
                              <button className="btn btn-xs btn-info mr-1" onClick={() => handleViewDetail(c)} title="Xem chi tiết">
                                <i className="fas fa-eye"></i>
                              </button>
                              {c.contactStatus !== 'Processed' && (
                                <button className="btn btn-xs btn-success" onClick={() => handleMarkProcessed(c.id)} title="Đánh dấu đã xử lý">
                                  <i className="fas fa-check"></i>
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

      {showDetail && detailItem && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog" style={{ maxHeight: '90vh' }}>
            <div className="modal-content" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-header">
                <h5 className="modal-title">Chi tiết yêu cầu liên hệ</h5>
                <button type="button" className="close" onClick={() => setShowDetail(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
                <table className="table table-sm table-borderless">
                  <tbody>
                    <tr>
                      <th style={{ width: '130px' }}>Họ tên:</th>
                      <td>{detailItem.fullName || '-'}</td>
                    </tr>
                    <tr>
                      <th>Email:</th>
                      <td>{detailItem.email || '-'}</td>
                    </tr>
                    <tr>
                      <th>SĐT:</th>
                      <td>{detailItem.phone || '-'}</td>
                    </tr>
                    <tr>
                      <th>Loại yêu cầu:</th>
                      <td>{detailItem.type || '-'}</td>
                    </tr>
                    <tr>
                      <th>Trạng thái:</th>
                      <td>{getStatusBadge(detailItem.contactStatus)}</td>
                    </tr>
                    <tr>
                      <th>Ngày tạo:</th>
                      <td>{formatDate(detailItem.createdDate)}</td>
                    </tr>
                    <tr>
                      <th>Nội dung:</th>
                      <td style={{ whiteSpace: 'pre-wrap' }}>{detailItem.body || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="modal-footer">
                {detailItem.contactStatus !== 'Processed' && (
                  <button className="btn btn-success" onClick={() => handleMarkProcessed(detailItem.id)}>
                    <i className="fas fa-check mr-1"></i> Đánh dấu đã xử lý
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={() => setShowDetail(false)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactList;
