import React, { useEffect, useState } from 'react';
import productService from '../../services/productService';
import { formatDateShort } from '../../utils/formatDate';

const badgeClass = (status) => {
  if (status === 'Tồn chậm') return 'badge-danger';
  if (status === 'Cần theo dõi') return 'badge-warning';
  if (status === 'Hết hàng') return 'badge-secondary';
  return 'badge-success';
};

const ProductInventoryAgingModal = ({ product, onClose }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await productService.getInventoryAging(product.maSanPham || product.id);
        if (mounted) setItems(response.data.items || response.data || []);
      } catch (err) {
        if (mounted) setError(err?.response?.data?.message || 'Không thể tải tuổi tồn kho.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [product]);

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Tuổi tồn kho - {product.tenSanPham || product.name}</h5>
            <button type="button" className="close" onClick={onClose}><span>&times;</span></button>
          </div>
          <div className="modal-body">
            {error && <div className="alert alert-danger">{error}</div>}
            {loading ? (
              <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
            ) : items.length === 0 ? (
              <div className="text-center text-muted py-4">Sản phẩm chưa có SKU để đánh giá tuổi tồn.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered table-striped table-sm">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Biến thể</th>
                      <th>Tồn thực</th>
                      <th>Đang giữ</th>
                      <th>Có thể bán</th>
                      <th>Nhập đầu</th>
                      <th>Nhập gần nhất</th>
                      <th>Bán gần nhất</th>
                      <th>Số ngày tồn</th>
                      <th>Ngày chưa bán</th>
                      <th>Đánh giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.skuId}>
                        <td>{item.skuCode}</td>
                        <td>{item.variantName || '-'}</td>
                        <td className="text-right">{item.onHand}</td>
                        <td className="text-right">{item.reserved}</td>
                        <td className="text-right">{item.available}</td>
                        <td>{formatDateShort(item.firstStockAt) || '-'}</td>
                        <td>{formatDateShort(item.lastStockInAt) || '-'}</td>
                        <td>{formatDateShort(item.lastSoldAt) || '-'}</td>
                        <td className="text-right">{item.daysInStock}</td>
                        <td className="text-right">{item.daysSinceLastSale}</td>
                        <td><span className={`badge ${badgeClass(item.agingStatus)}`}>{item.agingStatus}</span></td>
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

export default ProductInventoryAgingModal;
