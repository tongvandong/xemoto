import { useCallback, useEffect, useRef, useState } from 'react';
import { FiLoader } from 'react-icons/fi';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Breadcrumb from '../components/Breadcrumb.jsx';
import { orderApi } from '../services/api.js';
import { formatCurrency } from '../utils/formatters.js';
import { getPaymentStatusLabel } from '../utils/statusMappings.js';

const PAID_STATUSES = ['Paid', 'PartiallyPaid', 'Refunded'];

function PaymentPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const timerRef = useRef(null);

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      const [orderRes, infoRes] = await Promise.all([
        orderApi.getById(orderId),
        orderApi.getPaymentInfo(orderId).catch(() => null),
      ]);
      setOrder(orderRes.order || orderRes);
      setPaymentInfo(infoRes);
    } catch {
      // keep last state on transient errors
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) {
      navigate('/orders', { replace: true });
      return;
    }
    load();
  }, [orderId, load, navigate]);

  useEffect(() => {
    if (order && PAID_STATUSES.includes(order.paymentStatus)) {
      navigate(`/checkout/success?orderId=${orderId}`, { replace: true });
    }
  }, [order, orderId, navigate]);

  useEffect(() => {
    if (!orderId) return undefined;
    timerRef.current = setInterval(load, 8000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [orderId, load]);

  useEffect(() => {
    if (order && order.orderStatus === 'Cancelled') {
      navigate(`/orders/${orderId}`, { replace: true });
    }
  }, [order, orderId, navigate]);

  const amountDue = Number(paymentInfo?.soTienCanThanhToan ?? 0);

  async function handleCancel() {
    if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này?')) return;
    setCancelling(true);
    try {
      await orderApi.cancel(orderId, 'Khách hủy đơn trước khi thanh toán');
      navigate(`/orders/${orderId}`, { replace: true });
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Hủy đơn thất bại.');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Giỏ hàng', to: '/cart' }, { label: 'Thanh toán' }]} />

      <section className="bg-[linear-gradient(180deg,#f5f6f8_0%,#ffffff_26%)] px-4 py-12">
        <div className="mx-auto max-w-[680px]">
          <div className="text-center">
            <h1 className="text-[28px] font-black text-zinc-950 sm:text-[32px]">Quét QR để thanh toán</h1>
            <p className="mt-2 text-sm leading-7 text-zinc-500">
              Vui lòng chuyển khoản theo thông tin bên dưới. Đơn hàng sẽ được xác nhận ngay sau khi cửa hàng nhận được tiền,
              bạn sẽ tự động được chuyển sang trang xác nhận.
            </p>
          </div>

          {order && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
              <span className="rounded-full bg-zinc-100 px-3 py-1 font-bold text-zinc-700">Mã đơn: {order.orderCode || paymentInfo?.maDonHangKinhDoanh}</span>
              <span className="rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-700">{getPaymentStatusLabel(order.paymentStatus)}</span>
            </div>
          )}

          {loading && !paymentInfo && (
            <div className="mt-10 text-center text-sm text-zinc-500">Đang tạo mã QR...</div>
          )}

          {paymentInfo && amountDue > 0 && (
            <div className="mt-8 rounded-[28px] border border-zinc-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              {paymentInfo.daCauHinhNganHang ? (
                <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                  {paymentInfo.qrImageUrl && (
                    <img
                      src={paymentInfo.qrImageUrl}
                      alt="Mã QR chuyển khoản"
                      className="h-60 w-60 shrink-0 rounded-2xl border border-zinc-200 object-contain"
                    />
                  )}
                  <div className="w-full space-y-2 text-sm">
                    <Row label="Ngân hàng" value={paymentInfo.tenNganHang} />
                    <Row label="Số tài khoản" value={paymentInfo.soTaiKhoan} />
                    <Row label="Chủ tài khoản" value={paymentInfo.chuTaiKhoan} />
                    <Row label="Nội dung CK" value={paymentInfo.noiDungChuyenKhoan} highlight />
                    <div className="flex items-center justify-between border-t border-zinc-200 pt-2">
                      <span className="text-zinc-500">Số tiền cần chuyển</span>
                      <strong className="text-[22px] font-black text-[#d71920]">{formatCurrency(amountDue)}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700">
                  Cửa hàng chưa cấu hình tài khoản nhận chuyển khoản. Số tiền cần thanh toán: <strong>{formatCurrency(amountDue)}</strong>.
                  Vui lòng liên hệ cửa hàng để được hướng dẫn.
                </p>
              )}
              <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-zinc-400">
                <FiLoader className="h-3.5 w-3.5 animate-spin" />
                Đang chờ cửa hàng xác nhận thanh toán...
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={`/orders/${orderId}`}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-zinc-300 bg-white px-6 text-sm font-extrabold uppercase tracking-[0.08em] text-zinc-700 transition hover:bg-zinc-50"
            >
              Xem chi tiết đơn
            </Link>
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-red-200 bg-white px-6 text-sm font-extrabold uppercase tracking-[0.08em] text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelling ? 'Đang hủy...' : 'Hủy đơn hàng'}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-zinc-500">{label}</span>
      <span className={`text-right font-bold ${highlight ? 'text-[#d71920]' : 'text-zinc-900'}`}>{value || '-'}</span>
    </div>
  );
}

export default PaymentPage;
