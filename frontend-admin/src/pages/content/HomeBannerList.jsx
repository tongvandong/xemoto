import React, { useState, useEffect, useCallback } from 'react';
import bannerService from '../../services/bannerService';
import { useAuth } from '../../contexts/AuthContext';

const POSITIONS = [
  { value: 'Slider', label: 'Slider chính (đầu trang)' },
  { value: 'BannerLeft', label: 'Banner trái (ưu đãi)' },
  { value: 'BannerRight', label: 'Banner phải (ưu đãi)' },
  { value: 'ProductBanner', label: 'Banner cột sản phẩm nổi bật' },
];

const positionLabel = (value) => POSITIONS.find((p) => p.value === value)?.label || value;

const emptyForm = { viTri: 'Slider', tieuDe: '', urlAnh: '', lienKet: '', thuTu: 0, dangHoatDong: true };

const HomeBannerList = () => {
  const { isAdmin } = useAuth();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await bannerService.getAll();
      const data = res.data;
      setBanners(Array.isArray(data) ? data : data.items || data.data || []);
    } catch (err) {
      setError('Không thể tải danh sách banner.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      viTri: item.viTri || 'Slider',
      tieuDe: item.tieuDe || '',
      urlAnh: item.urlAnh || '',
      lienKet: item.lienKet || '',
      thuTu: item.thuTu || 0,
      dangHoatDong: item.dangHoatDong ?? true,
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await bannerService.uploadImage(formData);
      const url = res.data?.urlAnh;
      if (url) {
        setForm((prev) => ({ ...prev, urlAnh: url }));
      }
    } catch (err) {
      alert('Tải ảnh thất bại!');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.urlAnh.trim()) {
      alert('Vui lòng tải lên hoặc nhập URL ảnh banner!');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        viTri: form.viTri,
        tieuDe: form.tieuDe || null,
        urlAnh: form.urlAnh.trim(),
        lienKet: form.lienKet || null,
        thuTu: Number(form.thuTu) || 0,
        dangHoatDong: !!form.dangHoatDong,
      };

      if (editItem) {
        await bannerService.update(editItem.maBanner, payload);
      } else {
        await bannerService.create(payload);
      }

      setShowModal(false);
      fetchBanners();
    } catch (err) {
      alert('Lưu banner thất bại!');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Bạn có chắc muốn xóa banner "${title || id}"?`)) return;
    try {
      await bannerService.delete(id);
      fetchBanners();
    } catch (err) {
      alert('Xóa banner thất bại!');
      console.error(err);
    }
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Banner trang chủ</h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Danh sách banner trang chủ</h3>
              <div className="card-tools">
                <button className="btn btn-primary btn-sm" onClick={openAdd}>
                  <i className="fas fa-plus"></i> Thêm banner
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
              ) : banners.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="fas fa-image fa-2x mb-2"></i>
                  <p>Chưa có banner nào.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered table-striped table-sm">
                    <thead>
                      <tr>
                        <th style={{ width: 140 }}>Ảnh</th>
                        <th className="table-col-text">Vị trí</th>
                        <th className="table-col-text">Tiêu đề</th>
                        <th className="table-col-text">Liên kết</th>
                        <th className="table-col-number">Thứ tự</th>
                        <th className="table-col-status">Trạng thái</th>
                        <th className="table-col-actions">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {banners.map((b) => (
                        <tr key={b.maBanner}>
                          <td>
                            {b.urlAnh && (
                              <img src={b.urlAnh} alt={b.tieuDe || 'banner'} style={{ maxHeight: 50, maxWidth: 120, objectFit: 'cover' }} className="rounded border" />
                            )}
                          </td>
                          <td className="table-col-text">{positionLabel(b.viTri)}</td>
                          <td className="table-col-text">{b.tieuDe || '-'}</td>
                          <td className="table-col-text">{b.lienKet || '-'}</td>
                          <td className="table-col-number">{b.thuTu || 0}</td>
                          <td className="table-col-status">
                            <span className={`badge badge-${b.dangHoatDong ? 'success' : 'secondary'}`}>
                              {b.dangHoatDong ? 'Hiển thị' : 'Ẩn'}
                            </span>
                          </td>
                          <td className="table-col-actions">
                            <button className="btn btn-xs btn-info mr-1" onClick={() => openEdit(b)} title="Sửa">
                              <i className="fas fa-edit"></i>
                            </button>
                            {isAdmin() && (
                              <button className="btn btn-xs btn-danger" onClick={() => handleDelete(b.maBanner, b.tieuDe)} title="Xóa">
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

      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog" style={{ maxHeight: '90vh' }}>
            <div className="modal-content" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-header">
                <h5 className="modal-title">{editItem ? 'Sửa banner' : 'Thêm banner mới'}</h5>
                <button type="button" className="close" onClick={() => setShowModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Vị trí <span className="text-danger">*</span></label>
                        <select className="form-control" name="viTri" value={form.viTri} onChange={handleChange}>
                          {POSITIONS.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Tiêu đề (alt)</label>
                        <input type="text" className="form-control" name="tieuDe" value={form.tieuDe} onChange={handleChange} />
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Ảnh banner <span className="text-danger">*</span></label>
                    <div className="custom-file">
                      <input type="file" className="custom-file-input" id="bannerImageFile" accept="image/*" onChange={handleFileSelect} />
                      <label className="custom-file-label" htmlFor="bannerImageFile">
                        {uploading ? 'Đang tải ảnh...' : 'Chọn ảnh từ máy tính...'}
                      </label>
                    </div>
                    <input type="text" className="form-control mt-2" name="urlAnh" value={form.urlAnh} onChange={handleChange} placeholder="Hoặc dán URL ảnh" />
                    {form.urlAnh && (
                      <img src={form.urlAnh} alt="Preview" className="mt-2 rounded border" style={{ maxHeight: 120, maxWidth: 240, objectFit: 'cover' }} />
                    )}
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Liên kết (khi bấm vào)</label>
                        <input type="text" className="form-control" name="lienKet" value={form.lienKet} onChange={handleChange} placeholder="VD: /products" />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="form-group">
                        <label>Thứ tự</label>
                        <input type="number" className="form-control" name="thuTu" value={form.thuTu} onChange={handleChange} min="0" />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="form-group">
                        <div className="custom-control custom-switch mt-4">
                          <input
                            type="checkbox"
                            className="custom-control-input"
                            id="bannerDangHoatDong"
                            checked={form.dangHoatDong}
                            onChange={(e) => setForm((prev) => ({ ...prev, dangHoatDong: e.target.checked }))}
                          />
                          <label className="custom-control-label" htmlFor="bannerDangHoatDong">
                            {form.dangHoatDong ? 'Hiển thị' : 'Ẩn'}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
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

export default HomeBannerList;
