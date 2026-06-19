import React, { useCallback, useEffect, useState } from 'react';
import manufacturerService from '../../services/manufacturerService';
import { useAuth } from '../../contexts/AuthContext';

const emptyForm = {
  ten: '',
  logoUrl: '',
  logoFile: null,
  moTa: '',
  status: 1,
};

const getApiMessage = (err, fallback) => err?.response?.data?.message || fallback;
const getName = (item) => item.ten || item.name || '';
const getDescription = (item) => item.moTa || item.description || '';
const SORT_FIELDS = {
  id: 'ID',
  name: 'Tên hãng',
  description: 'Mô tả',
  status: 'Trạng thái',
};

const MANUFACTURER_LIST_CONTROLS = {
  showSearch: true, // Đổi thành false để ẩn ô tìm kiếm hãng sản xuất phụ tùng.
  showDescriptionFilter: true, // Đổi thành false để ẩn bộ lọc mô tả.
  showStatusFilter: true, // Đổi thành false để ẩn bộ lọc trạng thái.
  showLogoFilter: true, // Đổi thành false để ẩn bộ lọc logo.
  showSort: true, // Đổi thành false để ẩn phần sắp xếp.
  showReload: true, // Đổi thành false để ẩn nút tải lại.
};

const normalizeLogoUrl = (logoUrl = '') => (logoUrl.includes('logo.clearbit.com') ? '' : logoUrl);
const getLogo = (item) => {
  const logoUrl = item.logoUrl || item.logo || '';
  return normalizeLogoUrl(logoUrl);
};

const ManufacturerLogo = ({ item, large = false }) => {
  const logoUrl = typeof item === 'string' ? normalizeLogoUrl(item) : getLogo(item);
  const size = large ? 96 : 52;

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt="Logo hãng sản xuất"
        className="rounded border bg-white"
        style={{ width: size, height: size, objectFit: 'contain', padding: 4 }}
      />
    );
  }

  return (
    <div
      className="rounded border bg-light text-muted d-flex align-items-center justify-content-center"
      style={{ width: size, height: size }}
      title="Chưa có logo"
    >
      <i className="fas fa-industry"></i>
    </div>
  );
};

