import React, { useEffect, useMemo, useState } from 'react';
import inventoryService from '../../services/inventoryService';
import { formatDate } from '../../utils/formatDate';
import { createDateStamp, exportWorkbook } from '../../utils/exportExcel';
import { useAuth } from '../../contexts/AuthContext';

const TYPES = {
  1: 'Phiếu nhập kho khác',
  2: 'Phiếu xuất kho',
  3: 'Phiếu điều chỉnh tồn',
  4: 'Phiếu kiểm kê',
  PurchaseReceipt: 'Nhận hàng từ NCC',
};

TYPES[1] = 'Phi\u1ebfu nh\u1eadp kho';
TYPES[2] = 'Phi\u1ebfu xu\u1ea5t kho';
TYPES[3] = 'Phi\u1ebfu ki\u1ec3m k\u00ea / \u0111i\u1ec1u ch\u1ec9nh t\u1ed3n';
TYPES[4] = 'Phi\u1ebfu ki\u1ec3m k\u00ea / \u0111i\u1ec1u ch\u1ec9nh t\u1ed3n';
TYPES.PurchaseReceipt = 'Nh\u1eadn h\u00e0ng t\u1eeb NCC';

const FILTER_TYPES = [
  ['1', TYPES[1]],
  ['2', TYPES[2]],
  ['stocktake', TYPES[4]],
  ['PurchaseReceipt', TYPES.PurchaseReceipt],
];

const CREATE_TYPES = [
  ['1', TYPES[1]],
  ['2', TYPES[2]],
  ['4', TYPES[4]],
];

const RECEIPT_REASONS = [
  ['OpeningBalance', 'Tồn đầu kỳ'],
  ['Supplement', 'Nhập bù'],
  ['Gift', 'Hàng tặng'],
  ['Other', 'Khác'],
];

const STATUS = {
  Draft: { label: 'Nháp', color: 'secondary' },
  Approved: { label: 'Đã duyệt', color: 'success' },
  Cancelled: { label: 'Đã hủy', color: 'danger' },
};

const emptyLine = { skuId: '', qty: 1, note: '' };
const getApiMessage = (err, fallback) => err?.response?.data?.message || fallback;
const asItems = (payload) => payload?.items || payload?.data || payload || [];

