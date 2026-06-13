import { Link } from 'react-router-dom';
import { formatCurrency, formatDateTimeWithRelative } from '../../utils/formatters.js';

// Banner nhắc các đơn chưa thanh toán — khách bấm vào để tiếp tục trả tiền qua trang QR.
function AwaitingPaymentReminder({ orders, now }) {
  if (orders.length === 0) return null;

  return (
    <div className="mb-6 rounded-[22px] border border-amber-200 bg-amber-50/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-amber-800">
            Bạn có {orders.length} đơn hàng chờ thanh toán
          </h3>
        </div>
      </div>
      <ul className="mt-3 space-y-2">
        {orders.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
            <div>
              <div className="text-sm font-bold text-zinc-900">#{o.orderCode || o.id}</div>
              <div className="text-xs text-zinc-500">{formatDateTimeWithRelative(o.createdAt, now)} · Tổng: {formatCurrency(o.totalAmount)}</div>
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
  );
}

export default AwaitingPaymentReminder;
