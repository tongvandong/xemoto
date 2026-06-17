import React, { useEffect, useMemo, useState } from 'react';
import advancedOperationsService from '../../services/advancedOperationsService';
import businessOperationsService from '../../services/businessOperationsService';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate, formatDateShort } from '../../utils/formatDate';

const emptyReturnLine = { orderLineId: '', qty: 1, itemCondition: 'Resellable' };
const emptyReturn = { orderId: '', reason: '', note: '', lines: [{ ...emptyReturnLine }] };
const emptyApproval = { refundAmount: 0, refundMethod: 'Cash', note: '' };

const labels = {
  Draft: 'Chờ duyệt', Approved: 'Đã duyệt', Rejected: 'Từ chối', Paid: 'Đã hoàn',
  Cash: 'Tiền mặt', BankTransfer: 'Chuyển khoản',
  Resellable: 'Có thể bán lại', Damaged: 'Hư hỏng', Warranty: 'Hư hỏng',
};
const badge = (value) => (
  <span className={`badge badge-${value === 'Approved' || value === 'Paid' ? 'success' : value === 'Rejected' ? 'danger' : 'info'}`}>
    {labels[value] || value}
  </span>
);
const message = (err, fallback) => err?.response?.data?.message || fallback;
const getOrderCustomerName = (order) => order.shippingRecipient || order.customerName || order.fullName || '';
const getOrderCustomerPhone = (order) => order.shippingPhone || order.customerPhone || order.phoneNumber || '';
const getOrderDate = (order) => order.placedAt || order.createdDate || order.createdAt;
const getOrderSearchText = (order) => [
  order.code,
  getOrderCustomerName(order),
  getOrderCustomerPhone(order),
  formatDateShort(getOrderDate(order)),
  order.grandTotal,
].filter(Boolean).join(' ').toLowerCase();
const formatOrderOption = (order) => {
  const customer = getOrderCustomerName(order) || 'Khach le';
  const phone = getOrderCustomerPhone(order);
  const date = formatDateShort(getOrderDate(order));
  return [
    order.code,
    customer,
    phone,
    date,
    formatCurrency(order.grandTotal),
  ].filter(Boolean).join(' - ');
};

