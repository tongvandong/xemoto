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

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await manufacturerService.getAll();
      const data = res.data;
      setItems(Array.isArray(data) ? data : data.items || data.data || []);
    } catch (err) {
      setError(getApiMessage(err, 'Không thể tải danh sách hãng sản xuất.'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const keyword = search.trim().toLowerCase();
  const filtered = keyword
    ? items.filter((item) => `${getName(item)} ${getDescription(item)}`.toLowerCase().includes(keyword))
    : items;

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
                <button className="btn btn-primary btn-sm" onClick={openAdd}>
                  <i className="fas fa-plus"></i> Thêm hãng sản xuất
                </button>
              </div>
            </div>
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-4">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Tìm theo tên, mô tả..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
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
              ) : filtered.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="fas fa-industry fa-2x mb-2"></i>
                  <p>Chưa có hãng sản xuất nào.</p>
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
                      {filtered.map((item) => (
                        <tr key={item.id}>
                          <td className="table-col-number">{item.id}</td>
                          <td className="table-col-media"><ManufacturerLogo item={item} /></td>
                          <td className="table-col-text font-weight-bold">{getName(item)}</td>
                          <td className="table-col-text">{getDescription(item) || '-'}</td>
                          <td className="table-col-status">
                            <span className={`badge badge-${item.status === 1 ? 'success' : 'secondary'}`}>
                              {item.status === 1 ? 'Đang hoạt động' : 'Ngừng'}
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
                      <option value={0}>Ngừng</option>
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
