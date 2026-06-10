import React, { useEffect, useState } from 'react';
import productService from '../../services/productService';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateShort } from '../../utils/formatDate';

const scopeLabel = (scopeType) => ({
  All: 'Toàn bộ đơn',
  Product: 'Theo sản phẩm',
  Category: 'Theo danh mục',
  Brand: 'Theo hãng',
}[scopeType] || scopeType || '-');

const discountLabel = (item) => {
  const type = String(item.discountType || '').toLowerCase();
  if (type.includes('percent')) return `${item.discountValue}%${item.maxDiscount ? `, tối đa ${formatCurrency(item.maxDiscount)}` : ''}`;
  return formatCurrency(item.discountValue);
};

const ProductPromotionsModal = ({ product, onClose }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await productService.getPromotions(product.maSanPham || product.id);
        if (mounted) setItems(response.data.items || response.data || []);
      } catch (err) {
        if (mounted) setError(err?.response?.data?.message || 'Không thể tải chương trình khuyến mại.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [product]);

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Khuyến mại áp dụng - {product.tenSanPham || product.name}</h5>
            <button type="button" className="close" onClick={onClose}><span>&times;</span></button>
          </div>
          <div className="modal-body">
            {error && <div className="alert alert-danger">{error}</div>}
            {loading ? (
              <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
            ) : items.length === 0 ? (
              <div className="text-center text-muted py-4">Sản phẩm này chưa có chương trình khuyến mại đang áp dụng.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered table-striped table-sm">
                  <thead>
                    <tr>
                      <th>Mã voucher</th>
                      <th>Phạm vi</th>
                      <th>Giảm giá</th>
                      <th>Đơn tối thiểu</th>
                      <th>Thời hạn</th>
                      <th>Lượt dùng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={`${item.id}-${item.scopeType}-${item.refId}`}>
                        <td className="font-weight-bold">{item.code}</td>
                        <td>{scopeLabel(item.scopeType)}</td>
                        <td className="text-right">{discountLabel(item)}</td>
                        <td className="text-right">{formatCurrency(item.minOrderValue || 0)}</td>
                        <td>{formatDateShort(item.startAt) || 'Không giới hạn'} - {formatDateShort(item.endAt) || 'Không giới hạn'}</td>
                        <td className="text-center">{item.usedCount || 0}/{item.usageLimit || '∞'}</td>
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

export default ProductPromotionsModal;
