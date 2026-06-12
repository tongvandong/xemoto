import { useCallback, useEffect, useState } from 'react';
import { FiArrowRight, FiCalendar, FiCreditCard, FiStar, FiX } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { orderApi, reviewApi } from '../services/api.js';
import Breadcrumb from '../components/Breadcrumb.jsx';
import LoadingState from '../components/LoadingState.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters.js';
import ReviewModal from '../components/product/ReviewModal.jsx';
import {
  getOrderStatusLabel, getOrderStatusColor,
  getShippingStatusLabel, getShippingStatusColor,
  getPaymentStatusColor, getPaymentStatusContextual,
  getOrderTypeLabel,
} from '../utils/statusMappings.js';
import {
  isOrderReviewable,
  getOrderItems,
  getReviewableOrderItems,
  hasReviewableItems,
} from '../utils/reviewEligibility.js';

function StatusBadge({ label, colorClass }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${colorClass}`}>
      {label}
    </span>
  );
}

function formatOrderTime(value, now) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';

  const absoluteTime = formatDateTime(value);
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) return absoluteTime;
  if (diffMs < 60 * 1000) return `${absoluteTime} · vừa xong`;
  if (diffMs < 60 * 60 * 1000) return `${absoluteTime} · ${Math.floor(diffMs / (60 * 1000))} phút trước`;
  if (diffMs < 24 * 60 * 60 * 1000) return `${absoluteTime} · ${Math.floor(diffMs / (60 * 60 * 1000))} giờ trước`;

  return absoluteTime;
}

function OrdersPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [awaitingOrders, setAwaitingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [reviewProduct, setReviewProduct] = useState(null);
  const [reviewOrderId, setReviewOrderId] = useState(null);
  const [reviewPickerOrder, setReviewPickerOrder] = useState(null);
  const [reviewStatusByProductId, setReviewStatusByProductId] = useState({});

  const fetchOrders = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [confirmedData, awaitingData] = await Promise.all([
        orderApi.getMyOrders(),
        orderApi.getAll({ trangThaiDonHang: 'AwaitingPayment' }).catch(() => null),
      ]);
      const list = Array.isArray(confirmedData) ? confirmedData : confirmedData?.orders || confirmedData?.$values || [];
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(list);

      const awaitingList = Array.isArray(awaitingData) ? awaitingData : awaitingData?.orders || awaitingData?.items || awaitingData?.$values || [];
      awaitingList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setAwaitingOrders(awaitingList);
    } catch (err) {
      setError(err?.message || 'Không thể tải danh sách đơn hàng');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/orders', { replace: true });
      return undefined;
    }

    fetchOrders();
    const refreshTimer = window.setInterval(() => {
      setNow(new Date());
      fetchOrders({ silent: true });
    }, 15000);

    return () => window.clearInterval(refreshTimer);
  }, [fetchOrders, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated || orders.length === 0) {
      setReviewStatusByProductId((current) => (Object.keys(current).length ? {} : current));
      return undefined;
    }

    const productIds = [
      ...new Set(
        orders
          .filter(isOrderReviewable)
          .flatMap(getOrderItems)
          .map(getReviewProductId)
          .filter(Boolean)
          .map(String),
      ),
    ];

    if (productIds.length === 0) {
      setReviewStatusByProductId((current) => (Object.keys(current).length ? {} : current));
      return undefined;
    }

    const missingProductIds = productIds.filter((productId) => !reviewStatusByProductId[productId]);
    if (missingProductIds.length === 0) return undefined;

    let active = true;
    Promise.all(
      missingProductIds.map(async (productId) => {
        try {
          const state = await reviewApi.getMine(productId);
          return [productId, state?.myReview ? 'reviewed' : 'not-reviewed'];
        } catch {
          return [productId, 'unknown'];
        }
      }),
    ).then((entries) => {
      if (!active) return;
      setReviewStatusByProductId((current) => {
        const next = { ...current };
        entries.forEach(([productId, status]) => {
          next[productId] = status;
        });
        return next;
      });
    });

    return () => {
      active = false;
    };
  }, [isAuthenticated, orders, reviewStatusByProductId]);

  function handleReviewOrder(event, order) {
    event.preventDefault();
    event.stopPropagation();

    const reviewableItems = getReviewableOrderItems(order, reviewStatusByProductId);
    if (reviewableItems.length === 1) {
      setReviewOrderId(order.id);
      setReviewProduct(reviewableItems[0]);
      return;
    }

    setReviewPickerOrder(order);
  }

  function handlePickReviewProduct(product) {
    setReviewOrderId(reviewPickerOrder?.id);
    setReviewProduct(product);
    setReviewPickerOrder(null);
  }

  if (!isAuthenticated) return null;

  return (
    <>
      <Breadcrumb items={[{ label: 'Đơn hàng của tôi' }]} />

      <section className="bg-[linear-gradient(180deg,#f5f6f8_0%,#ffffff_26%)] px-4 py-10">
        <div className="mx-auto w-full max-w-[1200px]">
          {/* Installment orders: surface active installment plans with next-due reminders. */}
          {!loading && (() => {
            const installmentOrders = orders.filter(
              (o) => o.orderType === 'Installment' && o.traGop && o.orderStatus !== 'Cancelled'
            );
            if (installmentOrders.length === 0) return null;
            return (
              <div className="mb-6 overflow-hidden rounded-[24px] border border-red-100 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-100 bg-red-50/70 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#d71920] shadow-sm">
                      <FiCreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-zinc-950">
                        Bạn có {installmentOrders.length} đơn đang trả góp
                      </h3>
                      <p className="mt-0.5 text-xs font-medium text-zinc-500">Theo dõi kỳ đến hạn và tiến độ thanh toán</p>
                    </div>
                  </div>
                </div>
                <ul className="grid gap-3 p-4 lg:grid-cols-2">
                  {installmentOrders.map((o) => {
                    const plan = o.traGop;
                    const terms = plan.terms || [];
                    const paidTerms = terms.filter((t) => t.trangThai === 'Paid').length;
                    const totalTerms = Number(plan.soKy || terms.length || 0);
                    const progress = totalTerms > 0 ? Math.min(100, Math.round((paidTerms / totalTerms) * 100)) : 0;
                    const nextTerm = terms.find((t) => t.trangThai === 'Pending');
                    return (
                      <li key={o.id} className="rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-red-200 hover:shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-black text-zinc-950">#{o.orderCode || o.id}</div>
                            <div className="mt-1 text-xs font-bold text-zinc-500">Đã trả {paidTerms}/{totalTerms || plan.soKy} kỳ</div>
                          </div>
                          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-extrabold text-[#d71920]">{progress}%</span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
                          <div className="h-full rounded-full bg-[#d71920]" style={{ width: `${progress}%` }} />
                        </div>
                        {nextTerm ? (
                          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-3 py-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                              <FiCalendar className="h-4 w-4" />
                              Kỳ {nextTerm.kyThu} · {formatDate(nextTerm.ngayDenHan)}
                            </div>
                            <strong className="whitespace-nowrap text-sm text-[#d71920]">{formatCurrency(nextTerm.tongTien)}</strong>
                          </div>
                        ) : (
                          <div className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-xs font-extrabold text-green-700">Đã trả đủ các kỳ</div>
                        )}
                        <Link
                          to={`/orders/${o.id}`}
                          className="mt-3 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#d71920] transition hover:text-[#b61016]"
                        >
                          Xem lịch trả góp
                          <FiArrowRight className="h-4 w-4" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })()}

          {/* Awaiting-payment reminder: customers can resume payment for unpaid orders here. */}
          {!loading && awaitingOrders.length > 0 && (
            <div className="mb-6 rounded-[22px] border border-amber-200 bg-amber-50/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-amber-800">
                    Bạn có {awaitingOrders.length} đơn hàng chờ thanh toán
                  </h3>
                </div>
              </div>
              <ul className="mt-3 space-y-2">
                {awaitingOrders.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
                    <div>
                      <div className="text-sm font-bold text-zinc-900">#{o.orderCode || o.id}</div>
                      <div className="text-xs text-zinc-500">{formatOrderTime(o.createdAt, now)} · Tổng: {formatCurrency(o.totalAmount)}</div>
                    </div>
                    <Link
                      to={`/checkout/payment?orderId=${o.id}`}
                      className="rounded-full bg-amber-500 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-white transition hover:bg-amber-600"
                    >
                      Tiếp tục thanh toán
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="mt-8">
              <LoadingState message="Đang tải danh sách đơn hàng..." />
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-center text-sm font-medium text-red-700">
              {error}
              <button onClick={fetchOrders} className="ml-2 font-bold text-[#d71920] hover:underline">Thử lại</button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && orders.length === 0 && awaitingOrders.length === 0 && (
            <div className="mt-8 flex flex-col items-center justify-center rounded-[28px] border border-zinc-200 bg-white py-20 shadow-sm">
              <div className="text-6xl">📦</div>
              <h3 className="mt-4 text-lg font-bold text-zinc-700">Chưa có đơn hàng nào</h3>
              <p className="mt-1 text-sm text-zinc-500">Bắt đầu mua sắm để có đơn hàng đầu tiên!</p>
              <Link to="/products" className="mt-6 rounded-full bg-[#d71920] px-8 py-3 text-sm font-bold text-white transition hover:bg-[#b61016]">Mua sắm ngay</Link>
            </div>
          )}

          {!loading && !error && orders.length === 0 && awaitingOrders.length > 0 && (
            <div className="rounded-[22px] border border-zinc-200 bg-white py-10 text-center text-sm text-zinc-500">
              Chưa có đơn hàng nào đã thanh toán. Hoàn tất thanh toán đơn ở trên để xuất hiện tại đây.
            </div>
          )}

          {/* Orders List */}
          {!loading && !error && orders.length > 0 && (
            <div className="mt-6 space-y-4">
              {orders.map((order) => (
                <article
                  key={order.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(`/orders/${order.id}`);
                    }
                  }}
                  className="group block cursor-pointer rounded-[22px] border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
                >
                  {/* Header row */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-black text-zinc-900">#{order.orderCode || order.id}</span>
                      <span className="ml-3 text-xs text-zinc-400">{formatOrderTime(order.createdAt, now)}</span>
                    </div>
                    <StatusBadge label={getOrderStatusLabel(order.orderStatus)} colorClass={getOrderStatusColor(order.orderStatus)} />
                  </div>

                  {/* Info grid */}
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <InfoCell label="Loại đơn" value={
                      <span className="text-sm font-bold text-zinc-700">{getOrderTypeLabel(order.orderType)}</span>
                    } />
                    <InfoCell label="Thanh toán" value={
                      <StatusBadge label={getPaymentStatusContextual(order.paymentStatus, order.orderType)} colorClass={getPaymentStatusColor(order.paymentStatus)} />
                    } />
                    <InfoCell label="Vận chuyển" value={
                      <StatusBadge label={getShippingStatusLabel(order.shippingStatus)} colorClass={getShippingStatusColor(order.shippingStatus)} />
                    } />
                    <InfoCell label="Tổng tiền" value={
                      <span className="text-base font-black text-[#d71920]">{formatCurrency(order.totalAmount)}</span>
                    } />
                  </div>

                  {/* Footer */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3">
                    <div className="text-xs text-zinc-500">
                      {order.discountAmount > 0 && <span className="mr-3">Giảm giá: <span className="font-bold text-green-600">-{formatCurrency(order.discountAmount)}</span></span>}
                      {order.depositAmount > 0 && <span>Đã cọc: <span className="font-bold text-amber-600">{formatCurrency(order.depositAmount)}</span></span>}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {hasReviewableItems(order, reviewStatusByProductId) && (
                        <button
                          type="button"
                          onClick={(event) => handleReviewOrder(event, order)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-amber-700 transition hover:border-amber-300 hover:bg-amber-100"
                        >
                          <FiStar className="h-4 w-4" />
                          Đánh giá đơn hàng
                        </button>
                      )}
                      <span className="text-xs font-bold text-[#d71920] transition group-hover:translate-x-1">Xem chi tiết →</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      <ReviewProductPicker
        order={reviewPickerOrder}
        reviewStatusByProductId={reviewStatusByProductId}
        onClose={() => setReviewPickerOrder(null)}
        onPick={handlePickReviewProduct}
      />
      <ReviewModal
        isOpen={!!reviewProduct}
        onClose={() => {
          setReviewProduct(null);
          setReviewOrderId(null);
        }}
        product={reviewProduct}
        orderId={reviewOrderId}
        onSubmitted={({ productId }) => {
          if (productId) {
            setReviewStatusByProductId((current) => ({ ...current, [String(productId)]: 'reviewed' }));
          }
          setReviewPickerOrder(null);
        }}
      />
    </>
  );
}

function InfoCell({ label, value }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">{label}</div>
      <div className="mt-0.5 text-sm font-bold text-zinc-800">{value}</div>
    </div>
  );
}

function ReviewProductPicker({ order, reviewStatusByProductId = {}, onClose, onPick }) {
  if (!order) return null;

  const items = getReviewableOrderItems(order, reviewStatusByProductId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-xl rounded-[22px] bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          aria-label="Đóng"
        >
          <FiX className="h-5 w-5" />
        </button>
        <div className="pr-10">
          <h3 className="text-lg font-black text-zinc-950">Chọn sản phẩm để đánh giá</h3>
          <p className="mt-1 text-sm text-zinc-500">Đơn #{order.orderCode || order.id}</p>
        </div>
        <div className="mt-5 space-y-3">
          {items.map((item, index) => (
            <button
              key={item.id || item.productId || index}
              type="button"
              onClick={() => onPick(item)}
              className="flex w-full items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left transition hover:border-amber-300 hover:bg-amber-50/50"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-zinc-950">
                  {item.productNameSnapshot || item.productName || item.name || 'Sản phẩm'}
                </div>
                {item.skuSnapshot && <div className="mt-0.5 text-xs font-medium text-zinc-400">SKU: {item.skuSnapshot}</div>}
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-700">
                <FiStar className="h-3.5 w-3.5" />
                Đánh giá
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default OrdersPage;
