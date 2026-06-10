import React, { useEffect, useMemo, useState } from 'react';
import productService from '../../services/productService';
import { formatCurrency } from '../../utils/formatCurrency';

const emptyForm = { relatedProductId: '', relationType: 'Accessory', note: '', sortOrder: 0 };
const relationLabels = {
  Accessory: 'Phụ kiện bán kèm',
  Bundle: 'Gói bán cùng',
  Alternative: 'Sản phẩm thay thế',
};

const ProductRelatedManager = ({ product, onClose }) => {
  const productId = product.maSanPham || product.id;
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const options = useMemo(
    () => products.filter((item) => String(item.maSanPham || item.id) !== String(productId)),
    [products, productId]
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [relatedRes, productRes] = await Promise.all([
        productService.getRelatedItems(productId),
        productService.getAll({ page: 1, pageSize: 500 }),
      ]);
      setItems(relatedRes.data.items || relatedRes.data || []);
      setProducts(productRes.data.items || productRes.data.data || productRes.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Không thể tải danh sách sản phẩm bán kèm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [productId]);

  const reset = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.relatedProductId) return alert('Vui lòng chọn sản phẩm liên quan.');
    setSaving(true);
    try {
      const payload = {
        relatedProductId: Number(form.relatedProductId),
        relationType: form.relationType,
        note: form.note || null,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editingId) await productService.updateRelatedItem(productId, editingId, payload);
      else await productService.createRelatedItem(productId, payload);
      reset();
      await load();
    } catch (err) {
      alert(err?.response?.data?.message || 'Lưu sản phẩm bán kèm thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const edit = (item) => {
    setEditingId(item.id);
    setForm({
      relatedProductId: item.relatedProductId,
      relationType: item.relationType || 'Accessory',
      note: item.note || '',
      sortOrder: item.sortOrder || 0,
    });
  };

  const remove = async (item) => {
    if (!window.confirm(`Xóa cấu hình bán kèm "${item.relatedProductName}"?`)) return;
    try {
      await productService.deleteRelatedItem(productId, item.id);
      await load();
    } catch (err) {
      alert(err?.response?.data?.message || 'Xóa cấu hình bán kèm thất bại.');
    }
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Phụ kiện / sản phẩm bán kèm - {product.tenSanPham || product.name}</h5>
            <button type="button" className="close" onClick={onClose}><span>&times;</span></button>
          </div>
          <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
            {error && <div className="alert alert-danger">{error}</div>}
            <form className="card card-body mb-3" onSubmit={submit}>
              <div className="row">
                <div className="col-md-4">
                  <label>Sản phẩm bán kèm</label>
                  <select className="form-control" value={form.relatedProductId} onChange={(e) => setForm({ ...form, relatedProductId: e.target.value })}>
                    <option value="">-- Chọn sản phẩm --</option>
                    {options.map((item) => (
                      <option key={item.maSanPham || item.id} value={item.maSanPham || item.id}>
                        {(item.maSanPhamKinhDoanh || item.code)} - {item.tenSanPham || item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label>Quan hệ</label>
                  <select className="form-control" value={form.relationType} onChange={(e) => setForm({ ...form, relationType: e.target.value })}>
                    {Object.entries(relationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label>Ghi chú</label>
                  <input className="form-control" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="VD: thường mua cùng, khuyến nghị thay thế..." />
                </div>
                <div className="col-md-1">
                  <label>Thứ tự</label>
                  <input type="number" className="form-control" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
                </div>
                <div className="col-md-1 d-flex align-items-end">
                  <button className="btn btn-primary btn-block" disabled={saving}>{editingId ? 'Lưu' : 'Thêm'}</button>
                </div>
              </div>
              {editingId && <button type="button" className="btn btn-link align-self-start px-0 mt-2" onClick={reset}>Hủy sửa</button>}
            </form>

            {loading ? (
              <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
            ) : items.length === 0 ? (
              <div className="text-center text-muted py-4">Chưa có sản phẩm bán kèm.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered table-striped table-sm">
                  <thead>
                    <tr>
                      <th>Mã SP</th>
                      <th>Tên sản phẩm</th>
                      <th>Quan hệ</th>
                      <th>Tồn</th>
                      <th>Giá</th>
                      <th>Ghi chú</th>
                      <th className="text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.relatedProductCode}</td>
                        <td>{item.relatedProductName}</td>
                        <td>{relationLabels[item.relationType] || item.relationType}</td>
                        <td className="text-right">{item.stockTotal}</td>
                        <td className="text-right">{formatCurrency(item.salePrice || item.listPrice || 0)}</td>
                        <td>{item.note || '-'}</td>
                        <td className="text-center">
                          <button type="button" className="btn btn-xs btn-info mr-1" onClick={() => edit(item)}><i className="fas fa-edit" /></button>
                          <button type="button" className="btn btn-xs btn-danger" onClick={() => remove(item)}><i className="fas fa-trash" /></button>
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

export default ProductRelatedManager;