const ManufacturerList = () => {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [logoFilter, setLogoFilter] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [sortDescending, setSortDescending] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await manufacturerService.getAll({
        page,
        pageSize,
        keyword: search || undefined,
        description: descriptionFilter || undefined,
        status: statusFilter !== '' ? Number(statusFilter) : undefined,
        hasLogo: logoFilter !== '' ? logoFilter === 'has' : undefined,
        sortBy,
        sortDescending,
      });
      const data = res.data;
      if (Array.isArray(data)) {
        setItems(data);
        setTotalPages(1);
      } else {
        setItems(data.items || data.data || []);
        setTotalPages(data.totalPages || Math.ceil((data.totalItems || 0) / pageSize) || 1);
      }
    } catch (err) {
      setError(getApiMessage(err, 'Không thể tải danh sách hãng sản xuất.'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, descriptionFilter, statusFilter, logoFilter, sortBy, sortDescending]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      ten: getName(item),
      logoUrl: getLogo(item),
      logoFile: null,
      moTa: getDescription(item),
      status: item.status ?? 1,
    });
    setFormError('');
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === 'status' ? Number(value) : value }));
  };

  const handleLogoFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((prev) => ({
      ...prev,
      logoFile: file,
      logoUrl: URL.createObjectURL(file),
    }));
  };

  const clearLogo = () => {
    setForm((prev) => ({ ...prev, logoFile: null, logoUrl: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.ten.trim()) {
      setFormError('Tên hãng sản xuất là bắt buộc.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const payload = {
        ten: form.ten,
        logoUrl: form.logoFile ? getLogo(editItem || {}) : form.logoUrl,
        moTa: form.moTa,
        status: form.status,
      };

      const logoFile = form.logoFile;
      let manufacturerId = editItem?.id;
      if (editItem) {
        const res = await manufacturerService.update(editItem.id, payload);
        manufacturerId = res.data?.id || editItem.id;
      } else {
        const res = await manufacturerService.create(payload);
        manufacturerId = res.data?.id;
      }

      if (logoFile && manufacturerId) {
        const formData = new FormData();
        formData.append('file', logoFile);
        await manufacturerService.uploadLogo(manufacturerId, formData);
      }

      setShowForm(false);
      await fetchData();
    } catch (err) {
      setFormError(getApiMessage(err, 'Lưu hãng sản xuất thất bại.'));
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Bạn có chắc muốn xóa hãng "${getName(item)}"?`)) return;
    try {
      await manufacturerService.delete(item.id);
      fetchData();
    } catch (err) {
      alert(getApiMessage(err, 'Xóa hãng sản xuất thất bại.'));
      console.error(err);
    }
  };

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Hãng sản xuất phụ tùng</h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Danh sách hãng sản xuất</h3>
              <div className="card-tools">
                {MANUFACTURER_LIST_CONTROLS.showReload && (
                  <button type="button" className="btn btn-outline-secondary btn-sm mr-2" onClick={fetchData}>
                    <i className="fas fa-sync-alt"></i> Tải lại
                  </button>
                )}
                <button className="btn btn-primary btn-sm" onClick={openAdd}>
                  <i className="fas fa-plus"></i> Thêm hãng sản xuất
                </button>
              </div>
            </div>
            <div className="card-body">
              <div className="row mb-3">
                {MANUFACTURER_LIST_CONTROLS.showSearch && (
                  <div className="col-md-3 mb-2">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Tìm theo tên, mô tả..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                  </div>
                )}
                {MANUFACTURER_LIST_CONTROLS.showDescriptionFilter && (
                  <div className="col-md-3 mb-2">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Lọc mô tả"
                      value={descriptionFilter}
                      onChange={(e) => { setDescriptionFilter(e.target.value); setPage(1); }}
                    />
                  </div>
                )}
                {MANUFACTURER_LIST_CONTROLS.showStatusFilter && (
                  <div className="col-md-2 mb-2">
                    <select className="form-control form-control-sm" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                      <option value="">-- Trạng thái --</option>
                      <option value="1">Đang hoạt động</option>
                      <option value="0">Đã xoá (ẩn)</option>
                    </select>
                  </div>
                )}
                {MANUFACTURER_LIST_CONTROLS.showLogoFilter && (
                  <div className="col-md-2 mb-2">
                    <select className="form-control form-control-sm" value={logoFilter} onChange={(e) => { setLogoFilter(e.target.value); setPage(1); }}>
                      <option value="">-- Logo --</option>
                      <option value="has">Có logo</option>
                      <option value="none">Không có logo</option>
                    </select>
                  </div>
                )}
              </div>

              {MANUFACTURER_LIST_CONTROLS.showSort && (
                <div className="row mb-3">
                  <div className="col-md-3 mb-2">
                    <select className="form-control form-control-sm" value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}>
                      {Object.entries(SORT_FIELDS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3 mb-2">
                    <select className="form-control form-control-sm" value={sortDescending ? 'desc' : 'asc'} onChange={(e) => { setSortDescending(e.target.value === 'desc'); setPage(1); }}>
                      <option value="desc">Giảm dần</option>
                      <option value="asc">Tăng dần</option>
                    </select>
                  </div>
                </div>
              )}

              {error && <div className="alert alert-danger">{error}</div>}

              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Đang tải...</span>
                  </div>
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="fas fa-industry fa-2x mb-2"></i>
                  <p>Không có kết quả phù hợp.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered table-striped table-sm">
                    <thead>
                      <tr>
                        <th className="table-col-number">#</th>
                        <th className="table-col-media">Logo</th>
                        <th className="table-col-text">Tên hãng</th>
                        <th className="table-col-text">Mô tả</th>
                        <th className="table-col-status">Trạng thái</th>
                        <th className="table-col-actions">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td className="table-col-number">{item.id}</td>
                          <td className="table-col-media"><ManufacturerLogo item={item} /></td>
                          <td className="table-col-text font-weight-bold">{getName(item)}</td>
                          <td className="table-col-text">{getDescription(item) || '-'}</td>
                          <td className="table-col-status">
                            <span className={`badge badge-${item.status === 1 ? 'success' : 'secondary'}`}>
                              {item.status === 1 ? 'Đang hoạt động' : 'Đã xoá (ẩn)'}
                            </span>
                          </td>
                          <td className="table-col-actions">
                            <button type="button" className="btn btn-xs btn-info mr-1" title="Sửa" onClick={() => openEdit(item)}>
                              <i className="fas fa-edit"></i>
                            </button>
                            {isAdmin() && (
                              <button type="button" className="btn btn-xs btn-danger" title="Xóa" onClick={() => handleDelete(item)}>
                                <i className="fas fa-trash"></i>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {totalPages > 1 && (
                    <nav className="mt-3">
                      <ul className="pagination pagination-sm justify-content-center">
                        <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                          <button type="button" className="page-link" onClick={() => setPage((current) => current - 1)}>«</button>
                        </li>
                        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                          <li key={pageNumber} className={`page-item ${pageNumber === page ? 'active' : ''}`}>
                            <button type="button" className="page-link" onClick={() => setPage(pageNumber)}>{pageNumber}</button>
                          </li>
                        ))}
                        <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                          <button type="button" className="page-link" onClick={() => setPage((current) => current + 1)}>»</button>
                        </li>
                      </ul>
                    </nav>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {showForm && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editItem ? 'Sửa hãng sản xuất' : 'Thêm hãng sản xuất'}</h5>
                <button type="button" className="close" onClick={() => setShowForm(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {formError && <div className="alert alert-danger">{formError}</div>}
                  <div className="form-group">
                    <label>Tên hãng <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" name="ten" value={form.ten} onChange={handleChange} placeholder="VD: NGK, Denso, Bosch..." />
                  </div>
                  <div className="form-group">
                    <label>Logo hãng</label>
                    <div className="d-flex align-items-center mb-2">
                      <ManufacturerLogo item={form.logoUrl} large />
                      <div className="ml-3">
                        <div className="custom-file mb-2">
                          <input type="file" className="custom-file-input" id="manufacturerLogo" accept="image/*" onChange={handleLogoFile} />
                          <label className="custom-file-label" htmlFor="manufacturerLogo">
                            {form.logoFile ? form.logoFile.name : 'Chọn file logo...'}
                          </label>
                        </div>
                        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={clearLogo} disabled={!form.logoUrl && !form.logoFile}>
                          Bỏ logo
                        </button>
                      </div>
                    </div>
                    <small className="form-text text-muted">Logo không bắt buộc. Nên dùng ảnh vuông hoặc nền trong suốt.</small>
                  </div>
                  <div className="form-group">
                    <label>Mô tả</label>
                    <textarea className="form-control" name="moTa" rows="3" value={form.moTa} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Trạng thái</label>
                    <select className="form-control" name="status" value={form.status} onChange={handleChange}>
                      <option value={1}>Đang hoạt động</option>
                      <option value={0}>Đã xoá (ẩn)</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm mr-1"></span>Đang lưu...</> : (editItem ? 'Cập nhật' : 'Thêm mới')}
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

export default ManufacturerList;
