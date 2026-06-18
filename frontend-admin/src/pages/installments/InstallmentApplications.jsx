import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import installmentService from '../../services/installmentService';
import inventoryService from '../../services/inventoryService';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

const STATUS_LABELS = { Pending: 'Chờ xử lý', Approved: 'Đã duyệt', Rejected: 'Từ chối' };
const badge = (v) => (
  <span className={`badge badge-${v === 'Approved' ? 'success' : v === 'Rejected' ? 'danger' : 'warning'}`}>
    {STATUS_LABELS[v] || v}
  </span>
);
const message = (err, fallback) => err?.response?.data?.message || fallback;

// Hồ sơ khách gửi từ web nằm trong note có cấu trúc; tách ra để hiển thị đầy đủ, không để trống.
const pickNoteLine = (note, prefix) => {
  const line = String(note || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .find((s) => s.toLowerCase().startsWith(prefix.toLowerCase()));
  return line ? line.slice(prefix.length).trim() : '';
};

const parseProfile = (row) => {
  const note = row?.note || '';
  const idLine = pickNoteLine(note, 'CCCD/CMND:');
  const idMatch = idLine.match(/^([0-9]{9,15})(?:\s+\(cấp\s+([^)]*?)(?:\s+tại\s+([^)]*))?\))?/i);
  return {
    idNumber: idMatch?.[1] || '',
    idIssueDate: idMatch?.[2] || '',
    idIssuePlace: idMatch?.[3] || '',
    birthDate: pickNoteLine(note, 'Ngày sinh:'),
    residence: pickNoteLine(note, 'Địa chỉ thường trú:'),
    occupation: pickNoteLine(note, 'Nghề nghiệp:'),
    company: pickNoteLine(note, 'Công ty:'),
    workMonths: pickNoteLine(note, 'Thâm niên:'),
    monthlyIncome: pickNoteLine(note, 'Thu nhập:'),
    receiving: pickNoteLine(note, 'Nhận hàng:'),
    contact: pickNoteLine(note, 'Người liên hệ:'),
    customerNote: pickNoteLine(note, 'Ghi chú của khách:'),
  };
};

const DetailRow = ({ label, value }) => (
  <tr>
    <td style={{ width: 200 }}><strong>{label}</strong></td>
    <td>{value || <span className="text-muted">—</span>}</td>
  </tr>
);

const emptyApprove = { skuId: '', qty: 1, unitPrice: '', downPayment: 0, paymentMethod: 'Cash', note: '' };

