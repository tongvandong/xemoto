import React, { useState, useEffect, useCallback } from 'react';
import faqService from '../../services/faqService';
import { useAuth } from '../../contexts/AuthContext';

const FaqList = () => {
  const { isAdmin } = useAuth();
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  const [form, setForm] = useState({
    cauHoi: '',
    cauTraLoi: '',
    danhMuc: '',
    thuTu: 0,
    dangHoatDong: true,
  });

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await faqService.getAll({ page, pageSize });
      const data = res.data;
      if (Array.isArray(data)) {
        setFaqs(data);
        setTotalPages(1);
      } else {
        setFaqs(data.items || data.data || []);
        setTotalPages(data.totalPages || Math.ceil((data.total || 0) / pageSize) || 1);
      }
    } catch (err) {
      setError('Không thể tải danh sách FAQ.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const openAdd = () => {
    setEditItem(null);
    setForm({ cauHoi: '', cauTraLoi: '', danhMuc: '', thuTu: 0, dangHoatDong: true });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    const isActive = item.dangHoatDong ?? ((item.trangThai || item.status || 'active') === 'active');
    setForm({
      cauHoi: item.cauHoi || item.question || '',
      cauTraLoi: item.cauTraLoi || item.answer || '',
      danhMuc: item.danhMuc || item.category || '',
      thuTu: item.thuTu || item.sortOrder || 0,
      dangHoatDong: !!isActive,
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.cauHoi.trim()) {
      alert('Câu hỏi là bắt buộc!');
      return;
    }
    if (!form.cauTraLoi.trim()) {
      alert('Câu trả lời là bắt buộc!');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        cauHoi: form.cauHoi,
        cauTraLoi: form.cauTraLoi,
        danhMuc: form.danhMuc,
        thuTu: Number(form.thuTu) || 0,
        dangHoatDong: !!form.dangHoatDong,
      };

      if (editItem) {
        await faqService.update(editItem.id, payload);
      } else {
        await faqService.create(payload);
      }

      setShowModal(false);
      fetchFaqs();
    } catch (err) {
      alert('Lưu FAQ thất bại!');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, question) => {
    if (!window.confirm(`Bạn có chắc muốn xóa FAQ "${question}"?`)) return;
    try {
      await faqService.delete(id);
      fetchFaqs();
    } catch (err) {
      alert('Xóa FAQ thất bại!');
      console.error(err);
    }
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Quản lý FAQ</h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Danh sách câu hỏi thường gặp</h3>
              <div className="card-tools">
                <button className="btn btn-primary btn-sm" onClick={openAdd}>
                  <i className="fas fa-plus"></i> Thêm FAQ
                </button>
              </div>
            </div>
            <div className="card-body">
              {error && <div className="alert alert-danger">{error}</div>}

              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Đang tải...</span>
                  </div>
                </div>
              ) : faqs.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="fas fa-question-circle fa-2x mb-2"></i>
                  <p>Chưa có FAQ nào.</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-bordered table-striped table-sm">
                      <thead>
                        <tr>
                          <th className="table-col-text">Câu hỏi</th>
                          <th className="table-col-text">Danh mục</th>
                          <th className="table-col-number">Thứ tự</th>
                          <th className="table-col-status">Trạng thái</th>
                          <th className="table-col-actions">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {faqs.map((f) => (
                          <tr key={f.id}>
                            <td className="table-col-text">{f.cauHoi || f.question}</td>
                            <td className="table-col-text">{f.danhMuc || f.category || '-'}</td>
                            <td className="table-col-number">{f.thuTu || f.sortOrder || 0}</td>
                            <td className="table-col-status">
                              <span className={`badge badge-${f.dangHoatDong ? 'success' : 'secondary'}`}>
                                {f.dangHoatDong ? 'Hoạt động' : 'Ẩn'}
                              </span>
                            </td>
                            <td className="table-col-actions">
                              <button className="btn btn-xs btn-info mr-1" onClick={() => openEdit(f)} title="Sửa">
                                <i className="fas fa-edit"></i>
                              </button>
                              {isAdmin() && (
                                <button className="btn btn-xs btn-danger" onClick={() => handleDelete(f.id, f.cauHoi || f.question)} title="Xóa">
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

      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog" style={{ maxHeight: '90vh' }}>
            <div className="modal-content" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-header">
                <h5 className="modal-title">{editItem ? 'Sửa FAQ' : 'Thêm FAQ mới'}</h5>
                <button type="button" className="close" onClick={() => setShowModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
                  <div className="form-group">
                    <label>Câu hỏi <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" name="cauHoi" value={form.cauHoi} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Câu trả lời <span className="text-danger">*</span></label>
                    <textarea className="form-control" name="cauTraLoi" value={form.cauTraLoi} onChange={handleChange} rows="5" />
                  </div>
                  <div className="row">
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Danh mục</label>
                        <input type="text" className="form-control" name="danhMuc" value={form.danhMuc} onChange={handleChange} />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Thứ tự hiển thị</label>
                        <input type="number" className="form-control" name="thuTu" value={form.thuTu} onChange={handleChange} min="0" />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <div className="custom-control custom-switch mt-4">
                          <input
                            type="checkbox"
                            className="custom-control-input"
                            id="faqDangHoatDong"
                            checked={form.dangHoatDong}
                            onChange={(e) => setForm((prev) => ({ ...prev, dangHoatDong: e.target.checked }))}
                          />
                          <label className="custom-control-label" htmlFor="faqDangHoatDong">
                            {form.dangHoatDong ? 'Hoạt động' : 'Ẩn'}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Đang lưu...' : (editItem ? 'Cập nhật' : 'Thêm mới')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FaqList;
