import { useEffect, useState } from 'react';
import {
  FiBriefcase,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiFileText,
  FiPrinter,
  FiTrendingUp,
  FiUser,
  FiXCircle,
} from 'react-icons/fi';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { orderApi, reviewApi } from '../services/api.js';
import Breadcrumb from '../components/Breadcrumb.jsx';
import LoadingState from '../components/LoadingState.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotification } from '../contexts/NotificationContext.jsx';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters.js';
import { printInstallmentApplication } from '../utils/printInstallmentApplication.js';
import {
  getShippingStatusLabel, getShippingStatusColor,
  getPaymentStatusColor, getPaymentStatusContextual, getPaymentStatusLabel,
  getPaymentMethodLabel, getOrderTypeLabel, getReceivingMethodLabel,
  canCancelOrder,
  getInstallmentTermStatusLabel, getInstallmentTermStatusColor,
} from '../utils/statusMappings.js';
import {
  isOrderReviewable, getOrderItems, getReviewProductId, isItemReviewable,
} from '../utils/reviewEligibility.js';
import ReviewModal from '../components/product/ReviewModal.jsx';

function Badge({ label, colorClass }) {
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${colorClass}`}>{label}</span>;
}

const SHIPPING_STEPS = ['Preparing', 'Shipping', 'Delivered'];

function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated: isAuth } = useAuth();
  const { notify } = useNotification();
  const [order, setOrder] = useState(null);
  const [details, setDetails] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [reviewProduct, setReviewProduct] = useState(null);
  const [reviewStatusByProductId, setReviewStatusByProductId] = useState({});

  useEffect(() => {
    if (!isAuth) {
      navigate('/login', { replace: true });
      return;
    }

    fetchOrder();
  }, [id, isAuth]);

  async function fetchOrder() {
    setLoading(true);
    setError('');

    try {
      const res = await orderApi.getById(id);
      setOrder(res.order || res);
      setDetails(res.details?.$values || res.details || []);
      setVouchers(res.vouchers?.$values || res.vouchers || []);
      // Lịch sử thanh toán nằm sẵn trong chi tiết đơn (payments[]),
      // không gọi /payments/order vì endpoint đó chỉ dành cho admin/staff.
      setPayments(res.payments || []);

      try {
        setPaymentInfo(await orderApi.getPaymentInfo(id));
      } catch {
        setPaymentInfo(null);
      }
    } catch (err) {
      setError(err?.message || 'Không thể tải thông tin đơn hàng');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await orderApi.cancel(id, cancelReason.trim() || null);
      setShowCancelModal(false);
      fetchOrder();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Hủy đơn thất bại');
    } finally {
      setCancelling(false);
    }
  }

  // Tra trạng thái đã-đánh-giá cho từng sản phẩm khi đơn đủ điều kiện (dùng chung quy tắc với OrdersPage).
  useEffect(() => {
    if (!isAuth || !order || !isOrderReviewable(order)) {
      setReviewStatusByProductId((current) => (Object.keys(current).length ? {} : current));
      return undefined;
    }

    const productIds = [
      ...new Set(getOrderItems(order).map(getReviewProductId).filter(Boolean).map(String)),
    ];
    if (productIds.length === 0) return undefined;

    let active = true;
    Promise.all(
      productIds.map(async (productId) => {
        try {
          const state = await reviewApi.getMine(productId);
          return [productId, state?.myReview ? 'reviewed' : 'not-reviewed'];
        } catch {
          return [productId, 'unknown'];
        }
      }),
    ).then((entries) => {
      if (!active) return;
      setReviewStatusByProductId(Object.fromEntries(entries));
    });

    return () => {
      active = false;
    };
  }, [isAuth, order]);

  if (!isAuth) return null;

  if (loading) return (
    <div className="mx-auto max-w-[800px] px-4 py-16">
      <LoadingState message="Đang tải thông tin đơn hàng..." />
    </div>
  );

  if (error) return (
    <div className="mx-auto max-w-[800px] px-4 py-16 text-center">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}
        <button onClick={fetchOrder} className="ml-2 font-bold text-[#d71920] hover:underline">Thử lại</button>
      </div>
    </div>
  );

  if (!order) return null;

  const canCancel = canCancelOrder(order);
  const shippingSteps = SHIPPING_STEPS;
  const currentShipIdx = shippingSteps.indexOf(order.shippingStatus);
  const plan = order.traGop;
  const amountDue = Number(paymentInfo?.soTienCanThanhToan ?? 0);
  const showPaymentBox = order.orderStatus !== 'Cancelled' && order.paymentStatus !== 'Paid' && amountDue > 0;
  const installmentTerms = plan?.terms || [];
  const paidInstallmentCount = installmentTerms.filter((term) => term.trangThai === 'Paid').length;
  const nextInstallmentTerm = installmentTerms.find((term) => term.trangThai === 'Pending');
  const installmentTotalTerms = Number(plan?.soKy || installmentTerms.length || 0);
  const installmentProgress = installmentTotalTerms > 0
    ? Math.min(100, Math.round((paidInstallmentCount / installmentTotalTerms) * 100))
    : 0;

  return (
    <>
      <Breadcrumb items={[{ label: 'Đơn hàng', to: '/orders' }, { label: `#${order.orderCode || order.id}` }]} />

      <section className="bg-[linear-gradient(180deg,#f5f6f8_0%,#ffffff_26%)] px-4 py-10">
        <div className="mx-auto w-full max-w-[1000px] space-y-6">

          {/* ── Header ── */}
          <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Đơn hàng</div>
                <h1 className="mt-1 text-[26px] font-black text-zinc-950 sm:text-[30px]">#{order.orderCode || order.id}</h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Đặt ngày {formatDateTime(order.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge label={getPaymentStatusContextual(order.paymentStatus, order.orderType)} colorClass={getPaymentStatusColor(order.paymentStatus)} />
              </div>
            </div>
            {canCancel && (
              <button onClick={() => setShowCancelModal(true)} className="mt-4 rounded-full border border-red-200 px-5 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50">Hủy đơn hàng</button>
            )}
          </div>

          {/* ── Payment / QR ── */}
          {showPaymentBox && (
            <div className="rounded-[28px] border border-amber-200 bg-amber-50/40 p-6 shadow-sm">
              <h2 className="text-lg font-black text-zinc-950">Thanh toán đơn hàng</h2>
              <p className="mt-1 text-sm text-zinc-600">Quét mã QR hoặc chuyển khoản theo thông tin bên dưới. Đơn sẽ được xác nhận sau khi cửa hàng nhận được tiền.</p>
              {paymentInfo?.daCauHinhNganHang ? (
                <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                  {paymentInfo.qrImageUrl && (
                    <img src={paymentInfo.qrImageUrl} alt="Mã QR chuyển khoản" className="h-52 w-52 shrink-0 rounded-2xl border border-zinc-200 bg-white object-contain" />
                  )}
                  <div className="w-full space-y-2 text-sm">
                    <Row label="Ngân hàng" value={paymentInfo.tenNganHang} />
                    <Row label="Số tài khoản" value={paymentInfo.soTaiKhoan} />
                    <Row label="Chủ tài khoản" value={paymentInfo.chuTaiKhoan} />
                    <Row label="Nội dung CK" value={paymentInfo.noiDungChuyenKhoan} highlight />
                    <div className="flex items-center justify-between border-t border-amber-200 pt-2">
                      <span className="text-zinc-500">Số tiền cần thanh toán</span>
                      <strong className="text-xl font-black text-[#d71920]">{formatCurrency(amountDue)}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-amber-700">Số tiền cần thanh toán: <strong>{formatCurrency(amountDue)}</strong>. Vui lòng liên hệ cửa hàng để được hướng dẫn thanh toán.</p>
              )}
            </div>
          )}

          {/* ── Shipping Timeline ── */}
          <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-zinc-950">Trạng thái vận chuyển</h2>
            <div className="mt-1 mb-5">
              <Badge label={getShippingStatusLabel(order.shippingStatus)} colorClass={getShippingStatusColor(order.shippingStatus)} />
            </div>
            <div className="flex items-center gap-0">
              {shippingSteps.map((step, i) => {
                const done = i <= currentShipIdx && currentShipIdx >= 0;
                const active = i === currentShipIdx;
                return (
                  <div key={step} className="flex flex-1 flex-col items-center relative">
                    {i > 0 && <div className={`absolute top-3 right-1/2 w-full h-0.5 -translate-y-1/2 ${i <= currentShipIdx ? 'bg-green-400' : 'bg-zinc-200'}`} style={{ zIndex: 0 }} />}
                    <div className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${active ? 'bg-green-500 text-white ring-4 ring-green-100' : done ? 'bg-green-400 text-white' : 'bg-zinc-200 text-zinc-400'}`}>
                      {done ? <FiCheck className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <div className={`mt-2 text-center text-[10px] font-bold leading-tight ${active ? 'text-green-600' : done ? 'text-green-500' : 'text-zinc-400'}`}>
                      {getShippingStatusLabel(step)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Recipient Info ── */}
          <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-zinc-950">Thông tin nhận hàng</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <DT label="Họ tên" value={order.shippingFullName} />
              <DT label="Số điện thoại" value={order.shippingPhoneNumber} />
              <DT label="Email" value={order.shippingEmail || '—'} />
              <DT label="Phương thức" value={getReceivingMethodLabel(order.receivingMethod)} />
              <DT label="Địa chỉ" value={[order.shippingAddressLine, order.shippingWard, order.shippingDistrict, order.shippingProvince].filter(Boolean).join(', ') || '—'} className="sm:col-span-2" />
              {order.note && <DT label="Ghi chú" value={order.note} className="sm:col-span-2" />}
            </dl>
          </div>

          {/* ── Products ── */}
          <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-zinc-950">Sản phẩm đã đặt</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs font-bold uppercase tracking-wider text-zinc-400">
                    <th className="pb-2 text-left">Sản phẩm</th>
                    <th className="pb-2 text-right">Đơn giá</th>
                    <th className="pb-2 text-center">SL</th>
                    <th className="pb-2 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((d, i) => (
                    <tr key={d.id || i} className="border-b border-zinc-100 last:border-0">
                      <td className="py-3">
                        <div className="font-bold text-zinc-900">{d.productNameSnapshot || d.productName || 'Sản phẩm'}</div>
                        {d.skuSnapshot && <div className="text-xs text-zinc-400 mt-0.5">SKU: {d.skuSnapshot}</div>}
                        {isItemReviewable(d, reviewStatusByProductId) && (
                          <button
                            onClick={() => setReviewProduct(d)}
                            className="mt-2 text-xs font-bold text-[#d71920] hover:underline"
                          >
                            Đánh giá sản phẩm
                          </button>
                        )}
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">{formatCurrency(d.unitPrice)}</td>
                      <td className="py-3 text-center">{d.quantity}</td>
                      <td className="py-3 text-right whitespace-nowrap font-bold">{formatCurrency(d.lineTotal || d.unitPrice * d.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Financial Summary ── */}
          <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-zinc-950">Thông tin thanh toán</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-zinc-500">Loại đơn</span><span className="font-bold">{getOrderTypeLabel(order.orderType)}</span></div>
              {order.paymentMethod && (
                <div className="flex justify-between"><span className="text-zinc-500">Phương thức thanh toán</span><span className="font-bold">{getPaymentMethodLabel(order.paymentMethod)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-zinc-500">Tạm tính</span><span className="font-bold">{formatCurrency(order.subtotal)}</span></div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-green-600"><span>Giảm voucher</span><span className="font-bold">-{formatCurrency(order.discountAmount)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-zinc-500">Phí giao hàng</span><span className="font-bold">{formatCurrency(order.shippingFee)}</span></div>
              <div className="flex justify-between border-t border-zinc-200 pt-3 text-base text-[#d71920]"><span className="font-extrabold">Tổng cộng</span><span className="text-xl font-black">{formatCurrency(order.totalAmount)}</span></div>
              {order.depositAmount > 0 && (
                <>
                  <div className="flex justify-between text-amber-600"><span>Đặt cọc</span><span className="font-bold">{formatCurrency(order.depositAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Còn lại</span><span className="font-bold text-red-600">{formatCurrency(order.remainingAmount)}</span></div>
                </>
              )}
            </dl>

            {/* Vouchers applied */}
            {vouchers.length > 0 && (
              <div className="mt-5 border-t border-zinc-200 pt-4">
                <h3 className="text-sm font-bold text-zinc-700">Voucher đã áp dụng</h3>
                {vouchers.map((v, i) => (
                  <div key={i} className="mt-2 flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2">
                    <span className="text-lg">🎫</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold text-green-700">{v.voucherCodeSnapshot}</span>
                      <span className="ml-2 text-xs text-green-600">({v.discountTypeSnapshot === 'Percent' ? `${v.discountValueSnapshot}%` : formatCurrency(v.discountValueSnapshot)})</span>
                    </div>
                    <span className="text-sm font-bold text-green-700">-{formatCurrency(v.discountAmount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Installment Schedule ── */}
          {plan && (
            <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 bg-[linear-gradient(135deg,#fff7f7_0%,#ffffff_52%,#f8fafc_100%)] p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-extrabold text-[#d71920]">
                      <FiCreditCard className="h-3.5 w-3.5" />
                      Trả góp
                    </div>
                    <h2 className="mt-3 text-2xl font-black text-zinc-950">Lịch trả góp</h2>
                    <p className="mt-1 text-sm leading-6 text-zinc-500">
                      Đã thanh toán {paidInstallmentCount}/{installmentTotalTerms || plan.soKy} kỳ
                    </p>
                  </div>
                  <div className="min-w-[220px] rounded-2xl border border-red-100 bg-white px-5 py-4 text-right shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">Tổng phải trả</div>
                    <div className="mt-1 text-2xl font-black text-[#d71920]">{formatCurrency(plan.tongPhaiTra)}</div>
                    <div className="mt-1 text-xs font-medium text-zinc-500">Gồm gốc và lãi</div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-500">
                    <span>Tiến độ thanh toán</span>
                    <span>{installmentProgress}%</span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-200">
                    <div className="h-full rounded-full bg-[#d71920] transition-all" style={{ width: `${installmentProgress}%` }} />
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <InstallmentMetricCard icon={FiCreditCard} label="Trả trước" value={formatCurrency(plan.tienTraTruoc)} />
                  <InstallmentMetricCard icon={FiCalendar} label="Số kỳ" value={`${plan.soKy} tháng`} />
                  <InstallmentMetricCard icon={FiTrendingUp} label="Lãi suất" value={`${plan.laiSuatNam}% / năm`} />
                  <InstallmentMetricCard icon={FiFileText} label="Tổng lãi" value={formatCurrency(plan.tongTienLai)} />
                </div>

                {nextInstallmentTerm && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-white text-amber-600 shadow-sm">
                        <FiClock className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-zinc-950">Kỳ tiếp theo: Kỳ {nextInstallmentTerm.kyThu}</div>
                        <div className="mt-1 text-xs font-medium text-zinc-600">
                          Đến hạn {formatDate(nextInstallmentTerm.ngayDenHan)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-700">Cần thanh toán</div>
                      <div className="text-xl font-black text-[#d71920]">{formatCurrency(nextInstallmentTerm.tongTien)}</div>
                    </div>
                  </div>
                )}

                {plan.hoTenNguoiVay && (
                  <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#d71920] shadow-sm">
                          <FiUser className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-zinc-950">Hồ sơ vay</h3>
                          <p className="text-xs font-medium text-zinc-500">{plan.hoTenNguoiVay}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!printInstallmentApplication(order, plan)) {
                            notify('Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép pop-up rồi thử lại.', 'error');
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-extrabold text-zinc-700 transition hover:border-[#d71920] hover:text-[#d71920]"
                      >
                        <FiPrinter className="h-4 w-4" />
                        Xuất PDF
                      </button>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                          <FiUser className="h-4 w-4" />
                          Cá nhân
                        </div>
                        <dl className="grid gap-3 text-sm">
                          <LoanInfoItem label="Họ tên" value={plan.hoTenNguoiVay} />
                          <LoanInfoItem label="CCCD/CMND" value={plan.soCCCD} />
                          {plan.ngayCapCCCD && <LoanInfoItem label="Ngày cấp CCCD" value={formatDate(plan.ngayCapCCCD)} />}
                          {plan.noiCapCCCD && <LoanInfoItem label="Nơi cấp CCCD" value={plan.noiCapCCCD} />}
                          {plan.ngaySinh && <LoanInfoItem label="Ngày sinh" value={formatDate(plan.ngaySinh)} />}
                          {plan.soDienThoai && <LoanInfoItem label="SĐT người vay" value={plan.soDienThoai} />}
                          {plan.diaChiThuongTru && <LoanInfoItem label="Địa chỉ TT" value={plan.diaChiThuongTru} multiline />}
                        </dl>
                      </div>

                      <div className="rounded-2xl bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                          <FiBriefcase className="h-4 w-4" />
                          Công việc
                        </div>
                        <dl className="grid gap-3 text-sm">
                          {plan.ngheNghiep && <LoanInfoItem label="Nghề nghiệp" value={plan.ngheNghiep} />}
                          {plan.tenCongTy && <LoanInfoItem label="Công ty" value={plan.tenCongTy} />}
                          {plan.thoiGianLamViecThang > 0 && <LoanInfoItem label="Thâm niên" value={`${plan.thoiGianLamViecThang} tháng`} />}
                          {plan.thuNhapHangThang > 0 && <LoanInfoItem label="Thu nhập/tháng" value={formatCurrency(plan.thuNhapHangThang)} />}
                          {!plan.ngheNghiep && !plan.tenCongTy && !(plan.thoiGianLamViecThang > 0) && !(plan.thuNhapHangThang > 0) && (
                            <div className="rounded-xl border border-dashed border-zinc-200 px-3 py-4 text-center text-sm font-medium text-zinc-400">
                              Chưa có thông tin công việc
                            </div>
                          )}
                        </dl>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="bg-zinc-50">
                        <tr className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                          <th className="px-4 py-3 text-left">Kỳ</th>
                          <th className="px-4 py-3 text-left">Đến hạn</th>
                          <th className="px-4 py-3 text-right">Gốc</th>
                          <th className="px-4 py-3 text-right">Lãi</th>
                          <th className="px-4 py-3 text-right">Tổng</th>
                          <th className="px-4 py-3 text-center">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {installmentTerms.map((t) => (
                          <tr key={t.maKyTraGop} className={t.trangThai === 'Pending' ? 'bg-amber-50/35' : 'bg-white'}>
                            <td className="px-4 py-3 font-black text-zinc-950">Kỳ {t.kyThu}</td>
                            <td className="px-4 py-3 font-medium text-zinc-700">{formatDate(t.ngayDenHan)}</td>
                            <td className="px-4 py-3 text-right text-zinc-600">{formatCurrency(t.soTienGoc)}</td>
                            <td className="px-4 py-3 text-right text-zinc-600">{formatCurrency(t.soTienLai)}</td>
                            <td className="px-4 py-3 text-right font-black text-zinc-950">{formatCurrency(t.tongTien)}</td>
                            <td className="px-4 py-3 text-center">
                              <TermStatusPill status={t.trangThai} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Payment History ── */}
          {payments.length > 0 && (
            <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-zinc-950">Lịch sử thanh toán</h2>
              <div className="mt-4 space-y-3">
                {payments.map((p, i) => (
                  <div key={p.id || i} className="flex flex-wrap items-center gap-3 rounded-2xl bg-zinc-50 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-zinc-900">{getPaymentMethodLabel(p.paymentMethod)}</div>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {p.paymentCode} • {formatDateTime(p.createdAt)}
                      </div>
                      {p.transactionRef && <div className="text-xs text-zinc-400 mt-0.5">Ref: {p.transactionRef}</div>}
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-zinc-900">{formatCurrency(p.amount)}</div>
                      <Badge label={getPaymentStatusLabel(p.paymentStatus || p.status)} colorClass={getPaymentStatusColor(p.paymentStatus || p.status)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link to="/orders" className="rounded-full border border-zinc-200 px-8 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100">← Tất cả đơn hàng</Link>
            <Link to="/products" className="rounded-full bg-[#d71920] px-8 py-3 text-sm font-bold text-white transition hover:bg-[#b61016]">Tiếp tục mua sắm</Link>
          </div>
        </div>
      </section>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[22px] bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-black text-zinc-950">Hủy đơn hàng</h3>
            <p className="mt-2 text-sm text-zinc-600">Bạn có chắc muốn hủy đơn #{order.orderCode || order.id}?</p>
            <textarea
              className="mt-4 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm outline-none focus:border-[#d71920]"
              rows={3} placeholder="Lý do hủy (tùy chọn)..."
              value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowCancelModal(false)} className="rounded-full border border-zinc-200 px-6 py-2 text-sm font-bold text-zinc-600 transition hover:bg-zinc-100">Đóng</button>
              <button onClick={handleCancel} disabled={cancelling} className="rounded-full bg-red-600 px-6 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:bg-zinc-300">
                {cancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      <ReviewModal
        isOpen={!!reviewProduct}
        onClose={() => setReviewProduct(null)}
        product={reviewProduct}
        orderId={order.id}
        onSubmitted={({ productId }) => {
          if (productId) {
            setReviewStatusByProductId((current) => ({ ...current, [String(productId)]: 'reviewed' }));
          }
        }}
      />
    </>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-zinc-500">{label}</span>
      <span className={`text-right font-bold ${highlight ? 'text-[#d71920]' : 'text-zinc-900'}`}>{value || '—'}</span>
    </div>
  );
}

function DT({ label, value, className = '' }) {
  return (
    <div className={className}>
      <dt className="text-xs font-bold uppercase tracking-wider text-zinc-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-zinc-800">{value}</dd>
    </div>
  );
}

function InstallmentMetricCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">{label}</div>
          <div className="mt-0.5 truncate text-base font-black text-zinc-950">{value}</div>
        </div>
      </div>
    </div>
  );
}

function LoanInfoItem({ label, value, multiline = false }) {
  return (
    <div className={`gap-3 border-b border-zinc-100 pb-3 last:border-0 last:pb-0 ${multiline ? 'block' : 'flex items-start justify-between'}`}>
      <dt className="shrink-0 text-xs font-bold uppercase tracking-wider text-zinc-400">{label}</dt>
      <dd className={`mt-1 font-bold text-zinc-900 ${multiline ? 'leading-6' : 'text-right'}`}>{value || '—'}</dd>
    </div>
  );
}

const TERM_STATUS_ICON = {
  Paid: FiCheckCircle,
  Cancelled: FiXCircle,
  Pending: FiClock,
};

function TermStatusPill({ status }) {
  const Icon = TERM_STATUS_ICON[status] || FiClock;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${getInstallmentTermStatusColor(status)}`}>
      <Icon className="h-3.5 w-3.5" />
      {getInstallmentTermStatusLabel(status)}
    </span>
  );
}

export default OrderDetailPage;
