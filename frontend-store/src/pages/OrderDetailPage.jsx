import { useEffect, useState } from 'react';
import { FiCheck, FiFileText, FiStar } from 'react-icons/fi';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { orderApi, reviewApi, shopApi } from '../services/api.js';
import Breadcrumb from '../components/Breadcrumb.jsx';
import LoadingState from '../components/LoadingState.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { formatCurrency, formatDateTime } from '../utils/formatters.js';
import {
  getShippingStatusLabel, getShippingStatusColor,
  getPaymentStatusColor, getPaymentStatusContextual,
  getPaymentMethodLabel, getOrderTypeLabel, getReceivingMethodLabel,
  canCancelOrder,
} from '../utils/statusMappings.js';
import {
  isOrderReviewable, getOrderItems, getReviewProductId, isItemReviewable, getReviewableOrderItems,
} from '../utils/reviewEligibility.js';
import ReviewProductPicker from '../components/orders/ReviewProductPicker.jsx';
import ReviewModal from '../components/product/ReviewModal.jsx';
import { getInstallmentFinancePartner, parseInstallmentProfile, printInstallmentContract } from '../utils/installmentContract.js';

// Huy hiệu trong trang chi tiết dùng cỡ to hơn mặc định một chút.
function Badge({ label, colorClass }) {
  return <StatusBadge label={label} colorClass={colorClass} className="px-3 py-1" />;
}

// 3 bước hiển thị của timeline; shippingStatus thực tế là FulfillmentStatus của backend
// (Unallocated/Allocated/Shipped/Fulfilled) nên cần map sang chỉ số bước.
const SHIPPING_STEPS = ['Preparing', 'Shipping', 'Delivered'];
const FULFILLMENT_STEP_INDEX = {
  Unallocated: 0,
  Allocated: 0,
  Preparing: 0,
  Shipped: 1,
  Shipping: 1,
  Fulfilled: 2,
  Delivered: 2,
};

function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated: isAuth } = useAuth();
  const [order, setOrder] = useState(null);
  const [details, setDetails] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [reviewProduct, setReviewProduct] = useState(null);
  const [reviewPickerOrder, setReviewPickerOrder] = useState(null);
  const [reviewStatusByProductId, setReviewStatusByProductId] = useState({});
  const [shopProfile, setShopProfile] = useState({});

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
      const order = await orderApi.getById(id);
      setOrder(order);
      setDetails(order.items || []);
      setVouchers(order.vouchers || []);

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

  // Thông tin cửa hàng (Bên A) để in lên hợp đồng trả góp — chỉ tải khi là đơn trả góp.
  useEffect(() => {
    if (order?.orderType !== 'Installment') return;
    let active = true;
    shopApi.getShowroomProfile()
      .then((profile) => { if (active) setShopProfile(profile || {}); })
      .catch(() => {});
    return () => { active = false; };
  }, [order?.orderType]);

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

  // Đơn trả góp đã được duyệt (đối tác đã/đang xử lý tín dụng) thì không cho khách yêu cầu hủy nữa.
  const canCancel = canCancelOrder(order) && order.orderType !== 'Installment';
  const shippingSteps = SHIPPING_STEPS;
  const currentShipIdx = FULFILLMENT_STEP_INDEX[order.shippingStatus] ?? -1;
  const amountDue = Number(paymentInfo?.soTienCanThanhToan ?? 0);
  const isInstallmentOrder = order.orderType === 'Installment';
  const installmentFinancePartner = isInstallmentOrder ? getInstallmentFinancePartner(order) : '';
  const installmentMonths = isInstallmentOrder ? Number(parseInstallmentProfile(order).months) || 0 : 0;
  const installmentFinanced = isInstallmentOrder
    ? Math.max(0, Number(order.remainingAmount ?? (Number(order.totalAmount || 0) - Number(order.depositAmount || 0))))
    : 0;
  const showPaymentBox = !isInstallmentOrder && order.orderStatus !== 'Cancelled' && order.paymentStatus !== 'Paid' && amountDue > 0;
  const reviewableItems = getReviewableOrderItems(order, reviewStatusByProductId);

  function openReviewShortcut() {
    if (reviewableItems.length === 1) {
      setReviewProduct(reviewableItems[0]);
      return;
    }
    setReviewPickerOrder(order);
  }

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
            {isInstallmentOrder && (
              <button
                type="button"
                onClick={() => printInstallmentContract(order, shopProfile)}
                className="ml-0 mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#d71920] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#b61016] sm:ml-2"
              >
                <FiFileText className="h-4 w-4" />
                In hợp đồng trả góp
              </button>
            )}
          </div>

          {reviewableItems.length > 0 && (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-amber-600 ring-1 ring-amber-200">
                    <FiStar className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-zinc-950">Đơn đã giao thành công</h2>
                    <p className="mt-1 text-sm text-zinc-600">
                      {reviewableItems.length} sản phẩm trong đơn đang chờ đánh giá.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openReviewShortcut}
                  className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full bg-[#d71920] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#b61016]"
                >
                  <FiStar className="h-4 w-4" />
                  Gửi đánh giá
                </button>
              </div>
            </div>
          )}

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
                    <p className="mt-3 text-xs leading-5 text-zinc-500">Sau khi chuyển khoản, cửa hàng sẽ kiểm tra và cập nhật trạng thái thanh toán cho đơn của bạn.</p>
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

          {/* ── Installment info ── */}
          {isInstallmentOrder && (
            <div className="rounded-[28px] border border-indigo-200 bg-indigo-50/40 p-6 shadow-sm">
              <h2 className="text-lg font-black text-zinc-950">Thông tin trả góp</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Khoản trả trước được ghi nhận tại cửa hàng. Phần còn lại do <strong>{installmentFinancePartner}</strong> thẩm định, giải ngân và quản lý trực tiếp; đơn hàng tiếp tục xử lý giao nhận bình thường.
              </p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <DT label="Đối tác tài chính" value={installmentFinancePartner} />
                <DT label="Kỳ hạn" value={installmentMonths ? `${installmentMonths} tháng` : '—'} />
                <DT label="Trả trước" value={formatCurrency(order.depositAmount)} />
                <DT label="Phần còn lại đối tác xử lý" value={formatCurrency(installmentFinanced)} />
              </dl>
            </div>
          )}

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
              {isInstallmentOrder && (
                <div className="flex justify-between"><span className="text-zinc-500">Đối tác tài chính</span><span className="font-bold">{installmentFinancePartner}</span></div>
              )}
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
                  <div className="flex justify-between text-amber-600"><span>{isInstallmentOrder ? 'Trả trước' : 'Đặt cọc'}</span><span className="font-bold">{formatCurrency(order.depositAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">{isInstallmentOrder ? 'Còn lại do đối tác xử lý' : 'Còn lại sau đặt cọc'}</span><span className="font-bold text-red-600">{formatCurrency(isInstallmentOrder ? installmentFinanced : Math.max(0, Number(order.totalAmount || 0) - Number(order.depositAmount || 0)))}</span></div>
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
      <ReviewProductPicker
        order={reviewPickerOrder}
        reviewStatusByProductId={reviewStatusByProductId}
        onClose={() => setReviewPickerOrder(null)}
        onPick={(product) => {
          setReviewProduct(product);
          setReviewPickerOrder(null);
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

export default OrderDetailPage;