const StockDocumentList = () => {
  const { isAdmin } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [details, setDetails] = useState([]);
  const [skus, setSkus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [form, setForm] = useState({ type: isAdmin() ? 1 : 2, reason: '', note: '', lines: [{ ...emptyLine }] });

  const fetchDocuments = async () => {
    setLoading(true);
    setError('');
    try {
      const [documentRes, receiptRes] = await Promise.all([
        inventoryService.getDocuments({ pageSize: 1000 }),
        inventoryService.getGoodsReceipts({ pageSize: 1000 }),
      ]);
      const manual = asItems(documentRes.data).map((item) => ({ ...item, source: 'StockDocument', sourceLabel: 'Phiếu kho thủ công' }));
      const purchases = asItems(receiptRes.data).map((item) => ({
        ...item,
        source: 'GoodsReceipt',
        sourceLabel: `Đơn mua ${item.purchaseOrderCode}`,
        type: 'PurchaseReceipt',
        status: 'Approved',
        createdDate: item.receivedAt,
        approvedAt: item.receivedAt,
      }));
      setDocuments([...manual, ...purchases]
        .filter((item) => !filterStatus || item.status === filterStatus)
        .filter((item) => {
          if (!filterType) return true;
          if (filterType === 'stocktake') return Number(item.type) === 3 || Number(item.type) === 4;
          return String(item.type) === String(filterType);
        })
        .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate)));
    } catch (err) {
      setError(getApiMessage(err, 'Không thể tải danh sách phiếu kho.'));
    } finally {
      setLoading(false);
    }
  };

  const fetchLookups = async () => {
    const skuRes = await inventoryService.getSkus();
    setSkus(asItems(skuRes.data));
  };

  useEffect(() => {
    fetchDocuments();
  }, [filterStatus, filterType]);

  useEffect(() => {
    fetchLookups();
  }, []);

  const openCreate = () => {
    setForm({ type: isAdmin() ? 1 : 2, reason: '', note: '', lines: [{ ...emptyLine }] });
    setShowCreate(true);
  };

  const updateLine = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    }));
  };

  const addLine = () => setForm((prev) => ({ ...prev, lines: [...prev.lines, { ...emptyLine }] }));
  const removeLine = (index) => setForm((prev) => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index) }));

  const saveDocument = async () => {
    const type = Number(form.type);
    const lines = form.lines
      .filter((line) => line.skuId && Number(line.qty) > 0)
      .map((line) => ({ skuId: Number(line.skuId), qty: Number(line.qty), note: line.note || null }));

    if (type === 1 && !form.reason) {
      alert('Vui lòng chọn lý do nhập kho khác.');
      return;
    }

    if (lines.length === 0) {
      alert('Phiếu kho phải có ít nhất một dòng SKU hợp lệ.');
      return;
    }

    setSaving(true);
    try {
      await inventoryService.createDocument({
        type,
        reason: type === 1 ? form.reason : null,
        note: form.note || null,
        lines,
      });
      setShowCreate(false);
      await fetchDocuments();
    } catch (err) {
      alert(getApiMessage(err, 'Không thể tạo phiếu kho.'));
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (document) => {
    setSelectedDocument(document);
    setShowDetail(true);
    setDetails([]);
    try {
      const res = document.source === 'GoodsReceipt'
        ? await inventoryService.getGoodsReceiptById(document.id)
        : await inventoryService.getDocumentById(document.id);
      setSelectedDocument(document.source === 'GoodsReceipt'
        ? { ...document, ...(res.data.receipt || {}) }
        : { ...document, ...(res.data.document || {}) });
      setDetails(res.data.lines || []);
    } catch (err) {
      alert(getApiMessage(err, 'Không thể tải chi tiết phiếu kho.'));
    }
  };

  const approveDocument = async () => {
    if (!selectedDocument) return;
    const verb = Number(selectedDocument.type) === 4 ? 'duyệt phiếu kiểm kê và tự điều chỉnh tồn' : 'duyệt phiếu kho';
    if (!window.confirm(`Xác nhận ${verb}? Sau khi duyệt, tồn kho sẽ được cập nhật và phiếu không thể sửa.`)) return;
    setSaving(true);
    try {
      await inventoryService.approveDocument(selectedDocument.id);
      await fetchDocuments();
      await openDetail(selectedDocument);
    } catch (err) {
      alert(getApiMessage(err, 'Duyệt phiếu kho thất bại.'));
    } finally {
      setSaving(false);
    }
  };

  const cancelDocument = async () => {
    if (!selectedDocument) return;
    const reason = window.prompt('Lý do hủy phiếu kho?') || '';
    setSaving(true);
    try {
      await inventoryService.cancelDocument(selectedDocument.id, { reason });
      await fetchDocuments();
      await openDetail(selectedDocument);
    } catch (err) {
      alert(getApiMessage(err, 'Hủy phiếu kho thất bại.'));
    } finally {
      setSaving(false);
    }
  };

  const printSelectedDocument = () => {
    if (!selectedDocument) return;
    const type = TYPES[selectedDocument.type] || selectedDocument.type;
    const status = STATUS[selectedDocument.status]?.label || selectedDocument.status;
    const rows = details.map((detail, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${detail.skuCode || '-'}</td>
        <td>${detail.productName || '-'}</td>
        <td class="right">${detail.qty}</td>
        <td>${detail.note || '-'}</td>
      </tr>
    `).join('');

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${type} ${selectedDocument.code}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #222; padding: 24px; }
            h1 { font-size: 22px; margin: 0 0 6px; }
            .muted { color: #666; margin-bottom: 16px; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin: 16px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 13px; text-align: left; }
            th { background: #f3f4f6; }
            .right { text-align: right; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 42px; text-align: center; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>MoToSale - ${type}</h1>
          <div class="muted">Mã phiếu: ${selectedDocument.code}</div>
          <div class="meta">
            <div>Nguồn: ${selectedDocument.sourceLabel || 'Phiếu kho thủ công'}</div>
            <div>Trạng thái: ${status}</div>
            <div>Ngày tạo: ${formatDate(selectedDocument.createdDate)}</div>
            <div>Ngày duyệt: ${formatDate(selectedDocument.approvedAt)}</div>
            <div>Ghi chú: ${selectedDocument.note || '-'}</div>
          </div>
          <table>
            <thead><tr><th>#</th><th>SKU</th><th>Sản phẩm</th><th class="right">Số lượng</th><th>Ghi chú</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="5">Chưa có dòng hàng</td></tr>'}</tbody>
          </table>
          <div class="signatures">
            <div>Người lập phiếu<br><br><br>........................</div>
            <div>Người duyệt/nhận<br><br><br>........................</div>
          </div>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const exportDocuments = async () => {
    setExporting(true);
    try {
      await exportWorkbook({
        fileName: `phieu-kho-${createDateStamp()}.xlsx`,
        sheets: [{
          name: 'PhieuKho',
          columns: [
            { header: 'Mã phiếu', key: 'code', width: 18 },
            { header: 'Loại phiếu', key: 'type', width: 22 },
            { header: 'Nguồn chứng từ', key: 'source', width: 28 },
            { header: 'Trạng thái', key: 'status', width: 14 },
            { header: 'Số dòng', key: 'lines', type: 'number', width: 12 },
            { header: 'Ngày tạo', key: 'createdAt', type: 'date', width: 20 },
            { header: 'Ngày duyệt', key: 'approvedAt', type: 'date', width: 20 },
            { header: 'Ghi chú', key: 'note', width: 40 },
          ],
          rows: documents.map((item) => ({
            code: item.code,
            type: TYPES[item.type] || item.type,
            source: item.sourceLabel || 'Phiếu kho thủ công',
            status: STATUS[item.status]?.label || item.status,
            lines: item.lineCount || 0,
            createdAt: item.createdDate,
            approvedAt: item.approvedAt,
            note: item.note || '',
          })),
        }],
      });
    } catch (err) {
      alert('Xuất Excel phiếu kho thất bại.');
    } finally {
      setExporting(false);
    }
  };

  const statusBadge = (status) => {
    const meta = STATUS[status] || STATUS.Draft;
    return <span className={`badge badge-${meta.color}`}>{meta.label}</span>;
  };

  const canApproveOrCancel = useMemo(() => selectedDocument?.source !== 'GoodsReceipt' && selectedDocument?.status === 'Draft', [selectedDocument]);
  const selectedType = Number(form.type);

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6"><h1 className="m-0">Chứng từ kho</h1></div>
            <div className="col-sm-6 text-right">
              <button className="btn btn-outline-success mr-2" onClick={exportDocuments} disabled={exporting}>
                <i className="fas fa-file-excel mr-1"></i>{exporting ? 'Đang xuất...' : 'Xuất Excel'}
              </button>
              <button className="btn btn-primary" onClick={openCreate}>
                <i className="fas fa-plus mr-1"></i>Tạo phiếu kho thủ công
              </button>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="card">
            <div className="card-body">
              <div className="row">
                <div className="col-md-3">
                  <select className="form-control" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                    <option value="">Tất cả loại phiếu</option>
                    {FILTER_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div className="col-md-3">
                  <select className="form-control" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">Tất cả trạng thái</option>
                    {Object.entries(STATUS).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-bordered table-striped mb-0">
                  <thead>
                    <tr>
                      <th>Mã phiếu</th>
                      <th>Loại phiếu</th>
                      <th>Nguồn chứng từ</th>
                      <th className="text-center">Số dòng</th>
                      <th>Trạng thái</th>
                      <th>Ngày tạo</th>
                      <th>Ngày duyệt</th>
                      <th>Ghi chú</th>
                      <th className="text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="9" className="text-center py-4">Đang tải phiếu kho...</td></tr>
                    ) : documents.length === 0 ? (
                      <tr><td colSpan="9" className="text-center text-muted py-4">Chưa có phiếu kho.</td></tr>
                    ) : documents.map((item) => (
                      <tr key={`${item.source}-${item.id}`}>
                        <td><strong>{item.code}</strong></td>
                        <td>{TYPES[item.type] || item.type}</td>
                        <td>{item.sourceLabel || 'Phiếu kho thủ công'}</td>
                        <td className="text-center">{item.lineCount || 0}</td>
                        <td>{statusBadge(item.status)}</td>
                        <td>{formatDate(item.createdDate)}</td>
                        <td>{formatDate(item.approvedAt)}</td>
                        <td>{item.note || '-'}</td>
                        <td className="text-center">
                          <button className="btn btn-xs btn-info" onClick={() => openDetail(item)} title="Xem chi tiết">
                            <i className="fas fa-eye"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showCreate && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Tạo phiếu kho thủ công</h5>
                <button type="button" className="close" onClick={() => setShowCreate(false)}><span>&times;</span></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-info">
                  Hệ thống chỉ quản lý một kho duy nhất. Phiếu nhập, xuất và kiểm kê/điều chỉnh sẽ cập nhật trực tiếp vào tồn kho chung.
                </div>
                <div className="row">
                  <div className="col-md-3">
                    <div className="form-group">
                      <label>Loại phiếu</label>
                      <select className="form-control" value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: Number(e.target.value) }))}>
                        {CREATE_TYPES.filter(([value]) => isAdmin() || value !== '1').map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </div>
                  </div>
                  {selectedType === 1 && (
                    <div className="col-md-3">
                      <div className="form-group">
                        <label>Lý do nhập kho khác</label>
                        <select className="form-control" value={form.reason} onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}>
                          <option value="">-- Chọn lý do --</option>
                          {RECEIPT_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                  <div className={selectedType === 1 ? 'col-md-6' : 'col-md-9'}>
                    <div className="form-group">
                      <label>Ghi chú</label>
                      <input className="form-control" value={form.note} onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead>
                      <tr>
                        <th style={{ minWidth: 360 }}>SKU / Sản phẩm</th>
                        <th style={{ width: 160 }}>{selectedType === 4 || selectedType === 3 ? 'Tồn thực tế' : 'Số lượng'}</th>
                        <th>Ghi chú dòng</th>
                        <th style={{ width: 70 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.lines.map((line, index) => (
                        <tr key={index}>
                          <td>
                            <select className="form-control" value={line.skuId} onChange={(e) => updateLine(index, 'skuId', e.target.value)}>
                              <option value="">-- Chọn SKU --</option>
                              {skus.map((sku) => (
                                <option key={sku.id} value={sku.id}>
                                  {sku.skuCode} - {sku.productName}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input type="number" min="1" className="form-control text-right" value={line.qty} onChange={(e) => updateLine(index, 'qty', e.target.value)} />
                          </td>
                          <td>
                            <input className="form-control" value={line.note} onChange={(e) => updateLine(index, 'note', e.target.value)} />
                          </td>
                          <td className="text-center">
                            <button className="btn btn-xs btn-danger" type="button" onClick={() => removeLine(index)} disabled={form.lines.length === 1}>
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="btn btn-outline-primary" type="button" onClick={addLine}>
                  <i className="fas fa-plus mr-1"></i>Thêm dòng SKU
                </button>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)} disabled={saving}>Đóng</button>
                <button type="button" className="btn btn-primary" onClick={saveDocument} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu phiếu nháp'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetail && selectedDocument && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Chi tiết chứng từ kho - {selectedDocument.code}</h5>
                <button type="button" className="close" onClick={() => setShowDetail(false)}><span>&times;</span></button>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-3"><strong>Loại:</strong> {TYPES[selectedDocument.type]}</div>
                  <div className="col-md-3"><strong>Nguồn:</strong> {selectedDocument.sourceLabel || 'Phiếu kho thủ công'}</div>
                  <div className="col-md-3"><strong>Trạng thái:</strong> {statusBadge(selectedDocument.status)}</div>
                  <div className="col-md-3"><strong>Ngày tạo:</strong> {formatDate(selectedDocument.createdDate)}</div>
                  <div className="col-md-3 mt-2"><strong>Ngày duyệt:</strong> {formatDate(selectedDocument.approvedAt)}</div>
                  {selectedDocument.purchaseOrderCode && <div className="col-md-3 mt-2"><strong>Đơn mua:</strong> {selectedDocument.purchaseOrderCode}</div>}
                  {selectedDocument.supplierName && <div className="col-md-3 mt-2"><strong>NCC:</strong> {selectedDocument.supplierName}</div>}
                  <div className="col-md-6 mt-2"><strong>Ghi chú:</strong> {selectedDocument.note || '-'}</div>
                </div>
                <div className="table-responsive">
                  <table className="table table-bordered table-striped">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Sản phẩm</th>
                        <th className="text-right">Số lượng</th>
                        <th>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.length === 0 ? (
                        <tr><td colSpan="4" className="text-center text-muted">Chưa có dòng hàng.</td></tr>
                      ) : details.map((detail) => (
                        <tr key={detail.id}>
                          <td>{detail.skuCode || '-'}</td>
                          <td>{detail.productName || '-'}</td>
                          <td className="text-right">{detail.qty}</td>
                          <td>{detail.note || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                {canApproveOrCancel && (
                  <>
                    <button className="btn btn-danger" type="button" onClick={cancelDocument} disabled={saving}>Hủy phiếu</button>
                    <button className="btn btn-success" type="button" onClick={approveDocument} disabled={saving}>Duyệt phiếu</button>
                  </>
                )}
                <button type="button" className="btn btn-outline-primary" onClick={printSelectedDocument}>
                  <i className="fas fa-print mr-1"></i>In phiếu
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowDetail(false)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockDocumentList;
