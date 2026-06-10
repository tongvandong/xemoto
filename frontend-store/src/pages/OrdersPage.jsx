import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { orderApi } from '../services/api.js';
import Breadcrumb from '../components/Breadcrumb.jsx';
import LoadingState from '../components/LoadingState.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { formatCurrency } from '../utils/formatters.js';
import {
  getOrderStatusLabel, getOrderStatusColor,
  getShippingStatusLabel, getShippingStatusColor,
  getPaymentStatusLabel, getPaymentStatusColor,
  getOrderTypeLabel, getPaymentMethodLabel,
} from '../utils/statusMappings.js';

function StatusBadge({ label, colorClass }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${colorClass}`}>
      {label}
    </span>
  );
}

function getOrderPaymentDisplay(order) {
  if (order.paymentMethod) return getPaymentMethodLabel(order.paymentMethod);
  if (order.orderType) return getOrderTypeLabel(order.orderType);
  return 'Chưa cập nhật';
}

function formatOrderTime(value, now) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';

  const absoluteTime = date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => new Date());

  const fetchOrders = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await orderApi.getMyOrders();
      const list = Array.isArray(data) ? data : data?.orders || data?.$values || [];
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(list);
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

  if (!isAuthenticated) return null;

  return (
    <>
      <Breadcrumb items={[{ label: 'Đơn hàng của tôi' }]} />

      <section className="bg-[linear-gradient(180deg,#f5f6f8_0%,#ffffff_26%)] px-4 py-10">
        <div className="mx-auto w-full max-w-[1200px]">
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
          {!loading && !error && orders.length === 0 && (
            <div className="mt-8 flex flex-col items-center justify-center rounded-[28px] border border-zinc-200 bg-white py-20 shadow-sm">
              <div className="text-6xl">📦</div>
              <h3 className="mt-4 text-lg font-bold text-zinc-700">Chưa có đơn hàng nào</h3>
              <p className="mt-1 text-sm text-zinc-500">Bắt đầu mua sắm để có đơn hàng đầu tiên!</p>
              <Link to="/products" className="mt-6 rounded-full bg-[#d71920] px-8 py-3 text-sm font-bold text-white transition hover:bg-[#b61016]">Mua sắm ngay</Link>
            </div>
          )}

          {/* Orders List */}
          {!loading && !error && orders.length > 0 && (
            <div className="mt-6 space-y-4">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="group block rounded-[22px] border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
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
                    <InfoCell label="Hình thức thanh toán" value={getOrderPaymentDisplay(order)} />
                    <InfoCell label="Trạng thái" value={
                      <StatusBadge label={getPaymentStatusLabel(order.paymentStatus)} colorClass={getPaymentStatusColor(order.paymentStatus)} />
                    } />
                    <InfoCell label="Trạng thái vận chuyển" value={
                      <StatusBadge label={getShippingStatusLabel(order.shippingStatus)} colorClass={getShippingStatusColor(order.shippingStatus)} />
                    } />
                    <InfoCell label="Tổng tiền" value={
                      <span className="text-base font-black text-[#d71920]">{formatCurrency(order.totalAmount)}</span>
                    } />
                  </div>

                  {/* Footer */}
                  <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3">
                    <div className="text-xs text-zinc-500">
                      {order.discountAmount > 0 && <span className="mr-3">Giảm giá: <span className="font-bold text-green-600">-{formatCurrency(order.discountAmount)}</span></span>}
                      {order.depositAmount > 0 && <span>Đã cọc: <span className="font-bold text-amber-600">{formatCurrency(order.depositAmount)}</span></span>}
                    </div>
                    <span className="text-xs font-bold text-[#d71920] transition group-hover:translate-x-1">Xem chi tiết →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
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
