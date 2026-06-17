import React, { useState, useEffect } from 'react';
import productService from '../../services/productService';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatMoneyInput, normalizeMoneyInput } from '../../utils/moneyInput';

const buildSkuDisplayName = (version, color) =>
  [String(version || '').trim(), String(color || '').trim()].filter(Boolean).join(' - ');

const inferVersion = (variant) => {
  const explicitVersion = variant.phienBan || variant.version;
  if (explicitVersion) return explicitVersion;

  const name = variant.tenBienThe || variant.variantName || variant.name || '';
  const color = variant.mauSac || variant.color || '';
  const colorSuffix = color ? ` - ${color}` : '';
  if (colorSuffix && name.endsWith(colorSuffix)) {
    return name.slice(0, -colorSuffix.length).trim();
  }
  return name;
};

const shouldSyncDisplayName = (form) => {
  const current = String(form.tenBienThe || '').trim();
  const derived = buildSkuDisplayName(form.phienBan, form.mauSac);
  const version = String(form.phienBan || '').trim();
  const color = String(form.mauSac || '').trim();
  return !current || current === derived || current === version || current === color;
};

const SHOW_SKU_BARCODE_FIELD = false; // Doi thanh true de bat lai o quan ly ma vach trong form SKU.

const VARIANT_LABELS = {
  XeMay: {
    modalTitle: 'Quản lý SKU / biến thể xe máy',
    addLabel: 'Thêm SKU / biến thể',
    emptyText: 'Chưa có biến thể nào.',
    formTitleAdd: 'Thêm SKU / biến thể mới',
    formTitleEdit: 'Sửa SKU / biến thể',
    helpText: 'Phiên bản là Tiêu chuẩn/Cao cấp/S/ABS. Màu sắc là thuộc tính đi kèm. Tên SKU hiển thị có thể để trống để hệ thống tự tạo.',
    displayNameLabel: 'Tên SKU hiển thị',
    displayNamePlaceholder: 'Tự sinh từ phiên bản và màu',
    versionLabel: 'Phiên bản',
    optionLabel: 'Màu sắc',
    requiredMessage: 'Phiên bản là bắt buộc. Ví dụ: Tiêu chuẩn, Cao cấp, S, ABS.',
    saveError: 'Lưu biến thể thất bại!',
    deleteError: 'Xóa biến thể thất bại!',
    deleteConfirmPrefix: 'Xóa biến thể',
  },
  PhuTung: {
    modalTitle: 'Quản lý SKU / quy cách phụ tùng',
    addLabel: 'Thêm SKU / quy cách',
    emptyText: 'Chưa có quy cách nào.',
    formTitleAdd: 'Thêm SKU / quy cách mới',
    formTitleEdit: 'Sửa SKU / quy cách',
    helpText: 'Quy cách là thông số bán hàng của phụ tùng như 1L, 90-14, trước/sau. Tùy chọn là thuộc tính phụ nếu có. Tên SKU hiển thị có thể để trống để hệ thống tự tạo.',
    displayNameLabel: 'Tên SKU hiển thị',
    displayNamePlaceholder: 'Tự sinh từ quy cách và tùy chọn',
    versionLabel: 'Quy cách',
    optionLabel: 'Tùy chọn',
    requiredMessage: 'Quy cách là bắt buộc. Ví dụ: 1L, 90-14, trước, sau.',
    saveError: 'Lưu quy cách thất bại!',
    deleteError: 'Xóa quy cách thất bại!',
    deleteConfirmPrefix: 'Xóa quy cách',
  },
};