const ReturnsRefunds = () => {
  const [tab, setTab] = useState('returns');
  const [returns, setReturns] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [returnStatus, setReturnStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [showReturn, setShowReturn] = useState(false);
  const [editingReturn, setEditingReturn] = useState(null);
  const [detailReturn, setDetailReturn] = useState(null);
  const [approvalTarget, setApprovalTarget] = useState(null);
  const [returnForm, setReturnForm] = useState(emptyReturn);
  const [approvalForm, setApprovalForm] = useState(emptyApproval);
  const [orderKeyword, setOrderKeyword] = useState('');

  const selectedOrder = useMemo(
    () => orders.find((x) => String(x.id) === String(returnForm.orderId)),
    [orders, returnForm.orderId],
  );
  const filteredOrderOptions = useMemo(() => {
    const text = orderKeyword.trim().toLowerCase();
    if (!text) return orders;
    return orders.filter((order) => getOrderSearchText(order).includes(text));
  }, [orders, orderKeyword]);
  const filteredReturns = useMemo(() => returns.filter((row) => (!returnStatus || row.returnStatus === returnStatus)
    && (!keyword || `${row.code} ${row.orderCode} ${row.reason}`.toLowerCase().includes(keyword.toLowerCase()))), [returns, returnStatus, keyword]);
  const filteredRefunds = useMemo(() => refunds.filter((row) => !keyword || `${row.code} ${row.orderCode}`.toLowerCase().includes(keyword.toLowerCase())), [refunds, keyword]);

  const load = async () => {
    setError('');
    try {
      const [returnRes, refundRes, lookupRes] = await Promise.all([
        advancedOperationsService.getReturns(),
        advancedOperationsService.getRefunds(),
        businessOperationsService.getLookups(),
      ]);
      setReturns(returnRes.data.items || []);
      setRefunds(refundRes.data.items || []);
      setOrders(lookupRes.data.orders || []);
    } catch (err) {
      setError(message(err, 'Không thể tải dữ liệu trả hàng/hoàn tiền.'));
    }
  };

  useEffect(() => { load(); }, []);

  const resetReturnForm = () => {
    setEditingReturn(null);
    setReturnForm({ ...emptyReturn, lines: [{ ...emptyReturnLine }] });
  };

  const openCreateReturn = () => {
    resetReturnForm();
    setOrderKeyword('');
    setShowReturn(true);
  };

  const openEditReturn = (row) => {
    setEditingReturn(row);
    setOrderKeyword('');
    setReturnForm({
      orderId: row.orderId || '',
      reason: row.reason || '',
      note: row.note || '',
      lines: row.lines?.length
        ? row.lines.map((line) => ({
          orderLineId: line.orderLineId,
          qty: line.qty,
          itemCondition: line.itemCondition || 'Resellable',
        }))
        : [{ ...emptyReturnLine }],
    });
    setShowReturn(true);
  };

  const updateReturnLine = (index, field, value) => {
    setReturnForm((prev) => ({ ...prev, lines: prev.lines.map((line, i) => (i === index ? { ...line, [field]: value } : line)) }));
  };
  const selectReturnOrder = (orderId) => {
    setReturnForm((prev) => ({ ...prev, orderId, lines: [{ ...emptyReturnLine }] }));
  };
  const addReturnLine = () => setReturnForm((prev) => ({ ...prev, lines: [...prev.lines, { ...emptyReturnLine }] }));
  const removeReturnLine = (index) => setReturnForm((prev) => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index) }));

  const saveReturn = async () => {
    const lines = returnForm.lines.filter((line) => line.orderLineId && Number(line.qty) > 0)
      .map((line) => ({ orderLineId: Number(line.orderLineId), qty: Number(line.qty), itemCondition: line.itemCondition }));
    if (!returnForm.orderId || !returnForm.reason.trim() || !lines.length) {
      alert('Vui lòng chọn đơn hàng, sản phẩm trả và nhập lý do.');
      return;
    }
    if (new Set(lines.map((line) => line.orderLineId)).size !== lines.length) {
      alert('Một sản phẩm chỉ được thêm một lần trong phiếu trả hàng.');
      return;
    }
    try {
      const payload = { orderId: Number(returnForm.orderId), reason: returnForm.reason, note: returnForm.note || null, lines };
      if (editingReturn) await advancedOperationsService.updateReturn(editingReturn.id, payload);
      else await advancedOperationsService.createReturn(payload);
      setShowReturn(false);
      resetReturnForm();
      await load();
    } catch (err) {
      alert(message(err, editingReturn ? 'Cập nhật phiếu trả hàng thất bại.' : 'Tạo phiếu trả hàng thất bại.'));
    }
  };

  const openApproval = (row) => {
    setApprovalTarget(row);
    setApprovalForm({ ...emptyApproval, refundAmount: row.maxRefundAmount || 0 });
  };

  const approve = async () => {
    try {
      await advancedOperationsService.approveReturn(approvalTarget.id, {
        ...approvalForm,
        refundAmount: Number(approvalForm.refundAmount),
        note: approvalForm.note || null,
      });
      setApprovalTarget(null);
      await load();
    } catch (err) {
      alert(message(err, 'Duyệt trả hàng thất bại.'));
    }
  };

  const reject = async (row) => {
    const note = window.prompt('Lý do từ chối');
    if (!note?.trim()) { alert('Vui lòng nhập lý do từ chối.'); return; }
    try {
      await advancedOperationsService.rejectReturn(row.id, { note });
      await load();
    } catch (err) {
      alert(message(err, 'Từ chối trả hàng thất bại.'));
    }
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid"><h1 className="m-0">Trả hàng & hoàn tiền</h1></div>
      </div>
      <section className="content">
        <div className="container-fluid">
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="card">
            <div className="card-header border-b border-slate-200 px-4 pt-3">
              <div className="flex flex-wrap gap-x-2 gap-y-1" role="tablist" aria-label="Trả hàng và hoàn tiền">
                {[['returns', 'Trả hàng'], ['refunds', 'Hoàn tiền']].map(([key, text]) => (
                  <button key={key} type="button" role="tab" aria-selected={tab === key}
                    className={`border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${tab === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'}`}
                    onClick={() => { setTab(key); setKeyword(''); }}>
                    {text}
                  </button>
                ))}
              </div>
            </div>
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-5">
                  <input className="form-control" placeholder="Tìm theo mã phiếu, mã đơn hoặc khách hàng" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
                </div>
                {tab === 'returns' && (
                  <div className="col-md-3">
                    <select className="form-control" value={returnStatus} onChange={(e) => setReturnStatus(e.target.value)}>
                      <option value="">Tất cả trạng thái</option>
                      <option value="Draft">Chờ duyệt</option>
                      <option value="Approved">Đã duyệt</option>
                      <option value="Rejected">Từ chối</option>
                    </select>
                  </div>
                )}
              </div>

              {tab === 'returns' && (
                <>
                  <button className="btn btn-primary mb-3" onClick={openCreateReturn}>
                    <i className="fas fa-undo mr-1" />Tạo phiếu trả hàng
                  </button>
                  <Table headers={['Mã phiếu', 'Đơn hàng', 'Lý do', 'Hoàn tiền', 'Trạng thái', 'Ngày tạo', 'Thao tác']} empty="Chưa có phiếu trả hàng.">
                    {filteredReturns.map((row) => (
                      <tr key={row.id}>
                        <td>{row.code}</td>
                        <td>{row.orderCode}</td>
                        <td>{row.reason}</td>
                        <td className="text-right">{formatCurrency(row.refundAmount)}</td>
                        <td>{badge(row.returnStatus)}</td>
                        <td>{formatDate(row.createdDate)}</td>
                        <td className="text-nowrap">
                          <button className="btn btn-info btn-xs mr-1" onClick={() => setDetailReturn(row)}><i className="fas fa-eye" /></button>
                          {row.returnStatus === 'Draft' && (
                            <>
                              <button className="btn btn-warning btn-xs mr-1" onClick={() => openEditReturn(row)} title="Sửa phiếu"><i className="fas fa-edit" /></button>
                              <button className="btn btn-success btn-xs mr-1" onClick={() => openApproval(row)}>Duyệt</button>
                              <button className="btn btn-danger btn-xs" onClick={() => reject(row)}>Từ chối</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </Table>
                </>
              )}

              {tab === 'refunds' && (
                <Table headers={['Mã hoàn tiền', 'Đơn hàng', 'Số tiền', 'Hình thức', 'Trạng thái', 'Ngày hoàn']} empty="Chưa có khoản hoàn tiền.">
                  {filteredRefunds.map((row) => (
                    <tr key={row.id}>
                      <td>{row.code}</td>
                      <td>{row.orderCode}</td>
                      <td className="text-right">{formatCurrency(row.amount)}</td>
                      <td>{labels[row.method] || row.method}</td>
                      <td>{badge(row.refundStatus)}</td>
                      <td>{formatDate(row.refundedAt)}</td>
                    </tr>
                  ))}
                </Table>
              )}
            </div>
          </div>
        </div>
      </section>

      {showReturn && (
        <Modal title={editingReturn ? `Sửa phiếu trả hàng - ${editingReturn.code}` : 'Tạo phiếu trả hàng'} close={() => setShowReturn(false)} save={saveReturn} saveText={editingReturn ? 'Cập nhật' : 'Lưu'}>
          <div className="alert alert-info">Sản phẩm trả đạt điều kiện bán lại sẽ được nhập về tồn kho chung sau khi duyệt.</div>
          <OrderPicker
            keyword={orderKeyword}
            setKeyword={setOrderKeyword}
            orders={filteredOrderOptions}
            selectedOrderId={returnForm.orderId}
            onSelect={selectReturnOrder}
          />
          {returnForm.lines.map((line, index) => (
            <div className="row" key={index}>
              <div className="col-md-6"><Select label="Sản phẩm trả" value={line.orderLineId} set={(v) => updateReturnLine(index, 'orderLineId', v)} items={selectedOrder?.lines || []} option={(x) => `${x.productNameSnapshot} - ${x.skuCodeSnapshot} (đã mua ${x.qty})`} /></div>
              <div className="col-md-2"><Field label="Số lượng" type="number" min="1" value={line.qty} set={(v) => updateReturnLine(index, 'qty', v)} /></div>
              <div className="col-md-3"><Select label="Tình trạng" value={line.itemCondition === 'Warranty' ? 'Damaged' : line.itemCondition} set={(v) => updateReturnLine(index, 'itemCondition', v)} items={[{ id: 'Resellable', name: 'Có thể bán lại' }, { id: 'Damaged', name: 'Hư hỏng' }]} option={(x) => x.name} /></div>
              <div className="col-md-1 d-flex align-items-end"><button className="btn btn-danger mb-3" disabled={returnForm.lines.length === 1} onClick={() => removeReturnLine(index)}><i className="fas fa-trash" /></button></div>
            </div>
          ))}
          <button className="btn btn-outline-primary mb-3" onClick={addReturnLine}><i className="fas fa-plus mr-1" />Thêm sản phẩm</button>
          <Field label="Lý do" value={returnForm.reason} set={(v) => setReturnForm({ ...returnForm, reason: v })} />
          <Field label="Ghi chú" value={returnForm.note} set={(v) => setReturnForm({ ...returnForm, note: v })} />
        </Modal>
      )}

      {approvalTarget && (
        <Modal title={`Duyệt trả hàng - ${approvalTarget.code}`} close={() => setApprovalTarget(null)} save={approve} saveText="Xác nhận">
          <div className="alert alert-info">Tối đa có thể hoàn: <strong>{formatCurrency(approvalTarget.maxRefundAmount)}</strong></div>
          <Field label="Số tiền hoàn" type="number" min="0" value={approvalForm.refundAmount} set={(v) => setApprovalForm({ ...approvalForm, refundAmount: v })} />
          <Select label="Hình thức hoàn" value={approvalForm.refundMethod} set={(v) => setApprovalForm({ ...approvalForm, refundMethod: v })} items={[{ id: 'Cash', name: 'Tiền mặt' }, { id: 'BankTransfer', name: 'Chuyển khoản' }]} option={(x) => x.name} />
          <Field label="Ghi chú duyệt" value={approvalForm.note} set={(v) => setApprovalForm({ ...approvalForm, note: v })} />
        </Modal>
      )}

      {detailReturn && (
        <Modal title={`Chi tiết phiếu trả hàng - ${detailReturn.code}`} close={() => setDetailReturn(null)}>
          <p><strong>Đơn hàng:</strong> {detailReturn.orderCode}</p>
          <p><strong>Lý do:</strong> {detailReturn.reason}</p>
          <p><strong>Trạng thái:</strong> {badge(detailReturn.returnStatus)}</p>
          <Table headers={['SKU', 'Sản phẩm', 'Số lượng', 'Tình trạng', 'Thành tiền']} empty="Chưa có sản phẩm.">
            {detailReturn.lines.map((line) => (
              <tr key={line.id}>
                <td>{line.skuCode}</td>
                <td>{line.productName}</td>
                <td className="text-right">{line.qty}</td>
                <td>{labels[line.itemCondition] || line.itemCondition}</td>
                <td className="text-right">{formatCurrency(line.lineTotal)}</td>
              </tr>
            ))}
          </Table>
        </Modal>
      )}
    </div>
  );
};

const Table = ({ headers, empty, children }) => (
  <div className="table-responsive">
    <table className="table table-bordered table-striped">
      <thead><tr>{headers.map((x) => <th key={x}>{x}</th>)}</tr></thead>
      <tbody>{React.Children.count(children) ? children : <tr><td colSpan={headers.length} className="text-center text-muted">{empty}</td></tr>}</tbody>
    </table>
  </div>
);
const OrderPicker = ({ keyword, setKeyword, orders, selectedOrderId, onSelect }) => (
  <div className="form-group">
    <label>Tìm và chọn đơn hàng đã giao</label>
    <input
      className="form-control"
      placeholder="Nhập mã đơn, tên khách hoặc số điện thoại"
      value={keyword}
      onChange={(e) => setKeyword(e.target.value)}
    />
    <div className="mt-2 max-h-56 overflow-y-auto rounded border border-slate-200 bg-white">
      {orders.length === 0 ? (
        <div className="px-3 py-2 text-sm text-slate-500">Không tìm thấy đơn đã giao phù hợp.</div>
      ) : orders.map((order) => {
        const selected = String(order.id) === String(selectedOrderId);
        return (
          <button
            key={order.id}
            type="button"
            className={`block w-full border-0 border-b border-slate-100 px-3 py-2 text-left text-sm ${selected ? 'bg-blue-50 text-blue-700' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
            onClick={() => onSelect(order.id)}
          >
            <div className="font-semibold">{order.code} - {getOrderCustomerName(order) || 'Khách lẻ'}</div>
            <div className="text-xs text-slate-500">
              {[getOrderCustomerPhone(order), formatDateShort(getOrderDate(order)), formatCurrency(order.grandTotal)].filter(Boolean).join(' - ')}
            </div>
          </button>
        );
      })}
    </div>
  </div>
);
const Field = ({ label, value, set, type = 'text', min }) => <div className="form-group"><label>{label}</label><input type={type} min={min} className="form-control" value={value} onChange={(e) => set(e.target.value)} /></div>;
const Select = ({ label, value, set, items = [], option }) => <div className="form-group"><label>{label}</label><select className="form-control" value={value} onChange={(e) => set(e.target.value)}><option value="">-- Chọn --</option>{items.map((x) => <option key={x.id} value={x.id}>{option(x)}</option>)}</select></div>;
const Modal = ({ title, close, save, saveText = 'Lưu', children }) => <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}><div className="modal-dialog modal-xl"><div className="modal-content"><div className="modal-header"><h5>{title}</h5><button className="close" onClick={close}>&times;</button></div><div className="modal-body">{children}</div><div className="modal-footer"><button className="btn btn-secondary" onClick={close}>Đóng</button>{save && <button className="btn btn-primary" onClick={save}>{saveText}</button>}</div></div></div></div>;

export default ReturnsRefunds;
