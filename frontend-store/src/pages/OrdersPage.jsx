import { useCallback, useEffect, useState } from 'react';
import { FiStar } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { orderApi, reviewApi } from '../services/api.js';
import Breadcrumb from '../components/Breadcrumb.jsx';
import LoadingState from '../components/LoadingState.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import AwaitingPaymentReminder from '../components/orders/AwaitingPaymentReminder.jsx';
import ReviewProductPicker from '../components/orders/ReviewProductPicker.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { formatCurrency, formatDateTimeWithRelative } from '../utils/formatters.js';
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
  getReviewProductId,
  getReviewableOrderItems,
  hasReviewableItems,
} from '../utils/reviewEligibility.js';

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
      const data = await orderApi.getMyOrders();
      const list = Array.isArray(data) ? data : data?.orders || data?.$values || [];
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(list);

      // Đơn còn cần khách chuyển khoản: chưa hủy và chưa trả tiền.
      // (PendingConfirmation = khách đã báo chuyển khoản, đang chờ cửa hàng xác nhận — không nhắc nữa.)
      setAwaitingOrders(list.filter(
        (order) => order.orderStatus !== 'Cancelled' && order.paymentStatus === 'Unpaid',
      ));
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
    // Làm mới nền 30s để bắt thay đổi trạng thái từ cửa hàng; bỏ qua khi tab ẩn để khỏi gọi API thừa.
    const refreshTimer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setNow(new Date());
      fetchOrders({ silent: true });
    }, 30000);

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
    openReviewOrder(order);
  }

  function openReviewOrder(order) {
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

  const reviewShortcutOrders = orders
    .filter((order) => hasReviewableItems(order, reviewStatusByProductId))
    .slice(0, 3);

  return (
    <>
      <Breadcrumb items={[{ label: 'Đơn hàng của tôi' }]} />

      <section className="bg-[linear-gradient(180deg,#f5f6f8_0%,#ffffff_26%)] px-4 py-10">
        <div className="mx-auto w-full max-w-[1200px]">
          {/* Awaiting-payment reminder: customers can resume payment for unpaid orders here. */}
          {!loading && <AwaitingPaymentReminder orders={awaitingOrders} now={now} />}

          {!loading && reviewShortcutOrders.length > 0 && (
            <section className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-zinc-950">Đơn đã giao đang chờ đánh giá</h2>
                  <p className="mt-1 text-sm text-zinc-600">Chia sẻ trải nghiệm của bạn cho sản phẩm đã nhận.</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-amber-700 ring-1 ring-amber-200">
                  <FiStar className="h-3.5 w-3.5" />
                  {reviewShortcutOrders.length} đơn
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {reviewShortcutOrders.map((order) => {
                  const reviewableCount = getReviewableOrderItems(order, reviewStatusByProductId).length;
                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => openReviewOrder(order)}
                      className="flex min-h-[88px] items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-left transition hover:border-amber-300 hover:bg-amber-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-zinc-950">#{order.orderCode || order.id}</span>
                        <span className="mt-1 block text-xs font-medium text-zinc-500">
                          {reviewableCount} sản phẩm có thể đánh giá
                        </span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#d71920] px-3 py-2 text-xs font-extrabold text-white">
                        <FiStar className="h-3.5 w-3.5" />
                        Đánh giá
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
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
                      <span className="ml-3 text-xs text-zinc-400">{formatDateTimeWithRelative(order.createdAt, now)}</span>
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

export default OrdersPage;
