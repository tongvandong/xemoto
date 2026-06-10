import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import orderService from '../../services/orderService';
import paymentService from '../../services/paymentService';
import operationsService from '../../services/operationsService';
import inventoryService from '../../services/inventoryService';
import {
  ORDER_NEXT_STATUS,
  ORDER_STATUS_OPTIONS,
  PAYMENT_METHODS,
  getOrderStatusMeta,
  getPaymentStatusMeta,
  getShippingStatusMeta,
} from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { formatMoneyInput, normalizeMoneyInput } from '../../utils/moneyInput';
import { printVatInvoice } from '../../utils/vatInvoice';

const isLockedOrder = (status) => ['Cancelled', 'Delivered', 'Completed'].includes(status);
const canCancelOrder = (status) => !['Cancelled', 'Delivered', 'Completed'].includes(status);
const EVENT_LABELS = {
  Created: 'Tạo đơn',
  OrderStatus: 'Trạng thái đơn',
  PaymentStatus: 'Thanh toán',
  ShippingStatus: 'Đồng bộ giao nhận',
};

const formatTimelineDate = (value) => {
  if (!value) return '';
  const raw = String(value);
  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

const getTimelineTimestamp = (value) => {
  if (!value) return 0;
  const raw = String(value);
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentType, setPaymentType] = useState('Full');
  const [updating, setUpdating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ recipient: '', phone: '', email: '', address: '', note: '' });
  const [editLines, setEditLines] = useState([]);
  const [editSkus, setEditSkus] = useState([]);
  const [editSkuPick, setEditSkuPick] = useState('');

  const fetchOrder = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await orderService.getById(id);
      setOrder(res.data);
    } catch (err) {
      setError('Không thể tải thông tin đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  useEffect(() => {
    operationsService.getSettings()
      .then((res) => {
        const list = res.data?.items || res.data || [];
        const map = {};
        list.forEach((s) => { if (s?.key) map[s.key] = s.value; });
        setSettings(map);
      })
      .catch(() => {});
  }, []);

  const orderStatus = order?.trangThaiDonHang || order?.trangThai || order?.status || order?.orderStatus || '';
  const paymentStatus = order?.trangThaiThanhToan || order?.paymentStatus || order?.thanhToan?.trangThai || order?.payment?.status || '';
  const currentPayments = order?.payments || [];
  const getPaymentRecordStatus = (item) => item?.status || item?.paymentRecordStatus || item?.trangThai || '';
  const pendingPayments = currentPayments.filter((item) => getPaymentRecordStatus(item) === 'Pending');
  const hasPendingPayment = pendingPayments.length > 0;
  const orderType = order?.orderType || order?.loaiDon || 'FullPayment';
  const depositAmount = Number(order?.depositAmount ?? order?.tienCoc ?? 0);
  const remainingAmount = Number(order?.remainingAmount ?? order?.tienConLai ?? 0);
  const grandTotalAmount = Number(order?.grandTotal ?? order?.tongThanhToan ?? order?.tongTien ?? order?.totalAmount ?? 0);
  const paidSoFar = Math.max(0, grandTotalAmount - remainingAmount);
  const isFullyPaid = grandTotalAmount > 0 && remainingAmount <= 0;
  // Loại thanh toán hợp lệ theo trạng thái: chưa thu gì → Thu đủ/Đặt cọc; đã thu một phần → Thu phần còn lại/Trả góp.
  const paymentTypeOptions = paidSoFar > 0
    ? [['Remaining', 'Thu phần còn lại'], ['Installment', 'Trả góp/đợt']]
    : [['Full', 'Thanh toán đủ'], ['Deposit', 'Đặt cọc'], ['Installment', 'Trả góp/đợt']];

  const openPaymentModal = () => {
    if (hasPendingPayment) {
      alert('Đơn đang có phiếu chuyển khoản chờ xác nhận. Hãy xác nhận hoặc hủy phiếu chuyển khoản đó trước khi ghi nhận thanh toán thủ công.');
      return;
    }
    setPaymentType(paidSoFar > 0 ? 'Remaining' : (orderType === 'Deposit' ? 'Deposit' : 'Full'));
    setPaymentAmount(remainingAmount > 0 ? String(remainingAmount) : '');
    setPaymentMethod('Cash');
    setPaymentNote('');
    setShowPaymentModal(true);
  };

  const nextStatusOptions = useMemo(() => {
    const allowed = ORDER_NEXT_STATUS[orderStatus] || [];
    return ORDER_STATUS_OPTIONS.filter((opt) => allowed.includes(opt.value));
  }, [orderStatus]);

  const renderBadge = (meta) => <span className={`badge badge-${meta.color}`}>{meta.label}</span>;

  const runUpdate = async (request, onDone) => {
    setUpdating(true);
    try {
      await request();
      onDone?.();
      await fetchOrder();
    } catch (err) {
      alert(err?.response?.data?.message || 'Cập nhật thất bại. Vui lòng thử lại.');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!newStatus) return;
    if (newStatus === 'Cancelled' && !cancelReason.trim()) {
      alert('Vui lòng nhập lý do hủy đơn.');
      return;
    }
    await runUpdate(
      () => newStatus === 'Cancelled'
        ? orderService.cancel(id, { reason: cancelReason.trim() })
        : orderService.updateStatus(id, { toStatus: newStatus, note: cancelReason.trim() || undefined }),
      () => {
        setShowStatusModal(false);
        setNewStatus('');
        setCancelReason('');
      }
    );
  };

  const handleUpdatePaymentStatus = async () => {
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    await runUpdate(
      () => paymentService.record({
        orderId: Number(id),
        paymentType,
        amount,
        method: paymentMethod,
        note: paymentNote.trim() || undefined,
      }),
      () => {
        setShowPaymentModal(false);
        setPaymentAmount('');
        setPaymentNote('');
      }
    );
  };

  const handleConfirmPayment = async (paymentId) => {
    if (!window.confirm('Xác nhận đã nhận được khoản chuyển khoản này? Đơn sẽ chuyển sang đã thanh toán.')) return;
    await runUpdate(() => paymentService.confirm(paymentId));
  };

  const handleCancelPendingPayment = async (paymentId) => {
    const reason = window.prompt('Nhập lý do hủy phiếu chuyển khoản chờ xác nhận:', 'Khách đổi phương thức thanh toán');
    if (reason === null) return;
    await runUpdate(() => paymentService.cancel(paymentId, { reason: reason.trim() || 'Hủy phiếu chuyển khoản chờ xác nhận' }));
  };

  const openEditModal = () => {
    setEditForm({
      recipient: order.shippingRecipient || order.hoTenNhanHang || '',
      phone: order.shippingPhone || order.soDienThoai || '',
      email: order.shippingEmail || order.email || '',
      address: order.shippingAddress || order.diaChi || '',
      note: order.note || order.ghiChu || '',
    });
    setEditLines((order.lines || order.items || []).map((l) => ({
      skuId: l.skuId ?? l.maBienSanPham,
      skuCode: l.skuCode || l.skuCodeSnapshot || l.sku || '',
      productName: l.productName || l.tenSanPham || '',
      unitPrice: Number(l.unitPrice ?? l.donGia ?? 0),
      qty: Number(l.qty ?? l.soLuong ?? 0),
    })));
    setShowEditModal(true);
    if (orderStatus === 'Pending' && editSkus.length === 0) {
      inventoryService.getSkus().then((res) => {
        const d = res.data; setEditSkus(Array.isArray(d) ? d : d.items || d.data || []);
      }).catch(() => {});
    }
  };
  const editUpdateLine = (skuId, field, value) => setEditLines((p) => p.map((l) => (l.skuId === skuId ? { ...l, [field]: value } : l)));
  const editRemoveLine = (skuId) => setEditLines((p) => p.filter((l) => l.skuId !== skuId));
  const editAddSku = () => {
    const s = editSkus.find((x) => String(x.id) === String(editSkuPick));
    if (!s) return;
    setEditLines((p) => (p.find((l) => l.skuId === s.id)
      ? p.map((l) => (l.skuId === s.id ? { ...l, qty: l.qty + 1 } : l))
      : [...p, { skuId: s.id, skuCode: s.skuCode, productName: s.productName, unitPrice: Number(s.salePrice ?? s.listPrice ?? 0), qty: 1 }]));
    setEditSkuPick('');
  };
  const handleUpdateOrder = async () => {
    const payload = {
      shippingRecipient: editForm.recipient.trim() || null,
      shippingPhone: editForm.phone.trim() || null,
      shippingEmail: editForm.email.trim() || null,
      shippingAddress: editForm.address.trim() || null,
      note: editForm.note.trim() || null,
    };
    if (orderStatus === 'Pending') {
      if (editLines.length === 0) { alert('Đơn phải có ít nhất 1 sản phẩm.'); return; }
      if (editLines.some((l) => Number(l.qty) <= 0)) { alert('Số lượng không hợp lệ.'); return; }
      payload.lines = editLines.map((l) => ({ skuId: l.skuId, qty: Number(l.qty), unitPrice: Number(l.unitPrice) }));
    }
    await runUpdate(() => orderService.update(id, payload), () => setShowEditModal(false));
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      alert('Vui lòng nhập lý do hủy đơn.');
      return;
    }
    setUpdating(true);
    try {
      await orderService.cancel(id, { reason: cancelReason.trim() });
      setShowCancelModal(false);
      setCancelReason('');
      await fetchOrder();
    } catch (err) {
      alert(err?.response?.data?.message || 'Hủy đơn hàng thất bại. Vui lòng thử lại.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="content-wrapper">
        <section className="content">
          <div className="container-fluid">
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Đang tải...</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-wrapper">
        <section className="content">
          <div className="container-fluid">
            <div className="alert alert-danger mt-3">{error}</div>
            <button className="btn btn-default" onClick={() => navigate('/orders')}>
              <i className="fas fa-arrow-left"></i> Quay lại
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (!order) return null;

  const items = order.chiTiet || order.items || order.lines || [];
  const histories = order.lichSu || order.histories || order.orderHistories || [];
  const payments = currentPayments;
  const payment = order.thanhToan || order.payment || payments.find((item) => item.status !== 'Cancelled') || payments[0] || null;
  const voucher = order.voucher || null;
  const inventoryHolds = order.tonKhoGiuCho || order.inventoryHolds || [];
  const totalAmount = order.tongThanhToan ?? order.tongTien ?? order.totalAmount ?? order.grandTotal ?? 0;
  const customerName = order.hoTenNhanHang || order.tenKhachHang || order.customerName || order.shippingRecipient;
  const address = order.diaChiNhanHang || order.diaChi || order.address || order.shippingAddress;
  const phone = order.soDienThoaiNhanHang || order.soDienThoai || order.phone || order.shippingPhone;
  const email = order.emailNhanHang || order.email || order.shippingEmail;
  const actionsLocked = isLockedOrder(orderStatus);
  const orderCode = order.maDonHangKinhDoanh || order.maDonHang || order.orderCode || order.code || order.id;

  const handlePrintOrder = () => {
    const rows = items.map((item, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${item.tenSanPhamSnapshot || item.tenSanPham || item.productName || '-'}</td>
        <td>${item.skuSnapshot || item.sku || item.skuCode || '-'}</td>
        <td class="right">${formatCurrency(item.donGia || item.unitPrice || 0)}</td>
        <td class="right">${item.soLuong || item.quantity || item.qty || 0}</td>
        <td class="right">${formatCurrency(item.thanhTien || item.subtotal || item.lineTotal || (item.donGia || item.unitPrice || 0) * (item.soLuong || item.quantity || item.qty || 0))}</td>
      </tr>
    `).join('');

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Phiếu đơn hàng ${orderCode}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #222; padding: 24px; }
            h1 { font-size: 22px; margin: 0 0 6px; }
            h2 { font-size: 16px; margin: 24px 0 8px; }
            .muted { color: #666; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 13px; text-align: left; }
            th { background: #f3f4f6; }
            .right { text-align: right; }
            .total { font-size: 18px; font-weight: 700; color: #0d6efd; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 42px; text-align: center; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>MoToSale - Phiếu đơn hàng</h1>
          <div class="muted">Mã đơn: ${orderCode} | Ngày in: ${formatTimelineDate(new Date().toISOString())}</div>
          <div class="grid">
            <div>
              <h2>Thông tin đơn</h2>
              <div>Ngày tạo: ${formatDate(order.ngayTao || order.createdAt || order.placedAt)}</div>
              <div>Trạng thái đơn: ${getOrderStatusMeta(orderStatus).label}</div>
              <div>Thanh toán: ${getPaymentStatusMeta(paymentStatus).label}</div>
            </div>
            <div>
              <h2>Khách hàng</h2>
              <div>Họ tên: ${customerName || '-'}</div>
              <div>SĐT: ${phone || '-'}</div>
              <div>Email: ${email || '-'}</div>
              <div>Địa chỉ: ${address || '-'}</div>
            </div>
          </div>
          <h2>Sản phẩm</h2>
          <table>
            <thead>
              <tr><th>#</th><th>Sản phẩm</th><th>SKU</th><th class="right">Đơn giá</th><th class="right">SL</th><th class="right">Thành tiền</th></tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="6">Không có sản phẩm</td></tr>'}</tbody>
          </table>
          <p class="right total">Tổng thanh toán: ${formatCurrency(totalAmount)}</p>
          <div class="signatures">
            <div>Người lập phiếu<br><br><br>........................</div>
            <div>Khách hàng<br><br><br>........................</div>
          </div>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintVatInvoice = () => printVatInvoice(order, settings);

  const renderPendingPaymentCard = () => pendingPayments.length > 0 && (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Chuyển khoản chờ xác nhận</h3>
      </div>
      <div className="card-body p-0">
        <table className="table table-bordered mb-0">
          <thead>
            <tr>
              <th className="table-col-code">Mã phiếu</th>
              <th className="table-col-text">Phương thức</th>
              <th className="table-col-money">Số tiền</th>
              <th className="table-col-date">Thời gian</th>
              <th className="table-col-action"></th>
            </tr>
          </thead>
          <tbody>
            {pendingPayments.map((p) => (
              <tr key={p.id || p.maThanhToan}>
                <td className="table-col-code">{p.code || p.maThanhToan || p.id}</td>
                <td className="table-col-text">{PAYMENT_METHODS[p.method || p.phuongThuc] || p.method || p.phuongThuc || 'Chuyển khoản'}</td>
                <td className="table-col-money">{formatCurrency(p.amount || p.soTien || 0)}</td>
                <td className="table-col-date">{formatDate(p.createdAt || p.ngayTao || p.paidAt)}</td>
                <td className="table-col-action text-right">
                  <button className="btn btn-sm btn-success mr-2" disabled={updating} onClick={() => handleConfirmPayment(p.id)}>
                    Xác nhận thanh toán
                  </button>
                  <button className="btn btn-sm btn-outline-danger" disabled={updating} onClick={() => handleCancelPendingPayment(p.id)}>
                    Hủy phiếu
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <button className="btn btn-default mb-2" onClick={() => navigate('/orders')}>
            <i className="fas fa-arrow-left"></i> Quay lại
          </button>
          <button className="btn btn-outline-primary mb-2 ml-2" onClick={handlePrintOrder}>
            <i className="fas fa-print"></i> In phiếu đơn hàng
          </button>
          <button className="btn btn-outline-success mb-2 ml-2" onClick={handlePrintVatInvoice}>
            <i className="fas fa-file-invoice-dollar"></i> Hóa đơn VAT
          </button>
          {!['Delivered', 'Completed', 'Cancelled'].includes(orderStatus) && (
            <button className="btn btn-outline-warning mb-2 ml-2" onClick={openEditModal} disabled={updating}>
              <i className="fas fa-pen"></i> Sửa đơn
            </button>
          )}
          <h1 className="m-0">Chi tiết đơn hàng</h1>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-6">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Thông tin đơn hàng</h3></div>
                <div className="card-body">
                  <table className="table table-sm">
                    <tbody>
                      <tr><td><strong>Mã đơn:</strong></td><td>{order.maDonHangKinhDoanh || order.maDonHang || order.orderCode || order.code || order.id}</td></tr>
                      <tr><td><strong>Tổng tiền:</strong></td><td><strong className="text-primary">{formatCurrency(totalAmount)}</strong></td></tr>
                      <tr><td><strong>Ngày tạo:</strong></td><td>{formatDate(order.ngayTao || order.createdAt || order.placedAt)}</td></tr>
                      <tr><td><strong>Ghi chú:</strong></td><td>{order.ghiChu || order.note || '-'}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Thông tin khách hàng</h3></div>
                <div className="card-body">
                  <table className="table table-sm">
                    <tbody>
                      <tr><td><strong>Khách hàng:</strong></td><td>{customerName || '-'}</td></tr>
                      <tr><td><strong>Địa chỉ:</strong></td><td>{address || '-'}</td></tr>
                      <tr><td><strong>SĐT:</strong></td><td>{phone || '-'}</td></tr>
                      <tr><td><strong>Email:</strong></td><td>{email || '-'}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {renderPendingPaymentCard()}

          <div className="row">
            <StatusCard
              title="Trạng thái đơn hàng"
              badge={renderBadge(getOrderStatusMeta(orderStatus))}
              buttonText="Cập nhật trạng thái đơn"
              disabled={actionsLocked || nextStatusOptions.length === 0}
              onClick={() => setShowStatusModal(true)}
            />
            <StatusCard
              title="Thanh toán"
              badge={renderBadge(getPaymentStatusMeta(paymentStatus))}
              buttonText={hasPendingPayment ? 'Đang chờ xác nhận CK' : 'Cập nhật thanh toán'}
              disabled={orderStatus === 'Cancelled' || hasPendingPayment}
              onClick={openPaymentModal}
            />
          </div>

          <div className="card">
            <div className="card-header"><h3 className="card-title">Lịch sử đơn hàng</h3></div>
            <div className="card-body">
              <OrderTimeline order={order} histories={histories} />
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3 className="card-title">Sản phẩm trong đơn</h3></div>
            <div className="card-body p-0">
              <table className="table table-bordered table-striped mb-0">
                <thead>
                  <tr>
                    <th className="table-col-code">#</th>
                    <th className="table-col-text">Sản phẩm</th>
                    <th className="table-col-code">SKU</th>
                    <th className="table-col-money">Đơn giá</th>
                    <th className="table-col-number">Số lượng</th>
                    <th className="table-col-money">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan="6" className="text-center text-muted">Không có sản phẩm</td></tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={item.maChiTietDonHang || item.id || idx}>
                        <td className="table-col-code">{idx + 1}</td>
                        <td className="table-col-text">{item.tenSanPhamSnapshot || item.tenSanPham || item.productName || '-'}</td>
                        <td className="table-col-code">{item.skuSnapshot || item.sku || item.skuCode || '-'}</td>
                        <td className="table-col-money">{formatCurrency(item.donGia || item.unitPrice || 0)}</td>
                        <td className="table-col-number">{item.soLuong || item.quantity || item.qty || 0}</td>
                        <td className="table-col-money">{formatCurrency(item.thanhTien || item.subtotal || item.lineTotal || (item.donGia || item.unitPrice || 0) * (item.soLuong || item.quantity || item.qty || 0))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {(orderType === 'Deposit' || depositAmount > 0 || remainingAmount > 0) && (
            <div className="card">
              <div className="card-header"><h3 className="card-title">Cọc & công nợ</h3></div>
              <div className="card-body">
                <table className="table table-sm mb-0">
                  <tbody>
                    <tr><td><strong>Loại đơn:</strong></td><td>{orderType === 'Deposit' ? 'Đặt cọc' : 'Bán đứt'}</td></tr>
                    {depositAmount > 0 && <tr><td><strong>Tiền cọc:</strong></td><td>{formatCurrency(depositAmount)}</td></tr>}
                    <tr><td><strong>Còn phải thu:</strong></td><td className="font-weight-bold text-danger">{formatCurrency(remainingAmount)}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {payment && (
            <div className="card">
              <div className="card-header"><h3 className="card-title">Thông tin thanh toán</h3></div>
              <div className="card-body">
                <table className="table table-sm">
                  <tbody>
                    <tr><td><strong>Phương thức:</strong></td><td>{PAYMENT_METHODS[payment.phuongThuc || payment.method] || payment.phuongThuc || payment.method || '-'}</td></tr>
                    <tr><td><strong>Số tiền:</strong></td><td>{formatCurrency(payment.soTien || payment.amount || totalAmount)}</td></tr>
                    <tr><td><strong>Trạng thái:</strong></td><td>{renderBadge(getPaymentStatusMeta(paymentStatus))}</td></tr>
                    <tr><td><strong>Ngày thanh toán:</strong></td><td>{formatDate(payment.ngayThanhToan || payment.paidAt || order.ngayThanhToanThanhCong)}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {voucher && (
            <div className="card">
              <div className="card-header"><h3 className="card-title">Thông tin Voucher</h3></div>
              <div className="card-body">
                <table className="table table-sm">
                  <tbody>
                    <tr><td><strong>Mã voucher:</strong></td><td>{voucher.maVoucher || voucher.code || '-'}</td></tr>
                    <tr><td><strong>Giảm giá:</strong></td><td>{formatCurrency(voucher.giaTriGiam || voucher.discountAmount || 0)}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {inventoryHolds.length > 0 && (
            <div className="card">
              <div className="card-header"><h3 className="card-title">Tồn kho giữ chỗ</h3></div>
              <div className="card-body p-0">
                <table className="table table-bordered table-striped mb-0">
                  <thead>
                    <tr>
                      <th className="table-col-text">Sản phẩm</th>
                      <th className="table-col-text">Biến thể</th>
                      <th className="table-col-number">Số lượng giữ</th>
                      <th className="table-col-status">Trạng thái</th>
                      <th className="table-col-date">Hết hạn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryHolds.map((hold, idx) => (
                      <tr key={hold.id || idx}>
                        <td className="table-col-text">{hold.tenSanPham || hold.productName || '-'}</td>
                        <td className="table-col-text">{hold.tenBienThe || hold.variantName || '-'}</td>
                        <td className="table-col-number">{hold.soLuong || hold.quantity || 0}</td>
                        <td className="table-col-status"><span className={`badge badge-${hold.trangThai === 'Active' || hold.status === 'Active' ? 'warning' : 'secondary'}`}>{hold.trangThai || hold.status || '-'}</span></td>
                        <td className="table-col-date">{formatDate(hold.hetHan || hold.expiresAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mb-4">
            <button className="btn btn-danger" onClick={() => setShowCancelModal(true)} disabled={!canCancelOrder(orderStatus)}>
              <i className="fas fa-times"></i> Hủy đơn
            </button>
          </div>
        </div>
      </section>

      {showStatusModal && (
        <Modal title="Cập nhật trạng thái đơn hàng" onClose={() => setShowStatusModal(false)}>
          <div className="form-group">
            <label>Trạng thái hiện tại</label>
            <div>{renderBadge(getOrderStatusMeta(orderStatus))}</div>
          </div>
          <div className="form-group">
            <label>Trạng thái mới</label>
            <select className="form-control" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              <option value="">-- Chọn trạng thái --</option>
              {nextStatusOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          {newStatus === 'Cancelled' && (
            <div className="form-group">
              <label>Lý do hủy đơn <span className="text-danger">*</span></label>
              <textarea className="form-control" rows="3" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
            </div>
          )}
          {newStatus === 'Delivered' && (
            <div className="alert alert-warning">Chuyển sang Đã giao sẽ xuất kho thật và khóa các thao tác sửa/hủy thông thường.</div>
          )}
          <ModalFooter onClose={() => setShowStatusModal(false)} onSubmit={handleUpdateStatus} disabled={updating || !newStatus} loading={updating} submitText="Cập nhật" />
        </Modal>
      )}

      {showPaymentModal && (
        <Modal title="Ghi nhận thanh toán thủ công" onClose={() => setShowPaymentModal(false)}>
          {isFullyPaid ? (
            <div className="alert alert-success py-2 mb-2">Đơn đã thanh toán đủ — không cần thu thêm.</div>
          ) : (
            <div className="alert alert-info py-2 mb-2">
              <div>Tổng đơn: <strong>{formatCurrency(grandTotalAmount)}</strong></div>
              {paidSoFar > 0 && <div>Đã thu: <strong>{formatCurrency(paidSoFar)}</strong></div>}
              {depositAmount > 0 && <div>Tiền cọc: <strong>{formatCurrency(depositAmount)}</strong></div>}
              <div>Còn phải thu: <strong className="text-danger">{formatCurrency(remainingAmount)}</strong></div>
            </div>
          )}
          <div className="form-group">
            <label>Loại thanh toán</label>
            <select className="form-control" value={paymentType} onChange={(e) => setPaymentType(e.target.value)} disabled={isFullyPaid}>
              {paymentTypeOptions.map(([val, text]) => <option key={val} value={val}>{text}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Số tiền đã thu {remainingAmount > 0 && <span className="text-muted">(tối đa {formatCurrency(remainingAmount)})</span>}</label>
            <div className="input-group">
              <input
                type="text"
                inputMode="numeric"
                className="form-control"
                value={formatMoneyInput(paymentAmount)}
                onChange={(e) => setPaymentAmount(normalizeMoneyInput(e.target.value))}
                disabled={isFullyPaid}
              />
              {remainingAmount > 0 && (
                <div className="input-group-append">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setPaymentAmount(String(remainingAmount))}>Còn lại</button>
                </div>
              )}
            </div>
            {remainingAmount > 0 && Number(paymentAmount) > remainingAmount && (
              <small className="text-danger">Số tiền thu vượt quá số còn phải thu.</small>
            )}
          </div>
          <div className="form-group">
            <label>Phương thức</label>
            <select className="form-control" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="Cash">Tiền mặt</option>
              <option value="BankTransfer">Chuyển khoản</option>
            </select>
          </div>
          <div className="form-group">
            <label>Ghi chú thanh toán</label>
            <textarea className="form-control" rows="3" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
          </div>
          <ModalFooter onClose={() => setShowPaymentModal(false)} onSubmit={handleUpdatePaymentStatus} disabled={updating || isFullyPaid || Number(paymentAmount) <= 0 || (remainingAmount > 0 && Number(paymentAmount) > remainingAmount)} loading={updating} submitText="Ghi nhận" />
        </Modal>
      )}

      {showCancelModal && (
        <Modal title="Hủy đơn hàng" onClose={() => setShowCancelModal(false)}>
          <div className="form-group">
            <label>Lý do hủy đơn <span className="text-danger">*</span></label>
            <textarea className="form-control" rows="3" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          </div>
          <ModalFooter onClose={() => setShowCancelModal(false)} onSubmit={handleCancel} disabled={updating} loading={updating} submitText="Xác nhận hủy" danger />
        </Modal>
      )}

      {showEditModal && (
        <Modal title="Sửa đơn hàng" onClose={() => setShowEditModal(false)}>
          <div className="row">
            <div className="col-md-6 form-group"><label>Tên khách/người nhận</label>
              <input className="form-control" value={editForm.recipient} onChange={(e) => setEditForm({ ...editForm, recipient: e.target.value })} /></div>
            <div className="col-md-6 form-group"><label>Số điện thoại</label>
              <input className="form-control" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
            <div className="col-md-6 form-group"><label>Email</label>
              <input className="form-control" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
            <div className="col-md-6 form-group"><label>Địa chỉ</label>
              <input className="form-control" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></div>
            <div className="col-md-12 form-group"><label>Ghi chú</label>
              <textarea className="form-control" rows="2" value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} /></div>
          </div>

          {orderStatus === 'Pending' ? (
            <>
              <hr />
              <div className="d-flex align-items-end mb-2" style={{ gap: 8 }}>
                <div className="flex-fill">
                  <label className="mb-1">Thêm sản phẩm</label>
                  <select className="form-control form-control-sm" value={editSkuPick} onChange={(e) => setEditSkuPick(e.target.value)}>
                    <option value="">-- Chọn SKU --</option>
                    {editSkus.slice(0, 200).map((s) => <option key={s.id} value={String(s.id)}>{s.skuCode} · {s.productName}</option>)}
                  </select>
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={editAddSku} disabled={!editSkuPick}>Thêm</button>
              </div>
              <table className="table table-sm table-bordered">
                <thead><tr><th>Sản phẩm</th><th style={{ width: 130 }}>Đơn giá</th><th style={{ width: 90 }}>SL</th><th style={{ width: 40 }}></th></tr></thead>
                <tbody>
                  {editLines.length === 0 ? <tr><td colSpan="4" className="text-center text-muted">Chưa có sản phẩm</td></tr>
                    : editLines.map((l) => (
                      <tr key={l.skuId}>
                        <td>{l.productName}<div className="text-muted small">{l.skuCode}</div></td>
                        <td><input type="text" inputMode="numeric" className="form-control form-control-sm text-right" value={formatMoneyInput(l.unitPrice)} onChange={(e) => editUpdateLine(l.skuId, 'unitPrice', normalizeMoneyInput(e.target.value))} /></td>
                        <td><input type="number" min="1" className="form-control form-control-sm text-right" value={l.qty} onChange={(e) => editUpdateLine(l.skuId, 'qty', Number(e.target.value))} /></td>
                        <td className="text-center align-middle"><button type="button" className="btn btn-xs btn-danger" onClick={() => editRemoveLine(l.skuId)}><i className="fas fa-trash"></i></button></td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <small className="text-muted">Tạm tính: <strong>{formatCurrency(editLines.reduce((s, l) => s + Number(l.unitPrice || 0) * Number(l.qty || 0), 0))}</strong> — tổng tiền sẽ được tính lại khi lưu.</small>
            </>
          ) : (
            <div className="alert alert-info py-2 mb-0">Đơn đã xác nhận/thu tiền — chỉ sửa được thông tin khách & giao hàng, không sửa được sản phẩm. Muốn đổi sản phẩm phải hủy & tạo lại.</div>
          )}
          <ModalFooter onClose={() => setShowEditModal(false)} onSubmit={handleUpdateOrder} disabled={updating} loading={updating} submitText="Lưu" />
        </Modal>
      )}
    </div>
  );
};

const StatusCard = ({ title, badge, buttonText, disabled, onClick }) => (
  <div className="col-md-6">
    <div className="card">
      <div className="card-header"><h3 className="card-title">{title}</h3></div>
      <div className="card-body">
        <div className="mb-3">{badge}</div>
        <button className="btn btn-primary btn-sm" disabled={disabled} onClick={onClick}>
          <i className="fas fa-edit"></i> {buttonText}
        </button>
      </div>
    </div>
  </div>
);

const getHistoryValueLabel = (eventType, value) => {
  if (!value) return '-';
  if (eventType === 'OrderStatus') return getOrderStatusMeta(value).label;
  if (eventType === 'PaymentStatus') return getPaymentStatusMeta(value).label;
  if (eventType === 'ShippingStatus') return getShippingStatusMeta(value).label;
  return value;
};

const cleanHistoryNote = (note) => {
  if (!note) return '';
  return String(note)
    .replace(/^\s*(PaymentStatus|OrderStatus|ShippingStatus)\s*:\s*/i, '')
    .trim();
};

const EVENT_META = {
  Created: { color: 'secondary', icon: 'fa-plus' },
  OrderStatus: { color: 'info', icon: 'fa-clipboard-check' },
  PaymentStatus: { color: 'success', icon: 'fa-money-bill-wave' },
  ShippingStatus: { color: 'warning', icon: 'fa-truck' },
};

const getHistoryValueBadge = (eventType, value) => {
  if (!value) return <span className="text-muted">—</span>;
  let meta = null;
  if (eventType === 'OrderStatus') meta = getOrderStatusMeta(value);
  else if (eventType === 'PaymentStatus') meta = getPaymentStatusMeta(value);
  else if (eventType === 'ShippingStatus') meta = getShippingStatusMeta(value);
  if (meta) return <span className={`badge badge-${meta.color}`}>{meta.label}</span>;
  return <span className="badge badge-light border">{value}</span>;
};

const OrderTimeline = ({ order, histories }) => {
  const createdAt = order.ngayTao || order.createdAt || order.placedAt;
  const syntheticCreated = histories.length === 0 ? [
    {
      id: 'created',
      loaiSuKien: 'Created',
      giaTriCu: null,
      giaTriMoi: order.trangThaiDonHang || order.status || order.orderStatus || 'Pending',
      ghiChu: 'Đơn hàng được tạo',
      thoiGian: createdAt,
    },
  ] : [];
  const items = [
    ...syntheticCreated,
    ...histories.map((item) => ({
      id: item.maLichSuDonHang || item.id,
      loaiSuKien: item.loaiSuKien || item.eventType,
      giaTriCu: item.giaTriCu ?? item.oldValue,
      giaTriMoi: item.giaTriMoi ?? item.newValue,
      ghiChu: cleanHistoryNote(item.ghiChu || item.note),
      maNguoiThucHien: item.maNguoiThucHien || item.actorUserId,
      thoiGian: item.thoiGian || item.createdAt,
    })),
  ].filter((item) => item.thoiGian)
    .sort((a, b) => getTimelineTimestamp(a.thoiGian) - getTimelineTimestamp(b.thoiGian));

  if (items.length === 0) {
    return <div className="text-muted">Chưa có lịch sử đơn hàng.</div>;
  }

  return (
    <div className="order-timeline">
      {items.map((item, index) => {
        const meta = EVENT_META[item.loaiSuKien] || { color: 'secondary' };
        const isLast = index === items.length - 1;
        const hasFrom = item.loaiSuKien !== 'Created' && item.giaTriCu;
        return (
          <div key={`${item.id || index}-${item.loaiSuKien}`} className="d-flex">
            <div className="d-flex flex-column align-items-center mr-3" style={{ width: 14 }}>
              <span
                className={`bg-${meta.color}`}
                style={{ width: 13, height: 13, borderRadius: '50%', flexShrink: 0, marginTop: 4, boxShadow: '0 0 0 3px rgba(0,0,0,0.05)' }}
              />
              {!isLast && <span style={{ flex: 1, width: 2, background: '#e9ecef', marginTop: 4, marginBottom: 2 }} />}
            </div>
            <div className="flex-fill" style={{ minWidth: 0, paddingBottom: isLast ? 0 : 16 }}>
              <div className="d-flex justify-content-between align-items-center flex-wrap" style={{ gap: 6 }}>
                <span className={`badge badge-${meta.color}`}>
                  {EVENT_LABELS[item.loaiSuKien] || item.loaiSuKien || 'Sự kiện'}
                </span>
                <span className="text-muted small">{formatTimelineDate(item.thoiGian)}</span>
              </div>
              {item.loaiSuKien === 'Created' ? (
                <div className="mt-1 small text-muted">{item.ghiChu}</div>
              ) : (
                <div className="mt-2 d-flex flex-wrap align-items-center" style={{ gap: 8 }}>
                  {hasFrom && (
                    <>
                      {getHistoryValueBadge(item.loaiSuKien, item.giaTriCu)}
                      <span className="text-muted">→</span>
                    </>
                  )}
                  {getHistoryValueBadge(item.loaiSuKien, item.giaTriMoi)}
                </div>
              )}
              {item.ghiChu && item.loaiSuKien !== 'Created' && (
                <div className="text-muted small mt-1">{item.ghiChu}</div>
              )}
              {item.maNguoiThucHien && (
                <div className="text-muted small mt-1">Nhân viên #{item.maNguoiThucHien}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Modal = ({ title, onClose, children }) => (
  <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
    <div className="modal-dialog" style={{ maxHeight: '90vh' }}>
      <div className="modal-content" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h5 className="modal-title">{title}</h5>
          <button type="button" className="close" onClick={onClose}><span>&times;</span></button>
        </div>
        <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  </div>
);

const ModalFooter = ({ onClose, onSubmit, disabled, loading, submitText, danger = false }) => (
  <div className="modal-footer">
    <button className="btn btn-default" onClick={onClose}>Đóng</button>
    <button className={`btn btn-${danger ? 'danger' : 'primary'}`} onClick={onSubmit} disabled={disabled}>
      {loading ? 'Đang xử lý...' : submitText}
    </button>
  </div>
);

export default OrderDetail;