const VariantManager = ({ productId, productType = 'XeMay', onClose }) => {
  const { isAdmin } = useAuth();
  const labels = VARIANT_LABELS[productType] || VARIANT_LABELS.XeMay;
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editVariant, setEditVariant] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    tenBienThe: '',
    sku: '',
    phienBan: '',
    mauSac: '',
    barcode: '',
    giaNiemYet: '',
    giaKhuyenMai: '',
    trangThai: 'Available',
  });

  const fetchVariants = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await productService.getVariants(productId);
      const data = res.data;
      setVariants(Array.isArray(data) ? data : data.items || data.data || []);
    } catch (err) {
      setError('Không thể tải danh sách biến thể.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) fetchVariants();
  }, [productId]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const openAdd = () => {
    setEditVariant(null);
    setForm({ tenBienThe: '', sku: '', phienBan: '', mauSac: '', barcode: '', giaNiemYet: '', giaKhuyenMai: '', trangThai: 'Available' });
    setShowForm(true);
  };

  const openEdit = (v) => {
    const version = inferVersion(v);
    const color = v.mauSac || v.color || '';
    const displayName = v.tenBienThe || v.variantName || v.name || buildSkuDisplayName(version, color);

    setEditVariant(v);
    setForm({
      tenBienThe: displayName,
      sku: v.sku || '',
      phienBan: version,
      mauSac: color,
      barcode: v.barcode || v.barCode || v.maVach || '',
      giaNiemYet: v.giaNiemYet ?? v.listPrice ?? '',
      giaKhuyenMai: v.giaKhuyenMai ?? v.salePrice ?? '',
      trangThai: v.trangThai || v.status || 'Available',
    });
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const next = { ...prev, [name]: value };
      if ((name === 'phienBan' || name === 'mauSac') && shouldSyncDisplayName(prev)) {
        next.tenBienThe = buildSkuDisplayName(next.phienBan, next.mauSac) || next.phienBan || next.mauSac;
      }
      return next;
    });
  };

  const handleMoneyChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: normalizeMoneyInput(value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const version = form.phienBan.trim();
    const color = form.mauSac.trim();
    if (!version) {
      alert(labels.requiredMessage);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        phienBan: version,
        mauSac: color,
        tenBienThe: form.tenBienThe.trim() || buildSkuDisplayName(version, color),
      };
      if (editVariant) {
        await productService.updateVariant(productId, editVariant.id, payload);
      } else {
        await productService.createVariant(productId, payload);
      }
      setShowForm(false);
      fetchVariants();
    } catch (err) {
      alert(labels.saveError);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (variantId, name) => {
    if (!window.confirm(`${labels.deleteConfirmPrefix} "${name}"?`)) return;
    try {
      await productService.deleteVariant(productId, variantId);
      fetchVariants();
    } catch (err) {
      alert(labels.deleteError);
      console.error(err);
    }
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg variant-manager-dialog" style={{ maxHeight: '90vh' }}>
        <div className="modal-content" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
          <div className="modal-header">
            <h5 className="modal-title">{labels.modalTitle}</h5>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>
          <div className="modal-body variant-manager-body" style={{ overflowY: 'auto', flex: 1 }}>
            <div className="mb-3">
              <button className="btn btn-primary btn-sm" onClick={openAdd}>
                <i className="fas fa-plus"></i> {labels.addLabel}
              </button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            {loading ? (
              <div className="text-center py-3">
                <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                <span className="ml-2">Đang tải...</span>
              </div>
            ) : variants.length === 0 ? (
              <p className="text-muted text-center">{labels.emptyText}</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered table-striped table-sm">
                  <thead>
                    <tr>
                      <th>Tên SKU hiển thị</th>
                      <th>SKU</th>
                      {SHOW_SKU_BARCODE_FIELD && <th>Barcode</th>}
                      <th>{labels.versionLabel}</th>
                      <th>{labels.optionLabel}</th>
                      <th>Giá niêm yết</th>
                      <th>Giá khuyến mãi</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map(v => (
                      <tr key={v.id}>
                        <td>{v.tenBienThe || v.variantName || v.name || buildSkuDisplayName(v.phienBan || v.version, v.mauSac || v.color)}</td>
                        <td>{v.sku}</td>
                        {SHOW_SKU_BARCODE_FIELD && <td>{v.barcode || v.barCode || v.maVach || ''}</td>}
                        <td>{v.phienBan || v.version || inferVersion(v) || ''}</td>
                        <td>{v.mauSac || v.color || ''}</td>
                        <td>{formatCurrency(v.giaNiemYet ?? v.listPrice ?? 0)}</td>
                        <td>{(v.giaKhuyenMai ?? v.salePrice) ? formatCurrency(v.giaKhuyenMai ?? v.salePrice) : 'Không'}</td>
                        <td>
                          <span className={`badge badge-${(v.trangThai || v.status) === 'Available' || (v.trangThai || v.status) === 'Available' ? 'success' : 'secondary'}`}>
                            {(v.trangThai || v.status) === 'Available' || (v.trangThai || v.status) === 'Available' ? 'Hoạt động' : 'Ngừng'}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-xs btn-info mr-1" onClick={() => openEdit(v)}>
                            <i className="fas fa-edit"></i>
                          </button>
                          {isAdmin() && (
                            <button className="btn btn-xs btn-danger" onClick={() => handleDelete(v.id, v.tenBienThe || v.variantName || v.name || inferVersion(v))}>
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

            {/* Inline Form */}
            {showForm && (
              <div className="card mt-3 variant-form-card">
                <div className="card-header">
                  <h6 className="card-title m-0">{editVariant ? labels.formTitleEdit : labels.formTitleAdd}</h6>
                </div>
                <div className="card-body">
                  <p className="text-muted small mb-3">
                    {labels.helpText}
                  </p>
                  <form onSubmit={handleSubmit}>
                    <div className="row">
                      <div className="col-md-4">
                        <div className="form-group">
                          <label>{labels.displayNameLabel}</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            name="tenBienThe"
                            value={form.tenBienThe}
                            onChange={handleChange}
                            placeholder={labels.displayNamePlaceholder}
                          />
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="form-group">
                          <label>SKU</label>
                          <input type="text" className="form-control form-control-sm" name="sku" value={form.sku} onChange={handleChange} />
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="form-group">
                          <label>{labels.versionLabel} <span className="text-danger">*</span></label>
                          <input type="text" className="form-control form-control-sm" name="phienBan" value={form.phienBan} onChange={handleChange} />
                        </div>
                      </div>
                    </div>
                    {SHOW_SKU_BARCODE_FIELD && (
                      <div className="row">
                        <div className="col-md-4">
                          <div className="form-group">
                            <label>Barcode</label>
                            <input type="text" className="form-control form-control-sm" name="barcode" value={form.barcode} onChange={handleChange} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="row">
                      <div className="col-md-3">
                        <div className="form-group">
                          <label>{labels.optionLabel}</label>
                          <input type="text" className="form-control form-control-sm" name="mauSac" value={form.mauSac} onChange={handleChange} />
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="form-group">
                          <label>Giá niêm yết</label>
                          <input type="text" inputMode="numeric" className="form-control form-control-sm" name="giaNiemYet" value={formatMoneyInput(form.giaNiemYet)} onChange={handleMoneyChange} required />
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="form-group">
                          <label>Giá khuyến mãi</label>
                          <input type="text" inputMode="numeric" className="form-control form-control-sm" name="giaKhuyenMai" value={formatMoneyInput(form.giaKhuyenMai)} onChange={handleMoneyChange} />
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="form-group">
                          <label>Trạng thái</label>
                          <select className="form-control form-control-sm" name="trangThai" value={form.trangThai} onChange={handleChange}>
                            <option value="Available">Hoạt động</option>
                            <option value="Inactive">Ngừng</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm mr-2" disabled={saving}>
                      {saving ? 'Đang lưu...' : 'Lưu'}
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Hủy</button>
                  </form>
                </div>
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

export default VariantManager;
