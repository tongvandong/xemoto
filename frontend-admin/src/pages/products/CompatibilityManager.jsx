import React, { useEffect, useMemo, useState } from 'react';
import productService from '../../services/productService';
import brandService from '../../services/brandService';
import { useAuth } from '../../contexts/AuthContext';

const emptyForm = {
  scopeMode: 'brand',
  maHangXe: '',
  maDongXe: '',
  namTu: '',
  namDen: '',
  ghiChu: '',
  dangHoatDong: true,
};

const scopeOptions = [
  { value: 'all', label: 'Tất cả xe' },
  { value: 'brand', label: 'Một hãng xe' },
  { value: 'model', label: 'Một dòng xe' },
];

const CompatibilityManager = ({ product, onClose }) => {
  const { isAdmin } = useAuth();
  const productId = product?.maSanPham || product?.id;
  const productName = product?.tenSanPham || product?.name || 'Phụ tùng';
  const [items, setItems] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedModels = useMemo(() => {
    if (!form.maHangXe) return [];
    return models.filter((model) => String(model.maHangXe || model.brandId) === String(form.maHangXe));
  }, [models, form.maHangXe]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [compatRes, brandRes, modelRes] = await Promise.all([
        productService.getCompatibilities(productId),
        brandService.getAll(),
        brandService.getAllModels({ page: 1, pageSize: 500 }),
      ]);

      setItems(Array.isArray(compatRes.data) ? compatRes.data : compatRes.data?.items || compatRes.data?.data || []);

      const brandData = brandRes.data;
      setBrands(Array.isArray(brandData) ? brandData : brandData.items || brandData.data || []);

      const modelData = modelRes.data;
      setModels(Array.isArray(modelData) ? modelData : modelData.items || modelData.data || []);
    } catch (err) {
      setError('Không thể tải danh sách tương thích xe.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) loadData();
  }, [productId]);

  const resetForm = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const setScopeMode = (scopeMode) => {
    setForm((prev) => ({
      ...prev,
      scopeMode,
      maHangXe: scopeMode === 'all' ? '' : prev.maHangXe,
      maDongXe: scopeMode === 'model' ? prev.maDongXe : '',
    }));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'maHangXe') {
        next.maDongXe = '';
      }
      return next;
    });
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      scopeMode: item.apDungTatCaXe ? 'all' : (item.maDongXe ? 'model' : 'brand'),
      maHangXe: item.maHangXe ? String(item.maHangXe) : '',
      maDongXe: item.maDongXe ? String(item.maDongXe) : '',
      namTu: item.namTu ? String(item.namTu) : '',
      namDen: item.namDen ? String(item.namDen) : '',
      ghiChu: item.ghiChu || '',
      dangHoatDong: item.dangHoatDong !== false,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.scopeMode === 'brand' && !form.maHangXe) {
      alert('Vui lòng chọn hãng xe.');
      return;
    }

    if (form.scopeMode === 'model' && (!form.maHangXe || !form.maDongXe)) {
      alert('Vui lòng chọn hãng xe và dòng xe.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        maPhuTung: productId,
        maHangXe: form.scopeMode === 'all' || !form.maHangXe ? null : Number(form.maHangXe),
        maDongXe: form.scopeMode !== 'model' || !form.maDongXe ? null : Number(form.maDongXe),
        namTu: form.namTu ? Number(form.namTu) : null,
        namDen: form.namDen ? Number(form.namDen) : null,
        apDungTatCaXe: form.scopeMode === 'all',
        ghiChu: form.ghiChu || null,
        dangHoatDong: form.dangHoatDong,
      };

      if (editing) {
        await productService.updateCompatibility(productId, editing.maTuongThich, payload);
      } else {
        await productService.createCompatibility(productId, payload);
      }

      resetForm();
      await loadData();
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.title || err.message || 'Lưu tương thích xe thất bại!';
      alert(message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Xóa cấu hình tương thích này?')) return;
    try {
      await productService.deleteCompatibility(productId, item.maTuongThich);
      await loadData();
    } catch (err) {
      alert('Xóa tương thích xe thất bại!');
      console.error(err);
    }
  };

  const renderScope = (item) => {
    if (item.apDungTatCaXe) return 'Tất cả xe';
    if (item.tenDongXe) return `${item.tenHang || ''} ${item.tenDongXe}`.trim();
    return item.tenHang || 'Một hãng xe';
  };

  const renderYearRange = (item) => {
    if (item.namTu && item.namDen) return `${item.namTu} - ${item.namDen}`;
    if (item.namTu) return `Từ ${item.namTu}`;
    if (item.namDen) return `Đến ${item.namDen}`;
    return '-';
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Tương thích xe - {productName}</h5>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>

          <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
            {error && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={handleSubmit} className="border rounded p-3 mb-3 bg-light">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">{editing ? 'Sửa tương thích' : 'Thêm tương thích'}</h6>
                {editing && (
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={resetForm}>
                    Hủy sửa
                  </button>
                )}
              </div>

              <div className="form-group">
                <label>Phụ tùng này dùng được cho</label>
                <div className="btn-group btn-group-toggle d-flex" role="group">
                  {scopeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`btn ${form.scopeMode === option.value ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setScopeMode(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.scopeMode !== 'all' && (
                <div className="row">
                  <div className={form.scopeMode === 'model' ? 'col-md-6' : 'col-md-12'}>
                    <div className="form-group">
                      <label>Hãng xe</label>
                      <select className="form-control" name="maHangXe" value={form.maHangXe} onChange={handleChange}>
                        <option value="">-- Chọn hãng xe --</option>
                        {brands.map((brand) => (
                          <option key={brand.maHangXe || brand.id} value={brand.maHangXe || brand.id}>
                            {brand.tenHang || brand.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {form.scopeMode === 'model' && (
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Dòng xe</label>
                        <select className="form-control" name="maDongXe" value={form.maDongXe} onChange={handleChange} disabled={!form.maHangXe}>
                          <option value="">-- Chọn dòng xe --</option>
                          {selectedModels.map((model) => (
                            <option key={model.maDongXe || model.id} value={model.maDongXe || model.id}>
                              {model.tenDongXe || model.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="row">
                <div className="col-md-2">
                  <div className="form-group">
                    <label>Từ năm</label>
                    <input type="number" className="form-control" name="namTu" value={form.namTu} onChange={handleChange} min="1950" max="2100" placeholder="VD: 2020" />
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="form-group">
                    <label>Đến năm</label>
                    <input type="number" className="form-control" name="namDen" value={form.namDen} onChange={handleChange} min="1950" max="2100" placeholder="VD: 2026" />
                  </div>
                </div>
                <div className="col-md-5">
                  <div className="form-group">
                    <label>Ghi chú</label>
                    <input type="text" className="form-control" name="ghiChu" value={form.ghiChu} onChange={handleChange} placeholder="VD: lốp trước, bản ABS..." />
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label>Trạng thái</label>
                    <select className="form-control" value={form.dangHoatDong ? 'true' : 'false'} onChange={(event) => setForm((prev) => ({ ...prev, dangHoatDong: event.target.value === 'true' }))}>
                      <option value="true">Đang áp dụng</option>
                      <option value="false">Tạm ẩn</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Đang lưu...' : (editing ? 'Cập nhật tương thích' : 'Thêm tương thích')}
                </button>
              </div>
            </form>

            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="sr-only">Đang tải...</span>
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center text-muted py-4">Chưa có cấu hình tương thích xe.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered table-striped table-sm">
                  <thead>
                    <tr>
                      <th className="table-col-text">Dùng được cho</th>
                      <th className="table-col-number">Đời xe</th>
                      <th className="table-col-text">Ghi chú</th>
                      <th className="table-col-status">Trạng thái</th>
                      <th className="table-col-actions">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.maTuongThich}>
                        <td className="table-col-text">{renderScope(item)}</td>
                        <td className="table-col-number">{renderYearRange(item)}</td>
                        <td className="table-col-text">{item.ghiChu || '-'}</td>
                        <td className="table-col-status">
                          <span className={`badge badge-${item.dangHoatDong ? 'success' : 'secondary'}`}>
                            {item.dangHoatDong ? 'Đang áp dụng' : 'Tạm ẩn'}
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

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Đóng</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompatibilityManager;
