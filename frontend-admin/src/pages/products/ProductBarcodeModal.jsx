import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import productService from '../../services/productService';
import { formatCurrency } from '../../utils/formatCurrency';

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const ProductBarcodeModal = ({ product, onClose }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refs = useRef({});

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await productService.getBarcodes(product.maSanPham || product.id);
        if (mounted) setItems(response.data.items || response.data || []);
      } catch (err) {
        if (mounted) setError(err?.response?.data?.message || 'Không thể tải mã vạch.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [product]);

  useEffect(() => {
    items.forEach((item) => {
      const element = refs.current[item.skuId];
      if (!element || !item.barcode) return;
      try {
        JsBarcode(element, item.barcode, {
          format: 'CODE128',
          width: 1.5,
          height: 42,
          displayValue: true,
          fontSize: 12,
          margin: 4,
        });
      } catch {
        element.innerHTML = '';
      }
    });
  }, [items]);

  const handlePrint = () => {
    const labels = items.map((item) => {
      const svg = refs.current[item.skuId]?.outerHTML || '';
      return `
        <div class="barcode-label">
          <div class="barcode-title">${escapeHtml(item.productName)}</div>
          <div class="barcode-meta">${escapeHtml(item.variantName || item.skuCode)}</div>
          ${svg}
          <div class="barcode-row">
            <span>${escapeHtml(item.skuCode)}</span>
            <strong>${escapeHtml(formatCurrency(item.price || 0))}</strong>
          </div>
        </div>
      `;
    }).join('');

    const frame = document.createElement('iframe');
    frame.title = 'barcode-print-frame';
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    document.body.appendChild(frame);

    const frameWindow = frame.contentWindow;
    const frameDocument = frameWindow?.document;
    if (!frameWindow || !frameDocument) {
      frame.remove();
      return;
    }

    frameDocument.open();
    frameDocument.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>In mã vạch - ${escapeHtml(product.tenSanPham || product.name || '')}</title>
          <style>
            @page { size: A4; margin: 8mm; }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; background: #fff; color: #111827; font-family: Arial, sans-serif; }
            .barcode-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; align-items: start; }
            .barcode-label { border: 1px solid #d1d5db; border-radius: 4px; padding: 8px; min-height: 138px; break-inside: avoid; page-break-inside: avoid; overflow: hidden; }
            .barcode-title { font-weight: 700; font-size: 12px; line-height: 1.25; min-height: 30px; overflow: hidden; }
            .barcode-meta, .barcode-row { font-size: 11px; color: #4b5563; }
            .barcode-row { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
            svg { display: block; width: 100%; max-height: 58px; margin: 2px 0; }
          </style>
        </head>
        <body>
          <div class="barcode-grid">${labels}</div>
          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
            window.onafterprint = function () {
              setTimeout(function () {
                if (window.frameElement) window.frameElement.remove();
              }, 100);
            };
          </script>
        </body>
      </html>
    `);
    frameDocument.close();
    setTimeout(() => {
      if (frame.isConnected) frame.remove();
    }, 60000);
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <style>{`
        .barcode-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
        .barcode-label { border: 1px solid #d1d5db; border-radius: 6px; padding: 10px; background: #fff; min-height: 150px; }
        .barcode-title { font-weight: 700; font-size: 13px; line-height: 1.25; min-height: 32px; }
        .barcode-meta { font-size: 12px; color: #4b5563; }
      `}</style>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">In mã vạch - {product.tenSanPham || product.name}</h5>
            <button type="button" className="close" onClick={onClose}><span>&times;</span></button>
          </div>
          <div className="modal-body barcode-print-area" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
            {error && <div className="alert alert-danger">{error}</div>}
            {loading ? (
              <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
            ) : items.length === 0 ? (
              <div className="text-center text-muted py-4">Sản phẩm chưa có SKU để in mã vạch.</div>
            ) : (
              <div className="barcode-grid">
                {items.map((item) => (
                  <div className="barcode-label" key={item.skuId}>
                    <div className="barcode-title">{item.productName}</div>
                    <div className="barcode-meta">{item.variantName || item.skuCode}</div>
                    <svg ref={(node) => { refs.current[item.skuId] = node; }} />
                    <div className="d-flex justify-content-between barcode-meta">
                      <span>{item.skuCode}</span>
                      <strong>{formatCurrency(item.price || 0)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-primary" disabled={!items.length} onClick={handlePrint}>
              <i className="fas fa-print mr-1" />In mã vạch
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Đóng</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductBarcodeModal;