const InstallmentApplications = () => {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [skus, setSkus] = useState([]);
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveForm, setApproveForm] = useState(emptyApprove);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [detailTarget, setDetailTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await installmentService.getAll(status ? { status } : {});
      setItems(res.data?.items || []);
      setError('');
    } catch (err) {
      setError(message(err, 'Không tải được danh sách hồ sơ trả góp.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);
  useEffect(() => { inventoryService.getSkus().then((r) => setSkus(r.data?.items || r.data || [])).catch(() => {}); }, []);

  const filtered = useMemo(
    () => items.filter((x) => !keyword
      || `${x.code} ${x.customerName} ${x.customerPhone} ${x.productSnapshot} ${x.financePartner || ''}`.toLowerCase().includes(keyword.toLowerCase())),
    [items, keyword],
  );

  const openApprove = (row) => {
    const sku = skus.find((s) => String(s.id) === String(row.skuId));
    setApproveForm({
      skuId: row.skuId ? String(row.skuId) : '',
      qty: 1,
      unitPrice: sku ? Number(sku.salePrice ?? sku.listPrice ?? 0) : '',
      downPayment: Number(row.downPayment) || 0,
      paymentMethod: 'Cash',
      note: '',
    });
    setApproveTarget(row);
  };

  const onPickSku = (id) => {
    const sku = skus.find((s) => String(s.id) === String(id));
    setApproveForm((f) => ({ ...f, skuId: id, unitPrice: sku ? Number(sku.salePrice ?? sku.listPrice ?? 0) : f.unitPrice }));
  };

  const submitApprove = async () => {
    if (!approveForm.skuId) { setError('Vui lòng chọn SKU để lập đơn.'); return; }
    if (!(Number(approveForm.downPayment) > 0)) { setError('Tiền trả trước phải lớn hơn 0.'); return; }
    try {
      await installmentService.approve(approveTarget.id, {
        skuId: Number(approveForm.skuId),
        qty: Number(approveForm.qty) || 1,
        unitPrice: approveForm.unitPrice === '' ? null : Number(approveForm.unitPrice),
        downPayment: Number(approveForm.downPayment) || 0,
        paymentMethod: approveForm.paymentMethod,
        financePartner: approveTarget.financePartner || null,
        note: approveForm.note || null,
      });
      setApproveTarget(null);
      await load();
    } catch (err) {
      setError(message(err, 'Không duyệt được hồ sơ.'));
    }
  };

  const submitReject = async () => {
    try {
      await installmentService.reject(rejectTarget.id, { note: rejectNote || null });
      setRejectTarget(null);
      setRejectNote('');
      await load();
    } catch (err) {
      setError(message(err, 'Không từ chối được hồ sơ.'));
    }
  };

  return (
    <div className="content-wrapper-inner">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h4 mb-0">Hồ sơ trả góp (qua đối tác tài chính)</h1>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-3">
              <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Tất cả trạng thái</option>
                <option value="Pending">Chờ xử lý</option>
                <option value="Approved">Đã duyệt</option>
                <option value="Rejected">Từ chối</option>
              </select>
            </div>
            <div className="col-md-5">
              <input className="form-control" placeholder="Tìm theo mã / khách / SP / đối tác…" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            </div>
            <div className="col-md-2">
              <button className="btn btn-outline-secondary btn-block" onClick={load} disabled={loading}>Tải lại</button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Mã HS</th><th>Khách hàng</th><th>Sản phẩm</th><th>Đối tác</th>
                  <th className="text-right">Trả trước</th><th className="text-center">Tháng</th>
                  <th>Trạng thái</th><th>Đơn</th><th>Ngày gửi</th><th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={10} className="text-center text-muted">Chưa có hồ sơ.</td></tr>}
                {filtered.map((x) => (
                  <tr key={x.id}>
                    <td>{x.code}</td>
                    <td>{x.customerName}<br /><small className="text-muted">{x.customerPhone}</small></td>
                    <td>{x.productSnapshot}</td>
                    <td>{x.financePartner || '-'}</td>
                    <td className="text-right">{formatCurrency(x.downPayment)}</td>
                    <td className="text-center">{x.months || '-'}</td>
                    <td>{badge(x.applicationStatus)}</td>
                    <td>{x.orderId ? <Link to={`/orders/${x.orderId}`}>{x.orderCode || `#${x.orderId}`}</Link> : '-'}</td>
                    <td>{formatDate(x.createdDate)}</td>
                    <td className="text-right">
                      <button className="btn btn-sm btn-outline-secondary mr-1" onClick={() => setDetailTarget(x)}>Chi tiết</button>
                      {x.applicationStatus === 'Pending' && (
                        <>
                          <button className="btn btn-sm btn-success mr-1" onClick={() => openApprove(x)}>Duyệt</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => { setRejectTarget(x); setRejectNote(''); }}>Từ chối</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal duyệt */}
      {approveTarget && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Duyệt hồ sơ {approveTarget.code} → lập đơn trả góp</h5>
                <button className="close" onClick={() => setApproveTarget(null)}>&times;</button>
              </div>
              <div className="modal-body">
                <p className="text-muted small">
                  Khách: <strong>{approveTarget.customerName}</strong> · {approveTarget.customerPhone} · SP quan tâm: {approveTarget.productSnapshot}.
                  Đơn tạo ra sẽ <strong>giữ chỗ tồn</strong>, ghi nhận khoản trả trước ban đầu và đi tiếp luồng giao hàng bình thường. Phần còn lại do đối tác tài chính xử lý, hệ thống không tạo lịch thu góp hằng tháng.
                </p>
                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label>Sản phẩm (SKU) *</label>
                    <select className="form-control" value={approveForm.skuId} onChange={(e) => onPickSku(e.target.value)}>
                      <option value="">-- Chọn SKU --</option>
                      {skus.map((s) => <option key={s.id} value={String(s.id)}>{s.skuCode} · {s.productName}</option>)}
                    </select>
                  </div>
                  <div className="form-group col-md-2">
                    <label>Số lượng</label>
                    <input type="number" min="1" className="form-control" value={approveForm.qty} onChange={(e) => setApproveForm((f) => ({ ...f, qty: e.target.value }))} />
                  </div>
                  <div className="form-group col-md-4">
                    <label>Đơn giá (đ)</label>
                    <input type="number" min="0" className="form-control" value={approveForm.unitPrice} onChange={(e) => setApproveForm((f) => ({ ...f, unitPrice: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group col-md-4">
                    <label>Tiền trả trước thu ngay (đ)</label>
                    <input type="number" min="0" className="form-control" value={approveForm.downPayment} onChange={(e) => setApproveForm((f) => ({ ...f, downPayment: e.target.value }))} />
                  </div>
                  <div className="form-group col-md-4">
                    <label>Hình thức thu</label>
                    <select className="form-control" value={approveForm.paymentMethod} onChange={(e) => setApproveForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
                      <option value="Cash">Tiền mặt</option>
                      <option value="BankTransfer">Chuyển khoản</option>
                    </select>
                  </div>
                  <div className="form-group col-md-4">
                    <label>Đối tác tài chính</label>
                    <input className="form-control" value={approveTarget.financePartner || 'Khách chưa chọn'} readOnly />
                    <small className="text-muted">Đối tác do khách chọn khi gửi hồ sơ.</small>
                  </div>
                </div>
                <div className="form-group">
                  <label>Ghi chú</label>
                  <input className="form-control" value={approveForm.note} onChange={(e) => setApproveForm((f) => ({ ...f, note: e.target.value }))} />
                </div>
                <div className="alert alert-info py-2 mb-0 small">
                  Còn lại do đối tác tài chính xử lý: <strong>{formatCurrency(Math.max(0, (Number(approveForm.unitPrice) || 0) * (Number(approveForm.qty) || 0) - (Number(approveForm.downPayment) || 0)))}</strong>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setApproveTarget(null)}>Hủy</button>
                <button className="btn btn-success" onClick={submitApprove}>Duyệt & tạo đơn</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal từ chối */}
      {rejectTarget && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Từ chối hồ sơ {rejectTarget.code}</h5>
                <button className="close" onClick={() => setRejectTarget(null)}>&times;</button>
              </div>
              <div className="modal-body">
                <label>Lý do</label>
                <textarea className="form-control" rows="3" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setRejectTarget(null)}>Hủy</button>
                <button className="btn btn-danger" onClick={submitReject}>Từ chối hồ sơ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal chi tiết hồ sơ */}
      {detailTarget && (() => {
        const p = parseProfile(detailTarget);
        return (
          <div className="modal d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Hồ sơ trả góp {detailTarget.code}</h5>
                  <button className="close" onClick={() => setDetailTarget(null)}>&times;</button>
                </div>
                <div className="modal-body">
                  <h6 className="text-muted text-uppercase small font-weight-bold">Thông tin chung</h6>
                  <table className="table table-sm mb-3">
                    <tbody>
                      <DetailRow label="Khách hàng" value={detailTarget.customerName} />
                      <DetailRow label="Số điện thoại" value={detailTarget.customerPhone} />
                      <DetailRow label="Email" value={detailTarget.customerEmail} />
                      <DetailRow label="Sản phẩm quan tâm" value={detailTarget.productSnapshot} />
                      <DetailRow label="Đối tác tài chính" value={detailTarget.financePartner} />
                      <DetailRow label="Kỳ hạn" value={detailTarget.months ? `${detailTarget.months} tháng` : ''} />
                      <DetailRow label="Tiền trả trước" value={formatCurrency(detailTarget.downPayment)} />
                      <DetailRow label="Trạng thái" value={STATUS_LABELS[detailTarget.applicationStatus] || detailTarget.applicationStatus} />
                      <DetailRow label="Ngày gửi" value={formatDate(detailTarget.createdDate)} />
                      <DetailRow label="Đơn bán" value={detailTarget.orderId ? (detailTarget.orderCode || `#${detailTarget.orderId}`) : ''} />
                    </tbody>
                  </table>

                  <h6 className="text-muted text-uppercase small font-weight-bold">Hồ sơ người vay</h6>
                  <table className="table table-sm mb-3">
                    <tbody>
                      <DetailRow label="Số CCCD/CMND" value={p.idNumber} />
                      <DetailRow label="Ngày cấp" value={p.idIssueDate} />
                      <DetailRow label="Nơi cấp" value={p.idIssuePlace} />
                      <DetailRow label="Ngày sinh" value={p.birthDate} />
                      <DetailRow label="Địa chỉ thường trú" value={p.residence} />
                      <DetailRow label="Nghề nghiệp" value={p.occupation} />
                      <DetailRow label="Công ty" value={p.company} />
                      <DetailRow label="Thâm niên" value={p.workMonths} />
                      <DetailRow label="Thu nhập" value={p.monthlyIncome} />
                    </tbody>
                  </table>

                  <h6 className="text-muted text-uppercase small font-weight-bold">Giao nhận & ghi chú</h6>
                  <table className="table table-sm mb-0">
                    <tbody>
                      <DetailRow label="Người liên hệ" value={p.contact} />
                      <DetailRow label="Hình thức nhận" value={p.receiving} />
                      <DetailRow label="Ghi chú khách" value={p.customerNote} />
                    </tbody>
                  </table>
                </div>
                <div className="modal-footer">
                  {detailTarget.applicationStatus === 'Pending' && (
                    <button className="btn btn-success mr-auto" onClick={() => { const t = detailTarget; setDetailTarget(null); openApprove(t); }}>Duyệt &amp; tạo đơn</button>
                  )}
                  <button className="btn btn-secondary" onClick={() => setDetailTarget(null)}>Đóng</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default InstallmentApplications;
